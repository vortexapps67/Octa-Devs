const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq !== -1) {
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}

const db = require('../lib/db');

(async () => {
  console.log('Testing Supabase direct connectivity...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  
  const tablesOk = await db.checkSupabaseTables();
  console.log('checkSupabaseTables():', tablesOk);

  const countdown = await db.getCountdown();
  console.log('Countdown from DB:', countdown);

  const team = await db.getTeamMembers();
  console.log('Team members from DB (' + team.length + '):');
  team.forEach(m => console.log(` - [${m.id}] ${m.name} (${m.role}) | Insta: ${m.socials?.instagram || 'None'}`));

  const projects = await db.getProjects();
  console.log('Projects from DB (' + projects.length + '):');
  projects.forEach(p => console.log(` - [${p.id}] ${p.title} (${p.status})`));

  const stats = await db.getStats();
  console.log('DB Stats:', stats);
})();
