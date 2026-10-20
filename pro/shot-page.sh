#!/bin/sh
# Screenshot a site page with headless Chrome and cut it into slices of
# 1600 px for looking at. Needs the built site served on 127.0.0.1:8765
# from the repo root (the Professional page is professional/).
# Usage: sh pro/shot-page.sh <url path> <out dir> <name> [width] [height]
URLP="$1"; OUT="$2"; NAME="$3"; W="${4:-1280}"; H="${5:-4600}"
mkdir -p "$OUT"
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CH" --headless=new --hide-scrollbars --use-angle=swiftshader --enable-unsafe-swiftshader \
  --user-data-dir="$(cygpath -w "$OUT")\\prof" --window-size="$W,$H" --virtual-time-budget=6000 \
  --screenshot="$(cygpath -w "$OUT")\\$NAME.png" "http://127.0.0.1:8765/$URLP" 2>/dev/null
python -I -c "
import sys
from PIL import Image
p, n = sys.argv[1], sys.argv[2]
im = Image.open(p + '/' + n + '.png')
print(n, im.size)
for i in range(0, im.height, 1600):
    im.crop((0, i, im.width, min(im.height, i + 1600))).save('%s/%s-%d.png' % (p, n, i // 1600))
" "$(cygpath -m "$OUT")" "$NAME"
