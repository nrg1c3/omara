// بيولّد أيقونات PNG للـ PWA من public/icons/icon.svg بـ Chromium (Playwright).
// شغّله: npm run icons
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url);
const jobs = [
  { name: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
  { name: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
  { name: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#0E6E66' },
  // maskable: المحتوى جوه منطقة الأمان (80%) والخلفية ملوّنة
  { name: 'icon-maskable-512.png', size: 512, pad: 0.1, bg: '#0E6E66' }
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  const inner = Math.round(j.size * (1 - j.pad * 2));
  const html = `<html><body style="margin:0;background:${j.bg};display:grid;place-items:center;width:${j.size}px;height:${j.size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`;
  await page.setContent(html);
  writeFileSync(out(j.name), await page.screenshot({ omitBackground: j.bg === 'transparent' }));
  console.log('wrote', j.name);
}
await browser.close();
