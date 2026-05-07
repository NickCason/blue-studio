# blue·studio

A personal-first journal and a quiet marketing studio for Nina Pfeiffer. Built as a gift, written in part by an AI, maintained by Nina via a friendly CMS.

**Live (provisional):** `bluestudio.space` *(after the Cloudflare account is connected — see Deployment below)*

**Local right now:** the build is shipped and a preview server is running on this Mac (tailnet-bound). See `Local right now` section below for the URLs.

## What this is

Six post types in one feed (essay, note, quote, link, photo, voice memo), a sidebar that holds the writer's current life, a separate work track for client services + a portfolio, an animated candle theme toggle, and a layered velvet visual language that doesn't try to be influencer-perfect.

## Stack

- **Astro 5** static site, Content Collections for posts/portfolio/sidebar data
- **TinaCMS** *(scaffold ready, awaits Tina Cloud account)* for friendly authoring
- **Cloudflare Pages** for hosting (free, fast, push-to-deploy)
- **TypeScript** strict, **Vitest** unit, light **Playwright** smoke
- **Phosphor Icons** Duotone weight; **Fraunces** + **Inter** via Fontsource (self-hosted)
- Custom build-time integration that decodes audio (`audio-decode`) and emits sibling waveform JSON for the bespoke voice-memo player; also copies audio assets into `public/audio/` with safe slug-based names
- **Tailnet TTS** via [speaches](https://github.com/speaches-ai/speaches) running on `precision-node4:8000` (Kokoro-82M) — used by `scripts/tts.mjs` to render voice memos at author time

## Local right now

A production-mode preview server is already running on the Mac that built this. From any device on the tailnet:

- `http://nicks-macbook-air:4321/`
- `http://100.118.169.49:4321/` *(MagicDNS-less fallback)*

To restart the preview locally:

```bash
pnpm install
pnpm build
pnpm preview --host 0.0.0.0 --port 4321
```

For active development with HMR:

```bash
pnpm dev:host    # binds 0.0.0.0 so you can view from another tailnet device
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in as accounts come online:

| Var | What | Where to get |
|-----|------|--------------|
| `TINA_PUBLIC_CLIENT_ID` | Tina Cloud client ID | https://app.tina.io after creating a project |
| `TINA_TOKEN` | Tina read-only token | same |
| `PUBLIC_FORMSPREE_ENDPOINT` | Contact form action URL | https://formspree.io after creating a form |
| `TTS_ENDPOINT` | Tailnet speaches URL | default: `http://precision-node4:8000` |
| `TTS_VOICE` | Kokoro voice id | default: `af_bella` |

## Repo tour

```
src/
  components/
    atmosphere/      # Sparkles, FilmGrain, GlowStage — the velvet ground
    layout/          # Nav, Footer, ThemeToggle (animated candle)
    post-types/      # one card per type for the unified feed
    post-permalinks/ # one full-page treatment per type
    sidebar/         # OnHerDesk, Noticing, IssueCounter
    ui/              # Eyebrow, MetaRow, Pill primitives
  content/
    config.ts        # Zod schemas (single source of truth)
    posts/           # markdown per post; audio posts get sibling .waveform.json at build
    portfolio/       # case study markdown
    now/             # singleton "On her desk"
    noticing/        # observations
    site/            # issue №, season, year
  integrations/
    waveform.mjs     # build-time audio → 32-bucket peaks → JSON; copies to public/audio/
  layouts/Base.astro
  lib/               # theme persistence, date format, read-time, feed builder
  pages/             # routes
  styles/            # tokens, global, atmosphere, candle
scripts/
  tts.mjs            # CLI: text → mp3 via tailnet speaches
public/
  audio/             # generated audio copies (slug-named)
  favicon.svg        # custom d20 with Fraunces "M"
  og-default.png     # generated social card
  _headers           # Cloudflare Pages headers
docs/superpowers/
  specs/             # design spec
  plans/             # implementation plan
```

## Adding a new post type

1. Add the variant to the `posts` discriminated union in `src/content/config.ts`.
2. Add `src/components/post-types/<Type>Card.astro` (feed card) and `src/components/post-permalinks/<Type>Page.astro` (permalink).
3. Wire it into the switch in `src/pages/index.astro` and `src/pages/journal/[...slug].astro`.
4. Add a case to `src/pages/rss.xml.ts`.
5. Mirror the schema in `tina/config.ts` if/when Tina is wired up.

## Authoring

- **Markdown files (current):** add a markdown file under `src/content/posts/<slug>.md` (or a folder with `index.md` for posts that need sibling assets) with the right frontmatter.
- **Voice memos:** `pnpm tts -- --text "..." --out src/content/posts/<slug>/audio.mp3` (uses the tailnet TTS endpoint). The build will generate the waveform automatically.
- **Tina (when set up):** open `/admin/` and login with GitHub. Tina commits markdown to the repo.

## Deployment (first time, once Nick has accounts)

1. **Cloudflare account:** https://dash.cloudflare.com/sign-up (free)
2. From repo: `npx wrangler login` (opens browser)
3. Push the repo to GitHub: `gh repo create blue-studio --public --source=. --push`
4. In Cloudflare Pages dashboard, *Connect Git → choose `blue-studio`*. Build command: `pnpm build`, output: `dist`.
5. Add env vars in Pages settings (same names as `.env.example`).
6. First push to `main` triggers a build → `blue-studio.pages.dev`.

For ad-hoc CLI deploys: `pnpm build && pnpm deploy`.

## Deferred to v2

- **Threads** index + per-thread archive pages (the `threadId` field already ships in the schema, so posts in v1 can be retroactively grouped when v2 lands)
- **Portfolio case-study permalinks** (`/work/portfolio/[slug]/`); the index page ships in v1
- **Newsletter** (cut entirely)
- **Member/paid posts** (cut entirely)

See `docs/superpowers/specs/2026-05-04-studio-marginalia-design.md` §11 for the full v1/v2 boundary.

## Credits

- [Phosphor Icons](https://phosphoricons.com) — MIT
- [Fraunces](https://fonts.google.com/specimen/Fraunces) — OFL
- [Inter](https://fonts.google.com/specimen/Inter) — OFL
- Voice memo TTS: [speaches](https://github.com/speaches-ai/speaches) running [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)
- Built with [Astro](https://astro.build) and [Claude Code](https://claude.com/claude-code)

## License

Private. Content © Nina Pfeiffer. Build code © Nick Cason.
