import type { ResidentView } from '../api';

/** الـ unit ممكن تيجي نص أو object حسب الـ API */
export function unitLabel(unit: ResidentView['unit'] | undefined): string {
  if (!unit) return '';
  if (typeof unit === 'string') return unit;
  const u = unit as Record<string, unknown>;
  return String(u.unit ?? u.name ?? u.id ?? '');
}

export function buildingName(b: { name?: string; id?: string; building_id?: string } | undefined): string {
  return b?.name || b?.building_id || b?.id || '';
}
