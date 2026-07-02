const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = (await browser.pages())[0];

  console.log("Navigating to http://localhost:3000/workspace...");
  await page.goto('http://localhost:3000/workspace');
  await new Promise(r => setTimeout(r, 2000));

  console.log("Looking for conversation list in Sidebar...");
  const sidebarText = await page.evaluate(() => {
    const el = document.querySelector('.w-64.shrink-0');
    return el ? el.innerText : '';
  });
  console.log(`--- Sidebar Content ---\n${sidebarText.substring(0, 100)}\n-----------------------`);
  
  console.log("Clicking the first conversation to load its messages...");
  await page.evaluate(() => {
    const convItems = Array.from(document.querySelectorAll('.w-64.shrink-0 .group'));
    if (convItems.length > 0) {
      convItems[0].click();
    }
  });

  await new Promise(r => setTimeout(r, 3000));
  
  const bodyText = await page.evaluate(() => {
    const chatArea = document.querySelector('.flex-1.overflow-y-auto');
    return chatArea ? chatArea.innerText : '';
  });
  
  console.log("--- CHAT AREA SNAPSHOT AFTER LOADING HISTORY ---");
  console.log(bodyText.substring(0, 500));
  console.log("-----------------------------------------------");
  
  await browser.close();
})();
