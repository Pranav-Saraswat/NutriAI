#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

INSTALL_DOCKER=false
INSTALL_CLOUDFLARED=false
INSTALL_LOCAL_MONGO=false
CREATE_ENV=false
START_DOCKER_STACK=false
START_FLASK=false
START_TUNNEL=false
USE_NAMED_TUNNEL=false
ALL=false
TUNNEL_URL_FILE=""
APP_URL=""

log() {
  printf '\n[%s] %s\n' "$(date +'%H:%M:%S')" "$*"
}

fail() {
  printf '\nError: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-dev.sh [options]

Options:
  --all                 Create .env (if missing), install Docker, install cloudflared, and start Docker Compose
  --create-env          Copy .env.example to .env if .env does not exist
  --install-docker      Install Docker Engine and Docker Compose plugin on Ubuntu/Debian
  --install-cloudflared Install cloudflared on Ubuntu/Debian
  --install-mongo-local Install MongoDB Community locally on Ubuntu or Debian 11
  --start-docker        Start the app stack with docker compose up --build -d
  --start-flask         Start the Flask app locally via python run.py
  --start-tunnel        Start a Cloudflare Tunnel for the app
  --named-tunnel        Use CLOUDFLARE_TUNNEL_TOKEN for a named Cloudflare Tunnel
  --tunnel-url URL      Local app URL to expose with Cloudflare Tunnel
  --help                Show this help text

Examples:
  ./scripts/setup-dev.sh --all
  ./scripts/setup-dev.sh --create-env --install-docker --install-cloudflared
  ./scripts/setup-dev.sh --install-mongo-local
  ./scripts/setup-dev.sh --start-tunnel
  ./scripts/setup-dev.sh --start-tunnel --named-tunnel
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_linux() {
  [[ "$(uname -s)" == "Linux" ]] || fail "This script currently supports Linux only."
}

load_os_release() {
  [[ -f /etc/os-release ]] || fail "/etc/os-release not found."
  # shellcheck disable=SC1091
  source /etc/os-release
}

create_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    log ".env already exists, leaving it unchanged."
    return
  fi

  [[ -f "$ENV_EXAMPLE" ]] || fail ".env.example not found."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  log "Created .env from .env.example. Update SECRET_KEY and GROQ_API_KEY before using the app."
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker is already installed. Skipping installation."
    return 0
  fi
  load_os_release
  need_cmd curl
  need_cmd sudo

  case "${ID:-}" in
    ubuntu|debian) ;;
    *) fail "Docker auto-install is only implemented for Ubuntu/Debian in this script." ;;
  esac

  local repo_os="$ID"
  log "Installing Docker Engine and Docker Compose plugin for ${PRETTY_NAME:-$ID}."

  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${repo_os}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${repo_os} ${VERSION_CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER" || true
    log "Added $USER to the docker group. You may need to log out and back in for group membership to apply."
  fi

  docker --version || true
  docker compose version || true
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    log "cloudflared is already installed. Skipping installation."
    return 0
  fi
  load_os_release
  need_cmd curl
  need_cmd sudo

  case "${ID:-}" in
    ubuntu|debian) ;;
    *) fail "cloudflared auto-install is only implemented for Ubuntu/Debian in this script." ;;
  esac

  log "Installing cloudflared using Cloudflare's Debian package repository."

  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
    | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y cloudflared

  cloudflared --version || true
}

install_local_mongo() {
  if command -v mongod >/dev/null 2>&1; then
    log "mongodb-org (mongod) is already installed. Skipping installation."
    return 0
  fi
  load_os_release
  need_cmd curl
  need_cmd gpg
  need_cmd sudo

  log "Installing MongoDB Community locally."

  sudo apt-get update
  sudo apt-get install -y gnupg curl
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

  case "${ID:-}" in
    ubuntu)
      case "${VERSION_CODENAME:-}" in
        jammy|focal)
          echo "deb [ arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/7.0 multiverse" \
            | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null
          ;;
        *)
          fail "Local MongoDB apt install is supported here for Ubuntu 22.04 (jammy) and 20.04 (focal). Use Docker MongoDB on ${VERSION_CODENAME:-unknown}."
          ;;
      esac
      ;;
    debian)
      case "${VERSION_CODENAME:-}" in
        bullseye)
          echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" \
            | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null
          ;;
        bookworm)
          fail "MongoDB's Debian 12 apt path is problematic for MongoDB 7.0. This script recommends Docker MongoDB on Debian 12."
          ;;
        *)
          fail "Unsupported Debian release for local MongoDB install in this script."
          ;;
      esac
      ;;
    *)
      fail "Local MongoDB auto-install is only implemented for Ubuntu/Debian."
      ;;
  esac

  sudo apt-get update
  sudo apt-get install -y mongodb-org
  sudo systemctl daemon-reload || true
  sudo systemctl enable mongod
  sudo systemctl start mongod
  sudo systemctl --no-pager --full status mongod || true
}

start_docker_stack() {
  need_cmd docker
  [[ -f "$PROJECT_ROOT/docker-compose.yml" ]] || fail "docker-compose.yml not found."
  log "Starting NutriAI with Docker Compose."
  (cd "$PROJECT_ROOT" && docker compose up --build -d)
  log "Docker stack started. App should be available on http://localhost:5000"
}

start_cloudflare_tunnel() {
  need_cmd cloudflared

  local env_tunnel_url_file="${TUNNEL_URL_FILE:-$PROJECT_ROOT/.cloudflare_url}"
  local env_app_url="${APP_URL:-http://localhost:5000}"

  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi

  local tunnel_url_file="${TUNNEL_URL_FILE:-$env_tunnel_url_file}"
  local app_url="${APP_URL:-$env_app_url}"

  if [[ "$tunnel_url_file" != /* ]]; then
    tunnel_url_file="$PROJECT_ROOT/$tunnel_url_file"
  fi

  cleanup_tunnel_file() {
    rm -f "$tunnel_url_file"
  }

  trap cleanup_tunnel_file EXIT INT TERM

  if [[ "$USE_NAMED_TUNNEL" == true ]]; then
    if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
      fail "CLOUDFLARE_TUNNEL_TOKEN is required for --named-tunnel."
    fi

    if [[ -n "${TUNNEL_PUBLIC_URL:-}" ]]; then
      printf '%s\n' "$TUNNEL_PUBLIC_URL" > "$tunnel_url_file"
      log "Saved named tunnel URL to $tunnel_url_file"
    else
      log "TUNNEL_PUBLIC_URL is not set, so Flask auto-redirect will not know your named tunnel URL."
    fi

    log "Starting named Cloudflare Tunnel using token from environment."
    exec cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
  fi

  log "Starting Cloudflare Quick Tunnel for $app_url"
  rm -f "$tunnel_url_file"
  cloudflared tunnel --url "$app_url" 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ ! -f "$tunnel_url_file" && "$line" =~ https://[A-Za-z0-9.-]+trycloudflare.com ]]; then
      printf '%s\n' "${BASH_REMATCH[0]}" > "$tunnel_url_file"
      log "Saved tunnel URL to $tunnel_url_file"
    fi
  done
  exit ${PIPESTATUS[0]}
}

main() {
  require_linux

  if [[ $# -eq 0 ]]; then
    usage
    exit 0
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all) ALL=true ;;
      --create-env) CREATE_ENV=true ;;
      --install-docker) INSTALL_DOCKER=true ;;
      --install-cloudflared) INSTALL_CLOUDFLARED=true ;;
      --install-mongo-local) INSTALL_LOCAL_MONGO=true ;;
      --start-docker) START_DOCKER_STACK=true ;;
      --start-flask) START_FLASK=true ;;
      --start-tunnel) START_TUNNEL=true ;;
      --named-tunnel) START_TUNNEL=true; USE_NAMED_TUNNEL=true ;;
      --tunnel-url)
        shift
        APP_URL="${1:-}"
        [[ -n "$APP_URL" ]] || fail "Missing value for --tunnel-url"
        ;;
      --help|-h) usage; exit 0 ;;
      *) fail "Unknown option: $1" ;;
    esac
    shift
  done

  if [[ "$ALL" == true ]]; then
    CREATE_ENV=true
    INSTALL_DOCKER=true
    INSTALL_CLOUDFLARED=true
    START_DOCKER_STACK=true
    START_TUNNEL=true
  fi

  $CREATE_ENV && create_env_file
  $INSTALL_DOCKER && install_docker
  $INSTALL_CLOUDFLARED && install_cloudflared
  $INSTALL_LOCAL_MONGO && install_local_mongo

  if [[ "$START_FLASK" == true && "$START_TUNNEL" == true ]]; then
    log "Starting Flask and Cloudflare Tunnel simultaneously..."
    (cd "$PROJECT_ROOT" && python run.py) &
    FLASK_PID=$!
    
    # Wait briefly to let Flask start up before tunnel hooks it
    sleep 2
    
    start_cloudflare_tunnel
    kill $FLASK_PID 2>/dev/null || true
  else
    $START_DOCKER_STACK && start_docker_stack
    $START_FLASK && (cd "$PROJECT_ROOT" && python run.py)
    $START_TUNNEL && start_cloudflare_tunnel
  fi

  log "Setup complete."
}

main "$@"
