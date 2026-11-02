/* Shared helpers for Netlify Functions. Files in "_lib" are not deployed as functions. */
"use strict";

const catalogue = require("../../../data/products.json");
const config = require("../../../data/config.json");
const states = require("../../../data/indian-states.json");

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function parseBody(event) {
  if (!event.body) return null;
  if (event.body.length > 20000) return null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function razorpayAuth() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return null;
  return { id, secret, header: "Basic " + Buffer.from(id + ":" + secret).toString("base64") };
}

module.exports = { catalogue, config, states, json, parseBody, razorpayAuth };
