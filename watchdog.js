const { exec, spawn } = require('child_process');

function log(msg) {
  const time = new Date().toISOString();
  console.log(`[${time}] ${msg}`);
}

function checkAndRun9Router() {
  // Check if 9router is running on Windows
  exec('tasklist /FI "IMAGENAME eq 9router.exe"', (err, stdout) => {
    if (err) {
      log('Error checking for 9router: ' + err.message);
      return;
    }

    if (!stdout.includes('9router.exe')) {
      log('9router is NOT running. Attempting to start...');
      // Start 9router in detached mode so watchdog doesn't block
      // Replace with actual path to 9router if not in PATH
      const child = spawn('9router.exe', [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      log('9router started.');
    } else {
      // 9router is running
      // log('9router is running normally.'); // Uncomment for verbose logging
    }
  });
}

log('Watchdog started. Monitoring 9router every 10 seconds...');
// Run immediately
checkAndRun9Router();
// Run every 10 seconds
setInterval(checkAndRun9Router, 10000);
