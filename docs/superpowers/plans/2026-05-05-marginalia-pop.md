# Studio Marginalia — Pop Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship eight additive enhancements to deepen interactivity and visual identity: portfolio detail pages, editable about page, tag rendering + filter routes, portfolio tile hover, quote/note visual upgrade, photo lightbox, journal scroll-reveal, and build-time OG image generation.

**Architecture:** Pure additive changes to the existing Astro 5 + TinaCMS site. One new content collection (`pages`), two new dependencies (`satori`, `@resvg/resvg-js`), one new font asset, several new components and routes. No schema breaks, no migrations, no infra changes. All changes deploy through the same atomic GitHub Actions → Cloudflare Pages flow.

**Tech Stack:** Astro 5, TinaCMS 3.7.5, `satori` (JSX → SVG renderer at build time), `@resvg/resvg-js` (SVG → PNG, ~ smaller than `sharp`), Phosphor icons. No tests in active use; verification is manual via `pnpm dev` and astro check.

**Spec:** `docs/superpowers/specs/2026-05-05-marginalia-pop-design.md`

---

## File Structure

**Create:**
- `src/pages/work/portfolio/[slug].astro` — portfolio detail route with `getStaticPaths`.
- `src/content/pages/about.md` — port of current about-page prose to a content entry.
- `src/components/ui/Tag.astro` — reusable tag pill.
- `src/components/ui/TagList.astro` — wraps multiple tags with consistent gap.
- `src/pages/journal/tag/[tag].astro` — tag-filter route.
- `src/components/PhotoLightbox.astro` — fullscreen photo overlay component.
- `src/lib/slugifyTag.ts` — single canonical place to slugify tags.
- `src/pages/og/[slug].png.ts` — build-time OG image endpoint.
- `src/lib/og/render.tsx` — JSX layout for the OG image (rendered by satori).
- `public/fonts/Fraunces-Italic.woff2` — single Fraunces variable italic file for the OG renderer (~80kb, downloaded fresh during this work).
- `public/og-default.png` — site-wide default OG image (generated as part of this work and committed).

**Modify:**
- `src/content/config.ts` — add `pages` collection schema; export it.
- `tina/config.ts` — register the `pages` collection (singleton-style, no create/delete).
- `src/pages/about.astro` — fetch entry from `pages` collection, render `<Content />`.
- `src/pages/work/portfolio/index.astro` — wrap each tile in `<a>` to detail page; add hover styles.
- `src/pages/work/index.astro` — wrap teaser tiles in `<a>` (or update existing wrapper); add hover styles.
- `src/components/post-types/PhotoCard.astro` — add `data-photo-lightbox` attribute on the image; remove the wrapping `<a>` (lightbox replaces it).
- `src/components/post-permalinks/PhotoPage.astro` — add `data-photo-lightbox` attribute on the image.
- `src/components/post-types/QuoteCard.astro`, `NoteCard.astro` — visual upgrade.
- `src/components/post-permalinks/QuotePage.astro`, `NotePage.astro` — visual upgrade.
- `src/components/post-types/EssayCard.astro`, `LinkCard.astro`, `PhotoCard.astro`, `AudioCard.astro` — render `<TagList tags={post.data.tags} />` below meta row.
- `src/components/post-permalinks/EssayPage.astro`, `LinkPage.astro`, `PhotoPage.astro`, `AudioPage.astro` — render `<TagList />` above body.
- `src/layouts/Base.astro` — include `<PhotoLightbox />`; accept optional `ogImage` prop and emit `<meta property="og:image">`.
- `src/pages/index.astro` — add scroll-reveal behavior (CSS class + IntersectionObserver script).
- `src/pages/journal/[...slug].astro` — pass slug into Base for OG image.
- `package.json` — add `satori`, `@resvg/resvg-js` dependencies.

**Tests:** None added. Manual verification per task.

---

## Task 1: Portfolio detail pages (item A)

**Files:**
- Create: `src/pages/work/portfolio/[slug].astro`
- Modify: `src/pages/work/portfolio/index.astro` (wrap tiles in `<a>`)
- Modify: `src/pages/work/index.astro` (wrap teaser tiles in `<a>`)

- [ ] **Step 1: Read current portfolio index and a portfolio entry**

Read `src/pages/work/portfolio/index.astro`, `src/pages/work/index.astro` (focus on the `.selected-work` section), and one entry like `src/content/portfolio/florae.md` to confirm the shape of `body` content available via `<Content />`.

- [ ] **Step 2: Create the detail route**

Write `src/pages/work/portfolio/[slug].astro`:

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '~/layouts/Base.astro';

export async function getStaticPaths() {
  const cases = await getCollection('portfolio');
  return cases.map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));
}

interface Props { entry: CollectionEntry<'portfolio'>; }
const { entry } = Astro.props;
const { Content } = await entry.render();

// Compute prev/next for footer nav (sorted by order then year-desc, same as index)
const all = (await getCollection('portfolio'))
  .sort((a, b) => (a.data.order - b.data.order) || (b.data.year - a.data.year));
const idx = all.findIndex((e) => e.slug === entry.slug);
const prev = idx > 0 ? all[idx - 1] : null;
const next = idx < all.length - 1 ? all[idx + 1] : null;

const heroStyle = entry.data.image
  ? `background-image:url(${entry.data.image});background-size:cover;background-position:center;`
  : 'background:linear-gradient(135deg,var(--np-rose),var(--np-amethyst));';
---
<Base title={`${entry.data.name} — Studio Marginalia`} description={entry.data.pitch}>
  <article class="case">
    <div class="hero" style={heroStyle} aria-hidden="true"></div>
    <div class="body-wrap">
      <div class="eyebrow">{entry.data.year} · {entry.data.serviceCategory}</div>
      <h1 class="hed serif-italic">{entry.data.name}</h1>
      <p class="pitch serif-italic">{entry.data.pitch}</p>
      <div class="prose serif"><Content /></div>
      {entry.data.externalUrl && (
        <a class="visit" href={entry.data.externalUrl} target="_blank" rel="noopener">
          Visit live <i class="ph-duotone ph-arrow-up-right"></i>
        </a>
      )}
      <nav class="case-nav">
        {prev ? (
          <a class="case-nav-link prev" href={`/work/portfolio/${prev.slug}/`}>
            <i class="ph-bold ph-arrow-left"></i>
            <span class="label">Previous</span>
            <span class="name serif-italic">{prev.data.name}</span>
          </a>
        ) : <span></span>}
        <a class="case-nav-link all" href="/work/portfolio/">All work</a>
        {next ? (
          <a class="case-nav-link next" href={`/work/portfolio/${next.slug}/`}>
            <span class="label">Next</span>
            <span class="name serif-italic">{next.data.name}</span>
            <i class="ph-bold ph-arrow-right"></i>
          </a>
        ) : <span></span>}
      </nav>
    </div>
  </article>
</Base>

<style>
  .case { padding: 0; }
  .hero {
    width: 100%;
    height: clamp(280px, 50vh, 480px);
    border-bottom: 1px solid var(--border-soft);
    margin-bottom: 56px;
  }
  .body-wrap { max-width: 64ch; margin: 0 auto; padding: 0 36px 96px; }
  .eyebrow {
    font-size: var(--fs-meta);
    letter-spacing: var(--tracking-meta);
    text-transform: uppercase;
    color: var(--accent-text);
    margin-bottom: 16px;
  }
  .hed {
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.05;
    margin: 0 0 16px;
    font-weight: 400;
    font-variation-settings: 'SOFT' 100, 'opsz' 144;
  }
  .pitch {
    font-size: clamp(1.125rem, 2vw, 1.375rem);
    color: var(--fg-soft);
    margin: 0 0 32px;
    line-height: 1.4;
  }
  .prose { font-size: 17px; line-height: 1.7; }
  .prose :global(p) { margin: 0 0 1em; }
  .visit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    padding: 12px 24px;
    border: 1px solid var(--accent);
    border-radius: var(--r-pill);
    color: var(--fg);
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .visit:hover { background: var(--accent); color: var(--np-ink); }

  .case-nav {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 16px;
    align-items: center;
    margin-top: 64px;
    padding-top: 32px;
    border-top: 1px dashed var(--border-dashed);
    font-size: 12px;
  }
  .case-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--fg-soft);
  }
  .case-nav-link.next { justify-self: end; text-align: right; }
  .case-nav-link.all { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent-text); border-bottom: 1px dotted var(--accent-text); padding-bottom: 2px; }
  .case-nav-link .label { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.7; margin: 0 4px; }
  .case-nav-link .name { color: var(--fg); }
  .case-nav-link:hover .name { color: var(--accent-text); }
  @media (max-width: 640px) {
    .body-wrap { padding: 0 20px 64px; }
    .case-nav { grid-template-columns: 1fr; gap: 20px; text-align: center; }
    .case-nav-link.next { justify-self: start; text-align: left; }
  }
</style>
```

- [ ] **Step 3: Wrap portfolio index tiles in `<a>`**

In `src/pages/work/portfolio/index.astro`, the tile rendering already uses `<a>` when `externalUrl` exists and `<div>` otherwise. Replace the entire `cases.map(...)` ternary so EVERY tile is an `<a>` pointing to `/work/portfolio/<slug>/` (the detail page). The `externalUrl` is now used inside the detail page only — not on the tile.

Replace lines 12–37 of the existing file with:

```astro
      {cases.map((c) => {
        const styleStr = c.data.image
          ? `background-image:url(${c.data.image});background-size:cover;background-position:center;`
          : 'background:linear-gradient(135deg,var(--np-rose),var(--np-amethyst));';
        return (
          <a class="case" href={`/work/portfolio/${c.slug}/`}>
            <div class="img" style={styleStr}></div>
            <div class="body">
              <div class="meta">{c.data.year} · {c.data.serviceCategory}</div>
              <h3 class="name serif-italic">{c.data.name}</h3>
              <p class="pitch">{c.data.pitch}</p>
            </div>
          </a>
        );
      })}
      {cases.length === 0 && <p class="empty serif-italic">Case studies coming soon.</p>}
```

(Hover styles for `.case` are already in place — task 4 will enrich them.)

- [ ] **Step 4: Wrap /work/ teaser tiles in `<a>`**

In `src/pages/work/index.astro`, the `selected-work` section currently uses `<div class="tile">`. Change to `<a class="tile" href={`/work/portfolio/${c.slug}/`}>` (preserve everything inside the tile unchanged).

- [ ] **Step 5: Verify**

```bash
pnpm exec astro check
```

Expected: 0 errors. The dynamic route should generate one page per portfolio entry.

- [ ] **Step 6: Commit**

```bash
git add src/pages/work
git commit -m "feat(portfolio): add per-entry detail pages and link tiles to them"
```

---

## Task 2: About page editable in Tina (item B)

**Files:**
- Modify: `src/content/config.ts`
- Create: `src/content/pages/about.md`
- Modify: `src/pages/about.astro`
- Modify: `tina/config.ts`

- [ ] **Step 1: Add `pages` collection to Astro content config**

In `src/content/config.ts`, before the `export const collections = ...` line, add:

```ts
const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    dek: z.string().optional(),
  }),
});
```

Then add `pages` to the export:

```ts
export const collections = { posts, portfolio, now, noticing, site, pages };
```

- [ ] **Step 2: Port the about page body to a content entry**

Read the current `src/pages/about.astro` to capture the exact prose. Create `src/content/pages/about.md` with the prose ported to markdown:

```markdown
---
title: A few things to know.
---

I'm Nina Pfeiffer. *Studio Marginalia* is the name I write under and the name I work under — two halves of the same project, kept under one roof on purpose.

This site is mostly a journal. Some weeks it's a paragraph; some months it's a 2,000-word essay. There's also a small library of [selected work](/work/portfolio/) from the marketing side of the studio, and a [page about working together](/work/) if you came here looking for that.

I write quietly. The brief is "lived-in, not influencer-perfect." If you've found this and stuck around, I'm probably writing for you.

*— Nina*
```

Note: the trailing `*— Nina*` line replaces the JSX `<p class="sig serif-italic">— Nina</p>` and inherits italic styling via markdown emphasis. The `.sig` color override is preserved by adding a `.prose .sig` class IF needed — but the simpler path is to drop the special class and let the trailing italic line carry its own styling. We'll handle this in step 3.

- [ ] **Step 3: Rewrite about.astro to render the content entry**

Replace the entire file body with:

```astro
---
import { getEntry } from 'astro:content';
import Base from '~/layouts/Base.astro';

const entry = await getEntry('pages', 'about');
if (!entry) throw new Error('Missing src/content/pages/about.md');
const { Content } = await entry.render();
const { title, dek } = entry.data;
---
<Base title={`${title} — Studio Marginalia`}>
  <section class="page">
    <h1 class="hed serif-italic">{title}</h1>
    {dek && <p class="dek serif-italic">{dek}</p>}
    <div class="prose serif">
      <Content />
    </div>
  </section>
</Base>
<style>
  .page { padding: 64px 56px 96px; max-width: 64ch; margin: 0 auto; }
  .hed { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin: 0 0 32px; font-weight: 400; }
  .dek { font-size: 1.125rem; color: var(--fg-soft); margin: -16px 0 32px; line-height: 1.5; }
  .prose { font-size: 18px; line-height: 1.75; }
  .prose :global(p) { margin: 0 0 1.2em; }
  .prose :global(em) { color: var(--accent); }
  .prose :global(a) { color: var(--accent); border-bottom: 1px dotted var(--accent); }
  /* Last paragraph styled as signature */
  .prose :global(p:last-child) { color: var(--accent); font-size: 22px; margin-top: 1em; }
  @media (max-width: 640px) { .page { padding: 40px 20px 64px; } }
</style>
```

The `:global(p:last-child)` rule preserves the signature styling without needing a special class on the rendered markdown.

- [ ] **Step 4: Add the `pages` collection to Tina config**

In `tina/config.ts`, find the `schema.collections` array (it ends with the `site` collection block). Insert this new collection right after `site` (so the admin sidebar shows it logically grouped with site config):

```ts
{
  name: 'pages',
  label: 'Static pages',
  path: 'src/content/pages',
  format: 'md',
  ui: { allowedActions: { create: false, delete: false } },
  fields: [
    { type: 'string', name: 'title', label: 'Page title', required: true },
    { type: 'string', name: 'dek', label: 'Subtitle (optional)' },
    { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
  ],
},
```

- [ ] **Step 5: Verify build**

```bash
pnpm exec astro check
pnpm exec tinacms build --skip-cloud-checks
```

Expected: both succeed. Tina rebuild generates updated `tina/__generated__/` files.

- [ ] **Step 6: Commit**

```bash
git add src/content/config.ts src/content/pages src/pages/about.astro tina/config.ts tina/__generated__
git commit -m "feat(cms): make about page editable via new pages collection in Tina"
```

---

## Task 3: Tag rendering + filter route (item 3)

**Files:**
- Create: `src/lib/slugifyTag.ts`
- Create: `src/components/ui/Tag.astro`
- Create: `src/components/ui/TagList.astro`
- Create: `src/pages/journal/tag/[tag].astro`
- Modify: `src/components/post-types/EssayCard.astro`, `LinkCard.astro`, `PhotoCard.astro`, `AudioCard.astro`
- Modify: `src/components/post-permalinks/EssayPage.astro`, `LinkPage.astro`, `PhotoPage.astro`, `AudioPage.astro`

- [ ] **Step 1: Create the slugify helper**

Write `src/lib/slugifyTag.ts`:

```ts
// Single canonical slugifier for tag URLs.
// "Brand Voice" → "brand-voice". Stable across all consumers.
export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
```

- [ ] **Step 2: Create the Tag pill component**

Write `src/components/ui/Tag.astro`:

```astro
---
import { slugifyTag } from '~/lib/slugifyTag';
interface Props { tag: string; }
const { tag } = Astro.props;
---
<a class="tag" href={`/journal/tag/${slugifyTag(tag)}/`}>#{tag}</a>
<style>
  .tag {
    display: inline-block;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent-text);
    border-bottom: 1px dotted var(--accent-text);
    padding: 2px 0;
    transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
    opacity: 0.85;
  }
  .tag:hover { opacity: 1; color: var(--fg); border-bottom-color: var(--fg); }
</style>
```

- [ ] **Step 3: Create the TagList component**

Write `src/components/ui/TagList.astro`:

```astro
---
import Tag from './Tag.astro';
interface Props { tags?: readonly string[] | string[]; }
const { tags } = Astro.props;
---
{tags && tags.length > 0 && (
  <div class="tag-list">
    {tags.map((t) => <Tag tag={t} />)}
  </div>
)}
<style>
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    margin-top: 12px;
  }
</style>
```

- [ ] **Step 4: Render TagList on the four card types that should show tags**

In each of `EssayCard.astro`, `LinkCard.astro`, `PhotoCard.astro`, `AudioCard.astro`:

1. Add the import near the top of the frontmatter:
   ```astro
   import TagList from '~/components/ui/TagList.astro';
   ```
2. Insert `<TagList tags={post.data.tags} />` immediately after the existing `<MetaRow ... />` line (or, in `AudioCard`, after the `.title-link` block and before the `.dur` div — wherever sits cleanly visually; pick the location that matches the post-type card structure).

For each file, place the TagList where it reads as part of the meta strip rather than competing with the body.

- [ ] **Step 5: Render TagList on permalinks**

In each of `EssayPage.astro`, `LinkPage.astro`, `PhotoPage.astro`, `AudioPage.astro`:

1. Add the same import.
2. Render `<TagList tags={post.data.tags} />` after the date eyebrow but before the body content.

(`NotePage` and `QuotePage` are intentionally skipped — those types stay sparse per spec.)

- [ ] **Step 6: Create the tag-filter route**

Write `src/pages/journal/tag/[tag].astro`:

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '~/layouts/Base.astro';
import EssayCard from '~/components/post-types/EssayCard.astro';
import NoteCard from '~/components/post-types/NoteCard.astro';
import QuoteCard from '~/components/post-types/QuoteCard.astro';
import LinkCard from '~/components/post-types/LinkCard.astro';
import PhotoCard from '~/components/post-types/PhotoCard.astro';
import AudioCard from '~/components/post-types/AudioCard.astro';
import { slugifyTag } from '~/lib/slugifyTag';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  // Build a tag → original-display-name map; one route per unique slug.
  const seen = new Map<string, string>(); // slug → display
  for (const post of posts) {
    const tags = (post.data as { tags?: string[] }).tags ?? [];
    for (const t of tags) seen.set(slugifyTag(t), t);
  }
  return Array.from(seen.entries()).map(([slug, display]) => ({
    params: { tag: slug },
    props: { display, posts: posts.filter((p) => {
      const ts = (p.data as { tags?: string[] }).tags ?? [];
      return ts.some((t) => slugifyTag(t) === slug);
    }).sort((a, b) => +b.data.publishedAt - +a.data.publishedAt) },
  }));
}

interface Props { display: string; posts: CollectionEntry<'posts'>[]; }
const { display, posts } = Astro.props;
---
<Base title={`Tagged: ${display} — Studio Marginalia`}>
  <section class="tag-feed">
    <a class="back" href="/">← All posts</a>
    <h1 class="hed serif-italic">Tagged: <em>{display}</em></h1>
    <p class="meta">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
    <div class="feed">
      {posts.map((post) => {
        switch (post.data.type) {
          case 'essay': return <EssayCard post={post} />;
          case 'note':  return <NoteCard post={post} />;
          case 'quote': return <QuoteCard post={post} />;
          case 'link':  return <LinkCard post={post} />;
          case 'photo': return <PhotoCard post={post} />;
          case 'audio': return <AudioCard post={post} />;
        }
      })}
    </div>
  </section>
</Base>
<style>
  .tag-feed { padding: 48px 36px 80px; max-width: 720px; margin: 0 auto; }
  .back { display: inline-block; font-size: var(--fs-meta); letter-spacing: var(--tracking-meta); text-transform: uppercase; color: var(--accent-text); margin-bottom: 24px; }
  .hed { font-size: clamp(1.75rem, 4vw, 2.5rem); margin: 0 0 8px; font-weight: 400; }
  .hed em { color: var(--accent); font-style: italic; }
  .meta { font-size: var(--fs-meta); letter-spacing: var(--tracking-meta); text-transform: uppercase; color: var(--accent-text); margin: 0 0 40px; }
  .feed { display: flex; flex-direction: column; gap: 56px; }
  @media (max-width: 640px) { .tag-feed { padding: 32px 20px 64px; } }
</style>
```

- [ ] **Step 7: Verify**

```bash
pnpm exec astro check
```

Expected: 0 errors. The dynamic tag route generates one page per unique tag slug.

- [ ] **Step 8: Commit**

```bash
git add src/lib src/components/ui src/components/post-types src/components/post-permalinks src/pages/journal/tag
git commit -m "feat(tags): render tag pills on cards/permalinks; add /journal/tag/<slug>/ filter routes"
```

---

## Task 4: Portfolio tile hover (item 2)

**Files:**
- Modify: `src/pages/work/portfolio/index.astro`, `src/pages/work/index.astro`

- [ ] **Step 1: Update hover styles in `/work/portfolio/index.astro`**

The current `.case` rule has `transition: transform var(--t-fast), box-shadow var(--t-fast);` and an `a.case:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); }`. Replace those with the richer hover.

Edit the existing `.case` rule's transition + replace the `a.case:hover` block:

```css
  .case {
    display: block;
    border-radius: var(--r-lg);
    overflow: hidden;
    border: 1px solid var(--border-soft);
    background: rgba(15,15,20,0.5);
    color: inherit;
    transition: transform 500ms var(--ease), box-shadow 500ms var(--ease), border-color 500ms var(--ease);
    position: relative;
  }
  :root[data-theme='light'] .case { background: rgba(232,228,223,0.5); }
  .case .img {
    height: 180px;
    transition: transform 600ms var(--ease);
    transform-origin: center;
  }
  .case::after {
    content: '→';
    position: absolute;
    bottom: 24px;
    right: 22px;
    font-size: 14px;
    color: var(--accent-text);
    opacity: 0.4;
    transform: translateX(0);
    transition: opacity 300ms var(--ease), transform 300ms var(--ease);
  }
  @media (hover: hover) and (pointer: fine) {
    a.case:hover {
      transform: translateY(-4px);
      box-shadow: 0 18px 40px -12px rgba(110, 90, 138, 0.45);
      border-color: var(--accent);
    }
    a.case:hover .img { transform: scale(1.04); }
    a.case:hover::after { opacity: 1; transform: translateX(4px); }
  }
```

(Note: `.img` styling moved into `.case .img` for the scale transition; the existing `.img { height: 180px; }` rule is now subsumed and should be removed.)

- [ ] **Step 2: Add the same hover pattern to `/work/` teaser tiles**

In `src/pages/work/index.astro`, the `.tile` rule is currently a plain `border-radius` + `border` + `background` shell with no hover. After the existing `.tile` rule, append:

```css
  .tile {
    transition: transform 500ms var(--ease), box-shadow 500ms var(--ease), border-color 500ms var(--ease);
    position: relative;
  }
  .tile-img { transition: transform 600ms var(--ease); transform-origin: center; }
  a.tile { color: inherit; }
  a.tile::after {
    content: '→';
    position: absolute;
    bottom: 14px;
    right: 14px;
    font-size: 12px;
    color: var(--accent-text);
    opacity: 0.4;
    transition: opacity 300ms var(--ease), transform 300ms var(--ease);
  }
  @media (hover: hover) and (pointer: fine) {
    a.tile:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px -10px rgba(110, 90, 138, 0.4);
      border-color: var(--accent);
    }
    a.tile:hover .tile-img { transform: scale(1.04); }
    a.tile:hover::after { opacity: 1; transform: translateX(3px); }
  }
```

- [ ] **Step 3: Verify**

```bash
pnpm exec astro check
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/work
git commit -m "feat(portfolio): hover lift + image zoom + arrow pip on portfolio and teaser tiles"
```

---

## Task 5: Quote / Note visual upgrade (item 5)

**Files:**
- Modify: `src/components/post-types/NoteCard.astro`
- Modify: `src/components/post-types/QuoteCard.astro`
- Modify: `src/components/post-permalinks/NotePage.astro`
- Modify: `src/components/post-permalinks/QuotePage.astro`

- [ ] **Step 1: Read the current four files**

Read each file to capture the existing structure before rewriting.

- [ ] **Step 2: Rewrite `NoteCard.astro`**

Replace the `<style>` block (and adjust the markup minimally) so the note renders as airy serif italic centered between dotted hairlines. Markup should be approximately:

```astro
<article class="note-card">
  <hr class="rule top" aria-hidden="true" />
  <div class="date">{formatRelative(post.data.publishedAt)}</div>
  <a href={`/journal/${post.slug}/`} class="link">
    <blockquote class="body serif-italic"><Content /></blockquote>
  </a>
  <hr class="rule bottom" aria-hidden="true" />
</article>
<style>
  .note-card { padding: 24px 0; text-align: center; }
  .rule { border: none; border-top: 1px dotted var(--rule-dotted); margin: 0; }
  .date { font-size: var(--fs-meta); letter-spacing: var(--tracking-meta); text-transform: uppercase; color: var(--accent-text); margin: 16px 0 18px; }
  .link { color: var(--fg); }
  .body {
    font-size: clamp(1.0625rem, 2.5vw, 1.25rem);
    line-height: 1.5;
    color: var(--fg);
    border-left: none;
    padding: 0 16px;
    margin: 0 0 18px;
    font-variation-settings: 'SOFT' 100, 'opsz' 144;
    font-weight: 300;
  }
  .body :global(p) { margin: 0; }
</style>
```

(Existing imports for `Content`, `formatRelative`, etc. remain the same — preserve them.)

- [ ] **Step 3: Rewrite `NotePage.astro`**

The existing `NotePage` is centered serif italic with no frame. Add the dotted hairline frame to match the card treatment, while keeping the larger size:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { formatDate } from '~/lib/formatDate';
interface Props { post: CollectionEntry<'posts'>; }
const { post } = Astro.props;
if (post.data.type !== 'note') throw new Error();
const { Content } = await post.render();
---
<article class="permalink note-perma">
  <hr class="rule" aria-hidden="true" />
  <div class="date eyebrow">{formatDate(post.data.publishedAt)}</div>
  <blockquote class="body serif-italic"><Content /></blockquote>
  <hr class="rule" aria-hidden="true" />
</article>
<style>
  .permalink { padding: 64px 0 80px; max-width: 60ch; margin: 0 auto; text-align: center; }
  .rule { border: none; border-top: 1px dotted var(--rule-dotted); margin: 0; }
  .date { margin: 24px 0 28px; }
  .body {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    line-height: 1.5;
    color: var(--fg);
    border-left: none;
    padding: 0;
    margin: 0 0 28px;
    font-variation-settings: 'SOFT' 100, 'opsz' 144;
    font-weight: 300;
  }
  .body :global(p) { margin: 0 0 1em; }
</style>
```

- [ ] **Step 4: Rewrite `QuoteCard.astro`**

Render with a large `❝` glyph above and an em-dash attribution beneath:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { formatRelative } from '~/lib/formatDate';

interface Props { post: CollectionEntry<'posts'>; }
const { post } = Astro.props;
if (post.data.type !== 'quote') throw new Error('QuoteCard requires quote post');
const { Content } = await post.render();
---
<article class="quote-card">
  <div class="orn" aria-hidden="true">❝</div>
  <a href={`/journal/${post.slug}/`} class="link">
    <blockquote class="body serif-italic"><Content /></blockquote>
  </a>
  <div class="attribution">
    — {post.data.sourceUrl
      ? <a href={post.data.sourceUrl} target="_blank" rel="noopener" class="src serif-italic">{post.data.source}</a>
      : <span class="src serif-italic">{post.data.source}</span>}
    <span class="date">· {formatRelative(post.data.publishedAt)}</span>
  </div>
</article>
<style>
  .quote-card { padding: 32px 8px; text-align: center; }
  .orn { font-size: 36px; color: var(--accent-text); line-height: 1; margin-bottom: 12px; opacity: 0.85; font-family: 'Fraunces Variable', Georgia, serif; }
  .link { color: var(--fg); }
  .body {
    font-size: clamp(1.125rem, 2.5vw, 1.5rem);
    line-height: 1.45;
    color: var(--fg);
    border-left: none;
    padding: 0;
    margin: 0 0 18px;
    font-variation-settings: 'SOFT' 80, 'opsz' 144;
    font-weight: 300;
  }
  .body :global(p) { margin: 0; }
  .attribution { font-size: 13px; color: var(--fg-soft); }
  .src { color: var(--fg-soft); border-bottom: 1px dotted var(--accent-text); }
  .src:hover { color: var(--accent-text); }
  .date { font-size: 11px; letter-spacing: var(--tracking-meta); text-transform: uppercase; color: var(--accent-text); opacity: 0.7; margin-left: 6px; }
</style>
```

- [ ] **Step 5: Rewrite `QuotePage.astro`**

Same treatment, larger:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { formatDate } from '~/lib/formatDate';
interface Props { post: CollectionEntry<'posts'>; }
const { post } = Astro.props;
if (post.data.type !== 'quote') throw new Error();
const { Content } = await post.render();
---
<article class="permalink quote-perma">
  <div class="orn" aria-hidden="true">❝</div>
  <blockquote class="body serif-italic"><Content /></blockquote>
  <div class="attribution">
    — {post.data.sourceUrl
      ? <a href={post.data.sourceUrl} target="_blank" rel="noopener" class="src serif-italic">{post.data.source}</a>
      : <span class="src serif-italic">{post.data.source}</span>}
    <span class="date">· {formatDate(post.data.publishedAt)}</span>
  </div>
</article>
<style>
  .permalink { padding: 80px 0 96px; max-width: 60ch; margin: 0 auto; text-align: center; }
  .orn { font-size: 56px; color: var(--accent-text); line-height: 1; margin-bottom: 16px; opacity: 0.85; font-family: 'Fraunces Variable', Georgia, serif; }
  .body {
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.5;
    color: var(--fg);
    border-left: none;
    padding: 0;
    margin: 0 0 28px;
    font-variation-settings: 'SOFT' 80, 'opsz' 144;
    font-weight: 300;
  }
  .body :global(p) { margin: 0 0 1em; }
  .attribution { font-size: 14px; color: var(--fg-soft); }
  .src { color: var(--fg-soft); border-bottom: 1px dotted var(--accent-text); }
  .src:hover { color: var(--accent-text); }
  .date { font-size: 11px; letter-spacing: var(--tracking-meta); text-transform: uppercase; color: var(--accent-text); opacity: 0.7; margin-left: 8px; }
</style>
```

- [ ] **Step 6: Verify**

```bash
pnpm exec astro check
```

- [ ] **Step 7: Commit**

```bash
git add src/components/post-types/NoteCard.astro src/components/post-types/QuoteCard.astro \
        src/components/post-permalinks/NotePage.astro src/components/post-permalinks/QuotePage.astro
git commit -m "feat(quote-note): visual upgrade — pull-quote treatment, dotted-rule notes"
```

---

## Task 6: Photo lightbox (item 1)

**Files:**
- Create: `src/components/PhotoLightbox.astro`
- Modify: `src/layouts/Base.astro`
- Modify: `src/components/post-types/PhotoCard.astro`
- Modify: `src/components/post-permalinks/PhotoPage.astro`

- [ ] **Step 1: Read Base.astro to find where to mount the lightbox**

Read `src/layouts/Base.astro`. The lightbox should mount at the bottom of `<body>` (after `<slot />` and footer) so it overlays everything.

- [ ] **Step 2: Create the lightbox component**

Write `src/components/PhotoLightbox.astro`:

```astro
---
// Fullscreen photo overlay. Triggered by any <img data-photo-lightbox>.
// Lifecycle: rebinds on astro:page-load, tears down on astro:before-swap.
---
<div id="sm-lightbox" class="sm-lightbox" aria-hidden="true" role="dialog" aria-label="Photo viewer">
  <button class="lb-close" aria-label="Close">✕</button>
  <button class="lb-nav lb-prev" aria-label="Previous photo">‹</button>
  <button class="lb-nav lb-next" aria-label="Next photo">›</button>
  <figure class="lb-figure">
    <img class="lb-img" alt="" />
    <figcaption class="lb-caption"></figcaption>
  </figure>
</div>

<script>
  let lifecycleBound = false;
  let lastTrigger: HTMLElement | null = null;
  let imgs: HTMLImageElement[] = [];
  let activeIdx = -1;

  function getEls() {
    return {
      box: document.getElementById('sm-lightbox') as HTMLDivElement | null,
      lbImg: document.querySelector<HTMLImageElement>('#sm-lightbox .lb-img'),
      lbCap: document.querySelector<HTMLElement>('#sm-lightbox .lb-caption'),
      btnClose: document.querySelector<HTMLButtonElement>('#sm-lightbox .lb-close'),
      btnPrev: document.querySelector<HTMLButtonElement>('#sm-lightbox .lb-prev'),
      btnNext: document.querySelector<HTMLButtonElement>('#sm-lightbox .lb-next'),
    };
  }

  function open(idx: number) {
    const { box, lbImg, lbCap, btnPrev, btnNext } = getEls();
    if (!box || !lbImg || !lbCap) return;
    activeIdx = idx;
    const src = imgs[idx];
    lbImg.src = src.currentSrc || src.src;
    lbImg.alt = src.alt || '';
    lbCap.textContent = src.dataset.lightboxCaption || src.alt || '';
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (btnPrev) btnPrev.style.visibility = imgs.length > 1 ? 'visible' : 'hidden';
    if (btnNext) btnNext.style.visibility = imgs.length > 1 ? 'visible' : 'hidden';
  }
  function close() {
    const { box } = getEls();
    if (!box) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
    activeIdx = -1;
  }
  function step(delta: number) {
    if (imgs.length === 0 || activeIdx < 0) return;
    const next = (activeIdx + delta + imgs.length) % imgs.length;
    open(next);
  }

  function rescan() {
    imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-photo-lightbox]'));
  }

  function onImgClick(e: Event) {
    const t = e.currentTarget as HTMLImageElement;
    e.preventDefault();
    lastTrigger = t;
    rescan();
    const idx = imgs.indexOf(t);
    if (idx >= 0) open(idx);
  }

  function bindImages() {
    rescan();
    for (const img of imgs) {
      if ((img as HTMLElement).dataset.smLightboxBound === '1') continue;
      (img as HTMLElement).dataset.smLightboxBound = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', onImgClick);
    }
  }

  function bindLifecycleOnce() {
    if (lifecycleBound) return;
    lifecycleBound = true;

    const { btnClose, btnPrev, btnNext, box } = getEls();
    btnClose?.addEventListener('click', close);
    btnPrev?.addEventListener('click', () => step(-1));
    btnNext?.addEventListener('click', () => step(1));
    box?.addEventListener('click', (e) => { if (e.target === box) close(); });

    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('sm-lightbox')?.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    // Touch swipe: track deltas on the image
    let touchX = 0;
    document.addEventListener('touchstart', (e) => {
      if (!document.getElementById('sm-lightbox')?.classList.contains('open')) return;
      touchX = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!document.getElementById('sm-lightbox')?.classList.contains('open')) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }

  function init() {
    bindLifecycleOnce();
    bindImages();
  }

  function teardown() {
    // Remove per-image bindings so the next page's images can rebind cleanly.
    for (const img of imgs) {
      img.removeEventListener('click', onImgClick);
      delete (img as HTMLElement).dataset.smLightboxBound;
    }
    imgs = [];
    activeIdx = -1;
    if (document.getElementById('sm-lightbox')?.classList.contains('open')) close();
  }

  init();
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', teardown);
</script>

<style>
  .sm-lightbox {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.88);
    display: none; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 250ms var(--ease, ease);
  }
  .sm-lightbox.open { display: flex; opacity: 1; }
  .lb-figure { margin: 0; max-width: 92vw; max-height: 88vh; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .lb-img { max-width: 92vw; max-height: 80vh; object-fit: contain; box-shadow: 0 24px 60px rgba(0,0,0,0.6); border-radius: var(--r-md, 8px); }
  .lb-caption { color: rgba(255,255,255,0.86); font-family: 'Fraunces Variable', Georgia, serif; font-style: italic; font-size: 15px; max-width: 60ch; text-align: center; }
  .lb-close, .lb-nav {
    position: absolute; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.86); width: 44px; height: 44px; border-radius: 50%;
    cursor: pointer; font-size: 20px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    transition: background 200ms var(--ease, ease);
  }
  .lb-close:hover, .lb-nav:hover { background: rgba(255,255,255,0.16); }
  .lb-close { top: 22px; right: 22px; }
  .lb-prev { left: 22px; top: 50%; transform: translateY(-50%); }
  .lb-next { right: 22px; top: 50%; transform: translateY(-50%); }
  @media (max-width: 640px) {
    .lb-close { top: 14px; right: 14px; }
    .lb-prev { left: 10px; }
    .lb-next { right: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sm-lightbox { transition: none; }
  }
</style>
```

- [ ] **Step 3: Mount the lightbox in Base.astro**

Read `src/layouts/Base.astro`. Add the import in the frontmatter:

```astro
import PhotoLightbox from '~/components/PhotoLightbox.astro';
```

And include `<PhotoLightbox />` immediately before the closing `</body>` (or at the end of the `<slot />`-containing wrapper; pick the location that ensures the overlay sits above all page content in stacking order).

- [ ] **Step 4: Add data attributes to PhotoCard and PhotoPage**

In `src/components/post-types/PhotoCard.astro`, REMOVE the `<a>` wrapper around the `<img>` and add the data attribute. Wrap the caption (`.cap`) in a link to the permalink so users still have a way to reach the photo's post page from the feed (preserves RSS/share semantics).

Replace:
```astro
  <a href={`/journal/${post.slug}/`}>
    <img src={post.data.image} alt={post.data.caption ?? ''} class="img" loading="lazy" />
  </a>
  <MetaRow items={['Photo', formatDate(post.data.publishedAt)]} />
  {post.data.caption && <p class="cap serif-italic">— {post.data.caption}</p>}
```
With:
```astro
  <img
    src={post.data.image}
    alt={post.data.caption ?? ''}
    class="img"
    loading="lazy"
    data-photo-lightbox
    data-lightbox-caption={post.data.caption ?? ''}
  />
  <MetaRow items={['Photo', formatDate(post.data.publishedAt)]} />
  {post.data.caption && (
    <a href={`/journal/${post.slug}/`} class="cap-link">
      <p class="cap serif-italic">— {post.data.caption}</p>
    </a>
  )}
```

Add `.cap-link { color: var(--fg); }` and `.cap-link:hover .cap { color: var(--accent-text); }` to the existing style block.

In `src/components/post-permalinks/PhotoPage.astro`, add the same `data-photo-lightbox` and `data-lightbox-caption` attributes to the existing `<img>`.

- [ ] **Step 5: Verify**

```bash
pnpm exec astro check
pnpm dev
```

(For dev verification, controller will spot-check the lightbox in browser.)

- [ ] **Step 6: Commit**

```bash
git add src/components/PhotoLightbox.astro src/layouts/Base.astro \
        src/components/post-types/PhotoCard.astro src/components/post-permalinks/PhotoPage.astro
git commit -m "feat(photos): fullscreen lightbox with keyboard + swipe nav, view-transition safe"
```

---

## Task 7: Scroll-reveal on journal feed (item 8)

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Read index.astro to understand the current feed structure**

The existing `<div class="feed">` wraps each post-type card. We add a `data-reveal` attribute that the script targets, then a class transition.

- [ ] **Step 2: Add data-reveal markup + CSS + script**

Wrap each card in a `<div class="reveal" data-reveal>` (or apply the attribute directly to each card if cards have wrapper elements; cleanest is a wrapper):

Replace the existing `posts.map` block in `src/pages/index.astro`:

```astro
      {posts.map((post) => (
        <div class="reveal" data-reveal>
          {(() => {
            switch (post.data.type) {
              case 'essay': return <EssayCard post={post} />;
              case 'note':  return <NoteCard post={post} />;
              case 'quote': return <QuoteCard post={post} />;
              case 'link':  return <LinkCard post={post} />;
              case 'photo': return <PhotoCard post={post} />;
              case 'audio': return <AudioCard post={post} />;
            }
          })()}
        </div>
      ))}
```

Append to the existing `<style>` block in this file:

```css
  .reveal {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 400ms var(--ease), transform 400ms var(--ease);
    will-change: opacity, transform;
  }
  .reveal.in {
    opacity: 1;
    transform: translateY(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity: 1; transform: none; transition: none; }
  }
```

Append a new `<script>` block (or merge into an existing one if any exists) at the end of the file:

```html
<script>
  function bindReveal() {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const el of targets) el.classList.add('in');
      return;
    }
    const startedAt = performance.now();
    let staggerCounter = 0;
    const STAGGER_MS = 80;
    const STAGGER_WINDOW_MS = 800;

    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const sinceLoad = performance.now() - startedAt;
        const delay = sinceLoad < STAGGER_WINDOW_MS ? staggerCounter++ * STAGGER_MS : 0;
        window.setTimeout(() => el.classList.add('in'), delay);
        obs.unobserve(el);
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    for (const el of targets) obs.observe(el);
  }
  bindReveal();
  document.addEventListener('astro:page-load', bindReveal);
</script>
```

- [ ] **Step 3: Verify**

```bash
pnpm exec astro check
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(feed): scroll-reveal cards with stagger on initial load, IO on scroll"
```

---

## Task 8: OG image generation (item 11)

**Files:**
- Modify: `package.json` (add `satori` and `@resvg/resvg-js` dependencies)
- Create: `public/fonts/Fraunces-Italic.woff2` (downloaded asset)
- Create: `src/lib/og/render.tsx` (JSX layout; .tsx because satori uses JSX)
- Create: `src/pages/og/[slug].png.ts` (build-time endpoint)
- Create: `public/og-default.png` (generated once during this work)
- Modify: `src/layouts/Base.astro` (accept `ogImage` prop; emit meta tags)
- Modify: `src/pages/journal/[...slug].astro` (pass `ogImage={`/og/${post.slug}.png`}` to Base)

- [ ] **Step 1: Install satori and @resvg/resvg-js**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
pnpm add satori @resvg/resvg-js
```

Both are pure-JS rendering pipelines — no native build steps, work on Cloudflare's Linux build runners. Resvg is preferred over `sharp` here because it's Rust+wasm and starts faster on edge runtimes (we generate at build time so this is just for build speed).

- [ ] **Step 2: Add the Fraunces italic font**

Download a single Fraunces variable italic woff2 from https://fonts.bunny.net/ (or fontsource) and place at `public/fonts/Fraunces-Italic.woff2`. Aim for the variable italic file (~80kb).

Specifically:
```bash
curl -sL "https://fonts.bunny.net/fraunces/files/fraunces-latin-wght-italic.woff2" -o public/fonts/Fraunces-Italic.woff2
ls -la public/fonts/Fraunces-Italic.woff2
```

If the bunny URL is unreachable or the file is empty, fall back to npm: `npm pack @fontsource-variable/fraunces` and extract the italic woff2 from the tarball; copy to `public/fonts/Fraunces-Italic.woff2`. Confirm file size is non-zero.

- [ ] **Step 3: Create the JSX layout**

Write `src/lib/og/render.tsx`:

```tsx
// JSX-based layout for satori. Note: satori supports a SUBSET of CSS — flexbox,
// fixed sizes, basic colors, font-family, etc. No grid, no transforms, no
// pseudo-elements.
export interface OgPayload {
  title: string;
  type: string;       // 'ESSAY' | 'NOTE' | 'PHOTO' | ...
  year: string | number;
}

export function ogJsx({ title, type, year }: OgPayload) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: 'linear-gradient(135deg, #2A1E34 0%, #1a0e24 100%)',
        color: '#E8E4DF',
        fontFamily: 'Fraunces',
        position: 'relative',
      },
      children: [
        // Top row: wordmark
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', fontSize: '28px', fontStyle: 'italic', color: '#E8E4DF' },
            children: [
              { type: 'span', props: { children: 'studio' } },
              { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 6px' }, children: '·' } },
              { type: 'span', props: { children: 'marginalia' } },
            ],
          },
        },
        // Title block
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: title.length > 50 ? '64px' : '88px',
              lineHeight: 1.1,
              fontStyle: 'italic',
              maxWidth: '1040px',
              color: '#E8E4DF',
              fontWeight: 400,
            },
            children: title,
          },
        },
        // Bottom: type · year badge
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              gap: '14px',
              fontSize: '20px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#B8A4D6',
              fontFamily: 'Inter',
              fontStyle: 'normal',
            },
            children: [
              { type: 'span', props: { children: String(type) } },
              { type: 'span', props: { children: '·' } },
              { type: 'span', props: { children: String(year) } },
            ],
          },
        },
      ],
    },
  } as const;
}
```

- [ ] **Step 4: Create the build-time OG endpoint**

Write `src/pages/og/[slug].png.ts`:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { ogJsx } from '~/lib/og/render';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map((p) => ({ params: { slug: p.slug }, props: { post: p } }));
}

export const GET: APIRoute = async ({ props }) => {
  const post = (props as { post: any }).post;
  // Derive title from whichever field the post-type carries
  let title = '';
  switch (post.data.type) {
    case 'essay':
    case 'audio':
    case 'link':  title = post.data.title ?? ''; break;
    case 'quote': title = `“${(post.body ?? '').toString().trim().replace(/^["“]|["”]$/g, '').slice(0, 100)}”`; break;
    case 'note':  title = (post.body ?? '').toString().trim().slice(0, 120); break;
    case 'photo': title = post.data.caption ?? 'Photo'; break;
    default:      title = 'Studio Marginalia';
  }
  if (!title) title = 'Studio Marginalia';

  const fontPath = path.resolve('public/fonts/Fraunces-Italic.woff2');
  const fontData = await fs.readFile(fontPath);
  const year = new Date(post.data.publishedAt).getFullYear();

  const svg = await satori(ogJsx({ title, type: post.data.type.toUpperCase(), year }) as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Fraunces', data: fontData, weight: 400, style: 'italic' },
      { name: 'Inter',    data: fontData, weight: 400, style: 'normal' }, // fallback to Fraunces if Inter not available — visually fine
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
```

- [ ] **Step 5: Generate the site-wide default OG**

Write a one-shot script `scripts/generate-default-og.mjs`:

```js
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Standalone layout — does NOT import the .tsx layout to avoid TS-from-node
// at script time. Keep visual parity with src/lib/og/render.tsx by hand.
const layout = {
  type: 'div',
  props: {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '80px',
      background: 'linear-gradient(135deg, #2A1E34 0%, #1a0e24 100%)',
      color: '#E8E4DF', fontFamily: 'Fraunces', fontStyle: 'italic',
    },
    children: [
      { type: 'div', props: { style: { fontSize: '32px', display: 'flex', alignItems: 'center' },
        children: [
          { type: 'span', props: { children: 'studio' } },
          { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 8px' }, children: '·' } },
          { type: 'span', props: { children: 'marginalia' } },
        ] } },
      { type: 'div', props: { style: { fontSize: '88px', lineHeight: 1.1, maxWidth: '1040px' },
        children: 'A reading room, kept lit.' } },
      { type: 'div', props: { style: { fontSize: '20px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B8A4D6', fontFamily: 'Inter', fontStyle: 'normal' },
        children: 'studio marginalia · 2026' } },
    ],
  },
};

const fontPath = path.resolve('public/fonts/Fraunces-Italic.woff2');
const fontData = await fs.readFile(fontPath);
const svg = await satori(layout, {
  width: 1200, height: 630,
  fonts: [
    { name: 'Fraunces', data: fontData, weight: 400, style: 'italic' },
    { name: 'Inter',    data: fontData, weight: 400, style: 'normal' },
  ],
});
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
await fs.writeFile(path.resolve('public/og-default.png'), png);
console.log('Wrote public/og-default.png');
```

Run it:
```bash
node scripts/generate-default-og.mjs
ls -la public/og-default.png
```

Confirm `public/og-default.png` exists and is roughly 50–200kb.

- [ ] **Step 6: Wire `<meta>` tags in Base.astro**

Read `src/layouts/Base.astro`. Add an optional `ogImage` prop:

```astro
---
interface Props {
  title?: string;
  description?: string;
  type?: string;
  ogImage?: string;
}
const { title = 'Studio Marginalia', description, type, ogImage = '/og-default.png' } = Astro.props;
const siteUrl = 'https://studio-marginalia.pages.dev';
const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
---
```

In the existing `<head>`, add (after existing meta tags):

```astro
<meta property="og:title" content={title} />
{description && <meta property="og:description" content={description} />}
<meta property="og:image" content={fullOgImage} />
<meta property="og:type" content={type ?? 'website'} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={fullOgImage} />
```

- [ ] **Step 7: Pass per-post OG image from journal slug page**

In `src/pages/journal/[...slug].astro`, where `<Base ...>` is currently rendered, add the `ogImage` prop:

```astro
<Base title={title} description={description} type="article" ogImage={`/og/${post.slug}.png`}>
```

- [ ] **Step 8: Verify build**

```bash
pnpm build
```

Expected: build succeeds. `dist/og/<slug>.png` files are emitted, one per non-draft post.

If satori errors on a particular post (e.g. font issue), diagnose: most failures are font-loading or unsupported-CSS-property issues in the JSX layout.

- [ ] **Step 9: Manual spot-check of generated PNGs**

```bash
ls -la dist/og/
```

Open one of the generated PNGs (e.g. `dist/og/notes-from-the-build/01-the-brief.png`) — confirm it's not blank, has the wordmark + title + type/year line.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml \
        public/fonts/Fraunces-Italic.woff2 public/og-default.png \
        src/lib/og src/pages/og src/layouts/Base.astro src/pages/journal scripts/generate-default-og.mjs
git commit -m "feat(og): build-time per-post OG images via satori; default for non-post pages"
```

---

## Final verification

- [ ] **Step 1: Full local build**

```bash
pnpm build
```

Expected: clean build of Tina + Astro, dist/ contains all routes including `/work/portfolio/<slug>/`, `/journal/tag/<slug>/`, `/og/<slug>.png`.

- [ ] **Step 2: Smoke test**

```bash
pnpm preview
```

Walk through:
1. Index — feed cards stagger-fade-in. Tags appear under cards. Click a tag → navigates to `/journal/tag/<tag>/`.
2. Click a photo card → opens lightbox, Esc closes, arrows step.
3. Click a note → dotted-rule treatment.
4. Click a quote → ornament glyph + attribution.
5. About page reads correctly (and is editable in `/admin/` after Tina rebuild).
6. `/work/portfolio/` — tiles hover-lift, click → detail page with full case body.
7. `/work/` teaser — tiles hover-lift, click → detail page.
8. View-source on a post → `<meta property="og:image" content="...">` points to `/og/<slug>.png`.

- [ ] **Step 3: Push** (controller decides timing — branch merge to main happens once tasks 1–8 are all green).
