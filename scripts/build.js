const fs = require('fs');
const path = require('path');

const framerAssetsDir = path.join(__dirname, 'framer_assets');
const localFiles = new Set(fs.readdirSync(framerAssetsDir));

function replaceUrls(content) {
  // Replace https://framerusercontent.com/.../FILENAME with ./framer_assets/FILENAME
  return content.replace(/https:\/\/framerusercontent\.com\/[^\s"'<>\)]+/g, (match) => {
    let clean = match.split('&amp;').join('&');
    clean = clean.replace(/[,;\"'>]+$/, '');
    try {
      const parsed = new URL(clean);
      const filename = path.basename(parsed.pathname);
      if (localFiles.has(filename)) {
        return `./framer_assets/${filename}`;
      }
    } catch (e) {}
    return match;
  });
}

// 1. Process index.html
let html = fs.readFileSync('framer_page.html', 'utf8');

// Disable framer editor bar and telemetry
html = html.replace(/<script[^>]*src="https:\/\/events\.framer\.com\/script\?v=2"[^>]*><\/script>/gi, '');
html = html.replace(/try\{if\(localStorage\.getItem\("__framer_force_showing_editorbar_since"\)[\s\S]*?\}catch\(e\)\{\}/g, '');

// Replace URLs
html = replaceUrls(html);

// Ensure relative links work
html = html.replace(/https:\/\/cloudy-party-424179\.framer\.app\//g, './');
html = html.replace(/href="\/work"/g, 'href="./work.html"');
html = html.replace(/href="\/blog"/g, 'href="./blog.html"');

fs.writeFileSync('index.html', html);
console.log('Generated index.html (size: ' + html.length + ')');

// 2. Process work.html
if (fs.existsSync('page_work.html')) {
  let workHtml = fs.readFileSync('page_work.html', 'utf8');
  workHtml = workHtml.replace(/<script[^>]*src="https:\/\/events\.framer\.com\/script\?v=2"[^>]*><\/script>/gi, '');
  workHtml = replaceUrls(workHtml);
  workHtml = workHtml.replace(/https:\/\/cloudy-party-424179\.framer\.app\//g, './');
  workHtml = workHtml.replace(/href="\/work"/g, 'href="./work.html"');
  workHtml = workHtml.replace(/href="\/blog"/g, 'href="./blog.html"');
  fs.writeFileSync('work.html', workHtml);
  console.log('Generated work.html');
}

// 3. Process blog.html
if (fs.existsSync('page_blog.html')) {
  let blogHtml = fs.readFileSync('page_blog.html', 'utf8');
  blogHtml = blogHtml.replace(/<script[^>]*src="https:\/\/events\.framer\.com\/script\?v=2"[^>]*><\/script>/gi, '');
  blogHtml = replaceUrls(blogHtml);
  blogHtml = blogHtml.replace(/https:\/\/cloudy-party-424179\.framer\.app\//g, './');
  blogHtml = blogHtml.replace(/href="\/work"/g, 'href="./work.html"');
  blogHtml = blogHtml.replace(/href="\/blog"/g, 'href="./blog.html"');
  fs.writeFileSync('blog.html', blogHtml);
  console.log('Generated blog.html');
}

console.log('Done!');
