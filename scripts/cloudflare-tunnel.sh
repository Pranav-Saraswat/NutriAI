#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
TUNNEL_URL_FILE="${TUNNEL_URL_FILE:-$PROJECT_ROOT/.cloudflare_url}"

APP_URL="${APP_URL:-http://localhost:5000}"
USE_QUICK_TUNNEL=true

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ "$TUNNEL_URL_FILE" != /* ]]; then
  TUNNEL_URL_FILE="$PROJECT_ROOT/$TUNNEL_URL_FILE"
fi

cleanup() {
  rm -f "$TUNNEL_URL_FILE"
}

trap cleanup EXIT INT TERM

usage() {
  cat <<'EOF'
Usage: ./scripts/cloudflare-tunnel.sh [--url http://localhost:5000] [--named]

Modes:
  default    Start a Cloudflare Quick Tunnel for local development
  --named    Start a named tunnel using CLOUDFLARE_TUNNEL_TOKEN from .env or the shell

Examples:
  ./scripts/cloudflare-tunnel.sh
  ./scripts/cloudflare-tunnel.sh --url http://localhost:5000
  CLOUDFLARE_TUNNEL_TOKEN=... ./scripts/cloudflare-tunnel.sh --named
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  }
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      shift
      APP_URL="${1:-}"
      [[ -n "$APP_URL" ]] || {
        printf 'Missing value for --url\n' >&2
        exit 1
      }
      ;;
    --named)
      USE_QUICK_TUNNEL=false
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

need_cmd cloudflared

if [[ "$USE_QUICK_TUNNEL" == true ]]; then
  printf 'Starting Cloudflare Quick Tunnel for %s\n' "$APP_URL"
  rm -f "$TUNNEL_URL_FILE"
  cloudflared tunnel --url "$APP_URL" 2>&1 | while IFS= read -r line; do
    printf '%s\n' "$line"
    if [[ ! -f "$TUNNEL_URL_FILE" && "$line" =~ https://[A-Za-z0-9.-]+trycloudflare.com ]]; then
      printf '%s\n' "${BASH_REMATCH[0]}" > "$TUNNEL_URL_FILE"
      printf 'Saved tunnel URL to %s\n' "$TUNNEL_URL_FILE"
    fi
  done
  exit ${PIPESTATUS[0]}
fi

if [[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  printf 'CLOUDFLARE_TUNNEL_TOKEN is required for --named mode.\n' >&2
  exit 1
fi

if [[ -n "${TUNNEL_PUBLIC_URL:-}" ]]; then
  printf '%s\n' "$TUNNEL_PUBLIC_URL" > "$TUNNEL_URL_FILE"
  printf 'Saved named tunnel URL to %s\n' "$TUNNEL_URL_FILE"
else
  printf 'TUNNEL_PUBLIC_URL is not set, so Flask auto-redirect will not know your named tunnel URL.\n'
fi

printf 'Starting named Cloudflare Tunnel using token from environment.\n'
exec cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
