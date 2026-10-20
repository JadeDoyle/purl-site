#!/bin/sh
# Render the flat hero still with headless Chrome. Needs the built site
# served on 127.0.0.1:8765 (python -m http.server from the repo root).
# Usage: sh pro/capture-heroes.sh <out_dir> [scale]
# scale 2 renders at twice the pixels, for looking at the device corners.
OUT="${1:-pro/shots/heroes}"
SCALE="${2:-1}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"   # Chrome does not resolve a relative path
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
PROF="${TMPDIR:-/tmp}/purl-hero-chrome"
NAME=hero-flat
[ "$SCALE" = 1 ] || NAME="hero-flat-x$SCALE"
"$CH" --headless=new --hide-scrollbars --force-device-scale-factor="$SCALE" \
  --user-data-dir="$PROF" --window-size=1600,820 --virtual-time-budget=6000 \
  --screenshot="$(cygpath -w "$OUT")\\$NAME.png" \
  "http://127.0.0.1:8765/professional/?stage" 2>/dev/null
ls -la "$OUT"
