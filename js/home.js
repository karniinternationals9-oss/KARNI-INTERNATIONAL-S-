/* Home page: featured products, best sellers, WhatsApp join form */
(function () {
  "use strict";
  var KI = window.KI;

  Promise.all([KI.ready, KI.loadProducts()]).then(function (r) {
    var cfg = r[0], products = r[1];
    var featured = products.filter(function (p) { return p.featured; });
    var best = products.filter(function (p) { return p.bestSeller; });
    var fg = document.getElementById("featured-grid");
    var bg = document.getElementById("bestseller-grid");
    fg.innerHTML = (featured.length ? featured : products).slice(0, 4).map(function (p) { return KI.productCard(p); }).join("");
    bg.innerHTML = (best.length ? best : products).slice(0, 4).map(function (p) { return KI.productCard(p); }).join("");
    KI.observeReveal();

    var form = document.getElementById("join-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var msg = "Hi " + cfg.storeName + "! " + (name ? "I am " + name + ". " : "") +
        "Please add me to your WhatsApp updates for new products and offers.";
      window.open(KI.waLink(cfg.whatsapp, msg), "_blank", "noopener");
    });
  }).catch(function () {
    document.getElementById("featured-grid").innerHTML = '<p class="center muted">Products could not be loaded. Please refresh the page.</p>';
    document.getElementById("bestseller-grid").innerHTML = "";
  });
})();
