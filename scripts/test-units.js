#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { getUnitMultiplier, parseServingLabel } = require("../lib/units");

const assertClose = (actual, expected, message) => {
  const epsilon = 1e-9;
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    message || `Expected ${actual} to be close to ${expected}`
  );
};

const serving = parseServingLabel("serving");
assert.deepStrictEqual(serving, { amount: 1, unit: "serving" });

assertClose(getUnitMultiplier("g", "100g"), 1 / 100);
assertClose(getUnitMultiplier("100g", "g"), 100);
assertClose(getUnitMultiplier("mg", "g"), 0.001);
assertClose(getUnitMultiplier("ml", "l"), 0.001);
assert.strictEqual(getUnitMultiplier("serving", "serving"), 1);
assert.strictEqual(getUnitMultiplier("serving", "g"), null);

console.log("Unit conversion tests passed.");
