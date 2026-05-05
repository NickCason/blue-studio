# Studio Marginalia — Polish Punch List (Design Spec)

**Date:** 2026-05-05
**Status:** Approved, ready for plan
**Scope:** Six discrete UX/UI improvements to the live site. No new features, no schema changes, no deploy infrastructure changes.

## Context

Site is live at https://studio-marginalia.pages.dev. Repo is `NickCason/studio-marginalia`. Stack is Astro 5 + TinaCMS + Cloudflare Pages. This spec covers a punch list surfaced after a few days of real use.

## Items

### 1. Audio playback resilience

**Problem.** Sometimes the audio play button doesn't respond — clicking does nothing, and a page refresh is required to recover. Symptom is intermittent and seems to follow tab backgrounding / device sleep.

**Root cause.** The `<Audio>` element silently enters an errored or HAVE_NOTHING state after backgrounding. The current click handler in `src/components/post-types/AudioCard.astro` calls `audio.play()` and silently swallows rejections in a `.catch` that only sets the icon to "play" — which it already was. From the user's perspective: nothing happened.

**Fix.** In `AudioCard.astro`'s `<script>`:

- On click, check for failure state before playing:
  - If `audio.error != null` OR `audio.readyState === 0` (HAVE_NOTHING) OR a `needs-reset` flag has been set, call `audio.load()` first, clear the flag, then call `audio.play()`.
- Add event listeners that mark the player as `needs-reset`:
  - `error`, `stalled`, `abort` on the audio element.
- Add document-level handlers that mark *all* paused-but-previously-played players as `needs-reset`:
  - `pageshow` (covers bfcache restore).
  - `visibilitychange` when `document.visibilityState === 'visible'`.
- If `audio.play()` rejects, briefly add a `.fault` class to the play button (one-shot pulse via CSS) so failures are no longer silent.

Behavior for healthy state is unchanged. Replay-after-end already works and stays as-is.

**Out of scope.** Cross-player coordination (playing one stops the other) — the user confirmed first/replay works. We are *not* adding it now.

### 2. Purple small-text contrast

**Problem.** Small uppercase purple text (eyebrows, meta rows, audio durations, section labels) blends into the dark plum bg in dark mode and isn't dark enough on the light bone bg in light mode. Both sides fail the comfort threshold.

**Root cause.** `--accent` is `--np-amethyst` `#6E5A8A`, used for both fills and small text. Mid-purple at small sizes against either themed bg is borderline.

**Fix.** Introduce a new token `--accent-text` separate from `--accent`:

- **Dark theme:** lifted amethyst, target ≥ 7:1 against `--np-ink` (`#0F0F14`). Working value: `#B8A4D6`.
- **Light theme:** deepened plum, target ≥ 7:1 against `--np-bone` (`#E8E4DF`). Working value: `#3D2A55`.

Final hex values verified against WCAG AAA at 12px during implementation. Adjust if not hitting target.

**Sweep.** Replace `var(--accent)` → `var(--accent-text)` only on small uppercase / eyebrow / meta text. Keep `--accent` everywhere else (fills, borders, glows, large headlines, button bg).

Touched selectors (audit during implementation, this is the starting list):

- `.eyebrow` (global)
- `MetaRow` component
- `.dur` in `AudioCard.astro` (audio duration label)
- `.meta` strips in portfolio cards, work index
- `.section-label` in `pages/work/index.astro`
- `.nav-link.active` and `.nav-link:hover` in `Nav.astro`
- Footer eyebrow / rule labels
- Any other small-purple text found during the sweep

### 3. Candle flame nudge

**Problem.** The flame on the candle theme-toggle button protrudes above the top of the circular boundary in the dark (lit) state.

**Fix.** In `src/styles/candle.css`, change `.candle__flame { top: -8px; }` to `top: -5px` (or whatever value keeps the flame's visible top within the 36×36 circle — verified visually). Keep stick height and smoke wisp positioning unchanged unless a follow-on visual issue appears; if so, shift stick down by the same delta to preserve the wick-tip / flame-base alignment.

### 4. TinaCMS themed skin

**Problem.** TinaCMS admin UI looks generic — doesn't share the site's identity (Fraunces, plum/amethyst palette).

**Fix.** Themed skin (CSS-only — no custom field components):

- New file `tina/admin.css` containing:
  - Background, surface, text custom properties matching site (`--np-plum` bg, `--np-bone` text, `--np-amethyst` accents).
  - Fraunces Variable for h1–h4 and form labels (italic on the SOFT axis on top-level headings, matching site signature).
  - Restyled inputs, buttons, save bar, sidebar tabs, list rows, card hover states. Goal: feels like the site without being identical.
- Inject into the Tina admin SPA. **Method TBD by inspection during implementation:**
  - Preferred: a config-time injection point in the installed Tina version (e.g. a `cmsCallback`, `ui.previewSrc`, or supported branding hook).
  - Fallback: a post-build script `scripts/theme-tina.mjs` that runs after `tinacms build` and appends `<link rel="stylesheet" href="/admin-theme.css">` to `public/admin/index.html`. The CSS file lives in `public/admin-theme.css`.
- Wire whichever path works into the existing `.github/workflows/deploy.yml` step that builds Tina.

**Failure mode.** If the post-build script crashes the build, the deploy fails atomically and the previous deploy keeps serving — no public outage. Build failure is loud (CI red, banner shows fail) and we revert. Risk is bounded.

**Out of scope.** Custom field components (`ui.component`). The user explicitly chose option (b) — skin only.

### 5. Permalink back-link

**Problem.** Once a note (or any) post permalink is open, the only way to leave is the wordmark, browser back, or refresh. There's no in-page "close" affordance.

**Fix.** New component `src/components/post-permalinks/BackToJournal.astro`:

- Renders `← Back to journal` as a small uppercase eyebrow-styled link.
- Plain `<a href="/">` — not `history.back()`, because users may arrive via direct link, RSS, or shared URL.
- Styled with `--accent-text` (post-#2), tracking `var(--tracking-meta)`, font-size `var(--fs-meta)`.

Placed inside `src/pages/journal/[...slug].astro` above the type-switch (`<div class="page-wrap">`), so all six permalink types get it for free. Spacing: ~24px above first content row.

### 6. Portfolio reintegration

**Problem.** A `/work/portfolio/` page exists and renders 4 case-study entries from `src/content/portfolio/`, but nothing links to it. It's effectively hidden.

**Fix.**

- **Nav** (`src/components/layout/Nav.astro`): insert a "Portfolio" link between "Work" and "About". Use the existing `nav-link` styling. `isActive('/work/portfolio')` should highlight it (and Work too — that's existing behavior, fine for now).
- **Work index** (`src/pages/work/index.astro`): add a "Selected work" teaser section above the contact form. Pulls 3 entries from the `portfolio` collection (sorted by `order` then `year`), shows each as a thumbnail tile (image with name + year overlay), links to `/work/portfolio/` (one CTA — "See all work →"). Tiles themselves are not individual links since portfolio entries don't have detail pages yet.
- **Tina admin**: confirm the `portfolio` collection is exposed in the admin sidebar (config inspection showed it is at `tina/config.ts:291` — verify visually).

No schema changes. Existing 4 entries (`bramblewood-books`, `florae`, `hadley-and-crumb`, `lowercase-coffee`) already render correctly.

## Implementation order

Smallest blast radius first, weighted by user-visible impact. Token addition precedes the back-link because the back-link uses `--accent-text`.

1. Audio playback fix (highest impact bug, contained to one file).
2. `--accent-text` token + sweep (additive token, mechanical replacements).
3. Back-link component (small new file + 1 line in `[...slug].astro`, uses `--accent-text`).
4. Portfolio nav + work-index teaser (additive, no removals).
5. Candle flame nudge (1 line CSS).
6. Tina themed skin (largest scope, most failure-mode risk — last so the rest is shipped first).

## Risk & uptime

- All changes deploy via the existing GitHub Actions → Cloudflare Pages flow. Cloudflare Pages does atomic swaps; failed builds keep the previous deploy live. **Public site cannot go down from a bad commit.**
- Item #4 has the highest break risk and is isolated to admin (Nina-only, brief impact, easy revert).
- All other items are pure additive or in-place CSS/JS edits with no schema or infra impact.

## Out of scope

- Cross-player audio coordination.
- Portfolio detail pages.
- Tina custom field components.
- Restructuring nav (e.g. Work as parent of Portfolio + Services).
- Any content edits.
