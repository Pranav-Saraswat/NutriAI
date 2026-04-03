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
ALL=false

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
  --help                Show this help text

Examples:
  ./scripts/setup-dev.sh --all
  ./scripts/setup-dev.sh --create-env --install-docker --install-cloudflared
  ./scripts/setup-dev.sh --install-mongo-local
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
  fi

  $CREATE_ENV && create_env_file
  $INSTALL_DOCKER && install_docker
  $INSTALL_CLOUDFLARED && install_cloudflared
  $INSTALL_LOCAL_MONGO && install_local_mongo
  $START_DOCKER_STACK && start_docker_stack

  log "Setup complete."
}

main "$@"
