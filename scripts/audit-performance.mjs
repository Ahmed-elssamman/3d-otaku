import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  screenEmulationMetrics,
  throttling,
  userAgents,
} from 'lighthouse/core/config/constants.js';

const baseUrl = new URL(process.env.STORE_AUDIT_BASE_URL || 'http://127.0.0.1:4300');
const chromePath =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outputDirectory = new URL('../artifacts/performance/', import.meta.url);
const routes = [
  { name: 'home', path: '/' },
  { name: 'catalog', path: '/products' },
  { name: 'product', path: '/products/templar-knight-phone-and-tablet-holder' },
];
const requestedRoute = process.argv[2] || '';
const requestedDevice = process.argv[3] || '';
const devices = requestedDevice ? [requestedDevice] : ['mobile', 'desktop'];
if (!['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname))
  throw new Error('Performance audits are limited to the local preview server.');
if (requestedRoute && !routes.some((route) => route.name === requestedRoute))
  throw new Error('Route must be home, catalog or product.');
if (devices.some((device) => device !== 'mobile' && device !== 'desktop'))
  throw new Error('Device must be mobile or desktop.');
await mkdir(outputDirectory, { recursive: true });

const summary = [];
for (const route of routes.filter((entry) => !requestedRoute || entry.name === requestedRoute)) {
  for (const device of devices) {
    const userDataDir = await mkdtemp(fileURLToPath(new URL('chrome-profile-', outputDirectory)));
    const chrome = await launch({
      chromePath,
      userDataDir,
      chromeFlags: ['--headless=new', '--no-proxy-server', '--disable-extensions'],
    });
    try {
      const url = new URL(route.path, baseUrl).href;
      process.stdout.write(`Auditing ${device}: ${url}\n`);
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          output: ['html', 'json'],
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
        {
          extends: 'lighthouse:default',
          settings: {
            formFactor: device,
            screenEmulation: screenEmulationMetrics[device],
            emulatedUserAgent: userAgents[device],
            throttling: device === 'desktop' ? throttling.desktopDense4G : throttling.mobileSlow4G,
            throttlingMethod: 'simulate',
          },
        },
      );
      if (!result) throw new Error('Lighthouse returned no audit result.');
      const report = result.lhr;
      const basename = `${route.name}-${device}`;
      await writeFile(
        new URL(`${basename}.json`, outputDirectory),
        JSON.stringify(report, null, 2),
      );
      await writeFile(
        new URL(`${basename}.html`, outputDirectory),
        Array.isArray(result.report) ? result.report[0] : result.report,
      );
      const entry = {
        route: route.name,
        device,
        url,
        fetchedAt: report.fetchTime,
        lighthouseVersion: report.lighthouseVersion,
        browser: report.environment.hostUserAgent,
        scores: Object.fromEntries(
          Object.entries(report.categories).map(([name, category]) => [
            name,
            category.score === null ? null : Math.round(category.score * 100),
          ]),
        ),
        metrics: Object.fromEntries(
          [
            'first-contentful-paint',
            'largest-contentful-paint',
            'total-blocking-time',
            'cumulative-layout-shift',
            'speed-index',
          ].map((id) => [
            id,
            { value: report.audits[id].numericValue, display: report.audits[id].displayValue },
          ]),
        ),
        warnings: report.runWarnings,
        runtimeError: report.runtimeError || null,
        failingAudits: Object.entries(report.audits)
          .filter(
            ([, audit]) =>
              audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'informative',
          )
          .map(([id, audit]) => ({
            id,
            title: audit.title,
            score: audit.score,
            displayValue: audit.displayValue || '',
          })),
      };
      summary.push(entry);
      process.stdout.write(`${basename}: ${JSON.stringify(entry.scores)}\n`);
      await writeFile(
        new URL(
          `summary${requestedRoute ? '-' + requestedRoute : ''}${requestedDevice ? '-' + requestedDevice : ''}.json`,
          outputDirectory,
        ),
        JSON.stringify(summary, null, 2),
      );
      if (report.runtimeError) throw new Error(report.runtimeError.message);
    } finally {
      await chrome.kill();
    }
  }
}
process.stdout.write(`Reports saved to ${fileURLToPath(outputDirectory)}\n`);
