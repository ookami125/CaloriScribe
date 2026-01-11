const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { verifyPassword } = require("./lib/auth");
const {
  parseServingLabel,
  convertMass,
  convertEnergy,
  getUnitMultiplier,
} = require("./lib/units");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const attachUser = asyncHandler(async (req, res, next) => {
  const token = getSessionToken(req);
  if (!token) {
    return next();
  }
  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  if (session) {
    req.user = session.user;
    req.session = session;
  }
  return next();
});

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  return next();
};

app.use(attachUser);

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalString = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
};

const normalizeNameKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isBlank = (value) => value === null || value === undefined || value === "";

const findInvalidNumberField = (payload, fields) => {
  for (const field of fields) {
    const value = payload[field];
    if (isBlank(value)) {
      continue;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return field;
    }
  }
  return null;
};

const parsePositiveInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const buildIngredientPayload = (ingredient, userId) => {
  const name = String(ingredient?.name || "").trim();
  const unit = String(ingredient?.unit || "").trim();
  if (!name || !unit) {
    return null;
  }
  return {
    name,
    barcode: parseOptionalString(ingredient?.barcode),
    calories: parseNumber(ingredient?.calories),
    protein: parseNumber(ingredient?.protein),
    carbs: parseNumber(ingredient?.carbs),
    fat: parseNumber(ingredient?.fat),
    unit,
    servingSize: parseOptionalString(ingredient?.servingSize),
    servingsPerContainer: parseOptionalString(ingredient?.servingsPerContainer),
    saturatedFat: parseOptionalNumber(ingredient?.saturatedFat),
    transFat: parseOptionalNumber(ingredient?.transFat),
    cholesterolMg: parseOptionalNumber(ingredient?.cholesterolMg),
    sodiumMg: parseOptionalNumber(ingredient?.sodiumMg),
    dietaryFiber: parseOptionalNumber(ingredient?.dietaryFiber),
    totalSugars: parseOptionalNumber(ingredient?.totalSugars),
    addedSugars: parseOptionalNumber(ingredient?.addedSugars),
    vitaminDMcg: parseOptionalNumber(ingredient?.vitaminDMcg),
    calciumMg: parseOptionalNumber(ingredient?.calciumMg),
    ironMg: parseOptionalNumber(ingredient?.ironMg),
    potassiumMg: parseOptionalNumber(ingredient?.potassiumMg),
    ingredientsList: parseOptionalString(ingredient?.ingredientsList),
    vitamins: parseOptionalString(ingredient?.vitamins),
    allergens: parseOptionalString(ingredient?.allergens),
    userId,
  };
};

const TARGET_LANGUAGE = (process.env.TARGET_LANGUAGE || "en").toLowerCase();
const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.REQUEST_TIMEOUT_MS || "",
  10
);
const REQUEST_TIMEOUT =
  Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0
    ? REQUEST_TIMEOUT_MS
    : 8000;
const BARCODE_CACHE_TTL_MS = Number.parseInt(
  process.env.BARCODE_CACHE_TTL_MS || "",
  10
);
const BARCODE_CACHE_TTL =
  Number.isFinite(BARCODE_CACHE_TTL_MS) && BARCODE_CACHE_TTL_MS > 0
    ? BARCODE_CACHE_TTL_MS
    : 6 * 60 * 60 * 1000;
const barcodeLookupCache = new Map();
const SESSION_COOKIE_NAME = "nutrition_session";
const SESSION_TTL_DAYS = Number.parseInt(
  process.env.SESSION_TTL_DAYS || "",
  10
);
const SESSION_TTL_MS =
  Number.isFinite(SESSION_TTL_DAYS) && SESSION_TTL_DAYS > 0
    ? SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;

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

const parseCookies = (header) => {
  const cookies = {};
  if (!header) {
    return cookies;
  }
  header.split(";").forEach((pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey) {
      return;
    }
    cookies[rawKey] = decodeURIComponent(rest.join("="));
  });
  return cookies;
};

const getSessionToken = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[SESSION_COOKIE_NAME] || "";
};

const buildSessionCookie = (token, options = {}) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const getBarcodeCacheKey = (barcode, provider) => `${provider}:${barcode}`;

const readBarcodeCache = (key) => {
  const cached = barcodeLookupCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    barcodeLookupCache.delete(key);
    return null;
  }
  return cached.payload;
};

const writeBarcodeCache = (key, payload) => {
  barcodeLookupCache.set(key, {
    expiresAt: Date.now() + BARCODE_CACHE_TTL,
    payload,
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

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const NUTRITIONIX_URL = "https://trackapi.nutritionix.com/v2/search/item";

const toOptionalNumber = (value) =>
  value === null || value === undefined || value === "" || Number.isNaN(value)
    ? null
    : Number(value);

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

const parseDate = (value) => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const parseDateRange = (value) => {
  if (!value) {
    return null;
  }
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { start, end };
};

const normalizeIngredientQuantity = (ingredient, quantity, unit) => {
  if (!ingredient) {
    return { quantity, unit: unit || "" };
  }
  const entryUnit = unit || ingredient.unit;
  const ingredientUnit = ingredient.unit;
  if (!entryUnit || !ingredientUnit) {
    return { quantity, unit: entryUnit || ingredientUnit || "" };
  }
  const multiplier = getUnitMultiplier(entryUnit, ingredientUnit);
  if (multiplier === null || !Number.isFinite(multiplier)) {
    return {
      quantity,
      unit: entryUnit,
      error: `Unit ${entryUnit} is not compatible with ${ingredientUnit}.`,
    };
  }
  return { quantity: quantity * multiplier, unit: ingredientUnit };
};

const normalizeRecipeQuantity = (quantity, unit) => {
  const entryUnit = unit || "serving";
  const multiplier = getUnitMultiplier(entryUnit, "serving");
  if (multiplier === null || !Number.isFinite(multiplier)) {
    return {
      quantity,
      unit: entryUnit,
      error: `Unit ${entryUnit} is not compatible with serving.`,
    };
  }
  return { quantity: quantity * multiplier, unit: "serving" };
};

const computeIngredientTotals = (ingredient, quantity, unit) => {
  const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
  const normalizedQuantity = normalized.error ? quantity : normalized.quantity;
  return {
    calories: ingredient.calories * normalizedQuantity,
    protein: ingredient.protein * normalizedQuantity,
    carbs: ingredient.carbs * normalizedQuantity,
    fat: ingredient.fat * normalizedQuantity,
  };
};

const computeRecipeTotals = (recipe) => {
  const totals = recipe.items.reduce(
    (acc, item) => {
      const normalized = normalizeIngredientQuantity(
        item.ingredient,
        item.quantity,
        item.unit
      );
      const normalizedQuantity = normalized.error
        ? item.quantity
        : normalized.quantity;
      acc.calories += item.ingredient.calories * normalizedQuantity;
      acc.protein += item.ingredient.protein * normalizedQuantity;
      acc.carbs += item.ingredient.carbs * normalizedQuantity;
      acc.fat += item.ingredient.fat * normalizedQuantity;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  const perServing = {
    calories: totals.calories / servings,
    protein: totals.protein / servings,
    carbs: totals.carbs / servings,
    fat: totals.fat / servings,
  };

  return { totals, perServing };
};

const formatRecipe = (recipe) => {
  const nutrition = computeRecipeTotals(recipe);
  return {
    ...recipe,
    nutrition,
  };
};

const formatLogEntry = (entry) => {
  let nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let label = "";
  let entryUnit = entry.unit;

  if (entry.ingredient) {
    nutrition = computeIngredientTotals(
      entry.ingredient,
      entry.quantity,
      entry.unit || entry.ingredient.unit
    );
    label = entry.ingredient.name;
    entryUnit = entry.unit || entry.ingredient.unit;
  }

  if (entry.recipe) {
    const recipeNutrition = computeRecipeTotals(entry.recipe);
    const normalized = normalizeRecipeQuantity(entry.quantity, entry.unit);
    const servingQuantity = normalized.error
      ? entry.quantity
      : normalized.quantity;
    nutrition = {
      calories: recipeNutrition.perServing.calories * servingQuantity,
      protein: recipeNutrition.perServing.protein * servingQuantity,
      carbs: recipeNutrition.perServing.carbs * servingQuantity,
      fat: recipeNutrition.perServing.fat * servingQuantity,
    };
    label = entry.recipe.name;
    entryUnit = entry.unit || "serving";
  }

  return {
    ...entry,
    unit: entryUnit,
    label,
    nutrition,
  };
};

app.post(
  "/api/login",
  asyncHandler(async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.create({
      data: {
        token,
        expiresAt,
        userId: user.id,
      },
    });
    const secure = req.secure || process.env.HTTPS === "true";
    res.setHeader(
      "Set-Cookie",
      buildSessionCookie(token, {
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
        secure,
      })
    );
    return res.json({ username: user.username });
  })
);

app.post(
  "/api/logout",
  asyncHandler(async (req, res) => {
    const token = getSessionToken(req);
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    const secure = req.secure || process.env.HTTPS === "true";
    res.setHeader(
      "Set-Cookie",
      buildSessionCookie("", { maxAge: 0, secure })
    );
    return res.status(204).end();
  })
);

app.get(
  "/api/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ username: req.user.username });
  })
);

app.get(
  "/api/export",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [ingredients, recipes, logs, targets] = await Promise.all([
      prisma.ingredient.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.recipe.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        include: {
          items: {
            include: { ingredient: true },
          },
        },
      }),
      prisma.logEntry.findMany({
        where: { userId },
        orderBy: { consumedAt: "desc" },
        include: {
          ingredient: true,
          recipe: {
            include: {
              items: {
                include: { ingredient: true },
              },
            },
          },
        },
      }),
      prisma.dailyTarget.findUnique({
        where: { userId },
      }),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      user: {
        username: req.user.username,
        createdAt: req.user.createdAt,
      },
      targets,
      ingredients,
      recipes,
      logs,
    });
  })
);

app.post(
  "/api/import",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload =
      req.body && Array.isArray(req.body.ingredients)
        ? req.body
        : req.body?.data;
    if (!payload) {
      return res.status(400).json({ error: "Invalid import payload." });
    }
    const mode = String(req.body?.mode || "merge").toLowerCase();
    if (!["merge", "replace"].includes(mode)) {
      return res.status(400).json({ error: "Unknown import mode." });
    }

    const ingredients = Array.isArray(payload.ingredients)
      ? payload.ingredients
      : [];
    const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const targets = payload.targets || null;

    const summary = {
      ingredients: { created: 0, reused: 0, skipped: 0 },
      recipes: { created: 0, skipped: 0 },
      logs: { created: 0, skipped: 0 },
      targets: targets ? "updated" : "skipped",
    };

    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.logEntry.deleteMany({ where: { userId: req.user.id } });
        await tx.recipeIngredient.deleteMany({
          where: { recipe: { userId: req.user.id } },
        });
        await tx.recipe.deleteMany({ where: { userId: req.user.id } });
        await tx.ingredient.deleteMany({ where: { userId: req.user.id } });
        await tx.dailyTarget.deleteMany({ where: { userId: req.user.id } });
      }

      const existingIngredients = await tx.ingredient.findMany({
        where: { userId: req.user.id, deletedAt: null },
        select: { id: true, barcode: true, name: true, unit: true },
      });
      const ingredientById = new Map(
        existingIngredients.map((item) => [item.id, item])
      );
      const existingByBarcode = new Map();
      const existingByName = new Map();
      existingIngredients.forEach((item) => {
        if (item.barcode) {
          existingByBarcode.set(item.barcode, item);
        }
        const nameKey = normalizeNameKey(item.name);
        if (nameKey) {
          existingByName.set(nameKey, item);
        }
      });

      const createdByBarcode = new Map();
      const createdByName = new Map();
      const ingredientIdMap = new Map();

      for (const ingredient of ingredients) {
        const originalId = ingredient?.id;
        const barcode = parseOptionalString(ingredient?.barcode);
        const nameKey = normalizeNameKey(ingredient?.name);
        let matched =
          (barcode && (existingByBarcode.get(barcode) || createdByBarcode.get(barcode))) ||
          (nameKey && (existingByName.get(nameKey) || createdByName.get(nameKey)));

        if (matched) {
          ingredientIdMap.set(originalId, matched.id);
          summary.ingredients.reused += 1;
          continue;
        }

        const data = buildIngredientPayload(ingredient, req.user.id);
        if (!data) {
          summary.ingredients.skipped += 1;
          continue;
        }

        const created = await tx.ingredient.create({ data });
        ingredientIdMap.set(originalId, created.id);
        ingredientById.set(created.id, created);
        summary.ingredients.created += 1;
        if (created.barcode) {
          createdByBarcode.set(created.barcode, created);
        }
        const createdNameKey = normalizeNameKey(created.name);
        if (createdNameKey) {
          createdByName.set(createdNameKey, created);
        }
      }

      const recipeIdMap = new Map();
      for (const recipe of recipes) {
        const name = String(recipe?.name || "").trim();
        if (!name) {
          summary.recipes.skipped += 1;
          continue;
        }
        const items = Array.isArray(recipe?.items) ? recipe.items : [];
        const mappedItems = [];

        for (const item of items) {
          const mappedIngredientId = ingredientIdMap.get(item?.ingredientId);
          if (!mappedIngredientId) {
            continue;
          }
          const ingredient = ingredientById.get(mappedIngredientId);
          const unit = String(item?.unit || "").trim() || ingredient?.unit || "";
          const quantity = parseNumber(item?.quantity, 1);
          if (!unit) {
            continue;
          }
          const normalized = normalizeIngredientQuantity(
            ingredient,
            quantity,
            unit
          );
          if (normalized.error) {
            continue;
          }
          mappedItems.push({
            ingredientId: mappedIngredientId,
            quantity,
            unit,
          });
        }

        if (!mappedItems.length) {
          summary.recipes.skipped += 1;
          continue;
        }

        const servings = parseNumber(recipe?.servings, 1);
        const created = await tx.recipe.create({
          data: {
            name,
            notes: parseOptionalString(recipe?.notes),
            servings: servings > 0 ? Math.round(servings) : 1,
            userId: req.user.id,
            items: {
              create: mappedItems,
            },
          },
        });
        recipeIdMap.set(recipe?.id, created.id);
        summary.recipes.created += 1;
      }

      for (const entry of logs) {
        const mappedIngredientId = entry?.ingredientId
          ? ingredientIdMap.get(entry.ingredientId)
          : null;
        const mappedRecipeId = entry?.recipeId
          ? recipeIdMap.get(entry.recipeId)
          : null;
        if ((mappedIngredientId && mappedRecipeId) || (!mappedIngredientId && !mappedRecipeId)) {
          summary.logs.skipped += 1;
          continue;
        }
        const quantity = parseNumber(entry?.quantity, 1);
        const consumedAt = parseDate(entry?.consumedAt);
        let unit = String(entry?.unit || "").trim();

        if (mappedIngredientId) {
          const ingredient = ingredientById.get(mappedIngredientId);
          if (!unit) {
            unit = ingredient?.unit || "";
          }
          const normalized = normalizeIngredientQuantity(
            ingredient,
            quantity,
            unit
          );
          if (normalized.error) {
            summary.logs.skipped += 1;
            continue;
          }
        }

        if (mappedRecipeId) {
          if (!unit) {
            unit = "serving";
          }
          const normalized = normalizeRecipeQuantity(quantity, unit);
          if (normalized.error) {
            summary.logs.skipped += 1;
            continue;
          }
        }

        await tx.logEntry.create({
          data: {
            ingredientId: mappedIngredientId,
            recipeId: mappedRecipeId,
            quantity,
            unit,
            notes: parseOptionalString(entry?.notes),
            consumedAt,
            userId: req.user.id,
          },
        });
        summary.logs.created += 1;
      }

      if (targets) {
        const data = {
          calories: parseOptionalNumber(targets?.calories),
          protein: parseOptionalNumber(targets?.protein),
          carbs: parseOptionalNumber(targets?.carbs),
          fat: parseOptionalNumber(targets?.fat),
        };
        await tx.dailyTarget.upsert({
          where: { userId: req.user.id },
          update: data,
          create: { ...data, userId: req.user.id },
        });
      }
    });

    res.json(summary);
  })
);

app.use("/api", requireAuth);

app.get("/login", (req, res) => res.redirect("/login.html"));

app.use((req, res, next) => {
  const isHtmlRequest = req.path === "/" || req.path.endsWith(".html");
  if (!isHtmlRequest) {
    return next();
  }
  const isLoginPage = req.path === "/login.html" || req.path === "/login";
  if (req.user) {
    if (isLoginPage) {
      return res.redirect("/index.html");
    }
    return next();
  }
  if (isLoginPage) {
    return next();
  }
  return res.redirect("/login.html");
});

app.use(express.static("public"));

const buildRecipeItems = async (items, userId) => {
  const ingredientIds = items
    .map((item) => Number(item.ingredientId))
    .filter((id) => Number.isFinite(id));
  const uniqueIngredientIds = Array.from(new Set(ingredientIds));
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: uniqueIngredientIds }, userId, deletedAt: null },
  });
  if (ingredients.length !== uniqueIngredientIds.length) {
    return { error: "Ingredient not found." };
  }
  const ingredientMap = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient])
  );
  const payloadItems = [];

  for (const item of items) {
    const ingredientId = Number(item.ingredientId);
    if (!Number.isFinite(ingredientId)) {
      return { error: "Select a valid ingredient." };
    }
    const ingredient = ingredientMap.get(ingredientId);
    if (!ingredient) {
      return { error: "Ingredient not found." };
    }
    if (!isBlank(item.quantity) && !Number.isFinite(Number(item.quantity))) {
      return { error: "Item quantity must be a number." };
    }
    const quantity = parseNumber(item.quantity, 1);
    const unit = String(item.unit || "").trim() || ingredient.unit;
    const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
    if (normalized.error) {
      return { error: `${normalized.error} (${ingredient.name}).` };
    }
    payloadItems.push({
      ingredientId,
      quantity,
      unit,
    });
  }

  return { payloadItems };
};

app.get(
  "/api/ingredients",
  asyncHandler(async (req, res) => {
    const { barcode, search } = req.query;
    const where = { userId: req.user.id, deletedAt: null };
    if (barcode) {
      where.barcode = String(barcode);
    }
    if (search) {
      where.name = { contains: String(search), mode: "insensitive" };
    }
    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(ingredients);
  })
);

app.get(
  "/api/barcode-lookup",
  asyncHandler(async (req, res) => {
    const barcode = String(req.query.barcode || "").trim();
    const provider = String(req.query.provider || "auto")
      .trim()
      .toLowerCase();

    if (!barcode) {
      return res.status(400).json({ error: "Barcode is required." });
    }

    const allowedProviders = ["auto", "openfoodfacts", "usda", "nutritionix"];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: "Unknown provider." });
    }

    const existing = await prisma.ingredient.findFirst({
      where: { barcode, userId: req.user.id, deletedAt: null },
    });
    if (existing) {
      return res.json({ source: "local", ingredient: existing });
    }

    const cacheKey = getBarcodeCacheKey(barcode, provider);
    const cached = readBarcodeCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const availableProviders = {
      openfoodfacts: true,
      usda: Boolean(process.env.USDA_API_KEY),
      nutritionix: Boolean(
        process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY
      ),
    };

    if (provider !== "auto" && !availableProviders[provider]) {
      return res
        .status(400)
        .json({ error: `Provider ${provider} is not configured.` });
    }

    const providerQueue =
      provider === "auto"
        ? [
            ...(availableProviders.nutritionix ? ["nutritionix"] : []),
            ...(availableProviders.usda ? ["usda"] : []),
            "openfoodfacts",
          ]
        : [provider];

    const cacheResult = (result) => {
      writeBarcodeCache(cacheKey, result);
      if (provider === "auto") {
        writeBarcodeCache(getBarcodeCacheKey(barcode, result.source), result);
      }
    };

    let lastError = null;
    for (const nextProvider of providerQueue) {
      try {
        if (nextProvider === "nutritionix") {
          const result = await lookupNutritionix(barcode);
          if (result) {
            cacheResult(result);
            return res.json(result);
          }
        }
        if (nextProvider === "usda") {
          const result = await lookupUsda(barcode);
          if (result) {
            cacheResult(result);
            return res.json(result);
          }
        }
        if (nextProvider === "openfoodfacts") {
          const result = await lookupOpenFoodFacts(barcode);
          if (result) {
            cacheResult(result);
            return res.json(result);
          }
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      return res.status(502).json({ error: "Lookup failed. Try again." });
    }

    return res.status(404).json({ error: "No product found for that barcode." });
  })
);

app.post(
  "/api/ingredients",
  asyncHandler(async (req, res) => {
    const invalidField = findInvalidNumberField(req.body, [
      "calories",
      "protein",
      "carbs",
      "fat",
      "saturatedFat",
      "transFat",
      "cholesterolMg",
      "sodiumMg",
      "dietaryFiber",
      "totalSugars",
      "addedSugars",
      "vitaminDMcg",
      "calciumMg",
      "ironMg",
      "potassiumMg",
    ]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }
    const data = {
      name: String(req.body.name || "").trim(),
      barcode: parseOptionalString(req.body.barcode),
      calories: parseNumber(req.body.calories),
      protein: parseNumber(req.body.protein),
      carbs: parseNumber(req.body.carbs),
      fat: parseNumber(req.body.fat),
      unit: String(req.body.unit || "").trim(),
      servingSize: parseOptionalString(req.body.servingSize),
      servingsPerContainer: parseOptionalString(req.body.servingsPerContainer),
      saturatedFat: parseOptionalNumber(req.body.saturatedFat),
      transFat: parseOptionalNumber(req.body.transFat),
      cholesterolMg: parseOptionalNumber(req.body.cholesterolMg),
      sodiumMg: parseOptionalNumber(req.body.sodiumMg),
      dietaryFiber: parseOptionalNumber(req.body.dietaryFiber),
      totalSugars: parseOptionalNumber(req.body.totalSugars),
      addedSugars: parseOptionalNumber(req.body.addedSugars),
      vitaminDMcg: parseOptionalNumber(req.body.vitaminDMcg),
      calciumMg: parseOptionalNumber(req.body.calciumMg),
      ironMg: parseOptionalNumber(req.body.ironMg),
      potassiumMg: parseOptionalNumber(req.body.potassiumMg),
      ingredientsList: parseOptionalString(req.body.ingredientsList),
      vitamins: parseOptionalString(req.body.vitamins),
      allergens: parseOptionalString(req.body.allergens),
      userId: req.user.id,
    };

    if (!data.name) {
      return res.status(400).json({ error: "Ingredient name is required." });
    }

    if (!data.unit) {
      return res.status(400).json({ error: "Ingredient unit is required." });
    }

    const ingredient = await prisma.ingredient.create({ data });
    res.status(201).json(ingredient);
  })
);

app.put(
  "/api/ingredients/:id",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    if (!Number.isFinite(ingredientId)) {
      return res.status(400).json({ error: "Invalid ingredient id." });
    }
    const invalidField = findInvalidNumberField(req.body, [
      "calories",
      "protein",
      "carbs",
      "fat",
      "saturatedFat",
      "transFat",
      "cholesterolMg",
      "sodiumMg",
      "dietaryFiber",
      "totalSugars",
      "addedSugars",
      "vitaminDMcg",
      "calciumMg",
      "ironMg",
      "potassiumMg",
    ]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }
    const existing = await prisma.ingredient.findFirst({
      where: { id: ingredientId, userId: req.user.id, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ error: "Ingredient not found." });
    }
    const data = {
      name: String(req.body.name || "").trim(),
      barcode: parseOptionalString(req.body.barcode),
      calories: parseNumber(req.body.calories),
      protein: parseNumber(req.body.protein),
      carbs: parseNumber(req.body.carbs),
      fat: parseNumber(req.body.fat),
      unit: String(req.body.unit || "").trim(),
      servingSize: parseOptionalString(req.body.servingSize),
      servingsPerContainer: parseOptionalString(req.body.servingsPerContainer),
      saturatedFat: parseOptionalNumber(req.body.saturatedFat),
      transFat: parseOptionalNumber(req.body.transFat),
      cholesterolMg: parseOptionalNumber(req.body.cholesterolMg),
      sodiumMg: parseOptionalNumber(req.body.sodiumMg),
      dietaryFiber: parseOptionalNumber(req.body.dietaryFiber),
      totalSugars: parseOptionalNumber(req.body.totalSugars),
      addedSugars: parseOptionalNumber(req.body.addedSugars),
      vitaminDMcg: parseOptionalNumber(req.body.vitaminDMcg),
      calciumMg: parseOptionalNumber(req.body.calciumMg),
      ironMg: parseOptionalNumber(req.body.ironMg),
      potassiumMg: parseOptionalNumber(req.body.potassiumMg),
      ingredientsList: parseOptionalString(req.body.ingredientsList),
      vitamins: parseOptionalString(req.body.vitamins),
      allergens: parseOptionalString(req.body.allergens),
    };

    if (!data.name || !data.unit) {
      return res.status(400).json({ error: "Name and unit are required." });
    }

    const ingredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data,
    });
    res.json(ingredient);
  })
);

app.delete(
  "/api/ingredients/:id",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    if (!Number.isFinite(ingredientId)) {
      return res.status(400).json({ error: "Invalid ingredient id." });
    }
    const result = await prisma.ingredient.updateMany({
      where: { id: ingredientId, userId: req.user.id, deletedAt: null },
      data: { deletedAt: new Date(), barcode: null },
    });
    if (!result.count) {
      return res.status(404).json({ error: "Ingredient not found." });
    }
    res.status(204).end();
  })
);

app.get(
  "/api/recipes",
  asyncHandler(async (req, res) => {
    const recipes = await prisma.recipe.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        items: {
          include: { ingredient: true },
        },
      },
    });
    res.json(recipes.map(formatRecipe));
  })
);

app.post(
  "/api/recipes",
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const name = String(req.body.name || "").trim();
    const servings = parseNumber(req.body.servings, 1);
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    const invalidField = findInvalidNumberField(req.body, ["servings"]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }

    if (!name) {
      return res.status(400).json({ error: "Recipe name is required." });
    }

    if (!items.length) {
      return res
        .status(400)
        .json({ error: "Add at least one ingredient item." });
    }

    const { payloadItems, error } = await buildRecipeItems(items, req.user.id);
    if (error) {
      return res.status(400).json({ error });
    }

    const recipe = await prisma.recipe.create({
      data: {
        name,
        notes,
        servings: servings > 0 ? Math.round(servings) : 1,
        userId: req.user.id,
        items: {
          create: payloadItems,
        },
      },
      include: {
        items: {
          include: { ingredient: true },
        },
      },
    });

    res.status(201).json(formatRecipe(recipe));
  })
);

app.put(
  "/api/recipes/:id",
  asyncHandler(async (req, res) => {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) {
      return res.status(400).json({ error: "Invalid recipe id." });
    }
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const name = String(req.body.name || "").trim();
    const servings = parseNumber(req.body.servings, 1);
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    const invalidField = findInvalidNumberField(req.body, ["servings"]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }

    if (!name) {
      return res.status(400).json({ error: "Recipe name is required." });
    }

    if (!items.length) {
      return res
        .status(400)
        .json({ error: "Add at least one ingredient item." });
    }

    const { payloadItems, error } = await buildRecipeItems(items, req.user.id);
    if (error) {
      return res.status(400).json({ error });
    }

    const recipe = await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({
        where: { recipeId },
      });

      return tx.recipe.update({
        where: { id: recipeId },
        data: {
          name,
          notes,
          servings: servings > 0 ? Math.round(servings) : 1,
          items: {
            create: payloadItems,
          },
        },
        include: {
          items: {
            include: { ingredient: true },
          },
        },
      });
    });

    res.json(formatRecipe(recipe));
  })
);

app.delete(
  "/api/recipes/:id",
  asyncHandler(async (req, res) => {
    const recipeId = Number(req.params.id);
    if (!Number.isFinite(recipeId)) {
      return res.status(400).json({ error: "Invalid recipe id." });
    }
    const result = await prisma.recipe.updateMany({
      where: { id: recipeId, userId: req.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) {
      return res.status(404).json({ error: "Recipe not found." });
    }
    res.status(204).end();
  })
);

app.get(
  "/api/logs",
  asyncHandler(async (req, res) => {
    const dateRange = parseDateRange(req.query.date);
    const limit = parsePositiveInt(req.query.limit);
    const offset = parsePositiveInt(req.query.offset);
    const where = { userId: req.user.id };
    if (dateRange) {
      where.consumedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }
    const entries = await prisma.logEntry.findMany({
      ...(Object.keys(where).length ? { where } : {}),
      orderBy: { consumedAt: "desc" },
      ...(limit !== null ? { take: Math.min(limit, 500) } : {}),
      ...(offset !== null ? { skip: offset } : {}),
      include: {
        ingredient: true,
        recipe: {
          include: {
            items: {
              include: { ingredient: true },
            },
          },
        },
      },
    });
    res.json(entries.map(formatLogEntry));
  })
);

const getOrCreateTargets = async (userId) => {
  const existing = await prisma.dailyTarget.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  return prisma.dailyTarget.create({
    data: {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      userId,
    },
  });
};

app.get(
  "/api/targets",
  asyncHandler(async (req, res) => {
    const targets = await getOrCreateTargets(req.user.id);
    res.json(targets);
  })
);

app.put(
  "/api/targets",
  asyncHandler(async (req, res) => {
    const existing = await getOrCreateTargets(req.user.id);
    const invalidField = findInvalidNumberField(req.body, [
      "calories",
      "protein",
      "carbs",
      "fat",
    ]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }
    const data = {
      calories: parseOptionalNumber(req.body.calories),
      protein: parseOptionalNumber(req.body.protein),
      carbs: parseOptionalNumber(req.body.carbs),
      fat: parseOptionalNumber(req.body.fat),
    };
    const targets = await prisma.dailyTarget.update({
      where: { id: existing.id },
      data,
    });
    res.json(targets);
  })
);

app.post(
  "/api/logs",
  asyncHandler(async (req, res) => {
    const ingredientId = req.body.ingredientId
      ? Number(req.body.ingredientId)
      : null;
    const recipeId = req.body.recipeId ? Number(req.body.recipeId) : null;
    const invalidField = findInvalidNumberField(req.body, ["quantity"]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }

    if ((ingredientId && recipeId) || (!ingredientId && !recipeId)) {
      return res
        .status(400)
        .json({ error: "Select either an ingredient or a recipe." });
    }

    const quantity = parseNumber(req.body.quantity, 1);
    let unit = req.body.unit ? String(req.body.unit).trim() : "";
    if (ingredientId) {
      const ingredient = await prisma.ingredient.findFirst({
        where: { id: ingredientId, userId: req.user.id, deletedAt: null },
      });
      if (!ingredient) {
        return res.status(404).json({ error: "Ingredient not found." });
      }
      if (!unit) {
        unit = ingredient.unit;
      }
      const normalized = normalizeIngredientQuantity(
        ingredient,
        quantity,
        unit
      );
      if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
      }
    }

    if (recipeId) {
      const recipe = await prisma.recipe.findFirst({
        where: { id: recipeId, userId: req.user.id, deletedAt: null },
      });
      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found." });
      }
      if (!unit) {
        unit = "serving";
      }
      const normalized = normalizeRecipeQuantity(quantity, unit);
      if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
      }
    }

    const entry = await prisma.logEntry.create({
      data: {
        ingredientId,
        recipeId,
        quantity,
        unit,
        notes: req.body.notes ? String(req.body.notes).trim() : null,
        consumedAt: parseDate(req.body.consumedAt),
        userId: req.user.id,
      },
      include: {
        ingredient: true,
        recipe: {
          include: {
            items: { include: { ingredient: true } },
          },
        },
      },
    });

    res.status(201).json(formatLogEntry(entry));
  })
);

app.delete(
  "/api/logs/:id",
  asyncHandler(async (req, res) => {
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId)) {
      return res.status(400).json({ error: "Invalid log id." });
    }
    const result = await prisma.logEntry.deleteMany({
      where: { id: entryId, userId: req.user.id },
    });
    if (!result.count) {
      return res.status(404).json({ error: "Log entry not found." });
    }
    res.status(204).end();
  })
);

app.use((error, req, res, next) => {
  if (error.code === "P2002") {
    return res.status(409).json({ error: "Duplicate value detected." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

const startServer = () => {
  const useHttps = process.env.HTTPS === "true";
  const protocol = useHttps ? "https" : "http";

  if (!useHttps) {
    return http.createServer(app).listen(PORT, () => {
      console.log(`Nutrition tracker running on ${protocol}://localhost:${PORT}`);
    });
  }

  const keyPath = process.env.SSL_KEY_PATH || "certs/localhost-key.pem";
  const certPath = process.env.SSL_CERT_PATH || "certs/localhost-cert.pem";

  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    return https.createServer({ key, cert }, app).listen(PORT, () => {
      console.log(`Nutrition tracker running on ${protocol}://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start HTTPS server. Check SSL_KEY_PATH/SSL_CERT_PATH.");
    console.error(error.message);
    process.exit(1);
  }
};

const server = startServer();

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
