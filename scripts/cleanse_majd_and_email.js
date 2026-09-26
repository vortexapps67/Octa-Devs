const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'blog.html',
  'work.html',
  'index.html',
  'octa_dynamic.js',
  'lib/discord.js',
  'admin.html',
  'framer_assets/eZclQF9km6RyQYrP2e1w3sYdao8k9jUMgr7D5_j2e-Q.B94_JLcT.mjs',
  'framer_assets/IUfaRdrYP299QO-_KZl2UHHfC3YEG6T8tDv8UCQwvbU.CAUwLLNa.mjs',
  'framer_assets/searchIndex-VrDjBayXNCet.json',
  'framer_assets/axIbG4jg1I6n2YhEKRkY-jJU9z6QcVI6NT0KPkeyrr8.g-ZTj7D2.mjs',
  'framer_assets/script_main.CUIZOb_Z.mjs'
];

let totalMajdReplaced = 0;
let totalEmailReplaced = 0;

for (const relPath of filesToProcess) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  // 1. Replace email
  const emailRegex = /hello\.octadevs@gmail\.com/g;
  const emailMatches = (content.match(emailRegex) || []).length;
  if (emailMatches > 0) {
    content = content.replace(emailRegex, 'hello@octadevs.fun');
    totalEmailReplaced += emailMatches;
    console.log(`[Email] Replaced ${emailMatches} occurrences in ${relPath}`);
  }

  // 2. Replace Majd (with boundary/specific awareness)
  // "Projects  - Majd" -> "Projects — Octa Devs"
  // "Starting and Growing a Career in Web Design - Majd" -> "... - Octa Devs"
  // "- Majd" -> "- Octa Devs"
  // "Majd" -> "Octa Devs"
  const majdRegex = /\bMajd\b/g;
  const majdMatches = (content.match(majdRegex) || []).length;
  if (majdMatches > 0) {
    content = content.replace(/Projects\s*-\s*Majd/g, 'Projects — Octa Devs');
    content = content.replace(majdRegex, 'Octa Devs');
    totalMajdReplaced += majdMatches;
    console.log(`[Majd] Replaced ${majdMatches} occurrences in ${relPath}`);
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

console.log(`\nSummary: Replaced ${totalMajdReplaced} 'Majd' and ${totalEmailReplaced} old emails.`);
