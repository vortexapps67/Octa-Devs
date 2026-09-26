const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function capture() {
  const port = 9556;
  const userDataDir = path.join(__dirname, '..', '.chrome-temp-' + Date.now());

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,1000'
  ]);

  try {
    let pageWsUrl = null;
    for (let i = 0; i < 20; i++) {
      try {
        const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
          pageWsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch (e) {
        await sleep(400);
      }
    }

    if (!pageWsUrl) throw new Error('Could not find page target');
    console.log('Connecting to Chrome CDP...');

    const ws = new WebSocket(pageWsUrl);
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    const pending = new Map();
    ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      console.log('Sending:', id, method);
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('DOM.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 1. Admin Login (Check admin00 is gone)
    console.log('1. Navigating to http://localhost:3000/admin...');
    await send('Page.navigate', { url: 'http://localhost:3000/admin' });
    await sleep(2000);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('admin_login.png', Buffer.from(snap1.data, 'base64'));
    console.log('Saved admin_login.png');

    // 2. Login to Admin
    await send('Runtime.evaluate', {
      expression: `
        document.getElementById('admin-password').value = 'admin00';
        document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      `
    });
    await sleep(2000);

    // Click on Database tab
    await send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('button[data-tab="tab-database"]');
        if (btn) btn.click();
      `
    });
    await sleep(1500);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('admin_database.png', Buffer.from(snap2.data, 'base64'));
    console.log('Saved admin_database.png');

    // 3. Home page: Coming Soon & Release Clock
    console.log('3. Navigating to http://localhost:3000/...');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2500);
    
    // Scroll to Coming Soon
    await send('Runtime.evaluate', {
      expression: `
        const cs = document.querySelector('[data-framer-name="Coming Soon Section"], .framer-1koelmu');
        if (cs) cs.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(1000);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('home_countdown.png', Buffer.from(snap3.data, 'base64'));
    console.log('Saved home_countdown.png');

    // 4. Home page: Dev Team section at down
    console.log('4. Scrolling to Dev Team section at down...');
    await send('Runtime.evaluate', {
      expression: `
        const ts = document.getElementById('octa-dynamic-team-section');
        if (ts) ts.scrollIntoView({ behavior: 'instant', block: 'start' });
      `
    });
    await sleep(1000);
    const snap4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('home_team_at_down.png', Buffer.from(snap4.data, 'base64'));
    console.log('Saved home_team_at_down.png');

    // 5. Home page: Footer & Socials
    console.log('5. Scrolling to Footer...');
    await send('Runtime.evaluate', {
      expression: `
        window.scrollTo(0, document.body.scrollHeight);
      `
    });
    await sleep(1000);
    const snap5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('home_footer_socials.png', Buffer.from(snap5.data, 'base64'));
    console.log('Saved home_footer_socials.png');

    // 6. Works Page
    console.log('6. Navigating to http://localhost:3000/work.html...');
    await send('Page.navigate', { url: 'http://localhost:3000/work.html' });
    await sleep(2500);
    const snap6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('works_countdown.png', Buffer.from(snap6.data, 'base64'));
    console.log('Saved works_countdown.png');

    console.log('All screenshots completed successfully!');
  } finally {
    chrome.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch(e) {}
  }
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
