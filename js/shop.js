/* Shop page: filters (category, pack size) and sorting */
(function () {
  "use strict";
  var KI = window.KI;
  var grid = document.getElementById("shop-grid");
  var count = document.getElementById("shop-count");
  var fCat = document.getElementById("f-category");
  var fSize = document.getElementById("f-size");
  var fSort = document.getElementById("f-sort");

  Promise.all([KI.ready, KI.loadProducts()]).then(function (r) {
    var products = r[1];

    var cats = [], sizes = [];
    products.forEach(function (p) {
      if (cats.indexOf(p.category) < 0) cats.push(p.category);
      p.sizes.forEach(function (s) {
        if (!sizes.some(function (x) { return x.key === s.key; })) sizes.push({ key: s.key, label: s.label });
      });
    });
    cats.forEach(function (c) { fCat.add(new Option(c, c)); });
    sizes.forEach(function (s) { fSize.add(new Option(s.label, s.key)); });

    // Read filters from URL (e.g. shop.html?category=Flavoured%20Tea)
    var q = new URLSearchParams(location.search);
    if (q.get("category")) fCat.value = q.get("category");
    if (q.get("size")) fSize.value = q.get("size");
    if (q.get("sort")) fSort.value = q.get("sort");
    if (fSort.selectedIndex < 0) fSort.value = "featured";

    function priceOf(p) {
      var s = fSize.value && KI.findSize(p, fSize.value);
      return s ? s.price : KI.minPrice(p);
    }

    function render() {
      var list = products.filter(function (p) {
        if (fCat.value && p.category !== fCat.value) return false;
        if (fSize.value && !KI.findSize(p, fSize.value)) return false;
        return true;
      });
      var sort = fSort.value;
      list = list.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) {
        if (sort === "price-asc") return priceOf(a.p) - priceOf(b.p);
        if (sort === "price-desc") return priceOf(b.p) - priceOf(a.p);
        if (sort === "name-asc") return a.p.name.localeCompare(b.p.name);
        if (sort === "name-desc") return b.p.name.localeCompare(a.p.name);
        return (b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0) || a.i - b.i;
      }).map(function (x) { return x.p; });

      count.textContent = list.length + " product" + (list.length === 1 ? "" : "s");
      grid.innerHTML = list.length
        ? list.map(function (p) { return KI.productCard(p, { sizeKey: fSize.value || null }); }).join("")
        : '<div class="empty-state" style="grid-column:1/-1"><p><strong>No products match these filters.</strong></p><button class="btn btn--outline btn--sm" type="button" id="reset-filters">Clear filters</button></div>';
      KI.observeReveal(grid);

      var params = new URLSearchParams();
      if (fCat.value) params.set("category", fCat.value);
      if (fSize.value) params.set("size", fSize.value);
      if (sort !== "featured") params.set("sort", sort);
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    }

    [fCat, fSize, fSort].forEach(function (el) { el.addEventListener("change", render); });
    grid.addEventListener("click", function (e) {
      if (e.target.id === "reset-filters") { fCat.value = ""; fSize.value = ""; render(); }
    });
    render();
  }).catch(function () {
    grid.innerHTML = '<p class="muted">Products could not be loaded. Please refresh the page.</p>';
  });
})();
