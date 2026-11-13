/* BondMeter main — DOM wiring for the love & friendship calculator.
 *
 * All scoring lives in engine.js. This file only reads inputs, runs the
 * animated reveal, draws the share card, and keeps history in the page.
 */

import {
  MODES,
  MODE_IDS,
  RANDOM_PAIRS,
  SITE_URL,
  modeById,
  validateNames,
  calculate,
  resultText,
  drawResultCard,
  loadHistory,
  addHistory,
  saveHistory,
  clearHistoryStorage,
  loadMode,
  saveMode,
  formatHistoryTime,
} from "./engine.js";

const REVEAL_MS = 1500;
const GAUGE_CIRCUMFERENCE = 603.2;

const $ = (id) => document.getElementById(id);

const els = {
  modeRow: $("mode-row"),
  modeTagline: $("mode-tagline"),
  labelA: $("label-a"),
  labelB: $("label-b"),
  nameA: $("name-a"),
  nameB: $("name-b"),
  swapBtn: $("swap-btn"),
  errorMessage: $("error-message"),
  calcBtn: $("calc-btn"),
  randomBtn: $("random-btn"),
  resultEmpty: $("result-empty"),
  resultBody: $("result-body"),
  resultNames: $("result-names"),
  resultMode: $("result-mode"),
  gaugeFill: $("gauge-fill"),
  gaugeNumber: $("gauge-number"),
  verdictTitle: $("verdict-title"),
  verdictMessage: $("verdict-message"),
  verdictOneliner: $("verdict-oneliner"),
  breakdown: $("breakdown"),
  downloadCardBtn: $("download-card-btn"),
  copyResultBtn: $("copy-result-btn"),
  cardStatus: $("card-status"),
  historySection: $("history-section"),
  historyList: $("history-list"),
  clearHistoryBtn: $("clear-history-btn"),
};

const store = typeof localStorage !== "undefined" ? localStorage : null;

let mode = loadMode(store);
let result = null;
let history = loadHistory(store);
let revealRaf = null;

function setStatus(text) {
  els.cardStatus.textContent = text;
}

function showError(messages) {
  els.errorMessage.textContent = messages.join(" ");
  els.errorMessage.hidden = false;
}

function clearError() {
  els.errorMessage.textContent = "";
  els.errorMessage.hidden = true;
}

/* --- Mode -------------------------------------------------------------- */

function applyMode(nextMode, { rerun = false } = {}) {
  mode = modeById(nextMode).id;
  const def = MODES[mode];
  els.modeTagline.textContent = def.tagline;
  els.labelA.textContent = def.nameA;
  els.labelB.textContent = def.nameB;
  els.nameA.placeholder = def.placeholderA;
  els.nameB.placeholder = def.placeholderB;
  els.calcBtn.textContent = def.cta;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  saveMode(store, mode);
  if (rerun && els.nameA.value.trim() && els.nameB.value.trim()) {
    runCalculation();
  }
}

/* --- Reveal animation ---------------------------------------------------- */

function setGauge(score) {
  const offset = GAUGE_CIRCUMFERENCE * (1 - score / 100);
  els.gaugeFill.style.strokeDashoffset = String(offset);
  els.gaugeNumber.textContent = `${Math.round(score)}%`;
}

function renderResultStatic(next) {
  els.resultNames.textContent = `${next.a}  +  ${next.b}`;
  els.resultMode.textContent = `${next.modeLabel} mode`;
  els.verdictTitle.textContent = next.tier.title;
  els.verdictMessage.textContent = next.tier.message;
  els.verdictOneliner.textContent = next.tier.oneliner;
  els.breakdown.innerHTML = "";
  for (const item of next.breakdown) {
    const row = document.createElement("div");
    row.className = "breakdown-row";
    const head = document.createElement("div");
    head.className = "breakdown-head";
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.label;
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = `${item.value}%`;
    head.append(label, value);
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.dataset.value = String(item.value);
    track.append(fill);
    row.append(head, track);
    els.breakdown.append(row);
  }
}

/* Jump the reveal straight to its final state (used by tests, and by
 * reduced-motion users who asked for no animation). */
export function finishReveal() {
  if (revealRaf !== null) {
    window.cancelAnimationFrame(revealRaf);
    revealRaf = null;
  }
  if (!result) return;
  setGauge(result.score);
  els.verdictTitle.classList.add("show");
  els.breakdown.querySelectorAll(".bar-fill").forEach((fill) => {
    fill.style.width = `${fill.dataset.value}%`;
  });
}

function animateReveal(next) {
  if (revealRaf !== null) window.cancelAnimationFrame(revealRaf);
  els.verdictTitle.classList.remove("show");
  const prefersReduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    finishReveal();
    return;
  }
  const start = window.performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / REVEAL_MS);
    const eased = 1 - (1 - t) ** 3;
    setGauge(next.score * eased);
    if (t >= 0.5) els.verdictTitle.classList.add("show");
    if (t < 1) {
      revealRaf = window.requestAnimationFrame(step);
    } else {
      revealRaf = null;
      finishReveal();
    }
  };
  revealRaf = window.requestAnimationFrame(step);
  // Bars grow after the number starts moving.
  window.requestAnimationFrame(() => {
    els.breakdown.querySelectorAll(".bar-fill").forEach((fill) => {
      fill.style.width = `${fill.dataset.value}%`;
    });
  });
}

/* --- Calculation --------------------------------------------------------- */

export function runCalculation() {
  const next = calculate(els.nameA.value, els.nameB.value, mode);
  if (!next.ok) {
    showError(next.errors);
    return null;
  }
  clearError();
  result = next;
  history = addHistory(history, result);
  saveHistory(store, history);
  renderHistory();
  els.resultEmpty.hidden = true;
  els.resultBody.hidden = false;
  renderResultStatic(result);
  setGauge(0);
  animateReveal(result);
  setStatus("");
  return result;
}

export function swapNames() {
  const a = els.nameA.value;
  els.nameA.value = els.nameB.value;
  els.nameB.value = a;
  if (result) runCalculation();
}

export function randomPair() {
  let pair = RANDOM_PAIRS[Math.floor(Math.random() * RANDOM_PAIRS.length)];
  // Avoid re-picking the pair already on screen when there is a choice.
  if (RANDOM_PAIRS.length > 1 && pair.a === els.nameA.value.trim() && pair.b === els.nameB.value.trim()) {
    pair = RANDOM_PAIRS[(RANDOM_PAIRS.indexOf(pair) + 1) % RANDOM_PAIRS.length];
  }
  els.nameA.value = pair.a;
  els.nameB.value = pair.b;
  return runCalculation();
}

/* --- History ------------------------------------------------------------- */

function renderHistory() {
  els.historyList.innerHTML = "";
  els.historySection.hidden = history.length === 0;
  for (const item of history) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    const main = document.createElement("span");
    main.className = "history-main";
    main.textContent = `${item.a} + ${item.b} — `;
    const score = document.createElement("span");
    score.className = "history-score";
    score.textContent = `${item.score}%`;
    main.append(score);
    const meta = document.createElement("span");
    meta.className = "history-meta";
    const when = formatHistoryTime(item.time);
    meta.textContent = `${modeById(item.mode).label}${when ? ` · ${when}` : ""}`;
    btn.append(main, meta);
    btn.addEventListener("click", () => {
      applyMode(item.mode);
      els.nameA.value = item.a;
      els.nameB.value = item.b;
      runCalculation();
    });
    li.append(btn);
    els.historyList.append(li);
  }
}

export function clearHistory() {
  history = [];
  clearHistoryStorage(store);
  renderHistory();
  setStatus("History cleared.");
}

/* --- Result card --------------------------------------------------------- */

function buildCardCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  return canvas;
}

export function renderCard() {
  if (!result) {
    setStatus("Calculate a bond first, then download the card.");
    return false;
  }
  const canvas = buildCardCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    setStatus("Card preview is not available in this browser — canvas is not supported here.");
    return false;
  }
  const ok = drawResultCard(ctx, result);
  if (!ok) {
    setStatus("Could not draw the result card in this browser.");
    return false;
  }
  setStatus("Card ready. Use Download to save it, or Copy to share the result as text.");
  return true;
}

export function downloadCard() {
  if (!result) {
    setStatus("Calculate a bond first, then download the card.");
    return Promise.resolve(false);
  }
  const canvas = buildCardCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx || !drawResultCard(ctx, result)) {
    setStatus("Card download is not supported in this browser — canvas is not available here.");
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Could not create the card image in this browser.");
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bondmeter-${result.a}-${result.b}.png`.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Result card downloaded.");
      resolve(true);
    }, "image/png");
  });
}

async function copyText(text, doneMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(doneMessage);
    return true;
  } catch {
    /* Clipboard API unavailable — fall back to a temporary textarea. */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) {
      setStatus(doneMessage);
      return true;
    }
  } catch {
    /* fall through to the message below */
  }
  setStatus("Copy is not available in this browser — long-press the result to select it.");
  return false;
}

export function copyResultText() {
  if (!result) {
    setStatus("Calculate a bond first, then copy the result.");
    return Promise.resolve(false);
  }
  return copyText(resultText(result), "Result copied to the clipboard.");
}

/* --- Wiring -------------------------------------------------------------- */

els.modeRow.addEventListener("click", (event) => {
  const btn = event.target.closest(".mode-btn");
  if (!btn || !MODE_IDS.includes(btn.dataset.mode)) return;
  applyMode(btn.dataset.mode, { rerun: true });
});

els.calcBtn.addEventListener("click", runCalculation);
els.randomBtn.addEventListener("click", randomPair);
els.swapBtn.addEventListener("click", swapNames);
els.clearHistoryBtn.addEventListener("click", clearHistory);
els.downloadCardBtn.addEventListener("click", downloadCard);
els.copyResultBtn.addEventListener("click", copyResultText);

for (const input of [els.nameA, els.nameB]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCalculation();
    }
  });
  input.addEventListener("input", clearError);
}

/* --- Init ---------------------------------------------------------------- */

applyMode(mode);
renderHistory();

export function getState() {
  return {
    mode,
    nameA: els.nameA.value,
    nameB: els.nameB.value,
    result,
    history,
    validation: validateNames(els.nameA.value, els.nameB.value),
  };
}
