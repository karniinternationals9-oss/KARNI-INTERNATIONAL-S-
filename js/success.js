/* Success page: shows the verified order saved by checkout.js */
(function () {
  "use strict";
  var KI = window.KI;
  var root = document.getElementById("success-root");

  KI.ready.then(function (cfg) {
    var orderId = KI.param("order_id");
    var paymentId = KI.param("payment_id");
    var order = null;
    try { order = JSON.parse(sessionStorage.getItem("ki_last_order") || "null"); } catch (e) { order = null; }

    if (!order || !order.verified || order.order_id !== orderId) {
      root.innerHTML = '<div class="card success-card">' +
        "<h1 style=\"font-size:1.8rem\">We couldn't show your order here</h1>" +
        '<p class="muted">Order details are shown only once, right after a verified payment on this device.</p>' +
        (orderId ? '<p>Reference: <strong>' + KI.esc(orderId) + "</strong>" + (paymentId ? " / " + KI.esc(paymentId) : "") + "</p>" : "") +
        '<p>If you have paid and need help, please contact us on WhatsApp – we will check your order.</p>' +
        '<div class="success-actions"><a class="btn btn--whatsapp" target="_blank" rel="noopener" href="' +
        KI.waLink(cfg.whatsapp, "Hi, I need help with my order" + (orderId ? " " + orderId : "") + (paymentId ? " (Payment ID " + paymentId + ")" : "") + ".") +
        '">' + KI.icons.whatsapp.replace("<svg", '<svg width="20" height="20"') + ' Contact on WhatsApp</a><a class="btn btn--outline" href="/shop.html">Back to shop</a></div></div>';
      return;
    }

    var c = order.customer || {};
    var address = [c.address1, c.address2, c.city, c.state + " – " + c.pincode].filter(Boolean).join(", ");
    var rows = order.lines.map(function (l) {
      return "<li>" + (l.image ? '<img src="' + KI.esc(l.image) + '" alt="" width="52" height="52">' : "<span></span>") + "<div><div class=\"name\">" + KI.esc(l.name) + '</div><div class="muted">' + KI.esc(l.size) + " × " + l.qty + "</div></div><strong>" + KI.inr(l.total) + "</strong></li>";
    }).join("");

    var shareText = "Hello " + cfg.storeName + ", I have placed an order.\n\n" +
      "Order ID: " + order.order_id + "\nPayment ID: " + order.payment_id + "\n\n" +
      order.lines.map(function (l) { return "• " + l.name + " (" + l.size + ") × " + l.qty + " = ₹" + l.total; }).join("\n") +
      "\n\nSubtotal: ₹" + order.subtotal + "\nShipping: " + (order.shipping ? "₹" + order.shipping : "FREE") + "\nTotal paid: ₹" + order.total +
      "\n\nName: " + c.name + "\nMobile: +91 " + c.mobile + "\nAddress: " + address;

    document.title = "Order Confirmed – " + order.order_id + " | " + cfg.storeName;
    root.innerHTML = '<div class="card success-card">' +
      '<div class="success-icon">' + KI.icons.check + "</div>" +
      '<span class="eyebrow">Payment successful</span>' +
      "<h1 style=\"font-size:clamp(1.7rem,4vw,2.4rem)\">Thank you, " + KI.esc((c.name || "").split(" ")[0]) + "!</h1>" +
      '<p class="muted">Your order has been placed. We will pack it fresh and share delivery updates on your mobile/email.</p>' +
      '<div class="id-grid"><div><span>Order ID</span><strong>' + KI.esc(order.order_id) + "</strong></div>" +
      "<div><span>Payment ID</span><strong>" + KI.esc(order.payment_id) + "</strong></div></div>" +
      '<div style="text-align:left">' +
      '<h2 style="font-size:1.2rem">Order summary</h2>' +
      '<ul class="summary-items">' + rows + "</ul>" +
      '<div class="summary-row"><span>Subtotal</span><span>' + KI.inr(order.subtotal) + "</span></div>" +
      '<div class="summary-row"><span>Shipping</span><span>' + (order.shipping ? KI.inr(order.shipping) : "FREE") + "</span></div>" +
      '<div class="summary-row summary-row--total"><span>Total paid</span><span>' + KI.inr(order.total) + "</span></div>" +
      '<p class="muted" style="margin-top:14px"><strong>Delivering to:</strong> ' + KI.esc(c.name) + ", " + KI.esc(address) + " · +91 " + KI.esc(c.mobile) + "</p>" +
      "</div>" +
      '<div class="success-actions">' +
      '<a class="btn btn--whatsapp" target="_blank" rel="noopener" href="' + KI.waLink(cfg.whatsapp, shareText) + '">' + KI.icons.whatsapp.replace("<svg", '<svg width="20" height="20"') + " Share order on WhatsApp</a>" +
      '<a class="btn btn--outline" href="/shop.html">Continue shopping</a>' +
      "</div></div>";
  });
})();
