#!/usr/bin/env bash
# Idempotent Cloud Agent install for the gadfly-server backend.
# Installs a local MongoDB (stable system dependency) and Node dependencies.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Ensuring MongoDB is installed"
if ! command -v mongod >/dev/null 2>&1; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq mongodb-org
else
  echo "MongoDB already installed: $(mongod --version | head -1)"
fi

echo "==> Preparing MongoDB data directory"
mkdir -p "$HOME/data/db" "$HOME/data/log"

echo "==> Installing Node dependencies"
cd "$REPO_DIR"
npm ci

echo "==> Install complete"
