#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate the site from build/recipes.json.

    python3 build/build.py          # writes index.html, data.js, sw.js
    python3 build/bundle.py         # then: Recipes.html, the single-file offline copy

index.html carries every recipe as real markup, so the book reads without JavaScript.
app.js adopts that markup at runtime and adds the interactive parts. Only the standard
library is needed.
"""
import datetime, hashlib, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
SITE = "https://michal-kucera.github.io/recipes/"
TITLE = "Recipes"
DESC = ("406 recipes in grams and millilitres, with a random day generator, "
        "a what's-in-my-fridge filter and a shopping list.")

MEALS = [("breakfast", "Breakfast"), ("lunch", "Lunch"), ("dinner", "Dinner"), ("snack", "Snacks & Smoothies")]
GRP_WORDS = {"optional", "toppings", "topping", "for serving", "serving", "dressing", "salad", "base",
             "filling", "sauce", "drink", "garnish", "assemble", "serve", "finish", "to serve"}


def read(name):
    with open(os.path.join(BUILD, name), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return os.path.getsize(path)


def groups(lines, is_step):
    """The coach wrote sub-headings inline ("For the sauce", "Cook the rice"). Detect them so they
    render as headings. Mirrors the rules the page used before the cards were pre-rendered."""
    lower = sum(1 for x in lines if x and x[0].islower())
    allow = (not is_step) or lower <= max(1, 0.2 * len(lines))
    out = []
    for k, x in enumerate(lines):
        head = False
        if allow and x:
            words = len(x.split())
            if is_step:
                head = x[0] == x[0].upper() and x[-1] not in ".!?" and words <= 6
            else:
                low = x.lower().rstrip(":")
                if not re.search(r"\d", x) and " - " not in x:
                    if low.startswith("for ") and words <= 8 and "," not in x:
                        head = True
                    elif "," not in x and words <= 5 and (x.endswith(":") or low in GRP_WORDS):
                        head = True
            if head and (k == len(lines) - 1 or (out and out[-1][0])):
                head = False
        out.append((head, x.rstrip(":")))
    return out


def li(items):
    return "".join('<li class="grp">%s</li>' % html.escape(x) if h else "<li>%s</li>" % html.escape(x)
                   for h, x in items)


def card(idx, r, items):
    meta = " · ".join(v for v in (r.get("s"), r.get("k")) if v)
    needed = sum(1 for i in r["g"] if not items[i]["s"])
    body = ('<div class="bigart" data-bigart></div><p class="miss-note hidden" data-miss></p>'
            '<p class="lbl">Ingredients</p><ul>%s</ul>' % li(groups(r["i"], False)))
    if r.get("p"):
        body += '<p class="lbl">Method</p><ol>%s</ol>' % li(groups(r["p"], True))
    return ('<details class="card" id="r%d"><summary><span class="thumb" data-thumb></span>'
            '<h3>%s</h3><span class="cmeta">%s<span data-badge><span class="badge b-neut">%d ingredient%s</span></span>'
            '<button class="cook" type="button" data-cook>Mark cooked</button></span></summary>'
            '<div class="body" data-body>%s</div></details>'
            % (idx, html.escape(r["t"]), "<span>%s</span>" % html.escape(meta) if meta else "",
               needed, "" if needed == 1 else "s", body))


def section(key, label, recipes, items):
    rows = sorted(recipes, key=lambda p: p[1]["t"].lower())
    cards = "\n".join(card(i, r, items) for i, r in rows)
    return ('<section class="sec" id="sec-%s"><div class="sec-head"><h2>%s</h2>'
            '<span class="count" data-count>%d recipes</span>'
            '<span class="ctl"><label for="sort-%s">Sort</label><select id="sort-%s" data-sort>'
            '<option value="az">A &ndash; Z</option><option value="match">Closest to my kitchen</option>'
            '<option value="short">Fewest ingredients</option></select></span></div>'
            '<div class="grid" data-grid>\n%s\n</div><p class="empty hidden" data-empty></p></section>'
            % (key, label, len(rows), key, key, cards))


def main():
    data = json.loads(read("recipes.json"))
    items, recipes = data["items"], data["recipes"]

    # ---- data.js: what the app needs at runtime (the text already lives in the markup) ----
    slim = {"items": items,
            "recipes": [{"t": r["t"], "m": r["m"], "s": r.get("s"), "k": r.get("k"),
                         "g": r["g"], "o": r.get("o", []), "n": len(r["i"]), "lt": r.get("lt", [])}
                        for r in recipes]}
    data_js = "window.RECIPES_DATA = %s;\n" % json.dumps(slim, ensure_ascii=False, separators=(",", ":"))

    # ---- index.html ----
    sections = "\n".join(section(k, label, [(i, r) for i, r in enumerate(recipes) if r["m"] == k], items)
                         for k, label in MEALS)
    counts = {k: sum(1 for r in recipes if r["m"] == k) for k, _ in MEALS}
    fonts = sorted(f for f in os.listdir(os.path.join(ROOT, "fonts")) if f.endswith(".woff2"))
    preload = "\n".join('<link rel="preload" href="fonts/%s" as="font" type="font/woff2" crossorigin>' % f
                        for f in fonts if "latin-ext" not in f)
    body = read("body.html")
    for k, v in {"SECTIONS": sections, "N_TOTAL": len(recipes), "N_BREAKFAST": counts["breakfast"],
                 "N_LUNCH": counts["lunch"], "N_DINNER": counts["dinner"], "N_SNACK": counts["snack"],
                 "N_ITEMS": sum(1 for i in items if i["q"] > 0),
                 "BUILT": datetime.date.today().strftime("%-d %B %Y")}.items():
        body = body.replace("{{%s}}" % k, str(v))
    assert "{{" not in body, "unfilled placeholder"
    page = read("head.html").replace("{{TITLE}}", TITLE).replace("{{DESC}}", html.escape(DESC, quote=True)) \
        .replace("{{SITE}}", SITE).replace("{{PRELOAD}}", preload) + body + read("tail.html")

    # ---- sw.js: a fresh cache name per build, so no one is ever pinned to a stale copy ----
    stamp = hashlib.sha1((page + data_js + read_root("app.js") + read_root("app.css") + read_root("dish.js"))
                         .encode("utf-8")).hexdigest()[:10]
    core = ["./", "index.html", "app.css", "app.js", "dish.js", "data.js", "fonts.css", "manifest.webmanifest"] \
        + ["fonts/" + f for f in fonts] \
        + ["icons/" + f for f in sorted(os.listdir(os.path.join(ROOT, "icons")))]
    sw = read("sw.template.js").replace("{{CACHE}}", "recipes-" + stamp).replace("{{CORE}}", json.dumps(core))

    sizes = {"index.html": write("index.html", page), "data.js": write("data.js", data_js), "sw.js": write("sw.js", sw)}
    print("built " + ", ".join("%s %d KB" % (k, v // 1024) for k, v in sizes.items()) + " | cache recipes-" + stamp)


def read_root(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


if __name__ == "__main__":
    sys.exit(main())
