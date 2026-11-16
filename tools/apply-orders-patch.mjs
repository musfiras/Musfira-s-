// Usage (VS Code terminal, project root):
//   node apply-orders-patch.mjs public/orders-desk.html
// Isi folder mein orders-addon.html bhi honi chahiye.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
if (!target || !fs.existsSync(target)) {
  console.error('❌ Dashboard file ka path dein, e.g.: node apply-orders-patch.mjs public/orders-desk.html');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const addonPath = path.join(here, 'orders-addon.html');
if (!fs.existsSync(addonPath)) {
  console.error('❌ orders-addon.html is script ke saath same folder mein rakhein.');
  process.exit(1);
}

let html = fs.readFileSync(target, 'utf8');
const bakPath = path.join(here, path.basename(target) + '.bak');   // backup tools/ mein, public/ mein nahi
fs.writeFileSync(bakPath, html);
const log = [];

// 1) Apparel & Jewellery page hatao
const before1 = html;
html = html.replace(/^[ \t]*\{name:'Apparel & Jewellery'[^\n]*\},?[ \t]*\r?\n/m, '');
log.push(html !== before1 ? '✅ Apparel & Jewellery hata diya' : 'ℹ️ Apparel & Jewellery pehle se nahi tha');

// 2) Store link: www.musfiras.com/store/
const before2 = html;
html = html.replace("'https://www.musfiras.com/store'", "'https://www.musfiras.com/store/'");
log.push(html !== before2 ? '✅ Store link ab https://www.musfiras.com/store/ hai'
  : (html.includes("'https://www.musfiras.com/store/'") ? 'ℹ️ Store link pehle se /store/ tha' : '⚠️ Store link line nahi mili, STORE_PAGES khud check karein'));

// 3) Add-on (copy button, NEW/Seen, compact cards)
if (html.includes('window.__nwAddon')) {
  log.push('ℹ️ Add-on pehle se laga hua hai');
} else {
  const addon = fs.readFileSync(addonPath, 'utf8');
  if (!/<\/body>/i.test(html)) { console.error('❌ </body> nahi mila.'); process.exit(1); }
  html = html.replace(/<\/body>/i, () => addon + '\n</body>');
  log.push('✅ Add-on laga diya');
}

fs.writeFileSync(target, html);
console.log(log.join('\n'));
console.log('\nBackup: ' + bakPath);
