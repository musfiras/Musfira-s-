// tools/site-scanner.mjs  (SMART VERSION)
// Astro integration: poori site scan, text/link/product/image edit, backup/undo, git publish.
// Dashboard sirf dev mode (npm run dev) me /dashboard par chalta hai.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);

// ====== SETTINGS ======
const ROOT = process.cwd();
const SCAN_DIRS = ['src'];
const PUBLIC_DIR = 'public';
const PRODUCTS_FILE = 'src/data/products.json';
const EXTS = new Set(['.astro', '.md', '.mdx', '.json', '.ts', '.js', '.mjs', '.tsx', '.jsx']);
const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif', '.ico']);
const MAX_BACKUPS = 200;
// ======================

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

const insideDir = (abs, base) => abs.startsWith(path.join(ROOT, base) + path.sep);

// ---------- state ----------
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { seen: null, events: [] }; }
}
function saveState(state) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------- backups ----------
function makeBackup(files, label, created = []) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 5);
  const dir = path.join(BACKUP_DIR, stamp);
  fs.mkdirSync(dir, { recursive: true });
  const kept = [];
  for (const f of files) {
    const abs = path.resolve(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const to = path.join(dir, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(abs, to);
    kept.push(f);
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ label, t: Date.now(), files: kept, created }, null, 2));
  try { // purane backups saaf
    const all = fs.readdirSync(BACKUP_DIR).sort();
    for (const old of all.slice(0, Math.max(0, all.length - MAX_BACKUPS))) fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
  } catch {}
  return stamp;
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).sort().reverse().slice(0, 100).map((stamp) => {
    const dir = path.join(BACKUP_DIR, stamp);
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); }
    catch { meta = { label: 'Backup', files: walk(dir).map((f) => posix(path.relative(dir, f))), created: [] }; }
    return { stamp, label: meta.label, t: meta.t || null, files: meta.files, created: meta.created || [] };
  });
}

function restoreBackup(stamp) {
  if (!/^[\w\-]+$/.test(stamp || '')) throw new Error('bad stamp');
  const dir = path.join(BACKUP_DIR, stamp);
  const b = listBackups().find((x) => x.stamp === stamp);
  if (!b) throw new Error('backup nahi mila');
  const okPath = (f) => { const a = path.resolve(ROOT, f); return insideDir(a, 'src') || insideDir(a, PUBLIC_DIR); };
  const all = [...b.files, ...b.created].filter(okPath);
  const snap = makeBackup(all, 'Restore se pehle (auto)');
  for (const f of b.files.filter(okPath)) {
    const to = path.resolve(ROOT, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(dir, f), to);
  }
  for (const f of b.created.filter(okPath)) { try { fs.unlinkSync(path.resolve(ROOT, f)); } catch {} }
  return { restored: b.files.length + b.created.length, undoStamp: snap };
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
  const run2 = (re) => { re.lastIndex = 0; let m; while ((m = re.exec(content))) add(m[1], m.index); };
  run2(ATTR);
  if (ext === '.md' || ext === '.mdx') run2(MD);
  if (!['.astro', '.md', '.mdx'].includes(ext)) run2(STR);
  return [...found.values()];
}

function findTitle(content) {
  const m = content.match(/<title>([^<]+)<\/title>/) || content.match(/^title:\s*["']?(.+?)["']?\s*$/m) ||
    content.match(/\btitle\s*=\s*["']([^"']+)["']/);
  return m ? m[1].trim() : '';
}

// ---------- TEXT extraction (visible text, attributes, config strings) ----------
const blank = (s) => s.replace(/[^\n]/g, ' ');
const isTextOk = (t) => t.length >= 2 && /\p{L}/u.test(t) && !/^(&#?\w+;)+$/.test(t);
function isCodeLike(t) {
  if (/^[a-z0-9_\-.:\/#@?=&%]+$/.test(t)) return true;
  if (/^(https?:|\/|\.|#|data:|mailto:|tel:)/i.test(t)) return true;
  if (/\.(png|jpe?g|webp|svg|gif|avif|ico|pdf|mp4|css|js|mjs|astro|json)$/i.test(t)) return true;
  if (/^[A-Za-z0-9]+$/.test(t) && /[a-z][A-Z]/.test(t)) return true;
  if (/^[A-Z0-9_]+$/.test(t) && t.includes('_')) return true;
  if (/[;{}]|=>/.test(t)) return true;
  if (!/\s/.test(t) && t.length > 30) return true;
  return false;
}

function extractTexts(file, src) {
  const ext = path.extname(file);
  const isAstro = ext === '.astro';
  const isMd = ext === '.md' || ext === '.mdx';
  const out = new Map();
  const add = (pos, text, kind, escMode) => { if (!out.has(pos)) out.set(pos, { file, pos, len: text.length, text, kind, esc: escMode }); };

  if (isMd) {
    let off = 0, fence = false, fm = src.startsWith('---');
    for (const line of src.split('\n')) {
      const t = line.trim();
      const lead = line.length - line.trimStart().length;
      if (t.startsWith('```')) fence = !fence;
      else if (fm && off > 0 && t === '---') fm = false;
      else if (!fence && !fm && t && isTextOk(t)) add(off + lead, t.replace(/\r$/, ''), 'text', 'raw');
      off += line.length + 1;
    }
    return finish(out, src);
  }

  const code = []; let fmEnd = 0;
  if (isAstro) {
    const fm = /^(\s*)---\r?\n[\s\S]*?\r?\n---/.exec(src);
    if (fm) { fmEnd = fm[0].length; code.push([0, fmEnd]); }
    for (const m of src.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
      const open = m[0].match(/^<script\b[^>]*>/)[0].length;
      code.push([m.index + open, m.index + m[0].length - 9]);
    }
  } else if (ext !== '.json') code.push([0, src.length]);

  let m = src;
  if (isAstro) m = m.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank).replace(/<!--[\s\S]*?-->/g, blank);
  for (const [s, e] of code) {
    const seg = m.slice(s, e)
      .replace(/\/\*[\s\S]*?\*\//g, blank)
      .replace(/(^|[\s;{}(,])\/\/[^\n]*/gm, (x, a) => a + blank(x.slice(a.length)));
    m = m.slice(0, s) + seg + m.slice(e);
  }
  const inCode = (p) => code.some(([s, e]) => p >= s && p < e);

  if (isAstro) {
    for (const mm of m.matchAll(/\b(alt|title|placeholder|aria-label|label|value|content)\s*=\s*(?:"([^"<>{}]*)"|'([^'<>{}]*)')/g)) {
      const dq = mm[2] !== undefined, t = dq ? mm[2] : mm[3];
      const pos = mm.index + mm[0].search(/["']/) + 1;
      if (pos < fmEnd || !isTextOk(t) || /[=;]/.test(t)) continue;
      add(pos, t, 'attr', dq ? 'attr"' : "attr'");
    }
    for (const mm of m.matchAll(/>([^<>]+)</g)) {
      const raw = mm[1], lead = raw.length - raw.trimStart().length, t = raw.trim();
      const pos = mm.index + 1 + lead;
      if (pos < fmEnd || !isTextOk(t) || /[=;(){}]/.test(t)) continue;
      add(pos, t, 'text', inCode(pos) ? 'html+js' : 'html');
    }
  }
  for (const mm of m.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const pos = mm.index + 1, t = mm[2];
    if (isAstro && !inCode(pos)) continue;
    if (out.has(pos) || !isTextOk(t) || /[<>]/.test(t) || t.includes('${') || t.includes('\\') || isCodeLike(t)) continue;
    add(pos, t, 'str', 'js' + mm[1]);
  }
  return finish(out, src);
}

function finish(map, src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
  const lineOf = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
  return [...map.values()].sort((a, b) => a.pos - b.pos).map((e) => ({ ...e, line: lineOf(e.pos) }));
}

function encode(to, mode) {
  const s = String(to);
  switch (mode) {
    case 'raw': return s;
    case 'html': return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
    case 'html+js': return encode(s, 'html').replace(/\\/g, '\\\\').replace(/(['"`])/g, '\\$1').replace(/\r?\n/g, ' ');
    case 'attr"': return s.replace(/[<>{}]/g, '').replace(/"/g, '&quot;').replace(/\r?\n/g, ' ');
    case "attr'": return s.replace(/[<>{}]/g, '').replace(/'/g, '&#39;').replace(/\r?\n/g, ' ');
    case 'js"': case "js'": case 'js`': {
      const q = mode[2];
      let r = s.replace(/\\/g, '\\\\').split(q).join('\\' + q).replace(/\r?\n/g, ' ');
      if (q === '`') r = r.replace(/\$\{/g, '\\${');
      return r;
    }
    default: throw new Error('bad esc');
  }
}

export function applyEdits(list, label) {
  const byFile = {};
  for (const e of list) {
    if (typeof e.file !== 'string' || typeof e.from !== 'string' || typeof e.to !== 'string' || !Number.isInteger(e.pos)) continue;
    (byFile[e.file] ||= []).push(e);
  }
  const plan = [], errors = [];
  for (const [f, arr] of Object.entries(byFile)) {
    const abs = path.resolve(ROOT, f);
    if (!insideDir(abs, 'src') || !EXTS.has(path.extname(abs)) || !fs.existsSync(abs)) { errors.push(f + ': file allowed nahi'); continue; }
    const src = fs.readFileSync(abs, 'utf8');
    let out = src, n = 0;
    arr.sort((a, b) => b.pos - a.pos);
    for (const e of arr) {
      if (out.slice(e.pos, e.pos + e.from.length) !== e.from) { errors.push(f + ': text badal chuka tha, refresh karo'); continue; }
      out = out.slice(0, e.pos) + encode(e.to, e.esc) + out.slice(e.pos + e.from.length);
      n++;
    }
    if (n) plan.push({ f, src, out, n });
  }
  let backup = null;
  if (plan.length) {
    backup = makeBackup(plan.map((p) => p.f), label || 'Text edit');
    for (const p of plan) fs.writeFileSync(path.resolve(ROOT, p.f), p.out);
  }
  return { changed: plan.reduce((a, p) => a + p.n, 0), files: plan.map((p) => p.f), errors, backup };
}

// ---------- imports (kaun si file kis page par use hoti hai) ----------
function importsOf(file, src, fileSet) {
  const dir = path.posix.dirname(file), out = [];
  for (const m of src.matchAll(/\b(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const p = path.posix.normalize(path.posix.join(dir, m[1]));
    const hit = [p, p + '.astro', p + '.ts', p + '.js', p + '.json', p + '/index.astro'].find((c) => fileSet.has(c));
    if (hit) out.push(hit);
  }
  return out;
}

// ---------- scan ----------
export function scan(state = loadState()) {
  const pagesAbs = path.join(ROOT, 'src/pages');
  const publicAbs = path.join(ROOT, PUBLIC_DIR);
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)).filter((f) => EXTS.has(path.extname(f))));
  const publicSet = new Set(walk(publicAbs).map((f) => '/' + posix(path.relative(publicAbs, f))));
  const fileSet = new Set(files.map(rel));
  const texts = [], graph = {};

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
      kind = 'other'; category = file.split('/')[1] || 'other';
    }

    graph[file] = importsOf(file, content, fileSet);
    try { texts.push(...extractTexts(file, content)); } catch {}

    return {
      file, kind, route, category,
      title: findTitle(content),
      hash: crypto.createHash('md5').update(content).digest('hex'),
      mtime: fs.statSync(abs).mtimeMs,
      links: extractLinks(content, ext),
    };
  });

  // page -> files (transitive imports)
  const fileRoutes = {};
  const pages = items.filter((i) => i.kind === 'page').map((i) => ({ route: i.route, file: i.file, title: i.title }));
  for (const p of pages) {
    const seen = new Set([p.file]), q = [p.file];
    while (q.length) for (const n of graph[q.shift()] || []) if (!seen.has(n)) { seen.add(n); q.push(n); }
    for (const f of seen) (fileRoutes[f] ||= []).push(p.route);
  }
  for (const t of texts) t.pages = fileRoutes[t.file] || [];
  for (const it of items) it.pages = fileRoutes[it.file] || [];

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

  if (!state.seen) {
    state.seen = Object.fromEntries(items.map((i) => [i.file, i.hash]));
    saveState(state);
  }
  for (const it of items) {
    it.links.forEach((l) => { l.broken = isBroken(l); });
    const s = state.seen[it.file];
    it.status = s === undefined ? 'new' : s !== it.hash ? 'changed' : '';
  }

  const result = { generatedAt: Date.now(), items, pages, texts, events: state.events || [] };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify({ generatedAt: result.generatedAt, items, pages, events: result.events }, null, 2));
  return result;
}

// ---------- link replace ----------
export function replaceLink({ from, to, file }) {
  if (!from || typeof to !== 'string' || from === to) return { changed: 0, files: [] };
  const targets = file ? [file] : SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)).map(rel));
  const re = new RegExp('(?<![\\w\\-/.:%])' + esc(from) + '(?![\\w\\-/.%])', 'g');
  const plan = [];
  for (const f of targets) {
    const abs = path.resolve(ROOT, f);
    if (!insideDir(abs, 'src') || !EXTS.has(path.extname(abs)) || !fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    let n = 0;
    const out = src.replace(re, () => { n++; return to; });
    if (n) plan.push({ f, out, n });
  }
  let backup = null;
  if (plan.length) {
    backup = makeBackup(plan.map((p) => p.f), 'Link: ' + from + ' -> ' + to);
    for (const p of plan) fs.writeFileSync(path.resolve(ROOT, p.f), p.out);
  }
  return { changed: plan.reduce((a, p) => a + p.n, 0), files: plan.map((p) => p.f), backup };
}

// ---------- images ----------
function listImages() {
  const base = path.join(ROOT, PUBLIC_DIR);
  return walk(base).filter((f) => IMG_EXTS.has(path.extname(f).toLowerCase())).map((f) => {
    const st = fs.statSync(f);
    return { path: '/' + posix(path.relative(base, f)), size: st.size, mtime: st.mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
}

function saveUpload({ name, data, dest, folder }) {
  const buf = Buffer.from(String(data || '').split(',').pop(), 'base64');
  if (!buf.length || buf.length > 25 * 1024 * 1024) throw new Error('file khali ya 25MB se bari hai');
  let relPath;
  if (dest) relPath = String(dest).replace(/^\/+/, '');
  else {
    const fo = String(folder || 'images');
    if (!/^[A-Za-z0-9_\-/]{1,40}$/.test(fo) || fo.includes('..')) throw new Error('bad folder');
    const base = String(name || 'photo.jpg').replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-');
    relPath = fo + '/' + base;
  }
  let abs = path.resolve(ROOT, PUBLIC_DIR, relPath);
  if (!insideDir(abs, PUBLIC_DIR) || !IMG_EXTS.has(path.extname(abs).toLowerCase())) throw new Error('sirf images allowed hain');
  if (!dest) {
    const ext = path.extname(abs), stem = abs.slice(0, -ext.length);
    let i = 1;
    while (fs.existsSync(abs)) abs = stem + '-' + i++ + ext;
  }
  const relFile = rel(abs);
  if (fs.existsSync(abs)) makeBackup([relFile], 'Image replace: ' + relFile);
  else makeBackup([], 'Image upload: ' + relFile, [relFile]);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  return '/' + posix(path.relative(path.join(ROOT, PUBLIC_DIR), abs));
}

function deleteImage(p) {
  const abs = path.resolve(ROOT, PUBLIC_DIR, String(p).replace(/^\/+/, ''));
  if (!insideDir(abs, PUBLIC_DIR) || !IMG_EXTS.has(path.extname(abs).toLowerCase()) || !fs.existsSync(abs)) throw new Error('image nahi mili');
  makeBackup([rel(abs)], 'Image delete: ' + rel(abs));
  fs.unlinkSync(abs);
}

// ---------- git ----------
async function git(args) {
  const { stdout, stderr } = await run('git', args, { cwd: ROOT, timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
  return (stdout + stderr).trim();
}

// ---------- Astro integration ----------
export default function siteDashboard() {
  return {
    name: 'site-dashboard',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        if (command !== 'dev') return;
        injectRoute({
          pattern: '/dashboard',
          entrypoint: fileURLToPath(new URL('./dashboard.astro', import.meta.url)),
        });
        logger.info('Dashboard: http://localhost:4321/dashboard');
      },
      'astro:server:setup': ({ server }) => {
        let cache = null, version = 0, timer = null, lastErr = null;
        const refresh = () => {
          try { cache = scan(loadState()); lastErr = null; }
          catch (e) { lastErr = e; console.error('[dashboard] scan error:', e); }
          version++;
        };
        refresh();

        const json = (res, data, code = 200) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        const body = (req) => new Promise((ok) => {
          let b = '';
          req.on('data', (c) => { b += c; if (b.length > 40e6) req.destroy(); });
          req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } });
        });

        server.middlewares.use('/__dashboard', async (req, res) => {
          try {
            // Hifazat: sirf localhost + apna header (dusri websites POST nahi kar sakti)
            if (req.headers['x-dash'] !== '1' || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(req.headers.host || ''))) return json(res, { error: 'forbidden' }, 403);
            const url = (req.url || '').split('?')[0];
            const post = req.method === 'POST';

            if (url === '/version') return json(res, { version });
            if (url === '/scan') {
              if (!cache) return json(res, { error: 'Scan fail hua: ' + String((lastErr && lastErr.message) || lastErr) });
              return json(res, { ...cache, version });
            }

            if (url === '/edit' && post) {
              const { items, label } = await body(req);
              if (!Array.isArray(items) || items.length > 3000) return json(res, { error: 'bad items' }, 400);
              const r = applyEdits(items, label);
              refresh();
              return json(res, r);
            }
            if (url === '/replace' && post) { const r = replaceLink(await body(req)); refresh(); return json(res, r); }
            if (url === '/seen' && post) {
              const { file } = await body(req);
              const st = loadState();
              if (!cache) return json(res, { error: 'scan nahi hua' }, 500);
              for (const it of cache.items) if (!file || it.file === file) st.seen[it.file] = it.hash;
              saveState(st); refresh();
              return json(res, { ok: true });
            }

            if (url === '/products') {
              const abs = path.join(ROOT, PRODUCTS_FILE);
              if (post) {
                const { data } = await body(req);
                if (typeof data !== 'object' || data === null) return json(res, { error: 'bad data' }, 400);
                const exists = fs.existsSync(abs);
                const stamp = exists ? makeBackup([PRODUCTS_FILE], 'Products save') : makeBackup([], 'Products file bani', [PRODUCTS_FILE]);
                fs.mkdirSync(path.dirname(abs), { recursive: true });
                fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n');
                refresh();
                return json(res, { ok: true, backup: stamp });
              }
              if (!fs.existsSync(abs)) return json(res, { missing: true });
              try { return json(res, { data: JSON.parse(fs.readFileSync(abs, 'utf8')) }); }
              catch { return json(res, { error: 'products.json valid JSON nahi hai' }); }
            }

            if (url === '/images') return json(res, { images: listImages() });
            if (url === '/upload' && post) { const p = saveUpload(await body(req)); refresh(); return json(res, { path: p }); }
            if (url === '/imgdel' && post) { deleteImage((await body(req)).path); refresh(); return json(res, { ok: true }); }

            if (url === '/backups') return json(res, { backups: listBackups() });
            if (url === '/restore' && post) { const r = restoreBackup((await body(req)).stamp); refresh(); return json(res, r); }

            if (url === '/git') {
              try { const s = await git(['status', '--porcelain']); return json(res, { changed: s ? s.split('\n').length : 0, files: s.split('\n').filter(Boolean).slice(0, 40) }); }
              catch (e) { return json(res, { error: 'git nahi chala' }); }
            }
            if (url === '/publish' && post) {
              const msg = String((await body(req)).message || 'site update via dashboard').slice(0, 200);
              const log = [];
              try {
                log.push(await git(['add', '-A']));
                try { log.push(await git(['commit', '-m', msg])); }
                catch (e) { const t = String((e.stdout || '') + (e.stderr || '')); if (!/nothing to commit/i.test(t)) throw e; log.push('Koi naya change nahi tha commit ke liye.'); }
                log.push(await git(['push']));
                return json(res, { ok: true, log: log.filter(Boolean).join('\n') });
              } catch (e) {
                return json(res, { ok: false, error: String((e.stderr || e.stdout || e.message || e)).slice(0, 1500), log: log.join('\n') });
              }
            }
            return json(res, { error: 'not found' }, 404);
          } catch (e) {
            return json(res, { error: String((e && e.message) || e) }, 500);
          }
        });

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

// Terminal se: node tools/site-scanner.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = scan(loadState());
  const links = r.items.flatMap((i) => i.links);
  console.log(`Files: ${r.items.length} | Pages: ${r.pages.length} | Texts: ${r.texts.length} | Links: ${links.length} | Broken: ${links.filter((l) => l.broken).length}`);
}

