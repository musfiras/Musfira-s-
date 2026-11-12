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

// Asli dummy product (PROD_30)
const base = {
  id: 'PROD_30',
  slug: 'celeste-crossbody-sling',
  name: 'Celeste Crossbody Sling',
  price: 50,
  oldPrice: 100,
  offer2: 95,
  offer3: 140,
  stock: { 'Classic Black': 6, 'Warm Beige': 7 },
  images: IMAGES,
  descriptionHtml: desc('Celeste Crossbody Sling'),
};

// Baqi dummy copies: sirf id, naam, slug alag
const copyOf = (id, slug, name) => ({ ...base, id, slug, name, descriptionHtml: desc(name) });

export const products = [
  base,
  copyOf('PROD_31', 'sample-product-2', 'Sample Product 2'),
  copyOf('PROD_32', 'sample-product-3', 'Sample Product 3'),
  copyOf('PROD_33', 'sample-product-4', 'Sample Product 4'),
];