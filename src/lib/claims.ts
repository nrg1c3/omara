import type { Claim } from '../api';

export const isPendingClaim = (c: Claim): boolean => !c.status || c.status === 'قيد المراجعة';

export function claimTone(status?: string): 'warn' | 'success' | 'danger' | 'neutral' {
  if (status === 'اتقبل') return 'success';
  if (status === 'اترفض') return 'danger';
  return 'warn';
}
