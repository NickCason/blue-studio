# Studio Marginalia — Polish Punch List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six discrete UX/UI polish improvements to studio-marginalia: resilient audio playback, higher-contrast small purple text, candle flame nudge, Tina admin themed skin, permalink back-link, and portfolio reintegration.

**Architecture:** Pure additive/in-place edits to an existing Astro 5 + TinaCMS site. No schema, no infra, no build pipeline changes. Changes deploy via the existing GitHub Actions → Cloudflare Pages flow with atomic deploy semantics (failed builds keep prior version live).

**Tech Stack:** Astro 5, TinaCMS 3.7.5 (cmsCallback hook available — same hook the deploy banner uses), Cloudflare Pages, Phosphor Duotone icons, Fraunces Variable serif. No test framework currently exercised (vitest + playwright installed but unused). Verification is manual via `pnpm dev` for visual items, with one automated regression check for the audio click handler.

**Spec:** `docs/superpowers/specs/2026-05-05-marginalia-polish-design.md`

---

## File Structure

**Create:**
- `src/components/post-permalinks/BackToJournal.astro` — small back-to-journal link, shared by all six permalink types.
- `public/admin-theme.css` — Tina admin theme stylesheet, served from the static `public/` tree so the admin SPA can `<link>` to it at runtime.

**Modify:**
- `src/styles/tokens.css` — add `--accent-text` token (dark + light theme values).
- `src/styles/candle.css` — flame `top` offset.
- `src/components/post-types/AudioCard.astro` — playback resilience in the inline `<script>`, plus `.dur` color swap and a `.fault` pulse keyframe.
- `src/components/ui/Eyebrow.astro`, `src/components/ui/MetaRow.astro` — color swap.
- `src/components/sidebar/Noticing.astro`, `src/components/sidebar/OnHerDesk.astro`, `src/components/sidebar/IssueCounter.astro` — color swap on small label/meta text only (decorative fills stay `--accent`).
- `src/components/post-permalinks/AudioPage.astro` — `.transcript summary` color swap.
- `src/components/post-types/LinkCard.astro`, `EssayCard.astro` — `.source`, `.readtime` color swap.
- `src/components/layout/Nav.astro` — `.nav-link` active/hover color swap; insert "Portfolio" link.
- `src/pages/work/index.astro` — small-text color swaps (eyebrow rule, section label, etc.); add "Selected work" teaser section linking to `/work/portfolio/`.
- `src/pages/work/portfolio/index.astro` — `.meta` color swap.
- `src/pages/journal/[...slug].astro` — render `<BackToJournal>` above the type-switch.
- `tina/config.ts` — extend the existing `cmsCallback` to inject a `<link rel="stylesheet" href="/admin-theme.css">` into the admin SPA's `<head>`.

**Tests:** None added in this plan. Existing project has no live test suite. Each task ends with a manual verification step using `pnpm dev` and (where relevant) browser DevTools.

---

## Task 1: Audio playback resilience

**Files:**
- Modify: `src/components/post-types/AudioCard.astro` (the inline `<script>` block at lines 51–108 and the `<style>` block).

- [ ] **Step 1: Read the current AudioCard.astro `<script>` block end-to-end**

Read `src/components/post-types/AudioCard.astro` lines 51–151 so you have the exact existing structure (event listeners, RAF tick, click handler) in mind.

- [ ] **Step 2: Replace the per-player init block with a resilient version**

Replace the entire `<script>` block (lines 51–109 of the original, between the opening `<script>` and closing `</script>`) with:

```html
<script>
  // Helper: a player is "stale" if the audio element errored, has no buffered
  // data (HAVE_NOTHING), or was flagged for reset by a lifecycle/visibility event.
  function isStale(audio: HTMLAudioElement, flaggedForReset: boolean): boolean {
    if (flaggedForReset) return true;
    if (audio.error != null) return true;
    if (audio.readyState === 0 /* HAVE_NOTHING */) return true;
    return false;
  }

  type PlayerState = {
    audio: HTMLAudioElement;
    playBtn: HTMLButtonElement;
    playIcon: HTMLElement;
    bars: HTMLDivElement[];
    waveform: HTMLDivElement;
    rafId: number;
    needsReset: boolean;
    hasEverPlayed: boolean;
  };

  const players: PlayerState[] = [];

  for (const player of document.querySelectorAll<HTMLDivElement>('.player')) {
    const src = (player as HTMLElement).dataset.audioSrc!;
    const audio = new Audio(src);
    audio.preload = 'metadata';
    const playBtn = player.querySelector<HTMLButtonElement>('.play')!;
    const playIcon = playBtn.querySelector('i')!;
    const waveform = player.querySelector<HTMLDivElement>('.waveform')!;
    const bars = Array.from(player.querySelectorAll<HTMLDivElement>('.bar'));
    const state: PlayerState = {
      audio, playBtn, playIcon, bars, waveform,
      rafId: 0, needsReset: false, hasEverPlayed: false,
    };
    players.push(state);

    function paintProgress() {
      if (!audio.duration || isNaN(audio.duration)) return;
      const ratio = Math.min(1, Math.max(0, audio.currentTime / audio.duration));
      const playedCount = Math.floor(ratio * bars.length);
      bars.forEach((b, i) => b.classList.toggle('played', i < playedCount));
    }
    function tick() {
      paintProgress();
      state.rafId = requestAnimationFrame(tick);
    }
    function startTick() {
      cancelAnimationFrame(state.rafId);
      state.rafId = requestAnimationFrame(tick);
    }
    function stopTick() {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
    function flashFault() {
      playBtn.classList.remove('fault');
      // force reflow so the animation restarts on rapid repeat
      void playBtn.offsetWidth;
      playBtn.classList.add('fault');
      window.setTimeout(() => playBtn.classList.remove('fault'), 600);
    }

    audio.addEventListener('play',  () => {
      state.hasEverPlayed = true;
      state.needsReset = false;
      playIcon.className = 'ph-fill ph-pause';
      startTick();
    });
    audio.addEventListener('pause', () => { playIcon.className = 'ph-fill ph-play'; stopTick(); });
    audio.addEventListener('ended', () => {
      playIcon.className = 'ph-fill ph-play';
      stopTick();
      bars.forEach((b) => b.classList.remove('played'));
      audio.currentTime = 0;
    });
    audio.addEventListener('error',   () => { state.needsReset = true; });
    audio.addEventListener('stalled', () => { state.needsReset = true; });
    audio.addEventListener('abort',   () => { state.needsReset = true; });
    audio.addEventListener('timeupdate',     paintProgress);
    audio.addEventListener('seeked',         paintProgress);
    audio.addEventListener('loadedmetadata', paintProgress);

    playBtn.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      try {
        if (isStale(audio, state.needsReset)) {
          audio.load();           // resets internal state machine
          state.needsReset = false;
        }
        await audio.play();
      } catch {
        state.needsReset = true;  // next click will reload
        playIcon.className = 'ph-fill ph-play';
        flashFault();
      }
    });

    waveform.addEventListener('click', (e) => {
      if (!audio.duration || isNaN(audio.duration)) return;
      const rect = waveform.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, ((e as MouseEvent).clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
      paintProgress();
    });
  }

  // After backgrounding / device sleep / bfcache restore, mark every player
  // that has played at least once and is currently paused as needing a reset
  // before the NEXT play attempt. We don't reset eagerly — we reset lazily on
  // the next click so we don't fight a player the user is currently using.
  function flagAllForReset() {
    for (const p of players) {
      if (p.hasEverPlayed && p.audio.paused) p.needsReset = true;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flagAllForReset();
  });
  window.addEventListener('pageshow', flagAllForReset);
</script>
```

- [ ] **Step 3: Add the `.fault` pulse animation to the existing `<style>` block**

In the same file's `<style>` block, append (after the existing `.bar.played` rule):

```css
  @keyframes sm-fault-pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(0.9); box-shadow: 0 0 0 4px rgba(184, 90, 106, 0.35); }
  }
  .play.fault { animation: sm-fault-pulse 0.6s var(--ease, ease) 1; }
  @media (prefers-reduced-motion: reduce) {
    .play.fault { animation: none; outline: 2px solid var(--np-rose); outline-offset: 2px; }
  }
```

- [ ] **Step 4: Verify the build still type-checks**

Run from the repo root:

```bash
pnpm exec astro check
```

Expected: no new errors. (Pre-existing warnings unrelated to AudioCard are fine — note the count and confirm it didn't grow.)

- [ ] **Step 5: Manual verification in dev**

Run `pnpm dev` and open `http://localhost:4321` in a browser.

1. Find an audio post on the index. Click play. Confirm icon flips to pause and waveform fills.
2. Click pause. Confirm icon flips back.
3. Let a clip play to completion. Confirm it resets and can be replayed.
4. Open DevTools → Application → set "Bypass cache" then throttle network to "Offline". Reload the page. Try to play. Expected: nothing plays AND the play button briefly pulses with a rose outline (the `.fault` animation). Restore network.
5. Background the tab for ~30s, return, click play. Expected: it plays. (Without the fix, this is the failure mode the user reported.)

- [ ] **Step 6: Commit**

```bash
git add src/components/post-types/AudioCard.astro
git commit -m "fix(audio): recover from backgrounding & errors; show visible fault pulse"
```

---

## Task 2: Add `--accent-text` token

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Add the token to both theme blocks**

In `src/styles/tokens.css`, add `--accent-text: #B8A4D6;` to the `:root` block (right after `--accent-cool: var(--np-moss);` on line 21) and add `--accent-text: #3D2A55;` to the `:root[data-theme='light']` block (after the `--inset-sheen` line, before the shadows).

After the edit, the dark block contains:

```css
  --accent:        var(--np-amethyst);
  --accent-warm:   var(--np-rose);
  --accent-cool:   var(--np-moss);
  --accent-text:   #B8A4D6;
```

And the light block contains (after `--inset-sheen`):

```css
  --inset-sheen:   rgba(42, 30, 52, 0.04);
  --accent-text:   #3D2A55;
  --shadow-card:
    ...
```

- [ ] **Step 2: Verify contrast targets**

Open https://webaim.org/resources/contrastchecker/ in a browser. Check:
- Foreground `#B8A4D6` on background `#0F0F14` — expected ≥ 7:1 (AAA at small text).
- Foreground `#3D2A55` on background `#E8E4DF` — expected ≥ 7:1.

If either fails, adjust the hex one step in the appropriate direction (lighter for dark theme, darker for light theme) and re-check. Do not proceed with values that fail AA.

- [ ] **Step 3: Build sanity check**

```bash
pnpm exec astro check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(theme): add --accent-text token for high-contrast small purple text"
```

---

## Task 3: Sweep `--accent` → `--accent-text` on small uppercase / meta text

**Files (modify; only the specific selectors listed below — leave all other `--accent` usages alone):**
- `src/components/ui/Eyebrow.astro` — `color` rule.
- `src/components/ui/MetaRow.astro` — `.row` `color` rule (NOT the `.dot` background — it stays `--accent`).
- `src/components/sidebar/Noticing.astro` — `.label color` (NOT `.label::before` background) and `.src color`.
- `src/components/sidebar/OnHerDesk.astro` — `.label color` (NOT `.label::before`) and `.meta color`.
- `src/components/sidebar/IssueCounter.astro` — `.label color` and `.season color` (NOT `.fill background` and NOT `.num color` — keep those as-is).
- `src/components/post-types/AudioCard.astro` — `.dur color` only (NOT `.play background`, NOT `.bar.played background`).
- `src/components/post-types/LinkCard.astro` — `.source color` only (NOT `.arrow color`).
- `src/components/post-types/EssayCard.astro` — `.readtime color` only.
- `src/components/post-permalinks/AudioPage.astro` — `.transcript summary color` only.
- `src/components/layout/Nav.astro` — `.nav-link:hover, .nav-link.active color` only (NOT `.wordmark__dot color`).
- `src/pages/work/index.astro` — every `color: var(--accent)` inside small uppercase or meta context: `.eyebrow-rule color`, `.eyebrow-rule > span:first-child/last-child background`, `.section-label color`, `.cta` border + bg references stay (CTA is interactive — keep `--accent`), `.services .card i` icon color stays. Specifically swap: `.eyebrow-rule color`, `.eyebrow-rule > span background`, `.section-label color`, `.form-fallback a color`, `.form-fallback a border-bottom color`. (Leave `.hed em.amp color`, `.cta color`/border, `.form button background`, `.services .card i color` as `--accent` — those are large or interactive.)
- `src/pages/work/portfolio/index.astro` — `.meta color` only.

- [ ] **Step 1: Make the swaps file by file**

For each file listed above, edit ONLY the selectors specified — do not touch other `var(--accent)` references in the same file. Use the Edit tool with surrounding context to make the match unique.

Example edit for `src/components/ui/MetaRow.astro` (the `.row` color rule, which currently lives at line ~19):

```
old: '    color: var(--accent);'
new: '    color: var(--accent-text);'
```

But provide enough surrounding lines to disambiguate from the `.dot` rule below it.

- [ ] **Step 2: Sanity-check no over-replacement**

Run from repo root:

```bash
git diff --stat
git diff -- src/styles
```

Expected: `src/styles/tokens.css` should NOT appear in this diff (was committed in Task 2). Only `.astro` files modified. No file should have more swaps than its bullet above lists.

- [ ] **Step 3: Visual verification**

Run `pnpm dev`. Walk through:
1. Index — confirm eyebrow ("ISSUE 5 · 2026") and meta rows on cards read more clearly than before in dark mode.
2. Toggle to light theme via the candle. Confirm small purple text now reads as deep plum, clearly legible on the bone bg.
3. Open an audio post permalink — confirm "VOICE MEMO" eyebrow and `dur` text both look right.
4. Open `/work/` — confirm "FOR BRANDS DONE PERFORMING", "WHAT WE DO", "IS THIS FOR YOU?" eyebrows look correct in both themes.
5. Open `/work/portfolio/` — confirm year/category meta on each case-study card looks right.

- [ ] **Step 4: Commit**

```bash
git add src/components src/pages
git commit -m "fix(contrast): use --accent-text for small uppercase purple text in both themes"
```

---

## Task 4: Back-to-journal link on every permalink

**Files:**
- Create: `src/components/post-permalinks/BackToJournal.astro`
- Modify: `src/pages/journal/[...slug].astro`

- [ ] **Step 1: Create the BackToJournal component**

Write `src/components/post-permalinks/BackToJournal.astro`:

```astro
---
// Small "← Back to journal" link rendered above every post permalink.
// Plain href, not history.back(), because users may arrive via direct link,
// RSS, or share URL.
---
<a href="/" class="back-to-journal">
  <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
  <span>Back to journal</span>
</a>
<style>
  .back-to-journal {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fs-meta);
    letter-spacing: var(--tracking-meta);
    text-transform: uppercase;
    color: var(--accent-text);
    margin: 32px 0 8px;
    padding: 6px 0;
    opacity: 0.85;
    transition: opacity var(--t-fast) var(--ease), transform var(--t-fast) var(--ease);
  }
  .back-to-journal:hover { opacity: 1; transform: translateX(-2px); }
  .back-to-journal i { font-size: 12px; }
</style>
```

- [ ] **Step 2: Render it inside the page wrap**

In `src/pages/journal/[...slug].astro`, import the component and render it as the first child of `.page-wrap`:

After existing imports add:

```astro
import BackToJournal from '~/components/post-permalinks/BackToJournal.astro';
```

Inside `<div class="page-wrap">` (currently lines 30-37), add `<BackToJournal />` as the first element:

```astro
<div class="page-wrap">
  <BackToJournal />
  {post.data.type === 'essay' && <EssayPage post={post} />}
  ...
</div>
```

- [ ] **Step 3: Build check**

```bash
pnpm exec astro check
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `pnpm dev`, click into a note post (and one of each other type for spot-check). Confirm:
1. The "← Back to journal" link appears above the post body.
2. Clicking it returns to `/`.
3. Hover state nudges the link left and increases opacity.
4. Spacing looks right above each permalink type (essay, note, quote, link, photo, audio).

- [ ] **Step 5: Commit**

```bash
git add src/components/post-permalinks/BackToJournal.astro src/pages/journal/[...slug].astro
git commit -m "feat(permalink): add back-to-journal link above every post"
```

---

## Task 5: Portfolio link in nav

**Files:**
- Modify: `src/components/layout/Nav.astro`

- [ ] **Step 1: Add Portfolio link between Work and About**

Edit `src/components/layout/Nav.astro`. In the `<div class="nav-links">` block, between the existing Work and About links, insert:

```astro
<a href="/work/portfolio/" class:list={['nav-link', { active: isActive('/work/portfolio') }]}>Portfolio</a>
```

So the resulting `nav-links` div looks like:

```astro
<div class="nav-links">
  <a href="/" class:list={['nav-link', { active: pathname === '/' }]}>Journal</a>
  <a href="/work/" class:list={['nav-link', { active: isActive('/work') && !isActive('/work/portfolio') }]}>Work</a>
  <a href="/work/portfolio/" class:list={['nav-link', { active: isActive('/work/portfolio') }]}>Portfolio</a>
  <a href="/about/" class:list={['nav-link', { active: isActive('/about') }]}>About</a>
  <ThemeToggle />
</div>
```

Note the `Work` link's active condition is tightened so Work isn't highlighted when the user is on `/work/portfolio/`.

- [ ] **Step 2: Manual verification**

Run `pnpm dev`. Confirm:
1. Nav shows Journal · Work · Portfolio · About · candle.
2. On `/`, only Journal is highlighted.
3. On `/work/`, only Work is highlighted.
4. On `/work/portfolio/`, only Portfolio is highlighted.
5. On `/about/`, only About is highlighted.
6. Mobile (≤640px): nav still wraps cleanly, no overflow.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Nav.astro
git commit -m "feat(nav): expose portfolio in main nav"
```

---

## Task 6: "Selected work" teaser on /work/

**Files:**
- Modify: `src/pages/work/index.astro`

- [ ] **Step 1: Import the portfolio collection at the top of the page**

In `src/pages/work/index.astro`'s frontmatter (currently lines 1-4), add the collection import and pull the top 3 entries:

```astro
---
import Base from '~/layouts/Base.astro';
import { getCollection } from 'astro:content';
const formspree = import.meta.env.PUBLIC_FORMSPREE_ENDPOINT || '';
const allCases = await getCollection('portfolio');
const cases = allCases
  .sort((a, b) => (a.data.order - b.data.order) || (b.data.year - a.data.year))
  .slice(0, 3);
---
```

- [ ] **Step 2: Add the teaser section above the contact form**

In the same file, immediately above the `<section class="contact" id="contact">` block, insert:

```astro
  <section class="selected-work">
    <div class="section-label"><span>✦</span><span>Selected work</span><span>✦</span></div>
    <div class="tiles">
      {cases.map((c) => {
        const styleStr = c.data.image
          ? `background-image:url(${c.data.image});background-size:cover;background-position:center;`
          : 'background:linear-gradient(135deg,var(--np-rose),var(--np-amethyst));';
        return (
          <div class="tile">
            <div class="tile-img" style={styleStr}></div>
            <div class="tile-meta">
              <div class="tile-year">{c.data.year}</div>
              <div class="tile-name serif-italic">{c.data.name}</div>
            </div>
          </div>
        );
      })}
    </div>
    <div class="see-all">
      <a href="/work/portfolio/" class="see-all-link">See all work <i class="ph-duotone ph-arrow-right"></i></a>
    </div>
  </section>
```

- [ ] **Step 3: Add the section's styles to the existing `<style>` block**

Append inside the existing `<style>` block (before the closing `</style>`):

```css
  .selected-work { padding: 64px 56px; border-top: 1px dashed var(--border-dashed); }
  .selected-work .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 900px; margin: 0 auto 28px; }
  .tile { border-radius: var(--r-md); overflow: hidden; border: 1px solid var(--border-soft); background: rgba(15,15,20,0.5); }
  :root[data-theme='light'] .tile { background: rgba(232,228,223,0.5); }
  .tile-img { height: 140px; }
  .tile-meta { padding: 12px 14px 14px; }
  .tile-year { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent-text); margin-bottom: 4px; }
  .tile-name { font-size: 16px; line-height: 1.25; color: var(--fg); }
  .see-all { text-align: center; }
  .see-all-link { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent-text); border-bottom: 1px dotted var(--accent-text); padding-bottom: 2px; }
  .see-all-link i { font-size: 14px; }
  @media (max-width: 760px) {
    .selected-work { padding-left: 20px; padding-right: 20px; }
    .selected-work .tiles { grid-template-columns: 1fr; gap: 16px; }
  }
```

- [ ] **Step 4: Manual verification**

Run `pnpm dev`, open `/work/`. Confirm:
1. New "Selected work" section appears above the contact form.
2. Three tiles render with images (or amethyst gradients if a case lacks an image).
3. "See all work →" link below tiles routes to `/work/portfolio/`.
4. Mobile: tiles stack to a single column.
5. Toggle theme — tiles invert correctly.

- [ ] **Step 5: Commit**

```bash
git add src/pages/work/index.astro
git commit -m "feat(work): add selected-work teaser linking to portfolio"
```

---

## Task 7: Candle flame nudge

**Files:**
- Modify: `src/styles/candle.css`

- [ ] **Step 1: Adjust the flame `top` offset**

In `src/styles/candle.css`, change the `.candle__flame` rule's `top: -8px;` to `top: -5px;`.

The full rule afterward:

```css
.candle__flame {
  position: absolute;
  left: 50%; top: -5px;
  transform: translateX(-50%);
  width: 5px; height: 9px;
  background: radial-gradient(ellipse at 50% 80%, #fff4c8 0%, #ffe27a 35%, #ff9a55 70%, transparent 90%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  filter: blur(0.3px);
  box-shadow: var(--glow-flame);
  animation: flicker 2.6s ease-in-out infinite;
  opacity: 1;
  transition: opacity var(--t-med) var(--ease);
}
```

- [ ] **Step 2: Manual verification**

Run `pnpm dev`. With dark theme active, look at the candle in the nav. Confirm:
1. The flame's top now sits inside the circular boundary on first render.
2. The flame still flickers (animation intact).
3. Toggle to light — wisp animation still rises through where the flame was.
4. If the flame still pokes above the circle, drop another 1–2px (`top: -3px` or `top: -2px`). If it now sits too low and looks detached from the wick, raise to `top: -6px`. Aim for the flame's brightest core (~80% down inside the gradient) to be ~3px above the circle's center.

- [ ] **Step 3: Commit**

```bash
git add src/styles/candle.css
git commit -m "fix(candle): keep flame inside the circular toggle boundary"
```

---

## Task 8: TinaCMS themed admin skin

**Files:**
- Create: `public/admin-theme.css`
- Modify: `tina/config.ts` (extend the existing `cmsCallback`)

- [ ] **Step 1: Create the admin theme stylesheet**

Write `public/admin-theme.css`:

```css
/* Studio Marginalia — TinaCMS admin theme.
 * Loaded at admin boot via tina/config.ts cmsCallback.
 * Selectors target Tina's stable class prefixes (tina-, sidebar-, etc.).
 * If Tina's internals shift in a future version, the public site is unaffected
 * — this stylesheet only restyles /admin/. */

:root {
  --sm-bg:        #2A1E34;
  --sm-bg-soft:   #3a2c46;
  --sm-fg:        #E8E4DF;
  --sm-fg-soft:   #c9c1bb;
  --sm-accent:    #B8A4D6;
  --sm-accent-fill: #6E5A8A;
  --sm-rose:      #b85a6a;
  --sm-moss:      #5F7A6C;
  --sm-edge:      rgba(232, 228, 223, 0.10);
  --sm-radius:    10px;
  --sm-serif:     'Fraunces Variable', Georgia, serif;
}

/* No @font-face declaration — Tina's admin SPA already loads its own font
 * stack and we don't have Fraunces files in /public/. The serif rules below
 * fall through to Georgia (the second name in the stack), which is the
 * intended graceful degradation. If we later host Fraunces locally we can
 * add a single @font-face here without touching anything else. */

/* ---- App chrome ---- */
html, body, #root, .tina-tailwind {
  background: var(--sm-bg) !important;
  color: var(--sm-fg);
  font-family: 'Inter Variable', system-ui, -apple-system, sans-serif;
}

/* ---- Headings ---- */
h1, h2, h3, h4, .tina-tailwind h1, .tina-tailwind h2, .tina-tailwind h3 {
  font-family: var(--sm-serif);
  font-style: italic;
  font-variation-settings: 'SOFT' 100, 'opsz' 144;
  font-weight: 400;
  color: var(--sm-fg);
}

/* ---- Sidebar ---- */
[class*="sidebar"], [class*="Sidebar"] {
  background: var(--sm-bg) !important;
  border-right: 1px solid var(--sm-edge) !important;
}
[class*="sidebar"] a, [class*="Sidebar"] a {
  color: var(--sm-fg-soft);
}
[class*="sidebar"] a:hover, [class*="sidebar"] a[aria-selected="true"] {
  color: var(--sm-accent);
}

/* ---- Inputs ---- */
input[type="text"], input[type="number"], input[type="search"],
textarea, select, .tina-tailwind input, .tina-tailwind textarea, .tina-tailwind select {
  background: rgba(232, 228, 223, 0.04) !important;
  border: 1px solid var(--sm-edge) !important;
  border-radius: var(--sm-radius) !important;
  color: var(--sm-fg) !important;
  font-family: inherit;
}
input:focus, textarea:focus, select:focus {
  outline: 2px solid var(--sm-accent-fill) !important;
  outline-offset: 1px;
}

/* ---- Buttons ---- */
button[type="submit"], .tina-tailwind button[type="submit"] {
  background: var(--sm-accent-fill) !important;
  color: #0F0F14 !important;
  border-radius: 999px !important;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 11px;
  box-shadow: 0 0 18px rgba(110,90,138,0.4);
}
button[type="submit"]:hover { background: #8770a8 !important; }

/* ---- Save bar / footer / toolbars ---- */
[class*="toolbar"], [class*="Toolbar"], [class*="footer"], [class*="Footer"] {
  background: var(--sm-bg-soft) !important;
  border-top: 1px solid var(--sm-edge) !important;
}

/* ---- Cards / list rows ---- */
[class*="card"], [class*="Card"], [class*="row"], [class*="Row"] {
  background: rgba(110, 90, 138, 0.08);
  border: 1px solid var(--sm-edge);
  border-radius: var(--sm-radius);
}
[class*="card"]:hover, [class*="Card"]:hover {
  border-color: var(--sm-accent-fill);
}

/* ---- Field labels ---- */
label, .tina-tailwind label {
  color: var(--sm-fg-soft) !important;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* ---- Existing deploy banner is fine — leave it alone ---- */
#sm-deploy-banner { /* untouched */ }
```

- [ ] **Step 2: Inject the stylesheet at admin boot via cmsCallback**

In `tina/config.ts`, locate the existing `cmsCallback: (cms) => { ... }` (around line ~32). At the very top of the function body — right after the `if ((window as any).__smDeployBannerInit) return cms;` early-return — add:

```ts
    // Inject site-themed admin stylesheet exactly once.
    if (!document.getElementById('sm-admin-theme')) {
      const link = document.createElement('link');
      link.id = 'sm-admin-theme';
      link.rel = 'stylesheet';
      link.href = '/admin-theme.css';
      document.head.appendChild(link);
    }
```

So the top of the callback now reads:

```ts
  cmsCallback: (cms) => {
    if (typeof window === 'undefined') return cms;
    if ((window as any).__smDeployBannerInit) return cms;
    (window as any).__smDeployBannerInit = true;

    // Inject site-themed admin stylesheet exactly once.
    if (!document.getElementById('sm-admin-theme')) {
      const link = document.createElement('link');
      link.id = 'sm-admin-theme';
      link.rel = 'stylesheet';
      link.href = '/admin-theme.css';
      document.head.appendChild(link);
    }

    const ID = 'sm-deploy-banner';
    // ...
```

- [ ] **Step 3: Build the admin SPA locally**

```bash
pnpm exec tinacms build --skip-cloud-checks
```

Expected: build succeeds, `public/admin/index.html` exists.

- [ ] **Step 4: Manual verification**

Run `pnpm dev` (which starts both Tina and Astro). Open `http://localhost:4321/admin/index.html` in a browser. Log in. Confirm:
1. Background is plum, not white.
2. Headings are Fraunces italic.
3. Inputs have the dark themed bg with bone text.
4. Save button is amethyst, pill-shaped, uppercase.
5. Sidebar entries (Posts, Portfolio, Now, Noticing, Site) read in bone, hover/active in lifted amethyst.
6. The existing deploy banner (bottom-right) still appears and styles itself separately — confirm it isn't broken by our overrides.

If a particular Tina UI region didn't pick up the theme, inspect its DOM in DevTools, find a stable class, and add a targeted rule. Limit additions to within `public/admin-theme.css` — don't sprinkle theme code into `tina/config.ts`.

- [ ] **Step 5: Failure-safety check**

Temporarily rename `public/admin-theme.css` to `public/admin-theme.css.bak`, reload the admin page. Expected: admin still functional (just unthemed) — no JS errors, no broken layout. Restore the filename.

```bash
mv public/admin-theme.css.bak public/admin-theme.css
```

This proves the theme is purely additive and a missing CSS file (e.g., a CDN miss) doesn't break the admin.

- [ ] **Step 6: Commit**

```bash
git add public/admin-theme.css tina/config.ts
git commit -m "feat(admin): site-themed Tina admin skin (cmsCallback link injection)"
```

---

## Final verification

- [ ] **Step 1: Full local build**

```bash
pnpm build
```

Expected: clean build of both Tina and Astro. Note any warnings; only investigate ones introduced by these changes.

- [ ] **Step 2: Smoke test the built dist**

```bash
pnpm preview
```

Open `http://localhost:4321/`. Walk through:
1. Index renders, sidebar widgets read clearly.
2. Open an audio post — playback works, can replay.
3. Open a note post — back-to-journal link visible at top.
4. Click portfolio in nav — page renders with 4 entries.
5. `/work/` page — selected-work teaser renders with 3 tiles + see-all link.
6. Toggle theme via candle — flame stays inside circle.
7. `/admin/index.html` — themed.

- [ ] **Step 3: Push**

```bash
git push origin main
```

Watch the deploy banner (or GitHub Actions tab) for ~60-100s. On success the live site updates atomically. On failure the previous deploy keeps serving — diagnose and follow up.
