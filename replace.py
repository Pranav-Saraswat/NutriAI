import sys
file_path = 'c:/Users/Prana/Downloads/NutriAI/scripts/setup-dev.sh'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
new_lines = []
skip = False
for line in lines:
    if line.startswith('install_docker() {'):
        skip = 'docker'
        new_lines.append(line)
        new_lines.append('''  if command -v docker >/dev/null 2>&1; then
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
      if ! groups "$USER" | grep -q '\\bdocker\\b'; then
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
''')
        continue
    elif line.startswith('install_cloudflared() {'):
        skip = 'cloudflared'
        new_lines.append(line)
        new_lines.append('''  if command -v cloudflared >/dev/null 2>&1; then
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
''')
        continue
    elif line.startswith('install_local_mongo() {'):
        skip = 'mongo'
        new_lines.append(line)
        new_lines.append('''  if command -v mongod >/dev/null 2>&1; then
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
''')
        continue
        
    if skip:
        if line.startswith('}'):
            skip = False
        continue
    new_lines.append(line)
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    