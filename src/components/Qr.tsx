import qrcode from 'qrcode-generator';

/** QR كـ SVG (من غير canvas، فبيتطبع كويس) */
export function Qr({ text, label }: { text: string; label: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2},${r + 2}h1v1h-1z`;
  return (
    <svg viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
