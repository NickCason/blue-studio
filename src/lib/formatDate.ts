const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatDate(d: Date, ref: Date = new Date()): string {
  const m = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  if (d.getUTCFullYear() === ref.getUTCFullYear()) return `${m} ${day}`;
  return `${m} ${day}, ${d.getUTCFullYear()}`;
}

export function formatRelative(d: Date, ref: Date = new Date()): string {
  const dayMs = 86_400_000;
  const dDay = Math.floor(d.getTime() / dayMs);
  const rDay = Math.floor(ref.getTime() / dayMs);
  const diff = rDay - dDay;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(d, ref);
}
