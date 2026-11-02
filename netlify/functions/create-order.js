/*
 * POST /.netlify/functions/create-order
 * Body: { items: [{ id, size, qty }], customer: { name, mobile, email, address1, address2, city, state, pincode } }
 *
 * The total is RE-CALCULATED here from data/products.json + data/config.json.
 * Prices sent by the browser are never used.
 */
"use strict";

const { catalogue, config, states, json, parseBody, razorpayAuth } = require("./_lib/shared");

const MAX_LINES = 30;
const NOTE_MAX = 256; // Razorpay limit per note value
const MAX_NOTES = 15; // Razorpay limit on number of notes

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function validateCustomer(c) {
  if (!c || typeof c !== "object") return { error: "Customer details are missing." };
  const out = {
    name: clean(c.name, 80),
    mobile: String(c.mobile || "").replace(/\D/g, ""),
    email: clean(c.email, 100).toLowerCase(),
    address1: clean(c.address1, 150),
    address2: clean(c.address2, 150),
    city: clean(c.city, 60),
    state: clean(c.state, 60),
    pincode: String(c.pincode || "").replace(/\D/g, "")
  };
  if (out.name.length < 2) return { error: "Please enter your full name." };
  if (!/^[6-9]\d{9}$/.test(out.mobile)) return { error: "Please enter a valid 10-digit mobile number." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return { error: "Please enter a valid email address." };
  if (out.address1.length < 5) return { error: "Please enter your full address." };
  if (out.city.length < 2) return { error: "Please enter your city." };
  if (!states.includes(out.state)) return { error: "Please select a valid state." };
  if (!/^[1-9]\d{5}$/.test(out.pincode)) return { error: "Please enter a valid 6-digit pincode." };
  return { customer: out };
}

function buildLines(items) {
  if (!Array.isArray(items) || items.length === 0) return { error: "Your cart is empty." };
  if (items.length > MAX_LINES) return { error: "Too many items in the cart." };
  const maxQty = Number(config.maxQtyPerItem) || 20;
  const merged = new Map();

  for (const item of items) {
    const id = String((item && item.id) || "");
    const sizeKey = String((item && item.size) || "");
    const qty = Number(item && item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
      return { error: "Invalid quantity. You can order up to " + maxQty + " of each item." };
    }
    const product = catalogue.products.find((p) => p.id === id);
    const size = product && product.sizes.find((s) => s.key === sizeKey);
    if (!product || !size) {
      return { error: "Some items in your cart are no longer available. Please review your cart." };
    }
    const key = id + "|" + sizeKey;
    const prev = merged.get(key);
    const newQty = (prev ? prev.qty : 0) + qty;
    if (newQty > maxQty) return { error: "You can order up to " + maxQty + " of each item." };
    merged.set(key, { id, name: product.name, sizeKey, size: size.label, price: Number(size.price), qty: newQty });
  }

  const lines = [...merged.values()].map((l) => ({ ...l, total: l.price * l.qty }));
  return { lines };
}

/* Razorpay allows max 15 notes, each up to 256 characters. */
function buildNotes(customer, lines, subtotal, shipping, total) {
  const notes = {
    customer_name: customer.name,
    customer_mobile: "+91 " + customer.mobile,
    customer_email: customer.email,
    address_line1: customer.address1,
    address_line2: customer.address2 || "-",
    city: customer.city,
    state: customer.state,
    pincode: customer.pincode,
    amount_breakup: "Subtotal Rs " + subtotal + " + Shipping Rs " + shipping + " = Total Rs " + total
  };
  const itemSlots = MAX_NOTES - Object.keys(notes).length; // 6 slots for items
  const chunks = [];
  let current = "";
  for (const l of lines) {
    const part = l.name + " " + l.size + " x" + l.qty + " = Rs " + l.total;
    const next = current ? current + "; " + part : part;
    if (next.length > NOTE_MAX) {
      if (current) chunks.push(current);
      current = part.slice(0, NOTE_MAX);
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  if (chunks.length > itemSlots) {
    const kept = chunks.slice(0, itemSlots);
    kept[itemSlots - 1] = (kept[itemSlots - 1].slice(0, NOTE_MAX - 30) + " ...(+ more items)").slice(0, NOTE_MAX);
    chunks.length = 0;
    chunks.push(...kept);
  }
  chunks.forEach((c, i) => { notes["items_" + (i + 1)] = c; });
  for (const k of Object.keys(notes)) notes[k] = String(notes[k]).slice(0, NOTE_MAX);
  return notes;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = razorpayAuth();
  if (!auth) {
    console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
    return json(500, { error: "Payments are not configured yet. Please contact the store." });
  }

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid request." });

  const c = validateCustomer(body.customer);
  if (c.error) return json(400, { error: c.error });

  const built = buildLines(body.items);
  if (built.error) return json(400, { error: built.error });
  const lines = built.lines;

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const freeAbove = Number(config.freeShippingAbove) || 0;
  const shipping = subtotal >= freeAbove ? 0 : Number(config.shippingCharge) || 0;
  const total = subtotal + shipping;
  const amount = Math.round(total * 100); // paise

  if (amount < 100) return json(400, { error: "Order amount is too low." });

  const receipt = "KI-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

  let res, data;
  try {
    res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth.header },
      body: JSON.stringify({
        amount,
        currency: config.currency || "INR",
        receipt,
        notes: buildNotes(c.customer, lines, subtotal, shipping, total)
      })
    });
    data = await res.json();
  } catch (err) {
    console.error("Razorpay request failed", err);
    return json(502, { error: "Could not reach the payment server. Please try again." });
  }

  if (!res.ok || !data.id) {
    console.error("Razorpay order error", res.status, data && data.error);
    return json(502, { error: "Could not create the payment order. Please try again." });
  }

  return json(200, {
    order_id: data.id,
    amount: data.amount,
    currency: data.currency,
    receipt,
    key_id: auth.id,
    summary: {
      lines: lines.map((l) => ({ id: l.id, name: l.name, size: l.size, qty: l.qty, price: l.price, total: l.total })),
      subtotal,
      shipping,
      total
    }
  });
};

// exported for tests
exports._internal = { validateCustomer, buildLines, buildNotes };
