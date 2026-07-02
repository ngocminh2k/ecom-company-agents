const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching Chrome visible on screen (headless: false)...");
  
  // Khởi động Chrome thực sự hiển thị trên màn hình người dùng
  const browser = await puppeteer.launch({
    headless: false, // <-- Cực kỳ quan trọng: Hiện cửa sổ Chrome thật
    defaultViewport: null,
    args: ['--start-maximized', '--auto-open-devtools-for-tabs'] // Tự động mở F12 DevTools
  });

  const pages = await browser.pages();
  const page = pages[0];

  // Kết nối trực tiếp vào Chrome DevTools Protocol (CDP)
  const client = await page.target().createCDPSession();
  
  await client.send('Network.enable');
  await client.send('Log.enable');

  // Lắng nghe Network từ tầng lõi CDP
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
  
  // Chờ 2 giây để user nhìn thấy màn hình load
  await new Promise(r => setTimeout(r, 2000));

  console.log("Typing message visually...");
  await page.waitForSelector('input[placeholder*="Describe your task"]');
  await page.type('input[placeholder*="Describe your task"]', 'Hello OmniStudio from CDP visual test', { delay: 50 }); // Gõ từng chữ một
  
  // Chờ 1s cho user nhìn
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("Clicking Send...");
  await page.click('button:has-text("Send")');

  // Để cửa sổ mở trong 10 giây để AI phản hồi (stream) và người dùng tận mắt xem
  console.log("Waiting 10 seconds to watch the AI stream on screen...");
  await new Promise(r => setTimeout(r, 10000));

  console.log("Test completed. Closing browser.");
  await browser.close();
})();
