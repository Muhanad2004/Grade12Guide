# Product

## Register

product

## Users

Omani Grade 12 students preparing for their final English exam, typically in the last week before the paper. They study on personal phones (mostly iPhone) and iPads, often offline or on slow connections, in short revision sessions. The content is authored and "voiced" by Habiba, an English Literature and Translation student at SQU, so the product speaks to students as a kind, slightly older peer rather than an institution. Arabic is the students' first language; English is the subject being learned.

## Product Purpose

A bilingual, installable PWA that helps students revise for the exam in two ways: LEARN by theme (vocabulary, grammar, functional phrases, writing models across four syllabus themes) and PRACTICE by skill (the six exam sections, plus a full mock exam in paper order). A coverage based dashboard shows how much of each section has been worked through. Success is a student arriving at the exam feeling prepared and calm, having covered every section and understood the Arabic explanation behind every answer. All content lives in `data.json`; the UI is content driven and must need no code changes to extend.

## Brand Personality

Warm, encouraging, clear. The voice is a supportive mentor: calm confidence, never stressful, never condescending. Arabic copy is friendly Modern Standard Arabic (not colloquial dialect), gender neutral toward the reader, and mirrors the tone of a patient teacher. Progress is shown as quiet momentum, not scores to be anxious about.

## Anti-references

- Generic AI/SaaS look: purple-on-white gradients, decorative glassmorphism, the hero-metric template, endless identical card grids, gradient text, side-stripe accent borders.
- Childish or over-gamified: cartoon mascots, point explosions, loud badges, kiddie colors. These are 17 to 18 year olds sitting a serious exam.
- Corporate or clinical: cold enterprise dashboards, dense data tables, navy-and-grey sterility.
- Cluttered or busy: competing accents and decorations. The interface should stay quiet, legible, and focused on one thing at a time.

## Design Principles

- Calm over competitive. Show progress as coverage and gentle momentum, never as a stressful percentage or grade. Reduce test anxiety, do not add to it.
- The explanation is the point. Every answer reveals its Arabic explanation; practice exists to teach, not to score.
- Bilingual with intent. English is the learning content; Arabic is the guiding, reassuring layer. Each language is rendered in its correct direction and rhythm, never an afterthought.
- Content driven, not hard coded. Behavior and copy come from `data.json`; the UI stays generic so new words, questions, and sessions need no code.
- Phone and iPad first, offline ready. Touch sized, fast on modest hardware, and fully usable after the first load.

## Accessibility & Inclusion

- WCAG AA contrast on the light background; visible brand focus rings; honor `prefers-reduced-motion` (non-essential motion disabled).
- Strong bilingual RTL: Arabic blocks carry `lang="ar"` and correct RTL base direction with isolated bidi so punctuation sits correctly; English stays LTR within the same view. Arabic uses an Arabic-first font (Noto Sans Arabic).
- Large touch targets (>=44px) and generous spacing for thumbs; performs on older/cheaper phones and slow connections (lazy media, content-visibility, service-worker caching).
- Never rely on color alone: correct/incorrect states also use icons and text.
