const { chromium } = require('playwright');

(async () => {
  console.log("Launching Chrome (simulating DevTools) to prove the fix...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Array to collect DevTools Console logs
  const logs = [];
  page.on('console', msg => logs.push(`[Console ${msg.type()}] ${msg.text()}`));
  
  // Array to collect Network requests
  const network = [];
  page.on('request', req => {
    if (req.url().includes('api/')) {
      network.push(`[Req] ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', async res => {
    if (res.url().includes('api/')) {
      network.push(`[Res] ${res.status()} ${res.url()}`);
    }
  });

  try {
    console.log("Navigating to http://localhost:3000/workspace...");
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    
    console.log("Looking for conversation list in Sidebar...");
    await page.waitForTimeout(1000); // let the API fetch conversations
    const sidebarText = await page.locator('.w-64.shrink-0').innerText();
    console.log(`--- Sidebar Content ---\n${sidebarText.substring(0, 100)}\n-----------------------`);
    
    console.log("Looking for chat input...");
    await page.waitForSelector('input[placeholder*="Describe your task"]', { timeout: 5000 });
    
    const message = "Hi OmniStudio, test message from DevTools script!";
    console.log(`Typing message: "${message}"`);
    await page.fill('input[placeholder*="Describe your task"]', message);
    
    console.log("Clicking Send...");
    await page.click('button:has-text("Send")');
    
    console.log("Waiting 5 seconds for AI stream...");
    await page.waitForTimeout(5000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("--- DOM SNAPSHOT (Snippet containing our chat) ---");
    const snippetIndex = bodyText.indexOf(message);
    if (snippetIndex !== -1) {
       console.log(bodyText.substring(snippetIndex, snippetIndex + 300));
    } else {
       console.log("Message not found in DOM.");
    }
    console.log("--------------------------------------------------");
    
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
