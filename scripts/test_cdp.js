const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getJson(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const port = 9666;
  const tempDir = path.join(__dirname, '..', '.tmp-chrome-' + Date.now());

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900'
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      try {
        targets = await getJson(port);
        if (targets && targets.length > 0) break;
      } catch (e) {
        await sleep(300);
      }
    }

    if (!targets || targets.length === 0) throw new Error('No targets found');
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    console.log('Connecting to target:', pageTarget.webSocketDebuggerUrl);

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    const callbacks = new Map();
    ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('DOM.enable');

    // 1. Screenshot Admin Login
    console.log('Loading /admin...');
    await send('Page.navigate', { url: 'http://localhost:3000/admin' });
    await sleep(2000);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'admin_login_shot.png'), Buffer.from(snap1.data, 'base64'));
    console.log('Captured admin_login_shot.png');

    // 2. Perform Login
    console.log('Authenticating with admin00...');
    await send('Runtime.evaluate', {
      expression: `
        document.getElementById('admin-password').value = 'admin00';
        document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      `
    });
    await sleep(2000);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'admin_dashboard_shot.png'), Buffer.from(snap2.data, 'base64'));
    console.log('Captured admin_dashboard_shot.png');

    // 3. Switch to Team Tab
    console.log('Switching to team tab...');
    await send('Runtime.evaluate', {
      expression: `
        document.querySelector('[data-tab="tab-team"]').click();
      `
    });
    await sleep(1000);
    const snap3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'admin_team_shot.png'), Buffer.from(snap3.data, 'base64'));
    console.log('Captured admin_team_shot.png');

    // 4. Works page with countdown
    console.log('Loading /work.html...');
    await send('Page.navigate', { url: 'http://localhost:3000/work.html' });
    await sleep(2500);
    const snap4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'works_countdown_shot.png'), Buffer.from(snap4.data, 'base64'));
    console.log('Captured works_countdown_shot.png');

    // 5. Index page bio/team
    console.log('Loading /#bio-section...');
    await send('Page.navigate', { url: 'http://localhost:3000/#bio-section' });
    await sleep(2500);
    await send('Runtime.evaluate', {
      expression: `
        const b = document.getElementById('bio-section');
        if (b) b.scrollIntoView();
      `
    });
    await sleep(1000);
    const snap5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'index_team_shot.png'), Buffer.from(snap5.data, 'base64'));
    console.log('Captured index_team_shot.png');

    console.log('All screenshots completed successfully!');
  } finally {
    chrome.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
