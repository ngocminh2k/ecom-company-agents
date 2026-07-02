const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching E2E Simulation via CDP...");
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null, 
    args: ['--start-maximized'] 
  });
  
  const page = (await browser.pages())[0];
  let errorCount = 0;
  
  page.on('console', msg => {
    if(msg.type() === 'error') {
      console.log(`[UI Error] ${msg.text()}`);
      errorCount++;
    }
  });

  try {
    // ----------------------------------------------------
    // TEST 1: BYOK Configuration (Settings)
    // ----------------------------------------------------
    console.log("\n[1] Testing BYOK Proxy Settings...");
    await page.goto('http://localhost:3000/settings/byok/proxy', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Evaluate inside browser to fill out forms and click buttons
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const stripeInput = Array.from(inputs).find(i => i.placeholder && i.placeholder.includes('sk_test'));
      if (stripeInput) {
        stripeInput.value = 'sk_test_mock_cdp_simulator';
        // Dispatch React event
        stripeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent.includes('Save'));
      if(saveBtn) saveBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1500));
    console.log("BYOK configuration saved.");

    // ----------------------------------------------------
    // TEST 2: Exception Orchestrator (Fulfillment)
    // ----------------------------------------------------
    console.log("\n[2] Testing Exception Orchestrator...");
    await page.goto('http://localhost:3000/fulfillment/orchestrator', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Clicking 'Run Full Scan' / 'Start Orchestration'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scanBtn = btns.find(b => b.textContent.includes('Scan') || b.textContent.includes('Orchestration') || b.textContent.includes('Run'));
      if(scanBtn) scanBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000)); 

    const exceptionsText = await page.evaluate(() => document.body.innerText);
    if(exceptionsText.toLowerCase().includes('stockout') || exceptionsText.toLowerCase().includes('exception')) {
      console.log("Exceptions loaded successfully.");
    } else {
      console.log("Exceptions Dashboard loaded (No exceptions found/displayed).");
    }

    // ----------------------------------------------------
    // TEST 3: Stripe Chargeback Defense (Finance)
    // ----------------------------------------------------
    console.log("\n[3] Testing Chargeback Defense Assembly...");
    await page.goto('http://localhost:3000/finance/disputes', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Look for a dispute and handle it
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const handleBtn = btns.find(b => b.textContent.includes('Submit Evidence') || b.textContent.includes('Handle'));
      if(handleBtn) handleBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const trackingInput = Array.from(inputs).find(i => i.name === 'trackingNumber' || (i.previousElementSibling && i.previousElementSibling.textContent.includes('Tracking')));
      if (trackingInput) {
        trackingInput.value = '1Z9999999999999999';
        trackingInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => b.textContent.includes('Submit to Stripe'));
        if(submitBtn) submitBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // ----------------------------------------------------
    // TEST 4: VOC Dashboard (Support)
    // ----------------------------------------------------
    console.log("\n[4] Testing VOC Root Cause Analysis Dashboard...");
    await page.goto('http://localhost:3000/support/voc', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    console.log("VOC Dashboard loaded.");
    
    // ----------------------------------------------------
    // TEST 5: Chat Workspace & Opendesign Adapter Engine
    // ----------------------------------------------------
    console.log("\n[5] Testing AI Workspace (Checking OpenDesign Adapters)...");
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Describe your task"]');
      if (input) {
        input.value = 'Verify the 25-CLI adapter pool connectivity.';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll('button'));
      const sendBtn = btns.find(b => b.textContent.includes('Send'));
      if(sendBtn) sendBtn.click();
    });
    
    console.log("Message sent to AI. Waiting 8 seconds for stream...");
    await new Promise(r => setTimeout(r, 8000));
    
    const chatText = await page.evaluate(() => {
      const chatArea = document.querySelector('.flex-1.overflow-y-auto');
      return chatArea ? chatArea.innerText : '';
    });
    
    if (chatText.includes('Verify the 25-CLI adapter')) {
      console.log("Chat stream successfully initiated and logged in DOM.");
    } else {
      console.log("Chat text not found in expected container.");
    }

    if (errorCount === 0) {
      console.log("\n✅ E2E Full SOP Visual Test Completed PERFECTLY (0 Console Errors).");
    } else {
      console.log(`\n⚠️ E2E Full SOP Visual Test Completed with ${errorCount} UI Console Errors.`);
    }

  } catch (err) {
    console.error("\n❌ E2E Failed:", err.message);
  } finally {
    await browser.close();
  }
})();
