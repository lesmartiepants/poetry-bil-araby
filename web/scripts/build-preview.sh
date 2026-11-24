#!/usr/bin/env bash
# Builds the shareable preview: all mocks visible, dev panel on, hash routing, relative paths.
set -euo pipefail
OUT="${1:-preview}"
cd "$(dirname "$0")/.."
npm run tokens >/dev/null
VITE_SOURCES=mock VITE_HASH_ROUTER=1 VITE_SHOW_MOCKS=1 VITE_DEV_PANEL=1 npx vite build --base ./ --outDir "$OUT" --emptyOutDir
