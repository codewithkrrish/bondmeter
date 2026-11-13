# BondMeter — Love & Friendship Calculator

Two names, one bond score. Type your name and someone else's, pick Love,
Friendship or Crush, and BondMeter gives you a percentage, a verdict, and a
shareable result card. It is a bit of fun for ice-breakers, group chats and
friendly arguments — nothing more than that.

Live at https://bondmeter.vercel.app/

## What it does

- **Three modes** — Love, Friendship and Crush. Each mode changes the labels,
  the verdict copy and the breakdown wording, and the score itself changes
  with the mode.
- **A deterministic score** — the same pair in the same mode always gets the
  same percentage, whichever order you type the names in. The score comes
  from a stable hash of the two names, not from any measurement.
- **An animated reveal** — the gauge counts up to the score, the verdict
  fades in, and four breakdown bars (chemistry, banter, trust, adventure)
  grow to their values.
- **Verdict tiers** — six tiers from "Legendary bond" down to "Opposites
  attract?", each with its own message and one-liner, written to be playful
  and kind. No tier is mean about anyone.
- **A shareable result card** — a 1080×1350 PNG drawn on a canvas (names,
  score, verdict, breakdown, site URL) with a download button, plus a
  copy-result-text button.
- **Recent pairs** — your last 8 pairs are kept in local storage; tap one to
  run it again. There is also a swap-names button and a "Try a random pair"
  button with ten preset pairs.
- **Keyboard friendly** — press Enter in either name field to calculate.

## The honest part

This is not real compatibility science. There is no such thing as a
percentage that measures how two people get along, and BondMeter does not
pretend otherwise — the names are hashed, the number is derived from that
hash, and the verdicts are written jokes. A low score means nothing about
two real people, and a high score is not a promise. If you are deciding
something that matters, talk to the person, not to a meter.

## Privacy

Everything runs in your browser. The names you type, your recent pairs and
your last mode are stored in this browser's local storage and never leave
your device. There is no server, no analytics and no account. Clearing your
browser data clears everything.

## How it is built

100% browser-side, no dependencies, no build step. Vanilla JavaScript ES
modules:

- `js/engine.js` — the pure logic: name validation, the FNV-1a hash, the
  score and breakdown maths, verdict tiers, share text, the canvas card
  drawing, and local-storage helpers. No DOM in here, so it is easy to test.
- `js/main.js` — the DOM wiring: mode switching, the reveal animation,
  history rendering, card download and copy.
- `index.html`, `styles.css`, `favicon.svg` — the page itself.

Open `index.html` in a browser (or serve the folder with any static server)
and it just works.

## Limits I know about

- The score is a hash, so it has no meaning beyond entertainment — two
  names that "should" score high can land low, and that is by design.
- The result card is drawn on a canvas, so very old browsers without canvas
  support cannot download it; the button says so instead of failing
  silently.
- History and mode live in local storage, so they do not follow you to
  another browser or device.
- Names are capped at 40 characters and trimmed; extra whitespace inside a
  name is collapsed to single spaces.
