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
