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
  const images = Array.isArray(p.images) && p.images.length ? [...p.images] : [DEFAULT_IMAGE];

  // COLOR IMAGES: { 'Color': '/photo.jpeg' } -> har color ki photo ka number (colorIndex).
  // Agar photo images list mein nahi hai to khud end mein jud jati hai.
  // Color ka naam bilkul stock jaisa hona chahiye. Number (photo ka number, 0 se shuru) bhi chalta hai.
  const colorIndex = {};
  const ci = p.colorImages && typeof p.colorImages === 'object' ? p.colorImages : {};
  Object.keys(ci).forEach((c) => {
    if (!(c in stock)) {
      console.warn('[products.js] colorImages: ye color stock mein nahi mila ->', p.name, c);
      return;
    }
    const v = ci[c];
    if (typeof v === 'number') {
      if (v >= 0 && v < images.length) colorIndex[c] = v;
      return;
    }
    if (!v) return;
    let i = images.indexOf(v);
    if (i === -1) { images.push(v); i = images.length - 1; }
    colorIndex[c] = i;
  });

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
    colorIndex,
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

add({ id: 'PROD_001', name: 'Two-Tone Structured Tote', price: 110, oldPrice: 160, offer2: 215, offer3: 320, stock: { 'Beige Brown': 5, 'Beige Pink': 5 }, images: ['/products/nw (2).jpg', '/tonebag (3).jpg', '/tonebag (1).jpg', '/tonebag (2).jpg', '/tonebag (4).jpg', '/tonebag (5).jpg'], placements: ['shop-all', 'bags'], overview: 'A stylish blend of modern elegance and everyday utility. Crafted from high-quality synthetic leather with a two-tone panel design and soft pom-pom charm, this structured shoulder tote is ideal for office, shopping, travel, and daily outings.', highlights: ['Two-Tone Panel Design: Contrasting panels with a minimal, elegant finish suitable for all outfits.', 'Material & Build: Crafted from high-quality synthetic leather with durable stitching and a structured shape.', 'Comfort & Closure: Dual long shoulder handles for easy carrying with a spacious open-top interior for daily essentials.', 'Signature Charm: Includes a soft pom-pom charm accessory for a chic, trendy touch.'], why: 'Gives you the polished look and spacious organization needed for office, travel, and daily use without feeling bulky or plain.' });


add({ id: 'PROD_002', name: 'Slouchy Suede Totes', price: 120, oldPrice: 170, offer2: 232, offer3: 345, stock: { 'Dark Brown': 5, 'Camel Brown': 5 }, images: ['/products/nw (1).jpg', '/products/sue (4).jpg', '/products/sue (1).jpg', '/products/sue (2).jpg', '/products/sue (3).jpg', '/products/sue (5).jpg', '/products/sue (6).jpg'], placements: ['shop-all', 'bags'], overview: 'Designed for everyday sophistication and practicality, this elegant brown suede-style tote handbag features a soft textured finish, classic silhouette, and a decorative belt-style strap with buckle for refined style.', highlights: ['Material & Texture: Premium suede-style synthetic leather with a soft, luxurious texture and durable stitching.', 'Design & Details: Classic tote silhouette paired with a decorative belt-style strap and buckle accent.', 'Closure & Capacity: Secure top zipper closure opening to a spacious main compartment for daily essentials.', 'Carry Style: Built with long, comfortable shoulder handles for easy shoulder or hand carry.'], why: 'Brings a refined, seasonal suede look with practical daily organization and zipper security for office, shopping, and casual outings.' });




// ============================================================================
//  TEMPLATE (ye line hamesha sab se neeche rahe, isko copy karo, "// " hatao,
//  bharo, aur upar products ke baad paste karo)
//
//  ZAROORI: id, name, price, stock
//  OPTIONAL: baqi sab (nahi likhoge to auto/default lag jayega)
//  colorImages: har color ki photo. Color ka naam stock jaisa hi likho.
//  Text me apostrophe (') na likho, ya \' likho. Har field ke baad comma.
// ============================================================================
// add({ id: 'PROD_34', name: 'Product Name', price: 50, oldPrice: 100, offer2: 95, offer3: 140, stock: { 'Classic Black': 5, 'Warm Beige': 5, 'Blush Pink': 3 }, colorImages: { 'Classic Black': '/black.jpeg', 'Warm Beige': '/beige.jpeg', 'Blush Pink': '/pink.jpeg' }, images: ['/main.jpeg', '/img2.jpeg', '/img3.jpeg', '/img4.jpeg'], placements: ['shop-all', 'home', 'bags'], overview: 'Short overview text', highlights: ['Title: detail one.', 'Title: detail two.'], why: 'Why customers should buy it' });