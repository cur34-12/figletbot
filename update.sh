#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${FIGLETBOT_DIR:-$HOME/figletbot}"
SERVICE="${FIGLETBOT_SERVICE:-figletbot}"
ARCHIVE_URL="https://github.com/cur34-12/figletbot/archive/refs/heads/main.tar.gz"

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

echo "Downloading latest FigletBot..."
curl -fsSL "$ARCHIVE_URL" -o "$TMP_DIR/figletbot.tar.gz"
tar -xzf "$TMP_DIR/figletbot.tar.gz" -C "$TMP_DIR"

echo "Updating $APP_DIR..."
cp -a "$TMP_DIR/figletbot-main/." "$APP_DIR/"

cd "$APP_DIR"

if [[ -f package.json ]]; then
  echo "Installing dependencies..."
  npm install --omit=dev
fi

echo "Restarting $SERVICE..."
sudo systemctl restart "$SERVICE"

echo
sudo systemctl status "$SERVICE" --no-pager --full
