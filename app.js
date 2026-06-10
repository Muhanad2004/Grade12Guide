/* Habiba's English Guide — vanilla SPA */
(() => {
  'use strict';

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const emojiSrc = (ch) => `https://emojicdn.elk.sh/${encodeURIComponent(ch)}?style=apple`;
  // decorative emoji <img> with unicode fallback
  const emoji = (ch, cls = '') => {
    const raw = esc(ch);
    return `<img class="emoji ${cls}" alt="" loading="lazy" decoding="async" src="${emojiSrc(ch)}" ` +
      `onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'emoji ${cls}',textContent:'${raw}'}))">`;
  };
  const ar = (s, extra = '') => `<span class="ar" lang="ar" dir="rtl"${extra}>${esc(s)}</span>`;
  // block-level Arabic paragraph (right-aligned reliably; spans don't honour text-align inside an LTR parent)
  const arP = (s, extra = '') => `<p class="ar" lang="ar" dir="rtl"${extra}>${esc(s)}</p>`;
  const goldBadge = `<span class="badge--gold"><span class="ar" lang="ar">من الامتحان</span></span>`;

  /* ---------- state / persistence (§7) ---------- */
  const NS = 'heg:';
  const read = (key, fallback) => {
    try { const v = localStorage.getItem(NS + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  };
  const write = (key, val) => { try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch (e) {} };

  const State = {
    progress: () => read('progress', {}),
    items: () => read('items', { wrong: {}, seen: {} }),
    vocab: () => read('vocab', { known: {} }),
  };

  // record an answered item
  function recordAnswer(skill, itemKey, correct) {
    const p = State.progress();
    p[skill] = p[skill] || { attempts: 0, correct: 0 };
    p[skill].attempts++;
    if (correct) p[skill].correct++;
    write('progress', p);
    const it = State.items();
    it.seen[itemKey] = true;
    if (correct) delete it.wrong[itemKey]; else it.wrong[itemKey] = true;
    write('items', it);
  }
  // all gradable itemKeys available for a skill (the coverage universe)
  function skillUniverse(skillId) {
    const keys = [];
    DATA.questions.forEach(q => { if (q.skill === skillId) keys.push('q:' + q.id); });
    DATA.sets.filter(s => s.skill === skillId).forEach(set => {
      set.items.forEach((_, idx) => keys.push('s:' + set.id + '#' + idx));
    });
    return keys;
  }
  // mastery = coverage: % of the skill's items the student has seen
  function mastery(skillId) {
    const universe = skillUniverse(skillId);
    if (!universe.length) return null;            // e.g. writing (self-graded)
    const seen = State.items().seen;
    const done = universe.reduce((n, k) => n + (seen[k] ? 1 : 0), 0);
    return Math.round(done / universe.length * 100);
  }
  function vocabKnownCount(theme) {
    const known = State.vocab().known;
    return theme.vocab.reduce((n, v) => n + (known[theme.id + ':' + v.en] ? 1 : 0), 0);
  }
  /* ---------- data ---------- */
  let DATA = null;
  const skillById = (id) => DATA.skills.find(s => s.id === id);
  const themeById = (id) => DATA.themes.find(t => t.id === id);

  // ring with emoji in the center, animated progress border, no number (calmer)
  const DRING_C = 2 * Math.PI * 26;   // r=26
  function dashRing(pct, emojiChar) {
    const off = DRING_C * (1 - (pct || 0) / 100);
    return `<div class="dring">` +
      `<svg viewBox="0 0 64 64"><circle class="dring__bg" cx="32" cy="32" r="26"></circle>` +
      `<circle class="dring__fg" cx="32" cy="32" r="26" stroke-dasharray="${DRING_C.toFixed(1)}" ` +
      `style="--off:${off.toFixed(1)}"></circle></svg>` +
      `<span class="dring__emoji">${emoji(emojiChar)}</span></div>`;
  }

  /* ---------- router ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, query] = h.split('?');
    const parts = path ? path.split('/') : [];
    const params = {};
    if (query) query.split('&').forEach(kv => { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); });
    return { parts, params };
  }
  const go = (hash) => { location.hash = hash; };

  /* ---------- chrome: topbar + tabbar ---------- */
  function renderChrome(active, ctx, back) {
    const tb = $('#topbar');
    tb.innerHTML =
      (back ? `<a class="topbar__back" href="${esc(back)}" aria-label="Back">‹</a>` : '') +
      `<div class="topbar__mark">Habiba's <b>English</b> Guide</div>` +
      (ctx ? `<div class="topbar__ctx">${esc(ctx)}</div>` : '');

    const tabs = [
      { id: 'learn', href: '#/learn', e: '📚', en: 'Learn', a: 'تعلّم' },
      { id: 'practice', href: '#/practice', e: '✍️', en: 'Practice', a: 'تدرّب' },
      { id: 'mock', href: '#/mock', e: '📝', en: 'Mock', a: 'محاكاة' },
      { id: 'home', href: '#/', e: '🏠', en: 'Home', a: 'الرئيسية' },
    ];
    $('#tabbar').innerHTML = tabs.map(t =>
      `<a class="tab ${active === t.id ? 'tab--active' : ''}" href="${t.href}">` +
      `${emoji(t.e)}<span>${t.en}</span><span class="tab__ar" lang="ar">${t.a}</span></a>`
    ).join('');
  }

  /* ---------- HOME (§9.2) ---------- */
  function viewHome() {
    renderChrome('home', '', null);
    const m = DATA.meta;
    let i = 0;
    const card = (html) => `<div class="card reveal" style="--i:${i++}">${html}</div>`;

    // dashboard
    const anyAttempt = DATA.skills.some(s => mastery(s.id) != null);
    let dash;
    if (!anyAttempt) {
      dash = `<div class="empty">${`<div class="empty__emoji">${emoji('🌱')}</div>`}` +
        arP('لم تبدأ بعد؟ لنبدأ بكلمة واحدة، وكل خطوة تقرّبك من الامتحان.') +
        `<div style="margin-top:var(--s4)"><a class="btn btn--primary" href="#/practice/vocabulary">لنبدأ</a></div></div>`;
    } else {
      const cells = DATA.skills.map(s => {
        const mm = mastery(s.id);
        return `<a class="dash-cell" href="#/practice/${s.id}">${dashRing(mm, s.emoji)}` +
          `<span class="dash-cell__lab">${esc(s.label_en)}</span>` +
          `<span class="dash-cell__ar" lang="ar" dir="rtl">${esc(s.label_ar)}</span></a>`;
      }).join('');
      dash = `<div class="dash-grid">${cells}</div>`;
    }

    const entry = (href, e, en, sub) =>
      `<a class="card card--link entry reveal" style="--i:${i++}" href="${href}">` +
      `<div class="entry__icon">${emoji(e)}</div>` +
      `<div class="grow"><div class="entry__t">${en}</div>${ar(sub)}</div>` +
      `<div style="color:var(--ink-3);font-size:24px">›</div></a>`;

    $('#app').innerHTML =
      card(
        `<div class="eyebrow">${esc(m.subtitle_en)}</div>` +
        `<h1 class="display" style="margin-top:6px">${esc(m.title_en)}</h1>` +
        `<p class="ar" lang="ar" style="margin-top:var(--s3);font-weight:700;color:var(--brand-700)">${esc(m.author_line_ar)}</p>` +
        `<p class="muted" style="margin-top:2px;font-size:14px">${esc(m.author_line_en)}</p>` +
        `<div style="height:1px;background:var(--line);margin:var(--s4) 0"></div>` +
        arP(m.aim_ar)
      ) +
      `<div class="card meet-card reveal" id="meetBox" style="--i:${i++}">${meetPlaceholder()}</div>` +
      card(`<div class="h2 en-serif" style="margin-bottom:var(--s4)">Your progress · تقدّمك</div>${dash}`) +
      `<h2 class="h2 section-title en-serif">Where to start?</h2>` +
      entry('#/learn', '📚', 'Learn', 'تعلّم حسب المحور — مفردات وقواعد وكتابة.') +
      entry('#/practice', '✍️', 'Practice', 'تدرّب حسب أقسام الامتحان الستة.') +
      entry('#/mock', '📝', 'Mock Exam', 'في حصة المراجعة.') +
      `<div class="card danger-card reveal" style="--i:${i++};margin-top:var(--s10)">` +
      `<div class="h2 en-serif">Reset</div>` +
      arP('يمسح تقدّمك المحفوظ ويحدّث الموقع لآخر نسخة. لا يمكن التراجع.', ' style="margin-top:6px;color:var(--ink-2);font-size:14px"') +
      `<button class="btn btn--danger btn--block" id="clearBtn" style="margin-top:var(--s4)"><span class="ar">مسح التقدّم وتحديث</span></button>` +
      `</div>`;

    const clearBtn = $('#clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearProgress);
    loadMeet();
  }

  // loading skeleton for the live session card
  function meetPlaceholder() {
    return `<div class="row" style="gap:var(--s3)"><span class="meet-card__emoji">${emoji('🎥')}</span>` +
      `<div class="grow"><div class="h2 en-serif">Live session</div>` +
      arP('جارٍ تحميل موعد الجلسة…', ' style="color:var(--ink-2);font-size:14px"') + `</div></div>`;
  }

  // fetch meet.json fresh on every load (no-store + SW network-first) so a new link never gets stuck in cache
  function loadMeet() {
    const box = $('#meetBox');
    if (!box) return;
    fetch('./meet.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(m => renderMeet(box, m))
      .catch(() => { box.style.display = 'none'; });   // offline + never cached: just hide
  }

  function renderMeet(box, m) {
    if (!m || !m.active) { box.style.display = 'none'; return; }
    const hasLink = m.link && /^https?:\/\//i.test(m.link);
    const action = hasLink
      ? `<a class="btn btn--primary btn--block" href="${esc(m.link)}" target="_blank" rel="noopener" style="margin-top:var(--s4)">` +
        `<span class="ar">انضم إلى الجلسة</span></a>`
      : `<div class="meet-card__pending">${arP(m.link_note_ar || 'رابط الجلسة سيظهر هنا قبل الموعد.')}</div>`;
    box.innerHTML =
      `<div class="row" style="gap:var(--s3);align-items:flex-start">` +
      `<span class="meet-card__emoji">${emoji('🎥')}</span>` +
      `<div class="grow">` +
      `<div class="meet-card__badge"><span class="meet-card__dot"></span>${ar('مباشر · LIVE')}</div>` +
      `<div class="h2 en-serif" style="margin-top:6px">${esc(m.title_ar || 'جلسة مباشرة')}</div>` +
      (m.date_ar ? `<div class="meet-card__date">${ar(m.date_ar)}</div>` : '') +
      (m.desc_ar ? arP(m.desc_ar, ' style="margin-top:var(--s3);color:var(--ink-2)"') : '') +
      `</div></div>` + action;
  }

  // wipe saved progress + caches + service worker, then reload fresh (§ clear-progress)
  async function clearProgress() {
    if (!confirm('مسح كل تقدّمك وتحديث الموقع لآخر نسخة؟\n\nClear all your progress and update the site? This cannot be undone.')) return;
    try {
      Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('heg:lastMock');
    } catch (e) {}
    try { if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } } catch (e) {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {}
    location.replace(location.pathname + '#/');
    location.reload();
  }

  /* ---------- LEARN grid (§9.3) ---------- */
  function viewLearnGrid() {
    renderChrome('learn', 'Learn', '#/');
    const cards = DATA.themes.map((t, idx) => {
      const known = vocabKnownCount(t), tot = t.vocab.length;
      const pct = Math.round(known / tot * 100);
      return `<a class="card card--link theme-card reveal" style="--i:${idx}" href="#/learn/${t.id}">` +
        `<div class="row" style="gap:var(--s4)">` +
        `<div class="theme-card__emoji">${emoji(t.emoji)}</div>` +
        `<div class="grow"><div class="theme-card__name">${esc(t.name_en)}</div>` +
        ar(t.name_ar, ' style="color:var(--ink-3);font-weight:600"') + `</div></div>` +
        `<div class="row between theme-card__foot">` +
        `<div class="progress grow"><div class="progress__fill" style="width:${pct}%"></div></div>` +
        `<span style="font-weight:700;font-size:13px;color:var(--ink-3)">${known}/${tot}</span></div></a>`;
    }).join('');
    $('#app').innerHTML =
      `<h1 class="h1 en-serif" style="margin-bottom:var(--s5)">Learn by theme</h1>` +
      `<div class="grid-2">${cards}</div>`;
  }

  /* ---------- LEARN theme detail (§9.4) ---------- */
  function viewTheme(themeId, tab) {
    const t = themeById(themeId);
    if (!t) return go('#/learn');
    tab = ['vocab', 'grammar', 'phrases', 'writing'].includes(tab) ? tab : 'vocab';
    renderChrome('learn', t.name_en, '#/learn');

    const tabs = [
      ['vocab', 'Vocab', 'مفردات'], ['grammar', 'Grammar', 'قواعد'],
      ['phrases', 'Phrases', 'عبارات'], ['writing', 'Writing', 'كتابة'],
    ];
    const pillTabs = `<div class="pill-tabs">` + tabs.map(([id, en, a]) =>
      `<a class="pill-tab ${tab === id ? 'pill-tab--active' : ''}" href="#/learn/${themeId}/${id}">` +
      `${en} <span class="ar" lang="ar">${a}</span></a>`).join('') + `</div>`;

    const header =
      `<div class="theme-head reveal" style="--theme:${esc(t.color)}">` +
      `<div class="theme-head__emoji">${emoji(t.emoji)}</div>` +
      `<div class="grow"><div class="theme-head__name">${esc(t.name_en)}</div>` +
      `<div class="theme-head__ar" lang="ar" dir="rtl">${esc(t.name_ar)}</div></div></div>`;

    $('#app').innerHTML = header + pillTabs + `<div id="tabbody"></div>`;
    const body = $('#tabbody');
    if (tab === 'vocab') renderVocab(body, t);
    else if (tab === 'grammar') renderGrammar(body, t);
    else if (tab === 'phrases') renderPhrases(body, t);
    else renderWriting(body, t);
  }

  function renderVocab(root, t) {
    let order = t.vocab.map((_, i) => i);
    let pos = 0;

    // set/clear known flag for the card at the given position
    const setKnown = (idx, val) => {
      const o = State.vocab();
      const key = t.id + ':' + t.vocab[order[idx]].en;
      if (val) o.known[key] = true; else delete o.known[key];
      write('vocab', o);
    };
    // record decision then move on (or finish the deck)
    const advance = (markKnown) => {
      setKnown(pos, markKnown);
      if (pos < t.vocab.length - 1) { pos++; draw(); }
      else drawDone();
    };

    const drawDone = () => {
      const kc = vocabKnownCount(t);
      root.innerHTML =
        `<div class="card center reveal">` +
        `<div style="font-size:48px">${emoji('🌟')}</div>` +
        `<div class="h1 en-serif" style="margin-top:var(--s2)">${kc} / ${t.vocab.length}</div>` +
        arP('راجعت كل البطاقات، وهذه الكلمات التي حفظتها. كرّر مراجعة الباقي لاحقاً.', ' style="margin-top:var(--s3);font-size:17px;font-weight:700"') +
        `<div class="fc-actions" style="margin-top:var(--s6)">` +
        `<button class="btn btn--primary" id="restart"><span class="ar">من البداية</span></button>` +
        `</div></div>`;
      $('#restart').addEventListener('click', () => { pos = 0; draw(); });
    };

    function draw() {
      const v = t.vocab[order[pos]];
      const kc = vocabKnownCount(t);
      const last = pos === t.vocab.length - 1;
      root.innerHTML =
        `<div class="deck-tools">` +
        `<button class="btn btn--ghost btn--sm" id="shuffle"><span class="ar">خلط</span></button>` +
        `<span class="deck-counter grow center">${pos + 1} / ${t.vocab.length}</span>` +
        `<span class="deck-counter" style="color:var(--good)">✓ ${kc}</span></div>` +
        `<div class="flashcard" id="fc"><div class="flashcard__inner">` +
        `<div class="flashcard__face front">` +
        `<div class="flashcard__emoji">${emoji(v.emoji)}</div>` +
        `<div class="flashcard__word">${esc(v.en)}</div>` +
        `<div class="flashcard__hint">${emoji('👆')} <span class="ar">اضغط للمعنى</span></div></div>` +
        `<div class="flashcard__face back">` +
        `<div class="flashcard__ar">${esc(v.ar)}</div>` +
        (v.ex ? `<div class="flashcard__ex">“${esc(v.ex)}”</div>` : '') + `</div>` +
        `</div></div>` +
        `<div class="fc-actions">` +
        `<button class="btn btn--primary" id="gotIt"><span class="ar">${last ? 'حفظتها وأنهيت' : 'حفظتها — التالية'}</span></button>` +
        `<button class="btn btn--ghost" id="review"><span class="ar">${last ? 'أراجعها وأنهيت' : 'أراجعها لاحقاً — التالية'}</span></button>` +
        `</div>` +
        `<div class="fc-back-row"><button class="fc-back" id="prev" ${pos === 0 ? 'disabled' : ''}>‹ السابقة</button></div>`;

      $('#fc').addEventListener('click', () => $('#fc').classList.toggle('is-flipped'));
      $('#shuffle').addEventListener('click', () => { for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[order[i], order[j]] = [order[j], order[i]]; } pos = 0; draw(); });
      $('#gotIt').addEventListener('click', () => advance(true));
      $('#review').addEventListener('click', () => advance(false));
      $('#prev').addEventListener('click', () => { if (pos > 0) { pos--; draw(); } });
    }
    draw();
  }

  function renderGrammar(root, t) {
    root.innerHTML = t.grammar.map((g, gi) =>
      `<div class="card reveal cv" style="--i:${gi}">` +
      `<div class="h2 en-serif">${esc(g.title_en)}</div>` +
      arP(g.title_ar, ' style="font-weight:600;color:var(--brand-700);margin-top:2px"') +
      `<p class="ar" lang="ar" dir="rtl" style="margin-top:var(--s3);color:var(--ink-2)">${esc(g.intro_ar)}</p>` +
      `<ul class="glist">` + g.points.map(p =>
        `<li><span class="en">${esc(p.en)}</span><span class="ar" lang="ar">${esc(p.ar)}</span></li>`).join('') + `</ul>` +
      `<div class="eyebrow" style="margin-top:var(--s4)">Examples</div>` +
      `<ul class="glist">` + g.examples.map(e =>
        `<li><span class="en">${esc(e.en)}</span><span class="ar" lang="ar">${esc(e.ar)}</span></li>`).join('') + `</ul>` +
      `</div>`).join('');
  }

  function renderPhrases(root, t) {
    root.innerHTML = t.functional.map((f, fi) =>
      `<div class="card reveal cv" style="--i:${fi}">` +
      `<div class="h2 en-serif">${esc(f.label_en)}</div>` +
      arP(f.label_ar, ' style="font-weight:600;color:var(--brand-700);margin-top:2px"') +
      `<p class="ar" lang="ar" dir="rtl" style="margin-top:6px;color:var(--ink-3);font-size:14px">${esc(f.note_ar)}</p>` +
      `<div style="margin-top:var(--s3)">` + f.phrases.map(p =>
        `<div class="pair"><span class="pair__en">${esc(p.en)}</span>` +
        `<span class="pair__ar" lang="ar">${esc(p.ar)}</span></div>`).join('') + `</div>` +
      `</div>`).join('');
  }

  function renderWriting(root, t) {
    root.innerHTML = t.writing.map((w, wi) => {
      const paras = w.model_en.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
      const tips = w.tips_ar.map(x => `<li>${esc(x)}</li>`).join('');
      const cl = w.checklist.map((x, ci) =>
        `<li data-ci="${wi}-${ci}"><span class="box">✓</span><span>${esc(x)}</span></li>`).join('');
      return `<div class="card reveal cv" style="--i:${wi}">` +
        `<div class="eyebrow">${w.type === 'informative' ? 'Informative · خبر/مقال' : 'Interactive · رسالة/حوار'}</div>` +
        `<div class="h2 en-serif" style="margin-top:4px">${esc(w.title_en)}</div>` +
        `<div class="explain" style="margin-top:var(--s3)"><div class="explain__h">المطلوب</div>${esc(w.prompt_ar)}</div>` +
        `<div class="eyebrow" style="margin-top:var(--s6)">Model answer · نموذج</div>` +
        `<div class="paper-block" style="margin-top:var(--s2)">${paras}</div>` +
        `<div class="eyebrow" style="margin-top:var(--s6)">نصائح</div>` +
        `<ul class="tips">${tips}</ul>` +
        `<div class="eyebrow" style="margin-top:var(--s6)">راجع نفسك</div>` +
        `<ul class="checklist selfcheck" style="margin-top:var(--s2)">${cl}</ul>` +
        `</div>`;
    }).join('');
    root.querySelectorAll('.selfcheck li').forEach(li =>
      li.addEventListener('click', () => li.classList.toggle('is-checked')));
  }

  /* ---------- PRACTICE grid (§9.5) ---------- */
  function viewPracticeGrid() {
    renderChrome('practice', 'Practice', '#/');
    const cards = [...DATA.skills].sort((a, b) => a.order - b.order).map((s, idx) => {
      const mm = mastery(s.id);
      return `<a class="card card--link reveal" style="--i:${idx}" href="#/practice/${s.id}">` +
        `<div class="row" style="gap:var(--s4)">${dashRing(mm, s.emoji)}` +
        `<div class="grow"><div class="h2 en-serif">${esc(s.label_en)}</div>` +
        arP(s.label_ar, ' style="font-weight:600;color:var(--brand-700);margin-top:2px"') +
        `<p class="ar" lang="ar" dir="rtl" style="margin-top:4px;color:var(--ink-3);font-size:13px">${esc(s.desc_ar)}</p></div>` +
        `<div style="color:var(--ink-3);font-size:22px;align-self:center">›</div></div></a>`;
    }).join('');
    $('#app').innerHTML =
      `<h1 class="h1 en-serif">Practice by skill</h1>` +
      arP('كل قسم في الورقة له ركن. اختر قسماً وابدأ التدريب.', ' style="margin:6px 0 var(--s5);color:var(--ink-2)"') +
      `<div class="stack">${cards}</div>`;
  }

  /* ---------- queue builder ---------- */
  // returns array of "card" objects. Each card renders one screen with 1+ gradable items.
  function buildQueue(skillId, theme) {
    const cards = [];
    if (skillId === 'vocabulary' || (skillId === 'grammar' && DATA.questions.some(q => q.skill === 'grammar'))) {
      let qs = DATA.questions.filter(q => q.skill === skillId);
      if (theme && theme !== 'mixed') qs = qs.filter(q => q.theme === theme);
      qs.forEach(q => cards.push({
        kind: 'standalone', passage: null, src: q.src,
        items: [{ type: 'mcq', prompt: q.prompt, options: q.options, answer: q.answer,
          explanation_ar: q.explanation_ar, key: 'q:' + q.id }],
      }));
    }
    const sets = DATA.sets.filter(s => s.skill === skillId);
    sets.forEach(set => {
      if (skillId === 'reading_tf') {
        set.items.forEach((it, idx) => cards.push({
          kind: 'tf', passage: it.passage_en, src: set.src, setTitle: set.title_en,
          items: [{ type: 'tf', prompt: it.prompt, answer: it.answer,
            explanation_ar: it.explanation_ar, key: 's:' + set.id + '#' + idx }],
        }));
      } else {
        cards.push({
          kind: 'set', passage: set.passage_en || null, src: set.src, setTitle: set.title_en, intro_ar: set.intro_ar,
          items: set.items.map((it, idx) => ({ ...it, key: 's:' + set.id + '#' + idx })),
        });
      }
    });

    // ordering: wrong items first, then unfinished, then fully-completed last.
    // => coming back resumes at the next unfinished card; finished ones sink to the end.
    const wrong = State.items().wrong;
    const seen = State.items().seen;
    const hasWrong = (c) => c.items.some(it => wrong[it.key]);
    const fullyDone = (c) => c.items.every(it => seen[it.key]);
    const rank = (c) => hasWrong(c) ? 0 : (fullyDone(c) ? 2 : 1);
    cards.forEach((c, i) => { c._i = i; c.done = fullyDone(c); });   // _i keeps original order within a rank (stable)
    cards.sort((a, b) => (rank(a) - rank(b)) || (a._i - b._i));
    return cards;
  }

  /* ---------- normalize short-answer (§6) ---------- */
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?،,؛;:]+$/g, '');
  function gradeShort(input, accept) {
    const a = norm(input);
    if (!a) return false;
    return accept.some(x => { const b = norm(x); return a === b || a.includes(b) || b.includes(a); });
  }

  /* ---------- PRACTICE drill (§9.6) ---------- */
  function viewDrill(skillId, params) {
    const skill = skillById(skillId);
    if (!skill) return go('#/practice');
    renderChrome('practice', skill.label_en, '#/practice');

    if (skillId === 'writing') return renderWritingDrill(skill, params);

    const theme = params.theme || null;
    // theme filter only meaningful for vocabulary/grammar-standalone
    const themeable = skillId === 'vocabulary' || DATA.questions.some(q => q.skill === skillId);
    let chipsHtml = '';
    if (themeable) {
      const chips = [['', 'الكل / Mixed']].concat(DATA.themes.map(t => [t.id, t.name_en]));
      chipsHtml = `<div class="chips">` + chips.map(([id, lab]) =>
        `<a class="chip ${(theme || '') === id ? 'chip--active' : ''}" ` +
        `href="#/practice/${skillId}${id ? '?theme=' + id : ''}">${esc(lab)}</a>`).join('') + `</div>`;
    }

    const queue = buildQueue(skillId, theme);
    if (!queue.length) {
      $('#app').innerHTML = chipsHtml +
        `<div class="card"><div class="empty">${`<div class="empty__emoji">${emoji('🗂️')}</div>`}` +
        arP('لا توجد أسئلة لهذا الاختيار. جرّب اختياراً آخر.') + `</div></div>`;
      return;
    }

    let ci = 0;                 // card index
    const session = { correct: 0, total: 0 };

    function renderCard() {
      const c = queue[ci];
      const total = queue.length;
      const pct = Math.round(ci / total * 100);
      const head =
        chipsHtml +
        `<div class="progress progress--thin" style="margin:var(--s2) 0 var(--s4)"><div class="progress__fill" style="width:${pct}%"></div></div>` +
        `<div class="row between wrap" style="margin-bottom:var(--s3);gap:var(--s2)">` +
        `<span class="mock-step">${ci + 1} / ${total}</span>` +
        `<span class="row" style="gap:var(--s2)">` +
        (c.done ? `<span class="badge--done"><span class="ar">تم سابقاً ✓</span></span>` : '') +
        (c.src === 'sample' ? goldBadge : '') + `</span></div>`;

      let bodyHtml = '';
      if (c.setTitle && c.kind === 'set') bodyHtml += `<div class="h2 en-serif" style="margin-bottom:6px">${esc(c.setTitle)}</div>`;
      if (c.intro_ar) bodyHtml += `<p class="ar" lang="ar" style="color:var(--ink-2);margin-bottom:var(--s3)">${esc(c.intro_ar)}</p>`;
      if (c.passage) bodyHtml += `<div class="passage" style="margin-bottom:var(--s4)">${esc(c.passage)}</div>`;
      bodyHtml += `<div id="items"></div>`;

      $('#app').innerHTML = head + `<div class="card">${bodyHtml}</div>` +
        `<div id="nav" style="margin-top:var(--s4)"></div>`;

      const itemsRoot = $('#items');
      const answered = new Array(c.items.length).fill(false);
      c.items.forEach((it, idx) => renderItem(itemsRoot, it, idx, c, () => {
        answered[idx] = true;
        if (answered.every(Boolean)) showNext();
      }, session));

      // if a single-item card, Next appears after answering; for multi-item set, after all answered.
      function showNext() {
        const last = ci === total - 1;
        $('#nav').innerHTML = `<button class="btn btn--primary btn--block" id="nextBtn">` +
          (last ? 'إنهاء / Finish' : 'التالي ›') + `</button>`;
        $('#nextBtn').addEventListener('click', () => {
          if (last) finish(); else { ci++; renderCard(); window.scrollTo(0, 0); }
        });
      }
    }

    function finish() {
      const pct = session.total ? Math.round(session.correct / session.total * 100) : 0;
      const high = pct >= 80;
      $('#app').innerHTML =
        `<div class="card center reveal">` +
        `<div style="font-size:54px">${emoji(high ? '🎉' : pct >= 50 ? '👏' : '💪')}</div>` +
        `<div class="h1 en-serif" style="margin-top:var(--s2)">${session.correct} / ${session.total}</div>` +
        `<div class="display" style="color:var(--brand)">${pct}%</div>` +
        ar(high ? 'ممتاز! واصل على هذا المستوى.' : pct >= 50 ? 'أداء جيّد — مراجعة بسيطة وتُتقنه.' : 'لا تقلق، التكرار يثبّت. جرّب مرة أخرى.',
          ' style="margin-top:var(--s3);font-size:18px;font-weight:700"') +
        `<div class="stack" style="margin-top:var(--s5)">` +
        `<button class="btn btn--primary btn--block" id="again">أعد المحاولة / Practice again</button>` +
        `<a class="btn btn--ghost btn--block" href="#/practice">رجوع للأقسام</a></div></div>`;
      $('#again').addEventListener('click', () => { ci = 0; session.correct = 0; session.total = 0; renderCard(); window.scrollTo(0, 0); });
      if (high) celebrate();
    }

    renderCard();
  }

  // render one gradable item into root
  function renderItem(root, it, idx, card, onAnswered, session) {
    const wrap = document.createElement('div');
    wrap.style.marginTop = idx > 0 ? 'var(--s6)' : '0';
    if (idx > 0) wrap.style.borderTop = '1px solid var(--line)', wrap.style.paddingTop = 'var(--s4)';
    root.appendChild(wrap);
    const skill = parseHash().parts[1];

    const commit = (correct, explHtml) => {
      session.total++; if (correct) session.correct++;
      recordAnswer(skill, it.key, correct);
      const ex = document.createElement('div');
      ex.className = 'explain';
      ex.innerHTML = `<div class="explain__h">${correct ? 'صح ✓' : 'الشرح'}</div>${esc(it.explanation_ar)}`;
      wrap.appendChild(ex);
      onAnswered();
    };

    if (it.type === 'mcq') {
      wrap.innerHTML = `<div class="qprompt">${esc(it.prompt)}</div><div class="options" id="opt${idx}"></div>`;
      const opts = $('#opt' + idx, wrap);
      it.options.forEach((o, oi) => {
        const b = document.createElement('button');
        b.className = 'quiz-option';
        b.innerHTML = `<span class="grow">${esc(o)}</span><span class="mark"></span>`;
        b.addEventListener('click', () => {
          const correct = oi === it.answer;
          opts.classList.add('locked');
          b.classList.add('is-selected', correct ? 'is-correct' : 'is-wrong');
          b.querySelector('.mark').textContent = correct ? '✓' : '✗';
          if (!correct) {
            b.classList.add('shake');
            const right = opts.children[it.answer];
            right.classList.add('is-correct'); right.querySelector('.mark').textContent = '✓';
          } else b.classList.add('pop');
          commit(correct);
        });
        opts.appendChild(b);
      });
    } else if (it.type === 'tf') {
      wrap.innerHTML = `<div class="qprompt">${esc(it.prompt)}</div>` +
        `<div class="tf-row"><button class="btn btn--ghost tf-btn" data-v="true">True <span class="ar">صح</span></button>` +
        `<button class="btn btn--ghost tf-btn" data-v="false">False <span class="ar">خطأ</span></button></div>`;
      const btns = wrap.querySelectorAll('.tf-btn');
      btns.forEach(b => b.addEventListener('click', () => {
        const val = b.dataset.v === 'true';
        const correct = val === it.answer;
        btns.forEach(x => x.style.pointerEvents = 'none');
        b.classList.add(correct ? 'is-correct' : 'is-wrong');
        b.style.background = correct ? 'var(--good)' : 'var(--bad)';
        b.style.color = '#fff'; b.style.borderColor = 'transparent';
        if (!correct) { b.classList.add('shake');
          const r = [...btns].find(x => (x.dataset.v === 'true') === it.answer);
          r.style.background = 'var(--good)'; r.style.color = '#fff'; r.style.borderColor = 'transparent';
        } else b.classList.add('pop');
        commit(correct);
      }));
    } else if (it.type === 'short') {
      wrap.innerHTML = `<div class="qprompt">${esc(it.prompt)}</div>` +
        `<div class="field"><input class="input" id="in${idx}" placeholder="Type your answer…" autocomplete="off"></div>` +
        `<button class="btn btn--primary btn--sm" id="chk${idx}" style="margin-top:var(--s3)">Check</button>` +
        `<div id="note${idx}"></div>`;
      const input = $('#in' + idx, wrap), btn = $('#chk' + idx, wrap), note = $('#note' + idx, wrap);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const correct = gradeShort(input.value, it.accept);
        input.disabled = true; btn.disabled = true; btn.style.opacity = .5;
        input.style.borderColor = correct ? 'var(--good)' : 'var(--bad)';
        note.className = 'answer-note'; note.style.marginTop = 'var(--s2)';
        note.innerHTML = correct
          ? `<span class="ok">صح ✓</span>`
          : `<span class="no">قريب! ✗</span> — إجابة مقبولة: <b>${esc(it.accept[0])}</b>`;
        commit(correct);
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    }
  }

  // writing "drill" = theme/model picker reusing learn writing (§9.6)
  function renderWritingDrill(skill, params) {
    const tid = params.theme;
    if (!tid) {
      const cards = DATA.themes.map((t, i) =>
        `<a class="card card--link reveal" style="--i:${i};--theme:${esc(t.color)}" href="#/practice/writing?theme=${t.id}">` +
        `<div class="row"><span style="font-size:26px">${emoji(t.emoji)}</span>` +
        `<div class="grow"><div class="h2 en-serif">${esc(t.name_en)}</div>${ar(t.name_ar)}</div>` +
        `<span style="color:var(--ink-3);font-size:22px">›</span></div></a>`).join('');
      $('#app').innerHTML =
        `<h1 class="h1 en-serif">${esc(skill.label_en)}</h1>` +
        arP('الكتابة تُقيَّم ذاتياً: اقرأ النموذج، ثم اكتب وقارن بقائمة المراجعة.', ' style="margin:6px 0 var(--s5);color:var(--ink-2)"') +
        `<div class="stack">${cards}</div>`;
      return;
    }
    const t = themeById(tid);
    if (!t) return go('#/practice/writing');
    renderChrome('practice', t.name_en + ' · Writing', '#/practice/writing');
    $('#app').innerHTML =
      `<div class="tint-band" style="--theme:${esc(t.color)};margin-bottom:var(--s4)">` +
      `<div class="row"><span class="tint-band__emoji">${emoji(t.emoji)}</span>` +
      `<div class="grow"><div class="h1">${esc(t.name_en)}</div>${ar('اكتب وراجع نفسك')}</div></div></div>` +
      `<div id="wbody"></div>` +
      `<div class="card" style="margin-top:var(--s4)"><div class="eyebrow">اكتب هنا · Your turn</div>` +
      `<div class="field"><textarea class="input" placeholder="Write your answer here…"></textarea></div>` +
      arP('لا يُصحَّح آلياً، قارن كتابتك بالنموذج وبقائمة المراجعة في الأعلى.', ' style="margin-top:var(--s2);font-size:13px;color:var(--ink-3)"') +
      `</div>`;
    renderWriting($('#wbody'), t);
  }

  /* ---------- MOCK (§9.7) — available in review session ---------- */
  function viewMockIntro() {
    renderChrome('mock', 'Mock Exam', '#/');
    $('#app').innerHTML =
      `<div class="card reveal center">` +
      `<div style="font-size:56px">${emoji('📝')}</div>` +
      `<h1 class="h1 en-serif" style="margin-top:var(--s3)">Mock Exam</h1>` +
      arP('في حصة المراجعة', ' style="margin-top:var(--s3);font-size:20px;font-weight:700;color:var(--brand-700)"') +
      arP('سيُفتح الامتحان التجريبي خلال حصة المراجعة على Google Meet.', ' style="margin-top:var(--s2);color:var(--ink-2)"') +
      `</div>`;
  }

  /* ---------- celebration ---------- */
  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#126E63', '#E2A33C', '#DD5E47', '#3E7CA8', '#4E9D6B'];
    const c = document.createElement('div'); c.className = 'confetti';
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * .4 + 's';
      s.style.transform = `translateY(0) rotate(${Math.random() * 360}deg)`;
      c.appendChild(s);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }

  /* ---------- main render ---------- */
  function render() {
    const { parts, params } = parseHash();
    const [a, b, c] = parts;
    window.scrollTo(0, 0);
    Annot.clearInk();   // wipe annotations on every route change
    try {
      if (!a) return viewHome();
      if (a === 'learn') return b ? viewTheme(b, c) : viewLearnGrid();
      if (a === 'practice') return b ? viewDrill(b, params) : viewPracticeGrid();
      if (a === 'mock') return viewMockIntro();
      return viewHome();
    } catch (err) {
      console.error(err);
      $('#app').innerHTML = `<div class="card center"><div style="font-size:40px">${emoji('😅')}</div>` +
        arP('حدث خطأ بسيط في العرض. ارجع للرئيسية وجرّب مرة أخرى.', ' style="margin-top:var(--s3)"') +
        `<a class="btn btn--primary" style="margin-top:var(--s4)" href="#/">الرئيسية</a></div>`;
    }
  }

  /* ---------- annotation overlay (pen / highlighter / laser / spotlight / eraser) ---------- */
  const Annot = (() => {
    const COLORS = { pen: '#1D6FE0', highlighter: '#FFE14D', laser: '#FF2D2D', spotlight: '#FF2D2D' };
    const SPOT_HOLD = 4000, SPOT_FADE = 1100, LASER_LIFE = 900;
    let canvas, ctx, fab, bar, dpr = 1;
    let tool = null;             // 'pen'|'highlighter'|'laser'|'spotlight'|'eraser'|null
    let strokes = [];            // permanent: pen/highlighter ; timed: spotlight
    let laser = [];              // {x,y,t} trail points
    let cur = null;              // stroke being drawn
    let drawing = false, raf = 0;

    const css = (el, o) => Object.assign(el.style, o);

    function setup() {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      css(canvas, { width: innerWidth + 'px', height: innerHeight + 'px' });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }

    function drawStroke(s, alpha) {
      if (!s.points.length) return;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.lineJoin = ctx.lineCap = 'round';
      if (s.tool === 'highlighter') { ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = s.color; ctx.lineWidth = 18; ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.45; }
      else if (s.tool === 'spotlight') { ctx.strokeStyle = s.color; ctx.lineWidth = 4; ctx.shadowColor = s.color; ctx.shadowBlur = 16; }
      else { ctx.strokeStyle = s.color; ctx.lineWidth = 3; }
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
      ctx.restore();
    }

    function redraw() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const now = performance.now();
      // permanent + spotlight
      strokes = strokes.filter(s => {
        if (s.tool === 'spotlight') {
          const age = now - s.bornAt;
          if (age > SPOT_HOLD + SPOT_FADE) return false;
          const a = age <= SPOT_HOLD ? 1 : 1 - (age - SPOT_HOLD) / SPOT_FADE;
          drawStroke(s, a);
          return true;
        }
        drawStroke(s, 1);
        return true;
      });
      // laser trail
      laser = laser.filter(p => now - p.t < LASER_LIFE);
      if (laser.length) {
        ctx.save();
        for (let i = 1; i < laser.length; i++) {
          const p = laser[i], a = 1 - (now - p.t) / LASER_LIFE;
          ctx.globalAlpha = Math.max(0, a);
          ctx.strokeStyle = COLORS.laser; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.shadowColor = COLORS.laser; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(laser[i - 1].x, laser[i - 1].y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        const head = laser[laser.length - 1];
        ctx.globalAlpha = 1; ctx.fillStyle = COLORS.laser; ctx.shadowColor = COLORS.laser; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(head.x, head.y, 6, 0, 7); ctx.fill();
        ctx.restore();
      }
    }

    function loop() {
      redraw();
      if (drawing || laser.length || strokes.some(s => s.tool === 'spotlight')) raf = requestAnimationFrame(loop);
      else raf = 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    function pos(e) { return { x: e.clientX, y: e.clientY }; }

    function eraseAt(p) {
      const R = 18, before = strokes.length;
      strokes = strokes.filter(s => s.tool === 'spotlight' || !s.points.some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < R));
      if (strokes.length !== before) redraw();
    }

    function onDown(e) {
      if (!tool) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing = true;
      const p = pos(e);
      if (tool === 'laser') { laser.push({ x: p.x, y: p.y, t: performance.now() }); }
      else if (tool === 'eraser') { eraseAt(p); }
      else { cur = { tool, color: COLORS[tool], points: [p] }; if (tool === 'spotlight') cur.bornAt = performance.now(); strokes.push(cur); }
      kick();
    }
    function onMove(e) {
      if (!drawing || !tool) return;
      const p = pos(e);
      if (tool === 'laser') laser.push({ x: p.x, y: p.y, t: performance.now() });
      else if (tool === 'eraser') eraseAt(p);
      else if (cur) cur.points.push(p);
      kick();
    }
    function onUp(e) {
      if (!drawing) return;
      drawing = false;
      if (tool === 'spotlight' && cur) cur.bornAt = performance.now(); // start hold timer at release
      cur = null;
      kick();
    }

    function setTool(t) {
      tool = (tool === t) ? null : t;
      canvas.classList.toggle('is-drawing', !!tool);
      bar.querySelectorAll('.annot-btn[data-tool]').forEach(b =>
        b.classList.toggle('is-active', b.dataset.tool === tool));
    }
    function toggleBar() {
      const open = bar.classList.toggle('is-open');
      fab.classList.toggle('is-open', open);
      fab.textContent = open ? '✕' : '✏️';
      if (!open) { tool = null; canvas.classList.remove('is-drawing'); bar.querySelectorAll('.annot-btn').forEach(b => b.classList.remove('is-active')); }
    }

    function clearInk() { strokes = []; laser = []; cur = null; redraw(); }

    function init() {
      canvas = document.createElement('canvas'); canvas.id = 'annotCanvas';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');

      bar = document.createElement('div'); bar.className = 'annot-bar';
      const tools = [
        ['pen', '✏️', 'قلم أزرق'], ['highlighter', '🖍️', 'تظليل'],
        ['laser', '🔴', 'مؤشّر ليزر'], ['spotlight', '✨', 'تحديد متوهّج'],
        ['eraser', '🩹', 'ممحاة'],
      ];
      bar.innerHTML = tools.map(([t, e, a]) =>
        `<button class="annot-btn" data-tool="${t}" title="${a}" aria-label="${a}">${e}</button>`).join('') +
        `<div class="annot-sep"></div>` +
        `<button class="annot-btn" data-act="clear" title="مسح الكل" aria-label="مسح الكل">🗑️</button>`;
      document.body.appendChild(bar);

      fab = document.createElement('button'); fab.className = 'annot-fab';
      fab.setAttribute('aria-label', 'أدوات الشرح'); fab.textContent = '✏️';
      document.body.appendChild(fab);

      fab.addEventListener('click', toggleBar);
      bar.querySelectorAll('.annot-btn[data-tool]').forEach(b =>
        b.addEventListener('click', () => setTool(b.dataset.tool)));
      bar.querySelector('[data-act=clear]').addEventListener('click', clearInk);

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      window.addEventListener('resize', setup);
      setup();
    }
    return { init, clearInk };
  })();

  /* ---------- boot ---------- */
  function showLoading() {
    $('#app').innerHTML = `<div class="loader"><div class="spinner"></div><div class="ar" lang="ar">لحظة… نجهّز المراجعة</div></div>`;
  }
  function showError() {
    $('#topbar').innerHTML = `<div class="topbar__mark">Habiba's <b>English</b> Guide</div>`;
    $('#app').innerHTML = `<div class="card center" style="margin-top:var(--s8)"><div style="font-size:44px">${emoji('📡')}</div>` +
      `<h2 class="h2 en-serif" style="margin-top:var(--s3)">Couldn't load content</h2>` +
      arP('تعذّر تحميل المحتوى. تأكّد من الاتصال وأعد تحميل الصفحة.', ' style="margin-top:var(--s2)"') +
      `<button class="btn btn--primary" style="margin-top:var(--s4)" onclick="location.reload()">إعادة المحاولة</button></div>`;
  }

  showLoading();
  fetch('./data.json')
    .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(d => {
      DATA = d;
      Annot.init();
      render();
      window.addEventListener('hashchange', render);
    })
    .catch(err => { console.error(err); showError(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
