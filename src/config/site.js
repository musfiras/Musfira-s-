// ============================================================================
//  SITE SETTINGS  —  Sab links / number / email yahin se badlo
//  Is file ke baad kisi aur file mein link badalne ki zaroorat NAHI.
//  Header, Footer, WhatsApp button, Contact page sab yahin se parhte hain.
// ============================================================================

export const site = {
  name: "Musfira's",
  tagline: "Made to adore",
  email: "info@musfiras.com",

  // ---------- WHATSAPP ----------
  // number: sirf digits, country code ke saath, "+" ya space ke bagair  (+92 301 9343786 -> 923019343786)
  // display: jo screen par dikhana ho
  // message: button dabane par chat mein pehle se likha aayega
  whatsapp: {
    number: "923019343786",
    display: "+92 301 9343786",
    message: "Hello Musfira's, I would like some help with my order.",
    label: "Chat with us",
    show: true, // false kar do to floating button poori site se chala jata hai
  },

  // ---------- REVIEWS TAB (left edge par chhota maroon tab) ----------
  // delaySeconds: site khulne ke kitne second baad nazar aaye
  reviews: {
    label: "REVIEWS",
    href: "https://www.musfiras.com/reviews",
    delaySeconds: 3,
    show: true, // false kar do to tab poori site se chala jata hai
  },

  // ---------- HOME ----------
  home: "musfira-s.pages.dev",

  // ---------- COLLECTIONS (header dropdown + mobile menu) ----------
  // Nai category: ek nayi line add karo. Hatani ho: line delete kar do.
  collections: [
    { label: "-BAGS & CARRYING-",        href: "https://www.musfiras.com/bags_carrying" },
    { label: "-FASHION & ACCESSORIES-",  href: "https://www.musfiras.com/fashion_accessories" },
    { label: "-MUSFIRA'S CHOICE-",       href: "https://www.musfiras.com/musfiras_choice" },
  ],

  // ---------- SOCIAL (footer + contact page) ----------
  // key: facebook | instagram | pinterest | website  (icon inhi ke hain)
  social: [
    { key: "facebook",  name: "Facebook",  href: "https://web.facebook.com/MusfirasOfficial/" },
    { key: "instagram", name: "Instagram", href: "https://www.instagram.com/musfiras_com/" },
    { key: "pinterest", name: "Pinterest", href: "https://www.pinterest.com/musfiras_com/" },
    { key: "website",   name: "Website",   href: "musfira-s.pages.dev" },
  ],

  // ---------- INFO PAGES (footer links + page ke left wali list) ----------
  // Naya page: src/pages/ mein file banao, phir yahan ek line add karo.
  pages: [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "FAQs",               href: "/faqs" },
    { label: "Privacy Policy",     href: "/privacy" },
    { label: "Contact Us",         href: "/contact" },
    { label: "About Us",           href: "/about" },
  ],
};

// WhatsApp link yahan se banta hai (kahin aur ko haath lagane ki zaroorat nahi)
export const whatsappUrl = (msg = site.whatsapp.message) =>
  `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(msg)}`;
