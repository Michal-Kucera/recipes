/* Plate illustrations. Reads the ingredient vocabulary from data.js; exposes window.dishSVG. */
(function () {
  "use strict";
  var ITEMS = window.RECIPES_DATA.items;

/* ---------------------------------------------------------------
   Dish illustrations.
   Every recipe is drawn from its own ingredient tags: the bed comes
   from its grain, leaf or bread, the toppings from what it actually
   contains. Seeded off the title, so a dish always looks the same.
   --------------------------------------------------------------- */
var PLATE = "#F7F4EE", RIM = "#E0D8C8";

function hashOf(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngOf(seed) {
  return function () {
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function n1(v) { return Math.round(v * 10) / 10; }
function ci(x, y, r, f) { return '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r) + '" fill="' + f + '"/>'; }
function el(x, y, rx, ry, f, rot) {
  return '<ellipse cx="' + n1(x) + '" cy="' + n1(y) + '" rx="' + n1(rx) + '" ry="' + n1(ry) + '" fill="' + f + '"' +
    (rot ? ' transform="rotate(' + Math.round(rot) + ' ' + n1(x) + ' ' + n1(y) + ')"' : '') + '/>';
}
function rc(x, y, w, h, r, f, rot) {
  return '<rect x="' + n1(x - w / 2) + '" y="' + n1(y - h / 2) + '" width="' + n1(w) + '" height="' + n1(h) +
    '" rx="' + n1(r) + '" fill="' + f + '"' +
    (rot ? ' transform="rotate(' + Math.round(rot) + ' ' + n1(x) + ' ' + n1(y) + ')"' : '') + '/>';
}

/* --- beds: the thing the rest of the plate sits on --- */
function bedGrain(rnd, tone, speck) {
  var g = ci(50, 53, 27, tone), i, a, d;
  for (i = 0; i < 44; i++) {
    a = rnd() * 6.283; d = Math.sqrt(rnd()) * 25;
    g += el(50 + Math.cos(a) * d, 53 + Math.sin(a) * d, 1.5, 0.9, speck, rnd() * 180);
  }
  return g;
}
function bedGreens(rnd) {
  var g = "", i, a, d;
  for (i = 0; i < 20; i++) {
    a = rnd() * 6.283; d = Math.sqrt(rnd()) * 25;
    g += el(50 + Math.cos(a) * d, 53 + Math.sin(a) * d, 5 + rnd() * 3.5, 2.4 + rnd() * 1.5,
      i % 3 ? "#4E8B45" : "#72AD5E", rnd() * 180);
  }
  return g;
}
function bedPasta(rnd) {
  var g = "", i, r, off;
  for (i = 0; i < 7; i++) {
    r = 6 + i * 3; off = (rnd() - 0.5) * 4;
    g += '<path d="M ' + n1(50 - r) + ' ' + n1(53 + off) + ' a ' + n1(r) + ' ' + n1(r * 0.6) +
      ' 0 1 1 ' + n1(2 * r) + ' 0" fill="none" stroke="#E9C468" stroke-width="3.4" stroke-linecap="round"/>';
  }
  return g;
}
function bedCream(rnd) {
  var g = ci(50, 53, 27, "#F5EFE0"), i, a, d;
  for (i = 0; i < 3; i++) {
    a = rnd() * 6.283; d = 6 + rnd() * 12;
    g += ci(50 + Math.cos(a) * d, 53 + Math.sin(a) * d, 5 + rnd() * 4, "#EDE4D0");
  }
  return g;
}
function bedToast(rnd) {
  var g = "", i;
  for (i = 0; i < 2; i++) {
    var x = 50 + (i ? 9 : -9), y = 53 + (i ? 5 : -5);
    g += rc(x, y, 30, 24, 5, "#B98A4C", i ? 8 : -6) + rc(x, y, 25, 19, 3, "#E0BC85", i ? 8 : -6);
  }
  return g;
}
function bedWedges(rnd, tone) {
  var g = "", i;
  for (i = 0; i < 6; i++) {
    var a = (i / 6) * 6.283 + rnd() * 0.4, d = 10 + rnd() * 9;
    g += rc(50 + Math.cos(a) * d, 53 + Math.sin(a) * d, 13, 7, 3, tone, a * 57 + 90);
  }
  return g;
}
function bedSoup(rnd) {
  var g = ci(50, 53, 27, "#C9622F"), i, a, d;
  for (i = 0; i < 9; i++) {
    a = rnd() * 6.283; d = Math.sqrt(rnd()) * 22;
    g += ci(50 + Math.cos(a) * d, 53 + Math.sin(a) * d, 2 + rnd() * 2, "#E08149");
  }
  return g;
}


function bedGlass(rnd, tone, garnish) {
  var straw = rnd() * 22 - 11, g = "";
  g += '<path d="M32 22 L68 22 L63 84 Q62 90 56 90 L44 90 Q38 90 37 84 Z" fill="#FFFFFF" opacity=".55"/>' +
    '<path d="M34 34 L66 34 L62 83 Q61.5 88 56 88 L44 88 Q38.5 88 38 83 Z" fill="' + tone + '"/>';
  for (var i = 0; i < 5; i++) {                       /* pulp, so no two blends match */
    g += ci(40 + rnd() * 20, 40 + rnd() * 40, 1 + rnd() * 1.8, "#FFFFFF");
  }
  g += '<path d="M34 34 L66 34 L65.6 39 L34.4 39 Z" fill="#FFFFFF" opacity=".28"/>';
  g += rc(54, 34, 3.4, 44, 1.7, "#D96A6A", straw);
  if (garnish) {
    g += '<path d="M62 24 a 7 7 0 0 1 0 14 Z" fill="' + garnish + '"/>';
  }
  g += '<path d="M32 22 L68 22 L63 84 Q62 90 56 90 L44 90 Q38 90 37 84 Z" fill="none" stroke="#C3CAC4" stroke-width="1.5"/>' +
    '<path d="M32 22 L68 22 L67.6 27 L32.4 27 Z" fill="#FFFFFF" opacity=".7"/>';
  return g;
}
function bedPancakes(rnd) {
  var g = "", i, y;
  for (i = 0; i < 3; i++) {
    y = 66 - i * 9;
    g += el(50, y, 25 - i, 8, i === 2 ? "#D9A155" : "#C98F45") + el(50, y - 1.6, 23 - i, 6.4, "#E8BE7C");
  }
  return g;
}
function bedOmelette(rnd) {
  return el(50, 54, 27, 19, "#E8B93F", -6) + el(50, 52, 23, 15, "#F3D274", -6) +
    '<path d="M28 58 Q50 44 72 58" fill="none" stroke="#DCA92F" stroke-width="2" opacity=".8"/>';
}
function bedWrap(rnd) {
  return rc(50, 53, 54, 22, 11, "#E3C48E", -14) + rc(50, 53, 54, 15, 8, "#EFD9B0", -14) +
    '<path d="M28 60 Q34 50 30 44" fill="none" stroke="#D3AE74" stroke-width="2"/>';
}

/* a few dishes are recognised by name - a smoothie is a glass, not a plate */
var TITLE_BEDS = [
  [/smoothie|shake|juice/i, bedGlass, 1],
  [/pancake|crepe|crepes|syrnyk|fritter|blini/i, bedPancakes, 0],
  [/omelet|omelette|scrambl/i, bedOmelette, 0],
  [/soup|stew|gazpacho/i, bedSoup, 0],
  [/wrap|quesadilla|burrito/i, bedWrap, 0]
];

/* base picked in this order - the first tag a recipe has wins */
var BEDS = [
  ["Bread", bedToast], ["Lavash / tortilla / wrap", bedWrap], ["Crispbread / rice cakes", bedToast],
  ["Croissant / bagel", bedToast],
  ["Pasta", bedPasta], ["Noodles", bedPasta],
  ["Rice", function (r) { return bedGrain(r, "#EFE7D2", "#D2C5A4"); }],
  ["Quinoa", function (r) { return bedGrain(r, "#E3D5B0", "#C2AE7F"); }],
  ["Couscous", function (r) { return bedGrain(r, "#E9DBB4", "#CBB786"); }],
  ["Bulgur", function (r) { return bedGrain(r, "#DCC79C", "#BCA372"); }],
  ["Buckwheat", function (r) { return bedGrain(r, "#C9AE85", "#A98B62"); }],
  ["Millet", function (r) { return bedGrain(r, "#E6D49E", "#C6B074"); }],
  ["Lentils", function (r) { return bedGrain(r, "#C97A4E", "#A85F3A"); }],
  ["Potatoes", function (r) { return bedWedges(r, "#E3C177"); }],
  ["Sweet potato", function (r) { return bedWedges(r, "#DC8E42"); }],
  ["Canned tomatoes / passata", bedSoup],
  ["Lettuce & salad mix", bedGreens], ["Spinach", bedGreens], ["Arugula", bedGreens],
  ["Cabbage", bedGreens],
  ["Sauerkraut", function (r) { return bedGrain(r, "#E4D9B4", "#C7B98C"); }],
  /* creamy beds come last: yoghurt is usually a dressing, not the dish */
  ["Oats", bedCream], ["Greek yogurt", bedCream], ["Cottage cheese", bedCream]
];

/* --- toppings --- */
var TOPS = {
  "Eggs": function (x, y, s) { return el(x, y, s * 1.2, s, "#FCF7E8") + ci(x, y, s * 0.44, "#E9A825"); },
  "Avocado": function (x, y, s) {
    return el(x, y, s, s * 1.15, "#6E9A4C") + el(x, y, s * 0.66, s * 0.8, "#B4CC85") + ci(x, y, s * 0.3, "#7A5A32");
  },
  "Salmon": function (x, y, s, r) {
    var a = r() * 60 - 30;
    return rc(x, y, s * 2.6, s * 1.5, s * 0.5, "#E17E60", a) + rc(x, y - s * 0.3, s * 2.1, s * 0.3, 1, "#F5BCA8", a) +
      rc(x, y + s * 0.35, s * 2.1, s * 0.3, 1, "#F5BCA8", a);
  },
  "White fish": function (x, y, s, r) { return rc(x, y, s * 2.5, s * 1.5, s * 0.5, "#EDE4D2", r() * 50 - 25); },
  "Herring": function (x, y, s, r) { return rc(x, y, s * 2.4, s * 1.2, s * 0.4, "#9FA8B0", r() * 50 - 25); },
  "Shrimp": function (x, y, s, r) {
    var a = r() * 360;
    return '<path d="M ' + n1(x - s) + ' ' + n1(y) + ' a ' + n1(s) + ' ' + n1(s) + ' 0 1 1 ' + n1(s * 1.2) + ' ' + n1(s * 1.1) +
      '" fill="none" stroke="#E98E72" stroke-width="' + n1(s * 0.75) + '" stroke-linecap="round" transform="rotate(' +
      Math.round(a) + ' ' + n1(x) + ' ' + n1(y) + ')"/>';
  },
  "Chicken": function (x, y, s, r) { return rc(x, y, s * 1.9, s * 1.3, s * 0.5, "#D9B276", r() * 90); },
  "Turkey": function (x, y, s, r) { return rc(x, y, s * 1.9, s * 1.3, s * 0.5, "#DCBB88", r() * 90); },
  "Beef": function (x, y, s, r) { return rc(x, y, s * 1.9, s * 1.3, s * 0.4, "#8C4A38", r() * 90); },
  "Minced meat": function (x, y, s, r) { return ci(x, y, s * 0.9, "#9B5740") + ci(x + s * 0.5, y + s * 0.4, s * 0.6, "#8A4B35"); },
  "Jamon / prosciutto": function (x, y, s, r) { return rc(x, y, s * 2.2, s * 1.1, s * 0.5, "#D4756F", r() * 70 - 35); },
  "Bacon": function (x, y, s, r) { return rc(x, y, s * 2.2, s * 0.9, s * 0.3, "#C2664F", r() * 70 - 35); },
  "Ham": function (x, y, s, r) { return rc(x, y, s * 2, s * 1.1, s * 0.5, "#DE8A82", r() * 70 - 35); },
  "Tofu": function (x, y, s, r) { return rc(x, y, s * 1.5, s * 1.5, s * 0.25, "#F0EBD6", r() * 40); },
  "Chickpeas": function (x, y, s) { return ci(x, y, s * 0.6, "#D9BE86") + ci(x + s * 0.9, y + s * 0.4, s * 0.55, "#CFB077") + ci(x - s * 0.3, y + s * 0.9, s * 0.5, "#E0C795"); },
  "Beans": function (x, y, s, r) { return el(x, y, s * 0.8, s * 0.5, "#A9613F", r() * 180) + el(x + s * 0.7, y + s * 0.7, s * 0.8, s * 0.5, "#8E4F33", r() * 180); },
  "Feta": function (x, y, s, r) { return rc(x, y, s * 1.2, s * 1.2, 1, "#F6F2E6", r() * 40) + rc(x + s, y + s * 0.6, s, s, 1, "#EDE7D6", r() * 40); },
  "Mozzarella": function (x, y, s) { return ci(x, y, s * 0.85, "#F7F4EA") + ci(x + s, y + s * 0.5, s * 0.7, "#F1EDE0"); },
  "Parmesan / hard cheese": function (x, y, s, r) { return rc(x, y, s * 1.4, s * 0.5, 1, "#EED99A", r() * 180) + rc(x + s * 0.4, y + s * 0.7, s * 1.2, s * 0.5, 1, "#E6CE8A", r() * 180); },
  "Cheese (any)": function (x, y, s, r) { return rc(x, y, s * 1.5, s * 1.1, 1, "#F0DFA4", r() * 30); },
  "Cottage cheese": function (x, y, s) { return ci(x, y, s * 0.5, "#F8F5EC") + ci(x + s * 0.7, y + s * 0.3, s * 0.45, "#F2EEE2") + ci(x - s * 0.2, y + s * 0.7, s * 0.4, "#F8F5EC"); },
  "Halloumi": function (x, y, s, r) { return rc(x, y, s * 1.6, s * 1.1, 1, "#EFE3C4", r() * 30); },
  "Tomatoes": function (x, y, s) { return ci(x, y, s * 0.95, "#C8422F") + el(x, y - s * 0.85, s * 0.35, s * 0.2, "#4E8B45"); },
  "Cucumber": function (x, y, s) { return ci(x, y, s * 0.85, "#7FAE55") + ci(x, y, s * 0.6, "#D3E4B4"); },
  "Bell pepper": function (x, y, s, r) { return rc(x, y, s * 1.6, s * 0.7, s * 0.35, r() > 0.5 ? "#D85E2A" : "#E3B12B", r() * 180); },
  "Broccoli": function (x, y, s) { return ci(x - s * 0.4, y - s * 0.3, s * 0.65, "#3F7A38") + ci(x + s * 0.45, y - s * 0.2, s * 0.6, "#4C8C42") + ci(x, y + s * 0.4, s * 0.6, "#3F7A38"); },
  "Cauliflower": function (x, y, s) { return ci(x - s * 0.4, y - s * 0.3, s * 0.65, "#EFE9D8") + ci(x + s * 0.45, y - s * 0.2, s * 0.6, "#E6DFCB") + ci(x, y + s * 0.4, s * 0.6, "#EFE9D8"); },
  "Carrot": function (x, y, s, r) { return rc(x, y, s * 1.5, s * 0.7, s * 0.3, "#DE7F33", r() * 180); },
  "Asparagus": function (x, y, s, r) { return rc(x, y, s * 2.2, s * 0.5, s * 0.25, "#5E9146", r() * 60 - 30); },
  "Green beans": function (x, y, s, r) { return rc(x, y, s * 2, s * 0.45, s * 0.22, "#548C3E", r() * 120 - 60); },
  "Peas": function (x, y, s) { return ci(x, y, s * 0.4, "#6FA04A") + ci(x + s * 0.7, y + s * 0.3, s * 0.38, "#639540") + ci(x - s * 0.3, y + s * 0.6, s * 0.36, "#6FA04A"); },
  "Sweet corn": function (x, y, s) { return ci(x, y, s * 0.35, "#E9C54A") + ci(x + s * 0.6, y + s * 0.2, s * 0.33, "#DDB93C") + ci(x - s * 0.2, y + s * 0.6, s * 0.33, "#E9C54A"); },
  "Mushrooms": function (x, y, s) { return el(x, y, s * 0.95, s * 0.6, "#C4AE93") + rc(x, y + s * 0.6, s * 0.5, s * 0.7, 1, "#D9CBB4"); },
  "Olives": function (x, y, s) { return el(x, y, s * 0.6, s * 0.75, "#4B5340") + ci(x, y, s * 0.2, "#B8A05A"); },
  "Berries": function (x, y, s) { return ci(x, y, s * 0.5, "#7B3F86") + ci(x + s * 0.8, y + s * 0.2, s * 0.45, "#A63E5A") + ci(x - s * 0.2, y + s * 0.7, s * 0.42, "#5C3A7A"); },
  "Banana": function (x, y, s) { return ci(x, y, s * 0.6, "#EBD06A") + ci(x + s * 0.9, y + s * 0.35, s * 0.55, "#E2C459"); },
  "Apple": function (x, y, s) { return ci(x, y, s * 0.85, "#C6493E") + el(x, y - s * 0.8, s * 0.3, s * 0.18, "#4E8B45"); },
  "Pear": function (x, y, s) { return el(x, y + s * 0.2, s * 0.75, s * 0.9, "#C8C058") + ci(x, y - s * 0.5, s * 0.45, "#C8C058"); },
  "Kiwi": function (x, y, s) { return ci(x, y, s * 0.8, "#7F9C3C") + ci(x, y, s * 0.5, "#B9D06A") + ci(x, y, s * 0.16, "#F2EFDF"); },
  "Orange": function (x, y, s) { return ci(x, y, s * 0.85, "#E08A22") + ci(x, y, s * 0.55, "#F0AE4C"); },
  "Mango": function (x, y, s, r) { return el(x, y, s * 1.05, s * 0.75, "#E9A62F", r() * 60 - 30); },
  "Peach / nectarine": function (x, y, s) { return ci(x, y, s * 0.85, "#E4915F") + ci(x - s * 0.25, y - s * 0.2, s * 0.35, "#EFB183"); },
  "Lemon": function (x, y, s, r) { return el(x, y, s * 0.8, s * 0.6, "#E8CE4A", r() * 60) + el(x, y, s * 0.5, s * 0.35, "#F3E48E", r() * 60); },
  "Nuts": function (x, y, s, r) { return el(x, y, s * 0.6, s * 0.45, "#9B6B43", r() * 180) + el(x + s * 0.8, y + s * 0.4, s * 0.55, s * 0.4, "#8A5C38", r() * 180); },
  "Chia seeds": function (x, y, s, r) { var g = "", i; for (i = 0; i < 7; i++) g += ci(x + (r() - .5) * s * 2.4, y + (r() - .5) * s * 2.4, s * 0.16, "#3A3630"); return g; },
  "Sesame seeds": function (x, y, s, r) { var g = "", i; for (i = 0; i < 7; i++) g += el(x + (r() - .5) * s * 2.4, y + (r() - .5) * s * 2.4, s * 0.22, s * 0.13, "#EFE6CE", r() * 180); return g; },
  "Mixed seeds": function (x, y, s, r) { var g = "", i; for (i = 0; i < 6; i++) g += el(x + (r() - .5) * s * 2.2, y + (r() - .5) * s * 2.2, s * 0.24, s * 0.14, "#B79A5E", r() * 180); return g; },
  "Fresh herbs": function (x, y, s, r) { var g = "", i; for (i = 0; i < 4; i++) g += el(x + (r() - .5) * s * 2, y + (r() - .5) * s * 2, s * 0.5, s * 0.22, "#3F7A38", r() * 180); return g; },
  "Onion": function (x, y, s, r) { return el(x, y, s * 0.85, s * 0.3, "#C9B7CE", r() * 180) + el(x + s * 0.5, y + s * 0.6, s * 0.75, s * 0.28, "#D8C9DC", r() * 180); },
  "Spring onion": function (x, y, s, r) { return rc(x, y, s * 1.6, s * 0.35, s * 0.17, "#5E9146", r() * 180); },
  "Beetroot": function (x, y, s) { return ci(x, y, s * 0.8, "#8A2F52") + ci(x, y, s * 0.45, "#A94068"); },
  "Zucchini": function (x, y, s) { return ci(x, y, s * 0.8, "#4E7A3C") + ci(x, y, s * 0.55, "#CFE0A8"); },
  "Eggplant": function (x, y, s, r) { return el(x, y, s * 0.95, s * 0.7, "#5B3A6E", r() * 60 - 30); },
  "Hummus": function (x, y, s) { return ci(x, y, s * 1.05, "#E2CFA0") + ci(x, y, s * 0.45, "#D4BD84"); },
  "Granola": function (x, y, s, r) { var g = "", i; for (i = 0; i < 5; i++) g += rc(x + (r() - .5) * s * 2.2, y + (r() - .5) * s * 2.2, s * 0.5, s * 0.4, 1, "#B98246", r() * 90); return g; },
  "Honey / syrup": function (x, y, s) { return ci(x, y, s * 0.7, "#E0A93C"); },
  "Peanut / nut butter": function (x, y, s) { return ci(x, y, s * 0.85, "#C08A4A"); },
  "Pesto": function (x, y, s) { return ci(x, y, s * 0.9, "#4F7A2E"); },
  "Sauerkraut": function (x, y, s, r) { var g = "", i; for (i = 0; i < 5; i++) g += el(x + (r() - .5) * s * 2, y + (r() - .5) * s * 2, s * 0.6, s * 0.18, "#DCCF9E", r() * 180); return g; }
};

/* drawn in this order so the plate reads as protein-first, garnish-last */
var TOP_ORDER = [
  "Eggs", "Salmon", "White fish", "Shrimp", "Herring", "Chicken", "Turkey", "Beef", "Minced meat",
  "Jamon / prosciutto", "Bacon", "Ham", "Tofu", "Chickpeas", "Beans", "Avocado",
  "Feta", "Mozzarella", "Halloumi", "Parmesan / hard cheese", "Cottage cheese", "Cheese (any)",
  "Tomatoes", "Cucumber", "Bell pepper", "Broccoli", "Cauliflower", "Asparagus", "Green beans",
  "Carrot", "Zucchini", "Eggplant", "Beetroot", "Mushrooms", "Sweet corn", "Peas", "Onion",
  "Spring onion", "Olives", "Hummus", "Pesto", "Berries", "Banana", "Apple", "Pear", "Kiwi",
  "Orange", "Mango", "Peach / nectarine", "Granola", "Peanut / nut butter", "Honey / syrup",
  "Nuts", "Lemon", "Chia seeds", "Sesame seeds", "Mixed seeds", "Fresh herbs"
];

function dishSVG(r) {
  var has = {};
  r.g.concat(r.o || []).forEach(function (i) { has[ITEMS[i].n] = 1; });
  var rnd = rngOf(hashOf(r.t));

  var bed = null, noPlate = 0, i;
  for (i = 0; i < TITLE_BEDS.length; i++) {
    if (TITLE_BEDS[i][0].test(r.t)) { bed = TITLE_BEDS[i][1]; noPlate = TITLE_BEDS[i][2]; break; }
  }
  if (!bed) {
    for (i = 0; i < BEDS.length; i++) { if (has[BEDS[i][0]]) { bed = BEDS[i][1]; break; } }
  }

  var g = "";
  if (noPlate) {
    var tone = (has["Spinach"] || has["Lettuce & salad mix"] || has["Kiwi"] || has["Arugula"]) ? "#7FAE4A"
      : (has["Berries"] || has["Beetroot"]) ? "#9A4A78"
        : (has["Carrot"] || has["Mango"] || has["Orange"] || has["Peach / nectarine"]) ? "#E2A03C" : "#E6CF86";
    var garnish = has["Kiwi"] ? "#7F9C3C" : has["Orange"] ? "#E08A22" : has["Berries"] ? "#8E4470"
      : has["Banana"] ? "#EBD06A" : has["Apple"] ? "#C6493E" : null;
    g += bed(rnd, tone, garnish);
  } else {
    g += '<circle cx="50" cy="55" r="39" fill="#000" opacity=".05"/>' +
      ci(50, 53, 38, PLATE) +
      '<circle cx="50" cy="53" r="38" fill="none" stroke="' + RIM + '" stroke-width="1.6"/>' +
      '<circle cx="50" cy="53" r="30" fill="none" stroke="' + RIM + '" stroke-width="1" opacity=".8"/>';
    g += bed ? bed(rnd) : bedGreens(rnd);

    var chosen = TOP_ORDER.filter(function (n) { return has[n] && TOPS[n]; }).slice(0, 5);
    chosen.forEach(function (name, j) {
      var copies = chosen.length <= 2 ? 4 : (chosen.length === 3 ? 3 : 2);
      for (var k = 0; k < copies; k++) {
        var a = (j / Math.max(chosen.length, 1)) * 6.283 + k * (6.283 / Math.max(chosen.length, 1) / copies) + rnd() * 0.6;
        var d = 8 + rnd() * 15;
        var s = 4.4 + rnd() * 1.8;
        g += TOPS[name](50 + Math.cos(a) * d, 53 + Math.sin(a) * d, s, rnd);
      }
    });
  }

  return '<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">' + g + '</svg>';
}

  window.dishSVG = dishSVG;
})();
