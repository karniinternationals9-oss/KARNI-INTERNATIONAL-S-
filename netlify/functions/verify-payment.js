/*
 * POST /.netlify/functions/verify-payment
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Verifies the Razorpay signature: HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET).
 * The browser goes to success.html ONLY if this returns { verified: true }.
 */
"use strict";

const crypto = require("crypto");
const { json, parseBody, razorpayAuth } = require("./_lib/shared");

const ID_RE = /^[A-Za-z0-9_]{6,64}$/;

function signatureValid(orderId, paymentId, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = razorpayAuth();
  if (!auth) return json(500, { verified: false, error: "Payments are not configured." });

  const body = parseBody(event) || {};
  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");

  if (!ID_RE.test(orderId) || !ID_RE.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return json(400, { verified: false, error: "Invalid payment details." });
  }

  if (!signatureValid(orderId, paymentId, signature, auth.secret)) {
    console.warn("Signature mismatch for order", orderId);
    return json(400, { verified: false, error: "Payment signature is invalid." });
  }

  // Signature is valid. Fetch the order to return the confirmed amount (best effort).
  let amount = null;
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), {
      headers: { Authorization: auth.header }
    });
    if (res.ok) {
      const order = await res.json();
      amount = order.amount_paid || order.amount || null;
    }
  } catch (err) {
    console.warn("Could not fetch order after verification", err && err.message);
  }

  return json(200, { verified: true, order_id: orderId, payment_id: paymentId, amount });
};

exports._internal = { signatureValid };
