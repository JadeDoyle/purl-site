"""Dress raw Android emulator shots of Purl so they read as iPad, iPhone and
Mac screens, and frame them for the Pro page.

Usage: python dress.py <config.json>

The config names the raw folder, the output folder, the Android bar
heights per device in pixels, and each output. See shots.json beside this
file. What it does to a shot:
  - paints over the Android status bar and navigation bar with the app's
    own colour just inside them, so nothing Android is left;
  - ipad and iphone: draws an iOS status bar (9:41, signal, wifi, battery)
    and the home indicator; a device with "status": false (the iPad held
    sideways, where Purl hides the bar) gets its band cut off instead;
  - mac: cuts both bars off and adds a macOS menu bar and a window title
    bar with the three window buttons (no Apple logo is drawn);
  - frame: puts the dressed screen into a drawn device (iPad, iPhone or a
    laptop) on a transparent background, for the feature frames.
Pillow only.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIRS = ['C:/Windows/Fonts']


def font(size, bold=False):
    names = ['segoeuib.ttf', 'arialbd.ttf'] if bold else ['segoeui.ttf', 'arial.ttf']
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def band_colour(im, y0, y1):
    """The most common colour in a band of rows, sampled sparsely."""
    w = im.width
    counts = {}
    for y in range(max(0, y0), min(im.height, y1)):
        for x in range(0, w, max(1, w // 240)):
            c = im.getpixel((x, y))[:3]
            c = (c[0] // 4 * 4, c[1] // 4 * 4, c[2] // 4 * 4)
            counts[c] = counts.get(c, 0) + 1
    return max(counts, key=counts.get) if counts else (255, 255, 255)


def is_dark(c):
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 140


def ios_status(im, top, scale, ink):
    """Draw 9:41, signal, wifi and battery into the band 0..top."""
    d = ImageDraw.Draw(im)
    f = font(int(15 * scale), bold=True)
    cy = top // 2
    pad = int(22 * scale)
    d.text((pad + int(14 * scale), cy), '9:41', font=f, fill=ink, anchor='mm')
    # Battery.
    bw, bh = int(25 * scale), int(12 * scale)
    bx = im.width - pad - bw
    by = cy - bh // 2
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=int(3.5 * scale), outline=ink, width=max(1, int(1.2 * scale)))
    inset = int(2.2 * scale)
    d.rounded_rectangle([bx + inset, by + inset, bx + bw - inset - int(4 * scale), by + bh - inset], radius=int(1.6 * scale), fill=ink)
    d.rounded_rectangle([bx + bw + int(1.5 * scale), cy - int(2.5 * scale), bx + bw + int(3 * scale), cy + int(2.5 * scale)], radius=1, fill=ink)
    # Wifi: three arcs and a dot.
    wx = bx - int(14 * scale)
    wy = cy + int(5 * scale)
    for i, r in enumerate((int(11 * scale), int(7.5 * scale), int(4 * scale))):
        d.arc([wx - r, wy - r, wx + r, wy + r], start=225, end=315, fill=ink, width=max(2, int(2.2 * scale)))
    d.ellipse([wx - int(1.6 * scale), wy - int(2.6 * scale), wx + int(1.6 * scale), wy + int(0.6 * scale)], fill=ink)
    # Signal: four bars.
    sx = wx - int(32 * scale)
    for i in range(4):
        h = int((4 + i * 2.6) * scale)
        x = sx + i * int(5 * scale)
        d.rounded_rectangle([x, cy + int(5 * scale) - h, x + int(3 * scale), cy + int(5 * scale)], radius=1, fill=ink)


def home_indicator(im, bottom_band, scale, ink):
    d = ImageDraw.Draw(im)
    w = int(140 * scale)
    h = max(3, int(5 * scale))
    cx = im.width // 2
    y = im.height - bottom_band // 2
    d.rounded_rectangle([cx - w // 2, y - h // 2, cx + w // 2, y + h // 2], radius=h // 2, fill=ink)


def repaint_bars(im, sb, nb):
    """Cover the Android bars by stretching the row just inside each over
    it, column by column, so a side rail and the main area keep their own
    colours."""
    im = im.convert('RGB')
    top = band_colour(im, sb + 2, sb + 10)
    if sb:
        row = im.crop((0, sb + 2, im.width, sb + 3)).resize((im.width, sb))
        im.paste(row, (0, 0))
    if nb:
        row = im.crop((0, im.height - nb - 3, im.width, im.height - nb - 2)).resize((im.width, nb))
        im.paste(row, (0, im.height - nb))
    return im, top


def erase(im, boxes):
    """Paint boxes [x0, y0, x1, y1] with the colour just left of each box."""
    d = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in boxes:
        c = im.getpixel((max(0, x0 - 2), y0))[:3]
        d.rectangle([x0, y0, x1, y1], fill=c)
    return im


def set_rail_clock(im, centre, scale):
    """Purl's own rail clock shows the capture time; redraw it as 9:41 in
    its own grey, so it agrees with the status bar."""
    if not centre:
        return im
    cx, cy = centre
    box = [cx - 52, cy - 20, cx + 52, cy + 20]
    px = [im.getpixel((x, y))[:3] for x in range(box[0], box[2]) for y in range(box[1], box[3])]
    # The ink is the pixel furthest from the rail behind it, so a dark
    # theme's light grey clock is found as well as a light theme's dark one.
    bg = im.getpixel((max(0, box[0] - 2), box[1]))[:3]
    ink = max(px, key=lambda c: sum(abs(c[i] - bg[i]) for i in range(3)))
    erase(im, [box])
    ImageDraw.Draw(im).text((cx, cy), '9:41', font=font(int(13 * scale), bold=True), fill=ink, anchor='mm')
    return im


def dress_ios(src, sb, nb, scale, aspect=None, clock=None, home=None, status=True):
    im, top = repaint_bars(Image.open(src), sb, nb)
    set_rail_clock(im, clock, scale)
    if not status:
        # Purl hides the status bar on an iPad held sideways and shows its
        # own rail clock instead, so the band is cut off, not redrawn: a drawn
        # iOS bar put a second 9:41 above the rail's (W4).
        im = im.crop((0, sb, im.width, im.height))
    if aspect:
        # Crop before drawing, so the status bar sits on the final edges.
        im = fit_aspect(im, aspect)
    ink = (255, 255, 255) if is_dark(top) else (0, 0, 0)
    if status:
        ios_status(im, sb, scale, ink)
    bot = band_colour(im, im.height - max(nb, 8), im.height - 1)
    home_indicator(im, home or max(nb, int(20 * scale)), scale, (255, 255, 255) if is_dark(bot) else (20, 20, 20))
    return im


# The macOS menu bar and window title bar in light and in dark mode: the
# menu bar, its text, the title bar, its bottom line and the window title.
MAC_CHROME = {
    False: {'menu': (232, 230, 235), 'menu_ink': (25, 25, 28), 'bar': (246, 245, 248), 'line': (214, 211, 218), 'title': (60, 58, 64)},
    True: {'menu': (36, 34, 40), 'menu_ink': (236, 235, 240), 'bar': (48, 46, 52), 'line': (24, 23, 27), 'title': (206, 204, 210)},
}


def dress_mac(src, sb, nb, scale, title='Purl', clock=None, dark=False):
    raw = set_rail_clock(Image.open(src).convert('RGB'), clock, scale)
    app = raw.crop((0, sb, raw.width, raw.height - nb))
    ch = MAC_CHROME[dark]
    mb = int(24 * scale)      # menu bar
    tb = int(28 * scale)      # window title bar
    W = app.width
    H = app.height + mb + tb
    im = Image.new('RGB', (W, H), ch['bar'])
    d = ImageDraw.Draw(im)
    # Menu bar, translucent grey.
    d.rectangle([0, 0, W, mb], fill=ch['menu'])
    f = font(int(13 * scale))
    fb = font(int(13 * scale), bold=True)
    x = int(16 * scale)
    for i, m in enumerate(['Purl', 'File', 'Edit', 'View', 'Window', 'Help']):
        d.text((x, mb // 2), m, font=fb if i == 0 else f, fill=ch['menu_ink'], anchor='lm')
        x += int(d.textlength(m, font=fb if i == 0 else f)) + int(20 * scale)
    d.text((W - int(16 * scale), mb // 2), 'Fri 16 Oct  9:41', font=f, fill=ch['menu_ink'], anchor='rm')
    # Title bar with the three window buttons.
    d.rectangle([0, mb, W, mb + tb], fill=ch['bar'])
    d.line([0, mb + tb - 1, W, mb + tb - 1], fill=ch['line'], width=1)
    r = int(6 * scale)
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        cx = int(20 * scale) + i * int(20 * scale)
        d.ellipse([cx - r, mb + tb // 2 - r, cx + r, mb + tb // 2 + r], fill=c)
    d.text((W // 2, mb + tb // 2), title, font=fb, fill=ch['title'], anchor='mm')
    im.paste(app, (0, mb + tb))
    return im


def round_corners(im, r):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=r, fill=255)
    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


def shadow_under(canvas, box, radius, blur, offset, alpha=70):
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + offset, x1, y1 + offset], radius=radius, fill=(30, 20, 40, alpha))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


def frame_tablet(screen, out_w=1600):
    s = screen.resize((out_w - 2 * int(out_w * 0.035), round((out_w - 2 * int(out_w * 0.035)) * screen.height / screen.width)), Image.LANCZOS)
    bez = int(out_w * 0.035)
    W, H = s.width + 2 * bez, s.height + 2 * bez
    m = 60
    c = Image.new('RGBA', (W + 2 * m, H + 2 * m), (0, 0, 0, 0))
    shadow_under(c, (m, m, m + W, m + H), int(W * 0.04), 26, 18)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([m, m, m + W, m + H], radius=int(W * 0.045), fill=(42, 42, 45), outline=(140, 140, 146), width=3)
    c.alpha_composite(round_corners(s, int(W * 0.022)), (m + bez, m + bez))
    return c


def frame_phone(screen, out_h=1500):
    sh = out_h - 2 * int(out_h * 0.022)
    s = screen.resize((round(sh * screen.width / screen.height), sh), Image.LANCZOS)
    bez = int(out_h * 0.022)
    W, H = s.width + 2 * bez, s.height + 2 * bez
    m = 50
    c = Image.new('RGBA', (W + 2 * m, H + 2 * m), (0, 0, 0, 0))
    shadow_under(c, (m, m, m + W, m + H), int(W * 0.16), 22, 14)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([m, m, m + W, m + H], radius=int(W * 0.17), fill=(28, 28, 30), outline=(138, 138, 143), width=3)
    c.alpha_composite(round_corners(s, int(W * 0.14)), (m + bez, m + bez))
    # Dynamic island.
    iw, ih = int(W * 0.25), int(W * 0.068)
    cx = m + W // 2
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([cx - iw // 2, m + bez + int(W * 0.024), cx + iw // 2, m + bez + int(W * 0.024) + ih], radius=ih // 2, fill=(0, 0, 0))
    return c


def frame_laptop(screen, out_w=1700):
    lid_w = int(out_w * 0.84)
    bez = int(lid_w * 0.025)
    sw = lid_w - 2 * bez
    s = screen.resize((sw, round(sw * screen.height / screen.width)), Image.LANCZOS)
    lid_h = s.height + bez + int(bez * 1.6)
    base_h = int(out_w * 0.02)
    m = 40
    W = out_w
    c = Image.new('RGBA', (W + 2 * m, lid_h + base_h + 2 * m), (0, 0, 0, 0))
    lx = m + (W - lid_w) // 2
    shadow_under(c, (m, m + lid_h, m + W, m + lid_h + base_h), 20, 18, 8, 60)
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([lx, m, lx + lid_w, m + lid_h + 10], radius=int(lid_w * 0.022), fill=(29, 29, 31), outline=(185, 185, 190), width=3)
    c.alpha_composite(round_corners(s, 6), (lx + bez, m + bez))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle([m, m + lid_h, m + W, m + lid_h + base_h], radius=base_h // 2, fill=(205, 205, 210))
    d.rectangle([m, m + lid_h, m + W, m + lid_h + base_h // 3], fill=(226, 226, 230))
    nw = int(W * 0.12)
    d.rounded_rectangle([m + W // 2 - nw // 2, m + lid_h, m + W // 2 + nw // 2, m + lid_h + base_h // 2], radius=6, fill=(176, 176, 181))
    return c


def fit_aspect(im, aspect, anchor='top'):
    """Crop to width/height == aspect, keeping the top (or centre)."""
    w, h = im.size
    if w / h > aspect:
        nw = round(h * aspect)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / aspect)
    y = 0 if anchor == 'top' else (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def main():
    cfg = json.load(open(sys.argv[1], encoding='utf-8'))
    base = os.path.dirname(os.path.abspath(sys.argv[1]))
    raw = os.path.join(base, cfg['raw'])
    out = os.path.join(base, cfg['out'])
    os.makedirs(out, exist_ok=True)
    # Each job runs twice: on its raw, and on the dark theme's raw beside it
    # (<name>_dark.png), whose outputs take the same _dark suffix.
    for job, suffix in [(j, s) for j in cfg['jobs'] for s in ('', '_dark')]:
        dev = cfg['devices'][job['device']]
        src = os.path.join(raw, job['src'][:-4] + suffix + '.png')
        if not os.path.exists(src):
            print('missing', os.path.basename(src))
            continue
        if job['as'] == 'mac':
            im = dress_mac(src, dev['sb'], dev['nb'], dev['scale'], clock=job.get('clock'), dark=bool(suffix))
            if job.get('aspect'):
                im = fit_aspect(im, job['aspect'])
        else:
            im = dress_ios(src, dev['sb'], dev['nb'], dev['scale'], job.get('aspect'), job.get('clock'), dev.get('home'), dev.get('status', True))
        if job.get('screen'):
            im.convert('RGB').save(os.path.join(out, job['screen'] + suffix + '.png'), optimize=True)
        if job.get('frame'):
            kind = job.get('frameKind', 'tablet')
            f = {'tablet': frame_tablet, 'phone': frame_phone, 'laptop': frame_laptop}[kind](im)
            f.save(os.path.join(out, job['frame'] + suffix + '.png'), optimize=True)
        print('done', os.path.basename(src), '->', job.get('screen'), job.get('frame'), suffix)


if __name__ == '__main__':
    main()
