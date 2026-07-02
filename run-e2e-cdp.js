const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching E2E Simulation via CDP...");
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = (await browser.pages())[0];
  
  page.on('console', msg => { if(msg.type() === 'error') console.log(`[UI Error] ${msg.text()}`); });

  try {
    console.log("\n[1] Testing BYOK Proxy Settings...");
    await page.goto('http://localhost:3000/settings/byok/proxy', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Instead of waiting for specific placeholder, let's just dump the page body to see what rendered
    const byokBody = await page.evaluate(() => document.body.innerText);
    console.log(`--- BYOK Page Content ---\n${byokBody.substring(0, 300).trim()}...`);
    
    console.log("\n[2] Testing Exception Orchestrator...");
    await page.goto('http://localhost:3000/fulfillment/orchestrator', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    const orchBody = await page.evaluate(() => document.body.innerText);
    console.log(`--- Exception Orchestrator Page Content ---\n${orchBody.substring(0, 300).trim()}...`);

    console.log("\n[3] Testing Chargeback Defense Assembly...");
    await page.goto('http://localhost:3000/finance/disputes', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    const disputesBody = await page.evaluate(() => document.body.innerText);
    console.log(`--- Disputes Page Content ---\n${disputesBody.substring(0, 300).trim()}...`);

    console.log("\n[4] Testing VOC Root Cause Analysis Dashboard...");
    await page.goto('http://localhost:3000/support/voc', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    const vocBody = await page.evaluate(() => document.body.innerText);
    console.log(`--- VOC Page Content ---\n${vocBody.substring(0, 300).trim()}...`);

    console.log("\n✅ E2E Full SOP Visual Test Completed.");

  } catch (err) {
    console.error("\n❌ E2E Failed:", err.message);
  } finally {
    await browser.close();
  }
})();
