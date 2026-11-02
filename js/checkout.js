/* Checkout page: customer form, validation, Razorpay payment */
(function () {
  "use strict";
  var KI = window.KI;
  var form = document.getElementById("checkout-form");
  var payBtn = document.getElementById("pay-btn");
  var summaryEl = document.getElementById("checkout-summary");
  var alertEl = document.getElementById("checkout-alert");
  var layout = document.getElementById("checkout-layout");
  var PAY_LABEL = "Pay Now";

  function showAlert(type, title, msg) {
    alertEl.innerHTML = '<div class="alert alert--' + type + '"><strong>' + KI.esc(title) + "</strong>" + KI.esc(msg || "") + "</div>";
    alertEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function clearAlert() { alertEl.innerHTML = ""; }

  function setBusy(busy, label) {
    payBtn.disabled = busy;
    payBtn.innerHTML = busy ? '<span class="spinner" aria-hidden="true"></span> ' + KI.esc(label || "Please wait…") : PAY_LABEL;
  }

  function summaryHTML(lines, subtotal, shipping, total) {
    return '<ul class="summary-items">' + lines.map(function (l) {
      return "<li>" + (l.image ? '<img src="' + KI.esc(l.image) + '" alt="" width="52" height="52">' : "<span></span>") +
        '<div><div class="name">' + KI.esc(l.name) + '</div><div class="muted">' + KI.esc(l.size) + " × " + l.qty + "</div></div>" +
        "<strong>" + KI.inr(l.total) + "</strong></li>";
    }).join("") + "</ul>" +
      '<div class="summary-row"><span>Subtotal</span><span>' + KI.inr(subtotal) + "</span></div>" +
      '<div class="summary-row"><span>Shipping</span><span>' + (shipping ? KI.inr(shipping) : "FREE") + "</span></div>" +
      '<div class="summary-row summary-row--total"><span>Total</span><span>' + KI.inr(total) + "</span></div>";
  }

  /* ---------- validation ---------- */
  var rules = {
    name: function (v) { return v.length >= 2 ? "" : "Please enter your full name."; },
    mobile: function (v) { return /^[6-9]\d{9}$/.test(v) ? "" : "Enter a valid 10-digit mobile number (starts with 6–9)."; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address."; },
    address1: function (v) { return v.length >= 5 ? "" : "Please enter your house no., building and street."; },
    city: function (v) { return v.length >= 2 ? "" : "Please enter your city."; },
    state: function (v) { return v ? "" : "Please select your state."; },
    pincode: function (v) { return /^[1-9]\d{5}$/.test(v) ? "" : "Enter a valid 6-digit pincode."; }
  };
  function value(name) { return (form.elements[name].value || "").trim(); }
  function check(name) {
    var msg = rules[name](value(name));
    var input = form.elements[name];
    input.closest(".field").classList.toggle("has-error", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    document.getElementById("c-" + name + "-err").textContent = msg;
    return !msg;
  }
  // digits only for mobile & pincode
  // (also accepts pasted numbers like "+91 98765 43210" or "098765 43210")
  form.elements.mobile.addEventListener("input", function (e) {
    var d = e.target.value.replace(/\D/g, "");
    if (d.length > 10 && d.indexOf("91") === 0) d = d.slice(2);
    if (d.length > 10 && d.charAt(0) === "0") d = d.slice(1);
    e.target.value = d.slice(0, 10);
  });
  form.elements.pincode.addEventListener("input", function (e) { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); });
  Object.keys(rules).forEach(function (n) {
    form.elements[n].addEventListener("blur", function () { if (value(n)) check(n); });
    ["input", "change"].forEach(function (ev) {
      form.elements[n].addEventListener(ev, function () { if (form.elements[n].closest(".has-error")) check(n); });
    });
  });

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Could not load the payment window. Please check your internet connection.")); };
      document.head.appendChild(s);
    });
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Something went wrong (" + r.status + "). Please try again.");
        return data;
      });
    });
  }

  Promise.all([KI.ready, KI.loadProducts(), KI.loadStates()]).then(function (r) {
    var cfg = r[0], products = r[1], states = r[2];
    var stateSel = form.elements.state;
    states.forEach(function (s) { stateSel.add(new Option(s, s)); });

    function renderLocalSummary() {
      var t = KI.computeTotals(products, cfg);
      if (!t.lines.length) {
        layout.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' + KI.icons.cart +
          '<h2>Your cart is empty</h2><p class="muted">Add some chai patti to your cart before checking out.</p>' +
          '<a class="btn btn--primary" href="/shop.html">Shop Now</a></div>';
        return false;
      }
      summaryEl.innerHTML = summaryHTML(t.lines.map(function (l) {
        return { name: l.product.name, size: l.size.label, qty: l.qty, total: l.total, image: l.product.images[0] };
      }), t.subtotal, t.shipping, t.total);
      return true;
    }
    if (!renderLocalSummary()) return;
    setBusy(false);

    var imageOf = {};
    products.forEach(function (p) { imageOf[p.id] = p.images[0]; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearAlert();
      var valid = Object.keys(rules).map(check).every(Boolean);
      if (!valid) {
        var first = form.querySelector('[aria-invalid="true"]');
        if (first) first.focus();
        return;
      }
      var customer = {
        name: value("name"), mobile: value("mobile"), email: value("email"),
        address1: value("address1"), address2: value("address2"),
        city: value("city"), state: value("state"), pincode: value("pincode")
      };
      var items = KI.cart.get().map(function (i) { return { id: i.id, size: i.size, qty: i.qty }; });

      setBusy(true, "Creating order…");
      Promise.all([postJSON("/.netlify/functions/create-order", { items: items, customer: customer }), loadRazorpay()])
        .then(function (res) {
          var order = res[0];
          var s = order.summary;
          var lines = s.lines.map(function (l) { return { name: l.name, size: l.size, qty: l.qty, total: l.total, image: imageOf[l.id] }; });
          // Always show the amount calculated by the server
          summaryEl.innerHTML = summaryHTML(lines, s.subtotal, s.shipping, s.total);

          var pending = {
            order_id: order.order_id, receipt: order.receipt,
            lines: lines, subtotal: s.subtotal, shipping: s.shipping, total: s.total,
            customer: customer, created: Date.now()
          };
          try { sessionStorage.setItem("ki_pending_order", JSON.stringify(pending)); } catch (err) { /* ignore */ }

          setBusy(true, "Opening payment…");
          var failed = false;
          var rzp = new window.Razorpay({
            key: order.key_id,
            amount: order.amount,
            currency: order.currency,
            order_id: order.order_id,
            name: cfg.storeName,
            description: "Order " + order.receipt,
            image: location.origin + "/assets/logo-square.png",
            prefill: { name: customer.name, email: customer.email, contact: "+91" + customer.mobile },
            notes: { receipt: order.receipt },
            theme: { color: "#7A1F2B" },
            handler: function (resp) {
              setBusy(true, "Verifying payment…");
              postJSON("/.netlify/functions/verify-payment", {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature
              }).then(function (v) {
                if (!v.verified) throw new Error("Payment could not be verified.");
                pending.payment_id = resp.razorpay_payment_id;
                pending.verified = true;
                try {
                  sessionStorage.setItem("ki_last_order", JSON.stringify(pending));
                  sessionStorage.removeItem("ki_pending_order");
                } catch (err) { /* ignore */ }
                KI.cart.clear();
                location.href = "/success.html?order_id=" + encodeURIComponent(resp.razorpay_order_id) + "&payment_id=" + encodeURIComponent(resp.razorpay_payment_id);
              }).catch(function (err) {
                setBusy(false);
                showAlert("error", "We could not verify your payment.",
                  " " + err.message + " If money was deducted, please contact us with Payment ID " + resp.razorpay_payment_id + " – do not pay again.");
              });
            },
            modal: {
              confirm_close: true,
              ondismiss: function () {
                setBusy(false);
                if (failed) return; // keep the "payment failed" message
                showAlert("info", "Payment cancelled.", " Your order was not placed and your cart is saved. You can try again whenever you are ready.");
              }
            }
          });
          rzp.on("payment.failed", function (resp) {
            failed = true;
            var d = (resp && resp.error && resp.error.description) || "The payment could not be completed.";
            showAlert("error", "Payment failed.", " " + d + " Please try again or use another payment method.");
          });
          rzp.open();
        })
        .catch(function (err) {
          setBusy(false);
          renderLocalSummary();
          showAlert("error", "Could not start payment.", " " + err.message);
        });
    });
  }).catch(function () {
    showAlert("error", "Checkout could not be loaded.", " Please refresh the page.");
  });
})();
