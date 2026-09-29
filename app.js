/* Recipes - the app. Progressive enhancement over index.html: the recipes are already in the
   markup; this adds the day generator, fridge filter, cooked list, shopping list, calendar export.
   Storage keys keep their historical names - renaming them would reset everyone's saved state. */
(function () {
  "use strict";
  /* if anything below throws, say so instead of leaving a half-built page */
  window.addEventListener("error", function (ev) {
    var b = document.getElementById("errbar");
    if (!b) return;
    b.textContent = "The interactive parts hit an error (" + (ev.message || "unknown") +
      "). The recipes below are still readable - reload to try again.";
    b.classList.remove("hidden");
  });
  /* offline after the first visit - only where a service worker can actually be served */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  var DATA = window.RECIPES_DATA;
  var ITEMS = DATA.items, RECIPES = DATA.recipes;
  var MEALS = [
    { k: "breakfast", label: "Breakfast", short: "Breakfast" },
    { k: "lunch", label: "Lunch", short: "Lunch" },
    { k: "dinner", label: "Dinner", short: "Dinner" },
    { k: "snack", label: "Snacks & Smoothies", short: "Snacks" }
  ];
  var CATS = ["Vegetables", "Fruit", "Protein", "Dairy", "Grains", "Nuts & seeds", "Pantry", "Staples"];
  var KEY = "plated-v1";

  var state = { have: {}, skip: {}, allow: 0, staples: true, only: false, q: "", picks: {} };

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) {
      state.have = saved.have || {}; state.skip = saved.skip || {};
      state.allow = saved.allow || 0;
      state.staples = saved.staples !== false;
      state.only = !!saved.only;
    }
  } catch (e) { /* private window or blocked storage - defaults are fine */ }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        have: state.have, skip: state.skip, allow: state.allow,
        staples: state.staples, only: state.only
      }));
    } catch (e) { /* ignore */ }
  }

  function fold(t) {                 /* "jamon" finds "jamón" */
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  RECIPES.forEach(function (r, i) {
    r.id = i;
    r.hay = fold(r.t + " " + (r.i ? r.i.join(" ") : "") + " " + (r.p ? r.p.join(" ") : ""));
  });

  /* recipes you have already cooked, kept in this browser under their own key
     so clearing them never touches the kitchen */
  var CKEY = "plated-cooked-v1";
  var cooked = {}, showCooked = false;
  try { cooked = JSON.parse(localStorage.getItem(CKEY) || "{}") || {}; } catch (e) { cooked = {}; }
  function saveCooked() { try { localStorage.setItem(CKEY, JSON.stringify(cooked)); } catch (e) {} }
  function keyOf(r) { return r.m + "|" + r.t; }
  function isCooked(r) { return !!cooked[keyOf(r)]; }
  function cookedCount() { return Object.keys(cooked).length; }

  function haveCount() { return Object.keys(state.have).length; }

  /* r.g = what the recipe really needs, r.o = items it marks optional or "to taste" */
  function needed(r) {
    if (!state.staples) return r.g;
    return r.g.filter(function (i) { return !ITEMS[i].s; });
  }
  function missingOf(r) {
    return needed(r).filter(function (i) { return !state.have[i]; });
  }
  function blocked(r) {
    return r.g.some(function (i) { return state.skip[i]; });
  }
  function visible(r) {
    if (isCooked(r) && !showCooked) return false;
    if (blocked(r)) return false;
    if (state.q && r.hay.indexOf(state.q) === -1) return false;
    if (state.only && haveCount() > 0 && missingOf(r).length > state.allow) return false;
    return true;
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------- pantry chips ---------- */
  var catsEl = document.getElementById("cats");
  CATS.forEach(function (cat) {
    var list = ITEMS.map(function (it, i) { return { it: it, i: i }; })
      .filter(function (o) { return o.it.c === cat && o.it.q > 0; })
      .sort(function (a, b) { return b.it.q - a.it.q || a.it.n.localeCompare(b.it.n); });
    if (!list.length) return;
    var box = document.createElement("div");
    box.className = "cat";
    var h = document.createElement("h3");
    h.textContent = cat === "Staples" ? "Staples (assumed in the cupboard)" : cat;
    box.appendChild(h);
    var chips = document.createElement("div");
    chips.className = "chips";
    list.forEach(function (o) {
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.dataset.i = o.i;
      b.innerHTML = '<span class="mark"></span><span class="nm"></span><span class="n"></span>';
      b.querySelector(".nm").textContent = o.it.n;
      b.querySelector(".n").textContent = o.it.q;
      chips.appendChild(b);
    });
    box.appendChild(chips);
    catsEl.appendChild(box);
  });

  catsEl.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    var i = chip.dataset.i, was = haveCount();
    if (state.have[i]) { delete state.have[i]; state.skip[i] = 1; }
    else if (state.skip[i]) { delete state.skip[i]; }
    else { state.have[i] = 1; }
    /* the first thing you tick is the cue to start ranking by what you can actually cook */
    if (!was && haveCount()) {
      document.querySelectorAll("[data-sort]").forEach(function (sel) {
        if (sel.value === "az") sel.value = "match";
      });
    }
    save(); paintChips(); apply();
  });

  function paintChips() {
    catsEl.querySelectorAll(".chip").forEach(function (chip) {
      var i = chip.dataset.i, s = state.have[i] ? "have" : (state.skip[i] ? "skip" : "");
      if (s) chip.dataset.s = s; else delete chip.dataset.s;
      chip.querySelector(".mark").textContent = s === "have" ? "✓" : (s === "skip" ? "✕" : "");
      chip.setAttribute("aria-label", ITEMS[i].n + ", in " + ITEMS[i].q + " recipes" +
        (s === "have" ? ", I have it" : s === "skip" ? ", skipping recipes with it" : ""));
    });
    var h = haveCount(), s = Object.keys(state.skip).length, sum = document.getElementById("pantry-sum");
    if (!h && !s) { sum.className = "badge b-neut"; sum.textContent = "nothing ticked"; }
    else {
      sum.className = "badge " + (h ? "b-have" : "b-miss");
      sum.textContent = (h ? h + " in the kitchen" : "") + (h && s ? " · " : "") + (s ? s + " to skip" : "");
    }
  }

  var panel = document.getElementById("pantry-panel");
  panel.addEventListener("toggle", function () {
    document.getElementById("pantry-chev").textContent = panel.open ? "Close" : "Open";
  });
  document.getElementById("clear-pantry").addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    state.have = {}; state.skip = {};
    save(); paintChips(); apply();
  });

  /* ---------- recipe cards ---------- */
  var secWrap = document.getElementById("sections");
  var cardsByMeal = {};


  /* the ingredients and method ship as HTML; JS adds the drawing and the shopping note */
  function fillBody(r, el) {
    var art = el.querySelector("[data-bigart]");
    if (art && !art.firstChild) art.innerHTML = dishSVG(r);
    if (!el.querySelector(".calrow")) el.insertAdjacentHTML("beforeend", calRowHTML(r));
    var note = el.querySelector("[data-miss]");
    if (!note) return;
    var miss = haveCount() ? missingOf(r) : [];
    if (!miss.length) { note.className = "miss-note hidden"; note.textContent = ""; return; }
    note.className = "miss-note";
    note.textContent = "Still need: " +
      miss.map(function (i) { return ITEMS[i].n.toLowerCase(); }).join(", ");
  }

  /* the cards are already in the document - take them over rather than rebuild them */
  MEALS.forEach(function (m) {
    var sec = document.getElementById("sec-" + m.k);
    var grid = sec.querySelector("[data-grid]");
    var list = [];
    [].forEach.call(grid.children, function (card) {
      var r = RECIPES[+card.id.slice(1)];
      r.el = card;
      r.hay = fold(card.querySelector("h3").textContent + " " +
        card.querySelector("[data-body]").textContent);   /* title, ingredients and method - not the buttons */
      card.addEventListener("toggle", function () {
        if (card.open) fillBody(r, card.querySelector("[data-body]"));
      });
      list.push(r);
    });
    sec.querySelector("[data-sort]").addEventListener("change", function () {
      sortGrid(m.k, this.value); apply();
    });
    cardsByMeal[m.k] = { sec: sec, grid: grid, list: list };
  });

  function sortGrid(meal, mode) {
    var g = cardsByMeal[meal];
    var arr = g.list.slice();
    if (mode === "az") arr.sort(function (a, b) { return a.t.localeCompare(b.t); });
    else if (mode === "short") arr.sort(function (a, b) { return a.n - b.n || a.t.localeCompare(b.t); });
    else arr.sort(function (a, b) {
      return missingOf(a).length - missingOf(b).length || a.t.localeCompare(b.t);
    });
    var frag = document.createDocumentFragment();
    arr.forEach(function (r) { frag.appendChild(r.el); });
    g.grid.appendChild(frag);
  }

  /* a plate is only drawn when its card is about to be seen - 406 of them at boot is too much */
  var drawThumb = function (card, r) {
    var t = card.querySelector("[data-thumb]");
    if (t && !t.firstChild) t.innerHTML = dishSVG(r);
  };
  if ("IntersectionObserver" in window) {
    var thumbIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        drawThumb(en.target, RECIPES[+en.target.id.slice(1)]);
        thumbIO.unobserve(en.target);
      });
    }, { rootMargin: "400px 0px" });
    RECIPES.forEach(function (r) { thumbIO.observe(r.el); });
  } else {
    RECIPES.forEach(function (r) { drawThumb(r.el, r); });
  }

  /* ---------- sticky course nav ---------- */
  var navEl = document.getElementById("nav");
  MEALS.forEach(function (m) {
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.nav = m.k;
    b.innerHTML = m.short + '<span class="n" data-navn></span>';
    b.addEventListener("click", function () {
      cardsByMeal[m.k].sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    navEl.appendChild(b);
  });

  if ("IntersectionObserver" in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting; });
      var cur = MEALS.filter(function (m) { return seen["sec-" + m.k]; })[0];
      navEl.querySelectorAll("[data-nav]").forEach(function (b) {
        if (cur && b.dataset.nav === cur.k) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
    }, { rootMargin: "-25% 0px -60% 0px" });
    MEALS.forEach(function (m) { io.observe(cardsByMeal[m.k].sec); });
  }

  /* ---------- day generator ---------- */
  var slotsEl = document.getElementById("slots");
  var MKEY = "plated-menu-v1", menuDay = null;
  function today() { return new Date().toISOString().slice(0, 10); }
  function saveMenu() {
    try {
      var picks = {};
      MEALS.slice(0, 3).forEach(function (m) { if (state.picks[m.k]) picks[m.k] = keyOf(state.picks[m.k]); });
      localStorage.setItem(MKEY, JSON.stringify({ day: menuDay || today(), picks: picks, ticked: ticked, all: shopAll }));
    } catch (e) {}
  }
  function restoreMenu() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(MKEY) || "null"); } catch (e) {}
    if (!saved || !saved.picks) return;
    menuDay = saved.day || null;
    ticked = saved.ticked || {};
    shopAll = !!saved.all;
    var byKey = {};
    RECIPES.forEach(function (r) { byKey[keyOf(r)] = r; });
    MEALS.slice(0, 3).forEach(function (m) {
      var r = byKey[saved.picks[m.k]];
      if (r && visible(r) && !isCooked(r)) state.picks[m.k] = r;
    });
  }
  function paintMenuDay() {
    var el = document.getElementById("gen-sub");
    if (!el) return;
    if (menuDay && menuDay !== today()) {
      var d = new Date(menuDay + "T12:00:00");
      el.textContent = "Menu from " + d.toLocaleDateString(undefined, { weekday: "long" }) +
        " - shuffle for a new day.";
    } else {
      el.textContent = "Picked at random from the recipes that pass your filters.";
    }
  }
  MEALS.slice(0, 3).forEach(function (m) {
    var d = document.createElement("details");
    d.className = "slot";
    d.dataset.meal = m.k;
    d.innerHTML = '<summary><span class="meal">' + m.label + "</span>" +
      '<span class="srow"><span class="thumb" data-slotart></span><span class="scol">' +
      '<span class="pick" data-go aria-live="polite"></span>' +
      '<span class="meta" data-meta></span></span></span>' +
      '<span class="foot"><span data-badge></span>' +
      '<button class="reroll" type="button" data-reroll>Another one</button>' +
      '<span class="hint" data-hint>Show recipe</span></span></summary>' +
      '<div class="slotbody" data-slotbody></div>';
    d.querySelector("[data-reroll]").addEventListener("click", function (e) {
      e.preventDefault();          /* sits inside <summary> - re-roll without collapsing */
      e.stopPropagation();
      roll(m.k);
      renderShop();                    /* a new pick means a new list */
    });
    d.addEventListener("toggle", function () {
      d.querySelector("[data-hint]").textContent = d.open ? "Hide recipe" : "Show recipe";
      if (d.open) fillSlotBody(m.k);
    });
    slotsEl.appendChild(d);
  });

  /* the whole recipe, right inside the menu - no jumping down the page */
  function fillSlotBody(meal) {
    var d = slotsEl.querySelector('[data-meal="' + meal + '"]');
    var box = d.querySelector("[data-slotbody]"), r = state.picks[meal];
    if (!r) { box.innerHTML = ""; return; }
    box.innerHTML = r.el.querySelector("[data-body]").innerHTML;
    fillBody(r, box);
  }

  function roll(meal) {
    /* never suggest something you have already cooked, even while they are shown */
    var pool = cardsByMeal[meal].list.filter(function (r) { return visible(r) && !isCooked(r); });
    if (!pool.length) { state.picks[meal] = null; paintSlot(meal); return; }
    var prev = state.picks[meal];
    var pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && prev && pick === prev) pick = pool[(pool.indexOf(prev) + 1) % pool.length];
    state.picks[meal] = pick;
    paintSlot(meal);
    saveMenu();
  }

  function badgeHTML(r) {
    if (!haveCount()) {
      var n = needed(r).length;
      return '<span class="badge b-neut">' + n + " ingredient" + (n === 1 ? "" : "s") + "</span>";
    }
    var miss = missingOf(r).length;
    return miss === 0
      ? '<span class="badge b-have"><span class="dot"></span>Ready to cook</span>'
      : '<span class="badge b-miss">' + miss + " to buy</span>";
  }

  function paintSlot(meal) {
    var d = slotsEl.querySelector('[data-meal="' + meal + '"]');
    var r = state.picks[meal];
    var go = d.querySelector("[data-go]");
    if (!r) {
      go.textContent = "No match";
      d.querySelector("[data-meta]").textContent = "Loosen the filters to see something here.";
      d.querySelector("[data-badge]").innerHTML = "";
      d.querySelector("[data-slotart]").innerHTML = "";
      d.querySelector("[data-slotbody]").innerHTML = "";
      return;
    }
    go.textContent = r.t;
    d.querySelector("[data-meta]").textContent = [r.s, r.k].filter(Boolean).join(" · ") || " ";
    d.querySelector("[data-badge]").innerHTML = badgeHTML(r);
    if (typeof dishSVG === "function") d.querySelector("[data-slotart]").innerHTML = dishSVG(r);
    if (d.open) fillSlotBody(meal);
  }

  /* the per-recipe actions need JavaScript, so they are added when a recipe opens, never frozen into the HTML */
  function calRowHTML(r) {
    return '<p class="calrow"><button class="btn" type="button" data-cal>Add to Calendar</button>' +
      '<button class="btn" type="button" data-rcopy>Copy ingredients</button>' +
      '<button class="btn" type="button" data-rshare>Share\u2026</button>' +
      '<button class="btn" type="button" data-rremind>Send to Reminders</button>' +
      "<small>Calendar: " + (servingDays(r) > 1 ? servingDays(r) + " servings, so " + servingDays(r) + " days" : "one day") +
      " from today. Ingredients leave out what your kitchen already has.</small></p>";
  }
  if (!navigator.share) document.documentElement.classList.add("no-share");

  /* ---------- calendar export (.ics, one day per serving) ---------- */
  var SITE = "https://michal-kucera.github.io/recipes/";
  var MEAL_TIME = { breakfast: [8, 0, 30], lunch: [13, 0, 45], dinner: [19, 0, 45], snack: [16, 0, 15] };

  function servingDays(r) {
    var m = /(\d+)\s*(?:-\s*(\d+))?/.exec(r.s || "");
    if (!m) return 1;
    var n = parseInt(m[2] || m[1], 10);
    return n >= 1 && n <= 7 ? n : 1;
  }
  function recipeLines(r, sel) {            /* read the recipe as shown, headings included */
    var body = r.el && r.el.querySelector("[data-body]");
    if (body) {
      return [].map.call(body.querySelectorAll(sel + " li"), function (li) {
        var t = li.textContent.trim();
        return li.classList.contains("grp") ? "\u2014 " + t + " \u2014" : t;
      });
    }
    return sel === "ul" ? (r.i || []) : (r.p || []);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function icsLocal(d, h, m) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(h) + pad(m) + "00";
  }
  function icsEscape(t) {
    return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  function icsFold(line) {                  /* RFC 5545: lines of at most 75 octets, folded with CRLF + space */
    var out = [], cur = "", size = 0, limit = 72;
    for (var ch of line) {
      var n = ch.length > 1 ? 4 : (encodeURIComponent(ch).match(/%/g) || [1]).length; /* bytes in UTF-8 */
      if (size + n > limit) { out.push(cur); cur = " "; size = 1; limit = 73; }
      cur += ch; size += n;
    }
    out.push(cur);
    return out.join("\r\n");
  }
  function icsEvent(r, meal, start, seq) {
    var t = MEAL_TIME[meal] || MEAL_TIME.snack, days = servingDays(r);
    var begin = new Date(start); begin.setHours(t[0], t[1], 0, 0);
    var end = new Date(begin); end.setMinutes(end.getMinutes() + t[2]);
    var label = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" }[meal] || "Meal";
    var link = SITE + "#r" + r.id;
    var ing = recipeLines(r, "ul"), steps = recipeLines(r, "ol");
    var desc = [label + ": " + r.t, [r.s, r.k].filter(Boolean).join(" \u00b7 "), ""]
      .concat(ing.length ? ["INGREDIENTS"].concat(ing.map(function (x) { return "\u2022 " + x; })) : [])
      .concat(steps.length ? ["", "METHOD"].concat(steps.map(function (x, i) { return (i + 1) + ". " + x; })) : [])
      .concat(["", link]).join("\n");
    var lines = [
      "BEGIN:VEVENT",
      "UID:recipes-" + icsLocal(start, 0, 0).slice(0, 8) + "-" + meal + "-" + r.id + "-" + seq + "@michal-kucera.github.io",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
      "DTSTART:" + icsLocal(begin, begin.getHours(), begin.getMinutes()),
      "DTEND:" + icsLocal(end, end.getHours(), end.getMinutes()),
      "SUMMARY:" + icsEscape(label + ": " + r.t),
      "DESCRIPTION:" + icsEscape(desc),
      "URL:" + link,
      "CATEGORIES:Recipes"
    ];
    if (days > 1) lines.splice(5, 0, "RRULE:FREQ=DAILY;COUNT=" + days);
    lines.push("END:VEVENT");
    return lines;
  }
  function buildICS(items) {                /* items: [{r, meal}] */
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Recipes//Recipe book//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Recipes"];
    items.forEach(function (it, i) { lines = lines.concat(icsEvent(it.r, it.meal, start, i)); });
    lines.push("END:VCALENDAR");
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }
  /* iPadOS reports itself as a Mac; a Mac with a touch screen is an iPad */
  var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  function openICS(text, name) {
    var a = document.createElement("a");
    var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    a.href = (window.URL && URL.createObjectURL) ? URL.createObjectURL(blob)
      : "data:text/calendar;charset=utf-8," + encodeURIComponent(text);
    if (!IOS) a.download = name;          /* iPhone: no download - Safari shows Add All directly */
    a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if (a.href.indexOf("blob:") === 0) setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
  }
  var ICS_DONE = IOS ? "Tap Add All" : "Downloaded \u2013 open it and tap Add All";
  var calBtn = document.getElementById("cal");
  calBtn.addEventListener("click", function () {
    var items = MEALS.slice(0, 3).filter(function (m) { return state.picks[m.k]; })
      .map(function (m) { return { r: state.picks[m.k], meal: m.k }; });
    if (!items.length) return;
    openICS(buildICS(items), "menu-" + icsLocal(new Date(), 0, 0).slice(0, 8) + ".ics");
    calBtn.textContent = ICS_DONE;
    setTimeout(function () { calBtn.textContent = "Add to Calendar"; }, 4000);
  });

  function recipeOf(el) {
    var host = el.closest(".card, .slot");
    if (!host) return null;
    return host.classList.contains("slot") ? state.picks[host.dataset.meal] : RECIPES[+host.id.slice(1)];
  }
  function recipeShopText(r) {          /* this recipe's ingredients, minus staples and what you have */
    var out = [], lis = r.el ? r.el.querySelectorAll("[data-body] ul li") : [];
    [].forEach.call(lis, function (li, idx) {
      if (li.classList.contains("grp")) return;
      var tags = (r.lt && r.lt[idx]) || [];
      if (tags.some(function (i) { return (state.staples && ITEMS[i].s) || state.have[i]; })) return;
      out.push(li.textContent.trim());
    });
    return out.join("\n");
  }
  function flash(btn, msg, back) {
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = back; }, 4000);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cal],[data-rcopy],[data-rshare],[data-rremind]");
    if (!t) return;
    var r = recipeOf(t);
    if (!r) return;
    if (t.hasAttribute("data-cal")) {
      openICS(buildICS([{ r: r, meal: r.m }]), r.t.replace(/[^\w]+/g, "-").toLowerCase() + ".ics");
      flash(t, ICS_DONE, "Add to Calendar");
    } else if (t.hasAttribute("data-rcopy")) {
      copyText(recipeShopText(r), function (msg) {
        flash(t, msg === "Copied" ? "Copied \u2013 paste into Reminders" : msg, "Copy ingredients");
      });
    } else if (t.hasAttribute("data-rshare")) {
      navigator.share({ title: r.t, text: recipeShopText(r) }).catch(function () {});
    } else if (t.hasAttribute("data-rremind")) {
      if (shortcutReady()) { sendTextToReminders(recipeShopText(r)); return; }
      var setup = document.querySelector("[data-setup]");
      if (setup) { setup.classList.remove("hidden"); setup.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
      else copyText(recipeShopText(r), function (msg) { flash(t, "Copied instead \u2013 paste into Reminders", "Send to Reminders"); });
    }
  });

  /* ---------- shopping list for the three picked meals ---------- */
  var AISLES = ["Vegetables", "Fruit", "Protein", "Dairy", "Grains", "Pantry", "Nuts & seeds",
                "Staples", "Other"];
  var shopEl = document.getElementById("shop");
  var shopAll = false;          /* false = leave out what is already in the kitchen */
  var ticked = {};              /* things you ticked off in the list itself */
  function tickKey(t) { return t.toLowerCase(); }

  function shoppingItems() {
    var byText = {}, order = [];
    MEALS.slice(0, 3).forEach(function (m) {
      var r = state.picks[m.k];
      if (!r) return;
      var lis = r.el.querySelectorAll("[data-body] ul li");
      [].forEach.call(lis, function (li, idx) {
        if (li.classList.contains("grp")) return;         /* "For the sauce" and friends */
        var text = li.textContent.trim();
        if (!text) return;
        var tags = (r.lt && r.lt[idx]) || [];
        if (!shopAll) {
          var skip = tags.some(function (i) {
            return (state.staples && ITEMS[i].s) || state.have[i];
          });
          if (skip) return;
        }
        var cat = tags.length ? ITEMS[tags[0]].c : "Other";
        var key = text.toLowerCase();
        if (byText[key]) {
          if (byText[key].who.indexOf(m.short[0]) === -1) byText[key].who += m.short[0];
          return;
        }
        byText[key] = { text: text, cat: cat, who: m.short[0] };
        order.push(key);
      });
    });
    return order.map(function (k) { return byText[k]; });
  }

  /* whatever is ticked off in the list is already handled - never export it */
  function shopText() {
    return shoppingItems()
      .filter(function (it) { return !ticked[tickKey(it.text)]; })
      .map(function (it) { return it.text; }).join("\n");
  }

  function renderShop() {
    var items = shoppingItems();
    var picked = MEALS.slice(0, 3).filter(function (m) { return state.picks[m.k]; }).length;
    if (!picked) { shopEl.innerHTML = ""; return; }
    var hidden = shopAll ? 0 : (function () { shopAll = true; var a = shoppingItems().length;
      shopAll = false; return a - items.length; })();
    var off = items.filter(function (it) { return ticked[tickKey(it.text)]; }).length;
    var html = "<h3>Shopping list</h3><p class=\"shopmeta\">" + (items.length - off) +
      " thing" + (items.length - off === 1 ? "" : "s") + " left to buy" +
      (off > 0 ? " \u00b7 " + off + " ticked off" : "") +
      (hidden > 0 ? " \u00b7 " + hidden + " already in your kitchen, left out" : "") + "</p>";
    var cat = null;
    html += '<ul class="shoplist">';
    AISLES.forEach(function (c) {
      items.filter(function (it) { return it.cat === c; }).forEach(function (it) {
        if (cat !== c) { html += '<li class="shopcat">' + c + "</li>"; cat = c; }
        html += "<li><label><input type=\"checkbox\"" +
          (ticked[tickKey(it.text)] ? " checked" : "") + '><span class="txt">' + esc(it.text) +
          '</span><span class="who">' + it.who + "</span></label></li>";
      });
    });
    html += "</ul>";
    html += '<div class="shopacts">' +
      '<button class="btn btn-main" type="button" data-copy>Copy list</button>' +
      (navigator.share ? '<button class="btn" type="button" data-share>Share\u2026</button>' : "") +
      (shortcutReady()
        ? '<button class="btn" type="button" data-remind>Send to Reminders</button>' : "") +
      '<button class="btn" type="button" data-shopall>' +
        (shopAll ? "Hide what I have" : "Show everything") + "</button>" +
      (off ? '<button class="btn" type="button" data-untick>Clear ' + off + " ticked</button>" : "") +
      "</div>" +
      '<p class="shophint" data-hint2>Only unticked things are copied. In Reminders, tap a list and ' +
      "paste \u2013 every line becomes its own reminder.</p>" +
      (shortcutReady() ? "" :
        '<button class="setuplink" type="button" data-setupopen>Send straight to Reminders instead?' +
        "</button>") + setupHTML();
    shopEl.innerHTML = html;
  }

  /* iOS gives a web page no way to write to Reminders, so this goes through the
     Shortcuts app - which needs a shortcut of this exact name to exist first. */
  var SHORTCUT = "Add to Shopping List", SKEY = "shortcut-ready-v1";
  function shortcutReady() {
    try { return localStorage.getItem(SKEY) === "1"; } catch (e) { return false; }
  }
  function setupHTML() {
    return '<div class="setup hidden" data-setup><h4>Sending straight to Reminders</h4>' +
      "<p>Apple gives web pages no way to add reminders, so this has to go through the Shortcuts " +
      "app \u2013 and a shortcut with this exact name has to exist on your phone first. If you " +
      "have not built it, iOS just says <em>Could not find the shortcut</em>. Copy and paste " +
      "needs none of this. To build it once:</p><ol>" +
      "<li>Open <strong>Shortcuts</strong> \u2192 <strong>+</strong> to make a new one.</li>" +
      "<li>Add <code>Split Text</code>. Set Input to <em>Shortcut Input</em> and " +
      "Separator to <em>New Lines</em>.</li>" +
      "<li>Add <code>Repeat with Each</code>, with the <em>Split Text</em> result as input.</li>" +
      "<li>Inside the repeat, add <code>Add New Reminder</code>. Set the title to " +
      "<em>Repeat Item</em> and choose your shopping list.</li>" +
      "<li>Name it exactly <code>" + SHORTCUT + "</code> and save.</li></ol>" +
      '<div class="shopacts">' +
      '<button class="btn btn-main" type="button" data-setupdone>I built it \u2013 send now</button>' +
      '<button class="btn" type="button" data-setupcancel>Not now</button></div></div>';
  }
  function sendTextToReminders(text) {
    window.location.href = "shortcuts://x-callback-url/run-shortcut?name=" +
      encodeURIComponent(SHORTCUT) + "&input=text&text=" + encodeURIComponent(text);
  }
  function sendToReminders() { sendTextToReminders(shopText()); }

  shopEl.addEventListener("change", function (e) {
    var cb = e.target;
    if (!cb || cb.type !== "checkbox") return;
    var lab = cb.closest("label");
    if (!lab) return;
    var k = tickKey(lab.querySelector(".txt").textContent);
    if (cb.checked) ticked[k] = 1; else delete ticked[k];
    saveMenu();
    renderShop();
  });

  shopEl.addEventListener("click", function (e) {
    var t = e.target, setup = shopEl.querySelector("[data-setup]");
    if (t.closest("[data-untick]")) { ticked = {}; saveMenu(); renderShop(); return; }
    if (t.closest("[data-shopall]")) { shopAll = !shopAll; saveMenu(); renderShop(); return; }
    if (t.closest("[data-copy]")) { copyList(t.closest("[data-copy]")); return; }
    if (t.closest("[data-setupcancel]")) { setup.classList.add("hidden"); return; }
    if (t.closest("[data-setupdone]")) {
      try { localStorage.setItem(SKEY, "1"); } catch (err) {}
      renderShop();                 /* the button only exists once the shortcut does */
      sendToReminders();
      return;
    }
    if (t.closest("[data-share]")) {
      navigator.share({ title: "Shopping list", text: shopText() }).catch(function () {});
      return;
    }
    if (t.closest("[data-setupopen]")) {
      setup.classList.remove("hidden");
      setup.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (t.closest("[data-remind]")) { sendToReminders(); }
  });

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done("Copied"); },
                                               function () { legacyCopy(text, done); });
    } else { legacyCopy(text, done); }
  }
  function copyList(btn) {
    copyText(shopText(), function (msg) {
      btn.textContent = msg;
      var h = shopEl.querySelector("[data-hint2]");
      if (h && msg === "Copied") h.textContent = "Copied. Open Reminders, tap a list and paste.";
      setTimeout(function () { btn.textContent = "Copy list"; }, 1800);
    });
  }
  function legacyCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.top = "-1000px";
    document.body.appendChild(ta); ta.select();
    try { done(document.execCommand("copy") ? "Copied" : "Copy failed"); }
    catch (e) { done("Copy failed"); }
    document.body.removeChild(ta);
  }

  document.getElementById("shuffle").addEventListener("click", function () {
    menuDay = today();
    ticked = {};                       /* a new day's menu starts with a clean list */
    MEALS.slice(0, 3).forEach(function (m) { roll(m.k); });
    paintMenuDay();
    renderShop();
  });

  /* when a section comes up empty, say what would bring it back and offer the click */
  function emptyMessage(list) {
    if (state.only && haveCount()) {
      var best = Infinity;
      list.forEach(function (r) {
        if (!blocked(r) && (!state.q || r.hay.indexOf(state.q) > -1)) {
          best = Math.min(best, missingOf(r).length);
        }
      });
      if (best !== Infinity && best > state.allow) {
        var step = [0, 1, 2, 3, 5, 8].filter(function (n) { return n >= best; })[0];
        if (step !== undefined) {
          return "Nothing here matches your kitchen exactly. The closest recipe is <strong>" + best +
            " ingredient" + (best === 1 ? "" : "s") + "</strong> short &ndash; " +
            '<button class="link" type="button" data-relax="' + step + '">allow ' + step + ' missing</button>.';
        }
      }
      return "Nothing here matches. Try ticking a few more ingredients, or turn off " +
        "<em>Only what I can cook</em>.";
    }
    if (state.q) return "No recipe here mentions &ldquo;" + esc(state.q) + "&rdquo;.";
    return "Everything here is filtered out. Clear a few &ldquo;skip&rdquo; marks to bring recipes back.";
  }

  secWrap.addEventListener("click", function (e) {
    var ck = e.target.closest("[data-cook]");
    if (ck) {
      e.preventDefault();            /* the button sits inside <summary> - do not open the card */
      e.stopPropagation();
      var r = RECIPES[+ck.closest(".card").id.slice(1)];
      if (isCooked(r)) delete cooked[keyOf(r)]; else cooked[keyOf(r)] = 1;
      saveCooked(); apply();
      return;
    }
    var b = e.target.closest("[data-relax]");
    if (!b) return;
    state.allow = +b.dataset.relax;
    document.getElementById("allow").value = String(state.allow);
    save(); apply();
  });

  /* ---------- apply filters ---------- */
  var cookBar = document.getElementById("cookbar");
  function paintCookBar() {
    var n = cookedCount();
    if (!n) { cookBar.classList.add("hidden"); return; }
    cookBar.classList.remove("hidden");
    cookBar.innerHTML = "<span>" + n + " recipe" + (n === 1 ? "" : "s") + " cooked" +
      (showCooked ? " \u00b7 showing them" : " \u00b7 hidden") + "</span>" +
      '<button type="button" data-showcooked>' + (showCooked ? "Hide them again" : "Show them") +
      "</button><button type=\"button\" data-forget>Forget all</button>";
  }
  cookBar.addEventListener("click", function (e) {
    if (e.target.closest("[data-showcooked]")) { showCooked = !showCooked; apply(); }
    else if (e.target.closest("[data-forget]")) { cooked = {}; showCooked = false; saveCooked(); apply(); }
  });

  var noticeEl = document.getElementById("notice");
  function setNotice(total) {
    if (total > 0) { noticeEl.classList.add("hidden"); return; }
    noticeEl.classList.remove("hidden");
    noticeEl.innerHTML = "<span>Your filters are hiding all " + RECIPES.length +
      " recipes.</span><button class=\"btn\" type=\"button\" data-showall>Show everything</button>";
  }
  noticeEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-showall]")) document.getElementById("reset").click();
  });

  function apply() {
    var grand = 0;
    MEALS.forEach(function (m) {
      var g = cardsByMeal[m.k], shown = 0;
      g.list.forEach(function (r) {
        var v = visible(r);
        r.el.classList.toggle("hidden", !v);
        if (v) {
          shown++;
          var miss = haveCount() ? missingOf(r).length : -1;
          r.el.classList.toggle("ready", miss === 0 && !isCooked(r));
          r.el.classList.toggle("cooked", isCooked(r));
          r.el.querySelector("[data-cook]").textContent = isCooked(r) ? "Cooked \u2713" : "Mark cooked";
          r.el.querySelector("[data-badge]").innerHTML = badgeHTML(r);
          if (r.el.open) fillBody(r, r.el.querySelector("[data-body]"));
        }
      });
      if (g.sec.querySelector("[data-sort]").value === "match") sortGrid(m.k, "match");
      g.sec.querySelector("[data-count]").textContent =
        shown === g.list.length ? shown + " recipes" : shown + " of " + g.list.length + " shown";
      var emptyEl = g.sec.querySelector("[data-empty]");
      emptyEl.classList.toggle("hidden", shown > 0);
      if (!shown) emptyEl.innerHTML = emptyMessage(g.list);
      navEl.querySelector('[data-nav="' + m.k + '"] [data-navn]').textContent = shown;
      grand += shown;
    });
    setNotice(grand);
    paintCookBar();
    var oh = document.getElementById("onlyhint");
    if (oh) {
      var pointless = state.only && !haveCount();
      oh.classList.toggle("hidden", !pointless);
      if (pointless) panel.open = true;
    }
    MEALS.slice(0, 3).forEach(function (m) {
      var r = state.picks[m.k];
      if (!r || !visible(r)) roll(m.k); else paintSlot(m.k);
    });
    renderShop();                      /* after the picks have settled */
  }

  /* ---------- controls ---------- */
  var qEl = document.getElementById("q");
  qEl.addEventListener("input", function () { state.q = fold(this.value.trim()); apply(); });

  function toggle(id, key) {
    var b = document.getElementById(id);
    b.setAttribute("aria-checked", String(state[key]));
    b.addEventListener("click", function () {
      state[key] = !state[key];
      b.setAttribute("aria-checked", String(state[key]));
      save(); apply();
    });
  }
  toggle("only", "only");
  toggle("staples", "staples");
  /* a <button role="switch"> is not a labelable control, so wire the labels by hand */
  document.querySelectorAll(".ctl label[for]").forEach(function (lab) {
    var t = document.getElementById(lab.getAttribute("for"));
    if (t && t.classList.contains("sw")) {
      lab.addEventListener("click", function (e) { e.preventDefault(); t.click(); });
    }
  });

  var allowEl = document.getElementById("allow");
  allowEl.value = String(state.allow);
  allowEl.addEventListener("change", function () { state.allow = +this.value; save(); apply(); });

  document.getElementById("reset").addEventListener("click", function () {
    state.have = {}; state.skip = {}; state.q = ""; state.only = false; state.allow = 0; state.staples = true;
    qEl.value = "";
    allowEl.value = "0";
    document.getElementById("only").setAttribute("aria-checked", "false");
    document.getElementById("staples").setAttribute("aria-checked", "true");
    document.querySelectorAll("[data-sort]").forEach(function (s) { s.value = "az"; sortGrid(s.id.slice(5), "az"); });
    save(); paintChips(); apply();
  });

  /* ---------- boot ---------- */
  document.getElementById("s-total").textContent = RECIPES.length;
  document.getElementById("s-b").textContent = cardsByMeal.breakfast.list.length;
  document.getElementById("s-l").textContent = cardsByMeal.lunch.list.length;
  document.getElementById("s-d").textContent = cardsByMeal.dinner.list.length;
  document.getElementById("s-s").textContent = cardsByMeal.snack.list.length;
  document.getElementById("s-i").textContent = ITEMS.filter(function (i) { return i.q > 0; }).length;

  paintChips();
  if (haveCount()) {
    document.querySelectorAll("[data-sort]").forEach(function (sel) { sel.value = "match"; });
  }
  restoreMenu();
  MEALS.slice(0, 3).forEach(function (m) { if (state.picks[m.k]) paintSlot(m.k); else roll(m.k); });
  paintMenuDay();
  apply();

  /* calendar events link to #r<id>: open that recipe on arrival */
  function openHash() {
    var id = (location.hash || "").slice(1), el = id && document.getElementById(id);
    if (!el || !el.classList.contains("card")) return;
    el.classList.remove("hidden");
    el.open = true;
    el.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", openHash);
  openHash();

  var toTop = document.getElementById("totop");
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 900);
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* iPhone Safari, not yet on the home screen: say how, once */
  (function () {
    var ua = navigator.userAgent, tip = document.getElementById("tip"), TK = "homescreen-tip-v1";
    var ios = /iP(hone|ad|od)/.test(ua), safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    var standalone = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    var seen = false;
    try { seen = localStorage.getItem(TK) === "1"; } catch (e) {}
    if (!tip || !ios || !safari || standalone || seen || location.protocol !== "https:") return;
    tip.innerHTML = "<span>Keep this on your Home Screen: tap <strong>Share</strong>, then " +
      "<strong>Add to Home Screen</strong>. It opens like an app and works offline.</span>" +
      '<button class="link" type="button" data-tipok>Got it</button>';
    tip.classList.remove("hidden");
    tip.addEventListener("click", function (e) {
      if (!e.target.closest("[data-tipok]")) return;
      tip.classList.add("hidden");
      try { localStorage.setItem(TK, "1"); } catch (err) {}
    });
  })();

  /* restored filters that match nothing are almost always stale - open usable, say so */
  if (!noticeEl.classList.contains("hidden") && state.only) {
    state.only = false;
    document.getElementById("only").setAttribute("aria-checked", "false");
    save();
    apply();
    noticeEl.classList.remove("hidden");
    noticeEl.innerHTML = "<span>Your saved kitchen matched no recipes, so " +
      "<em>Only what I can cook</em> is switched off.</span>" +
      "<button class=\"btn\" type=\"button\" data-showall>Clear the filters too</button>";
  }
})();
