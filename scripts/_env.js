/**
 * Minimal .env loader for the dev/test scripts, mirroring server.js.
 * Keeps credentials out of the scripts themselves — they are committed, and
 * this repo is public.
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

/** Returns a required env var, exiting with a clear message when it is unset. */
function requireEnv(name) {
  loadEnv();
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. Add it to .env before running this script.`);
    process.exit(1);
  }
  return value;
}

module.exports = { loadEnv, requireEnv };
