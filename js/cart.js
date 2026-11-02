/* Cart page */
(function () {
  "use strict";
  var KI = window.KI;
  var root = document.getElementById("cart-root");

  Promise.all([KI.ready, KI.loadProducts()]).then(function (r) {
    var cfg = r[0], products = r[1];
    var max = cfg.maxQtyPerItem || 20;

    function render() {
      var t = KI.computeTotals(products, cfg);
      if (!t.lines.length) {
        root.innerHTML = '<div class="empty-state">' + KI.icons.cart +
          '<h2>Your cart is empty</h2><p class="muted">Looks like you have not added any chai patti yet.</p>' +
          '<a class="btn btn--primary" href="/shop.html">Shop Now</a></div>';
        return;
      }
      var items = t.lines.map(function (l) {
        var url = "/product.html?id=" + encodeURIComponent(l.product.id) + "&size=" + encodeURIComponent(l.size.key);
        return '<article class="cart-item" data-id="' + KI.esc(l.product.id) + '" data-size="' + KI.esc(l.size.key) + '">' +
          '<a href="' + url + '" tabindex="-1" aria-hidden="true"><img src="' + KI.esc(l.product.images[0]) + '" alt="" width="96" height="96"></a>' +
          "<div>" +
          '<h3><a href="' + url + '">' + KI.esc(l.product.name) + "</a></h3>" +
          '<div class="meta">' + KI.esc(l.size.label) + " · " + KI.inr(l.size.price) + " each</div>" +
          '<div class="controls">' +
          '<div class="qty qty--sm" role="group" aria-label="Quantity for ' + KI.esc(l.product.name) + '">' +
          '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
          '<input type="number" min="1" max="' + max + '" value="' + l.qty + '" aria-label="Quantity" data-qty>' +
          '<button type="button" data-step="1" aria-label="Increase quantity">+</button></div>' +
          '<button class="link-btn" type="button" data-remove>Remove</button>' +
          "</div></div>" +
          '<div class="line-total">' + KI.inr(l.total) + "</div>" +
          "</article>";
      }).join("");

      var shipNote;
      if (t.shipping === 0) {
        shipNote = '<div class="ship-note">🎉 You have unlocked <strong>free shipping</strong>!</div>';
      } else {
        var left = cfg.freeShippingAbove - t.subtotal;
        var pct = Math.min(100, Math.round((t.subtotal / cfg.freeShippingAbove) * 100));
        shipNote = '<div class="ship-note">Add <strong>' + KI.inr(left) + "</strong> more for free shipping." +
          '<div class="ship-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div></div>';
      }

      root.innerHTML = '<div class="cart-layout">' +
        '<div class="cart-list">' + items +
        '<p><a href="/shop.html">← Continue shopping</a></p></div>' +
        '<aside class="summary" aria-labelledby="sum-title"><h2 id="sum-title">Cart total</h2>' +
        shipNote +
        '<div class="summary-row"><span>Subtotal</span><span>' + KI.inr(t.subtotal) + "</span></div>" +
        '<div class="summary-row"><span>Shipping</span><span>' + (t.shipping ? KI.inr(t.shipping) : "FREE") + "</span></div>" +
        '<div class="summary-row summary-row--total"><span>Total</span><span>' + KI.inr(t.total) + "</span></div>" +
        '<a class="btn btn--primary btn--block" href="/checkout.html" style="margin-top:14px">Proceed to Checkout</a>' +
        '<p class="secure-note">' + KI.icons.lock + " Secure payment via Razorpay</p>" +
        "</aside></div>";
    }

    function rowOf(el) {
      var row = el.closest(".cart-item");
      return row ? { id: row.getAttribute("data-id"), size: row.getAttribute("data-size"), row: row } : null;
    }
    function current(r) {
      var item = KI.cart.get().filter(function (i) { return i.id === r.id && i.size === r.size; })[0];
      return item ? item.qty : 0;
    }

    root.addEventListener("click", function (e) {
      var r = rowOf(e.target);
      if (!r) return;
      var step = e.target.closest("[data-step]");
      if (step) {
        var n = current(r) + parseInt(step.getAttribute("data-step"), 10);
        KI.cart.setQty(r.id, r.size, Math.max(1, Math.min(max, n)));
      }
      if (e.target.closest("[data-remove]")) KI.cart.remove(r.id, r.size);
    });
    root.addEventListener("change", function (e) {
      if (!e.target.hasAttribute("data-qty")) return;
      var r = rowOf(e.target);
      var n = parseInt(e.target.value, 10);
      KI.cart.setQty(r.id, r.size, Math.max(1, Math.min(max, isNaN(n) ? 1 : n)));
    });

    document.addEventListener("cart:change", render);
    window.addEventListener("storage", render);
    render();
  }).catch(function () {
    root.innerHTML = '<p class="muted">Cart could not be loaded. Please refresh the page.</p>';
  });
})();
