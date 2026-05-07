# Blue Studio Rename — Design Spec

**Date:** 2026-05-06
**Status:** Approved for planning
**Author:** Nick Cason (with Claude)

## Goal

Rename the site formerly known as **Studio Marginalia** to **Blue Studio**. Text-only rebrand: no palette change, no logotype redesign, no body-prose rewrite. Includes wiring up the newly-purchased domain `bluestudio.space` to a fresh Cloudflare Pages project.

## Out of scope

This spec deliberately does **not** change:

- Visual identity (palette, typography, candle, OG layout, theme tokens). Wordmark keeps Fraunces italic + amethyst middle-dot.
- Body copy in `src/content/pages/about.md` and `src/content/posts/notes-from-the-build/01-the-brief.md` — these mention "Studio Marginalia" in narrative prose. Nick will re-author through Tina later.
- Historical specs and plans under `docs/superpowers/specs/`, `docs/superpowers/plans/`, `docs/Codex Reviews/`, `docs/Master Review/`. These are frozen artifacts of past work; rewriting them loses meaning.
- The old Cloudflare Pages project (`studio-marginalia.pages.dev`). Stays live for ~1–2 weeks as a safety net, then deleted manually.
- Tina Cloud project name (an internal label in Nick's Tina account; only `GH_REPO` in `tina/config.ts` matters).
- Email mail-server config for `bluestudio.space` (the site only displays the address; doesn't send).
- Apex/www canonicalization (both `bluestudio.space` and `www.bluestudio.space` will serve the site; redirect rules can be added later).

## Naming canon

| Use | Current | New |
|---|---|---|
| Display name (titles, RSS, OG) | `Studio Marginalia` | `Blue Studio` |
| Wordmark (Nav + Footer) | `studio·marginalia` | `blue·studio` |
| Slug / identifier | `studio-marginalia` | `blue-studio` |
| Canonical site URL | `https://studio-marginalia.pages.dev` | `https://bluestudio.space` |
| Pages preview URL (auto, not canonical) | — | `https://blue-studio.pages.dev` |
| Contact email | `hello@studiomarginalia.com` | `hello@bluestudio.space` |
| Vite plugin name (internal) | `studio-marginalia:waveform` | `blue-studio:waveform` |
| GitHub repo | `NickCason/studio-marginalia` | `NickCason/blue-studio` |

**Conventions:**
- Wordmark middle-dot is the literal `·` (U+00B7), italic Fraunces, amethyst color (unchanged).
- Page title format `"<page> — Blue Studio"` (em-dash) preserved.

## File inventory

### Tier A — User-visible runtime strings
- `src/components/layout/Nav.astro` — wordmark
- `src/components/layout/Footer.astro` — wordmark
- `src/layouts/Base.astro` — default `title`, `siteUrl`, RSS link title, canonical fallback
- `src/pages/about.astro` — Base title
- `src/pages/404.astro` — Base title
- `src/pages/work/index.astro` — Base title + visible `mailto:` fallback
- `src/pages/work/portfolio/index.astro` — Base title
- `src/pages/work/portfolio/[slug].astro` — Base title
- `src/pages/journal/[...slug].astro` — 6 case titles
- `src/pages/journal/tag/[tag].astro` — Base title
- `src/pages/rss.xml.ts` — feed title + site fallback
- `src/pages/og/[...slug].png.ts` — title fallbacks (2)
- `src/lib/og/render.tsx` — wordmark span text

### Tier B — Build/deploy/repo identity
- `package.json` — `"name"`, `"deploy"` script `--project-name`
- `astro.config.mjs` — `site:` → `https://bluestudio.space`
- `.github/workflows/deploy.yml` — `--project-name=blue-studio`, `PUBLIC_SITE_URL`
- `tina/config.ts` — `GH_REPO`, `SITE_URL`, success message
- `functions/api/deploy-status.ts` — `REPO`, `User-Agent`
- `go-live.sh` — `CF_PROJECT_NAME`, `CONTACT_EMAIL`
- `scripts/generate-default-og.mjs` — wordmark span + footer text
- `.env.example` — `PUBLIC_SITE_URL`
- `.env.local.example` — `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL`
- `README.md` — title, live URL line, deploy section refs

### Tier C — Internal labels
- `src/integrations/waveform.mjs` — vite plugin name
- `src/styles/tokens.css` — header comment
- `public/admin-theme.css` — header comment

### Tier D — Regenerated artifact
- `public/og-default.png` — re-render via `node scripts/generate-default-og.mjs`

### Tier E — Local manual (Nick edits by hand)
- `.env.local` (gitignored) — `PUBLIC_SITE_URL`, `PUBLIC_CONTACT_EMAIL`

**Total:** ~24 tracked files modified, 1 PNG regenerated, 1 local-only file user-edits.

## External setup walkthrough

### 5.1 — GitHub repo rename (1 min)
```bash
gh repo rename blue-studio
```
Auto-updates local `origin`. GitHub keeps a permanent 301 redirect from the old URL.

### 5.2 — Cloudflare DNS for bluestudio.space (~5 min active + propagation wait)
1. Cloudflare dashboard → **Add a domain** → `bluestudio.space` → Free plan → Continue.
2. Copy the 2 assigned Cloudflare nameservers.
3. GoDaddy → My Products → `bluestudio.space` → DNS → Nameservers → "I'll use my own" → paste both Cloudflare nameservers → Save.
4. Wait for Cloudflare's "Welcome" email (5–30 min usually). Verify with `dig NS bluestudio.space +short`.

### 5.3 — Create new Cloudflare Pages project (~2 min)
After code rename merged:
```bash
pnpm build
wrangler pages deploy ./dist --project-name=blue-studio
```
Wrangler prompts to create the project on first run — accept, pick `main` as production branch.

Or via dashboard: Workers & Pages → Create → Pages → Connect to Git → `NickCason/blue-studio` → build `pnpm build`, output `dist`.

**Then copy environment variables** from old project's Settings to new: `TINA_PUBLIC_CLIENT_ID`, `TINA_TOKEN`, `PUBLIC_FORMSPREE_ENDPOINT`, `PUBLIC_SITE_URL=https://bluestudio.space`, `PUBLIC_CONTACT_EMAIL=hello@bluestudio.space`, plus any GitHub PAT used by `functions/api/deploy-status.ts`.

### 5.4 — Wire bluestudio.space to the Pages project (~5 min + SSL wait)
Requires both 5.2 (DNS active) and 5.3 (project deployed) done.
1. CF dashboard → Workers & Pages → `blue-studio` → Custom domains tab → Set up a custom domain.
2. `bluestudio.space` → Continue → Activate. Cloudflare auto-creates the CNAME.
3. Repeat for `www.bluestudio.space`.
4. Wait ~2–10 min for SSL cert. Verify: `curl -I https://bluestudio.space` → expect HTTP/2 200.

### 5.5 — Cleanup (later, NOT this sitting)
- Delete old `studio-marginalia` Pages project from CF dashboard once confident.
- Add apex/www canonicalization via Cloudflare Bulk Redirect if desired.

## Sequence of operations

```
Phase 0 — Land in-flight desk-cat work (Nick + Claude, ~5 min)
  ├─ Commit DeskFooter z-index/panel-height tweaks
  └─ Merge desk-cat → main

Phase 1 — Repo identity (Nick, ~1 min, parallel-safe)
  ├─ gh repo rename blue-studio
  └─ (Already done: GoDaddy nameserver swap; CF DNS propagating in background)

Phase 2 — Code rename branch (Claude, ~15-20 min)
  ├─ git checkout -b rename-bluestudio (off new main)
  ├─ Tier A edits (visible runtime strings)
  ├─ Tier B edits (build/deploy identity)
  ├─ Tier C edits (internal labels)
  ├─ Tier D: regenerate public/og-default.png
  ├─ Local sanity: pnpm build (catches typos)
  └─ Commit + push branch

Phase 3 — Cutover (Nick + Claude)
  ├─ Confirm CF "Welcome" email → DNS active
  ├─ Open PR rename-bluestudio → main, merge
  ├─ Nick edits .env.local (PUBLIC_SITE_URL + PUBLIC_CONTACT_EMAIL)
  ├─ Run wrangler pages deploy (creates new Pages project on first run)
  └─ Copy env vars from old project to new (in CF dashboard)

Phase 4 — Custom domain (Nick, requires Phase 3 + DNS active)
  ├─ CF dashboard → blue-studio Pages → Custom domains
  ├─ Add bluestudio.space + www.bluestudio.space
  ├─ Wait ~5 min for SSL cert
  └─ Verify: curl -I https://bluestudio.space → 200

Phase 5 — Verify + memory update (Claude, ~5 min)
  ├─ Smoke: /, /journal, /work, /about all show blue·studio
  ├─ View source: <title> says "Blue Studio", canonical = bluestudio.space
  ├─ Check /rss.xml title + OG image
  └─ Update memory: new repo, new URL, new Pages project name

Phase 6 — Cleanup (Nick, ~2 weeks later — NOT this sitting)
  ├─ Delete old studio-marginalia Pages project
  └─ Re-edit body prose via Tina
```

**Critical-path notes:**
- Phase 2 doesn't block on DNS — code edits can finish before bluestudio.space is live.
- Pages project secrets must be copied **before** first auto-deploy from main, or runtime config will be wrong.
- New project starts serving immediately on `blue-studio.pages.dev` even before custom domain attaches.

**Rollback:**
- Phase 2 fails → drop branch.
- Phase 3 deploy fails → old `studio-marginalia.pages.dev` still live; revert merge.
- Phase 4 custom domain fails → site still on `blue-studio.pages.dev`; debug DNS/cert without time pressure.

## Acceptance criteria

1. `pnpm build` succeeds locally on the rename branch with zero errors.
2. Browsing the new deploy: every page wordmark shows `blue·studio`. No "marginalia" string visible in the rendered HTML except in untouched body-prose markdown content.
3. View-source check on home page: `<title>` contains `Blue Studio`, `<link rel="canonical">` contains `https://bluestudio.space`.
4. RSS feed at `/rss.xml` has channel `<title>Blue Studio</title>`.
5. OG default image (`/og-default.png`) shows `blue·studio` wordmark.
6. `https://bluestudio.space` responds 200 with valid SSL.
7. Tina admin (`/admin`) loads, can author and publish a draft, commit lands on `NickCason/blue-studio` `main` branch.
8. GitHub Actions deploy on `main` push succeeds, deploying to `blue-studio` Pages project.
9. Memory updated: new repo URL, new canonical URL, new Pages project name reflected in `project_marginalia_desk_companion.md` (or split to a `project_blue_studio.md` if cleaner).

## Open follow-ups (NOT this work)

- Re-author body prose in `about.md` / `01-the-brief.md` to remove "Studio Marginalia" mentions.
- Decide canonical between apex (`bluestudio.space`) and `www`; configure 301 redirect via Cloudflare Bulk Redirect.
- Email server / forwarding for `hello@bluestudio.space` (GoDaddy email forwarding, Fastmail, etc.).
- Delete old `studio-marginalia` Cloudflare Pages project after confidence period.
- Decide whether to retire the old GitHub redirect (no action needed; GH keeps it indefinitely).
