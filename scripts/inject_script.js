const fs = require('fs');

['index.html', 'work.html', 'blog.html', 'privacy.html', 'terms.html'].forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('octa_dynamic.js')) {
    content = content.replace('</body>', '  <script src="./octa_dynamic.js"></script>\n</body>');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Injected octa_dynamic.js into ' + f);
  } else {
    console.log('Already present in ' + f);
  }
});
