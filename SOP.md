# SOP — Build "Habiba's English Guide" (static PWA study site)

> **You are Claude Code.** This document is a complete, self-contained build spec. Read it top to bottom **once** before writing any code. Everything you need is here or in the provided files. Do not ask the user clarifying questions unless something contradicts; just build to this spec.

---

## 0. What you are given vs. what you build

**Provided (do not regenerate — wire them in as-is):**
- `data.json` — ALL content: themes, vocabulary, grammar lessons, functional phrases, writing models, and the full question bank. Authoritative. Never hardcode content that belongs in here.
- `manifest.json` — PWA manifest (ready).
- `sw.js` — service worker (ready). Just register it.
- This `SOP.md`.

**You build:**
- `index.html` — single page, app shell.
- `styles.css` — the component library + tokens (built from §4–§5).
- `app.js` — vanilla JS SPA: data loading, hash router, views, state/persistence (§6–§9).
- `icons/` — generate `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (§12).

**Hard tech constraints:**
- Vanilla **HTML + CSS + JS only**. No frameworks, no build step, no bundler, no npm. It must run by opening `index.html` from a static host.
- Target host = **GitHub Pages** (may live in a subfolder). **All asset paths must be relative** (`./app.js`, not `/app.js`).
- Use real browser **`localStorage`** for persistence (this is a real site, not a sandboxed artifact — localStorage is fine and expected).
- One runtime data fetch: `fetch('./data.json')`.
- **Mobile-first and iPad-first** (most students use iPhones/iPads). Must feel native on touch, respect safe-area insets, and be fully responsive up to desktop.
- Bilingual: English is the learning content; **Arabic is the friendly guide layer** (explanations, encouragement, instructions). Render every Arabic block RTL (§10).

---

## 1. What this site is

A revision companion for Omani **Grade 12** students sitting their final English exam in ~1 week. It is presented as **made by Habiba**, an English Literature & Translation student at SQU, for the students. Warm, personal, encouraging — never condescending.

Two organizing axes (this is the core mental model — keep them distinct in the UI):

- **LEARN — by THEME (4):** the syllabus content. `News & the Media`, `Work & Careers`, `Health & Safety`, `Citizenship`. Each theme bundles vocab + grammar + phrases + writing models.
- **PRACTICE — by SKILL (6 exam sections):** `reading_tf`, `reading_comp`, `vocabulary`, `grammar`, `cloze`, `writing`. The drill engine is organized the way the exam paper is.

Plus a **Mock Exam** that assembles one piece per section in exam order, and a **home dashboard** showing weakness/mastery so students know what to drill.

Three home entry points: **Learn · Practice · Mock Exam**.

---

## 2. Final file tree

```
habiba-guide/
├── index.html
├── styles.css
├── app.js
├── data.json          (provided)
├── manifest.json      (provided)
├── sw.js              (provided)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable-512.png
```

---

## 3. Fonts & emoji (decide once, use everywhere)

**Fonts (Google Fonts, one `<link>` in `<head>`):**
- English **display / headings:** `Fraunces` (soft characterful serif) — weights 400/600/700, optical sizing on.
- English **body / UI:** `Nunito` (warm rounded humanist sans) — 400/600/700/800.
- **Arabic:** `Tajawal` — 400/500/700.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Nunito:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
```

**Emoji — render as Apple-style images** for a consistent look on Android/desktop too. Helper:

```js
// returns an <img> src for an emoji char, Apple style
const emojiSrc = (ch) => `https://emojicdn.elk.sh/${encodeURIComponent(ch)}?style=apple`;
// usage: <img class="emoji" alt="" src="${emojiSrc('📰')}">
```
- `.emoji { width:1em; height:1em; vertical-align:-0.15em; }` and scale up via font-size where used as a card icon.
- **Fallback:** if an emoji image fails to load (`onerror`), swap to the raw unicode character in a `<span>`. The flag `🇴🇲` may not render Apple-style — let it fall back to unicode; that's fine.
- This CDN is cross-origin; `sw.js` already runtime-caches it for offline use after first load.

---

## 4. Design tokens (put these `:root` variables at the top of `styles.css`, verbatim)

Aesthetic direction: **warm scholarly paper** — cream background, ink text, a calm teal brand, four bright theme accents, gold for "from the real exam" highlights. Soft shadows, generous rounding, gentle motion. This is a refined/friendly look, not a flashy one: execute with restraint and good spacing.

```css
:root{
  /* surfaces */
  --paper:#FAF5EC; --paper-2:#F3EAD9; --surface:#FFFFFF; --surface-2:#FFFBF4;
  /* ink */
  --ink:#2A211B; --ink-2:#5C5147; --ink-3:#8A7E72; --line:#E7DDCB;
  /* brand + status */
  --brand:#126E63; --brand-700:#0E5A51; --brand-100:#DCEEE9;
  --gold:#E2A33C; --good:#3F9D6B; --bad:#D2553F;
  /* theme accents (also present per-theme in data.json -> theme.color) */
  --t1:#DD5E47; --t2:#D9952C; --t3:#4E9D6B; --t4:#3E7CA8;
  /* radii */
  --r-sm:10px; --r:16px; --r-lg:24px; --r-pill:999px;
  /* shadows */
  --shadow-1:0 1px 2px rgba(42,33,27,.06), 0 2px 8px rgba(42,33,27,.06);
  --shadow-2:0 10px 34px rgba(42,33,27,.14);
  /* spacing */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px; --s8:32px; --s10:40px; --s12:48px;
  /* type */
  --serif:'Fraunces',Georgia,serif; --sans:'Nunito',system-ui,sans-serif; --ar:'Tajawal',system-ui,sans-serif;
  --fs-display:clamp(28px,6vw,44px); --fs-h1:clamp(22px,4.5vw,32px);
  --fs-h2:clamp(18px,3.2vw,22px); --fs-body:16px; --fs-sm:14px;
  /* motion */
  --ease:cubic-bezier(.2,.7,.2,1); --d-fast:160ms; --d:240ms; --d-slow:420ms;
  /* layout */
  --maxw:720px; --tabbar-h:64px;
}
```

- **Background texture:** apply to `body` a very subtle warm paper feel — `background:var(--paper)` plus an optional faint layered radial-gradient or a low-opacity SVG noise data-URI (≤4% opacity). Keep it barely-there.
- **Never** use a generic purple-on-white gradient or system/Inter/Roboto fonts.
- Inputs/buttons: font-size ≥16px to stop iOS auto-zoom.

---

## 5. Component library (build these in `styles.css`; everything in the app is composed from them)

For each component: class name, purpose, key states. Keep them generic and reusable — the views in §9 only assemble these.

1. **`.app`** — max-width column (`--maxw`), centered, horizontal padding `var(--s4)`, bottom padding = `calc(var(--tabbar-h) + safe-area + var(--s6))` so the bottom tab bar never covers content.
2. **`.topbar`** — sticky top; holds a small "Habiba's English Guide" wordmark + a context title; transparent-to-solid on scroll is optional.
3. **`.tabbar`** — fixed bottom nav, 3 tabs (Learn / Practice / Mock) + optional Home. Height `--tabbar-h`, `padding-bottom:env(safe-area-inset-bottom)`. Each `.tab` = stacked emoji + Arabic/English label; `.tab--active` uses `--brand`. Tap target ≥48px.
4. **`.btn`** — base button, min-height 48px, radius `--r-pill` or `--r`. Variants: `.btn--primary` (brand fill, white text), `.btn--soft` (brand-100 fill), `.btn--ghost` (transparent + border `--line`). `:active` slight scale 0.97.
5. **`.card`** — `--surface`, radius `--r-lg`, `--shadow-1`, padding `--s5`. `.card--link` adds hover lift (`translateY(-2px)` + `--shadow-2`).
6. **`.theme-card`** — a `.card` that takes a per-theme color via inline `style="--theme:#DD5E47"`. Show a colored accent (top bar or left border 4px in `--theme`), the theme emoji (large), `name_en`, `name_ar` (RTL), and a tiny vocab-known progress line.
7. **`.chip`** / **`.chip--active`** — pill filter buttons (used for theme filters in Practice). Active = brand fill.
8. **`.pill-tabs`** + **`.pill-tab`** / `.pill-tab--active` — the in-theme tab switcher (Vocab / Grammar / Phrases / Writing). Horizontally scrollable on narrow screens.
9. **`.progress`** (`.progress__fill`) — thin rounded track; fill width = `%`, animates width on change.
10. **`.ring`** — circular mastery indicator. Implement with an SVG `<circle>` using `stroke-dasharray`/`stroke-dashoffset`, or a `conic-gradient` background. Center shows `%`.
11. **`.flashcard`** — 3D flip card for vocab. Structure: `.flashcard > .flashcard__inner > (.flashcard__face.front + .flashcard__face.back)`. `perspective:1000px` on the outer, `transform-style:preserve-3d` + `transition:transform var(--d) var(--ease)` on inner, `.is-flipped` rotates `rotateY(180deg)`; back face `transform:rotateY(180deg)` + `backface-visibility:hidden`. Front = big Apple emoji + English word. Back = Arabic meaning (RTL, Tajawal) + example sentence if present.
12. **`.quiz-option`** — full-width selectable answer button. States (toggle classes after answering): `.is-selected`, `.is-correct` (green tint + ✓), `.is-wrong` (red tint + ✗). After an answer is committed, disable all options (`pointer-events:none`).
13. **`.explain`** — the Arabic explanation panel revealed after answering. `dir="rtl"`, Tajawal, brand-100 background, right-aligned, rounded; subtle slide/fade-in.
14. **`.badge--gold`** — small gold pill meaning "from the real exam." Put on any item whose `src === "sample"`. Label it `من الامتحان` (Arabic) / `Exam` .
15. **`.field`** / **`.input`** — text input for short-answer reading questions. 16px font, rounded, `--line` border, brand focus ring.
16. **`.sheet`** — bottom sheet / modal for the mock-exam results or confirmations: dim overlay + slide-up panel with `border-radius` top corners, `padding-bottom:env(safe-area-inset-bottom)`.
17. **`.ar`** — utility: `direction:rtl; text-align:right; font-family:var(--ar); line-height:1.7;`. Apply to every Arabic string. Add `lang="ar"` on the element.
18. **`.en-serif`** — utility to render English headings/quotes in Fraunces.
19. **`.reveal`** — entrance animation utility (see §10): start opacity 0 + translateY(8px), animate in; stagger using inline `style="--i:0|1|2..."` and `animation-delay:calc(var(--i)*60ms)`.
20. **`.empty`** — friendly empty/zero-state block (used before any practice is done): an emoji + a warm Arabic line.

---

## 6. Data contract (`data.json`) — exact schema you must consume

Top level: `{ meta, skills, themes, questions, sets }`.

**`meta`**
```
title_en, subtitle_en, author_line_en, author_line_ar, aim_ar, aim_en
```

**`skills[]`** — the 6 exam sections (use to build the Practice grid; respect `order`)
```
id          one of: reading_tf | reading_comp | vocabulary | grammar | cloze | writing
label_en, label_ar, emoji, order (int), desc_ar
```

**`themes[]`** (4 — t1..t4)
```
id, name_en, name_ar, emoji, color (hex), blurb_ar
vocab[]      : { en, ar, emoji, ex? }            // ex = optional example sentence
grammar[]    : { id, title_en, title_ar, intro_ar, points[]:{en,ar}, examples[]:{en,ar} }
functional[] : { label_en, label_ar, note_ar, phrases[]:{en,ar} }
writing[]    : { type:"informative"|"interactive", title_en, prompt_ar, model_en, tips_ar[], checklist[] }
               // model_en is multi-paragraph; split on "\n\n" to render paragraphs
```

**`questions[]`** — standalone single-answer items (used by Practice for `vocabulary` and `grammar`, and by Mock)
```
id, skill ("vocabulary"|"grammar"), theme (t1..t4), type:"mcq",
prompt, options[] (strings), answer (int index into options), explanation_ar,
src ("sample"|"practice")
```

**`sets[]`** — passage-based blocks (used by Practice for `reading_tf`, `reading_comp`, `cloze`, `grammar`, and by Mock)
```
id, skill, theme (null for these), src, title_en, intro_ar, passage_en?, items[]
```
Item shapes (read `item.type`):
- **`tf`** (only in `reading_tf` sets): `{ type, passage_en, prompt, answer (boolean), explanation_ar }`
  → each TF item carries **its own** `passage_en`. There is **no** set-level passage for reading_tf.
- **`short`** (in `reading_comp`): `{ type, prompt, accept[] (array of lowercase acceptable answers), explanation_ar }`
  → grade by: normalize the student input (trim, lowercase, collapse spaces, strip trailing punctuation) and mark correct if it **equals or is contained in / contains** any `accept` entry. Be lenient.
- **`mcq`** (in `reading_comp`, `cloze`, `grammar`): `{ type, prompt, options[], answer (int), explanation_ar }`
  → for `reading_comp`/`cloze`/`grammar` sets, the **set-level `passage_en`** is the shared text; render it once at the top of the section, then the items beneath. (Grammar/cloze passages use `(1) ____`, `(2) ____` gap markers that line up with item order.)

**`writing` skill has no questions/sets** — it is driven entirely by `themes[].writing`. "Practising writing" = pick a theme + a model, read the model, read the Arabic tips, and self-check against `checklist`. Nothing is auto-graded.

**Always show the gold badge** (`.badge--gold`) on any question/set where `src === "sample"` — these are real past-exam items and students value knowing that.

---

## 7. State & persistence (localStorage)

Use a single namespace prefix `heg:`. Wrap all reads in try/catch; treat missing as empty. Provide `getState()/setState()` helpers.

```
heg:progress  -> { [skillId]: { attempts:int, correct:int } }
heg:items     -> { wrong: { [itemKey]:true }, seen: { [itemKey]:true } }
heg:vocab     -> { known: { [ "t1:broadcast" ]:true } }   // key = themeId + ":" + en
heg:mocks     -> [ { date:ISO, perSkill:{ [skillId]:{correct,total} }, score:int, total:int } ]
heg:settings  -> { } // reserved (e.g., future toggles). Respect OS reduced-motion automatically.
```
- `itemKey`: for standalone questions use `q:<id>`; for set items use `s:<setId>#<index>`.
- On every answered item: increment `progress[skill].attempts` (+`.correct` if right); set `seen[itemKey]`; set/clear `wrong[itemKey]`.
- **Mastery %** per skill = `attempts ? round(correct/attempts*100) : null` (null → show "ابدأ" start state, not 0%).
- **Vocab-known** per theme = `count(known keys for theme) / theme.vocab.length`.
- **Weakest skill** (for the "Practice this" nudge) = the skill with the lowest non-null mastery; if none attempted yet, nudge `vocabulary` first.

---

## 8. App architecture

- **SPA, hash router.** Routes:
  - `#/` → Home
  - `#/learn` → theme grid
  - `#/learn/:themeId` → theme detail (default tab = vocab); optional `#/learn/:themeId/:tab` where tab ∈ vocab|grammar|phrases|writing
  - `#/practice` → skill grid
  - `#/practice/:skillId` → drill session for that skill (with optional `?theme=t2|mixed`)
  - `#/mock` → mock intro; `#/mock/run` → running; `#/mock/results` → results
- **Boot:** `fetch('./data.json')` → cache in memory → render current route → `window.addEventListener('hashchange', render)`. Show a small loading state while fetching; show a friendly Arabic error card if the fetch fails.
- **Register the service worker** after load:
  ```js
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  ```
- Keep `app.js` organized: `state.js`-style helpers, `data` accessors, small `el()` DOM helper or template strings, one `render()` switch on route, and per-view render functions. No external libs.

---

## 9. Screens (behaviour spec)

### 9.1 App shell
- `.topbar` always visible with the wordmark; on inner pages also show a back affordance and the current context title.
- `.tabbar` fixed at bottom: **Learn**, **Practice**, **Mock** (+ optional **Home**). Highlights the active section based on route.

### 9.2 Home `#/`
- **Hero / author card:** big Fraunces title `meta.title_en`, `subtitle_en`, then the author line (`author_line_ar` RTL + `author_line_en`) and `aim_ar` (RTL) — this is the "made by Habiba, here's the goal" moment. Warm and personal.
- **Dashboard strip:** a row/grid of the 6 skills each with a `.ring` mastery %, plus a one-line "weakest → Practice this" nudge button that deep-links to that skill's drill. Before any practice, show `.empty` encouragement in Arabic instead of zeros.
- **Three entry cards** (`.card--link`): Learn (by theme), Practice (by skill), Mock Exam — each with emoji, English label, short Arabic subtitle.
- Staggered `.reveal` on load.

### 9.3 Learn — theme grid `#/learn`
- 2-up grid (1-up on the narrowest phones) of `.theme-card`, one per theme, colored by `theme.color`, showing emoji, `name_en`, `name_ar`, `blurb_ar`, and a vocab-known progress line.

### 9.4 Learn — theme detail `#/learn/:themeId`
- Header tinted with the theme color. `.pill-tabs`: **Vocab · Grammar · Phrases · Writing** (Arabic labels alongside).
- **Vocab tab:** deck of `.flashcard`s. Front = Apple emoji + English word; tap/click flips to Arabic meaning (+ example if `ex`). Provide a "known ✓ / still learning" toggle on each card that writes to `heg:vocab`. Optional: a shuffle button and a "known X / total" counter. Smooth flip animation.
- **Grammar tab:** for each `grammar[]` entry: `title_en` + `title_ar`, the `intro_ar` (RTL, friendly), a clean list of `points` (English rule + Arabic gloss), and an `examples` list (English sentence + Arabic). Use cards; keep English LTR and Arabic RTL within the same card.
- **Phrases tab:** for each `functional[]` group: `label_en`/`label_ar`, `note_ar`, then the `phrases` as paired rows (English phrase ⟷ Arabic). These are speaking/writing helpers — make them easy to scan.
- **Writing tab:** for each `writing[]` model: a header with `type` (informative/interactive) + `title_en`, the `prompt_ar` (the task, RTL), the **model answer** `model_en` (split on `\n\n` into paragraphs, rendered in a readable "paper" block, Fraunces optional for a letter feel), the `tips_ar` as a friendly checklist (RTL), and the `checklist[]` as tickable self-check items (no persistence needed, or persist if trivial).

### 9.5 Practice — skill grid `#/practice`
- Grid of the 6 `skills` (respect `order`), each `.card--link` with emoji, `label_en`, `label_ar`, `desc_ar`, and its current mastery `.ring`/`.progress`.

### 9.6 Practice — drill session `#/practice/:skillId`
- **Theme filter** via `.chip`s: All/Mixed + one per theme (only where it makes sense; reading/cloze/grammar sets are not theme-tagged, so for those just run all sets).
- **Build a queue** of items for the skill:
  - `vocabulary`, `grammar` (standalone) → from `questions` filtered by skill (+theme if chosen).
  - `reading_tf` → iterate `sets` of that skill; each `tf` item is one question (render its own `passage_en` above the statement).
  - `reading_comp`, `cloze`, `grammar` (sets) → present **per set**: render `passage_en` once, then walk its `items` as a mini-sequence.
  - `writing` → no drill; route to a theme/model picker (reuse §9.4 Writing tab content) with the self-check checklist.
  - **Wrong-answer weighting:** when assembling the queue, move items whose `itemKey` is in `heg:items.wrong` to the front (or duplicate them once near the end) so weak items resurface. Keep it simple and deterministic.
- **Per item flow:**
  1. Show prompt (+ passage where relevant). MCQ → `.quiz-option` list. TF → two big True/False buttons (label them in EN + Arabic: True صح / False خطأ). Short-answer → `.input` + a Check button.
  2. On answer: mark correct/wrong visually, **reveal `.explain`** (the Arabic `explanation_ar`), update state (§7), and show a Next button. Never advance without showing the explanation — the explanation is the whole point.
  3. A slim `.progress` at the top shows position in the queue.
- **End of queue:** a small summary card (score, % this session) with "أعد المحاولة / Practice again" and "back to skills". Light celebratory motion if score is high.

### 9.7 Mock Exam `#/mock`
- **Intro:** explains in friendly Arabic that this mimics the real paper — 6 sections in order — and that Writing is self-assessed. A Start button.
- **Assembly (`#/mock/run`):** build one section per skill **in `order`**:
  1. `reading_tf` → pick 1 tf set (or 3–4 tf items).
  2. `reading_comp` → pick 1 comp set: show its passage + its items.
  3. `vocabulary` → 3–5 `vocabulary` questions.
  4. `grammar` → 1 grammar dialogue set (passage + its gap items).
  5. `cloze` → 1 cloze set (passage + its gap items).
  6. `writing` → 1 writing prompt from a theme; student writes (free text, not graded) and ticks the `checklist`.
  Prefer `src==="sample"` items for the mock so it feels like the real exam; fall back to practice items as needed. Present sections sequentially with a progress indicator; auto-grade everything except writing.
- **Results (`#/mock/results`):** a `.sheet`/card with per-section score, total auto-graded score, a warm Arabic message calibrated to performance (encouraging regardless), and a "Practice your weakest section" deep-link. Append the result to `heg:mocks`.

---

## 10. Arabic & RTL rules

- Every Arabic string element: `class="ar" lang="ar"` (→ RTL, right-aligned, Tajawal, line-height 1.7).
- The overall page is **LTR** (it's an English-learning tool); only Arabic text blocks flip. Don't set `dir="rtl"` on the whole document.
- Within a card that mixes an English rule and its Arabic gloss, keep the English LTR and wrap the Arabic in `.ar`. Pairs (phrase ⟷ meaning) read naturally side by side on wide screens, stacked on narrow.
- **Tone for any new strings you must author** (button labels, empty states, mock messages): warm, lightly colloquial MSA that an Omani student finds friendly — e.g. «خلّينا نبدأ», «ممتاز! واصل», «لا تقلق، جرّب مرة ثانية», «راجع الشرح تحت». Never childish, never stiff. The author voice is Habiba (female), speaking kindly to students. Mirror the register already used in `data.json` explanations.

---

## 11. Interactions & animations

Keep motion purposeful and calm (this is a study tool). Respect `@media (prefers-reduced-motion: reduce)` — disable transforms/transitions there.
- **Page load:** staggered `.reveal` (fade + 8px rise) on the cards of the current view, ~60ms apart.
- **Cards:** hover lift on pointer devices; `:active` scale 0.98 on touch.
- **Flashcard:** 3D Y-axis flip on tap (§5.11).
- **Quiz feedback:** correct → quick green check + subtle scale pop; wrong → short horizontal shake (`transform: translateX`) + red tint. The `.explain` panel slides/fades in.
- **Progress bars / rings:** animate the fill/offset when values change.
- **Mock complete (high score):** a brief, tasteful celebration (e.g. a few CSS confetti dots or a scale-in checkmark). Don't overdo it.
- **Route changes:** a quick cross-fade is enough; no heavy page transitions.

---

## 12. PWA wiring & icons

- In `<head>`: `<link rel="manifest" href="./manifest.json">`, `<meta name="theme-color" content="#126E63">`, and iOS bits: `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, `<link rel="apple-touch-icon" href="./icons/icon-192.png">`. Set `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (the `viewport-fit=cover` is required for `env(safe-area-inset-*)` to work).
- Register `sw.js` as in §8.
- **Generate the icons** into `icons/`. Design: a simple warm mark on brand teal `#126E63` — e.g. a cream open-book or a bold serif "H" (Fraunces) — flat, no fine detail. Produce `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` (the maskable one needs ~20% safe padding around the mark). You may author one SVG and rasterize it to PNGs.

---

## 13. Responsive & device rules

- Mobile-first CSS; enhance upward. Single content column capped at `--maxw` (720px), centered, with comfortable gutters; on phones it's full-width with `--s4` padding.
- Breakpoints (suggested): ≥600px → theme grid 2-up, phrase pairs side-by-side; ≥900px → a touch more horizontal breathing room (still single reading column — don't sprawl).
- **Tap targets ≥ 48px**; spacing generous enough for thumbs.
- **Safe areas:** tab bar and sheets use `env(safe-area-inset-bottom)`; top bar may use `env(safe-area-inset-top)` under notches.
- iPad: looks great in portrait and landscape; flashcards and quiz options scale up nicely. Test that the bottom tab bar and content padding don't collide.
- No horizontal scrolling anywhere (except intentionally scrollable `.pill-tabs`/chips rows).

---

## 14. Accessibility

- Buttons are real `<button>`s; the router uses `<a href="#/...">` where appropriate.
- Color is never the only signal: correct/wrong also show ✓/✗ and text.
- Maintain WCAG AA contrast on the cream background (the tokens above are chosen for this).
- Emoji `<img>`s have empty `alt=""` (decorative); the meaningful label is the adjacent text.
- Arabic elements carry `lang="ar"`; the page root is `lang="en"`.
- Visible focus rings (brand-colored) on keyboard focus.

---

## 15. Build order (do it in this sequence)

1. **Scaffold** `index.html` (head, fonts, manifest/meta, `#app` root, script/style links) + empty `styles.css` + `app.js` that loads `data.json` and logs it.
2. **Tokens + base** in `styles.css` (§4): reset, body/paper, typography, `.app`, `.ar`, `.reveal`.
3. **Core components** (§5): buttons, cards, topbar, tabbar, chips, progress, ring. Get the shell + bottom nav navigating between empty Home/Learn/Practice/Mock views.
4. **Router + state helpers** (§7–§8).
5. **Home** (§9.2) with the dashboard wired to (still-empty) state.
6. **Learn** grid + theme detail tabs (§9.3–9.4): build the flashcard component here.
7. **Practice** grid + drill engine (§9.5–9.6): item renderers for mcq / tf / short, feedback + `.explain`, queue + wrong-weighting, session summary. This is the biggest piece.
8. **Mock** (§9.7): assembly, sequential run, results sheet, persist to `heg:mocks`.
9. **Animations & polish** (§11), empty states, error state.
10. **Icons + PWA** (§12); confirm install + offline.
11. **QA** against §16.

---

## 16. Acceptance checklist (must all pass)

- [ ] Opens from `index.html` on a static host in a subfolder (all paths relative). No console errors.
- [ ] `data.json` is the only content source; nothing from it is hardcoded in JS/HTML.
- [ ] All 4 themes show full vocab (flashcards flip), grammar, phrases, and writing models. Arabic everywhere is RTL and uses Tajawal.
- [ ] All 6 practice skills run: MCQ, True/False, and short-answer all grade correctly; the Arabic explanation appears after every answer.
- [ ] Short-answer grading is lenient per §6 (accepts the `accept[]` variants).
- [ ] `src:"sample"` items display the gold "من الامتحان" badge.
- [ ] Wrong answers resurface (wrong-weighting works); mastery %s update and persist across reloads.
- [ ] Mock exam presents 6 sections in exam order, auto-grades 5, self-checks Writing, shows results, and saves to history.
- [ ] Apple-style emoji render via the CDN, with unicode fallback on error.
- [ ] Looks and feels right on iPhone (safe areas OK), iPad (portrait+landscape), and desktop. Tap targets ≥48px. No horizontal scroll.
- [ ] Installable as a PWA; works offline after first load (shell + data + fonts/emoji cached).
- [ ] `prefers-reduced-motion` disables non-essential animation.
- [ ] Tone check: every student-facing Arabic string is warm and friendly, never condescending.

---

## 17. Out of scope (do not build unless asked)

- Accounts, servers, analytics, or any backend.
- Editing content in-app (content is edited by hand in `data.json`).
- Audio/TTS, multiplayer, notifications.

> Content is extensible: to add words/questions later, edit `data.json` only (same shapes as §6) and bump `CACHE_VERSION` in `sw.js`. Keep the UI generic so new data needs no code changes.
