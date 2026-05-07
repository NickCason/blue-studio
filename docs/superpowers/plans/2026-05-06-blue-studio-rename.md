# Blue Studio Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Several tasks require Nick to perform manual steps in external dashboards (GitHub, Cloudflare, GoDaddy) — the orchestrator MUST pause at those points and walk Nick through each step verbosely, confirming completion before proceeding.

**Goal:** Rename "Studio Marginalia" → "Blue Studio" across the codebase and wire up the new `bluestudio.space` domain to a fresh Cloudflare Pages project, retaining all in-flight content edits and shipping the desk-cat feature in the same sitting.

**Architecture:** Two sequential merges to `main`. First merge ships the existing `desk-cat` feature with the old name (no rename touched yet). Then a new `rename-bluestudio` branch off the updated `main` does a comprehensive find-and-replace across ~24 files in three tiers (visible runtime strings → build/deploy identity → internal labels), regenerates the OG PNG, sanity-builds, and merges. External setup (GH repo rename, new CF Pages project, GoDaddy → Cloudflare nameserver delegation, Pages custom domain wiring) runs in parallel where possible to minimize wall-clock time.

**Tech Stack:** Astro 5 + TinaCMS + Cloudflare Pages, deployed via GitHub Actions and `wrangler`. Domain registered at GoDaddy, DNS to be delegated to Cloudflare.

**Spec:** `docs/superpowers/specs/2026-05-06-blue-studio-rename-design.md` — read it before starting; it has the full naming canon, file inventory, external walkthrough, and acceptance criteria.

---

## Task 1: Phase 0 — Land in-flight desk-cat work and merge to main

**Goal:** Ship the desk-cat feature first so the rename is a clean, single-purpose change layered on top.

**Files:**
- Modify: `src/components/atmosphere/DeskFooter.astro` (already-uncommitted z-index + panel-height tweaks)
- Modify: `astro.config.mjs` (already-uncommitted devToolbar disable)
- Modify: `public/sprites/furniture/cat-beds.png` (already-uncommitted re-extraction)
- Untracked to add: `docs/superpowers/specs/2026-05-06-deskcat-footer-design.md`, `docs/superpowers/plans/2026-05-06-deskcat-footer.md`
- Leave untracked: `docs/Codex Reviews/`, `docs/Master Review/` (those are interview state, not desk-cat-related)

- [ ] **Step 1: Confirm working tree state**

```bash
git status
```

Expected: 3 modified files (`astro.config.mjs`, `public/sprites/furniture/cat-beds.png`, `src/components/atmosphere/DeskFooter.astro`) + untracked docs. On branch `desk-cat`.

- [ ] **Step 2: Stage the desk-cat polish + spec/plan docs**

```bash
git add src/components/atmosphere/DeskFooter.astro \
        astro.config.mjs \
        public/sprites/furniture/cat-beds.png \
        docs/superpowers/specs/2026-05-06-deskcat-footer-design.md \
        docs/superpowers/plans/2026-05-06-deskcat-footer.md
```

Do NOT add `docs/Codex Reviews/` or `docs/Master Review/` — those are out-of-scope working notes for a paused interview.

- [ ] **Step 3: Commit the polish**

```bash
git commit -m "$(cat <<'EOF'
feat(deskcat): polish — desktop panel matches surface, returning cat on top

- Desktop panel padding tightened to 2px so total height = 64px (matches
  the always-visible glassy ground surface) — walking cat flows past
  smoothly instead of stepping up onto a taller platform
- Out-cat z-index bumps to 53 only while .shrinking is active so the
  returning cat is visible over the panel as it lands in its bed; drops
  back to 51 during normal wandering so mobile bottom-row beds stay clear
- Bundle the spec + plan docs that drove this feature

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Switch to main and merge desk-cat**

```bash
git checkout main
git pull --ff-only
git merge --no-ff desk-cat -m "Merge branch 'desk-cat' — sticky footer with 6 cat beds + persistent companion"
```

Use `--no-ff` so the merge is a discrete commit on main (easier to revert if anything breaks).

- [ ] **Step 5: Push main**

```bash
git push origin main
```

This will trigger the existing GitHub Actions deploy to the OLD `studio-marginalia` Cloudflare Pages project (since the rename hasn't happened yet). That's fine — it's the last deploy under the old name. Verify the deploy succeeds at https://github.com/NickCason/studio-marginalia/actions before proceeding.

- [ ] **Step 6: Verify desk-cat is live on the old URL**

```bash
curl -sI https://studio-marginalia.pages.dev | head -1
```

Expected: `HTTP/2 200`. Browser-check the cat beds appear in the footer.

---

## Task 2: Phase 1 — GitHub repo rename (Nick, manual)

**Goal:** Rename the GitHub repo from `studio-marginalia` to `blue-studio`. GH keeps a permanent 301 redirect from the old URL, so this is non-breaking.

**Files:** None (external operation)

- [ ] **Step 1: ORCHESTRATOR PAUSE — ask Nick to run the rename command**

The orchestrator MUST pause here, verbosely tell Nick:

> "Phase 1 needs you to run one command to rename the GitHub repo. This is instant and non-breaking — GitHub keeps a permanent 301 from the old URL. Please run:
>
> ```bash
> gh repo rename blue-studio
> ```
>
> When prompted to confirm, say yes. The command auto-updates your local `origin` remote in this clone. Let me know when it's done."

Wait for explicit confirmation before proceeding.

- [ ] **Step 2: Verify the local origin remote was updated**

```bash
git remote -v
```

Expected: both lines show `https://github.com/NickCason/blue-studio.git`. If it still shows `studio-marginalia`, Nick may need to update manually:

```bash
git remote set-url origin https://github.com/NickCason/blue-studio.git
```

- [ ] **Step 3: Verify GitHub redirect works**

```bash
curl -sI https://github.com/NickCason/studio-marginalia | grep -i location
```

Expected: `location: https://github.com/NickCason/blue-studio` (301 redirect — confirms the rename took effect).

---

## Task 3: Phase 2 — Create rename branch and edit Tier A (visible runtime strings)

**Goal:** All user-visible strings (browser titles, RSS, OG, wordmarks) become "Blue Studio" / `blue·studio`. After this task the local dev server should render entirely as Blue Studio, but build/deploy identity is still Studio Marginalia (covered in Task 4).

**Files:**
- Create branch: `rename-bluestudio` off `main`
- Modify: `src/components/layout/Nav.astro:7`
- Modify: `src/components/layout/Footer.astro:6`
- Modify: `src/layouts/Base.astro:21,26-27,38`
- Modify: `src/pages/about.astro:10`
- Modify: `src/pages/404.astro:4`
- Modify: `src/pages/work/index.astro:10,84`
- Modify: `src/pages/work/portfolio/index.astro:8`
- Modify: `src/pages/work/portfolio/[slug].astro:24`
- Modify: `src/pages/journal/[...slug].astro:19,22-27`
- Modify: `src/pages/journal/tag/[tag].astro:34`
- Modify: `src/pages/rss.xml.ts:8,10`
- Modify: `src/pages/og/[...slug].png.ts:36,38`
- Modify: `src/lib/og/render.tsx:32-34`

- [ ] **Step 1: Create the rename branch off the updated main**

```bash
git checkout main
git pull --ff-only
git checkout -b rename-bluestudio
```

- [ ] **Step 2: Update the Nav wordmark**

Edit `src/components/layout/Nav.astro` line 7:

```astro
  <a href="/" class="wordmark">blue<span class="wordmark__dot">·</span>studio</a>
```

(Was: `<a href="/" class="wordmark">studio<span class="wordmark__dot">·</span>marginalia</a>`)

- [ ] **Step 3: Update the Footer wordmark**

Edit `src/components/layout/Footer.astro` line 6:

```astro
    <span class="serif-italic">blue·studio</span>
```

(Was: `<span class="serif-italic">studio·marginalia</span>`)

- [ ] **Step 4: Update Base.astro defaults, siteUrl, RSS link**

Edit `src/layouts/Base.astro`:

Line 21 — default title:
```ts
  title = 'Blue Studio — Nina Pfeiffer',
```

Line 26 — canonical URL fallback:
```ts
const canonical = new URL(Astro.url.pathname, Astro.site ?? 'https://bluestudio.space').toString();
```

Line 27 — siteUrl const:
```ts
const siteUrl = 'https://bluestudio.space';
```

Line 38 — RSS link title attr:
```html
    <link rel="alternate" type="application/rss+xml" title="Blue Studio" href="/rss.xml" />
```

- [ ] **Step 5: Update one-line page-title strings**

Edit `src/pages/about.astro` line 10:
```astro
<Base title={`${title} — Blue Studio`}>
```

Edit `src/pages/404.astro` line 4:
```astro
<Base title="Critical fail — Blue Studio">
```

Edit `src/pages/work/index.astro` line 10:
```astro
<Base title="Work with me — Blue Studio" description="Quiet marketing for the patient, and the patiently impatient. Brand voice, content strategy, campaign copy by Nina Pfeiffer.">
```

Edit `src/pages/work/index.astro` line 84 (visible mailto fallback):
```astro
      <p class="form-fallback serif-italic">Email <a href="mailto:hello@bluestudio.space">hello@bluestudio.space</a> for now.</p>
```

Edit `src/pages/work/portfolio/index.astro` line 8:
```astro
<Base title="Selected work — Blue Studio">
```

Edit `src/pages/work/portfolio/[slug].astro` line 24:
```astro
<Base title={`${entry.data.name} — Blue Studio`} description={entry.data.pitch}>
```

Edit `src/pages/journal/tag/[tag].astro` line 34:
```astro
<Base title={`Tagged: ${display} — Blue Studio`}>
```

- [ ] **Step 6: Update journal permalink switch (6 case strings)**

Edit `src/pages/journal/[...slug].astro` lines 19, 22-27:

```ts
let title = 'Post — Blue Studio';
let description: string | undefined;
switch (post.data.type) {
  case 'essay': title = `${post.data.title} — Blue Studio`; description = post.data.dek; break;
  case 'link':  title = `${post.data.title} — Blue Studio`; break;
  case 'audio': title = `${post.data.title} — Blue Studio`; description = post.data.transcript?.slice(0, 160); break;
  case 'quote': title = `From ${post.data.source} — Blue Studio`; break;
  case 'note':  title = 'Note — Blue Studio'; break;
  case 'photo': title = `Photo — Blue Studio`; description = post.data.caption; break;
}
```

- [ ] **Step 7: Update RSS feed**

Edit `src/pages/rss.xml.ts` lines 8 and 10:

```ts
  return rss({
    title: 'Blue Studio',
    description: 'Notes and essays by Nina Pfeiffer.',
    site: context.site ?? 'https://bluestudio.space',
```

- [ ] **Step 8: Update OG default title fallbacks**

Edit `src/pages/og/[...slug].png.ts` lines 36 and 38:

```ts
    default:      title = 'Blue Studio';
  }
  if (!title) title = 'Blue Studio';
```

- [ ] **Step 9: Update OG render JSX wordmark**

Edit `src/lib/og/render.tsx` lines 32-34 (the three spans inside the wordmark div):

```tsx
              { type: 'span', props: { children: 'blue' } },
              { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 6px' }, children: '·' } },
              { type: 'span', props: { children: 'studio' } },
```

- [ ] **Step 10: Sanity-check no Tier A "marginalia" strings remain in user-visible code**

```bash
grep -rn -E "[Mm]arginalia" src/components src/layouts src/pages src/lib 2>/dev/null
```

Expected: **no output**. If anything matches, fix it before committing.

- [ ] **Step 11: Commit Tier A**

```bash
git add src/components/layout/Nav.astro \
        src/components/layout/Footer.astro \
        src/layouts/Base.astro \
        src/pages/about.astro \
        src/pages/404.astro \
        src/pages/work/index.astro \
        src/pages/work/portfolio/index.astro \
        src/pages/work/portfolio/[slug].astro \
        src/pages/journal/[...slug].astro \
        src/pages/journal/tag/[tag].astro \
        src/pages/rss.xml.ts \
        src/pages/og/[...slug].png.ts \
        src/lib/og/render.tsx
git commit -m "$(cat <<'EOF'
rename(tier-a): Studio Marginalia → Blue Studio across user-visible strings

Wordmark, page <title>s, RSS feed title, OG wordmark + title fallbacks,
canonical/siteUrl. Body prose in src/content/* intentionally untouched —
Nick re-authors via Tina later.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Phase 2 — Edit Tier B (build/deploy/repo identity)

**Goal:** Every config/script/workflow that names the project, pages project, or repo gets updated. After this task, deploys will go to the new `blue-studio` Pages project (which doesn't exist yet — created on first deploy in Task 8).

**Files:**
- Modify: `package.json:2,18`
- Modify: `astro.config.mjs:7`
- Modify: `.github/workflows/deploy.yml:62,70`
- Modify: `tina/config.ts:7,8,169`
- Modify: `functions/api/deploy-status.ts:10,21`
- Modify: `go-live.sh:26,27`
- Modify: `scripts/generate-default-og.mjs:18,20,25`
- Modify: `.env.example` (PUBLIC_SITE_URL line)
- Modify: `.env.local.example` (PUBLIC_SITE_URL + PUBLIC_CONTACT_EMAIL lines)
- Modify: `README.md:1,3,5,110,111,113,124`

- [ ] **Step 1: Update package.json**

Edit `package.json` lines 2 and 18:

```json
  "name": "blue-studio",
```

```json
    "deploy": "wrangler pages deploy ./dist --project-name=blue-studio"
```

- [ ] **Step 2: Update astro.config.mjs**

Edit `astro.config.mjs` line 7:

```js
  site: 'https://bluestudio.space',
```

- [ ] **Step 3: Update GitHub Actions workflow**

Edit `.github/workflows/deploy.yml`:

Line 62 — `PUBLIC_SITE_URL`:
```yaml
          PUBLIC_SITE_URL: https://bluestudio.space
```

Line 70 — Cloudflare deploy command:
```yaml
          command: pages deploy ./dist --project-name=blue-studio --branch=main --commit-dirty=true
```

- [ ] **Step 4: Update tina/config.ts**

Edit `tina/config.ts`:

Line 7 — `GH_REPO`:
```ts
const GH_REPO = 'NickCason/blue-studio';
```

Line 8 — `SITE_URL`:
```ts
const SITE_URL = 'https://bluestudio.space';
```

Line 169 — success banner message:
```ts
              paint('success', `Live at bluestudio.space`, { url, elapsed });
```

- [ ] **Step 5: Update Cloudflare Pages Function (deploy-status proxy)**

Edit `functions/api/deploy-status.ts`:

Line 10 — `REPO`:
```ts
const REPO = 'NickCason/blue-studio';
```

Line 21 — `User-Agent`:
```ts
    'User-Agent': 'blue-studio-deploy-status',
```

- [ ] **Step 6: Update go-live.sh**

Edit `go-live.sh`:

Line 3 — header comment:
```bash
# go-live.sh — build + deploy Blue Studio to Cloudflare Pages.
```

Line 26 — `CF_PROJECT_NAME`:
```bash
CF_PROJECT_NAME="blue-studio"
```

Line 27 — `CONTACT_EMAIL`:
```bash
CONTACT_EMAIL="hello@bluestudio.space"
```

- [ ] **Step 7: Update scripts/generate-default-og.mjs**

Edit `scripts/generate-default-og.mjs` lines 18, 20, and 25:

```js
          { type: 'span', props: { children: 'blue' } },
          { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 8px' }, children: '·' } },
          { type: 'span', props: { children: 'studio' } },
```

```js
        children: 'blue studio · 2026' } },
```

- [ ] **Step 8: Update env example files**

Edit `.env.example` — change the `PUBLIC_SITE_URL` line:

```
PUBLIC_SITE_URL=https://bluestudio.space
```

Edit `.env.local.example` — change the `PUBLIC_SITE_URL` and `PUBLIC_CONTACT_EMAIL` lines:

```
PUBLIC_SITE_URL=https://bluestudio.space
PUBLIC_CONTACT_EMAIL=hello@bluestudio.space
```

- [ ] **Step 9: Update README.md**

Edit `README.md`:

Line 1 — title:
```markdown
# blue·studio
```

Line 3 — opening line (replace "Studio Marginalia" → "Blue Studio" if mentioned in the description; current text reads `for Nina Pfeiffer.` so the line stays as-is — actually verify line 3 currently doesn't name the project, just describes it):

The current line 3 is:
```
A personal-first journal and a quiet marketing studio for Nina Pfeiffer. Built as a gift, written in part by an AI, maintained by Nina via a friendly CMS.
```
→ unchanged (no brand name in this line).

Line 5 — Live URL:
```markdown
**Live (provisional):** `bluestudio.space` *(after the Cloudflare account is connected — see Deployment below)*
```

Line 110 — `gh repo create` example:
```markdown
3. Push the repo to GitHub: `gh repo create blue-studio --public --source=. --push`
```

Line 111 — Cloudflare connect example:
```markdown
4. In Cloudflare Pages dashboard, *Connect Git → choose `blue-studio`*. Build command: `pnpm build`, output: `dist`.
```

Line 113 — first push URL:
```markdown
6. First push to `main` triggers a build → `blue-studio.pages.dev`.
```

Line 124 — historical spec reference (DO NOT change the filename, just the prose if any). Current line 124:
```
See `docs/superpowers/specs/2026-05-04-studio-marginalia-design.md` §11 for the full v1/v2 boundary.
```
→ unchanged. The file name is historical and stays.

- [ ] **Step 10: Sanity-check no Tier B "marginalia" strings remain in non-doc files**

```bash
grep -rn -E "marginalia|Marginalia" \
  package.json astro.config.mjs .github tina functions go-live.sh \
  scripts/generate-default-og.mjs .env.example .env.local.example README.md \
  2>/dev/null | grep -v "studio-marginalia-design.md" | grep -v "studio-marginalia-v1.md"
```

Expected: **no output** (filtering out the historical spec/plan file references in README which we're keeping).

- [ ] **Step 11: Commit Tier B**

```bash
git add package.json \
        astro.config.mjs \
        .github/workflows/deploy.yml \
        tina/config.ts \
        functions/api/deploy-status.ts \
        go-live.sh \
        scripts/generate-default-og.mjs \
        .env.example \
        .env.local.example \
        README.md
git commit -m "$(cat <<'EOF'
rename(tier-b): build/deploy/repo identity → blue-studio + bluestudio.space

package name, deploy --project-name, astro site URL, GH workflow env +
deploy command, tina GH_REPO + SITE_URL + success-banner string, deploy-
status function REPO + UA, go-live.sh CF + email vars, OG generator
wordmark, env examples, README.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Phase 2 — Edit Tier C (internal labels)

**Goal:** Hygiene pass — internal-only strings (vite plugin name, CSS comments) align with the new identity. Not visible to users; safe to update.

**Files:**
- Modify: `src/integrations/waveform.mjs:65`
- Modify: `src/styles/tokens.css:1`
- Modify: `public/admin-theme.css:1`

- [ ] **Step 1: Update waveform vite plugin name**

Edit `src/integrations/waveform.mjs` line 65:

```js
    name: 'blue-studio:waveform',
```

- [ ] **Step 2: Update tokens.css header comment**

Edit `src/styles/tokens.css` line 1:

```css
/* tokens.css — design tokens for Blue Studio */
```

- [ ] **Step 3: Update admin-theme.css header comment**

Edit `public/admin-theme.css` line 1:

```css
/* Blue Studio — TinaCMS admin theme.
```

(Preserve the rest of the comment block — only change "Studio Marginalia" → "Blue Studio" on the first line.)

- [ ] **Step 4: Sanity-check no Tier C strings remain**

```bash
grep -rn -E "marginalia|Marginalia" \
  src/integrations src/styles public/admin-theme.css 2>/dev/null
```

Expected: **no output**.

- [ ] **Step 5: Commit Tier C**

```bash
git add src/integrations/waveform.mjs src/styles/tokens.css public/admin-theme.css
git commit -m "$(cat <<'EOF'
rename(tier-c): internal labels → blue-studio (vite plugin, CSS comments)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Phase 2 — Regenerate the default OG PNG

**Goal:** The pre-rendered `public/og-default.png` currently shows the `studio·marginalia` wordmark. Regenerate it from the updated `scripts/generate-default-og.mjs` (changed in Task 4) so the new image shows `blue·studio`.

**Files:**
- Modify (regenerated binary): `public/og-default.png`

- [ ] **Step 1: Run the OG generator**

```bash
node scripts/generate-default-og.mjs
```

Expected output: `Wrote public/og-default.png` and no errors.

- [ ] **Step 2: Visually verify the regenerated PNG**

```bash
open public/og-default.png
```

Expected: 1200×630 PNG with `blue·studio` wordmark top-left in italic Fraunces, plum gradient background, "blue studio · 2026" footer in eyebrow caps. If anything looks wrong (e.g. font missing, layout broken), debug `scripts/generate-default-og.mjs` before committing.

- [ ] **Step 3: Commit the regenerated PNG**

```bash
git add public/og-default.png
git commit -m "$(cat <<'EOF'
rename(tier-d): regenerate public/og-default.png with blue·studio wordmark

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Phase 2 — Local sanity build, push branch

**Goal:** Catch any typos, missing imports, or broken type references before merging. A green local build is the gate to the cutover phase.

**Files:** None (verification + push)

- [ ] **Step 1: Run a local production build**

```bash
pnpm build
```

Expected: builds successfully, no TypeScript errors, no missing-image warnings. If the build fails, read the error carefully — most likely cause is a missed string somewhere or a hyphen-vs-camelCase typo. Fix and re-run.

- [ ] **Step 2: Spot-check the built HTML for stale brand strings**

```bash
grep -rn -E "marginalia|Marginalia" dist/ 2>/dev/null | grep -v "src/content" | head -20
```

Expected: only matches inside `dist/journal/notes-from-the-build/01-the-brief/` and `dist/about/` (those come from body markdown which we're intentionally leaving). If you see any other matches, it means a source file was missed — go back and fix.

- [ ] **Step 3: Spot-check that the new strings are present in built HTML**

```bash
grep -l "Blue Studio" dist/index.html dist/about/index.html 2>/dev/null
grep -l "blue·studio" dist/index.html 2>/dev/null
```

Expected: both grep commands return at least one filename. If empty, build cached an old version — try `rm -rf dist && pnpm build`.

- [ ] **Step 4: Push the rename branch to GitHub**

```bash
git push -u origin rename-bluestudio
```

This creates the remote branch on the renamed repo (`NickCason/blue-studio`). No deploy fires from a branch push (only `main` triggers the workflow).

---

## Task 8: Phase 3 — Cutover (PR merge, .env.local, Pages project create + secrets)

**Goal:** Ship the rename to production by merging the branch, updating Nick's local env, and either letting GH Actions create the new Pages project on first deploy or manually creating it via wrangler.

**Files:**
- Modify: `.env.local` (Nick, manual — gitignored)
- External: open + merge PR `rename-bluestudio` → `main`
- External: ensure `blue-studio` Cloudflare Pages project exists with secrets

- [ ] **Step 1: ORCHESTRATOR PAUSE — confirm Cloudflare DNS for bluestudio.space is active**

Before merging, the orchestrator MUST verbosely ask Nick:

> "Before we merge the rename PR, we need to confirm that `bluestudio.space` is live in Cloudflare. You set up the GoDaddy nameserver swap earlier — has Cloudflare emailed you the 'Welcome to Cloudflare' confirmation yet?
>
> If yes: proceed.
>
> If not yet: we can verify ourselves. Run:
>
> ```bash
> dig NS bluestudio.space +short
> ```
>
> Expected: two `*.ns.cloudflare.com` lines. If you still see GoDaddy nameservers, DNS hasn't propagated — wait 5–15 more minutes and re-check.
>
> Tell me when Cloudflare DNS is active."

Wait for confirmation.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --base main --head rename-bluestudio \
  --title "Rename: Studio Marginalia → Blue Studio" \
  --body "$(cat <<'EOF'
## Summary

- Wordmark, page titles, RSS, OG: all show `blue·studio` / `Blue Studio`
- Build/deploy identity: package name, astro site URL, GH workflow, tina config, deploy-status function, go-live.sh, env examples, README all updated
- Internal labels: vite plugin name, CSS comment headers
- Regenerated `public/og-default.png` with new wordmark
- Body prose in `src/content/*` intentionally NOT touched (Nick re-authors via Tina)
- Historical specs/plans in `docs/` intentionally NOT touched

## Test plan

- [ ] `pnpm build` succeeds locally (verified before push)
- [ ] After merge: GH Actions deploy runs against new `blue-studio` Pages project
- [ ] `https://bluestudio.space` returns 200 once custom domain is wired
- [ ] Wordmark, `<title>`, RSS title, canonical URL all show new brand on production
- [ ] Tina admin loads at `/admin`, can author + publish

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Note the PR URL the command returns.

- [ ] **Step 3: Merge the PR**

```bash
gh pr merge --merge --delete-branch
```

(Use `--merge` not `--squash` — keeps the per-tier commits visible in main's history, which is useful for understanding the rename diff later.)

- [ ] **Step 4: ORCHESTRATOR PAUSE — Nick updates .env.local**

The orchestrator MUST verbosely walk Nick through this:

> "The rename is now on main. Two things to do in parallel:
>
> **A) Update your local `.env.local`** (gitignored, can't be done from the repo). Open it in your editor and change two lines:
>
> ```
> PUBLIC_SITE_URL=https://bluestudio.space
> PUBLIC_CONTACT_EMAIL=hello@bluestudio.space
> ```
>
> **B) Check whether you want me to create the new Pages project via wrangler now**, or whether GH Actions will create it automatically when the merge fires. Two paths:
>
> - **Auto-create via GH Actions** (default): the workflow on `main` runs `wrangler pages deploy --project-name=blue-studio` which auto-creates the project on first deploy. Risk: if the secrets aren't already in the new project's env vars, the build will succeed but Tina/Formspree at runtime will fail. We'd need to add secrets after the first deploy.
>
> - **Pre-create via dashboard** (safer): you create the project manually in the Cloudflare dashboard first, copy over the env vars from the old `studio-marginalia` project, THEN trigger a deploy. Cleaner first-deploy.
>
> Which do you want? Tell me when `.env.local` is updated and which path you've chosen."

Wait for both confirmations.

- [ ] **Step 5: If "pre-create via dashboard" was chosen — walk Nick through it**

If Nick chose pre-create, the orchestrator says:

> "Open https://dash.cloudflare.com → Workers & Pages → **Create** → **Pages** → **Connect to Git** → pick `NickCason/blue-studio`. Build command: `pnpm build`, output directory: `dist`, root: `/`. Production branch: `main`.
>
> Before the first build runs, click **Settings → Environment variables → Production** and add these (copy values from the old `studio-marginalia` project's env vars page):
>
> - `TINA_PUBLIC_CLIENT_ID`
> - `TINA_TOKEN`
> - `PUBLIC_FORMSPREE_ENDPOINT`
> - `PUBLIC_SITE_URL` = `https://bluestudio.space`
> - `PUBLIC_CONTACT_EMAIL` = `hello@bluestudio.space`
> - `GH_TOKEN` (if you had a GitHub PAT for the deploy-status function)
>
> Save. Then trigger a manual deploy from the Deployments tab. Tell me when the deploy succeeds (or fails)."

Wait for confirmation.

- [ ] **Step 6: If "auto-create via GH Actions" was chosen — monitor the deploy**

If Nick chose auto-create, the merge from Step 3 will trigger the workflow. The orchestrator says:

> "Watch the workflow run at https://github.com/NickCason/blue-studio/actions. The first run will create the new `blue-studio` Pages project automatically. Tell me when it succeeds.
>
> After it succeeds, you'll need to add the env vars (TINA_*, PUBLIC_FORMSPREE_ENDPOINT, etc.) in the new Pages project's Settings → Environment variables, then trigger a redeploy so the production runtime config is correct. Same vars as the pre-create path above."

Wait for confirmation, then walk through env-var copy as above.

- [ ] **Step 7: Verify the new Pages preview URL is live**

```bash
curl -sI https://blue-studio.pages.dev | head -3
```

Expected: `HTTP/2 200`, `server: cloudflare`. The site is live on the Pages preview URL even before the custom domain is wired (Task 9).

---

## Task 9: Phase 4 — Wire bluestudio.space custom domain to Pages project (Nick, manual)

**Goal:** Attach `bluestudio.space` and `www.bluestudio.space` to the new `blue-studio` Pages project. Cloudflare auto-provisions the SSL cert.

**Files:** None (external operation)

- [ ] **Step 1: ORCHESTRATOR PAUSE — walk Nick through the custom domain wiring**

The orchestrator MUST verbosely guide Nick:

> "Last manual step. Open https://dash.cloudflare.com → **Workers & Pages** → click **`blue-studio`** → **Custom domains** tab → **Set up a custom domain**.
>
> 1. Enter `bluestudio.space` → Continue → Activate. Cloudflare auto-creates the required CNAME record in the bluestudio.space DNS zone you set up earlier.
> 2. Click **Set up a custom domain** again, enter `www.bluestudio.space` → Continue → Activate.
> 3. Both domains will show status **Verifying** then **Active** within ~2–10 min as the SSL cert provisions.
>
> Tell me when both show Active with a green checkmark."

Wait for confirmation.

- [ ] **Step 2: Verify the canonical URL serves the site**

```bash
curl -sI https://bluestudio.space | head -3
curl -sI https://www.bluestudio.space | head -3
```

Expected for both: `HTTP/2 200`, `server: cloudflare`. If you get `525 SSL handshake failed`, the cert isn't ready yet — wait 2 more minutes and retry. If you get `404`, the custom domain isn't pointed at the Pages project — re-check the dashboard.

- [ ] **Step 3: Browser smoke test**

Nick opens `https://bluestudio.space` in his browser. Verify:
- Wordmark in the nav reads `blue·studio` (italic, with amethyst middle-dot)
- Page renders normally (cat beds in the footer, content visible)
- Browser tab title says "Blue Studio — Nina Pfeiffer"
- View page source: `<link rel="canonical" href="https://bluestudio.space/">` and `<title>Blue Studio — Nina Pfeiffer</title>`

---

## Task 10: Phase 5 — Verify, update memory, mark complete

**Goal:** Final acceptance check against spec criteria. Update Nick's auto-memory with the new repo/URL/Pages-project names so future sessions don't reference the old identity.

**Files:**
- Verify: production deploy
- Modify: `/Users/nickcason/.claude/projects/-Users-nickcason-DevSpace-Personal/memory/MEMORY.md` and possibly create new memory file `project_blue_studio.md`

- [ ] **Step 1: Run all acceptance checks from the spec**

For each check, run the command or describe the manual check, and note pass/fail:

```bash
# 1. Build succeeds (already verified Task 7)
echo "Build ✓ (verified in Task 7)"

# 2. No "marginalia" in rendered HTML (excluding body content)
curl -s https://bluestudio.space/ | grep -i marginalia
# Expected: no output

# 3. <title> on home page
curl -s https://bluestudio.space/ | grep -oE "<title>[^<]+</title>"
# Expected: <title>Blue Studio — Nina Pfeiffer</title>

# 4. Canonical link
curl -s https://bluestudio.space/ | grep -oE 'rel="canonical" href="[^"]+"'
# Expected: rel="canonical" href="https://bluestudio.space/"

# 5. RSS feed title
curl -s https://bluestudio.space/rss.xml | grep -oE "<title>[^<]+</title>" | head -1
# Expected: <title>Blue Studio</title>

# 6. OG default image (visual — open in browser)
open https://bluestudio.space/og-default.png

# 7. SSL cert valid
curl -sI https://bluestudio.space | grep -i strict-transport-security
# Expected: a strict-transport-security header line

# 8. Tina admin loads (manual browser check)
echo "Open https://bluestudio.space/admin and verify it loads + can authenticate"
```

If any check fails, debug before declaring complete.

- [ ] **Step 2: Update auto-memory**

Read `/Users/nickcason/.claude/projects/-Users-nickcason-DevSpace-Personal/memory/MEMORY.md` and the existing `project_marginalia_desk_companion.md`.

Create new memory file `/Users/nickcason/.claude/projects/-Users-nickcason-DevSpace-Personal/memory/project_blue_studio.md`:

```markdown
---
name: Blue Studio project context
description: Personal/business site (formerly Studio Marginalia); Astro + Tina + Cloudflare Pages
type: project
---

Nick's personal site. Lives at `~/DevSpace/Personal/studio-marginalia/` (directory name unchanged).

- **Brand:** Blue Studio (renamed from Studio Marginalia on 2026-05-06).
- **GitHub:** `NickCason/blue-studio`. Old `NickCason/studio-marginalia` URL 301-redirects.
- **Canonical URL:** https://bluestudio.space (custom domain). Pages preview URL: https://blue-studio.pages.dev.
- **Old URL:** https://studio-marginalia.pages.dev (still live until manually deleted).
- **Email:** hello@bluestudio.space.
- **Stack:** Astro 5, TinaCMS, Cloudflare Pages, GitHub Actions deploy.
- **Visual identity:** unchanged from original Studio Marginalia spec — plum/amethyst palette, Fraunces italic wordmark with middle-dot. Only the name changed.
- **Body prose** in `src/content/pages/about.md` and `src/content/posts/notes-from-the-build/01-the-brief.md` still says "Studio Marginalia" — Nick re-authors via Tina post-merge.
- **Historical specs/plans** in `docs/superpowers/` keep their original "Studio Marginalia" titles deliberately (frozen artifacts of past work).

**How to apply:** Reference Blue Studio + bluestudio.space + blue-studio Pages project in any future work on this site. Don't recreate the rename — it's done.
```

Update `MEMORY.md` to add the new memory and remove the now-stale desk-companion entry (since that work also shipped):

Read the current MEMORY.md, then add this line:
```
- [Blue Studio project context](project_blue_studio.md) — site formerly Studio Marginalia; Astro+Tina+CF Pages at bluestudio.space
```

And update the desk-companion line from "ready to port to Astro when Nick is" → "shipped on 2026-05-06 in the Blue Studio rename".

- [ ] **Step 3: ORCHESTRATOR REPORT — declare completion**

The orchestrator MUST verbosely tell Nick:

> "Blue Studio rename complete and live at https://bluestudio.space. Acceptance checks all green:
>
> - Wordmark, page titles, RSS, OG: ✓
> - Build/deploy identity, repo rename: ✓
> - Custom domain + SSL: ✓
> - Tina admin still works: [confirm with Nick]
>
> **Open follow-ups (NOT this work, do whenever):**
> - Re-author body prose in about.md / 01-the-brief.md via Tina admin to remove the last "Studio Marginalia" mentions
> - Delete the old `studio-marginalia` Cloudflare Pages project after a confidence period (~2 weeks)
> - Set up `hello@bluestudio.space` email forwarding/server (currently the address is displayed but not handled)
> - Decide apex vs www canonical and add a Cloudflare Bulk Redirect if you want one to 301 to the other
>
> Nice work."

Wait for Nick's acknowledgement, then close out the rename effort.

---

## Self-review

**Spec coverage:**
- Naming canon → Tasks 3, 4, 5 (Tier A/B/C edits) — ✓
- Tier A file inventory (13 files) → Task 3 — ✓
- Tier B file inventory (10 files) → Task 4 — ✓
- Tier C file inventory (3 files) → Task 5 — ✓
- Tier D regenerated PNG → Task 6 — ✓
- Tier E local .env.local → Task 8 Step 4 (orchestrator pause) — ✓
- External walkthrough 5.1 (GH rename) → Task 2 — ✓
- External walkthrough 5.2 (Cloudflare DNS / GoDaddy nameservers) → Task 8 Step 1 (verify already-done) — ✓
- External walkthrough 5.3 (new Pages project + secrets) → Task 8 Steps 5–6 — ✓
- External walkthrough 5.4 (custom domain wiring) → Task 9 — ✓
- External walkthrough 5.5 (cleanup deferred) → Task 10 Step 3 (mentioned as follow-up) — ✓
- Sequence Phase 0 → Task 1 — ✓
- Sequence Phase 1 → Task 2 — ✓
- Sequence Phase 2 → Tasks 3–7 — ✓
- Sequence Phase 3 → Task 8 — ✓
- Sequence Phase 4 → Task 9 — ✓
- Sequence Phase 5 → Task 10 — ✓
- Sequence Phase 6 (cleanup) → mentioned as out-of-scope follow-up — ✓
- Acceptance criteria → Task 10 Step 1 — ✓
- Out-of-scope (body prose, historical docs) → preserved in Task 3 sanity grep filters and Task 4 Step 9 grep filter — ✓

**Placeholder scan:**
- No "TBD", "TODO", "implement later" — ✓
- No "similar to Task N" — each task is self-contained with full code — ✓
- All steps have either a complete command or complete code block — ✓

**Type / string consistency:**
- "Blue Studio" (display) vs "blue·studio" (wordmark) vs "blue-studio" (slug) used consistently per the canon table in the spec — ✓
- `https://bluestudio.space` (no www) used consistently as canonical site URL — ✓
- `hello@bluestudio.space` consistent — ✓
- File line numbers cross-referenced against actual reads done before plan was written — ✓

Plan is self-consistent and covers the spec.
