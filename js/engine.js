/* BondMeter engine — pure logic for the love & friendship calculator.
 *
 * No DOM, no timers, no network here. main.js wires this to the page.
 *
 * The score is deterministic: the same two names in the same mode always
 * give the same percentage, whichever order they are typed in. It is a
 * hash of the names, not a measurement — the page says so plainly.
 * Nothing here claims to predict real compatibility.
 */

export const MAX_NAME_LENGTH = 40;
export const MAX_HISTORY = 8;

export const HISTORY_KEY = "bondmeter:history:v1";
export const MODE_KEY = "bondmeter:mode:v1";

export const SITE_URL = "https://bondmeter.vercel.app/";

export const MODES = {
  love: {
    id: "love",
    label: "Love",
    tagline: "See how your hearts line up.",
    nameA: "Your name",
    nameB: "Their name",
    placeholderA: "e.g. Aarav",
    placeholderB: "e.g. Meera",
    breakdown: ["Chemistry", "Banter", "Trust", "Adventure"],
    cta: "Check your love score",
  },
  friendship: {
    id: "friendship",
    label: "Friendship",
    tagline: "See how strong the friendship really is.",
    nameA: "Your name",
    nameB: "Your friend's name",
    placeholderA: "e.g. Aarav",
    placeholderB: "e.g. Kabir",
    breakdown: ["Vibe", "Banter", "Trust", "Adventure"],
    cta: "Check your friendship score",
  },
  crush: {
    id: "crush",
    label: "Crush",
    tagline: "See if the spark is real — or just in your head.",
    nameA: "Your name",
    nameB: "Your crush's name",
    placeholderA: "e.g. Aarav",
    placeholderB: "e.g. Sana",
    breakdown: ["Chemistry", "Banter", "Trust", "Adventure"],
    cta: "Check your crush score",
  },
};

export const MODE_IDS = Object.keys(MODES);

export function modeById(id) {
  return MODES[id] || MODES.love;
}

/* Fun preset pairs for the "Try a random pair" button. */
export const RANDOM_PAIRS = [
  { a: "Romeo", b: "Juliet" },
  { a: "Harry", b: "Hermione" },
  { a: "Ross", b: "Rachel" },
  { a: "Tom", b: "Jerry" },
  { a: "Shrek", b: "Fiona" },
  { a: "Batman", b: "Robin" },
  { a: "Peanut Butter", b: "Jelly" },
  { a: "Chai", b: "Biscuit" },
  { a: "Mario", b: "Luigi" },
  { a: "Sherlock", b: "Watson" },
];

/* --- Names ------------------------------------------------------------ */

export function normalizeName(name) {
  if (typeof name !== "string") return "";
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
}

/* Validate a pair before any calculation. Returns { ok, errors, a, b }.
 * Empty names and the same name twice are refused with a message —
 * never a crash, never a score for a missing person. */
export function validateNames(rawA, rawB) {
  const a = normalizeName(rawA);
  const b = normalizeName(rawB);
  const errors = [];
  if (!a) errors.push("Add the first name.");
  if (!b) errors.push("Add the second name.");
  if (a && b && a.toLowerCase() === b.toLowerCase()) {
    errors.push("That is the same name twice — add a second person.");
  }
  return { ok: errors.length === 0, errors, a, b };
}

/* --- Deterministic hash + score ---------------------------------------- */

/* FNV-1a, 32-bit. Order-insensitive: the two names are sorted before
 * hashing, so "A + B" and "B + A" hash identically. */
export function hashPair(a, b, modeId) {
  const first = a.toLowerCase();
  const second = b.toLowerCase();
  const [low, high] = first <= second ? [first, second] : [second, first];
  const input = `${low}\u0000${high}\u0000${modeId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function scoreFromHash(hash) {
  return hash % 101;
}

/* One sub-score per breakdown slot, mixed from the same hash so the
 * breakdown is stable for a pair but differs between slots. */
export function breakdownFromHash(hash, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const mixed = Math.imul(hash ^ 0x9e3779b9, 0x85ebca6b + i * 0x27d4eb2f) >>> 0;
    out.push(((mixed >>> (i * 5)) % 97) + 3); // 3–99, never a flat 0 or 100
  }
  return out;
}

/* --- Verdict tiers ------------------------------------------------------ */
/* Six tiers, copy per mode. Playful and kind by design — no tier is
 * mean about anyone. `min` is inclusive; tiers are ordered high to low. */

export const TIERS = [
  {
    min: 90,
    title: { love: "Legendary bond", friendship: "Legendary friendship", crush: "Legendary spark" },
    message: {
      love: "This is the kind of bond people write songs about. Whatever you two have, it is rare — look after it.",
      friendship: "This is a ride-or-die friendship. The kind where one text at 2am is enough and no explanation is needed.",
      crush: "The spark here is impossible to miss. If you have been waiting for a sign, this is about as clear as it gets.",
    },
    oneliner: {
      love: "Some bonds are just built different.",
      friendship: "Partners in crime, officially.",
      crush: "The universe is not even being subtle.",
    },
  },
  {
    min: 75,
    title: { love: "Strong connection", friendship: "Solid friendship", crush: "Real spark" },
    message: {
      love: "You two click in a way most people spend years looking for. There is real warmth here — keep showing up for each other.",
      friendship: "A strong, easy friendship. You get each other without trying too hard, and that is worth a lot.",
      crush: "There is a genuine spark here. It is not fireworks yet, but it is definitely more than nothing.",
    },
    oneliner: {
      love: "Strong roots, bright future.",
      friendship: "The group chat would not survive without you two.",
      crush: "Worth a real conversation.",
    },
  },
  {
    min: 60,
    title: { love: "Good vibes", friendship: "Good mates", crush: "Promising spark" },
    message: {
      love: "Good energy between you two. It may not be a fairytale yet, but the foundation is solid and the vibe is right.",
      friendship: "Good mates with plenty in common. A few more shared adventures and this friendship levels up fast.",
      crush: "There is something here — a promising spark. A little courage could turn it into a lot more.",
    },
    oneliner: {
      love: "Good vibes, growing strong.",
      friendship: "Reliable, fun, and always up for it.",
      crush: "The spark is warming up.",
    },
  },
  {
    min: 40,
    title: { love: "Warming up", friendship: "Getting there", crush: "Slow burn" },
    message: {
      love: "Still warming up. The connection is there, it just needs time, honesty, and a few more long talks.",
      friendship: "A friendship still finding its rhythm. You are friendly, not yet inseparable — and that is a fine place to start.",
      crush: "A slow burn. The spark is faint right now, but slow burns have a habit of surprising everyone.",
    },
    oneliner: {
      love: "Give it time — good things simmer.",
      friendship: "Early days, honest potential.",
      crush: "Faint spark, not a dead one.",
    },
  },
  {
    min: 25,
    title: { love: "Work in progress", friendship: "Early days", crush: "Faint spark" },
    message: {
      love: "A work in progress. You are different in ways that take effort — but effort is exactly what makes bonds last.",
      friendship: "Early days, and still figuring each other out. Shared jokes and shared plans will do more than any score can.",
      crush: "The spark is faint, but faint is not nothing. Sometimes the best stories start exactly like this.",
    },
    oneliner: {
      love: "Different wavelengths, same station — eventually.",
      friendship: "New chapter, blank pages.",
      crush: "A maybe, not a no.",
    },
  },
  {
    min: 0,
    title: { love: "Opposites attract?", friendship: "Different wavelengths", crush: "Just friends energy" },
    message: {
      love: "Opposites, apparently. But opposites have been known to attract — and a low score here has never stopped anyone determined.",
      friendship: "Different wavelengths right now. That is not a failure — some of the best friendships start with nothing in common.",
      crush: "Honestly? This reads more like friends energy. Which is a great thing to be — just maybe not the crush you hoped for.",
    },
    oneliner: {
      love: "The meter says unlikely. Hearts say try anyway.",
      friendship: "Different playlists, same party.",
      crush: "Friend-zone energy, but make it wholesome.",
    },
  },
];

export function tierForScore(score, modeId) {
  const mode = modeById(modeId).id;
  for (const tier of TIERS) {
    if (score >= tier.min) {
      return { min: tier.min, title: tier.title[mode], message: tier.message[mode], oneliner: tier.oneliner[mode] };
    }
  }
  return null; // unreachable: the last tier covers 0
}

/* --- The calculation ---------------------------------------------------- */

export function calculate(rawA, rawB, modeId) {
  const validation = validateNames(rawA, rawB);
  if (!validation.ok) return { ok: false, errors: validation.errors };
  const mode = modeById(modeId);
  const hash = hashPair(validation.a, validation.b, mode.id);
  const score = scoreFromHash(hash);
  const breakdownValues = breakdownFromHash(hash, mode.breakdown.length);
  const breakdown = mode.breakdown.map((label, i) => ({ label, value: breakdownValues[i] }));
  const tier = tierForScore(score, mode.id);
  return {
    ok: true,
    a: validation.a,
    b: validation.b,
    mode: mode.id,
    modeLabel: mode.label,
    score,
    tier,
    breakdown,
    hash,
  };
}

/* --- Share text + result card ------------------------------------------- */

export function resultText(result) {
  if (!result || !result.ok) return "";
  return (
    `${result.a} + ${result.b} — ${result.score}% on BondMeter (${result.modeLabel} mode). ` +
    `${result.tier.title}: ${result.tier.oneliner} ` +
    `Check yours at ${SITE_URL}`
  );
}

export function cardData(result) {
  if (!result || !result.ok) return null;
  return {
    width: 1080,
    height: 1350,
    names: `${result.a}  +  ${result.b}`,
    score: result.score,
    modeLabel: result.modeLabel,
    tierTitle: result.tier.title,
    tierMessage: result.tier.message,
    oneliner: result.tier.oneliner,
    breakdown: result.breakdown,
    url: SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    disclaimer: "Just for fun — not real compatibility science.",
  };
}

/* Draw the shareable result card onto an injected 2d context (canvas is
 * injected so tests can use a recording stub). Returns false when there
 * is no usable context. */
export function drawResultCard(ctx, result) {
  const data = cardData(result);
  if (!data || !ctx || typeof ctx.fillRect !== "function") return false;
  const W = data.width;
  const H = data.height;
  const ACCENT = "#E5484D";

  ctx.fillStyle = "#0B0B0F";
  ctx.fillRect(0, 0, W, H);

  // Top accent bar and brand.
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = "#F5F5F7";
  ctx.font = "700 44px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BONDMETER", W / 2, 96);
  ctx.fillStyle = "#9A9AA5";
  ctx.font = "400 30px Inter, sans-serif";
  ctx.fillText(`${data.modeLabel} compatibility`, W / 2, 146);

  // Names.
  ctx.fillStyle = "#F5F5F7";
  ctx.font = "700 64px Inter, sans-serif";
  wrapText(ctx, data.names, W / 2, 250, 940, 78);
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(W / 2, 400, 26, 0, Math.PI * 2);
  ctx.fill();

  // Big score.
  ctx.fillStyle = "#F5F5F7";
  ctx.font = "800 260px Inter, sans-serif";
  ctx.fillText(`${data.score}%`, W / 2, 660);
  ctx.fillStyle = ACCENT;
  ctx.font = "700 52px Inter, sans-serif";
  ctx.fillText(data.tierTitle, W / 2, 760);

  // Verdict message.
  ctx.fillStyle = "#D8D8DE";
  ctx.font = "400 34px Inter, sans-serif";
  wrapText(ctx, data.tierMessage, W / 2, 840, 880, 48);

  // Breakdown bars.
  let y = 960;
  ctx.textAlign = "left";
  for (const item of data.breakdown) {
    ctx.fillStyle = "#9A9AA5";
    ctx.font = "600 28px Inter, sans-serif";
    ctx.fillText(item.label, 120, y);
    ctx.fillStyle = "#F5F5F7";
    ctx.textAlign = "right";
    ctx.fillText(`${item.value}%`, 960, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "#23232E";
    ctx.fillRect(120, y + 14, 840, 14);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(120, y + 14, Math.round(840 * (item.value / 100)), 14);
    y += 66;
  }

  // Footer — stacked with clear gaps so nothing overlaps the bars.
  ctx.fillStyle = "#D8D8DE";
  ctx.font = "400 28px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.oneliner, W / 2, 1246);
  ctx.fillStyle = "#F5F5F7";
  ctx.font = "700 34px Inter, sans-serif";
  ctx.fillText(`bondmeter.vercel.app`, W / 2, 1290);
  ctx.fillStyle = "#9A9AA5";
  ctx.font = "400 26px Inter, sans-serif";
  ctx.fillText(data.disclaimer, W / 2, 1322);
  return true;
}

/* Simple centred word-wrap for canvas text. */
export function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
  return lines.length;
}

/* --- History (localStorage, last 8 pairs) ------------------------------- */

function safeGet(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    if (storage) storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage, key) {
  try {
    if (storage) storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function validateHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = normalizeName(item.a);
    const b = normalizeName(item.b);
    const mode = modeById(item.mode).id;
    const score = Number(item.score);
    if (!a || !b || !Number.isFinite(score) || score < 0 || score > 100) continue;
    out.push({ a, b, mode, score, time: typeof item.time === "string" ? item.time : "" });
    if (out.length >= MAX_HISTORY) break;
  }
  return out;
}

export function loadHistory(storage) {
  const raw = safeGet(storage, HISTORY_KEY);
  if (!raw) return [];
  try {
    return validateHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function addHistory(history, result, at = new Date()) {
  if (!result || !result.ok) return history;
  const item = {
    a: result.a,
    b: result.b,
    mode: result.mode,
    score: result.score,
    time: at instanceof Date ? at.toISOString() : String(at),
  };
  const rest = history.filter(
    (h) =>
      h.mode !== item.mode
      || !((h.a === item.a && h.b === item.b) || (h.a === item.b && h.b === item.a)),
  );
  return [item, ...rest].slice(0, MAX_HISTORY);
}

export function saveHistory(storage, history) {
  return safeSet(storage, HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearHistoryStorage(storage) {
  safeRemove(storage, HISTORY_KEY);
}

export function loadMode(storage) {
  const raw = safeGet(storage, MODE_KEY);
  return MODES[raw] ? raw : "love";
}

export function saveMode(storage, modeId) {
  return safeSet(storage, MODE_KEY, modeById(modeId).id);
}

export function formatHistoryTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
