/* =========================================================
   Karni International's – shared script (every page)
   - loads data/config.json and data/products.json
   - builds header, footer, floating WhatsApp button
   - cart stored in localStorage
   ========================================================= */
(function () {
  "use strict";

  var CART_KEY = "ki_cart_v1";
  var cache = {};

  function getJSON(url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Could not load " + url);
        return r.json();
      });
    }
    return cache[url];
  }

  var KI = {};
  KI.loadConfig = function () { return getJSON("/data/config.json"); };
  KI.loadProducts = function () { return getJSON("/data/products.json").then(function (d) { return d.products || []; }); };
  KI.loadStates = function () { return getJSON("/data/indian-states.json"); };

  /* ---------- helpers ---------- */
  KI.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  KI.inr = function (n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };
  KI.param = function (name) { return new URLSearchParams(location.search).get(name); };
  KI.waLink = function (number, text) {
    var n = String(number || "").replace(/\D/g, "");
    return "https://wa.me/" + n + (text ? "?text=" + encodeURIComponent(text) : "");
  };
  KI.findProduct = function (products, id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  };
  KI.findSize = function (product, key) {
    if (!product) return null;
    for (var i = 0; i < product.sizes.length; i++) if (product.sizes[i].key === key) return product.sizes[i];
    return null;
  };
  KI.minPrice = function (p) { return Math.min.apply(null, p.sizes.map(function (s) { return s.price; })); };

  /* ---------- cart ---------- */
  KI.cart = {
    get: function () {
      try {
        var c = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        return Array.isArray(c) ? c : [];
      } catch (e) { return []; }
    },
    save: function (items) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* storage blocked */ }
      KI.updateCartCount(true);
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    add: function (id, size, qty, maxQty) {
      var items = KI.cart.get();
      var max = maxQty || 20;
      var found = items.filter(function (i) { return i.id === id && i.size === size; })[0];
      if (found) found.qty = Math.min(max, found.qty + qty);
      else items.push({ id: id, size: size, qty: Math.min(max, qty) });
      KI.cart.save(items);
    },
    setQty: function (id, size, qty) {
      var items = KI.cart.get().map(function (i) {
        if (i.id === id && i.size === size) i.qty = qty;
        return i;
      }).filter(function (i) { return i.qty > 0; });
      KI.cart.save(items);
    },
    remove: function (id, size) {
      KI.cart.save(KI.cart.get().filter(function (i) { return !(i.id === id && i.size === size); }));
    },
    clear: function () { KI.cart.save([]); },
    count: function () { return KI.cart.get().reduce(function (s, i) { return s + (i.qty || 0); }, 0); }
  };

  /* Totals for DISPLAY only. The real amount is always re-calculated on the server. */
  KI.computeTotals = function (products, config) {
    var lines = [];
    KI.cart.get().forEach(function (item) {
      var p = KI.findProduct(products, item.id);
      var s = KI.findSize(p, item.size);
      if (!p || !s) return; // product or size removed from catalogue
      lines.push({ product: p, size: s, qty: item.qty, total: s.price * item.qty });
    });
    var subtotal = lines.reduce(function (sum, l) { return sum + l.total; }, 0);
    var shipping = subtotal === 0 || subtotal >= config.freeShippingAbove ? 0 : config.shippingCharge;
    return { lines: lines, subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
  };

  KI.updateCartCount = function (bump) {
    var n = KI.cart.count();
    document.querySelectorAll(".cart-count").forEach(function (el) {
      el.textContent = n > 99 ? "99+" : n;
      el.classList.toggle("has-items", n > 0);
      if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    });
    document.querySelectorAll("[data-cart-label]").forEach(function (el) {
      el.setAttribute("aria-label", "Cart, " + n + " item" + (n === 1 ? "" : "s"));
    });
  };

  KI.toast = function (html, ms) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("role", "status");
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    wrap.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3500);
  };

  /* ---------- icons ---------- */
  var I = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.8L.1 24l6.3-1.7A11.8 11.8 0 0 0 24 12a11.7 11.7 0 0 0-3.6-8.4z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8V6c0-.9.6-1 1-1h2.5V1H14c-3.6 0-4.5 2.7-4.5 4.5V8H7v4h2.5v11h4.5V12h3.2l.5-4H14z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.8 2.3h7l4.8 6.4 5.6-6.4zm-1.2 17.9h1.9L7.1 4.2H5.1L17 20.2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
  };
  KI.icons = I;

  /* ---------- header ---------- */
  var NAV = [
    ["/", "Home"], ["/shop.html", "Shop"], ["/about.html", "About Us"], ["/contact.html", "Contact"]
  ];

  function currentPath() {
    var p = location.pathname.replace(/\/index\.html$/, "/");
    return p === "" ? "/" : p;
  }

  function renderHeader(cfg) {
    var host = document.getElementById("site-header");
    if (!host) return;
    var path = currentPath();
    var links = NAV.map(function (n) {
      var active = path === n[0] || path === n[0].replace(".html", "");
      return '<li><a href="' + n[0] + '"' + (active ? ' aria-current="page"' : "") + ">" + n[1] + "</a></li>";
    }).join("");
    var free = cfg.freeShippingAbove ? '<div class="announce">Free shipping on orders above <strong>' + KI.inr(cfg.freeShippingAbove) + "</strong> · Freshly packed chai patti</div>" : "";
    host.outerHTML = free +
      '<header class="site-header" id="top">' +
      '<div class="container header-inner">' +
      '<a class="brand" href="/" aria-label="' + KI.esc(cfg.storeName) + ' – Home"><img src="/assets/logo.svg" alt="' + KI.esc(cfg.storeName) + '" width="300" height="64"></a>' +
      '<nav class="main-nav" id="main-nav" aria-label="Main"><ul>' + links + "</ul></nav>" +
      '<div class="header-actions">' +
      '<a class="icon-btn" href="/cart.html" data-cart-label aria-label="Cart">' + I.cart + '<span class="cart-count" aria-hidden="true">0</span></a>' +
      '<button class="icon-btn menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu"><span class="bars"></span></button>' +
      "</div></div></header>";

    var header = document.querySelector(".site-header");
    var toggle = header.querySelector(".menu-toggle");
    var nav = header.querySelector(".main-nav");
    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
    }
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 920) setOpen(false); });
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- footer ---------- */
  function renderFooter(cfg) {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var social = cfg.social || {};
    var socialNames = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", x: "X (Twitter)" };
    var socials = Object.keys(socialNames).filter(function (k) { return social[k]; }).map(function (k) {
      return '<a href="' + KI.esc(social[k]) + '" target="_blank" rel="noopener" aria-label="' + socialNames[k] + '">' + I[k] + "</a>";
    }).join("");
    var year = new Date().getFullYear();
    host.outerHTML =
      '<footer class="site-footer">' +
      '<div class="container footer-grid">' +
      "<div>" +
      '<a class="footer-logo" href="/"><img src="/assets/logo.svg" alt="' + KI.esc(cfg.storeName) + '" width="300" height="64" loading="lazy"></a>' +
      "<p>" + KI.esc(cfg.tagline) + ". Premium chai patti, freshly packed and delivered across India.</p>" +
      (socials ? '<div class="socials">' + socials + "</div>" : "") +
      '<p class="footer-legal">' + KI.esc(cfg.fssaiNumber) + (cfg.gstNumber ? "<br>GSTIN: " + KI.esc(cfg.gstNumber) : "") + "</p>" +
      "</div>" +
      '<div><h3>Shop</h3><ul>' +
      '<li><a href="/">Home</a></li><li><a href="/shop.html">All Products</a></li><li><a href="/cart.html">Cart</a></li><li><a href="/checkout.html">Checkout</a></li><li><a href="/about.html">About Us</a></li><li><a href="/contact.html">Contact</a></li>' +
      "</ul></div>" +
      '<div><h3>Policies</h3><ul>' +
      '<li><a href="/privacy-policy.html">Privacy Policy</a></li><li><a href="/terms.html">Terms &amp; Conditions</a></li><li><a href="/refund-policy.html">Refund &amp; Cancellation</a></li><li><a href="/shipping-policy.html">Shipping Policy</a></li>' +
      "</ul></div>" +
      '<div><h3>Contact</h3><ul class="footer-contact">' +
      "<li>" + I.phone + '<a href="tel:' + KI.esc(String(cfg.phone).replace(/\s/g, "")) + '">' + KI.esc(cfg.phone) + "</a></li>" +
      "<li>" + I.whatsapp + '<a href="' + KI.waLink(cfg.whatsapp) + '" target="_blank" rel="noopener">WhatsApp us</a></li>' +
      "<li>" + I.mail + '<a href="mailto:' + KI.esc(cfg.email) + '">' + KI.esc(cfg.email) + "</a></li>" +
      "<li>" + I.pin + "<span>" + KI.esc(cfg.address) + "</span></li>" +
      "</ul></div>" +
      "</div>" +
      '<div class="container footer-bottom"><span>© ' + year + " " + KI.esc(cfg.storeName) + '. All rights reserved.</span><span class="pay-note">' + I.lock + " Secure payments by Razorpay</span></div>" +
      "</footer>";
  }

  function renderWhatsApp(cfg) {
    if (document.querySelector(".wa-float") || !cfg.whatsapp) return;
    var a = document.createElement("a");
    a.className = "wa-float";
    a.href = KI.waLink(cfg.whatsapp, "Hi " + cfg.storeName + ", I want to know more about your chai patti.");
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Chat with us on WhatsApp");
    a.innerHTML = I.whatsapp;
    document.body.appendChild(a);
  }

  /* Fill any element with data-config="key" (e.g. phone, email, storeName). */
  function fillConfig(cfg) {
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var key = el.getAttribute("data-config");
      var val = key.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, cfg);
      if (val == null || val === "") return;
      if (key === "freeShippingAbove" || key === "shippingCharge") val = KI.inr(val);
      el.textContent = val;
    });
    document.querySelectorAll("[data-config-href]").forEach(function (el) {
      var type = el.getAttribute("data-config-href");
      if (type === "phone") el.href = "tel:" + String(cfg.phone).replace(/\s/g, "");
      if (type === "email") el.href = "mailto:" + cfg.email;
      if (type === "whatsapp") el.href = KI.waLink(cfg.whatsapp, el.getAttribute("data-wa-text") || "");
    });
  }

  /* ---------- reveal animations ---------- */
  KI.observeReveal = function (root) {
    var els = (root || document).querySelectorAll(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -40px 0px", threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  };

  /* ---------- product card ---------- */
  KI.productCard = function (p, opts) {
    opts = opts || {};
    var size = (opts.sizeKey && KI.findSize(p, opts.sizeKey)) || p.sizes[0];
    var url = "/product.html?id=" + encodeURIComponent(p.id);
    var priceHtml = opts.sizeKey
      ? KI.inr(size.price) + " <small>/ " + KI.esc(size.label) + "</small>"
      : "<small>from</small> " + KI.inr(KI.minPrice(p));
    return '<article class="product-card reveal">' +
      (p.bestSeller ? '<span class="badge">Best Seller</span>' : "") +
      '<a class="product-card__media" href="' + url + '" tabindex="-1" aria-hidden="true"><img src="' + KI.esc(p.images[0]) + '" alt="" loading="lazy" width="600" height="600"></a>' +
      '<div class="product-card__body">' +
      '<span class="product-card__cat">' + KI.esc(p.category) + "</span>" +
      '<h3 class="product-card__title"><a href="' + url + '">' + KI.esc(p.name) + "</a></h3>" +
      '<p class="product-card__desc">' + KI.esc(p.shortDescription) + "</p>" +
      '<div class="product-card__foot"><span class="price">' + priceHtml + "</span>" +
      '<button class="btn btn--primary btn--sm" type="button" data-quick-add="' + KI.esc(p.id) + '" data-size="' + KI.esc(size.key) + '" aria-label="Add ' + KI.esc(p.name) + " " + KI.esc(size.label) + ' to cart">Add</button>' +
      "</div></div></article>";
  };

  /* Quick "Add" buttons on product cards */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-quick-add]");
    if (!btn) return;
    e.preventDefault();
    Promise.all([KI.loadProducts(), KI.loadConfig()]).then(function (r) {
      var p = KI.findProduct(r[0], btn.getAttribute("data-quick-add"));
      var s = KI.findSize(p, btn.getAttribute("data-size"));
      if (!p || !s) return;
      KI.cart.add(p.id, s.key, 1, r[1].maxQtyPerItem);
      KI.toast("<span>" + KI.esc(p.name) + " (" + KI.esc(s.label) + ") added to cart</span><a href=\"/cart.html\">View cart</a>");
    });
  });

  /* ---------- boot ---------- */
  KI.ready = KI.loadConfig().then(function (cfg) {
    renderHeader(cfg);
    renderFooter(cfg);
    renderWhatsApp(cfg);
    fillConfig(cfg);
    KI.updateCartCount(false);
    KI.observeReveal();
    return cfg;
  }).catch(function (err) {
    console.error(err);
    throw err;
  });

  window.addEventListener("storage", function (e) { if (e.key === CART_KEY) KI.updateCartCount(false); });

  window.KI = KI;
})();
