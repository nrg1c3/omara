import { test } from '@playwright/test';
import { mockApi, seedSession } from './mock';
const OUT = process.env.SHOT_DIR!;
test.skip(!OUT, 'screenshots only');
test('shots resident', async ({ page }) => {
  await mockApi(page);
  await seedSession(page, 'resident', 'tok-r');
  for (const r of ['r/home', 'r/pay', 'r/ledger', 'r/more']) {
    await page.goto(`./#${r}`); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${r.replace('/', '-')}.png`, fullPage: true });
  }
});
test('shots admin', async ({ page }) => {
  await mockApi(page);
  await seedSession(page, 'admin', 'tok-a');
  for (const r of ['a/home', 'a/record', 'a/more']) {
    await page.goto(`./#${r}`); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${r.replace('/', '-')}.png`, fullPage: true });
  }
});
