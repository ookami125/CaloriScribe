#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const {
  parseServingLabel,
  convertMass,
  convertEnergy,
} = require("../lib/units");

const args = process.argv.slice(2);
const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.REQUEST_TIMEOUT_MS || "",
  10
);
const REQUEST_TIMEOUT =
  Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0
    ? REQUEST_TIMEOUT_MS
    : 8000;

const showUsage = () => {
  console.log(
    [
      "Usage:",
      "  node scripts/lookup-barcode.js <barcode> [--provider <name>]",
      "",
      "Examples:",
      "  node scripts/lookup-barcode.js 012345678905",
      "  node scripts/lookup-barcode.js 012345678905 --provider usda",
      "",
      "Providers: auto, openfoodfacts, usda, nutritionix",
      "Uses .env for USDA/Nutritionix keys when present.",
    ].join("\n")
  );
};

const loadEnvFile = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!key) {
      return;
    }
    if (process.env[key] !== undefined) {
      return;
    }
    const rawValue = rest.join("=").trim();
    const unquoted = rawValue.replace(/^\"|\"$/g, "").replace(/^'|'$/g, "");
    process.env[key] = unquoted;
  });
};

const fetchJson = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const request = https.request(
      url,
      { method: "GET", headers },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!body) {
            resolve({ status: response.statusCode || 0, data: null });
            return;
          }
          try {
            resolve({ status: response.statusCode || 0, data: JSON.parse(body) });
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy(new Error("Request timed out"));
    });
    request.on("error", reject);
    request.end();
  });

const toOptionalNumber = (value) =>
  value === null || value === undefined || value === "" || Number.isNaN(value)
    ? null
    : Number(value);

const parseOptionalString = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
};

const TARGET_LANGUAGE = (process.env.TARGET_LANGUAGE || "en").toLowerCase();

const stripLanguagePrefix = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/^([a-z]{2,3}):(.+)$/i);
  return match ? match[2] : trimmed;
};

const humanizeTag = (value) => {
  const raw = stripLanguagePrefix(value);
  const cleaned = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  return cleaned.replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

const normalizeTagList = (input) => {
  if (!input) {
    return null;
  }
  const items = Array.isArray(input)
    ? input
    : String(input)
        .split(/[,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);
  const normalized = items.map(humanizeTag).filter(Boolean);
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique.join(", ") : null;
};

const resolveServingUnit = (servingLabel, fallback = "serving") => {
  const parsed = parseServingLabel(servingLabel);
  if (parsed && parsed.amount === 1 && parsed.unit) {
    return parsed.unit;
  }
  return fallback;
};

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const NUTRITIONIX_URL = "https://trackapi.nutritionix.com/v2/search/item";

const getOffNutrient = (nutriments, key, suffix, targetUnit, options = {}) => {
  if (!nutriments) {
    return null;
  }
  let value = null;
  const unitFromValue = nutriments[`${key}_unit`];
  if (options.useValue && nutriments[`${key}_value`] !== undefined) {
    value = toOptionalNumber(nutriments[`${key}_value`]);
    if (value !== null) {
      return targetUnit
        ? convertMass(value, unitFromValue || targetUnit, targetUnit)
        : value;
    }
  }
  value = toOptionalNumber(nutriments[`${key}${suffix}`]);
  if (value === null && suffix !== "_100g") {
    value = toOptionalNumber(nutriments[`${key}_100g`]);
  }
  if (value === null && suffix !== "_100ml") {
    value = toOptionalNumber(nutriments[`${key}_100ml`]);
  }
  if (value === null) {
    return null;
  }
  const unit = unitFromValue || targetUnit;
  return targetUnit ? convertMass(value, unit, targetUnit) : value;
};

const normalizeOpenFoodFacts = (barcode, product) => {
  const nutriments = product.nutriments || {};
  const basis = String(product.nutrition_data_per || "").toLowerCase();
  const perServing = basis === "serving";
  const suffix =
    basis === "100ml" ? "_100ml" : perServing ? "_serving" : "_100g";
  const energyKcal = toOptionalNumber(nutriments[`energy-kcal${suffix}`]);
  const energyKj = toOptionalNumber(nutriments[`energy${suffix}`]);
  const calories =
    energyKcal !== null
      ? energyKcal
      : convertEnergy(energyKj, nutriments.energy_unit || "kj", "kcal");

  const servingLabel = parseServingLabel(product.serving_size);
  const packagingUnits = new Set([
    "can",
    "bottle",
    "bar",
    "pack",
    "packet",
    "stick",
  ]);
  const servingsPerContainer = parseOptionalString(
    product.servings_per_container
  );
  const fallbackServingsPerContainer =
    !servingsPerContainer &&
    servingLabel &&
    Number.isFinite(servingLabel.amount) &&
    servingLabel.amount > 0 &&
    packagingUnits.has(servingLabel.unit)
      ? String(servingLabel.amount)
      : null;

  const ingredientsText =
    product[`ingredients_text_${TARGET_LANGUAGE}`] ||
    product.ingredients_text ||
    product.ingredients_text_en;
  const productName =
    product[`product_name_${TARGET_LANGUAGE}`] ||
    product.product_name ||
    product.product_name_en ||
    product.abbreviated_product_name ||
    product.generic_name ||
    "";

  const ingredient = {
    barcode,
    name: productName,
    unit: perServing
      ? resolveServingUnit(product.serving_size)
      : basis === "100ml"
        ? "100ml"
        : "100g",
    servingSize: parseOptionalString(product.serving_size),
    servingsPerContainer: servingsPerContainer || fallbackServingsPerContainer,
    calories: toOptionalNumber(calories),
    fat: getOffNutrient(nutriments, "fat", suffix, "g", {
      useValue: perServing,
    }),
    saturatedFat: getOffNutrient(nutriments, "saturated-fat", suffix, "g", {
      useValue: perServing,
    }),
    transFat: getOffNutrient(nutriments, "trans-fat", suffix, "g", {
      useValue: perServing,
    }),
    cholesterolMg: getOffNutrient(nutriments, "cholesterol", suffix, "mg", {
      useValue: perServing,
    }),
    sodiumMg: getOffNutrient(nutriments, "sodium", suffix, "mg", {
      useValue: perServing,
    }),
    carbs: getOffNutrient(nutriments, "carbohydrates", suffix, "g", {
      useValue: perServing,
    }),
    dietaryFiber: getOffNutrient(nutriments, "fiber", suffix, "g", {
      useValue: perServing,
    }),
    totalSugars: getOffNutrient(nutriments, "sugars", suffix, "g", {
      useValue: perServing,
    }),
    addedSugars: getOffNutrient(nutriments, "added-sugars", suffix, "g", {
      useValue: perServing,
    }),
    protein: getOffNutrient(nutriments, "proteins", suffix, "g", {
      useValue: perServing,
    }),
    vitaminDMcg: getOffNutrient(nutriments, "vitamin-d", suffix, "mcg", {
      useValue: perServing,
    }),
    calciumMg: getOffNutrient(nutriments, "calcium", suffix, "mg", {
      useValue: perServing,
    }),
    ironMg: getOffNutrient(nutriments, "iron", suffix, "mg", {
      useValue: perServing,
    }),
    potassiumMg: getOffNutrient(nutriments, "potassium", suffix, "mg", {
      useValue: perServing,
    }),
    ingredientsList: parseOptionalString(ingredientsText),
    allergens: normalizeTagList(
      product.allergens_tags ||
        product.allergens ||
        product.allergens_from_ingredients
    ),
    vitamins: normalizeTagList(product.vitamins_tags || product.vitamins),
  };

  return {
    source: "openfoodfacts",
    ingredient,
  };
};

const getUsdaNutrient = (nutrients, names, targetUnit) => {
  if (!Array.isArray(nutrients)) {
    return null;
  }
  const entry = nutrients.find((nutrient) =>
    names.includes(nutrient.nutrientName)
  );
  if (!entry) {
    return null;
  }
  const value = toOptionalNumber(entry.value);
  if (value === null) {
    return null;
  }
  if (!targetUnit) {
    return value;
  }
  if (targetUnit === "kcal" || targetUnit === "kj") {
    return convertEnergy(value, entry.unitName, targetUnit);
  }
  return convertMass(value, entry.unitName, targetUnit);
};

const normalizeUsda = (barcode, food) => {
  const servingSizeValue = toOptionalNumber(food.servingSize);
  const servingSizeUnit = parseOptionalString(food.servingSizeUnit);
  const servingSize =
    servingSizeValue && servingSizeUnit
      ? `${servingSizeValue} ${servingSizeUnit}`
      : parseOptionalString(food.householdServingFullText);

  const servingLabel =
    servingSizeValue && servingSizeUnit
      ? `${servingSizeValue} ${servingSizeUnit}`
      : servingSize;

  const ingredient = {
    barcode,
    name: food.description || "",
    unit: resolveServingUnit(servingLabel),
    servingSize,
    servingsPerContainer: parseOptionalString(food.servingsPerContainer),
    calories: getUsdaNutrient(food.foodNutrients, ["Energy"], "kcal"),
    fat: getUsdaNutrient(food.foodNutrients, ["Total lipid (fat)"], "g"),
    saturatedFat: getUsdaNutrient(food.foodNutrients, ["Saturated fat"], "g"),
    transFat: getUsdaNutrient(food.foodNutrients, ["Trans fat"], "g"),
    cholesterolMg: getUsdaNutrient(food.foodNutrients, ["Cholesterol"], "mg"),
    sodiumMg: getUsdaNutrient(food.foodNutrients, ["Sodium, Na"], "mg"),
    carbs: getUsdaNutrient(
      food.foodNutrients,
      ["Carbohydrate, by difference"],
      "g"
    ),
    dietaryFiber: getUsdaNutrient(
      food.foodNutrients,
      ["Fiber, total dietary"],
      "g"
    ),
    totalSugars: getUsdaNutrient(
      food.foodNutrients,
      ["Sugars, total including NLEA"],
      "g"
    ),
    addedSugars: getUsdaNutrient(
      food.foodNutrients,
      ["Added Sugars"],
      "g"
    ),
    protein: getUsdaNutrient(food.foodNutrients, ["Protein"], "g"),
    vitaminDMcg: getUsdaNutrient(
      food.foodNutrients,
      ["Vitamin D (D2 + D3)", "Vitamin D"],
      "mcg"
    ),
    calciumMg: getUsdaNutrient(food.foodNutrients, ["Calcium, Ca"], "mg"),
    ironMg: getUsdaNutrient(food.foodNutrients, ["Iron, Fe"], "mg"),
    potassiumMg: getUsdaNutrient(food.foodNutrients, ["Potassium, K"], "mg"),
    ingredientsList: parseOptionalString(food.ingredients),
    allergens: null,
    vitamins: null,
  };

  return {
    source: "usda",
    ingredient,
  };
};

const normalizeNutritionix = (barcode, food) => {
  const servingLabel =
    food.serving_qty && food.serving_unit
      ? `${food.serving_qty} ${food.serving_unit}`
      : null;
  const ingredient = {
    barcode,
    name: food.food_name || "",
    unit: resolveServingUnit(servingLabel),
    servingSize: food.serving_qty
      ? `${food.serving_qty} ${food.serving_unit || ""}`.trim()
      : null,
    servingsPerContainer: food.nf_servings_per_container
      ? String(food.nf_servings_per_container)
      : null,
    calories: toOptionalNumber(food.nf_calories),
    fat: toOptionalNumber(food.nf_total_fat),
    saturatedFat: toOptionalNumber(food.nf_saturated_fat),
    transFat: toOptionalNumber(food.nf_trans_fatty_acid),
    cholesterolMg: toOptionalNumber(food.nf_cholesterol),
    sodiumMg: toOptionalNumber(food.nf_sodium),
    carbs: toOptionalNumber(food.nf_total_carbohydrate),
    dietaryFiber: toOptionalNumber(food.nf_dietary_fiber),
    totalSugars: toOptionalNumber(food.nf_sugars),
    addedSugars: toOptionalNumber(food.nf_added_sugars),
    protein: toOptionalNumber(food.nf_protein),
    vitaminDMcg: toOptionalNumber(food.nf_vitamin_d_mcg),
    calciumMg: toOptionalNumber(food.nf_calcium_mg),
    ironMg: toOptionalNumber(food.nf_iron_mg),
    potassiumMg: toOptionalNumber(food.nf_potassium_mg),
    ingredientsList: parseOptionalString(food.nf_ingredient_statement),
    allergens: null,
    vitamins: null,
  };

  return {
    source: "nutritionix",
    ingredient,
  };
};

const lookupOpenFoodFacts = async (barcode) => {
  const url = new URL(
    `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json`
  );
  url.searchParams.set("lc", TARGET_LANGUAGE);
  const { status, data } = await fetchJson(url.toString());
  if (status !== 200 || !data || data.status !== 1 || !data.product) {
    return null;
  }
  return normalizeOpenFoodFacts(barcode, data.product);
};

const lookupUsda = async (barcode) => {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return null;
  }
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set("query", barcode);
  url.searchParams.set("pageSize", "5");
  url.searchParams.set("dataType", "Branded");
  url.searchParams.set("api_key", apiKey);
  const { status, data } = await fetchJson(url.toString());
  if (status !== 200 || !data || !Array.isArray(data.foods)) {
    return null;
  }
  const match =
    data.foods.find((food) => food.gtinUpc === barcode) || data.foods[0];
  if (!match) {
    return null;
  }
  return normalizeUsda(barcode, match);
};

const lookupNutritionix = async (barcode) => {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_APP_KEY;
  if (!appId || !appKey) {
    return null;
  }
  const url = `${NUTRITIONIX_URL}?upc=${encodeURIComponent(barcode)}`;
  const { status, data } = await fetchJson(url, {
    "x-app-id": appId,
    "x-app-key": appKey,
  });
  if (status !== 200 || !data || !Array.isArray(data.foods)) {
    return null;
  }
  if (!data.foods.length) {
    return null;
  }
  return normalizeNutritionix(barcode, data.foods[0]);
};

const lookupBarcode = async (barcode, provider) => {
  const availableProviders = {
    openfoodfacts: true,
    usda: Boolean(process.env.USDA_API_KEY),
    nutritionix: Boolean(
      process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY
    ),
  };

  if (provider !== "auto" && !availableProviders[provider]) {
    throw new Error(`Provider ${provider} is not configured.`);
  }

  const providerQueue =
    provider === "auto"
      ? [
          ...(availableProviders.nutritionix ? ["nutritionix"] : []),
          ...(availableProviders.usda ? ["usda"] : []),
          "openfoodfacts",
        ]
      : [provider];

  let lastError = null;
  for (const nextProvider of providerQueue) {
    try {
      if (nextProvider === "nutritionix") {
        const result = await lookupNutritionix(barcode);
        if (result) {
          return result;
        }
      }
      if (nextProvider === "usda") {
        const result = await lookupUsda(barcode);
        if (result) {
          return result;
        }
      }
      if (nextProvider === "openfoodfacts") {
        const result = await lookupOpenFoodFacts(barcode);
        if (result) {
          return result;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
};

if (!args.length || args.includes("--help") || args.includes("-h")) {
  showUsage();
  process.exit(args.length ? 0 : 1);
}

const barcode = args[0];
let provider = "auto";

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  if ((arg === "--provider" || arg === "-p") && args[i + 1]) {
    provider = args[i + 1];
    i += 1;
  }
}

loadEnvFile();

lookupBarcode(barcode, provider)
  .then((result) => {
    if (!result) {
      console.error("No product found for that barcode.");
      process.exit(1);
    }
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Lookup failed:", error.message || error);
    process.exit(1);
  });
