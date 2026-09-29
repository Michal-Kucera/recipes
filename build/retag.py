#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Re-derive the ingredient tags in build/recipes.json from the vocabulary in pantry.py.
Run after editing a recipe's ingredients or the vocabulary; then build.py. Standard library only."""
import collections, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pantry import ITEMS  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
PAT = [(i, re.compile(p, re.I)) for i, (l, c, p, s) in enumerate(ITEMS)]
IDX = {l: i for i, (l, c, p, s) in enumerate(ITEMS)}
SKIP = re.compile(r"(?i)^(main( dish| plate)?|vegetables?|fresh (vegetables|veggies|fruits?)|optional.*|omelette|"
                  r"herbs|drink.*|on the side|dough|toppings?|serving|for serving|calories.*|total calories.*|"
                  r"approximate calories.*)$")
OPT = re.compile(r"(?i)\boptional\b|to taste|if desired|if you (like|wish)|or skip")
CHEESE = [IDX[x] for x in ["Cottage cheese", "Cream cheese", "Feta", "Mozzarella", "Parmesan / hard cheese", "Halloumi"]]
SEED = [IDX[x] for x in ["Chia seeds", "Flax seeds", "Sesame seeds", "Pumpkin / sunflower seeds"]]


def tags_for(line):
    hits = sorted(i for i, p in PAT if p.search(line.lower()))
    if any(i in hits for i in CHEESE): hits = [i for i in hits if i != IDX["Cheese (any)"]]
    if any(i in hits for i in SEED):   hits = [i for i in hits if i != IDX["Mixed seeds"]]
    return hits


def main():
    path = os.path.join(HERE, "recipes.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    for r in data["recipes"]:
        req, opt, lt = set(), set(), []
        for x in r["i"]:
            hits = tags_for(x) if not SKIP.match(x.strip().rstrip(":")) else []
            lt.append(hits)
            (opt if OPT.search(x.lower()) else req).update(hits)
        r["g"], r["o"], r["lt"] = sorted(req), sorted(opt - req), lt
    counts = collections.Counter(i for r in data["recipes"] for i in r["g"] + r["o"])
    data["items"] = [{"n": l, "c": c, "s": bool(s), "q": counts.get(i, 0)} for i, (l, c, _, s) in enumerate(ITEMS)]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("retagged %d recipes against %d pantry items" % (len(data["recipes"]), len(ITEMS)))


if __name__ == "__main__":
    sys.exit(main())
