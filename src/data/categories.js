// ============================================================================
//  CATEGORIES  —  naya category page banana ho to yahan sirf ek { ... } add karo
//
//  slug     : page ka address.   'bags_carrying'  ->  musfiras.com/bags_carrying
//             (src/config/site.js ke collections ke href se bilkul same hona chahiye)
//  tag      : products.js me placements ka wo tag jo is page par dikhana hai
//  title    : page ka bara heading
//  tagline  : heading ke neeche pink line
//  text     : chhoti description
//  banner   : (optional) hero banner. Na likho to banner nahi dikhega.
//             image      -> public folder wali image, jaise '/tbnr.jpeg'
//             lineBlack  -> banner par pehla lafz (safed)
//             lineAccent -> banner par doosra lafz (pink italic)
//             tagline    -> banner ke neeche maroon line
//             taglineHref-> (optional) tagline par click karne se kahan jaye, jaise '/store/'
//
//  "Shop All" ka page /store/ pehle se hai (store.astro), use yahan nahi likhna.
// ============================================================================
export const categories = [
  {
    slug: 'bags_carrying',
    tag: 'bags',
    title: 'Bags & Carrying',
    tagline: 'Carry everything. Compromise nothing.',
    text: 'Spacious, durable carry bags made for women who do it all, in style.',
    banner: {
      image: '/tbnr.jpeg',
      lineBlack: 'Bags &',
      lineAccent: 'Carrying',
      tagline: 'Spacious, durable carry bags made for women who do it all, in style',
      taglineHref: '/store/',
    },
  },
  {
    slug: 'fashion_accessories',
    tag: 'fashion',
    title: 'Fashion & Accessories',
    tagline: 'The finishing touch to every look.',
    text: 'Jewellery, wallets, watches and more, hand-selected to complete your style.',
    banner: {
      image: '/mbnr.jpeg',
      lineBlack: 'Fashion &',
      lineAccent: 'Accessories',
      tagline: 'Wallets, watches and more, finishing touches that make every outfit unforgettable',
      taglineHref: '/fashion_accessories/',
    },
  },
  {
    slug: 'musfiras_choice',
    tag: 'choice',
    title: "Musfira's Choice",
    tagline: 'Handpicked favourites, chosen to elevate your style.',
    text: "Our top picks across every category, picked by us for you.",
  },
];