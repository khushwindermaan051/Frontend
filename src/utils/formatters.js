// snake_case → "Snake Case"
export function formatLabel(name) {
  return String(name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// "1h ago" / "Just now" / "3d ago"
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Days from today until the given date (negative = past).
export function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

// "01/02/2024" — en-GB short
export function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// "January 2, 2024" — en-US long
export function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

// "Jan 02, 2024, 14:30" — locale long with time
export function formatDateTime(val) {
  if (val == null || val === '') return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNum(val, digits = 0) {
  if (val == null) return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(val) {
  if (val == null) return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

// Spec §5.2: ≥100 green, 60-99 amber, <60 red. Negative growth_pct → red.
export function pctClass(val, { negativeIsBad = false } = {}) {
  if (val == null) return '';
  const pct = Number(val) * 100;
  if (!Number.isFinite(pct)) return '';
  if (negativeIsBad && pct < 0) return 'mt-pct-red';
  if (pct >= 100) return 'mt-pct-green';
  if (pct >= 60) return 'mt-pct-amber';
  return 'mt-pct-red';
}
