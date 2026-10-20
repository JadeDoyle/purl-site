"""Feature frames drawn as a whole iPad Air 11-inch, like the hero's iPad.

Usage: python frames.py
Reads raw/ beside this file and writes the frames below into out/, each a
whole device on a transparent background at the width the page serves.
The raws are captured as devices.py describes for the iPad (2360 x 1600 px,
density 320, Professional, the app restarted after the display change so it
fills the screen). Pillow only.
"""
import os
import tempfile

from PIL import Image

from devices import RAW, ipad_device, ipad_screen, save, stretch_rows

# raw file, frame name, Purl's rail clock centre in raw pixels (None: no
# rail), and the first raw row to replace by the row above it (None: keep).
# The home strip below the screen repeats the raw's last row, so a list cut
# by the screen edge (the Blueprints hint line) would smear into stripes.
JOBS = [
    ('ipad-air-knit-yarn.png', 'frame-yarn.png', None, None),
    ('ipad-air-blueprints.png', 'frame-blueprints.png', [78, 56], 1586),
    ('ipad-air-mitten-3d.png', 'frame-mitten.png', [78, 56], None),
]


def main():
    # Each job runs on its raw and on the dark theme's raw beside it
    # (<name>_dark.png); the dark frame takes the same _dark suffix.
    for (src, name, clock, clean_from), suffix in [(j, s) for j in JOBS for s in ('', '_dark')]:
        src = src[:-4] + suffix + '.png'
        path = os.path.join(RAW, src)
        if not os.path.exists(path):
            print('missing', src)
            continue
        if clean_from:
            im = Image.open(path).convert('RGB')
            stretch_rows(im, clean_from - 1, clean_from, im.height)
            path = os.path.join(tempfile.gettempdir(), 'purl-frame-' + src)
            im.save(path)
        save(ipad_device(ipad_screen(path, clock=clock)), name[:-4] + suffix + '.png', 1720)


if __name__ == '__main__':
    main()
