export const CHECKOUT_URL = 'https://www.musfiras.com/check_out';

// ============================================================================
//  SETTINGS (yahan se poori site ka default behaviour control hota hai)
// ============================================================================
const DEFAULT_IMAGE = '/handbag.jpeg';   // agar product me images na do to ye lagegi
const OLD_PRICE_MULTIPLIER = 2;          // oldPrice na likho to: price x 2 (50 -> cut 100)
const DEFAULT_PLACEMENTS = ['shop-all']; // placements na likho to sirf store page

// Default description (product me overview / highlights / why na likho to ye aayega)
const DEFAULT_OVERVIEW =
  'A perfect blend of modern minimalism and classic luxury. This sophisticated crossbody bag features a unique dual-texture finish with a beautifully textured flap and a sleek, smooth body. Accentuated by a premium gold-toned metallic emblem, it’s designed to transition effortlessly from casual brunch dates to elite evening gatherings.';

const DEFAULT_HIGHLIGHTS = [
  'Dual-Texture Artistry: A premium combination of a finely textured chevron-pattern flap and a smooth, minimalist base structure.',
  'Dual-Strap Versatility: Comes with a matching shoulder strap and an adjustable, detachable long sling strap for multi-way styling.',
  'Elite Accents: Crowned with a high-shine gold metallic front motif and heavy-duty golden hardware clips.',
  'Smart Organization: Dual-step structured compartment that holds your absolute essentials (phone, cards, lipstick) without losing its clean shape.',
];

const DEFAULT_WHY =
  "Most bags look good but feel ordinary. This piece is crafted specifically for the modern woman who refuses to settle for boring accessories. It doesn't just hold your essentials—it instantly upgrades your entire outfit, giving you that effortless high-end fashion aesthetic without trying too hard.";

// ============================================================================
//  HELPERS (inhe chhedna nahi)
// ============================================================================
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Description HTML auto banta hai: colors stock ke naam se khud aate hain
const buildDesc = (p, colors) => {
  const highlights = (p.highlights ?? DEFAULT_HIGHLIGHTS).join('\n\n');
  return `<div class="m-el-title">✨ ${p.name}✨</div>
<b class="m-el-sub">Product Overview:</b>
${p.overview ?? DEFAULT_OVERVIEW}
• <b class="m-el-sub">Product Highlights:</b> 
${highlights}
• <b class="m-el-sub">💎 Why It’s a Must-Have:</b>
${p.why ?? DEFAULT_WHY}
• <b class="m-el-sub">🎨 Available Colors:</b>
${colors.join('\n\n')}`;
};

// OFFER LOGIC: offer tabhi maana jayega jab wo normal rate se sach mein sasta ho.
// (2 ka offer < price x 2, ya 3 ka offer < price x 3). Warna null.
export const offerDetails = (p) => {
  const o2 = Number(p.offer2);
  const o3 = Number(p.offer3);
  const d = {
    o2: o2 > 0 && o2 < p.price * 2 ? o2 : 0,
    o3: o3 > 0 && o3 < p.price * 3 ? o3 : 0,
  };
  return d.o2 || d.o3 ? d : null;
};

// Product list aur offer list yahan bharti hain (add() khud bharta hai)
export const products = [];
export const offerProducts = []; // sirf offer wale products (chat ke "Offers" button ke liye)

const make = (p) => {
  const slug = p.slug ?? slugify(p.name);
  const price = Number(p.price);

  // Stock: { 'Color': qty }. Number do to "Default" color me jata hai.
  const stock = typeof p.stock === 'number' ? { Default: p.stock } : { ...(p.stock || {}) };
  const colors = p.colors ?? Object.keys(stock);
  const totalStock = Object.values(stock).reduce((a, b) => a + Number(b || 0), 0);

  // Price auto calc: oldPrice na do to price x multiplier
  let oldPrice = Number(p.oldPrice);
  if (!(oldPrice > price)) oldPrice = price * OLD_PRICE_MULTIPLIER;
  const save = oldPrice - price;
  const savePercent = Math.round((save / oldPrice) * 100);

  // Images: pehli = main (card/store page), baqi = details page gallery
  const images = Array.isArray(p.images) && p.images.length ? p.images : [DEFAULT_IMAGE];

  return {
    ...p,
    slug,
    id: p.id ?? slug,
    price,
    oldPrice,
    save,
    savePercent,
    stock,
    colors,
    totalStock,
    inStock: totalStock > 0,
    images,
    image: images[0],
    gallery: images.slice(1),
    placements: p.placements?.length ? p.placements : DEFAULT_PLACEMENTS,
    descriptionHtml: p.descriptionHtml ?? buildDesc(p, colors),
  };
};

// add() = naya product jodne ki ek line. Galat entry ho to sirf wahi skip hogi, site nahi tootegi.
const add = (p) => {
  if (!p || !p.name || !(Number(p.price) > 0)) {
    console.warn('[products.js] SKIPPED: name ya price missing/galat ->', p?.id ?? p?.name ?? p);
    return;
  }
  if (!p.stock || (typeof p.stock === 'object' && !Object.keys(p.stock).length)) {
    console.warn('[products.js] SKIPPED: stock missing ->', p.name);
    return;
  }
  const item = make(p);
  if (products.some((x) => x.id === item.id || x.slug === item.slug)) {
    console.warn('[products.js] SKIPPED: id/slug pehle se maujood hai ->', item.id, item.slug);
    return;
  }
  products.push(item);
  if (offerDetails(item)) offerProducts.push(item);
};

// Kisi bhi page ke liye: productsFor('home'), productsFor('bags'), productsFor('shop-all') waghera
export const productsFor = (place) => products.filter((p) => p.placements?.includes(place));

// Slug se product (details page ke liye)
export const productBySlug = (slug) => products.find((p) => p.slug === slug);

// ============================================================================
//  PRODUCTS (naya product = neeche wali TEMPLATE line copy karo, bharo, aur
//  isi jagah, TEMPLATE line se UPAR paste karo)
// ============================================================================
const STOCK = { 'Classic Black': 6, 'Warm Beige': 7 };

add({ id: 'PROD_30', name: 'Celeste Crossbody Sling', slug: 'celeste-crossbody-sling', price: 50, offer2: 95, offer3: 140, stock: STOCK, placements: ['shop-all', 'home'] });




// ============================================================================
//  TEMPLATE (ye line hamesha sab se neeche rahe, isko copy karo, "// " hatao,
//  bharo, aur upar products ke baad paste karo)
//
//  ZAROORI: id, name, price, stock
//  OPTIONAL: baqi sab (nahi likhoge to auto/default lag jayega)
//  Text me apostrophe (') na likho, ya \' likho. Har field ke baad comma.
// ============================================================================
// add({ id: 'PROD_34', name: 'Product Name', price: 50, oldPrice: 100, offer2: 95, offer3: 140, stock: { 'Classic Black': 5, 'Warm Beige': 5, 'Blush Pink': 3 }, images: ['/main.jpeg', '/img2.jpeg', '/img3.jpeg', '/img4.jpeg'], placements: ['shop-all', 'home', 'bags'], overview: 'Short overview text', highlights: ['Title: detail one.', 'Title: detail two.'], why: 'Why customers should buy it' });