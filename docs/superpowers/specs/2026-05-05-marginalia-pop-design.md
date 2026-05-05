# Studio Marginalia — Pop Pass (Design Spec)

**Date:** 2026-05-05
**Status:** Approved pending review, ready for plan
**Scope:** Seven additive enhancements to deepen interactivity and visual identity across the site. No schema changes (the existing `tags` field is being surfaced for the first time, but it already exists). No infrastructure changes.

## Context

The polish punch list shipped earlier today (resilient audio, contrast, candle, back-link, portfolio reintegration, Tina theming). This second pass adds interactivity and identity in spots where the site currently reads as static text-and-image. Same atomic-deploy guarantees apply — Cloudflare Pages won't go dark from a bad commit.

## Items

### A. Portfolio detail pages

**Problem.** `/work/portfolio/` shows four case-study cards. Each `.md` entry has authored body content (e.g. Florae's *"We rewrote the brand around what the routine feels like…"*) but the body is never rendered. Tiles aren't even links.

**Fix.** Generate a detail page per portfolio entry at `/work/portfolio/<slug>/`:

- New route `src/pages/work/portfolio/[slug].astro` using `getStaticPaths` over the `portfolio` collection.
- Layout: hero image (50–60vh, full-bleed), then a 64ch column with name (Fraunces italic h1), eyebrow meta (year · service category · client), the pitch as a sub-deck, then the markdown body as `<Content />`. Bottom: "Selected work" siblings nav (prev / next / back to all).
- `/work/portfolio/index.astro` tiles become `<a>` elements pointing to the detail pages. The `externalUrl` field, where present, becomes a "Visit live →" link inside the detail page (NOT a hijacker on the tile).
- The `/work/` teaser tiles (3-tile teaser added today) similarly become `<a>` elements pointing to detail pages.

**Out of scope.** No prev/next polish (just simple links). No related-work suggestions.

### 1. Photo lightbox

**Problem.** Photo posts in the journal feed and on photo permalinks display at column width with no zoom affordance. Clicking a card navigates to a permalink that's mostly the same image again.

**Fix.** Click a `.photo-card img` (and `.photo-perma img`) → opens a fullscreen lightbox overlay:

- Black bg with 88% opacity, photo centered at `max-width: 92vw, max-height: 88vh, object-fit: contain`.
- Caption (if present) renders in serif italic below the photo, on `--bg`-tinted strip.
- Close affordances: `Esc` key, click on backdrop, small ✕ button top-right.
- Arrow keys + small left/right chevrons to step through OTHER photo posts on the same page (works on the feed; on permalinks where there's only one photo, chevrons hide).
- Mobile: swipe left/right to step; tap to close.
- On open: scroll-lock body, trap focus inside lightbox; on close: restore focus to triggering element.
- `prefers-reduced-motion` disables the open/close fade transition.

Implementation: a single `<PhotoLightbox.astro>` component included in `Base.astro` so it lives on every page. Inline `<script>` with `astro:page-load` rebind pattern. Photos opt-in via `data-photo-lightbox` attribute on `<img>` elements added inside `PhotoCard.astro` and `PhotoPage.astro`.

**Out of scope.** Pinch-to-zoom inside the lightbox. Slideshow mode.

### 2. Portfolio tile hover

**Problem.** Tiles on `/work/portfolio/` (and the new teaser on `/work/`) are visually dead — no hover state, even when they become links (item A).

**Fix.** On hover (any device with a real pointer):

- Tile lifts 4px (`translateY(-4px)`).
- Image inside scales `1.04` over 500ms `var(--ease)`.
- Amethyst glow shadow (`0 18px 40px -12px rgba(110, 90, 138, 0.45)`).
- Tiny "→" arrow pip slides in from the right edge of the meta strip; on rest, it sits at the right but at 0.4 opacity.
- Hover is suppressed by `@media (hover: none)` so touch devices don't get a stuck hover state.

Single set of styles in `/work/portfolio/index.astro` and the teaser block in `/work/index.astro`. Same affordance, both places.

### 3. Tags + tag-filter view

**Problem.** Posts already have `tags: string[]` in the schema. Nothing surfaces them.

**Fix.** Three pieces:

- **Pill component** `src/components/ui/Tag.astro`: small uppercase tracking pill, `--accent-text` color, dotted bottom border, hover state. Renders one tag.
- **Render tags below the meta row** on essay, link, photo, and audio cards (skip note + quote — keep them sparse). Same on the corresponding permalinks above the post body. If `tags` is missing or empty, render nothing.
- **Filter route** `src/pages/journal/tag/[tag].astro` using `getStaticPaths` over the union of all tags found in `posts`. Page renders the standard journal feed but filtered to posts containing that tag, with a header `"Tagged: <tag>"` and a back link.
- Slugify tags for URLs (`brand voice` → `brand-voice`). Display the original (titled) form in the pill text.

**Tag content.** All five existing posts already carry tags (taxonomy in use: `meta`, `build`, `gift`, `design`, `craft`). No backfill needed — item #3 just surfaces what's already authored. New posts will pick up tags via Tina's existing tags input.

**Out of scope.** Tag autocomplete in Tina. Tag aliasing. Multi-tag intersection (`?tag=a&tag=b`). Hierarchical tags. Per-tag RSS feeds.

### 5. Quote / note card visual upgrade

**Problem.** `QuoteCard` and `NoteCard` (and their permalinks) read as modestly-styled boxes. The feed mixes them with essays/audio/photos and they currently blend in instead of providing punctuation.

**Fix.**

- **NoteCard:** strip to body-only. Wider air around it. Body text in Fraunces italic at ~1.25rem (currently it's smaller and serif but uses the same scale as essay decks). Centered. Light dotted top + bottom rule (single hairline, `--rule-dotted`) framing the note. Date eyebrow above, no card border, no background tint — let it breathe.
- **NotePage:** same treatment, larger size (`clamp(1.5rem, 3vw, 2.25rem)` already in place — keep), but adopt the dotted-rule frame.
- **QuoteCard:** render the quote in large serif italic (`clamp(1.25rem, 2.5vw, 1.625rem)`). Above the quote, a single decorative `❝` glyph in `--accent-text` at 2× size. Source attribution becomes a quiet eyebrow line beneath, prefaced by an em-dash (`— Source name, italic linked if `sourceUrl`). Card itself remains modest (no heavy frame).
- **QuotePage:** same large-italic treatment, larger again, ornament glyph kept.

Rule: the upgrade should make notes & quotes feel like punctuation in the feed's rhythm — moments to slow down — rather than additional cards demanding attention.

### 8. Scroll-reveal on journal feed

**Problem.** The journal feed paints all cards instantly on load. There's no visual breath as you scroll — feels like a list, not a scroll experience.

**Fix.** Each card in `.feed` fades in (`opacity: 0 → 1`) and rises 8px as it enters the viewport, staggered by ~80ms relative to siblings already revealed. Uses `IntersectionObserver` for cheap visibility detection. Once revealed, the card stays revealed (no re-trigger on scroll up).

- Stagger only applies to cards revealed within the first 800ms after page load (so a long-scrolled feed doesn't have a 30-card stagger waterfall when the user lands deep). Cards revealed after that window get a 0ms delay individually as scrolled into view.
- `prefers-reduced-motion` disables the effect entirely (cards render at full opacity from frame 1).
- Reveal duration ~400ms, easing `var(--ease)`.

Implementation: small inline script in `src/pages/index.astro` (the journal feed page), bound on `astro:page-load`. Add `data-reveal` attribute on each card and a CSS class that handles the transition.

**Out of scope.** Scroll-reveal anywhere else (work page, portfolio, about). Keep the effect signature to the journal feed only.

### 11. OG image generation

**Problem.** Shared Studio Marginalia URLs (Slack, iMessage, X, etc.) currently surface no preview image — every link looks generic.

**Fix.** Generate a per-post Open Graph PNG at build time:

- Image dimensions: 1200×630 (canonical OG size).
- Layout: studio plum bg (`#2A1E34`), film-grain overlay at low opacity, the wordmark (`studio·marginalia` in Fraunces italic, dot in amethyst) top-left, the post title centered in Fraunces italic SOFT-100 at large size, a post-type badge (e.g. "ESSAY · 2026") bottom-left in eyebrow tracking. Subtle amethyst glow stage behind the title.
- For typed posts without titles (note, quote, photo, audio), use the post's first ~80 chars or caption / source as the rendered text.
- Use `satori` (JSX → SVG) + `sharp` (SVG → PNG) at build time. Render through a `src/pages/og/[slug].png.ts` endpoint with `getStaticPaths` over the `posts` collection so the PNG is emitted as a static asset (no runtime image generation on Cloudflare Pages). Inject `<meta property="og:image" content="/og/<slug>.png" />` and `<meta name="twitter:image" content="/og/<slug>.png" />` into `Base.astro` when a post slug is available; non-post pages get `/og-default.png`.
- One Fraunces Variable woff2 (italic axis-friendly cut) checked into `public/fonts/fraunces-italic.woff2` and loaded by the OG renderer. ~80kb. Public site continues using `@fontsource-variable/fraunces` as today; only the OG renderer reads from `public/fonts/`.
- A site-wide default OG image (`public/og-default.png`, generated once during this work) for non-post pages (homepage, about, work, portfolio).

**Out of scope.** Custom layouts per post type beyond title swapping. Multi-language. Animated OG (none of the targeted services support it anyway).

## Implementation order

Smallest blast radius first; visual-impact items late so they're shippable independently.

1. **A. Portfolio detail pages** — pure additive route, no shared code touched.
2. **3. Tags + filter route** — additive component + new route. Touches several cards but only adds rendering.
3. **2. Portfolio tile hover** — local CSS only.
4. **5. Quote/note upgrade** — touches `QuoteCard`, `NoteCard`, `QuotePage`, `NotePage`. Visual-only changes.
5. **1. Photo lightbox** — new component + small touches in `PhotoCard`, `PhotoPage`, `Base`. Most JS.
6. **8. Scroll-reveal** — small script + CSS in feed page.
7. **11. OG image generation** — last because it adds a runtime dependency (`satori`) and is the only step that touches the build output meaningfully.

## Risk & uptime

- All changes go via the existing GitHub Actions → Cloudflare Pages atomic-deploy flow.
- Item 11 (OG generation) is the riskiest: a `satori` rendering bug at build time would fail CI, but failed builds keep the prior deploy live. So uptime is preserved; worst case is "OG images don't update."
- Item 1 (lightbox) is the largest JS surface; we'll use the same `astro:page-load` rebind + teardown pattern established for the audio fix to play nicely with View Transitions.
- Items 2, 5, 8 are CSS-and-light-script — near-zero break risk.

## Out of scope (deferred)

- Pinch-zoom / slideshow modes in the lightbox.
- Per-tag RSS feeds.
- Custom OG layouts per post type beyond text swap.
- Tag aliasing or hierarchical tags.
- Threads view (`threadId` rendering) — flagged in earlier discussion; deferred to a later pass.
