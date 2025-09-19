#!/bin/bash
set -e

echo "[Codex] Running custom setup script..."

# Marker file so you can verify setup actually ran
echo "Codex custom setup ran on: $(date)" > codex_setup_marker.txt

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
