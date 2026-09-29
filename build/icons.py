#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""App icons and the link-preview image. Needs Pillow (pip install pillow); the preview title
uses the site's own display face if fontTools+brotli are installed, else a system font.
Outputs are committed, so this only needs re-running when the colours or the mark change."""
import glob, os, sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GREEN, PLATE, RIM, HONEY = (52, 97, 58), (251, 248, 241), (222, 212, 194), (214, 160, 20)
PAPER, INK, INK2 = (244, 239, 229), (35, 32, 27), (94, 87, 76)


def mark(size, pad=0.0):
    s = size * 4
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    p = int(s * pad)
    d.rounded_rectangle([p, p, s - 1 - p, s - 1 - p], radius=int((s - 2 * p) * 0.225), fill=GREEN + (255,))
    c, r = s / 2, (s - 2 * p) * 0.30
    d.ellipse([c - r, c - r, c + r, c + r], fill=PLATE + (255,))
    d.ellipse([c - r, c - r, c + r, c + r], outline=RIM + (255,), width=int(s * 0.012))
    r2 = (s - 2 * p) * 0.135
    d.ellipse([c - r2, c - r2, c + r2, c + r2], fill=HONEY + (255,))
    return im.resize((size, size), Image.LANCZOS)


def title_font(size):
    try:
        from fontTools.ttLib import TTFont
        src = glob.glob(os.path.join(ROOT, "fonts", "fraunces-latin-*.woff2"))[0]
        TTFont(src).save("/tmp/recipes-fraunces.ttf")
        f = ImageFont.truetype("/tmp/recipes-fraunces.ttf", size)
        try:
            f.set_variation_by_axes([144, 600])
        except Exception:
            pass
        return f
    except Exception:
        for p in ("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"):
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
        return ImageFont.load_default()


def body_font(size):
    for p in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    icons = os.path.join(ROOT, "icons")
    os.makedirs(icons, exist_ok=True)
    mark(192).save(os.path.join(icons, "icon-192.png"), optimize=True)
    mark(512).save(os.path.join(icons, "icon-512.png"), optimize=True)
    mark(512, 0.10).save(os.path.join(icons, "icon-512-maskable.png"), optimize=True)   # safe zone
    mark(180).convert("RGB").save(os.path.join(icons, "apple-touch-icon.png"), optimize=True)  # iOS: no alpha

    og = Image.new("RGB", (1200, 630), PAPER)
    d = ImageDraw.Draw(og)
    m = mark(300)
    og.paste(m, (96, 165), m)
    d.text((450, 190), "Recipes", font=title_font(150), fill=INK)
    sub = body_font(35)
    d.text((456, 372), "406 recipes, in grams and millilitres", font=sub, fill=INK2)
    d.text((456, 420), "Day generator · fridge filter · shopping list", font=sub, fill=INK2)
    og.save(os.path.join(ROOT, "og.png"), optimize=True)
    print("icons/ and og.png written")


if __name__ == "__main__":
    sys.exit(main())
