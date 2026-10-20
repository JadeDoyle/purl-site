"""Write a WebP beside every PNG in out/, for the page to serve.

Usage: python webp.py
Run after frames.py, devices.py or dress.py. The PNGs stay the masters; the
page serves only the WebPs (build-site.mjs stops if one is missing or older
than its PNG). Lossy at quality 85 with the alpha kept: the hero's three
PNGs were 1.1 MB, and every flip of the Purl and Professional switch paid
for them (2026-10-18). Pillow only.
"""
import os

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')


def main():
    before = after = 0
    for name in sorted(os.listdir(OUT)):
        if not name.endswith('.png'):
            continue
        src = os.path.join(OUT, name)
        dst = src[:-4] + '.webp'
        Image.open(src).save(dst, 'WEBP', quality=85, method=6)
        a, b = os.path.getsize(src), os.path.getsize(dst)
        before += a
        after += b
        print('%-26s %7d -> %7d' % (name, a, b))
    print('total %d -> %d bytes' % (before, after))


if __name__ == '__main__':
    main()
