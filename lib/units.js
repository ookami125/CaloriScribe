"use strict";

const normalizeServingUnit = (value) => {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return null;
  }
  const replacements = {
    gram: "g",
    grams: "g",
    g: "g",
    kilogram: "kg",
    kilograms: "kg",
    kg: "kg",
    milligram: "mg",
    milligrams: "mg",
    mg: "mg",
    microgram: "mcg",
    micrograms: "mcg",
    mcg: "mcg",
    ug: "mcg",
    pound: "lb",
    pounds: "lb",
    lb: "lb",
    lbs: "lb",
    milliliter: "ml",
    milliliters: "ml",
    ml: "ml",
    liter: "l",
    liters: "l",
    l: "l",
    "fl oz": "fl oz",
    floz: "fl oz",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    ounce: "oz",
    ounces: "oz",
    oz: "oz",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    tbsp: "tbsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tsp: "tsp",
    cup: "cup",
    cups: "cup",
    serving: "serving",
    servings: "serving",
    piece: "piece",
    pieces: "piece",
    slice: "slice",
    slices: "slice",
    pack: "pack",
    packs: "pack",
    packet: "packet",
    packets: "packet",
    stick: "stick",
    sticks: "stick",
    can: "can",
    cans: "can",
    bottle: "bottle",
    bottles: "bottle",
    bar: "bar",
    bars: "bar",
  };
  return replacements[cleaned] || cleaned;
};

const parseQuantity = (value) => {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return null;
  }
  if (cleaned.includes(" ")) {
    const parts = cleaned.split(/\s+/);
    const whole = parseFloat(parts[0]);
    const fraction = parseQuantity(parts.slice(1).join(" "));
    if (Number.isFinite(whole) && Number.isFinite(fraction)) {
      return whole + fraction;
    }
  }
  if (cleaned.includes("/")) {
    const [numerator, denominator] = cleaned.split("/");
    const num = parseFloat(numerator);
    const den = parseFloat(denominator);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseServingLabel = (text) => {
  if (!text) {
    return null;
  }
  const withoutParens = String(text).split("(")[0].trim();
  if (!withoutParens) {
    return null;
  }
  const match = withoutParens.match(
    /^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/
  );
  if (!match) {
    return null;
  }
  const amount = parseQuantity(match[1] || "1");
  const unit = normalizeServingUnit(match[2]);
  if (!amount || !unit) {
    return null;
  }
  return { amount, unit };
};

const normalizeUnit = (unit) => {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase()
    .replace("µg", "mcg");
  if (normalized === "ug") {
    return "mcg";
  }
  if (normalized === "kilojoules") {
    return "kj";
  }
  if (normalized === "kilocalories") {
    return "kcal";
  }
  return normalized;
};

const convertMass = (value, fromUnit, toUnit) => {
  if (value === null || value === undefined) {
    return null;
  }
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to || from === to) {
    return value;
  }
  const grams =
    from === "g"
      ? value
      : from === "kg"
        ? value * 1000
        : from === "mg"
          ? value / 1000
          : from === "mcg"
            ? value / 1_000_000
            : from === "oz"
              ? value * 28.349523125
              : from === "lb"
                ? value * 453.59237
                : value;
  if (to === "g") {
    return grams;
  }
  if (to === "kg") {
    return grams / 1000;
  }
  if (to === "mg") {
    return grams * 1000;
  }
  if (to === "mcg") {
    return grams * 1_000_000;
  }
  if (to === "oz") {
    return grams / 28.349523125;
  }
  if (to === "lb") {
    return grams / 453.59237;
  }
  return value;
};

const convertEnergy = (value, fromUnit, toUnit) => {
  if (value === null || value === undefined) {
    return null;
  }
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to || from === to) {
    return value;
  }
  if (from === "kj" && to === "kcal") {
    return value / 4.184;
  }
  if (from === "kcal" && to === "kj") {
    return value * 4.184;
  }
  return value;
};

const UNIT_SYSTEMS = {
  mass: {
    mcg: 1e-6,
    mg: 1e-3,
    g: 1,
    kg: 1000,
    oz: 28.349523125,
    lb: 453.59237,
  },
  volume: {
    ml: 1,
    l: 1000,
    "fl oz": 29.5735295625,
    tsp: 4.92892159375,
    tbsp: 14.78676478125,
    cup: 240,
  },
};

const getUnitInfo = (unit) => {
  const normalized = normalizeServingUnit(unit);
  if (!normalized) {
    return null;
  }
  if (UNIT_SYSTEMS.mass[normalized]) {
    return { system: "mass", factor: UNIT_SYSTEMS.mass[normalized], unit: normalized };
  }
  if (UNIT_SYSTEMS.volume[normalized]) {
    return {
      system: "volume",
      factor: UNIT_SYSTEMS.volume[normalized],
      unit: normalized,
    };
  }
  return null;
};

const getUnitMultiplier = (fromLabel, toLabel) => {
  if (!fromLabel || !toLabel) {
    return null;
  }
  const fromParsed = parseServingLabel(fromLabel);
  const toParsed = parseServingLabel(toLabel);
  if (!fromParsed || !toParsed) {
    const fromRaw = String(fromLabel).trim().toLowerCase();
    const toRaw = String(toLabel).trim().toLowerCase();
    return fromRaw && fromRaw === toRaw ? 1 : null;
  }
  if (fromParsed.unit === toParsed.unit) {
    return fromParsed.amount / toParsed.amount;
  }
  const fromInfo = getUnitInfo(fromParsed.unit);
  const toInfo = getUnitInfo(toParsed.unit);
  if (!fromInfo || !toInfo || fromInfo.system !== toInfo.system) {
    return null;
  }
  const fromBase = fromParsed.amount * fromInfo.factor;
  const toBase = toParsed.amount * toInfo.factor;
  if (!Number.isFinite(fromBase) || !Number.isFinite(toBase) || toBase === 0) {
    return null;
  }
  return fromBase / toBase;
};

module.exports = {
  normalizeServingUnit,
  parseQuantity,
  parseServingLabel,
  normalizeUnit,
  convertMass,
  convertEnergy,
  getUnitMultiplier,
};
