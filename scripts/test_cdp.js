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
  const port = 9778;
  const tempDir = path.join(__dirname, '..', '.tmp-chrome-' + Date.now());

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,1050'
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

    // 1. Home page: Team Showcase (3 members)
    console.log('Loading http://localhost:3000/...');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(3000);

    await send('Runtime.evaluate', {
      expression: `
        const teamSec = document.getElementById('octa-dynamic-team-section');
        if (teamSec) teamSec.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(800);
    const snapTeam = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'home_team_updated.png'), Buffer.from(snapTeam.data, 'base64'));
    console.log('Captured home_team_updated.png');

    // 2. Home page: Countdown
    await send('Runtime.evaluate', {
      expression: `
        const cd = document.getElementById('octa-home-countdown');
        if (cd) cd.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(800);
    const snapCd = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'home_countdown_updated.png'), Buffer.from(snapCd.data, 'base64'));
    console.log('Captured home_countdown_updated.png');

    // 3. Home page: Published Projects
    await send('Runtime.evaluate', {
      expression: `
        const proj = document.getElementById('octa-published-projects');
        if (proj) proj.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(800);
    const snapProj = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'home_projects_updated.png'), Buffer.from(snapProj.data, 'base64'));
    console.log('Captured home_projects_updated.png');

    // 4. Footer bottom bar
    await send('Runtime.evaluate', {
      expression: `
        const bar = document.getElementById('octa-footer-bottom-bar');
        if (bar) bar.scrollIntoView({ behavior: 'instant', block: 'end' });
      `
    });
    await sleep(800);
    const snapFooter = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, '..', 'footer_bar_updated.png'), Buffer.from(snapFooter.data, 'base64'));
    console.log('Captured footer_bar_updated.png');

    console.log('Verification completed!');
  } finally {
    chrome.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
