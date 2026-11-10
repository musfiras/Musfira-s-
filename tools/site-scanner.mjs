// tools/site-scanner.mjs
// Astro integration: poori site scan karta hai, changes auto detect karta hai,
// aur /dashboard (sirf dev mode me) inject karta hai.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ====== SETTINGS (apne hisab se badlo) ======
const ROOT = process.cwd();
const SCAN_DIRS = ['src']; // poora src scan hoga: config, data, naye folders sab auto
const PUBLIC_DIR = 'public';
const EXTS = new Set(['.astro', '.md', '.mdx', '.json', '.ts', '.js', '.tsx', '.jsx']);
// =============================================

const OUT_DIR = path.join(ROOT, '.site-dashboard');
const STATE_FILE = path.join(OUT_DIR, 'state.json');
const MAP_FILE = path.join(OUT_DIR, 'site-map.json');
const BACKUP_DIR = path.join(OUT_DIR, 'backups');

const posix = (p) => p.split(path.sep).join('/');
const rel = (abs) => posix(path.relative(ROOT, abs));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ---------- state ----------
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { seen: null, events: [] }; }
}
function saveState(state) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------- link extraction ----------
const ATTR = /\b(?:href|to|url|link|action|path)\s*[:=]\s*\{?\s*["'`]([^"'`\n]+)["'`]/g;
const MD = /\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g;
const STR = /["'`]((?:https?:)?\/\/[^"'`\s]+|\/[A-Za-z0-9_\-[][^"'`\s]*)["'`]/g;
const ASSET = /\.(png|jpe?g|webp|svg|gif|avif|ico|pdf|mp4|webm|woff2?)$/i;

function extractLinks(content, ext) {
  const found = new Map();
  const lineAt = (i) => content.slice(0, i).split('\n').length;
  const add = (url, idx) => {
    url = url.trim();
    if (!url || url.startsWith('#') || /^(mailto:|tel:|javascript:|data:|sms:|whatsapp:)/i.test(url)) return;
    const line = lineAt(idx);
    const key = url + '@' + line;
    if (found.has(key)) return;
    const type = ASSET.test(url.split(/[?#]/)[0]) ? 'asset'
      : /^(https?:)?\/\//i.test(url) ? 'external'
      : url.startsWith('/') ? 'internal' : 'relative';
    found.set(key, { url, line, type, dynamic: /[{}$]/.test(url) });
  };
  const run = (re) => { re.lastIndex = 0; let m; while ((m = re.exec(content))) add(m[1], m.index); };
  run(ATTR);
  if (ext === '.md' || ext === '.mdx') run(MD);
  if (!['.astro', '.md', '.mdx'].includes(ext)) run(STR);
  return [...found.values()];
}

function findTitle(content) {
  const m = content.match(/<title>([^<]+)<\/title>/) || content.match(/^title:\s*["']?(.+?)["']?\s*$/m) ||
    content.match(/\btitle\s*=\s*["']([^"']+)["']/);
  return m ? m[1].trim() : '';
}

// ---------- scan ----------
export function scan(state = loadState()) {
  const pagesAbs = path.join(ROOT, 'src/pages');
  const publicAbs = path.join(ROOT, PUBLIC_DIR);
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)).filter((f) => EXTS.has(path.extname(f))));
  const publicSet = new Set(walk(publicAbs).map((f) => '/' + posix(path.relative(publicAbs, f))));

  const items = files.map((abs) => {
    const file = rel(abs);
    const ext = path.extname(abs);
    const content = fs.readFileSync(abs, 'utf8');
    let kind = 'other', route = null, category = 'other';

    if (file.startsWith('src/pages/') && !path.basename(file).startsWith('_')) {
      const r = posix(path.relative(pagesAbs, abs)).replace(/\.[^.]+$/, '');
      route = '/' + r.replace(/(^|\/)index$/, '');
      kind = ['.astro', '.md', '.mdx'].includes(ext) ? 'page' : 'endpoint';
      const parts = route.split('/').filter(Boolean);
      category = kind === 'endpoint' ? 'api' : parts.length > 1 ? parts[0] : 'main';
    } else if (file.startsWith('src/components/') || file.startsWith('src/pages/')) {
      kind = 'component'; category = 'components';
    } else if (file.startsWith('src/layouts/')) {
      kind = 'layout'; category = 'layouts';
    } else if (file.startsWith('src/data/')) {
      kind = 'data'; category = 'data';
    } else if (file.startsWith('src/content/')) {
      kind = 'content'; category = 'content/' + (file.split('/')[2] || '');
    } else {
      // src/config, src/assets, ya future ka koi bhi naya folder
      kind = 'other'; category = file.split('/')[1] || 'other';
    }

    return {
      file, kind, route, category,
      title: findTitle(content),
      hash: crypto.createHash('md5').update(content).digest('hex'),
      mtime: fs.statSync(abs).mtimeMs,
      links: extractLinks(content, ext),
    };
  });

  // broken link check
  const matchers = items.filter((i) => i.route).map((i) =>
    new RegExp('^' + esc(i.route).replace(/\\\[\\\.\\\.\\\.[^\]]*\\\]/g, '.*').replace(/\\?\[[^\]]+\\?\]/g, '[^/]+') + '/?$'));
  const isBroken = (l) => {
    if (l.type === 'external' || l.type === 'relative' || l.dynamic) return false;
    let p = l.url.split(/[?#]/)[0];
    if (p.length > 1) p = p.replace(/\/$/, '');
    if (!p || p === '/') return false;
    if (publicSet.has(p)) return false;
    return !matchers.some((m) => m.test(p));
  };

  // status (new / changed)
  if (!state.seen) { // pehli baar: sab "seen" maan lo
    state.seen = Object.fromEntries(items.map((i) => [i.file, i.hash]));
    saveState(state);
  }
  for (const it of items) {
    it.links.forEach((l) => { l.broken = isBroken(l); });
    const s = state.seen[it.file];
    it.status = s === undefined ? 'new' : s !== it.hash ? 'changed' : '';
  }

  const result = { generatedAt: Date.now(), items, events: state.events || [] };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(result, null, 2));
  return result;
}

// ---------- replace ----------
export function replaceLink({ from, to, file }) {
  if (!from || typeof to !== 'string' || from === to) return { changed: 0, files: [] };
  const targets = file ? [file] : SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)).map(rel));
  const re = new RegExp('(?<![\\w\\-/.:%])' + esc(from) + '(?![\\w\\-/.%])', 'g');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let changed = 0; const touched = [];
  for (const f of targets) {
    const abs = path.resolve(ROOT, f);
    if (!abs.startsWith(path.join(ROOT, 'src') + path.sep) || !EXTS.has(path.extname(abs)) || !fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    let n = 0;
    const out = src.replace(re, () => { n++; return to; });
    if (!n) continue;
    const bk = path.join(BACKUP_DIR, stamp, f);
    fs.mkdirSync(path.dirname(bk), { recursive: true });
    fs.writeFileSync(bk, src);
    fs.writeFileSync(abs, out);
    changed += n; touched.push(f);
  }
  return { changed, files: touched, backup: '.site-dashboard/backups/' + stamp };
}

// ---------- Astro integration ----------
export default function siteDashboard() {
  return {
    name: 'site-dashboard',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        if (command !== 'dev') return; // production me dashboard hota hi nahi
        injectRoute({
          pattern: '/dashboard',
          entrypoint: fileURLToPath(new URL('./dashboard.astro', import.meta.url)),
        });
        logger.info('Dashboard: http://localhost:4321/dashboard');
      },
      'astro:server:setup': ({ server }) => {
        let cache = null, version = 0, timer = null;
        const refresh = () => { cache = scan(loadState()); version++; };
        refresh();

        const json = (res, data, code = 200) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        const body = (req) => new Promise((ok) => {
          let b = ''; req.on('data', (c) => (b += c));
          req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } });
        });

        server.middlewares.use('/__dashboard', async (req, res) => {
          const url = (req.url || '').split('?')[0];
          if (url === '/version') return json(res, { version });
          if (url === '/scan') return json(res, { ...cache, version });
          if (url === '/replace' && req.method === 'POST') {
            const r = replaceLink(await body(req));
            refresh();
            return json(res, r);
          }
          if (url === '/seen' && req.method === 'POST') {
            const { file } = await body(req);
            const st = loadState();
            for (const it of cache.items) if (!file || it.file === file) st.seen[it.file] = it.hash;
            saveState(st); refresh();
            return json(res, { ok: true });
          }
          return json(res, { error: 'not found' }, 404);
        });

        // VS Code, terminal, kisi se bhi file change ho -> yahan pakri jaye gi
        server.watcher.on('all', (event, abs) => {
          if (!['add', 'change', 'unlink'].includes(event)) return;
          const f = rel(abs);
          if (!(f.startsWith('src/') || f.startsWith(PUBLIC_DIR + '/'))) return;
          const st = loadState();
          st.events = [{ t: Date.now(), type: event, file: f }, ...(st.events || [])].slice(0, 100);
          if (event === 'unlink' && st.seen) delete st.seen[f];
          saveState(st);
          clearTimeout(timer);
          timer = setTimeout(refresh, 150);
        });
      },
    },
  };
}

// Terminal se bhi chala sakte ho: node tools/site-scanner.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = scan(loadState());
  const links = r.items.flatMap((i) => i.links);
  console.log(`Files: ${r.items.length} | Pages: ${r.items.filter((i) => i.kind === 'page').length} | Links: ${links.length} | Broken: ${links.filter((l) => l.broken).length}`);
  console.log('Full map: .site-dashboard/site-map.json');
}
