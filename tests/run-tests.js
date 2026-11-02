/* Simple tests for the Netlify Functions (no dependencies). Run: npm test */
"use strict";
const assert = require("assert");
const crypto = require("crypto");

process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = "test_secret_123";

const products = require("../data/products.json").products;
const config = require("../data/config.json");
const createOrder = require("../netlify/functions/create-order");
const verifyPayment = require("../netlify/functions/verify-payment");

let lastRequest = null;
global.fetch = async (url, opts = {}) => {
  lastRequest = { url, opts, body: opts.body ? JSON.parse(opts.body) : null };
  if (opts.method === "POST") {
    return { ok: true, status: 200, json: async () => ({ id: "order_TEST123456", amount: lastRequest.body.amount, currency: "INR" }) };
  }
  return { ok: true, status: 200, json: async () => ({ id: "order_TEST123456", amount: 50000, amount_paid: 50000 }) };
};

const customer = {
  name: "Test User", mobile: "9876543210", email: "test@example.com",
  address1: "12 MG Road", address2: "", city: "Jaipur", state: "Rajasthan", pincode: "302001"
};
const call = (fn, body, method = "POST") => fn.handler({ httpMethod: method, body: JSON.stringify(body) });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("server recalculates total and ignores browser prices", async () => {
  const p = products[0], s = p.sizes[0];
  const res = await call(createOrder, { items: [{ id: p.id, size: s.key, qty: 2, price: 1 }], customer });
  assert.strictEqual(res.statusCode, 200, res.body);
  const data = JSON.parse(res.body);
  const subtotal = s.price * 2;
  const shipping = subtotal >= config.freeShippingAbove ? 0 : config.shippingCharge;
  assert.strictEqual(data.summary.total, subtotal + shipping);
  assert.strictEqual(lastRequest.body.amount, (subtotal + shipping) * 100);
  assert.strictEqual(data.key_id, "rzp_test_dummy");
  assert.ok(!res.body.includes("test_secret_123"), "secret must never be returned");
  assert.ok(lastRequest.opts.headers.Authorization.startsWith("Basic "));
});

test("free shipping above threshold", async () => {
  const p = products[0], s = p.sizes[2];
  const qty = Math.ceil(config.freeShippingAbove / s.price) + 1;
  const res = await call(createOrder, { items: [{ id: p.id, size: s.key, qty }], customer });
  const data = JSON.parse(res.body);
  assert.strictEqual(data.summary.shipping, 0);
});

test("notes hold customer + items within Razorpay limits", async () => {
  const items = [];
  products.forEach((p) => p.sizes.forEach((s) => items.push({ id: p.id, size: s.key, qty: 3 })));
  const res = await call(createOrder, { items, customer: { ...customer, address2: "Near Temple" } });
  assert.strictEqual(res.statusCode, 200, res.body);
  const notes = lastRequest.body.notes;
  assert.ok(Object.keys(notes).length <= 15, "max 15 notes");
  Object.values(notes).forEach((v) => assert.ok(String(v).length <= 256, "note too long"));
  assert.strictEqual(notes.customer_name, "Test User");
  assert.strictEqual(notes.pincode, "302001");
  assert.ok(notes.items_1.includes(products[0].name));
});

test("rejects unknown product, bad qty, bad mobile/pincode/state", async () => {
  const p = products[0];
  const bad = [
    { items: [{ id: "nope", size: "250g", qty: 1 }], customer },
    { items: [{ id: p.id, size: "5kg", qty: 1 }], customer },
    { items: [{ id: p.id, size: "250g", qty: 0 }], customer },
    { items: [{ id: p.id, size: "250g", qty: 1.5 }], customer },
    { items: [{ id: p.id, size: "250g", qty: 999 }], customer },
    { items: [], customer },
    { items: [{ id: p.id, size: "250g", qty: 1 }], customer: { ...customer, mobile: "12345" } },
    { items: [{ id: p.id, size: "250g", qty: 1 }], customer: { ...customer, pincode: "012345" } },
    { items: [{ id: p.id, size: "250g", qty: 1 }], customer: { ...customer, state: "Atlantis" } }
  ];
  for (const b of bad) {
    const res = await call(createOrder, b);
    assert.strictEqual(res.statusCode, 400, JSON.stringify(b) + " -> " + res.body);
  }
  assert.strictEqual((await call(createOrder, {}, "GET")).statusCode, 405);
});

test("verify-payment accepts valid signature and rejects tampered", async () => {
  const order = "order_TEST123456", pay = "pay_TEST654321";
  const sig = crypto.createHmac("sha256", "test_secret_123").update(order + "|" + pay).digest("hex");
  const ok = await call(verifyPayment, { razorpay_order_id: order, razorpay_payment_id: pay, razorpay_signature: sig });
  assert.strictEqual(ok.statusCode, 200);
  assert.strictEqual(JSON.parse(ok.body).verified, true);

  const badSig = sig.replace(/.$/, sig.endsWith("a") ? "b" : "a");
  const bad = await call(verifyPayment, { razorpay_order_id: order, razorpay_payment_id: pay, razorpay_signature: badSig });
  assert.strictEqual(bad.statusCode, 400);
  assert.strictEqual(JSON.parse(bad.body).verified, false);

  const other = await call(verifyPayment, { razorpay_order_id: "order_OTHER99999", razorpay_payment_id: pay, razorpay_signature: sig });
  assert.strictEqual(JSON.parse(other.body).verified, false);
});

test("returns 500 when keys are missing", async () => {
  const id = process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_ID;
  const res = await call(createOrder, { items: [{ id: products[0].id, size: "250g", qty: 1 }], customer });
  process.env.RAZORPAY_KEY_ID = id;
  assert.strictEqual(res.statusCode, 500);
});

test("products.json is valid", () => {
  const ids = new Set();
  products.forEach((p) => {
    assert.ok(p.id && !ids.has(p.id), "duplicate/missing id " + p.id);
    ids.add(p.id);
    assert.ok(p.name && p.category && Array.isArray(p.images) && p.images.length, p.id);
    const keys = new Set();
    p.sizes.forEach((s) => {
      assert.ok(!keys.has(s.key), "duplicate size " + s.key);
      keys.add(s.key);
      assert.ok(Number.isInteger(s.price) && s.price > 0, "price must be a whole number in rupees: " + p.id);
    });
  });
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("✓ " + name); }
    catch (e) { failed++; console.error("✗ " + name + "\n  " + e.message); }
  }
  console.log(failed ? `\n${failed} test(s) failed` : `\nAll ${tests.length} tests passed`);
  process.exit(failed ? 1 : 0);
})();
