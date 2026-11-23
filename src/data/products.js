export const CHECKOUT_URL = 'https://www.musfiras.com/check_out';

// ============================================================================
//  PLACES  (YAHAN SE HEADING + PATA CHALTA HAI KE PRODUCT SITE PE KAHAN AAYEGA)
//
//  Har placement ka ek naam (key) hai. Product me placements: ['bags'] likho
//  to wo product us page / section me aayega, aur neeche likhi heading uske
//  upar dikhegi.
//
//  key      : placements me jo likhna hai
//  page     : sirf tumhari yaad ke liye - ye section site pe kahan hai
//  heading  : us section ke upar dikhne wali heading ("" = koi heading nahi)
//
//  NAYA PAGE / SECTION BANANA HO TO: bas neeche ek line add karo, jaise
//    'bags': { page: 'Bags & Carrying page', heading: 'Bags & Carrying' },
//  Phir products me placements: ['bags'] likho. Bas.
// ============================================================================
export const PLACES = {
  // ----- HOME PAGE -----
  'home-top': { page: 'Home page: top banner ke neeche',        heading: 'Discover the Collection' },
  'home-2':   { page: 'Home page: home-top ke neeche',          heading: '' },
  'home':     { page: 'Home page: MusfirasChoice ke neeche',    heading: '' },

  // ----- STORE PAGE -----
  'shop-all': { page: 'Store page (/store/)',                   heading: 'Shop All' },

  // ----- CATEGORY PAGES (tag wohi jo categories.js me hai) -----
  'bags':     { page: 'Bags & Carrying page (/bags_carrying/)',          heading: 'Bags & Carrying' },
  'fashion':  { page: 'Fashion & Accessories page (/fashion_accessories/)', heading: 'Fashion & Accessories' },
  'choice':   { page: "Musfira's Choice page (/musfiras_choice/)",       heading: "Musfira's Choice" },
};

// Kisi placement ki heading nikalne ke liye: headingFor('home-top')
export const headingFor = (place) => PLACES[place]?.heading ?? '';

// Kisi placement ka page ka naam: pageFor('bags')
export const pageFor = (place) => PLACES[place]?.page ?? '';

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

  const placements = p.placements?.length ? p.placements : DEFAULT_PLACEMENTS;

  // Agar placement PLACES me nahi likha to warning (galti pakadne ke liye)
  placements.forEach((pl) => {
    if (!(pl in PLACES)) {
      console.warn('[products.js] placement PLACES me nahi mila (heading nahi aayegi) ->', p.name, pl);
    }
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
    placements,
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
//  PRODUCTS
//
//  Naya product = sab se neeche wali TEMPLATE line copy karo, "// " hatao,
//  bharo, aur sahi HEADING WALE BLOCK ke andar paste karo.
//  (Heading blocks sirf comments hain, taake file me dikhe ke konsa product
//   site pe kis jagah hai. Asal heading PLACES se aati hai.)
// ============================================================================
const STOCK = { 'Classic Black': 6, 'Warm Beige': 7 };


// ############################################################################
//  HOME PAGE  >  TOP BANNER KE NEECHE  >  heading: "Discover the Collection"
//  placements: ['home-top']
// ############################################################################

add({ id: 'PROD_001', name: 'Two-Tone Structured Tote', price: 110, oldPrice: 160, offer2: 215, offer3: 320, stock: { 'Beige Brown': 5, 'Beige Pink': 5 }, colorImages: { 'Beige Brown': '/tonebag (3).jpg', 'Beige Pink': '/tonebag (4).jpg' }, images: ['/products/nw (2).jpg', '/tonebag (3).jpg', '/tonebag (1).jpg', '/tonebag (2).jpg', '/tonebag (4).jpg', '/tonebag (5).jpg'], placements: ['shop-all', 'home-top'], overview: 'A stylish blend of modern elegance and everyday utility. Crafted from high-quality synthetic leather with a two-tone panel design and soft pom-pom charm, this structured shoulder tote is ideal for office, shopping, travel, and daily outings.', highlights: ['Two-Tone Panel Design: Contrasting panels with a minimal, elegant finish suitable for all outfits.', 'Material & Build: Crafted from high-quality synthetic leather with durable stitching and a structured shape.', 'Comfort & Closure: Dual long shoulder handles for easy carrying with a spacious open-top interior for daily essentials.', 'Signature Charm: Includes a soft pom-pom charm accessory for a chic, trendy touch.'], why: 'Gives you the polished look and spacious organization needed for office, travel, and daily use without feeling bulky or plain.' });

add({ id: 'PROD_002', name: 'Slouchy Suede Totes', price: 120, oldPrice: 170, offer2: 232, offer3: 345, stock: { 'Dark Brown': 5, 'Camel Brown': 5 }, colorImages: { 'Dark Brown': '/products/sue (1).jpg', 'Camel Brown': '/products/nw (1).jpg' }, images: ['/products/nw (1).jpg', '/products/sue (4).jpg', '/products/sue (1).jpg', '/products/sue (2).jpg', '/products/sue (3).jpg', '/products/sue (5).jpg', '/products/sue (6).jpg'], placements: ['shop-all', 'home-top'], overview: 'Designed for everyday sophistication and practicality, this elegant brown suede-style tote handbag features a soft textured finish, classic silhouette, and a decorative belt-style strap with buckle for refined style.', highlights: ['Material & Texture: Premium suede-style synthetic leather with a soft, luxurious texture and durable stitching.', 'Design & Details: Classic tote silhouette paired with a decorative belt-style strap and buckle accent.', 'Closure & Capacity: Secure top zipper closure opening to a spacious main compartment for daily essentials.', 'Carry Style: Built with long, comfortable shoulder handles for easy shoulder or hand carry.'], why: 'Brings a refined, seasonal suede look with practical daily organization and zipper security for office, shopping, and casual outings.' });

add({ id: 'PROD_003', name: 'Royal Trends Tote Bags', price: 150, oldPrice: 230, offer2: 288, offer3: 432, stock: { 'Tea Pink': 5, 'Black': 5 }, colorImages: { 'Tea Pink': '/products/ry (4).jpg', 'Black': '/products/ry (7).jpg' }, images: ['/products/ry (1).jpg', '/products/ry (2).jpg', '/products/ry (3).jpg', '/products/ry (4).jpg', '/products/ry (5).jpg', '/products/ry (6).jpg', '/products/ry (7).jpg'], placements: ['shop-all', 'home-top'], overview: 'A stylish and practical choice for everyday elegance. Crafted from high-quality synthetic leather with an all-over RT monogram embossing, this structured tote offers a premium look with ample space for daily essentials.', highlights: ['Monogram Design: Features an all-in-one stylish RT embossed pattern for a chic appearance.', 'Material & Build: Crafted from high-quality synthetic leather with a sturdy base to maintain shape.', 'Storage & Closure: Spacious main compartment with secure top closure and a convenient front pocket with snap detail.', 'Carry Style: Built with durable dual shoulder handles for comfortable office, travel, and daily carry.'], why: 'Gives you high-end luxury branding and spacious daily organization without compromising on elegance or durability.' });

add({ id: 'PROD_004', name: 'Suede & Matte Minimalist Bag', price: 150, oldPrice: 270, offer2: 285, offer3: 430, stock: { 'Green': 5, 'Black': 5 }, colorImages: { 'Green': '/products/sm (1).jpg', 'Black': '/products/sm (3).jpg' }, images: ['/products/sm (1).jpg', '/products/sm (2).jpg', '/products/sm (3).jpg', '/products/sm (4).jpg', '/products/sm (5).jpg', '/products/sm (6).jpg'], placements: ['shop-all', 'home-top'], overview: 'Designed for women who love timeless style with a modern touch. Featuring a clean, structured silhouette with dual top handles and a sleek gold-tone accent, this bag adds effortless sophistication to both everyday and formal looks.', highlights: ['Structured Design: Clean and polished silhouette with an elegant gold-tone front accent.', 'Material & Build: Crafted from high-quality synthetic leather with a sturdy construction to maintain shape.', 'Storage & Capacity: Spacious interior with secure top zip closure to safely carry your daily essentials.', 'Carry Style: Designed with dual top handles for comfortable hand or shoulder carry.'], why: 'Brings a versatile, trendy olive green or classic black statement piece that elevates both casual and formal office outfits.' });


// ############################################################################
//  HOME PAGE  >  HOME-TOP KE NEECHE  >  placements: ['home-2']
//  (naya product yahan paste karo)
// ############################################################################



// ############################################################################
//  HOME PAGE  >  MUSFIRAS CHOICE KE NEECHE  >  placements: ['home']
//  (naya product yahan paste karo)
// ############################################################################



// ############################################################################
//  BAGS & CARRYING PAGE  >  heading: "Bags & Carrying"  >  placements: ['bags']
//  (naya product yahan paste karo)
// ############################################################################



// ############################################################################
//  FASHION & ACCESSORIES PAGE  >  placements: ['fashion']
//  (naya product yahan paste karo)
// ############################################################################



// ############################################################################
//  MUSFIRA'S CHOICE PAGE  >  placements: ['choice']
//  (naya product yahan paste karo)
// ############################################################################




// ============================================================================
//  TEMPLATE  (SIRF EK LINE. Ye hamesha sab se neeche rahe)
//
//  Kaise use karein:
//    1. Neeche wali line copy karo, "// " hatao.
//    2. Bharo (id, name, price, stock zaroori hain, baqi optional).
//    3. placements me wo naam likho jahan product dikhana hai:
//         'home-top'  = Home: top banner ke neeche   ("Discover the Collection")
//         'home-2'    = Home: home-top ke neeche
//         'home'      = Home: MusfirasChoice ke neeche
//         'shop-all'  = Store page
//         'bags'      = Bags & Carrying page
//         'fashion'   = Fashion & Accessories page
//         'choice'    = Musfira's Choice page
//       Ek se zyada jagah chahiye to: placements: ['shop-all', 'bags']
//    4. Upar wale sahi HEADING BLOCK ke andar paste karo.
//
//  Heading badalni ho to upar PLACES me us placement ki heading badlo.
//
//  ZAROORI: id, name, price, stock
//  colorImages: har color ki photo. Color ka naam stock jaisa hi likho.
//  Text me apostrophe (') na likho, ya \' likho. Har field ke baad comma.
// ============================================================================
// add({ id: 'PROD_34', name: 'Product Name', price: 50, oldPrice: 100, offer2: 95, offer3: 140, stock: { 'Classic Black': 5, 'Warm Beige': 5, 'Blush Pink': 3 }, colorImages: { 'Classic Black': '/black.jpeg', 'Warm Beige': '/beige.jpeg', 'Blush Pink': '/pink.jpeg' }, images: ['/main.jpeg', '/img2.jpeg', '/img3.jpeg', '/img4.jpeg'], placements: ['bags'], overview: 'Short overview text', highlights: ['Title: detail one.', 'Title: detail two.'], why: 'Why customers should buy it' });