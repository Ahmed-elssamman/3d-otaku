import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('../artifacts/browser/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) =>
  errors.push(request.url() + ': ' + request.failure()?.errorText),
);
await page.goto('http://127.0.0.1:4200/', { waitUntil: 'networkidle', timeout: 60000 });
await page.screenshot({
  path: fileURLToPath(new URL('home-desktop.png', directory)),
  fullPage: true,
});
const desktop = await page.evaluate(() => ({
  title: document.title,
  width: window.innerWidth,
  documentWidth: document.documentElement.scrollWidth,
  images: [...document.images].map((image) => ({
    src: image.currentSrc,
    loaded: image.complete && image.naturalWidth > 0,
  })),
}));
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: fileURLToPath(new URL('home-mobile.png', directory)),
  fullPage: true,
});
await page.getByRole('button', { name: 'فتح القائمة' }).click();
await page.getByRole('navigation', { name: 'قائمة الموبايل' }).waitFor();
await page.keyboard.press('Escape');
const mobile = await page.evaluate(() => ({
  width: window.innerWidth,
  documentWidth: document.documentElement.scrollWidth,
}));
const report = { errors, desktop, mobile };
await writeFile(new URL('smoke.json', directory), JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report, null, 2));
await browser.close();
