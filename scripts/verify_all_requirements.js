const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      if (typeof data === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(data));
      } else {
        req.write(data);
      }
    }
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('OCTA DEVS SYSTEM VERIFICATION & AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check admin.html for admin00 in placeholder
  const adminHtml = fs.readFileSync('admin.html', 'utf8');
  assert(!adminHtml.includes('Enter admin password (admin00)...'), 'admin00 removed from admin password placeholder');
  assert(adminHtml.includes('placeholder="Enter admin password..."'), 'clean placeholder "Enter admin password..." is present');
  assert(adminHtml.includes('https://github.com/octa-devs'), 'GitHub link present in admin header');
  assert(adminHtml.includes('https://discord.gg/6t8GfTSRBN'), 'Discord link present in admin header');
  assert(adminHtml.includes('sync-supabase-btn'), 'Supabase Sync button present in admin');

  // 2. Check all files for Majd removal
  const filesToCheckMajd = [
    'blog.html',
    'work.html',
    'index.html',
    'framer_assets/eZclQF9km6RyQYrP2e1w3sYdao8k9jUMgr7D5_j2e-Q.B94_JLcT.mjs',
    'framer_assets/IUfaRdrYP299QO-_KZl2UHHfC3YEG6T8tDv8UCQwvbU.CAUwLLNa.mjs',
    'framer_assets/searchIndex-VrDjBayXNCet.json'
  ];

  for (const f of filesToCheckMajd) {
    const content = fs.readFileSync(f, 'utf8');
    const majdCount = (content.match(/\bMajd\b/gi) || []).length;
    assert(majdCount === 0, `No occurrences of 'Majd' in ${f} (found: ${majdCount})`);
  }

  // 3. Check for old email removal and new email presence
  const filesToCheckEmail = ['index.html', 'work.html', 'blog.html', 'octa_dynamic.js'];
  for (const f of filesToCheckEmail) {
    const content = fs.readFileSync(f, 'utf8');
    const oldEmailCount = (content.match(/hello\.octadevs@gmail\.com/g) || []).length;
    assert(oldEmailCount === 0, `No old email (hello.octadevs@gmail.com) in ${f}`);
    assert(content.includes('hello@octadevs.fun'), `New email (hello@octadevs.fun) present in ${f}`);
  }

  // 4. Check octa_dynamic.js for dev team positioning and social links
  const dynamicJs = fs.readFileSync('octa_dynamic.js', 'utf8');
  assert(dynamicJs.includes('https://discord.gg/6t8GfTSRBN'), 'Discord invite URL configured in octa_dynamic.js');
  assert(dynamicJs.includes('https://github.com/octa-devs'), 'GitHub URL configured in octa_dynamic.js');
  assert(dynamicJs.includes('octa-dynamic-team-section'), 'Dynamic team section defined in octa_dynamic.js');
  assert(dynamicJs.includes('octa-team-showcase-section'), 'Team showcase section styled in octa_dynamic.js');
  assert(dynamicJs.includes('octa-insta-chip'), 'Instagram chips with profile links included in team cards');
  assert(dynamicJs.includes('octa-footer-bottom-bar'), 'Footer bottom bar with social links present');

  // 5. Test Live HTTP API Endpoints
  console.log('\n--- Testing Live Server Endpoints ---');

  // 5a. Public Launch Countdown
  const cdRes = await request({ host: 'localhost', port: 3000, path: '/api/countdown', method: 'GET' });
  assert(cdRes.status === 200 && cdRes.body.success, 'GET /api/countdown returns 200 OK');
  assert(cdRes.body.countdown && cdRes.body.countdown.target_date, `Countdown target date active: ${cdRes.body.countdown?.target_date}`);

  // 5b. Public Team Members
  const teamRes = await request({ host: 'localhost', port: 3000, path: '/api/team', method: 'GET' });
  assert(teamRes.status === 200 && teamRes.body.success, 'GET /api/team returns 200 OK');
  assert(Array.isArray(teamRes.body.team) && teamRes.body.team.length >= 2, `Team members retrieved from backend: ${teamRes.body.team?.length} members`);
  const aarav = teamRes.body.team.find(m => m.name.includes('Aarav'));
  assert(aarav && aarav.socials && aarav.socials.instagram, `Team member Aarav has Instagram: ${aarav?.socials?.instagram}`);

  // 5c. Admin Authentication
  const loginRes = await request({ host: 'localhost', port: 3000, path: '/api/admin/login', method: 'POST' }, { password: 'admin00' });
  assert(loginRes.status === 200 && loginRes.body.token, 'POST /api/admin/login succeeds with passcode');
  const token = loginRes.body.token;

  // 5d. Admin Stats & Supabase Connectivity
  const statsRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/admin/stats',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert(statsRes.status === 200 && statsRes.body.success, 'GET /api/admin/stats returns 200 OK');
  assert(statsRes.body.stats && statsRes.body.stats.supabaseConnected, 'Supabase Cloud API reported as Connected (Live Postgres)');
  assert(statsRes.body.stats && statsRes.body.stats.discordWebhookConfigured, 'Discord Webhook reported as Configured');

  // 5e. Admin Supabase Sync endpoint
  const syncRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/admin/sync',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert(syncRes.status === 200 && syncRes.body.success, `POST /api/admin/sync successfully synchronized cloud tables (${syncRes.body.count?.team} members, ${syncRes.body.count?.projects} projects)`);

  console.log(`\n====================================================`);
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) process.exit(1);
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
