"""Generate the PWA icons (rounded emerald tile, white book-and-x mark).

Emerald instead of the PowerMath sky-blue on purpose: both apps sit on the same
iPad home screen during the handover, and the child must be able to tell them
apart at a glance.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "app", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (16, 185, 129)       # #10b981 emerald
BG_DARK = (4, 120, 87)    # #047857
FG = (255, 255, 255)


def font(size):
    for name in ("arialbd.ttf", "seguisb.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make(size, path, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG)
    else:
        r = size * 0.22
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    # subtle bottom shade
    d.pieslice([-size * 0.4, size * 0.55, size * 1.4, size * 1.8], 180, 360, fill=BG_DARK + (60,))
    f_big = font(int(size * 0.46))
    f_small = font(int(size * 0.18))
    d.text((size * 0.5, size * 0.42), "L", font=f_big, fill=FG, anchor="mm")
    d.text((size * 0.5, size * 0.74), "×  abc", font=f_small, fill=FG, anchor="mm")
    img.convert("RGB" if maskable else "RGBA").save(path)
    print("wrote", path)


make(180, os.path.join(OUT, "icon-180.png"))
make(192, os.path.join(OUT, "icon-192.png"))
make(512, os.path.join(OUT, "icon-512.png"))
make(512, os.path.join(OUT, "icon-512-maskable.png"), maskable=True)
