# Revert Mock Exam — Before Google Meet Class

## What changed

- `app.js`: Mock exam functions (`viewMockIntro`, `mockHistory`, `assembleMock`, `viewMockRun`, `viewMockResults`) replaced with a stub page showing "في حصة المراجعة".
- `app.js`: `State.mocks` removed from State object.
- `app.js`: Router simplified — `#/mock/run` and `#/mock/results` no longer route anywhere.
- `mock-exam.js`: Full extracted mock code saved here (do not delete).

## To revert (re-enable mock exam before class)

### Step 1 — Restore State.mocks

In `app.js` around line 31, add back to the `State` object:

```js
mocks: () => read('mocks', []),
```

So it looks like:
```js
const State = {
  progress: () => read('progress', {}),
  items: () => read('items', { wrong: {}, seen: {} }),
  vocab: () => read('vocab', { known: {} }),
  mocks: () => read('mocks', []),
};
```

### Step 2 — Replace the stub viewMockIntro with real functions

Find this block in `app.js`:

```js
/* ---------- MOCK (§9.7) — available in review session ---------- */
function viewMockIntro() {
  renderChrome('mock', 'Mock Exam', '#/');
  $('#app').innerHTML = ...
}
```

Replace it with all functions from `mock-exam.js` (copy the entire file contents, paste in place of the stub block).

### Step 3 — Restore the router

Find in `app.js`:
```js
if (a === 'mock') return viewMockIntro();
```

Replace with:
```js
if (a === 'mock') {
  if (b === 'run') return viewMockRun();
  if (b === 'results') return viewMockResults();
  return viewMockIntro();
}
```

### Step 4 — Restore home page description (optional)

Find:
```js
entry('#/mock', '📝', 'Mock Exam', 'في حصة المراجعة.') +
```

Replace with:
```js
entry('#/mock', '📝', 'Mock Exam', 'امتحان تجريبي كامل بترتيب الورقة.') +
```

---

Or just: `git stash` / `git checkout` to the commit before these changes.
Git commit with full mock: **e159468** (Fix bottom navbar drifting on mobile scroll)
