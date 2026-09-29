#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fold the built site into one self-contained file, Recipes.html, for sending around and
reading offline without a browser install. Run build.py first. Standard library only."""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rd(rel, mode="r"):
    with open(os.path.join(ROOT, rel), mode if mode == "rb" else "r", encoding=None if mode == "rb" else "utf-8") as f:
        return f.read()


def data_uri(rel, mime):
    return "data:%s;base64,%s" % (mime, base64.b64encode(rd(rel, "rb")).decode("ascii"))


def main():
    page = rd("index.html")

    fonts_css = re.sub(r"url\(fonts/([^)]+)\)", lambda m: "url(%s)" % data_uri("fonts/" + m.group(1), "font/woff2"),
                       rd("fonts.css"))
    page = re.sub(r'<link rel="preload"[^>]*>\n?', "", page)
    page = page.replace('<link rel="stylesheet" href="fonts.css">', "<style>%s</style>" % fonts_css, 1)
    page = page.replace('<link rel="stylesheet" href="app.css">', "<style>\n%s</style>" % rd("app.css"), 1)
    page = page.replace('<link rel="manifest" href="manifest.webmanifest">\n', "", 1)
    page = page.replace('href="icons/icon-192.png"', 'href="%s"' % data_uri("icons/icon-192.png", "image/png"), 1)
    page = page.replace('href="icons/apple-touch-icon.png"', 'href="%s"' % data_uri("icons/apple-touch-icon.png", "image/png"), 1)
    for name in ("data.js", "dish.js", "app.js"):
        src = rd(name)
        assert "</script" not in src.lower(), name + " would close the script tag"
        page = page.replace('<script src="%s"></script>' % name, "<script>\n%s</script>" % src, 1)
    assert 'src="' not in page.split("<body>", 1)[1].rsplit("</body>", 1)[0].replace("bigart", ""), "an external reference survived"

    out = os.path.join(ROOT, "Recipes.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print("bundled Recipes.html %d KB" % (os.path.getsize(out) // 1024))


if __name__ == "__main__":
    sys.exit(main())
