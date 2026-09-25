#!/usr/bin/env bash
# Per-boot startup: ensure a local MongoDB daemon is running and ready.
# Idempotent: tolerates restarts and an already-running mongod.
set -euo pipefail

DATA_DIR="$HOME/data/db"
LOG_DIR="$HOME/data/log"
mkdir -p "$DATA_DIR" "$LOG_DIR"

if pgrep -x mongod >/dev/null 2>&1; then
  echo "==> mongod already running"
else
  echo "==> Starting mongod"
  # Remove a stale lock left by an unclean shutdown before forking.
  rm -f "$DATA_DIR/mongod.lock"
  mongod --dbpath "$DATA_DIR" --logpath "$LOG_DIR/mongod.log" \
    --bind_ip 127.0.0.1 --port 27017 --fork
fi

echo "==> Waiting for MongoDB to accept connections"
for i in $(seq 1 30); do
  if mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' 127.0.0.1:27017 2>/dev/null | grep -q 1; then
    echo "==> MongoDB is ready"
    exit 0
  fi
  sleep 1
done

echo "!! MongoDB did not become ready in time" >&2
tail -20 "$LOG_DIR/mongod.log" >&2 || true
exit 1
