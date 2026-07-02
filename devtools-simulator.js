const { chromium } = require('playwright');

(async () => {
  console.log("Launching Chrome (simulating DevTools)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Array to collect DevTools Console logs
  const logs = [];
  page.on('console', msg => logs.push(`[Console ${msg.type()}] ${msg.text()}`));
  
  // Array to collect Network requests
  const network = [];
  page.on('request', req => {
    if (req.url().includes('api')) {
      network.push(`[Network Req] ${req.method()} ${req.url()}`);
    }
  });

  try {
    console.log("Navigating to http://localhost:3000/workspace...");
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    console.log("Looking for chat input...");
    await page.waitForSelector('input[placeholder*="Describe your task"]', { timeout: 5000 });
    console.log("Found chat input! Typing message...");
    await page.fill('input[placeholder*="Describe your task"]', 'Hello from DevTools simulator!');
    
    console.log("Clicking Send...");
    await page.click('button:has-text("Send")');
    
    console.log("Waiting for network and UI to settle...");
    await page.waitForTimeout(2000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("--- DOM SNAPSHOT (Top 500 chars) ---");
    console.log(bodyText.substring(0, 500));
    console.log("------------------------------------");
    
  } catch (err) {
    console.error("Error during interaction:", err.message);
  } finally {
    console.log("--- DEVTOOLS CONSOLE LOGS ---");
    console.log(logs.join('\n'));
    console.log("--- DEVTOOLS NETWORK ---");
    console.log(network.join('\n'));
    
    await browser.close();
  }
})();
