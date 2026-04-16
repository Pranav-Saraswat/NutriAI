#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

INSTALL_DOCKER=false
INSTALL_CLOUDFLARED=false
INSTALL_LOCAL_MONGO=false
CREATE_ENV=false
START_DOCKER_STACK=false
START_API=false
START_CLIENT=false
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
Usage: ./start.sh [options]

Options:
  --all                 Create .env (if missing), install Docker, install cloudflared, and start Docker Compose
  --create-env          Copy .env.example to .env if .env does not exist
  --install-docker      Install Docker Engine and Docker Compose plugin on Ubuntu/Debian
  --install-cloudflared Install cloudflared on Ubuntu/Debian
  --install-mongo-local Install MongoDB Community locally on Ubuntu or Debian 11
  --start-docker        Start the MERN app stack (Express + MongoDB) with docker compose up --build -d
  --start-api           Start the Express server locally via npm run dev in backend/
  --start-client        Start the React client locally via npm run dev in frontend/ (optional)
  --start-tunnel        Start a Cloudflare Tunnel for the app
  --named-tunnel        Use CLOUDFLARE_TUNNEL_TOKEN for a named Cloudflare Tunnel
  --tunnel-url URL      Local app URL to expose with Cloudflare Tunnel
  --help                Show this help text

Examples:
  ./start.sh --all
  ./start.sh --create-env --install-docker --install-cloudflared
  ./start.sh --install-mongo-local
  ./start.sh --start-tunnel
  ./start.sh --start-tunnel --named-tunnel
  ./start.sh --start-api --start-client
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

detect_os() {
  OS_TYPE="Unknown"
  LINUX_DISTRO="unknown"
  
  local uname_out
  uname_out="$(uname -s)"
  case "$uname_out" in
    Linux*)
      OS_TYPE="Linux"
      if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        source /etc/os-release
        LINUX_DISTRO="${ID:-unknown}"
      fi
      ;;
    Darwin*)
      OS_TYPE="Mac"
      ;;
    CYGWIN*|MINGW*|MSYS*)
      OS_TYPE="Windows"
      ;;
    *)
      OS_TYPE="Unknown"
      ;;
  esac
  log "Detected OS: $OS_TYPE"
  [[ "$OS_TYPE" == "Linux" ]] && log "Detected Linux Distro: $LINUX_DISTRO"
}

create_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    log ".env already exists, leaving it unchanged."
    return
  fi

  [[ -f "$ENV_EXAMPLE" ]] || fail ".env.example not found."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  log "Created .env from .env.example. Update JWT_SECRET and GROQ_API_KEY before using the app."
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker is already installed. Skipping installation."
    return 0
  fi
  
  log "Installing Docker..."
  case "$OS_TYPE" in
    Mac)
      need_cmd brew
      brew install --cask docker
      log "Please open Docker Desktop to start the daemon."
      ;;
    Windows)
      log "Attempting to install Docker Desktop via winget..."
      winget install Docker.DockerDesktop || fail "Failed to install Docker via winget. Please download it from https://www.docker.com/products/docker-desktop/"
      ;;
    Linux)
      need_cmd curl
      need_cmd sudo
      case "$LINUX_DISTRO" in
        ubuntu|debian)
          local repo_os="$LINUX_DISTRO"
          sudo apt-get update
          sudo apt-get install -y ca-certificates curl gnupg
          sudo install -m 0755 -d /etc/apt/keyrings
          curl -fsSL "https://download.docker.com/linux/${repo_os}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
          sudo chmod a+r /etc/apt/keyrings/docker.gpg
          echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${repo_os} ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
          sudo apt-get update
          sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
          ;;
        fedora)
          sudo dnf -y install dnf-plugins-core
          sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
          sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
          sudo systemctl enable --now docker
          ;;
        arch)
          sudo pacman -Sy --noconfirm docker docker-compose
          sudo systemctl enable --now docker
          ;;
        *)
          fail "Docker auto-install is not implemented for $LINUX_DISTRO."
          ;;
      esac
      if ! groups "$USER" | grep -q '\bdocker\b'; then
        sudo usermod -aG docker "$USER" || true
        log "Added $USER to the docker group. You may need to log out and back in."
      fi
      docker --version || true
      docker compose version || true
      ;;
    *)
      fail "Unsupported OS for automated Docker install."
      ;;
  esac
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    log "cloudflared is already installed. Skipping installation."
    return 0
  fi
  
  log "Installing cloudflared..."
  case "$OS_TYPE" in
    Mac)
      need_cmd brew
      brew install cloudflared
      ;;
    Windows)
      log "Attempting to install cloudflared via winget..."
      winget install Cloudflare.cloudflared || fail "Failed to install cloudflared via winget. Please install manually."
      ;;
    Linux)
      need_cmd curl
      need_cmd sudo
      case "$LINUX_DISTRO" in
        ubuntu|debian)
          sudo mkdir -p --mode=0755 /usr/share/keyrings
          curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
          echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
          sudo apt-get update
          sudo apt-get install -y cloudflared
          ;;
        fedora)
          curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo
          sudo dnf install -y cloudflared
          ;;
        arch|*)
          log "Downloading cloudflared binary directly for $LINUX_DISTRO..."
          curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
          sudo mv cloudflared /usr/local/bin/cloudflared
          sudo chmod +x /usr/local/bin/cloudflared
          ;;
      esac
      cloudflared --version || true
      ;;
    *)
      fail "Unsupported OS for automated cloudflared install."
      ;;
  esac
}

install_local_mongo() {
  if command -v mongod >/dev/null 2>&1; then
    log "MongoDB is already installed. Skipping installation."
    return 0
  fi
  
  log "Installing MongoDB Community locally..."
  case "$OS_TYPE" in
    Mac)
      need_cmd brew
      brew tap mongodb/brew
      brew install mongodb-community@7.0
      ;;
    Windows)
      log "Attempting to install MongoDB via winget..."
      winget install MongoDB.Server || fail "Failed to install MongoDB via winget. Please install manually."
      ;;
    Linux)
      need_cmd curl
      need_cmd sudo
      case "$LINUX_DISTRO" in
        ubuntu)
          sudo apt-get update
          sudo apt-get install -y gnupg curl
          curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
          case "${VERSION_CODENAME:-}" in
            jammy|focal)
              echo "deb [ arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null
              ;;
            *)
              fail "Local MongoDB apt install is supported only for jammy/focal."
              ;;
          esac
          sudo apt-get update
          sudo apt-get install -y mongodb-org
          sudo systemctl daemon-reload || true
          sudo systemctl enable --now mongod
          ;;
        debian)
          sudo apt-get update
          sudo apt-get install -y gnupg curl
          curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
          case "${VERSION_CODENAME:-}" in
            bullseye)
              echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null
              ;;
            *)
              fail "MongoDB 7.0 not optimally supported via apt on this Debian version."
              ;;
          esac
          sudo apt-get update
          sudo apt-get install -y mongodb-org
          sudo systemctl daemon-reload || true
          sudo systemctl enable --now mongod
          ;;
        fedora)
          cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
          sudo dnf install -y mongodb-org
          sudo systemctl enable --now mongod
          ;;
        arch)
          fail "MongoDB on Arch is available via AUR. Please install manually (e.g., yay -S mongodb-bin)."
          ;;
        *)
          fail "MongoDB automated install not supported for $LINUX_DISTRO."
          ;;
      esac
      ;;
    *)
      fail "Unsupported OS for automated MongoDB install."
      ;;
  esac
}

start_docker_stack() {
  need_cmd docker
  [[ -f "$PROJECT_ROOT/docker-compose.yml" ]] || fail "docker-compose.yml not found."
  log "Starting NutriAI with Docker Compose."
  (cd "$PROJECT_ROOT" && docker compose up --build -d)
  log "Docker stack started. Client: http://localhost:5173 | API: http://localhost:5000"
}

start_api_local() {
  need_cmd npm
  [[ -f "$PROJECT_ROOT/backend/package.json" ]] || fail "backend/package.json not found."
  log "Starting NutriAI API (backend/)"
  (cd "$PROJECT_ROOT/backend" && npm run dev)
}

start_client_local() {
  need_cmd npm
  [[ -f "$PROJECT_ROOT/frontend/package.json" ]] || fail "frontend/package.json not found."
  log "Starting NutriAI client (frontend/)"
  (cd "$PROJECT_ROOT/frontend" && npm run dev)
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
      log "TUNNEL_PUBLIC_URL is not set, so the app will not know your named tunnel URL."
    fi

    log "Starting named Cloudflare Tunnel using token from environment."
    exec cloudflared tunnel --no-autoupdate --protocol http2 run --token "$CLOUDFLARE_TUNNEL_TOKEN"
  fi

  log "Starting Cloudflare Quick Tunnel for $app_url"
  rm -f "$tunnel_url_file"
  cloudflared tunnel --protocol http2 --url "$app_url" 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ ! -f "$tunnel_url_file" && "$line" =~ https://[A-Za-z0-9.-]+trycloudflare.com ]]; then
      printf '%s\n' "${BASH_REMATCH[0]}" > "$tunnel_url_file"
      log "Saved tunnel URL to $tunnel_url_file"
    fi
  done
  exit ${PIPESTATUS[0]}
}

main() {
  detect_os

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
      --start-api) START_API=true ;;
      --start-client) START_CLIENT=true ;;
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
  fi

  $CREATE_ENV && create_env_file
  $INSTALL_DOCKER && install_docker
  $INSTALL_CLOUDFLARED && install_cloudflared
  $INSTALL_LOCAL_MONGO && install_local_mongo

  if [[ "$START_API" == true && "$START_TUNNEL" == true ]]; then
    log "Starting API and Cloudflare Tunnel simultaneously..."
    (cd "$PROJECT_ROOT/backend" && npm run dev) &
    API_PID=$!
    
    # Wait briefly to let the API start up before tunnel hooks it.
    sleep 2
    
    start_cloudflare_tunnel
    kill $API_PID 2>/dev/null || true
  else
    $START_DOCKER_STACK && start_docker_stack
    $START_API && start_api_local
    $START_CLIENT && start_client_local
    $START_TUNNEL && start_cloudflare_tunnel
  fi

  log "Setup complete."
}

main "$@"
