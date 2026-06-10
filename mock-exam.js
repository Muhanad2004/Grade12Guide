/* ---------- MOCK EXAM — extracted from app.js ---------- */
/* These functions can be re-integrated into app.js when needed.
   They depend on: DATA, skillById, renderChrome, renderItem, celebrate,
   arP, emoji, esc, ar, State, write, go, goldBadge, assembleMock helpers.
*/

function viewMockIntro() {
  renderChrome('mock', 'Mock Exam', '#/');
  const skills = [...DATA.skills].sort((a, b) => a.order - b.order);
  $('#app').innerHTML =
    `<div class="card reveal">` +
    `<div style="font-size:48px" class="center">${emoji('📝')}</div>` +
    `<h1 class="h1 en-serif center" style="margin-top:var(--s2)">Mock Exam</h1>` +
    arP('هذا امتحان تجريبي يحاكي الورقة الحقيقية: ستة أقسام بالترتيب. القراءة والمفردات والقواعد تُصحَّح تلقائياً، أمّا الكتابة فتقيّمها بنفسك بقائمة مراجعة.',
      ' style="margin-top:var(--s3)"') +
    `<ul class="glist" style="margin-top:var(--s4)">` + skills.map((s, i) =>
      `<li><span class="en">${i + 1}. ${emoji(s.emoji)} ${esc(s.label_en)}</span>` +
      `<span class="ar" lang="ar">${esc(s.label_ar)}</span></li>`).join('') + `</ul>` +
    `<button class="btn btn--primary btn--block" id="start" style="margin-top:var(--s5)">ابدأ الامتحان / Start</button>` +
    `</div>` +
    mockHistory();
  $('#start').addEventListener('click', () => go('#/mock/run'));
}

function mockHistory() {
  const h = State.mocks();
  if (!h.length) return '';
  const rows = h.slice(-5).reverse().map(m => {
    const d = new Date(m.date);
    const date = `${d.getDate()}/${d.getMonth() + 1}`;
    return `<div class="pair"><span class="pair__en">${date} — ${m.score}/${m.total} (${Math.round(m.score / m.total * 100)}%)</span></div>`;
  }).join('');
  return `<div class="card" style="margin-top:var(--s4)"><div class="eyebrow">سجلّ المحاولات · History</div>${rows}</div>`;
}

// assemble mock sections
function assembleMock() {
  const pick = (arr, prefSample) => {
    const s = arr.filter(x => x.src === 'sample');
    return prefSample && s.length ? s : arr;
  };
  const sections = [];
  const ordered = [...DATA.skills].sort((a, b) => a.order - b.order);
  for (const sk of ordered) {
    if (sk.id === 'reading_tf') {
      const sets = pick(DATA.sets.filter(s => s.skill === 'reading_tf'), true);
      const set = sets[0];
      const items = set.items.slice(0, 4).map((it, idx) => ({
        type: 'tf', prompt: it.prompt, passage: it.passage_en, answer: it.answer,
        explanation_ar: it.explanation_ar, key: 's:' + set.id + '#' + idx,
      }));
      sections.push({ skill: sk, src: set.src, items });
    } else if (sk.id === 'reading_comp') {
      const set = pick(DATA.sets.filter(s => s.skill === 'reading_comp'), true)[0];
      sections.push({ skill: sk, src: set.src, passage: set.passage_en, title: set.title_en,
        items: set.items.map((it, idx) => ({ ...it, key: 's:' + set.id + '#' + idx })) });
    } else if (sk.id === 'vocabulary') {
      const qs = pick(DATA.questions.filter(q => q.skill === 'vocabulary'), true).slice(0, 5);
      sections.push({ skill: sk, items: qs.map(q => ({ type: 'mcq', prompt: q.prompt, options: q.options,
        answer: q.answer, explanation_ar: q.explanation_ar, src: q.src, key: 'q:' + q.id })) });
    } else if (sk.id === 'grammar') {
      const set = pick(DATA.sets.filter(s => s.skill === 'grammar'), true)[0];
      sections.push({ skill: sk, src: set.src, passage: set.passage_en, title: set.title_en,
        items: set.items.map((it, idx) => ({ ...it, key: 's:' + set.id + '#' + idx })) });
    } else if (sk.id === 'cloze') {
      const set = pick(DATA.sets.filter(s => s.skill === 'cloze'), true)[0];
      sections.push({ skill: sk, src: set.src, passage: set.passage_en, title: set.title_en,
        items: set.items.map((it, idx) => ({ ...it, key: 's:' + set.id + '#' + idx })) });
    } else if (sk.id === 'writing') {
      const t = DATA.themes[Math.floor(Math.random() * DATA.themes.length)];
      sections.push({ skill: sk, writing: t.writing[0], theme: t });
    }
  }
  return sections;
}

function viewMockRun() {
  renderChrome('mock', 'Mock Exam', '#/mock');
  const sections = assembleMock();
  let si = 0;
  const result = { perSkill: {}, score: 0, total: 0 };

  function renderSection() {
    const sec = sections[si];
    const sk = sec.skill;
    const head =
      `<div class="row between" style="margin-bottom:var(--s3)">` +
      `<span class="mock-step">Section ${si + 1} / ${sections.length}</span>` +
      (sec.src === 'sample' ? goldBadge : '') + `</div>` +
      `<div class="progress progress--thin" style="margin-bottom:var(--s4)"><div class="progress__fill" style="width:${Math.round(si / sections.length * 100)}%"></div></div>` +
      `<div class="sec-head">${emoji(sk.emoji)}<div><div class="h2 en-serif">${esc(sk.label_en)}</div>` +
      `<span class="ar" lang="ar" style="color:var(--ink-2);font-size:13px">${esc(sk.label_ar)}</span></div></div>`;

    if (sk.id === 'writing') {
      const w = sec.writing;
      const paras = w.model_en.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
      const cl = w.checklist.map((x, ci) => `<li data-ci="${ci}"><span class="box">✓</span><span>${esc(x)}</span></li>`).join('');
      $('#app').innerHTML = head +
        `<div class="card">` +
        `<div class="explain"><div class="explain__h">المطلوب — ${esc(sec.theme.name_en)}</div>${esc(w.prompt_ar)}</div>` +
        `<div class="field"><textarea class="input" placeholder="Write your answer…"></textarea></div>` +
        `<div class="eyebrow" style="margin-top:var(--s5)">راجع نفسك · Self-check</div>` +
        `<ul class="checklist selfcheck" style="margin-top:var(--s2)">${cl}</ul>` +
        `<details style="margin-top:var(--s4)"><summary class="btn btn--ghost btn--sm" style="display:inline-flex">أظهر النموذج</summary>` +
        `<div class="paper-block" style="margin-top:var(--s3)">${paras}</div></details>` +
        `</div>` +
        `<button class="btn btn--primary btn--block" id="secNext" style="margin-top:var(--s4)">${si === sections.length - 1 ? 'إنهاء / Finish' : 'القسم التالي ›'}</button>`;
      $('#app').querySelectorAll('.selfcheck li').forEach(li => li.addEventListener('click', () => li.classList.toggle('is-checked')));
      $('#secNext').addEventListener('click', advance);
      return;
    }

    // graded sections
    let bodyHtml = '';
    if (sec.title) bodyHtml += `<div class="h2 en-serif" style="margin-bottom:6px">${esc(sec.title)}</div>`;
    if (sec.passage) bodyHtml += `<div class="passage" style="margin-bottom:var(--s4)">${esc(sec.passage)}</div>`;
    bodyHtml += `<div id="items"></div>`;
    $('#app').innerHTML = head + `<div class="card">${bodyHtml}</div>` + `<div id="nav" style="margin-top:var(--s4)"></div>`;

    const itemsRoot = $('#items');
    const answered = new Array(sec.items.length).fill(false);
    const local = { correct: 0, total: 0 };
    sec.items.forEach((it, idx) => {
      // each tf item carries its own passage in mock
      if (it.passage) { const p = document.createElement('div'); p.className = 'passage'; p.style.margin = (idx ? 'var(--s4)' : '0') + ' 0 var(--s3)'; p.textContent = it.passage; itemsRoot.appendChild(p); }
      renderItem(itemsRoot, it, idx, sec, () => {
        answered[idx] = true;
        if (answered.every(Boolean)) showSecNext();
      }, local);
    });
    function showSecNext() {
      result.perSkill[sk.id] = { correct: local.correct, total: local.total };
      result.score += local.correct; result.total += local.total;
      $('#nav').innerHTML = `<button class="btn btn--primary btn--block" id="secNext">` +
        (si === sections.length - 1 ? 'إنهاء / Finish' : 'القسم التالي ›') + `</button>`;
      $('#secNext').addEventListener('click', advance);
    }
  }

  function advance() {
    if (si === sections.length - 1) { saveAndShow(); }
    else { si++; renderSection(); window.scrollTo(0, 0); }
  }
  function saveAndShow() {
    const rec = { date: new Date().toISOString(), perSkill: result.perSkill, score: result.score, total: result.total };
    const h = State.mocks(); h.push(rec); write('mocks', h);
    go('#/mock/results');
    // results view reads last record
    sessionStorage.setItem('heg:lastMock', JSON.stringify(rec));
  }
  renderSection();
}

function viewMockResults() {
  renderChrome('mock', 'Results', '#/mock');
  let rec; try { rec = JSON.parse(sessionStorage.getItem('heg:lastMock')); } catch (e) {}
  if (!rec) { const h = State.mocks(); rec = h[h.length - 1]; }
  if (!rec) return go('#/mock');
  const pct = rec.total ? Math.round(rec.score / rec.total * 100) : 0;
  const msg = pct >= 80 ? 'أداء ممتاز! أنت جاهز — واصل المراجعة الخفيفة.'
    : pct >= 60 ? 'جيّد جداً! ركّز على أضعف قسم وترتفع أكثر.'
    : pct >= 40 ? 'بداية طيبة. التكرار يثبّت — لا تستسلم.'
    : 'كل محاولة تعلّمك. راجع الشرح ودرّب قسماً قسماً.';

  // weakest section in this mock
  let weak = null, weakPct = 101;
  for (const [sid, r] of Object.entries(rec.perSkill)) {
    if (!r.total) continue; const p = r.correct / r.total * 100;
    if (p < weakPct) { weakPct = p; weak = sid; }
  }
  const rows = [...DATA.skills].sort((a, b) => a.order - b.order).map(s => {
    const r = rec.perSkill[s.id];
    const label = r ? `${r.correct}/${r.total}` : '✎ ذاتي';
    return `<div class="pair"><span class="pair__en">${emoji(s.emoji)} ${esc(s.label_en)}</span>` +
      `<span class="pair__ar"><b>${label}</b></span></div>`;
  }).join('');

  $('#app').innerHTML = `<div class="sheet-overlay" id="ov"><div class="sheet">` +
    `<div class="center"><div style="font-size:54px">${emoji(pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '💪')}</div>` +
    `<div class="display" style="color:var(--brand)">${pct}%</div>` +
    `<div class="h2 en-serif">${rec.score} / ${rec.total} auto-graded</div></div>` +
    ar(msg, ' style="margin-top:var(--s3);font-size:17px;font-weight:700;text-align:center"') +
    `<div class="card" style="margin-top:var(--s5)"><div class="eyebrow">حسب القسم · Per section</div>${rows}</div>` +
    (weak ? `<a class="btn btn--primary btn--block" style="margin-top:var(--s4)" href="#/practice/${weak}">درّب أضعف قسم: ${esc(skillById(weak).label_ar)}</a>` : '') +
    `<a class="btn btn--ghost btn--block" style="margin-top:var(--s3)" href="#/mock">رجوع</a>` +
    `</div></div>`;
  if (pct >= 80) celebrate();
}
