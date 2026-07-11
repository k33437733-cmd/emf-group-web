const marks = new Map<string, number>();

export function startMark(label: string): void {
  if (typeof performance === 'undefined') return;
  marks.set(label, performance.now());
}

export function endMark(label: string, log = false): number {
  if (typeof performance === 'undefined') return 0;
  const start = marks.get(label);
  if (!start) return 0;
  const duration = performance.now() - start;
  marks.delete(label);
  if (log && duration > 16) {
    console.warn(`🐢 ${label} took ${duration.toFixed(1)}ms`);
  }
  return duration;
}

export function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  startMark(label);
  return fn().finally(() => endMark(label, true));
}

const perfEntries: { label: string; duration: number; timestamp: number }[] = [];
const MAX_ENTRIES = 200;

export function recordMetric(label: string, duration: number): void {
  perfEntries.push({ label, duration, timestamp: Date.now() });
  if (perfEntries.length > MAX_ENTRIES) perfEntries.shift();
}

export function getMetrics() {
  return [...perfEntries];
}

export function getAverageMetric(label: string): number {
  const entries = perfEntries.filter(e => e.label === label);
  if (entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
}
