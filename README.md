# Karni International's – Online Chai Patti Store

*Har Chuski Mein Asli Swaad*

A fast, mobile-friendly e-commerce website for Karni International's chai patti.

- **Frontend:** plain HTML, CSS and JavaScript. No framework and no build step.
- **Backend:** Netlify Functions (Node.js) that create and verify Razorpay payments.
- **Hosting:** Netlify free plan.

---

## 1. Folder structure

```
index.html, shop.html, product.html, cart.html, checkout.html, success.html,
about.html, contact.html, privacy-policy.html, terms.html, refund-policy.html,
shipping-policy.html, 404.html      ← pages
css/style.css                       ← all styling (brand colours at the top)
js/common.js                        ← header, footer, cart, WhatsApp button (every page)
js/*.js                             ← one script per page
data/products.json                  ← ALL PRODUCTS AND PRICES
data/config.json                    ← ALL STORE SETTINGS (phone, shipping, FSSAI…)
data/indian-states.json             ← state list for checkout
assets/logo.svg                     ← logo (replace with your real logo)
assets/favicon.svg, *.png           ← browser icon, social share image
images/products/                    ← product images
netlify/functions/create-order.js   ← creates the Razorpay order (server)
netlify/functions/verify-payment.js ← verifies the payment signature (server)
netlify.toml                        ← Netlify settings
.env.example                        ← names of the secret keys
sitemap.xml, robots.txt             ← SEO
tests/run-tests.js                  ← automatic checks (`npm test`)
```

---

## 2. Edit products and prices – `data/products.json`

You manage every product in this one file. Open it in any text editor, or edit it directly on GitHub with the pencil icon.

Each product looks like this:

```json
{
  "id": "karni-masala-chai",              ← used in links + cart. Do NOT change after launch
  "name": "Karni Masala Chai",
  "category": "Flavoured Tea",            ← used by the Shop filter
  "shortDescription": "One line shown on product cards.",
  "description": "Longer text shown on the product page.",
  "images": [
    "/images/products/masala-chai.svg",   ← first image = main image
    "/images/products/gallery-cup.svg"
  ],
  "sizes": [
    { "key": "250g", "label": "250 g", "price": 150 },
    { "key": "500g", "label": "500 g", "price": 290 },
    { "key": "1kg",  "label": "1 kg",  "price": 560 }
  ],
  "brewingTips": ["Tip 1", "Tip 2"],
  "featured": true,                        ← show in "Featured" on the home page
  "bestSeller": true                       ← "Best Seller" badge and home section
}
```

> ⚠️ **The current prices are SAMPLE values.** Replace them with your real prices before launch.

Rules:
- Write prices in **rupees, as whole numbers**: `150`, not `"₹150"` and not `150.50`.
- To **add a product**, copy a whole `{ ... }` block, paste it after a comma, and give it a new unique `id`.
- To **remove a product**, delete its block. Then make sure no comma is left before `]`.
- To **add a pack size**, add a line such as `{ "key": "2kg", "label": "2 kg", "price": 850 }`.
- Keep the JSON valid: every name and text value needs "double quotes", and items are separated by commas. You can check the file at <https://jsonlint.com>, or run `npm test`.
- The payment server reads this same file. A price change is used for payments as soon as you redeploy, and Netlify redeploys automatically when you push to GitHub.

## 3. Product images

1. Use square photos: 1000×1000 px, JPG or WebP, under 200 KB each. <https://squoosh.app> can compress them.
2. Put them in `images/products/`, for example `images/products/masala-chai-front.jpg`.
3. Change the `images` paths in `data/products.json`. Paths start with `/`.

The current `.svg` pack drawings are placeholders. Delete them once you have real photos.

## 4. Logo

Replace `assets/logo.svg` with your real logo **using the same file name**. It shows in the header and footer automatically.
- A wide logo works best (about 300×64). If your logo is PNG, save it as `assets/logo.png` and replace `logo.svg` with `logo.png` in `js/common.js`. It appears there twice.
- Also replace `assets/favicon.svg`, `assets/favicon-32.png`, `assets/apple-touch-icon.png`, `assets/logo-square.png` (shown inside the Razorpay payment window) and `assets/og-image.png` (1200×630, the preview image when someone shares your link on WhatsApp or Facebook).

## 5. Store settings – `data/config.json`

| Setting | What it is |
|---|---|
| `storeName`, `tagline` | Brand name and tagline |
| `siteUrl` | Your live website address |
| `phone` | Shown on the site, e.g. `"+91 98765 43210"` |
| `whatsapp` | WhatsApp number **with country code, digits only**, e.g. `"919876543210"` |
| `email`, `address`, `businessHours` | Contact details |
| `mapQuery` | What to show on the Google Map (your shop name + city, or the full address) |
| `legalName` | Registered business name, used in the policies |
| `fssaiNumber` | e.g. `"FSSAI Lic. No. 12345678901234"`, shown in the footer |
| `gstNumber` | Optional. Leave `""` to hide it |
| `freeShippingAbove` | Free shipping when the order subtotal is at least this amount (₹) |
| `shippingCharge` | Flat shipping charge below that amount (₹) |
| `maxQtyPerItem` | Highest quantity allowed per item |
| `social` | Instagram, Facebook, YouTube and X links. Leave `""` to hide an icon |
| `policyEffectiveDate` | Date shown on the policy pages |

The placeholder phone (`98765 43210`), email and address must be replaced before launch.

**Also update:**
- `about.html`: replace the placeholder story. Look for the yellow "Placeholder" box and the `[ … ]` text.
- The 4 policy pages: read them, edit the `[ … ]` parts to match how you work (dispatch days, refund days, your city for jurisdiction), and delete the yellow "Template" box.
- `sitemap.xml` and `robots.txt`: replace `https://your-site-name.netlify.app` with your real domain.

---

## 6. Deploy on Netlify (free)

1. Push this repository to GitHub. It is already there.
2. Go to <https://app.netlify.com>, choose **Add new site → Import an existing project → GitHub**, and select this repo.
3. Build settings are read from `netlify.toml`, so leave them as they are:
   - Build command: none needed
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
4. Click **Deploy**.

### Add your Razorpay keys (required for payments)

1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Account & Settings → API Keys → Generate Key**. Start in **Test Mode**.
3. In Netlify, open **Site configuration → Environment variables → Add a variable** and add:
   - `RAZORPAY_KEY_ID` = `rzp_test_xxxxxxxx`
   - `RAZORPAY_KEY_SECRET` = your secret
4. Go to **Deploys → Trigger deploy → Deploy site**. Functions pick up new keys only after a redeploy.
5. Place a test order. Use the test UPI ID `success@razorpay` or the test cards listed in the Razorpay docs.
6. Once Razorpay activates your account, generate **Live Mode** keys, replace both variables in Netlify, and redeploy.

> 🔒 Never put `RAZORPAY_KEY_SECRET` in any HTML/JS file or commit it to GitHub. It exists only in Netlify's environment variables. `.env` is already in `.gitignore`.

**Razorpay website verification:** Razorpay checks that your site has Contact, Privacy, Terms, Refund and Shipping pages. They are all linked in the footer. Make sure they show your real business details first.

### Custom domain

In Netlify, open **Domain management → Add a domain** and follow the DNS steps. HTTPS is free and automatic. Then update `siteUrl`, `sitemap.xml` and `robots.txt`.

---

## 7. How payment works (for your information)

1. The customer fills in the checkout form and taps **Pay Now**.
2. The browser sends only **product id, size and quantity**, plus the customer details, to `create-order`.
3. `create-order` **recalculates the total on the server** from `products.json` and `config.json`. Prices from the browser are never trusted. It then creates a Razorpay order and saves the customer's name, mobile, email, full address and item list in the order **notes**.
4. The Razorpay window opens with the name, email and mobile already filled in.
5. After payment, `verify-payment` checks the Razorpay signature (HMAC SHA256 with your secret). The customer goes to `success.html` **only if it is valid**.
6. If the payment fails or is cancelled, a clear message appears and the cart is kept.

**Where to see orders:** Razorpay Dashboard → **Transactions → Orders** (or Payments). Open an order to see the customer details and items under **Notes**. The success page also has a **Share order on WhatsApp** button, so customers can send you their order details.

> Tip: in Razorpay settings, keep **Payment Capture = Automatic** (the default) so payments are captured without manual action.

---

## 8. Test on your computer (optional)

```bash
npm install -g netlify-cli
cp .env.example .env        # put your TEST keys in .env
netlify dev                 # opens http://localhost:8888 with functions running
npm test                    # automatic checks for prices, validation and signatures
```

Opening the HTML files directly by double-clicking will **not** work, because the pages load `data/*.json`. Use `netlify dev`, or any local web server.

## 9. Change colours or fonts

Brand colours and fonts are at the top of `css/style.css` under `:root`:
`--brown #4A2C1D`, `--maroon #7A1F2B`, `--gold #C9A24B`, `--cream #FBF6EE`. Headings use Playfair Display and body text uses Poppins (Google Fonts).

## 10. Before-launch checklist

- [ ] Real prices in `data/products.json`
- [ ] Real product photos in `images/products/`
- [ ] Real logo in `assets/`
- [ ] Phone, WhatsApp, email, address, FSSAI number in `data/config.json`
- [ ] About page story written
- [ ] Policy pages reviewed and `[ … ]` placeholders filled
- [ ] Domain updated in `sitemap.xml` and `robots.txt`
- [ ] Razorpay **live** keys added in Netlify and site redeployed
- [ ] One real low-value order tested end to end
