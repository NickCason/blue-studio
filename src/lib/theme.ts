// theme.ts — theme persistence + toggle
export type Theme = 'dark' | 'light';

const KEY = 'sm-theme';

export function getStoredTheme(): Theme | null {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(KEY);
  return v === 'dark' || v === 'light' ? v : null;
}

export function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(KEY, theme); } catch {
    // localStorage not available; theme will not persist across loads.
  }
}

export function toggleTheme(): Theme {
  const current = (document.documentElement.getAttribute('data-theme') ?? 'dark') as Theme;
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

// Inline-able bootstrap script — run before paint to avoid FOUC.
export const inlineBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('sm-theme');
    if (!t) { t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) { document.documentElement.setAttribute('data-theme','dark'); }
})();
`;
