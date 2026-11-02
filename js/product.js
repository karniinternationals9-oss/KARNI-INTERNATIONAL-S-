/* Product detail page: gallery, pack size, quantity, add to cart / buy now, related products */
(function () {
  "use strict";
  var KI = window.KI;
  var root = document.getElementById("product-root");

  function setMeta(name, content) {
    var el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
    if (el) el.setAttribute("content", content);
  }

  Promise.all([KI.ready, KI.loadProducts()]).then(function (r) {
    var cfg = r[0], products = r[1];
    var id = KI.param("id");
    var p = KI.findProduct(products, id);

    if (!p) {
      document.title = "Product not found | " + cfg.storeName;
      root.innerHTML = '<div class="empty-state" style="margin:32px 0"><h1 style="font-size:1.6rem">Product not found</h1><p class="muted">This product may have been removed or the link is incorrect.</p><a class="btn btn--primary" href="/shop.html">Browse all products</a></div>';
      return;
    }

    var max = cfg.maxQtyPerItem || 20;
    var sizeFromUrl = KI.findSize(p, KI.param("size"));
    var state = { size: (sizeFromUrl || p.sizes[0]).key, qty: 1, img: 0 };

    var title = p.name + " – Buy Chai Patti Online | " + cfg.storeName;
    var desc = p.shortDescription + " Available in " + p.sizes.map(function (s) { return s.label; }).join(", ") + ". Buy premium tea online in India.";
    document.title = title;
    setMeta("description", desc);
    setMeta("og:title", title);
    setMeta("og:description", desc);
    setMeta("og:image", p.images[0]);
    document.getElementById("crumb-name").textContent = p.name;

    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "Product",
      name: p.name, description: p.description, category: p.category,
      image: p.images.map(function (i) { return location.origin + i; }),
      brand: { "@type": "Brand", name: cfg.storeName },
      offers: p.sizes.map(function (s) {
        return { "@type": "Offer", name: s.label, price: s.price, priceCurrency: "INR", availability: "https://schema.org/InStock" };
      })
    });
    document.head.appendChild(ld);

    var thumbs = p.images.map(function (src, i) {
      return '<button type="button" data-img="' + i + '" aria-label="Show image ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : "") + '><img src="' + KI.esc(src) + '" alt="" width="76" height="76" loading="lazy"></button>';
    }).join("");
    var sizes = p.sizes.map(function (s) {
      return '<label><input type="radio" name="size" value="' + KI.esc(s.key) + '"' + (s.key === state.size ? " checked" : "") + "><span><strong>" + KI.esc(s.label) + "</strong><small>" + KI.inr(s.price) + "</small></span></label>";
    }).join("");
    var tips = (p.brewingTips || []).map(function (t) { return "<li>" + KI.esc(t) + "</li>"; }).join("");

    root.innerHTML =
      '<div class="product-layout">' +
      '<div class="gallery">' +
      '<div class="gallery__main"><img id="main-img" src="' + KI.esc(p.images[0]) + '" alt="' + KI.esc(p.name) + '" width="600" height="600"></div>' +
      (p.images.length > 1 ? '<div class="gallery__thumbs" role="group" aria-label="Product images">' + thumbs + "</div>" : "") +
      "</div>" +
      '<div class="product-info">' +
      '<span class="product-card__cat">' + KI.esc(p.category) + "</span>" +
      "<h1>" + KI.esc(p.name) + "</h1>" +
      '<p class="price" id="p-price" aria-live="polite"></p>' +
      '<p class="lead">' + KI.esc(p.description) + "</p>" +
      '<fieldset class="size-options-wrap" style="border:0;padding:0;margin:0"><legend class="opt-label">Pack size</legend><div class="size-options">' + sizes + "</div></fieldset>" +
      '<span class="opt-label" id="qty-label">Quantity</span>' +
      '<div class="qty" role="group" aria-labelledby="qty-label"><button type="button" data-step="-1" aria-label="Decrease quantity">−</button><input id="p-qty" type="number" min="1" max="' + max + '" value="1" aria-label="Quantity"><button type="button" data-step="1" aria-label="Increase quantity">+</button></div>' +
      '<div class="buy-row"><button class="btn btn--outline" type="button" id="add-btn">Add to Cart</button><button class="btn btn--primary" type="button" id="buy-btn">Buy Now</button></div>' +
      '<ul class="info-list">' +
      "<li>" + KI.icons.check + "<span>Free shipping on orders above " + KI.inr(cfg.freeShippingAbove) + "</span></li>" +
      "<li>" + KI.icons.lock + "<span>Secure payment – UPI, cards, net banking</span></li>" +
      "<li>" + KI.icons.whatsapp + '<span>Questions? <a href="' + KI.waLink(cfg.whatsapp, "Hi, I have a question about " + p.name) + '" target="_blank" rel="noopener">Ask on WhatsApp</a></span></li>' +
      "</ul>" +
      (tips ? '<div class="tips-box"><h2>Brewing tips</h2><ul>' + tips + "</ul></div>" : "") +
      "</div></div>";

    var priceEl = document.getElementById("p-price");
    var qtyEl = document.getElementById("p-qty");
    var mainImg = document.getElementById("main-img");

    function updatePrice() {
      var s = KI.findSize(p, state.size);
      priceEl.innerHTML = KI.inr(s.price * state.qty) + ' <small>(' + KI.esc(s.label) + (state.qty > 1 ? " × " + state.qty : "") + ")</small>";
    }
    function setQty(n) {
      state.qty = Math.max(1, Math.min(max, parseInt(n, 10) || 1));
      qtyEl.value = state.qty;
      updatePrice();
    }
    updatePrice();

    root.addEventListener("change", function (e) {
      if (e.target.name === "size") { state.size = e.target.value; updatePrice(); }
      if (e.target === qtyEl) setQty(qtyEl.value);
    });
    root.addEventListener("click", function (e) {
      var step = e.target.closest("[data-step]");
      if (step) setQty(state.qty + parseInt(step.getAttribute("data-step"), 10));
      var th = e.target.closest("[data-img]");
      if (th) {
        var i = parseInt(th.getAttribute("data-img"), 10);
        mainImg.src = p.images[i];
        root.querySelectorAll("[data-img]").forEach(function (b) { b.removeAttribute("aria-current"); });
        th.setAttribute("aria-current", "true");
      }
    });
    function add() {
      KI.cart.add(p.id, state.size, state.qty, max);
      var s = KI.findSize(p, state.size);
      return s;
    }
    document.getElementById("add-btn").addEventListener("click", function () {
      var s = add();
      KI.toast("<span>" + KI.esc(p.name) + " (" + KI.esc(s.label) + ") × " + state.qty + " added</span><a href=\"/cart.html\">View cart</a>");
    });
    document.getElementById("buy-btn").addEventListener("click", function () {
      add();
      location.href = "/checkout.html";
    });

    var related = products.filter(function (x) { return x.id !== p.id && x.category === p.category; });
    products.forEach(function (x) { if (x.id !== p.id && related.indexOf(x) < 0) related.push(x); });
    related = related.slice(0, 4);
    if (related.length) {
      document.getElementById("related-grid").innerHTML = related.map(function (x) { return KI.productCard(x); }).join("");
      document.getElementById("related-section").hidden = false;
      KI.observeReveal();
    }
  }).catch(function () {
    root.innerHTML = '<p class="muted" style="padding:32px 0">Product could not be loaded. Please refresh the page.</p>';
  });
})();
