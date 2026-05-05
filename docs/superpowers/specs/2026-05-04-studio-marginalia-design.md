# Studio Marginalia — Design Spec

**Date:** 2026-05-04
**Owner / writer:** Nina Pfeiffer
**Build:** Nick Cason
**Status:** Draft 1 — for review before plan

---

## 1. Purpose

A personal-first, business-adjacent website for Nina Pfeiffer — writer and marketing/digital-marketing pro. The site primarily exists as a place for Nina's writing (a Tumblr-style mixed feed of essays, notes, quotes, links, photos, and voice memos). A secondary, distinctly-styled track surfaces her client work (services + a portfolio of past campaigns) for prospective clients who land on the blog and want to know what she does professionally.

The codebase additionally functions as a portfolio piece for Nick — clean architecture, well-documented, idiomatic Astro, suitable to point at as a build sample. This shapes how we build but is invisible to public visitors.

The brand voice and visual treatment reject "influencer-perfect" / corporate-clean aesthetics. Target feel: lived-in, velvet, intentional, soft. A real human's site.

## 2. Brand

- **Name:** Studio Marginalia
- **Wordmark:** `studio·marginalia` set in Fraunces italic (lowercase, middle dot in amethyst/accent color)
- **Byline / person:** Nina Pfeiffer
- **One-line positioning (work side):** "Quiet marketing for the patient, and the patiently impatient."
- **Tone notes:** lived-in, soft, intentional, slightly literary; never twee, never "spell book," never influencer-perfect

## 3. Information Architecture

**Top nav (left → right):** wordmark · Journal · Threads* · Work · About · [theme toggle]

\* Threads link is hidden in v1 nav (deferred surface) but the route reservation is documented for v2.

### Page surfaces

| Path | Purpose | v1? |
|------|---------|-----|
| `/` | Journal homepage — Reading Room layout, unified feed + sidebar widgets | ✓ |
| `/journal/[slug]/` | Post permalinks (per-type templates) | ✓ |
| `/work/` | Work-with-me / hire-me page | ✓ |
| `/work/portfolio/` | Portfolio index of past client case studies | ✓ |
| `/work/portfolio/[slug]/` | Individual case study permalink | ✗ defer to v2 |
| `/about/` | About Nina | ✓ |
| `/threads/` | Thread series index | ✗ defer to v2 |
| `/threads/[slug]/` | Individual thread archive | ✗ defer to v2 |
| `/rss.xml` | RSS feed (full feed, all post types) | ✓ |
| `/sitemap.xml` | Sitemap (auto-generated) | ✓ |

## 4. Visual System

### Palette

```
--np-ink:      #0F0F14    (Midnight Ink — base background, dark mode)
--np-plum:     #2A1E34    (Velvet Plum — gradient companion to ink)
--np-amethyst: #6E5A8A    (Dusty Amethyst — primary accent, links, eyebrows)
--np-moss:     #5F7A6C    (Moss Green — secondary accent, "yes" affordances)
--np-sage:     #A3B2A4    (Muted Sage — tertiary accent, botanical glyph color)
--np-rose:     #5A1F2E    (Vampire Rose — emphasis accent, "no" affordances, link thumbs)
--np-bone:     #E8E4DF    (Soft Bone — primary background, light mode; primary text, dark mode)
--np-bone-soft:#D8D3CD    (slightly dimmed bone — secondary text, dark mode)
```

Light and dark themes are both first-class. Many tokens flip; some (amethyst, moss, sage, rose) hold across themes as semantic accents.

### Typography

- **Display + body serif:** [Fraunces](https://fonts.google.com/specimen/Fraunces) variable. The italic on the *soft* axis is the signature voice — used for headlines, post heds, pull quotes, sidebar item names. Fraunces' optical-size axis used for size-specific tuning.
- **Utility:** [Inter](https://fonts.google.com/specimen/Inter) (regular, medium, semibold) for nav, meta labels, captions, form fields.
- **No third typeface in v1** (cursive script accents from earlier mockups are deferred — keeps font-loading lean and lets Fraunces' italic carry the personality).

Type scale (rough, refined in build):

```
Display     | Fraunces italic, opsz 144, soft 100, 56–64 px (hero), 40–48 px (essay hed)
Section hed | Fraunces italic, opsz 36,  soft 60,  28–32 px
Pull quote  | Fraunces italic, opsz 144, soft 100, 28–32 px
Body        | Fraunces regular, opsz 18, 17 px / 1.55
UI          | Inter, 11–14 px, letter-spacing 0.18–0.32em on uppercase eyebrows
Caption     | Fraunces italic, 14–15 px
```

### Iconography

[Phosphor Icons](https://phosphoricons.com), **Duotone weight** as the primary set (the layered fill-on-stroke matches the velvet/layered feel). Loaded via the official `@phosphor-icons/web` package. Regular weight available as fallback for any icon that reads better thinner.

### Surface treatment ("the velvet")

Every dark-mode surface is layered:

1. Base radial-gradient stack (3 light sources: top-center plum, top-right sage, bottom-left rose) over a `plum → ink → near-black` linear
2. Soft drop shadows on cards (multi-layer, both ambient + sharp)
3. SVG-noise film grain overlay (~5% opacity, mix-blend-mode: overlay)
4. Inset 1px highlight on top edge of cards (`rgba(232,228,223,0.05)`) for "sheen"

Light-mode surfaces use bone background with subtle plum/rose washes in corners and an even softer noise overlay — no glow, but the same handcrafted quality. Light mode is *not* simply "invert the dark mode" — it's a parallel treatment with its own atmosphere.

### Sparkles

Six absolutely-positioned 1.5–2px CSS particles drift slowly across the viewport background on long, staggered keyframe loops. Faint glow halos. They never converge or pattern; positioning is sparse and asymmetric. Not present in light mode.

### Theme toggle — candle & wisp

- **Lit candle** = dark mode (the candle is what's keeping the room "velvet-library" dark and lamplit)
- **Snuffed candle (with smoke wisp)** = light mode
- Animated SVG flame with subtle flicker (CSS keyframe scale/translate); on toggle, flame fades and a smoke-wisp SVG path animates upward, then dissipates
- Lives in top-right of nav. Hover state: glow intensifies; cursor: pointer; tooltip text reflects current state ("snuff the candle" / "light the candle")

### d20 motif inventory

Sneaky placements only. Never the loud thing on a surface:

- **Issue counter** in the sidebar: the issue number sits inside a small d20 silhouette
- **Page transition loader**: animated d20 tumbles between routes (replaces a generic spinner)
- **404 page**: critical fail — the d20 lands on 1
- **Tagged-thread post badges** (when threads ship in v2): post number rendered inside a small d20 outline
- *Not* in: nav, primary buttons, hero. The d20 stays in the margins.

### Botanical motifs

Single-glyph botanicals (`❦`, `✦`, custom SVG sprigs) used sparingly as section dividers, ornament marks, and quote bookends. Sage/moss colored. Never as full illustrations.

## 5. Post-Type Inventory

Six post types in v1, all flow into the unified feed. Each has its own card treatment, permalink template, and Tina schema.

### 5.1 Essay (longform)

- Italic Fraunces hed, dek paragraph, ✦-prefixed read time
- Optional hero image (full-bleed on permalink)
- Frontmatter: `title, dek, publishedAt, readTime, heroImage?, tags[], threadId?`
- Permalink: hero-led, generous prose typography, Fraunces body, max 70ch measure

### 5.2 Note (micropost)

- One paragraph to ~300 words
- No headline — the prose IS the post
- Amethyst left-rule, italic Fraunces, no hero
- Frontmatter: `body, publishedAt, tags[]`
- Permalink: just the note centered with a tiny date stamp

### 5.3 Quote (pull)

- Oversized italic Fraunces, ✦ ornament bookends, source attribution in caps eyebrow
- Frontmatter: `body, source, sourceUrl?, publishedAt, tags[]`
- Permalink: near-empty page, quote centered on velvet field

### 5.4 Link (bookmark)

- Open Graph thumbnail (rendered as a velvet-gradient placeholder if no image), source label, italic comment from Nina
- Frontmatter: `url, title, source, ogImage?, comment, publishedAt, tags[]`
- Permalink: comment expanded to full prose with a soft "go read it →" footer link

### 5.5 Photo

- Image-led card. Italic caption beneath
- Frontmatter: `image, caption, publishedAt, tags[]`
- Permalink: full-bleed photo with caption pulled to side
- No filter applied to images — the velvet glow comes from the page, not the photo

### 5.6 Audio (voice memo) — **bespoke component**

- Custom waveform visualizer (28–32 vertical bars, height = pre-computed amplitude data)
- Played-vs-unplayed bars use amethyst (played) and 18%-opacity bone (unplayed)
- Played bars get a subtle box-shadow glow
- Circular play button (amethyst fill, ink play glyph)
- Title (italic Fraunces) + duration + context line
- Tina admin uploads the raw audio file (mp3 / m4a). A custom Astro integration runs at build time, decodes each audio asset (Web Audio API via `audio-decode` or equivalent in Node), samples amplitude into 32 buckets, and emits a sibling JSON file (`<audio-name>.waveform.json`) consumed by the audio component. No runtime decode in the browser.
- Frontmatter: `title, audioFile, duration, waveform[32], context, publishedAt, tags[]`
- Permalink: same player, larger, plus optional transcript field

## 6. Sidebar Widgets (homepage only, desktop only)

Stack below the feed on mobile (< 900px). Three blocks:

### "On her desk"

Hand-curated, edited via Tina. Three slots, each with a Phosphor Duotone glyph:

- **Reading** (book-open icon) — current book title + author
- **Brewing** (pen-nib icon) — current project, free-form sentence
- **Listening** (music-notes icon) — current album/track + artist

If a slot is empty, it doesn't render. Decays gracefully if Nina doesn't update — no "last updated" timestamp.

### "Noticing"

Three small italic snippets — observations, overheard lines, things she clocked. Each has a quote and a tiny eyebrow attribution ("a podcast on craft" / "last Saturday" / etc.). Hand-curated via Tina, latest 3 always show.

### Issue counter

The site is conceptually framed as a periodical. Each season (or each significant content drop) gets an issue number. Renders as `№ 14` with a sage `spring · year one` label and a tiny d20 badge. Hand-set in site config; not auto-incremented.

## 7. Tech Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Static site framework | **Astro 5.x** (latest) | Content Collections map cleanly to variable post types; islands architecture keeps shipped JS minimal |
| Content management | **TinaCMS** (Tina Cloud free tier for auth + GitHub backend) | Friendly visual editor; commits markdown to repo; non-dev-friendly UX |
| Hosting | **Cloudflare Pages** | Generous free tier, fastest globally, free `*.pages.dev` temp subdomain |
| CDN / images | Astro Assets (`astro:assets`, Sharp under the hood) | Built-in image optimization in Astro 5 |
| Icons | `@phosphor-icons/web` (Duotone) | Free, MIT, six weights, layered duotone matches the brief |
| Fonts | Fraunces + Inter via Fontsource (self-hosted) | Self-hosted = no third-party FOIT; Fraunces variable = single file for all weights/styles |
| RSS | `@astrojs/rss` | First-party, full-feed support |
| Sitemap | `@astrojs/sitemap` | First-party, automatic |
| Contact form backend | **Formspree** (free tier, 50 submissions/mo) | No-code action URL; switch to Cloudflare Pages Functions if she outgrows it |
| Audio waveform | Web Audio API decode at upload time (Tina hook), bars rendered with CSS | No runtime audio decode in browser; pre-baked amplitude data ships as JSON |
| Animations (bespoke) | Hand-rolled CSS + SVG for candle flicker, d20 tumble, sparkle drift | Identity-defining moments deserve hand-craft |
| Animations (utility) | `@lottiefiles/dotlottie-web` for misc states (form submit, image fade-in, skeleton loaders) | Lightweight, swappable |
| Type-safety | TypeScript strict mode, content-collection schemas with Zod | Catches malformed frontmatter at build time |
| Linting / formatting | ESLint + Prettier (Astro plugin) | Standard |

## 8. Repo Architecture

Treating the repo as Nick's portfolio piece. Conventions:

```
studio-marginalia/
├─ docs/
│  └─ superpowers/specs/        # this spec lives here, future specs go here
├─ public/
│  ├─ fonts/                    # self-hosted Fraunces + Inter (woff2)
│  ├─ icons/                    # custom SVGs (d20, candle, sparkles)
│  └─ ...
├─ src/
│  ├─ assets/                   # processed images go here
│  ├─ components/
│  │  ├─ post-types/            # one component per post type (Essay, Note, Quote, Link, Photo, Audio)
│  │  ├─ sidebar/               # OnHerDesk, Noticing, IssueCounter
│  │  ├─ layout/                # Nav, Footer, ThemeToggle (Candle), PageTransition (d20)
│  │  ├─ atmosphere/            # Sparkles, Grain, GlowStage
│  │  └─ ui/                    # Button, Pill, Eyebrow, etc.
│  ├─ content/
│  │  ├─ posts/                 # markdown files, one per post (any type)
│  │  ├─ portfolio/             # case study markdown
│  │  ├─ now/                   # On Her Desk single-doc
│  │  ├─ noticing/              # Noticing items
│  │  └─ config.ts              # Astro Content Collection schemas (Zod)
│  ├─ layouts/
│  │  ├─ Base.astro             # html shell, theme, fonts, nav, footer
│  │  └─ Post.astro             # post permalink shell
│  ├─ lib/
│  │  ├─ theme.ts               # theme detection / toggle
│  │  ├─ waveform.ts            # audio amplitude extraction (build-time)
│  │  └─ rss.ts                 # RSS feed builders
│  ├─ pages/
│  │  ├─ index.astro            # homepage / Reading Room
│  │  ├─ about.astro
│  │  ├─ work/index.astro       # work-with-me
│  │  ├─ work/portfolio/index.astro
│  │  ├─ journal/[slug].astro   # post permalinks (one route, branches by type)
│  │  └─ rss.xml.ts
│  └─ styles/
│     ├─ tokens.css             # color tokens, type scale, spacing
│     ├─ global.css             # base resets + Fraunces/Inter rules
│     └─ atmosphere.css         # glow, grain, sparkle keyframes
├─ tina/
│  ├─ config.ts                 # Tina schema (mirrors Astro Content Collections)
│  └─ ...
├─ astro.config.mjs
├─ tina.config.ts
├─ tsconfig.json
├─ package.json
├─ wrangler.toml                # only if Pages Functions are added (v2); not required for static-only v1
├─ .env.example
└─ README.md                    # comprehensive — see §10
```

Naming: kebab-case for files, PascalCase for components, camelCase for utilities. No barrel `index.ts` re-exports unless they earn their keep.

## 9. Animations & Loaders

| Surface | Animation | Implementation |
|---------|-----------|----------------|
| Theme toggle | Candle flicker (always on, dark mode) → smoke wisp on extinguish → flame fade-in on light | Hand-rolled SVG + CSS keyframes; respects `prefers-reduced-motion` |
| Background | Six sparkles drifting slowly | Pure CSS keyframe (no JS); reduced-motion: hidden |
| Page transition | d20 tumble | Astro View Transitions API + custom SVG d20 with rotation/translate keyframes |
| Form submit | Lottie checkmark | LottieFiles celestial pack |
| Image fade-in | Soft blur-up | CSS only, native `loading="lazy"` |
| Audio play | Waveform "played" bars cascade in fill | CSS transition on bar opacity/color |

All animations honor `prefers-reduced-motion: reduce` — sparkles hide, candle flame holds steady, d20 tumble shortens to a 80ms fade.

## 10. README requirements (portfolio quality)

The README is the primary artifact a reader-of-the-codebase sees. Should include:

1. **Hero paragraph** — what the site is, who it's for, link to live site
2. **Screenshot** — hi-fi render of the homepage (dark + light, side by side)
3. **Stack at a glance** — the tech-stack table from §7, condensed
4. **Architecture overview** — repo tree (collapsed) + brief tour of the post-type pattern
5. **Local development** — `pnpm install`, `pnpm dev`, environment variables (Tina tokens, Formspree endpoint)
6. **Content authoring** — how to write a post via Tina (link to live admin URL)
7. **Adding a new post type** — short walkthrough (schema + component + route branch)
8. **Deployment** — Cloudflare Pages, GitHub-integrated, push-to-deploy
9. **Credits & licensing** — Phosphor (MIT), Fraunces (OFL), Lottie pack credits

## 11. v1 Scope (explicit)

**Ships in v1:**

- All page surfaces marked v1 in §3
- All six post types rendered in feed + permalink (including bespoke audio recorder/player)
- Sidebar widgets (On her desk, Noticing, Issue counter)
- Both themes (light + dark) with animated candle toggle
- Sparkles, glow, film grain, all atmospheric treatments
- d20 motif everywhere it's specified except threads-related placements
- Phosphor Duotone icons throughout
- Fraunces + Inter typography
- RSS, sitemap, OG tags, basic SEO
- Contact form (Formspree)
- Tina admin for all content types
- Deploy to `studio-marginalia.pages.dev`

**Defers to v2:**

- Threads — index page, individual thread archives, thread badges on posts. Schema field `threadId` ships in v1 (so posts authored in v1 can be retroactively grouped) but no UI surfaces them.
- Portfolio case-study permalinks — `/work/portfolio/index.astro` ships, individual `/[slug]` does not. Cards link out to external URLs (or to nothing) in v1.
- Newsletter (cut entirely)
- Member/paid posts (cut entirely)

## 12. Open questions / setup steps for Nick

These need real answers / actions before or during implementation:

1. **Cloudflare account** — Nick to create (free, ~30 sec). Wrangler CLI auths against it locally; GitHub integration handles push-to-deploy.
2. **Tina Cloud account** — Free tier sufficient. Nick to create, link to the GitHub repo.
3. **Formspree account** — Free tier, 50 submissions/mo. Nick to create, get an action URL, wire to env var.
4. **Real domain** — when Nina decides between `studiomarginalia.com`, `ninapfeiffer.com`, both, or other. Cloudflare Pages handles the cutover via custom domains UI.
5. **Real portfolio content** — case-study cards in this spec are placeholder (Hadley & Crumb, Florae, etc.). Nina to replace with real client work + permission to publish.
6. **Real "On her desk" + "Noticing" seed content** — Nina to populate at launch.
7. **First voice memo** — Nina has committed to recording for v1. Needed before launch to validate the audio component end-to-end.

## 13. Open design decisions deferred to implementation

Small calls that don't need to block the spec:

- Final hover/focus states for nav links (test in build)
- Mobile candle-toggle position (next to wordmark vs. bottom-right floating — test in build)
- Whether the "Noticing" sidebar items link anywhere or are pure observation surfaces (lean: no links — keeps them precious)
- Exact issue-rollover cadence (every season? every N posts? — Nina's call once she sees the rhythm)
