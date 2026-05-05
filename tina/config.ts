// Tina CMS schema for Studio Marginalia.
// Schema mirrors src/content/config.ts. Each post picks its `type` from a
// dropdown — Astro's Zod schema strips fields irrelevant to the chosen type.

import { defineConfig } from 'tinacms';

const GH_REPO = 'NickCason/studio-marginalia';
const SITE_URL = 'https://studio-marginalia.pages.dev';
const POLL_MS = 2000;
const BURST_MS = 1500;
const BURST_TICKS = 12;

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
      mediaRoot: 'media',
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

    // Inject site-themed admin stylesheet exactly once.
    if (!document.getElementById('sm-admin-theme')) {
      const link = document.createElement('link');
      link.id = 'sm-admin-theme';
      link.rel = 'stylesheet';
      link.href = '/admin-theme.css';
      document.head.appendChild(link);
    }

    const ID = 'sm-deploy-banner';
    type State = 'building' | 'success' | 'failure';

    function ensureBanner(): HTMLDivElement {
      let el = document.getElementById(ID) as HTMLDivElement | null;
      if (el) { el.style.display = ''; return el; }
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
    function paint(state: State, label: string, opts?: { url?: string; progress?: number; elapsed?: string }) {
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
      const icon = state === 'building' ? '⏳' : state === 'success' ? '✓' : '✗';
      const linkHtml = opts?.url ? `<a href="${opts.url}" target="_blank" style="color:${accent};text-decoration:underline;font-size:11px;opacity:0.8">view run ↗</a>` : '';
      const progressBar = state === 'building' && opts?.progress !== undefined ? `
        <div style="width:100%;height:4px;background:rgba(255,255,255,0.12);border-radius:2px;margin-top:8px;overflow:hidden">
          <div style="width:${Math.round(opts.progress * 100)}%;height:100%;background:${accent};border-radius:2px;transition:width 400ms cubic-bezier(0.4,0,0.2,1)"></div>
        </div>` : '';
      const elapsedHtml = opts?.elapsed ? `<span style="font-size:11px;opacity:0.6;font-variant-numeric:tabular-nums">${opts.elapsed}</span>` : '';
      el.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:14px;line-height:1.4">${icon}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
              ${elapsedHtml}
            </div>
            ${progressBar}
            ${linkHtml ? `<div style="margin-top:6px">${linkHtml}</div>` : ''}
          </div>
          <button id="${ID}-close" style="background:none;border:none;color:${fg};opacity:0.5;cursor:pointer;font-size:14px;line-height:1;padding:0 0 0 4px" title="dismiss">×</button>
        </div>`;
      el.style.display = '';
      requestAnimationFrame(() => {
        el!.style.opacity = '1';
        el!.style.transform = 'translateY(0)';
      });
      const closeBtn = document.getElementById(`${ID}-close`);
      if (closeBtn) closeBtn.onclick = () => {
        dismissedRunId = currentRunId;
        hide();
      };
    }
    function hide() {
      const el = document.getElementById(ID) as HTMLDivElement | null;
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      window.setTimeout(() => { if (el) el.style.display = 'none'; }, 250);
    }
    function fmtDuration(ms: number): string {
      const s = Math.max(0, Math.floor(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    let currentRunId: number | null = null;
    let runFirstSeenAt = new Map<number, number>();
    let successShownAt = new Map<number, number>();
    let dismissedRunId: number | null = null;

    function summarizeProgress(steps: any[]): { progress: number; currentStepName: string } {
      const meaningful = (steps || []).filter((s: any) => !['Post Run actions/checkout@v4','Complete job','Set up job'].includes(s.name));
      const total = meaningful.length;
      if (total === 0) return { progress: 0.05, currentStepName: 'Starting…' };
      const completed = meaningful.filter((s: any) => s.status === 'completed').length;
      const inProgress = meaningful.find((s: any) => s.status === 'in_progress');
      const currentStepName = inProgress?.name ?? (completed === total ? 'Wrapping up…' : meaningful[completed]?.name ?? 'Starting…');
      const progress = Math.min(0.99, (completed + (inProgress ? 0.5 : 0)) / total);
      return { progress, currentStepName };
    }

    async function pollOnce(): Promise<void> {
      try {
        // Hit our own Pages Function — server-side proxy with authenticated GH
        // token. Avoids the 60/hour anonymous limit per IP that was breaking
        // everything before.
        const r = await fetch('/api/deploy-status', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const run = j.run;
        if (!run) { hide(); return; }
        const steps = j.steps || [];

        if (!runFirstSeenAt.has(run.id)) runFirstSeenAt.set(run.id, Date.now());
        currentRunId = run.id;
        const url = run.html_url;
        const startedAt = new Date(run.run_started_at || run.created_at).getTime();
        const updatedAt = new Date(run.updated_at).getTime();
        const elapsedMs = (run.status === 'completed' ? updatedAt : Date.now()) - startedAt;
        const elapsed = fmtDuration(elapsedMs);

        if (dismissedRunId === run.id) { hide(); return; }

        if (run.status === 'queued') {
          paint('building', 'Queued…', { url, progress: 0.02, elapsed });
        } else if (run.status === 'in_progress') {
          const { progress, currentStepName } = summarizeProgress(steps);
          paint('building', currentStepName, { url, progress, elapsed });
        } else if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            if (!successShownAt.has(run.id)) successShownAt.set(run.id, Date.now());
            const shownFor = Date.now() - (successShownAt.get(run.id) ?? Date.now());
            if (shownFor < 12000) {
              paint('success', `Live at studio-marginalia.pages.dev`, { url, elapsed });
            } else {
              hide();
            }
          } else if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
            const ageMs = Date.now() - updatedAt;
            if (ageMs < 5 * 60 * 1000) paint('failure', `Deploy ${run.conclusion}. Click for log.`, { url, elapsed });
            else hide();
          } else {
            hide();
          }
        }
      } catch (e) {
        // function unreachable / offline — skip silently.
      }
    }

    // Expose for console debugging: smDeployStatus() forces a poll.
    (window as any).smDeployStatus = pollOnce;

    // Listen for clicks on Tina's Save button — a reliable signal that the
    // user just initiated a save (no false positives from page-load mutations).
    // Tina's save button has text content "Save" within the admin chrome.
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const btn = target.closest('button');
      if (!btn) return;
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'save' || text === 'save and continue' || text.startsWith('save ')) {
        // Burst poll: pick up the new workflow run as soon as it appears.
        let i = 0;
        const burst = window.setInterval(() => {
          void pollOnce();
          if (++i >= BURST_TICKS) window.clearInterval(burst);
        }, BURST_MS);
      }
    }, true);

    // Initial poll so banner reflects current state when admin opens.
    void pollOnce();
    // Steady-state polling while admin is open AND visible. Browsers throttle
    // setInterval to ~1/min on hidden tabs, which is what made the bar look
    // "stuck" when switching tabs. We pause our timer on hide and force an
    // immediate poll on show to catch up.
    let steadyTimer: number | null = null;
    function startSteady() {
      if (steadyTimer !== null) return;
      steadyTimer = window.setInterval(pollOnce, POLL_MS);
    }
    function stopSteady() {
      if (steadyTimer !== null) { window.clearInterval(steadyTimer); steadyTimer = null; }
    }
    if (!document.hidden) startSteady();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopSteady();
      } else {
        void pollOnce();   // immediate catch-up on tab focus
        startSteady();
      }
    });

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

          // -- Audio (uploads via Tina media picker; on iPhone this opens the
          // native voice recorder via the input's capture attribute) --
          { type: 'image', name: 'audioFile', label: 'Voice memo (record on phone, or upload mp3/m4a)' },
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
    ],
  },
});
