import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: 'ar-EG',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    trace: 'off'
  },
  projects: [
    { name: 'unit', testMatch: /unit\.spec\.ts/ },
    { name: 'm375', testMatch: /(app|smoke)\.spec\.ts/, use: { viewport: { width: 375, height: 667 } } },
    { name: 'm390', testMatch: /app\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
