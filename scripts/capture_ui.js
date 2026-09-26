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
  const port = 9555;
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
    // Wait for Chrome
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
    console.log('Connecting to page target:', pageWsUrl);

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

    // 1. Admin Login
    console.log('Navigating to http://localhost:3000/admin...');
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
    await sleep(2500);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('admin_dashboard.png', Buffer.from(snap2.data, 'base64'));
    console.log('Saved admin_dashboard.png');

    // 3. Works Page
    console.log('Navigating to http://localhost:3000/work.html...');
    await send('Page.navigate', { url: 'http://localhost:3000/work.html' });
    await sleep(2500);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('works_countdown.png', Buffer.from(snap3.data, 'base64'));
    console.log('Saved works_countdown.png');

    // 4. Bio Section on Home
    console.log('Navigating to http://localhost:3000/#bio-section...');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2500);
    await send('Runtime.evaluate', {
      expression: `
        const b = document.getElementById('bio-section');
        if (b) b.scrollIntoView();
      `
    });
    await sleep(1000);
    const snap4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('index_team.png', Buffer.from(snap4.data, 'base64'));
    console.log('Saved index_team.png');

    console.log('All screenshots captured successfully!');
  } finally {
    chrome.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch(e) {}
  }
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
