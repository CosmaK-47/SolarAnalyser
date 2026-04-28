export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function rangeStats(values) {
  if (!values.length) return { min: 0, max: 0, avg: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, avg };
}