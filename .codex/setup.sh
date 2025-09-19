#!/bin/bash
set -e

echo "[Codex] Running custom setup script..."

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build || true

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  cp .env.example .env
fi

echo "[Codex] Setup complete!"
