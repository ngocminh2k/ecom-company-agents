import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const PAGES = [
  { path: '/',            file: 'screenshot-home.png' },
  { path: '/research',    file: 'screenshot-research.png' },
  { path: '/fulfillment', file: 'screenshot-fulfillment.png' },
  { path: '/finance',     file: 'screenshot-finance.png' },
  { path: '/support/tickets', file: 'screenshot-tickets.png' },
  { path: '/support/refunds', file: 'screenshot-refunds.png' },
  { path: '/agents',      file: 'screenshot-agents.png' },
  { path: '/skills',      file: 'screenshot-skills.png' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const { path, file } of PAGES) {
    try {
      const page = await context.newPage();
      const url = `${BASE}${path}`;
      console.log(`Navigating to ${url} ...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // Give any client-side rendering a moment
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `F:/ecom-company-agents/${file}`, fullPage: true });
      console.log(`  -> Saved ${file}`);
      await page.close();
    } catch (err) {
      console.error(`  -> FAILED ${file}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
