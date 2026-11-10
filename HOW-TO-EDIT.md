# Musfira's — Kaise badlein (aasan guide)

## 1) Is zip ko apne project mein kaise dalein
1. Apne project ka purana `src` folder ka backup le lein (copy kar lein).
2. Is zip ka `src` folder apne project ke `src` par **paste / replace** kar dein.
   Naye files: `src/config/site.js` aur `src/components/WhatsAppFloat.astro`.
3. Terminal mein project folder ke andar:
   - Test karne ke liye:  `npm run dev`   (browser mein http://localhost:4321)
   - Live karne ke liye:  GitHub par push karein (agar Cloudflare GitHub se juda hai),
     warna `npm run build` phir `npx wrangler deploy`.

## 2) Number, links, categories badalna  ->  SIRF `src/config/site.js`
- WhatsApp number:  `whatsapp.number`  (digits only, jaise 923019343786)
- Screen par dikhne wala number:  `whatsapp.display`
- WhatsApp par pehle se likha message:  `whatsapp.message`
- Button chhupana:  `whatsapp.show: false`
- Reviews tab:  `reviews` (label, href, delaySeconds, show)
- Email:  `email`
- Home link:  `home`
- Categories (header + mobile menu):  `collections` — nayi line add / purani delete
- Social links:  `social`
- Footer + page-list ke links:  `pages`

## 3) Naya page banana
1. `src/pages/` mein privacy.astro ki copy banayein (jaise `shipping.astro`).
2. Uske andar title, eyebrow, heading aur text badal dein.
3. `src/config/site.js` ke `pages` mein ek line add karein:
   `{ label: "Shipping", href: "/shipping" },`
   Footer aur page ke left wali list mein khud aa jayega.

## 4) Page ka text badalna
`src/pages/about.astro`, `terms.astro`, `faqs.astro`, `privacy.astro`, `contact.astro`
Har section `<h3 class="mfs-sub">Heading</h3>` aur uske neeche `<p>...</p>` hai.
Bullets ke liye `<ul><li>...</li></ul>`.

## 5) Har page par header / footer / WhatsApp / Reviews tab khud aate hain
Ye sab `src/layouts/Layout.astro` mein jura hua hai. Jo bhi naya page `Layout` ya `InfoPage` use kare,
usmein ye sab AUTO aa jata hai. Dobara kuch set nahi karna.

Naya page (ya category page) banane ka tareeqa:
```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Bags & Carrying | Musfira's">
  ... yahan page ka content ...
</Layout>
```
Category ko header menu mein dikhana ho to sirf `site.js` ke `collections` mein ek line add karein.
