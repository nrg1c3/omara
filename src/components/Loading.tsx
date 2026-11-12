/** تحميل: الـ skeleton بيحجز مكان المحتوى عشان الصفحة ما تتنططش على النت البطيء */
export function Skeleton({ height = 20, width = '100%', radius }: { height?: number; width?: number | string; radius?: number }) {
  return <div class="skeleton" aria-hidden="true" style={{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width, borderRadius: radius ? `${radius}px` : undefined }} />;
}

export function Loading({ text = 'بيحمّل...' }: { text?: string }) {
  return (
    <div class="loading" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/** مكان كارت لسه بيتحمّل */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div class="card" aria-hidden="true">
      <Skeleton height={18} width="40%" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 32 : 16} width={i === 0 ? '60%' : '90%'} />
      ))}
    </div>
  );
}
