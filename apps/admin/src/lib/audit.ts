/**
 * Presentation helpers for audit-log rows.
 *
 * Audit entries are written server-side as `ACTION_NAME` + a free-form
 * `metadata` JSON blob, so everything user-facing (labels, colours, the
 * Details summary) is derived here rather than stored.
 */

/** 'ALBUM_PUBLISHED' -> 'Album published' */
export function formatActionLabel(action: string): string {
  const words = action.toLowerCase().split('_').filter(Boolean);
  if (words.length === 0) return action;
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
}

type ActionTone = {
  badge: string;
  dot: string;
};

const TONES: Record<string, ActionTone> = {
  create: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  delete: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  update: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  publish: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  unpublish: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  reject: { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  broadcast: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  neutral: { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

/**
 * Colour an action by the verb it contains. Order matters: 'UNPUBLISHED'
 * must be tested before 'PUBLISHED' since one contains the other.
 */
export function getActionTone(action: string): ActionTone {
  const a = action.toUpperCase();
  if (a.includes('UNPUBLISH')) return TONES.unpublish;
  if (a.includes('DELETE') || a.includes('REMOVE')) return TONES.delete;
  if (a.includes('REJECT') || a.includes('DEACTIVAT') || a.includes('CANCEL')) return TONES.reject;
  if (a.includes('CREATE') || a.includes('APPROVE') || a.includes('ACTIVAT') || a.includes('ADD')) return TONES.create;
  if (a.includes('PUBLISH') || a.includes('SENT')) return TONES.publish;
  if (a.includes('BROADCAST') || a.includes('NOTIF')) return TONES.broadcast;
  if (a.includes('UPDATE') || a.includes('REORDER') || a.includes('COVER') || a.includes('ROLE') || a.includes('STATUS'))
    return TONES.update;
  return TONES.neutral;
}

/** 'fullName' -> 'Full name', 'ipAddress' -> 'Ip address' */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((v) => stringifyValue(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export interface MetadataEntry {
  key: string;
  label: string;
  value: string;
}

/** Flatten the metadata object into label/value pairs for the expanded row. */
export function metadataEntries(metadata: Record<string, unknown> | null | undefined): MetadataEntry[] {
  if (!metadata || typeof metadata !== 'object') return [];
  return Object.entries(metadata).map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    value: stringifyValue(value),
  }));
}

/**
 * One-line summary for the Details column. Prefers the fields that identify
 * *what* was touched (title/name/email) over bookkeeping fields.
 */
export function summarizeMetadata(metadata: Record<string, unknown> | null | undefined): string {
  const entries = metadataEntries(metadata);
  if (entries.length === 0) return '';

  const preferred = ['title', 'name', 'fullName', 'email', 'key', 'keys', 'reason', 'count'];
  const ordered = [
    ...preferred.map((p) => entries.find((e) => e.key === p)).filter((e): e is MetadataEntry => Boolean(e)),
    ...entries.filter((e) => !preferred.includes(e.key)),
  ];

  return ordered
    .slice(0, 3)
    .map((e) => `${e.label}: ${e.value}`)
    .join(' · ');
}

/** Compact relative time — '4m ago', '3h ago', '2d ago', else an absolute date. */
export function formatRelativeTime(date: string | Date): string {
  const then = new Date(date).getTime();
  const diffSeconds = Math.round((Date.now() - then) / 1000);

  if (!Number.isFinite(diffSeconds)) return '';
  if (diffSeconds < 45) return 'just now';
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.round(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 86400 * 7) return `${Math.round(diffSeconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Escape one CSV cell — quotes doubled, whole field quoted. */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}
