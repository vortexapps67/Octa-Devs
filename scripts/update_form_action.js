const fs = require('fs');
const path = 'framer_assets/7oPV0d5R-_s9XnaFI0i3-jHnxm2ywVp_DRXayYgEEJg.CEj_QW2A.mjs';

let js = fs.readFileSync(path, 'utf8');
const search = 'https://api.framer.com/forms/v1/forms/45adc569-efe8-4e8e-8c99-e5ee36977ab2/submit';
const replace = '/api/contact';

if (js.includes(search)) {
  js = js.replace(search, replace);
  fs.writeFileSync(path, js, 'utf8');
  console.log('Replaced Framer form endpoint with /api/contact in ' + path);
} else {
  console.log('Endpoint already replaced or not found');
}
