export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

export function timeRemaining(expiresAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, expiresAt - now);
  const hr = Math.floor(diff / (1000 * 60 * 60));
  if (hr >= 1) return `${hr}h left`;
  const min = Math.max(1, Math.floor(diff / (1000 * 60)));
  return `${min}m left`;
}
