const WPM = 220;
export function readTime(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~#>]/g, '')
    .trim();
  const words = stripped ? stripped.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / WPM));
}
