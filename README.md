# Recipes

A recipe book as a small static site: 406 recipes in grams and millilitres, a random
day generator, a what's-in-my-fridge filter, a cooked-already list, a shopping list with
Reminders export, and a calendar export. Installable on an iPhone home screen and works
offline after the first visit.

Live: https://michal-kucera.github.io/recipes/ · Single-file copy: `Recipes.html`

## Layout

| File | What it is |
| --- | --- |
| `index.html` | **Generated.** The page, with every recipe as real markup - readable without JavaScript. |
| `app.css` | Styles. Phone-first; a single dark theme, tokens at the top. |
| `app.js` | The app. Adopts the recipe markup and adds the interactive parts. |
| `dish.js` | Draws each recipe's plate from its own ingredient tags. |
| `data.js` | **Generated.** Ingredient vocabulary and per-recipe tags for the app. |
| `sw.js` | **Generated.** Service worker; cache name changes every build. |
| `Recipes.html` | **Generated.** Everything above folded into one self-contained file. |
| `fonts/`, `fonts.css` | Fraunces and Hanken Grotesk, self-hosted. |
| `icons/`, `og.png` | Home-screen icons and link-preview image (`build/icons.py`). |
| `build/recipes.json` | **The source.** Every recipe: text, servings, kcal, ingredient tags. |
| `build/pantry.py` | The ingredient vocabulary the filters and shopping list run on. |
| `tests/` | Behavioural tests, run in jsdom against `Recipes.html`. |

## Editing a recipe

1. Change it in `build/recipes.json` (`i` = ingredient lines, `p` = method steps, `s` = servings, `k` = kcal).
2. If ingredients changed: `python3 build/retag.py` re-derives the tags.
3. `python3 build/build.py && python3 build/bundle.py`
4. `cd tests && npm install && npm test`
5. Commit and push. GitHub Pages redeploys in about a minute.

`build.py` and `bundle.py` need only the Python standard library. `icons.py` needs Pillow.

## Conventions worth knowing

- Servings drive the calendar export: a recipe "for 2 servings" becomes a two-day event.
- Salt, oil and spices are "staples" (`pantry.py`, last column) and are assumed to be in the cupboard.
- Storage keys in `app.js` keep their historical names; renaming them resets everyone's saved state.
- The page is `noindex` on purpose: shareable by link, not by search.
