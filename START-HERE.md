# Start here — handing this to Claude Code

This folder is a **build kit**, not a finished site. It contains everything Claude Code needs to build "Habiba's English Guide" with no further questions.

## What's in the folder
| File | What it is | Touch it? |
|---|---|---|
| `SOP.md` | The full build spec (the brain). Tells the agent exactly what to build and how. | Read it; the agent follows it. |
| `data.json` | **All the content** — 167 vocab cards, grammar lessons, phrases, 8 writing models, and a 67-item question bank across the 6 exam sections. Arabic written by hand. | Edit later to add/adjust content. |
| `manifest.json` | PWA manifest (ready). | No. |
| `sw.js` | Service worker for offline (ready). | Bump `CACHE_VERSION` when you change content. |

The agent will **create** the rest: `index.html`, `styles.css`, `app.js`, and `icons/`.

## How to run it
1. Put this whole `habiba-guide/` folder in an empty Git repo (this will become the GitHub Pages site).
2. Open the folder in **Claude Code** (`cd habiba-guide && claude`).
3. Give it this prompt:

   > Read `SOP.md` in full, then build the site exactly to that spec. The content files (`data.json`, `manifest.json`, `sw.js`) are already here — wire them in, don't regenerate them. Create `index.html`, `styles.css`, `app.js`, and the `icons/`. Then run through the acceptance checklist in §16 and fix anything that fails.

4. Preview locally (e.g. `python3 -m http.server`) on your phone/iPad to check the feel.
5. Push to GitHub and enable Pages. Because all paths are relative, it works in a subfolder.

## To add content later
Edit `data.json` only (same shapes described in `SOP.md` §6), then bump `CACHE_VERSION` in `sw.js`. No code changes needed — the UI is built to be content-driven.

## Quick content stats
- Themes: 4 (News & Media, Work & Careers, Health & Safety, Citizenship)
- Vocabulary cards: 167 (bilingual + emoji)
- Grammar mini-lessons: 12 · Functional-phrase groups: 5 · Writing models: 8
- Question bank: 20 standalone + 47 passage-based items (reading T/F, comprehension, vocabulary, grammar, cloze)
- Real past-exam items are tagged `"src":"sample"` and get a gold badge.
