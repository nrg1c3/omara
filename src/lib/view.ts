export function unitLabel(unit: { unit?: string } | string | undefined): string {
  if (!unit) return '';
  return typeof unit === 'string' ? unit : String(unit.unit ?? '');
}

export function buildingName(b: { name?: string; id?: string } | undefined): string {
  return b?.name || b?.id || '';
}
