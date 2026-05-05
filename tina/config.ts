// Tina CMS schema for Studio Marginalia.
// Schema mirrors src/content/config.ts. Each post picks its `type` from a
// dropdown — Astro's Zod schema strips fields irrelevant to the chosen type.

import { defineConfig } from 'tinacms';

const GH_REPO = 'NickCason/studio-marginalia';
const SITE_URL = 'https://studio-marginalia.pages.dev';
const POLL_MS = 8000;

export default defineConfig({
  branch: 'main',
  clientId: process.env.TINA_PUBLIC_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },

  // Live deploy-status banner. Polls GitHub Actions API every 8s while admin
  // is open; banner appears whenever there's an in-flight or recently-completed
  // workflow run on main. No dependency on Tina's event API (which varies
  // across versions). Exposes window.smDeployStatus() for console debugging.
  cmsCallback: (cms) => {
    if (typeof window === 'undefined') return cms;
    if ((window as any).__smDeployBannerInit) return cms;
    (window as any).__smDeployBannerInit = true;

    const ID = 'sm-deploy-banner';
    type State = 'building' | 'success' | 'failure';

    function ensureBanner(): HTMLDivElement {
      let el = document.getElementById(ID) as HTMLDivElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.id = ID;
      el.style.cssText = [
        'position:fixed','bottom:16px','right:16px','z-index:2147483647',
        'min-width:280px','max-width:380px',
        'padding:12px 16px','border-radius:10px',
        'font:500 13px/1.4 system-ui,-apple-system,sans-serif',
        'box-shadow:0 12px 28px -8px rgba(0,0,0,0.4)',
        'transition:opacity 200ms,transform 200ms',
        'opacity:0','transform:translateY(8px)','pointer-events:auto',
      ].join(';');
      document.body.appendChild(el);
      return el;
    }
    function paint(state: State, msg: string, link?: string) {
      const el = ensureBanner();
      const palette: Record<State, [string, string, string]> = {
        building: ['#2A1E34', '#E8E4DF', '#d4a96a'],
        success:  ['#1f3a2a', '#E8E4DF', '#5F7A6C'],
        failure:  ['#3a1a22', '#E8E4DF', '#b85a6a'],
      };
      const [bg, fg, accent] = palette[state];
      el.style.background = bg;
      el.style.color = fg;
      el.style.borderLeft = `3px solid ${accent}`;
      const linkHtml = link ? ` · <a href="${link}" target="_blank" style="color:${accent};text-decoration:underline">view run</a>` : '';
      const icon = state === 'building' ? '⏳' : state === 'success' ? '✓' : '✗';
      el.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start"><span style="font-size:14px;line-height:1.4">${icon}</span><span style="flex:1">${msg}${linkHtml}</span></div>`;
      requestAnimationFrame(() => {
        el!.style.opacity = '1';
        el!.style.transform = 'translateY(0)';
      });
    }
    function hide() {
      const el = document.getElementById(ID) as HTMLDivElement | null;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
    }

    let lastReportedRunId: number | null = null;
    let lastSuccessHiddenAt: number = 0;

    async function pollOnce(): Promise<void> {
      try {
        const r = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/runs?per_page=1&branch=main`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const run = j.workflow_runs?.[0];
        if (!run) { hide(); return; }

        const now = Date.now();
        const updatedAt = new Date(run.updated_at).getTime();
        const ageMs = now - updatedAt;
        const url = run.html_url;

        if (run.status === 'queued') {
          paint('building', 'Build queued…', url);
        } else if (run.status === 'in_progress') {
          paint('building', 'Building &amp; deploying… ~90s', url);
        } else if (run.status === 'completed') {
          // Show terminal state for ~30s after completion, then auto-hide.
          if (run.conclusion === 'success' && ageMs < 30000) {
            if (lastReportedRunId !== run.id) {
              paint('success', `Live at <a href="${SITE_URL}" target="_blank" style="color:inherit;text-decoration:underline">studio-marginalia.pages.dev</a>`, url);
              lastReportedRunId = run.id;
              lastSuccessHiddenAt = now + 12000;
            } else if (now > lastSuccessHiddenAt) {
              hide();
            }
          } else if (run.conclusion === 'failure' || run.conclusion === 'cancelled') {
            paint('failure', `Last deploy ${run.conclusion}. Click for log.`, url);
          } else if (ageMs > 30000) {
            hide();
          }
        }
      } catch (e) {
        // CORS / rate-limit / offline — silently skip this tick.
      }
    }

    // Expose for console debugging: smDeployStatus() forces a poll.
    (window as any).smDeployStatus = pollOnce;

    // Initial poll immediately so banner reflects current state when admin opens.
    void pollOnce();
    // Then poll every POLL_MS while admin is open.
    window.setInterval(pollOnce, POLL_MS);

    return cms;
  },

  schema: {
    collections: [
      {
        name: 'post',
        label: 'Posts',
        path: 'src/content/posts',
        format: 'md',
        fields: [
          {
            type: 'string',
            name: 'type',
            label: 'Post type',
            required: true,
            options: [
              { value: 'essay', label: 'Essay (longform)' },
              { value: 'note', label: 'Note (one paragraph)' },
              { value: 'quote', label: 'Quote' },
              { value: 'link', label: 'Link' },
              { value: 'photo', label: 'Photo' },
              { value: 'audio', label: 'Voice memo' },
            ],
          },
          {
            type: 'datetime',
            name: 'publishedAt',
            label: 'Published at',
            required: true,
            ui: { dateFormat: 'YYYY-MM-DD' },
          },
          { type: 'boolean', name: 'draft', label: 'Draft (hide from feed)' },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          { type: 'string', name: 'threadId', label: 'Thread ID (optional, e.g. notes-from-the-build)' },

          // -- Essay / Link / Audio share Title --
          { type: 'string', name: 'title', label: 'Title (essay, link, voice memo)' },

          // -- Essay --
          { type: 'string', name: 'dek', label: 'Dek (essay subtitle)', ui: { component: 'textarea' } },
          { type: 'image', name: 'heroImage', label: 'Hero image (essay, optional)' },

          // -- Quote --
          { type: 'string', name: 'source', label: 'Source (quote / link)' },
          { type: 'string', name: 'sourceUrl', label: 'Source URL (quote, optional)' },

          // -- Link --
          { type: 'string', name: 'url', label: 'URL (link)' },
          { type: 'image', name: 'ogImage', label: 'OG image (link, optional)' },

          // -- Photo --
          { type: 'image', name: 'image', label: 'Image (photo)' },
          { type: 'string', name: 'caption', label: 'Caption (photo)', ui: { component: 'textarea' } },

          // -- Audio --
          { type: 'string', name: 'audioFile', label: 'Audio file path (voice memo, e.g. my-slug/audio.mp3)' },
          { type: 'string', name: 'duration', label: 'Duration mm:ss (voice memo)' },
          { type: 'string', name: 'context', label: 'Context line (voice memo, e.g. "in the car")' },
          { type: 'string', name: 'transcript', label: 'Transcript (voice memo)', ui: { component: 'textarea' } },

          // -- Body (markdown body of the post) --
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'portfolio',
        label: 'Portfolio',
        path: 'src/content/portfolio',
        format: 'md',
        fields: [
          { type: 'string', name: 'name', label: 'Client name', required: true },
          { type: 'number', name: 'year', label: 'Year', required: true },
          { type: 'string', name: 'serviceCategory', label: 'Service category' },
          { type: 'string', name: 'pitch', label: 'One-line pitch', required: true },
          { type: 'image', name: 'image', label: 'Card image (optional)' },
          { type: 'string', name: 'externalUrl', label: 'External link (optional)' },
          { type: 'number', name: 'order', label: 'Display order (lower = earlier)' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'now',
        label: 'On her desk',
        path: 'src/content/now',
        format: 'json',
        match: { include: 'now' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: 'object',
            name: 'reading',
            label: 'Reading',
            fields: [
              { type: 'string', name: 'title' },
              { type: 'string', name: 'author' },
            ],
          },
          { type: 'string', name: 'brewing', label: 'Brewing', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'listening',
            label: 'Listening',
            fields: [
              { type: 'string', name: 'title' },
              { type: 'string', name: 'artist' },
            ],
          },
        ],
      },

      {
        name: 'noticing',
        label: 'Noticing',
        path: 'src/content/noticing',
        format: 'json',
        fields: [
          { type: 'string', name: 'quote', label: 'Quote / observation', required: true },
          { type: 'string', name: 'source', label: 'Source / context', required: true },
          { type: 'datetime', name: 'publishedAt', label: 'Date', required: true, ui: { dateFormat: 'YYYY-MM-DD' } },
        ],
      },

      {
        name: 'site',
        label: 'Site config',
        path: 'src/content/site',
        format: 'json',
        match: { include: 'site' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: 'number', name: 'issueNumber', label: 'Issue number', required: true },
          { type: 'string', name: 'season', label: 'Season (Spring/Summer/Fall/Winter)', required: true },
          { type: 'string', name: 'year', label: 'Year label (e.g. "year one")', required: true },
          { type: 'string', name: 'tagline', label: 'Tagline (optional)' },
        ],
      },
    ],
  },
});
