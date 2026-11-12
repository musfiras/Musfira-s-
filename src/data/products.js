export const CHECKOUT_URL = 'https://www.musfiras.com/check_out';
const IMAGES = Array(6).fill('/handbag.jpeg');

const desc = (name) => `<div class="m-el-title">✨ ${name}✨</div>
<b class="m-el-sub">Product Overview:</b>
A perfect blend of modern minimalism and classic luxury. This sophisticated crossbody bag features a unique dual-texture finish with a beautifully textured flap and a sleek, smooth body. Accentuated by a premium gold-toned metallic emblem, it’s designed to transition effortlessly from casual brunch dates to elite evening gatherings.
• <b class="m-el-sub">Product Highlights:</b> 
Dual-Texture Artistry: A premium combination of a finely textured chevron-pattern flap and a smooth, minimalist base structure.

Dual-Strap Versatility: Comes with a matching shoulder strap and an adjustable, detachable long sling strap for multi-way styling.

Elite Accents: Crowned with a high-shine gold metallic front motif and heavy-duty golden hardware clips.

Smart Organization: Dual-step structured compartment that holds your absolute essentials (phone, cards, lipstick) without losing its clean shape.
• <b class="m-el-sub">💎 Why It’s a Must-Have:</b>
Most bags look good but feel ordinary. This piece is crafted specifically for the modern woman who refuses to settle for boring accessories. It doesn't just hold your essentials—it instantly upgrades your entire outfit, giving you that effortless high-end fashion aesthetic without trying too hard.
• <b class="m-el-sub">🎨 Available Colors:</b>
Blush Pink

Classic Black

Warm Beige`;

// ============================================================================
//  NAYA PRODUCT JODNE KA TAREEQA (sirf neeche list me ek { ... } block add karo)
//
//  Zaroori:   name, price, oldPrice, stock, placements
//  Optional:  images, offer2, offer3, descriptionHtml, slug, id
//             (jo na likho wo khud ban jata hai: slug naam se, id slug se,
//              images/offers/description neeche DEFAULTS se)
//
//  placements = jahan dikhana ho:  'shop-all' (store page), 'home' (home page),
//               'bags', 'fashion', 'choice' ... koi bhi naam, aur page par productsFor('naam')
//
//  stock ke color naam aur product ka name Account B (live stock) se bilkul
//  same hone chahiye, warna live stock match nahi hoga.
// ============================================================================

// Jo cheez product me na likho, wo yahan se aati hai (apni marzi se badlo)
const DEFAULTS = {
  oldPrice: 100,
  offer2: 95,
  offer3: 140,
  images: IMAGES,
  placements: ['shop-all'],
};

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const make = (p) => {
  const slug = p.slug ?? slugify(p.name);
  return {
    ...DEFAULTS,
    ...p,
    slug,
    id: p.id ?? slug,
    descriptionHtml: p.descriptionHtml ?? desc(p.name),
  };
};

const STOCK = { 'Classic Black': 6, 'Warm Beige': 7 };

export const products = [
  make({ id: 'PROD_30', slug: 'celeste-crossbody-sling', name: 'Celeste Crossbody Sling', price: 50, stock: STOCK, placements: ['shop-all', 'home'] }),
  make({ id: 'PROD_31', slug: 'sample-product-2',       name: 'Sample Product 2',       price: 50, stock: STOCK, placements: ['shop-all', 'home', 'bags'] }),
  make({ id: 'PROD_32', slug: 'sample-product-3',       name: 'Sample Product 3',       price: 50, stock: STOCK, placements: ['shop-all', 'home', 'bags'] }),
  make({ id: 'PROD_33', slug: 'sample-product-4',       name: 'Sample Product 4',       price: 50, stock: STOCK, placements: ['shop-all', 'home', 'fashion'] }),
];

// Kisi bhi page ke liye: productsFor('home'), productsFor('bags'), productsFor('shop-all') waghera
export const productsFor = (place) => products.filter((p) => p.placements?.includes(place));