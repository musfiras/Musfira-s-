// src/pages/search-index.json.js
// Build ke waqt products.js + categories.js ko khud scan karke search ka data banata hai (/search-index.json).
// Naya product ya naya category jodo to yahan kuch nahi badalna, agli build mein khud search mein aa jata hai.

import { products } from '../data/products.js';
import { categories } from '../data/categories.js';

// Ye fields search ke text mein nahi jate (system / image / numbers wale).
// Inke ilawa jo bhi text field product mein ho (brand, material, type, tags waghera) khud scan ho jata hai.
const SKIP = new Set([
  'id', 'slug', 'name', 'price', 'oldPrice', 'offer2', 'offer3', 'stock', 'colors',
  'images', 'image', 'gallery', 'placements', 'descriptionHtml', 'totalStock',
  'inStock', 'save', 'savePercent', 'overview', 'highlights', 'why', 'keywords',
]);
const NOISE_TAGS = new Set(['home', 'shop-all']);

const flat = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.flatMap(flat);
  if (typeof v === 'string') return [v];
  return [];
};
const looksLikeLink = (s) => /^(\/|https?:)/i.test(s) || s.length > 200;

export function GET() {
  const titleByTag = {};
  categories.forEach((c) => { titleByTag[c.tag] = c.title; });

  const data = {
    categories: categories.map((c) => ({ slug: c.slug, title: c.title })),
    products: products.map((p) => {
      // 1) keywords field (agar likha ho) + placements ke tags
      const bag = [
        ...flat(p.keywords),
        ...(p.placements || []).filter((t) => !NOISE_TAGS.has(t)),
      ];
      // 2) baqi sab text fields khud scan (brand, material, type waghera)
      Object.keys(p).forEach((key) => {
        if (SKIP.has(key)) return;
        flat(p[key]).forEach((s) => { if (!looksLikeLink(s)) bag.push(s); });
      });

      return {
        n: p.name,
        s: p.slug,
        p: p.price,
        o: p.oldPrice,
        i: p.image,
        c: (p.colors || []).filter((c) => c !== 'Default'),
        cats: (p.placements || []).map((t) => titleByTag[t]).filter(Boolean),
        h: (p.placements || []).includes('home'),
        k: Array.from(new Set(bag.map((x) => String(x).trim()).filter(Boolean))).join(' '),
        d: [p.overview, ...(p.highlights ?? [])].filter(Boolean).join(' '),
        stock: p.inStock,
      };
    }),
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}