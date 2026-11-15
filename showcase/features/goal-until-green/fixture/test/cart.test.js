import { test } from "node:test";
import assert from "node:assert/strict";
import { subtotal, applyDiscount, formatPrice } from "../src/cart.js";

test("subtotal multiplies price by quantity", () => {
  assert.equal(
    subtotal([
      { price: 250, qty: 2 },
      { price: 100, qty: 3 },
    ]),
    800,
  );
});

test("applyDiscount takes a percentage off", () => {
  assert.equal(applyDiscount(800, 25), 600);
});

test("formatPrice always shows two decimals", () => {
  assert.equal(formatPrice(600), "$6.00");
});
