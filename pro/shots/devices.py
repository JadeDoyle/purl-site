"""The three devices of the flat hero, drawn at their real proportions.

Usage: python devices.py [dir for full-size copies]
Reads raw/ beside this file and writes out/hero-ipad.png, out/hero-iphone.png
and out/hero-mac.png: each a whole device (body, screen, corners) on a
transparent background, so the page only places three pictures and never
crops a screen into a box of another shape (ruled 2026-10-16).

The raws are captured on headless Android emulators set to each device's
real pixels and point scale, so Purl lays out as it would there:

  iPad Air 11-inch: 2360 x 1640 px, 2x (1180 x 820 pt), screen corner 18 pt.
    Landscape: Purl hides the status bar, so the top inset is 0; the home
    indicator keeps 20 pt at the bottom. Emulator: wm size 2360x1600,
    density 320 (the status and navigation bars are hidden in Purl).
  iPhone 15 Pro: 1179 x 2556 px, 3x (393 x 852 pt), screen corner 55 pt,
    safe area 59 pt top and 34 pt bottom. Emulator: wm size 1179x2433,
    density 480; its status bar is 156 px and the navigation bar is hidden,
    so 2433 - 156 = 2556 - 177 - 102 rows of app.
  MacBook Air 13-inch at its default 1470 x 956 pt, 2x: menu bar 37 pt,
    window title bar 28 pt, so the app window is 1470 x 891 pt. Emulator:
    wm size 2940x1782, density 320. Apple does not publish the Mac screen
    corner; 10 pt is an estimate.

Corner radii of the screens are the values iOS reports for these models
(UIScreen _displayCornerRadius, as listed by the ScreenCorners library).
Bodies are the published outer sizes; the body corner is the screen corner
plus the bezel, so the two stay concentric. Pillow only.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

from dress import font, set_rail_clock, is_dark

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
OUT = os.path.join(HERE, 'out')


def stretch_rows(im, y_src, y0, y1):
    """Fill rows y0..y1 with copies of row y_src, column by column."""
    if y1 <= y0:
        return
    row = im.crop((0, y_src, im.width, y_src + 1)).resize((im.width, y1 - y0))
    im.paste(row, (0, y0))


def mask_round(im, r, corners=(True, True, True, True)):
    """Alpha mask with rounded corners, drawn at 4x and scaled down so the
    edge is smooth. corners: top left, top right, bottom right, bottom left."""
    k = 4
    m = Image.new('L', (im.width * k, im.height * k), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, m.width - 1, m.height - 1], radius=r * k, fill=255, corners=corners)
    out = im.convert('RGBA')
    out.putalpha(m.resize(im.size, Image.LANCZOS))
    return out


def home_bar(im, width, height, bottom_gap, ink):
    d = ImageDraw.Draw(im)
    cx = im.width // 2
    y1 = im.height - bottom_gap
    d.rounded_rectangle([cx - width // 2, y1 - height, cx + width // 2, y1], radius=height // 2, fill=ink)


def status_icons(im, cy, right, s, ink):
    """Signal, wifi and battery, the battery's right edge at x = right."""
    d = ImageDraw.Draw(im)
    bw, bh = round(25 * s), round(12 * s)
    bx = right - bw - round(2.5 * s)
    by = cy - bh // 2
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=round(3.8 * s), outline=ink, width=max(1, round(1.1 * s)))
    i = round(2 * s)
    d.rounded_rectangle([bx + i, by + i, bx + bw - i, by + bh - i], radius=round(2 * s), fill=ink)
    d.rounded_rectangle([bx + bw + round(1.3 * s), cy - round(2.2 * s), bx + bw + round(2.6 * s), cy + round(2.2 * s)], radius=round(1 * s), fill=ink)
    wx = bx - round(13 * s)
    wy = cy + round(5 * s)
    for r in (11 * s, 7.4 * s):
        r = round(r)
        d.arc([wx - r, wy - r, wx + r, wy + r], start=225, end=315, fill=ink, width=max(2, round(2.3 * s)))
    r = round(3.8 * s)
    d.pieslice([wx - r, wy - r, wx + r, wy + r], start=225, end=315, fill=ink)
    sx = wx - round(30 * s)
    for k in range(4):
        h = round((3.6 + k * 2.4) * s)
        x = sx + k * round(4.8 * s)
        d.rounded_rectangle([x, cy + round(5 * s) - h, x + round(3 * s), cy + round(5 * s)], radius=round(0.9 * s), fill=ink)


# Screens ----------------------------------------------------------------

def ipad_screen(src, clock=None):
    s = 2
    raw = Image.open(src).convert('RGB')
    set_rail_clock(raw, clock, s)
    W, H = 2360, 1640
    assert raw.size == (W, H - 20 * s), raw.size
    im = Image.new('RGB', (W, H))
    im.paste(raw, (0, 0))
    stretch_rows(im, raw.height - 1, raw.height, H)
    bot = im.getpixel((W // 2, H - 2))
    home_bar(im, 315 * s, 5 * s, 7 * s, (255, 255, 255) if is_dark(bot) else (24, 24, 26))
    return mask_round(im, 18 * s)


def iphone_screen(src):
    s = 3
    sb = 156                       # the emulator's status bar, in px
    top, bottom = 59 * s, 34 * s   # iOS safe area
    raw = Image.open(src).convert('RGB')
    W, H = 1179, 2556
    assert raw.size == (W, H - top - bottom + sb), raw.size
    im = Image.new('RGB', (W, H))
    im.paste(raw.crop((0, sb, W, raw.height)), (0, top))
    stretch_rows(im, top + 2, 0, top)
    stretch_rows(im, top + raw.height - sb - 1, top + raw.height - sb, H)
    d = ImageDraw.Draw(im)
    # The Dynamic Island: 126 x 37.33 pt, 11 pt from the top.
    iw, ih, iy = round(126 * s), round(37.33 * s), 11 * s
    d.rounded_rectangle([W // 2 - iw // 2, iy, W // 2 + iw // 2, iy + ih], radius=ih // 2, fill=(0, 0, 0))
    cy = iy + ih // 2
    ink = (255, 255, 255) if is_dark(im.getpixel((20, 20))) else (0, 0, 0)
    d.text((66 * s, cy), '9:41', font=font(17 * s, bold=True), fill=ink, anchor='mm')
    status_icons(im, cy, W - 33 * s, s, ink)
    bot = im.getpixel((W // 2, H - 2))
    home_bar(im, 134 * s, 5 * s, 8 * s, (255, 255, 255) if is_dark(bot) else (0, 0, 0))
    return mask_round(im, 55 * s)


# macOS chrome in the light and dark appearance: menu bar, its ink, the
# window title bar, the line under it and the title.
MAC_CHROME = {
    False: dict(menu=(234, 232, 237), ink=(25, 25, 28), bar=(246, 245, 248), line=(214, 211, 218), title=(60, 58, 64)),
    True: dict(menu=(36, 34, 40), ink=(236, 235, 240), bar=(48, 46, 52), line=(24, 23, 27), title=(206, 204, 210)),
}


def mac_screen(src, clock=None, title='Purl', dark=False):
    ch = MAC_CHROME[dark]
    s = 2
    raw = Image.open(src).convert('RGB')
    set_rail_clock(raw, clock, s)
    mb, tb = 37 * s, 28 * s
    W, H = 1470 * s, 956 * s
    assert raw.size == (W, H - mb - tb), raw.size
    im = Image.new('RGB', (W, H), ch['bar'])
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, mb], fill=ch['menu'])
    f, fb = font(13 * s), font(13 * s, bold=True)
    x = 18 * s
    for i, m in enumerate(['Purl', 'File', 'Edit', 'View', 'Window', 'Help']):
        ff = fb if i == 0 else f
        d.text((x, mb // 2), m, font=ff, fill=ch['ink'], anchor='lm')
        x += round(d.textlength(m, font=ff)) + 20 * s
    d.text((W - 18 * s, mb // 2), 'Fri 16 Oct  9:41', font=f, fill=ch['ink'], anchor='rm')
    # The notch: about 200 x 32 pt, its lower corners rounded.
    nw, nh = 200 * s, 32 * s
    d.rounded_rectangle([W // 2 - nw // 2, -20 * s, W // 2 + nw // 2, nh], radius=10 * s, fill=(0, 0, 0))
    # The window title bar and its three buttons.
    d.rectangle([0, mb, W, mb + tb], fill=ch['bar'])
    d.line([0, mb + tb - 1, W, mb + tb - 1], fill=ch['line'], width=s)
    r = 6 * s
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cx = 20 * s + i * 20 * s
        d.ellipse([cx - r, mb + tb // 2 - r, cx + r, mb + tb // 2 + r], fill=c)
    d.text((W // 2, mb + tb // 2), title, font=fb, fill=ch['title'], anchor='mm')
    im.paste(raw, (0, mb + tb))
    return mask_round(im, 10 * s, corners=(True, True, False, False))


# Bodies -----------------------------------------------------------------

def shadowless_body(size, radius, fill, edge, edge_w, corners=(True, True, True, True)):
    """A device body: a rounded slab with a thin lighter rim, drawn at 2x."""
    k = 2
    W, H = size
    big = Image.new('RGBA', (W * k, H * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    d.rounded_rectangle([0, 0, W * k - 1, H * k - 1], radius=radius * k, fill=edge, corners=corners)
    e = edge_w * k
    d.rounded_rectangle([e, e, W * k - 1 - e, H * k - 1 - e], radius=max(1, radius * k - e), fill=fill, corners=corners)
    return big.resize((W, H), Image.LANCZOS)


def ipad_device(screen):
    # 247.6 x 178.5 mm at 264 ppi; screen 2360 x 1640, so a 107 px bezel.
    bez = 107
    W, H = screen.width + 2 * bez, screen.height + 2 * bez
    c = shadowless_body((W, H), 36 + bez, (38, 38, 41, 255), (150, 150, 156, 255), 5)
    c.alpha_composite(screen, (bez, bez))
    # Front camera, centred on the long edge (landscape, as on iPad Air M2 and later).
    d = ImageDraw.Draw(c)
    d.ellipse([W // 2 - 9, bez // 2 - 9, W // 2 + 9, bez // 2 + 9], fill=(20, 22, 30))
    return c


def iphone_device(screen):
    # 70.6 x 146.6 mm at 460 ppi; screen 1179 x 2556, so a 50 px bezel.
    bez = 50
    W, H = screen.width + 2 * bez, screen.height + 2 * bez
    c = shadowless_body((W, H), 165 + bez, (22, 22, 24, 255), (128, 127, 124, 255), 9)
    c.alpha_composite(screen, (bez, bez))
    return c


def mac_device(screen):
    # MacBook Air 13-inch: 304 mm wide; at 2x of 1470 pt the screen is 2940
    # px wide, so 0.0987 mm per px: 7 mm bezels (70 px) at the sides and top,
    # 12 mm (122 px) at the bottom.
    side, top, chin = 70, 70, 122
    LW, LH = screen.width + 2 * side, screen.height + top + chin
    over = round(LW * 0.035)
    base_h = round(LW * 0.022)
    W, H = LW + 2 * over, LH + base_h
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lid = shadowless_body((LW, LH), 20 + side,(18, 18, 20, 255), (176, 176, 182, 255), 6, corners=(True, True, False, False))
    c.alpha_composite(lid, (over, 0))
    c.alpha_composite(screen, (over + side, top))
    # The base, seen edge on: a light bar a little wider than the lid, with
    # the thumb notch at the front.
    base = Image.new('RGBA', (W, base_h), (0, 0, 0, 0))
    g = Image.linear_gradient('L').resize((W, base_h))
    lightc = Image.new('RGBA', (W, base_h), (228, 228, 232, 255))
    darkc = Image.new('RGBA', (W, base_h), (176, 176, 182, 255))
    grad = Image.composite(darkc, lightc, g)
    m = Image.new('L', (W * 2, base_h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, W * 2 - 1, base_h * 2 - 1], radius=base_h, fill=255, corners=(False, False, True, True))
    base.paste(grad, (0, 0), m.resize((W, base_h), Image.LANCZOS))
    d = ImageDraw.Draw(base)
    nw = round(W * 0.12)
    d.rounded_rectangle([W // 2 - nw // 2, 0, W // 2 + nw // 2, base_h // 2], radius=base_h // 4, fill=(168, 168, 174, 255), corners=(False, False, True, True))
    c.alpha_composite(base, (0, LH))
    return c


def save(im, name, width):
    h = round(im.height * width / im.width)
    im.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
    print('wrote', name, (width, h))


def main():
    os.makedirs(OUT, exist_ok=True)
    ipad = ipad_device(ipad_screen(os.path.join(RAW, 'ipad-air-crochet-lace.png')))
    phone = iphone_device(iphone_screen(os.path.join(RAW, 'iphone-15-pro-stash.png')))
    mac = mac_device(mac_screen(os.path.join(RAW, 'mac-studio.png'), clock=[78, 57]))
    # Optional: full-size copies, for looking at the corners.
    if len(sys.argv) > 1:
        for im, n in ((ipad, 'ipad'), (phone, 'iphone'), (mac, 'mac')):
            im.save(os.path.join(sys.argv[1], 'full-' + n + '.png'))
    # The sizes the page serves: about twice the largest CSS width each
    # device takes on the page.
    save(ipad, 'hero-ipad.png', 1000)
    save(phone, 'hero-iphone.png', 400)
    save(mac, 'hero-mac.png', 1500)
    # Dark twins of the iPad and the Mac, from the dark theme's raws. The
    # phone's dark twin is the site's own shot, not made here.
    save(ipad_device(ipad_screen(os.path.join(RAW, 'ipad-air-crochet-lace_dark.png'))), 'hero-ipad_dark.png', 1000)
    save(mac_device(mac_screen(os.path.join(RAW, 'mac-studio_dark.png'), clock=[78, 57], dark=True)), 'hero-mac_dark.png', 1500)


if __name__ == '__main__':
    main()
