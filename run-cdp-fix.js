const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching Chrome visible on screen (headless: false)...");
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--auto-open-devtools-for-tabs']
  });

  const pages = await browser.pages();
  const page = pages[0];

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Log.enable');

  client.on('Network.responseReceived', event => {
    if (event.response.url.includes('/api/')) {
      console.log(`[CDP Network] ${event.response.status} -> ${event.response.url}`);
    }
  });

  client.on('Log.entryAdded', event => {
    console.log(`[CDP Log] ${event.entry.level}: ${event.entry.text}`);
  });

  console.log("Navigating to http://localhost:3000/workspace...");
  await page.goto('http://localhost:3000/workspace');
  
  await new Promise(r => setTimeout(r, 2000));

  console.log("Typing message visually...");
  await page.waitForSelector('input[placeholder*="Describe your task"]');
  await page.type('input[placeholder*="Describe your task"]', 'Hello OmniStudio from CDP visual test', { delay: 50 });
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking Send...");
  // Puppeteer doesnt support :has-text directly out of the box like playwright, so we evaluate
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sendBtn = buttons.find(b => b.textContent.includes('Send'));
    if (sendBtn) sendBtn.click();
  });

  console.log("Waiting 10 seconds to watch the AI stream on screen...");
  await new Promise(r => setTimeout(r, 10000));

  console.log("Test completed. Closing browser.");
  await browser.close();
})();
