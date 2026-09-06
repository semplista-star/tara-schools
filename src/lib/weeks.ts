const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weekBuckets(weeks: number) {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * WEEK_MS);
    const start = new Date(end.getTime() - WEEK_MS);
    buckets.push({
      start,
      end,
      label: start.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    });
  }
  return buckets;
}
