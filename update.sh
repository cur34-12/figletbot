#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${FIGLETBOT_DIR:-$HOME/figletbot}"
SERVICE="${FIGLETBOT_SERVICE:-figletbot}"
REF="${FIGLETBOT_REF:-main}"
ARCHIVE_URL="https://github.com/cur34-12/figletbot/archive/refs/heads/${REF}.tar.gz"

# Everything lives in functions, and the last line runs main and exits in one
# go. Bash reads scripts lazily, so without this the update could overwrite
# this very file mid-run and bash would carry on from a stale offset.

install_deps() {
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
}

# Restart, then confirm the service is still up a few seconds later (a bad
# release usually crashes right after starting, which restart itself won't show).
restart_and_check() {
  sudo systemctl restart "$SERVICE"
  sleep 5
  sudo systemctl is-active --quiet "$SERVICE"
}

main() {
  if [[ ! -d "$APP_DIR" ]]; then
    echo "FigletBot directory not found: $APP_DIR" >&2
    exit 1
  fi

  if [[ ! -f "$APP_DIR/.env" ]]; then
    echo "Missing $APP_DIR/.env. Refusing to update without the bot token." >&2
    exit 1
  fi

  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  echo "Downloading FigletBot ($REF)..."
  mkdir "$TMP_DIR/new"
  curl -fsSL "$ARCHIVE_URL" -o "$TMP_DIR/figletbot.tar.gz"
  tar -xzf "$TMP_DIR/figletbot.tar.gz" --strip-components=1 -C "$TMP_DIR/new"

  echo "Backing up the current version..."
  tar -czf "$TMP_DIR/backup.tar.gz" -C "$APP_DIR" \
    --exclude=./node_modules --exclude=./.env .

  echo "Updating $APP_DIR..."
  # --remove-destination writes new files instead of editing them in place.
  cp -a --remove-destination "$TMP_DIR/new/." "$APP_DIR/"
  chmod +x "$APP_DIR/update.sh"

  cd "$APP_DIR"

  echo "Installing dependencies..."
  install_deps

  echo "Restarting $SERVICE..."
  if ! restart_and_check; then
    echo "$SERVICE did not stay up. Rolling back to the previous version..." >&2
    tar -xzf "$TMP_DIR/backup.tar.gz" -C "$APP_DIR"
    install_deps
    sudo systemctl restart "$SERVICE" || true
    sudo systemctl status "$SERVICE" --no-pager --full || true
    exit 1
  fi

  echo
  sudo systemctl status "$SERVICE" --no-pager --full
}

main "$@"; exit $?
