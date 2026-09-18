import { defineConfig } from '@playwright/test';
const storefrontUrl = new URL(process.env.STORE_E2E_BASE_URL || 'http://127.0.0.1:4200');
if (
  storefrontUrl.protocol !== 'http:' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(storefrontUrl.hostname) ||
  ![4200, 4300].includes(Number(storefrontUrl.port)) ||
  storefrontUrl.username ||
  storefrontUrl.password ||
  storefrontUrl.pathname !== '/' ||
  storefrontUrl.search ||
  storefrontUrl.hash
)
  throw new Error('Browser QA is restricted to the local frontend on port 4200 or 4300.');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: storefrontUrl.origin,
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      ignoreDefaultArgs: ['--hide-scrollbars'],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
