/**
 * ضغط صورة الإيصال في المتصفح قبل الرفع (CLAUDE.md §4 الأمان):
 * أطول ضلع 1280px، jpeg بجودة 0.7، والناتج أقل من 300KB.
 * لو لسه كبير، بنقلل الجودة وبعدين المقاس لحد ما يدخل في الحد.
 */
export const MAX_SIDE = 1280;
export const START_QUALITY = 0.7;
export const MAX_BYTES = 300 * 1024;

export class ImageError extends Error {}

/** حجم الـ data URL بالبايت تقريباً (base64 ← bytes). */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

async function loadImage(file: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { img: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
    } catch {
      /* نجرب بالطريقة القديمة */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new ImageError('الصورة دي مش بتفتح. جرّب صورة تانية.'));
      el.src = url;
    });
    return { img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function compressImage(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ImageError('ارفع صورة بس (jpg أو png).');
  const { img, w, h, done } = await loadImage(file);
  try {
    let side = MAX_SIDE;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, side / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new ImageError('الموبايل مش قادر يجهّز الصورة. جرّب تاني.');
      ctx.fillStyle = '#FFFFFF'; // png شفاف ← خلفية بيضا
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      for (const q of [START_QUALITY, 0.6, 0.5]) {
        const out = canvas.toDataURL('image/jpeg', q);
        if (dataUrlBytes(out) <= MAX_BYTES) return out;
      }
      side = Math.round(side * 0.8);
    }
    throw new ImageError('الصورة كبيرة قوي. صوّر الإيصال بس من قريب.');
  } finally {
    done();
  }
}
