const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const path = require("path");
const express = require("express");
const { FoodDatabase } = require("./external/FoodDatabase/src/foodDatabase");
const { AuthDatabase } = require("./lib/auth-db");
const { hashPassword, verifyPassword } = require("./lib/auth");
const {
  parseServingLabel,
  convertMass,
  convertEnergy,
  getUnitMultiplier,
} = require("./lib/units");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}
if (!process.env.AUTH_DATABASE_URL) {
  process.env.AUTH_DATABASE_URL = "file:./auth.db";
}

const app = express();
const PORT = process.env.PORT || 3000;
const APP_NAME = "CaloriScribe";
const CORE_TARGET_CATALOG = {
  calories: { label: "Calories", unit: "cal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbs", unit: "g" },
  fat: { label: "Fat", unit: "g" },
};
const CUSTOM_TARGET_CATALOG = {
  saturatedFat: { label: "Saturated fat", unit: "g" },
  transFat: { label: "Trans fat", unit: "g" },
  cholesterolMg: { label: "Cholesterol", unit: "mg" },
  sodiumMg: { label: "Sodium", unit: "mg" },
  dietaryFiber: { label: "Dietary fiber", unit: "g" },
  totalSugars: { label: "Total sugars", unit: "g" },
  addedSugars: { label: "Added sugars", unit: "g" },
  vitaminDMcg: { label: "Vitamin D", unit: "mcg" },
  calciumMg: { label: "Calcium", unit: "mg" },
  ironMg: { label: "Iron", unit: "mg" },
  potassiumMg: { label: "Potassium", unit: "mg" },
};
const TARGET_CATALOG = {
  ...CORE_TARGET_CATALOG,
  ...CUSTOM_TARGET_CATALOG,
};
const CORE_TARGET_KEYS = Object.keys(CORE_TARGET_CATALOG);
const CUSTOM_TARGET_KEYS = Object.keys(CUSTOM_TARGET_CATALOG);
const NUTRIENT_KEYS = Object.keys(TARGET_CATALOG);

const resolveSqlitePath = (url, fallbackPath) => {
  if (!url || !url.startsWith("file:")) {
    return fallbackPath;
  }
  const rawPath = url.slice("file:".length).split("?")[0];
  if (!rawPath) {
    return fallbackPath;
  }
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
};

const foodDb = new FoodDatabase({
  filename: resolveSqlitePath(process.env.DATABASE_URL, "dev.db"),
});
const authDb = new AuthDatabase({
  filename: resolveSqlitePath(process.env.AUTH_DATABASE_URL, "auth.db"),
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json({ limit: "10mb" }));
app.set("trust proxy", 1);

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const getFoodUserByExternalId = async (externalId) =>
  foodDb.getUserByExternalId(externalId);

const ensureFoodUser = async (authUser) => {
  if (!authUser?.external_id) {
    return null;
  }
  const existing = await getFoodUserByExternalId(authUser.external_id);
  if (existing) {
    return existing;
  }
  const created = await foodDb.createUser({ externalId: authUser.external_id });
  return { id: created.id, external_id: created.externalId };
};

const attachUser = asyncHandler(async (req, res, next) => {
  const token = getSessionToken(req);
  if (!token) {
    return next();
  }
  const session = await authDb.getSessionByToken(token);
  if (!session) {
    return next();
  }
  const expiresAt = new Date(session.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await authDb.deleteSession(token);
    return next();
  }
  const user = await authDb.getUserById(session.user_id);
  if (!user) {
    return next();
  }
  const foodUser = await ensureFoodUser(user);
  if (!foodUser) {
    return next();
  }
  req.user = {
    id: user.id,
    username: user.username,
    externalId: user.external_id,
    createdAt: user.created_at,
  };
  req.session = session;
  req.foodUserId = foodUser.id;
  return next();
});

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  return next();
};

const requirePageAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  return next();
};

const renderPage = (res, view, { title, active } = {}) => {
  res.render(view, {
    title: title || APP_NAME,
    active: active || "",
    appName: APP_NAME,
  });
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

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
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

const formatServingSizeLabel = (size, unit) => {
  if (!size || !unit) {
    return "";
  }
  return `${size} ${unit}`.trim();
};

const parseServingSizeInput = (value, unit) => {
  const parsed = parseServingLabel(value);
  const baseUnit = unit || parsed?.unit || "";
  let size = 1;
  if (parsed && baseUnit) {
    const multiplier = getUnitMultiplier(parsed.unit, baseUnit);
    if (multiplier !== null && Number.isFinite(multiplier)) {
      size = parsed.amount * multiplier;
    }
  }
  if (!Number.isFinite(size) || size <= 0) {
    size = 1;
  }
  return { servingSize: size, servingUnit: baseUnit };
};

const parseServingsPerContainer = (value) => {
  const parsed = parseNumber(value, 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const isCoreTargetKey = (key) => CORE_TARGET_KEYS.includes(key);

let nutrientLookupCache = null;

const loadNutrientLookup = async () => {
  if (nutrientLookupCache) {
    return nutrientLookupCache;
  }
  const rows = await foodDb.listNutrients();
  nutrientLookupCache = new Map(rows.map((row) => [row.name, row]));
  return nutrientLookupCache;
};

const ensureNutrients = async () => {
  const existing = await foodDb.listNutrients();
  const existingNames = new Set(existing.map((row) => row.name));
  const inserts = [];
  Object.entries(TARGET_CATALOG).forEach(([key, value]) => {
    if (!existingNames.has(key)) {
      inserts.push({ name: key, unit: value.unit, dailyValue: 0 });
    }
  });
  if (!inserts.length) {
    return;
  }
  for (const item of inserts) {
    await foodDb.createNutrient({
      name: item.name,
      unit: item.unit,
      dailyValue: item.dailyValue,
    });
  }
  nutrientLookupCache = null;
};

const ensureNutrient = async (key, unit = "g", dailyValue = 0) => {
  const lookup = await loadNutrientLookup();
  const existing = lookup.get(key);
  if (existing) {
    return existing;
  }
  await foodDb.createNutrient({ name: key, unit, dailyValue });
  nutrientLookupCache = null;
  return (await loadNutrientLookup()).get(key);
};

const ensureCoreTargets = async (userId) => {
  const existingValues = await foodDb.listUserDailyValues(userId);
  if (existingValues.length) {
    return;
  }
  await ensureNutrients();
  const lookup = await loadNutrientLookup();
  for (const key of CORE_TARGET_KEYS) {
    const nutrient = lookup.get(key);
    if (!nutrient) {
      continue;
    }
    await foodDb.addUserDailyValue({
      userId,
      nutrientId: nutrient.id,
      label: TARGET_CATALOG[key].label,
      targetValue: 0,
      allowExceed: 0,
    });
  }
};

const getCustomTargetsForUser = async (userId) => {
  await ensureCoreTargets(userId);
  const rows = await foodDb.listUserDailyValues(userId);
  return rows.map((row) => ({
    id: row.id,
    key: row.name,
    label: row.label || TARGET_CATALOG[row.name]?.label || row.name,
    unit: row.unit,
    target: row.target_value > 0 ? row.target_value : null,
    allowOver: Boolean(row.allow_exceed),
  }));
};

const buildTargetsPayload = (targets) => {
  const map = new Map((targets || []).map((target) => [target.key, target]));
  const read = (key) => map.get(key) || {};
  return {
    calories: read("calories").target ?? null,
    protein: read("protein").target ?? null,
    carbs: read("carbs").target ?? null,
    fat: read("fat").target ?? null,
    caloriesAllowOver: Boolean(read("calories").allowOver),
    proteinAllowOver: Boolean(read("protein").allowOver),
    carbsAllowOver: Boolean(read("carbs").allowOver),
    fatAllowOver: Boolean(read("fat").allowOver),
  };
};

const buildFoodModel = (row, nutrientValues) => {
  const nutrients = nutrientValues || {};
  const read = (key) => parseNumber(nutrients[key], 0);
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    unit: row.serving_unit,
    servingSize: parseNumber(row.serving_size, 1),
    servingsPerContainer: parseNumber(row.servings_per_container, 1),
    servingLabel: row.serving_label ?? null,
    ingredientsList: row.ingredients_list ?? null,
    allergens: row.allergens_list ?? null,
    isIngredient: Boolean(row.is_ingredient),
    isDeleted: Boolean(row.is_deleted),
    calories: read("calories"),
    protein: read("protein"),
    carbs: read("carbs"),
    fat: read("fat"),
    saturatedFat: read("saturatedFat"),
    transFat: read("transFat"),
    cholesterolMg: read("cholesterolMg"),
    sodiumMg: read("sodiumMg"),
    dietaryFiber: read("dietaryFiber"),
    totalSugars: read("totalSugars"),
    addedSugars: read("addedSugars"),
    vitaminDMcg: read("vitaminDMcg"),
    calciumMg: read("calciumMg"),
    ironMg: read("ironMg"),
    potassiumMg: read("potassiumMg"),
  };
};

const serializeFood = (food) => {
  const { servingLabel, ...rest } = food;
  return {
    ...rest,
    servingSize:
      servingLabel || formatServingSizeLabel(food.servingSize, food.unit),
    servingsPerContainer:
      food.servingsPerContainer !== null && food.servingsPerContainer !== undefined
        ? String(food.servingsPerContainer)
        : "",
  };
};

const fetchFoods = async ({
  userId,
  isIngredient = null,
  ids = [],
  barcode,
  search,
  includeDeleted = false,
} = {}) => {
  const rows = await foodDb.listFoodsWithNutrients({
    userId,
    isIngredient,
    ids,
    barcode,
    search,
    includeDeleted,
  });

  const foodRows = new Map();
  const nutrientMap = new Map();
  rows.forEach((row) => {
    if (!foodRows.has(row.id)) {
      foodRows.set(row.id, row);
    }
    if (row.nutrient_name) {
      const entry = nutrientMap.get(row.id) || {};
      entry[row.nutrient_name] = row.nutrient_amount;
      nutrientMap.set(row.id, entry);
    }
  });

  const foods = Array.from(foodRows.values()).map((row) =>
    buildFoodModel(row, nutrientMap.get(row.id))
  );
  return { foods, byId: new Map(foods.map((food) => [food.id, food])) };
};

const fetchRecipes = async ({ userId, ids = [], includeDeleted = false } = {}) => {
  const recipeRows = await foodDb.listRecipes({ userId, ids, includeDeleted });
  if (!recipeRows.length) {
    return { recipes: [], byId: new Map() };
  }
  const recipeIds = recipeRows.map((row) => row.id);
  const itemRows = await foodDb.listFoodsInRecipes(recipeIds);
  const foodIds = Array.from(new Set(itemRows.map((row) => row.food_id)));
  const { byId: foodById } = await fetchFoods({
    userId,
    ids: foodIds,
    includeDeleted: true,
  });

  const itemsByRecipe = new Map();
  itemRows.forEach((row) => {
    const list = itemsByRecipe.get(row.recipe_id) || [];
    const ingredient = foodById.get(row.food_id);
    if (ingredient) {
      list.push({
        ingredient,
        quantity: row.quantity,
        unit: row.unit,
        ingredientId: row.food_id,
      });
    }
    itemsByRecipe.set(row.recipe_id, list);
  });

  const recipes = recipeRows.map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    servings: row.servings,
    items: itemsByRecipe.get(row.id) || [],
  }));
  return { recipes, byId: new Map(recipes.map((recipe) => [recipe.id, recipe])) };
};

const fetchLogsForExport = async (userId) => {
  const rows = await foodDb.listUserIntakeLogs({ userId });
  if (!rows.length) {
    return [];
  }
  const foodIds = rows
    .filter((row) => row.food_id)
    .map((row) => row.food_id);
  const { byId: foodById } = await fetchFoods({
    userId,
    ids: Array.from(new Set(foodIds)),
    includeDeleted: true,
  });

  return rows.map((row) => {
    const food = row.food_id ? foodById.get(row.food_id) : null;
    const isIngredient = food?.isIngredient;
    return {
      id: row.id,
      ingredientId: isIngredient ? row.food_id : null,
      foodId: !isIngredient ? row.food_id : null,
      recipeId: row.recipe_id,
      quantity: row.quantity,
      unit: row.unit,
      notes: row.notes ?? null,
      consumedAt: row.logged_at_epoch * 1000,
    };
  });
};

const upsertFoodNutrients = async (foodId, nutrientValues) => {
  await ensureNutrients();
  const lookup = await loadNutrientLookup();
  for (const [key, value] of Object.entries(nutrientValues)) {
    const nutrient = lookup.get(key);
    if (!nutrient) {
      continue;
    }
    await foodDb.upsertFoodNutrient({
      foodId,
      nutrientId: nutrient.id,
      amount: parseNumber(value, 0),
    });
  }
};

const buildFoodPayload = (payload, isIngredient) => {
  const name = String(payload?.name || "").trim();
  const unit = String(payload?.unit || "").trim();
  if (!name || !unit) {
    return null;
  }
  const servingInput = parseServingSizeInput(payload?.servingSize, unit);
  const servingLabel = String(payload?.servingSize || "").trim();
  return {
    name,
    barcode: parseOptionalString(payload?.barcode),
    ingredientsList: parseOptionalString(payload?.ingredientsList),
    allergensList: parseOptionalString(payload?.allergens),
    servingSize: servingInput.servingSize,
    servingUnit: servingInput.servingUnit || unit,
    servingsPerContainer: parseServingsPerContainer(payload?.servingsPerContainer),
    isIngredient: isIngredient ? 1 : 0,
    servingLabel,
  };
};

const buildFoodNutrientValues = (payload) => {
  const values = {};
  NUTRIENT_KEYS.forEach((key) => {
    values[key] = parseNumber(payload?.[key], 0);
  });
  return values;
};

const saveDefaultAlternateUnit = async (
  foodId,
  label,
  servingSize,
  servingUnit
) => {
  const fallbackLabel = formatServingSizeLabel(servingSize, servingUnit);
  const normalizedLabel = String(label || "").trim() || fallbackLabel;
  if (!normalizedLabel) {
    return;
  }
  const safeQuantity =
    Number.isFinite(servingSize) && servingSize > 0 ? servingSize : 1;
  const safeUnit = servingUnit || "serving";

  await foodDb.setDefaultAlternateUnit({
    foodId,
    label: normalizedLabel,
    quantity: safeQuantity,
    unit: safeUnit,
    baseServingMultiplier: 1,
  });
};

const toIntakeDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  if (value === null || value === undefined || value === "") {
    return new Date();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  const asString = String(value).trim();
  if (asString && /^\d+$/.test(asString)) {
    const millis = Number(asString);
    if (Number.isFinite(millis)) {
      return new Date(millis);
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const parseIntakeDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return raw;
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
  const converted = quantity * multiplier;
  const servingSize = parseNumber(ingredient.servingSize, 1);
  const servings = servingSize > 0 ? converted / servingSize : converted;
  return { quantity: servings, unit: ingredientUnit };
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

const BASE_NUTRIENT_KEYS = ["calories", "protein", "carbs", "fat"];
const ALL_NUTRIENT_KEYS = [...BASE_NUTRIENT_KEYS, ...CUSTOM_TARGET_KEYS];

const createNutritionTotals = () => {
  const totals = {};
  ALL_NUTRIENT_KEYS.forEach((key) => {
    totals[key] = 0;
  });
  return totals;
};

const addNutritionTotals = (totals, source, multiplier) => {
  ALL_NUTRIENT_KEYS.forEach((key) => {
    totals[key] += parseNumber(source?.[key], 0) * multiplier;
  });
};

const computeIngredientTotals = (ingredient, quantity, unit) => {
  const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
  const normalizedQuantity = normalized.error ? quantity : normalized.quantity;
  const totals = createNutritionTotals();
  addNutritionTotals(totals, ingredient, normalizedQuantity);
  return totals;
};

const computeRecipeTotals = (recipe) => {
  const totals = createNutritionTotals();
  recipe.items.forEach((item) => {
    const itemTotals = computeIngredientTotals(
      item.ingredient,
      item.quantity,
      item.unit
    );
    ALL_NUTRIENT_KEYS.forEach((key) => {
      totals[key] += itemTotals[key];
    });
  });
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  const perServing = {};
  ALL_NUTRIENT_KEYS.forEach((key) => {
    perServing[key] = totals[key] / servings;
  });

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

  if (entry.food) {
    nutrition = computeIngredientTotals(
      entry.food,
      entry.quantity,
      entry.unit || entry.food.unit
    );
    label = entry.food.name;
    entryUnit = entry.unit || entry.food.unit;
  }

  if (entry.recipe) {
    const recipeNutrition = computeRecipeTotals(entry.recipe);
    const normalized = normalizeRecipeQuantity(entry.quantity, entry.unit);
    const servingQuantity = normalized.error
      ? entry.quantity
      : normalized.quantity;
    nutrition = {};
    ALL_NUTRIENT_KEYS.forEach((key) => {
      nutrition[key] =
        parseNumber(recipeNutrition.perServing?.[key], 0) * servingQuantity;
    });
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
    const user = await authDb.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await authDb.createSession({ userId: user.id, token, expiresAt });
    await ensureFoodUser(user);
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
      await authDb.deleteSession(token);
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

app.post(
  "/api/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const oldPassword = String(req.body.oldPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters." });
    }

    const user = await authDb.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: "Old password is incorrect." });
    }

    const passwordHash = await hashPassword(newPassword);
    await authDb.updatePassword({ userId: req.user.id, passwordHash });

    res.json({ status: "ok" });
  })
);

app.get(
  "/api/export",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.foodUserId;
    const [
      ingredientData,
      foodData,
      recipeData,
      logs,
      customTargets,
    ] = await Promise.all([
      fetchFoods({ userId, isIngredient: true }),
      fetchFoods({ userId, isIngredient: false }),
      fetchRecipes({ userId }),
      fetchLogsForExport(userId),
      getCustomTargetsForUser(userId),
    ]);

    const targets = buildTargetsPayload(customTargets);
    res.json({
      exportedAt: new Date().toISOString(),
      version: 2,
      user: {
        username: req.user.username,
        createdAt: req.user.createdAt,
      },
      targets,
      customTargets,
      ingredients: ingredientData.foods.map(serializeFood),
      foods: foodData.foods.map(serializeFood),
      recipes: recipeData.recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        notes: recipe.notes ?? null,
        servings: recipe.servings,
        items: recipe.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      })),
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
    const foods = Array.isArray(payload.foods) ? payload.foods : [];
    const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const legacyTargets = payload.targets || null;
    const customTargets = Array.isArray(payload.customTargets)
      ? payload.customTargets
      : [];
    const userId = req.foodUserId;

    const incomingTargets = new Map();
    customTargets.forEach((target) => {
      const key = String(target?.key || "").trim();
      if (!key) {
        return;
      }
      if (!incomingTargets.has(key)) {
        incomingTargets.set(key, target);
      }
    });
    if (legacyTargets) {
      CORE_TARGET_KEYS.forEach((key) => {
        if (incomingTargets.has(key)) {
          return;
        }
        incomingTargets.set(key, {
          key,
          target: legacyTargets?.[key],
          allowOver: legacyTargets?.[`${key}AllowOver`],
        });
      });
    }
    const hasCoreTargets = CORE_TARGET_KEYS.some((key) =>
      incomingTargets.has(key)
    );

    const summary = {
      ingredients: { created: 0, reused: 0, skipped: 0 },
      foods: { created: 0, reused: 0, skipped: 0 },
      recipes: { created: 0, skipped: 0 },
      logs: { created: 0, skipped: 0 },
      targets: hasCoreTargets ? "updated" : "skipped",
      customTargets: { created: 0, updated: 0, skipped: 0 },
    };

    await foodDb.beginTransaction();
    try {
      if (mode === "replace") {
        await foodDb.deleteUserIntakeLogsByUser(userId);
        await foodDb.deleteFoodsInRecipesByUser(userId);
        await foodDb.deleteRecipesByUser(userId);
        await foodDb.deleteFoodsByUser(userId);
        await foodDb.deleteUserDailyValuesByUser(userId);
      }

      const existingFoods = await foodDb.listFoodsBasic({
        userId,
        includeDeleted: false,
      });
      const existingByBarcode = new Map();
      const existingByName = new Map();
      const foodMetaById = new Map();
      existingFoods.forEach((item) => {
        if (item.barcode) {
          existingByBarcode.set(
            `${item.is_ingredient}:${item.barcode}`,
            item
          );
        }
        const nameKey = normalizeNameKey(item.name);
        if (nameKey) {
          existingByName.set(`${item.is_ingredient}:${nameKey}`, item);
        }
        foodMetaById.set(item.id, {
          id: item.id,
          unit: item.serving_unit,
          servingSize: parseNumber(item.serving_size, 1),
        });
      });

      const ingredientIdMap = new Map();
      const foodIdMap = new Map();

      const insertFood = async (payload, isIngredient) => {
        const data = buildFoodPayload(payload, isIngredient);
        if (!data) {
          return null;
        }
        const foodId = await foodDb.createFood({
          userId,
          name: data.name,
          barcode: data.barcode,
          ingredientsList: data.ingredientsList,
          allergensList: data.allergensList,
          servingSize: data.servingSize,
          servingUnit: data.servingUnit,
          servingsPerContainer: data.servingsPerContainer,
          isIngredient: data.isIngredient ? 1 : 0,
        });
        const nutrients = buildFoodNutrientValues(payload);
        await upsertFoodNutrients(foodId, nutrients);
        await saveDefaultAlternateUnit(
          foodId,
          data.servingLabel,
          data.servingSize,
          data.servingUnit
        );
        foodMetaById.set(foodId, {
          id: foodId,
          unit: data.servingUnit,
          servingSize: data.servingSize,
        });
        return foodId;
      };

      for (const ingredient of ingredients) {
        const originalId = ingredient?.id;
        const barcode = parseOptionalString(ingredient?.barcode);
        const nameKey = normalizeNameKey(ingredient?.name);
        let matched =
          (barcode && existingByBarcode.get(`1:${barcode}`)) ||
          (nameKey && existingByName.get(`1:${nameKey}`));

        if (matched) {
          ingredientIdMap.set(originalId, matched.id);
          if (!foodMetaById.has(matched.id)) {
            foodMetaById.set(matched.id, {
              id: matched.id,
              unit: matched.serving_unit,
              servingSize: parseNumber(matched.serving_size, 1),
            });
          }
          summary.ingredients.reused += 1;
          continue;
        }
        const createdId = await insertFood(ingredient, true);
        if (!createdId) {
          summary.ingredients.skipped += 1;
          continue;
        }
        ingredientIdMap.set(originalId, createdId);
        summary.ingredients.created += 1;
      }

      for (const food of foods) {
        const originalId = food?.id;
        const barcode = parseOptionalString(food?.barcode);
        const nameKey = normalizeNameKey(food?.name);
        let matched =
          (barcode && existingByBarcode.get(`0:${barcode}`)) ||
          (nameKey && existingByName.get(`0:${nameKey}`));

        if (matched) {
          foodIdMap.set(originalId, matched.id);
          if (!foodMetaById.has(matched.id)) {
            foodMetaById.set(matched.id, {
              id: matched.id,
              unit: matched.serving_unit,
              servingSize: parseNumber(matched.serving_size, 1),
            });
          }
          summary.foods.reused += 1;
          continue;
        }
        const createdId = await insertFood(food, false);
        if (!createdId) {
          summary.foods.skipped += 1;
          continue;
        }
        foodIdMap.set(originalId, createdId);
        summary.foods.created += 1;
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
          const ingredient = foodMetaById.get(mappedIngredientId);
          let unit = String(item?.unit || "").trim();
          if (!unit && ingredient?.unit) {
            unit = ingredient.unit;
          }
          const quantity = parseNumber(item?.quantity, 1);
          if (!unit) {
            continue;
          }
          const normalized = normalizeIngredientQuantity(
            {
              unit,
              servingSize: ingredient?.servingSize ?? 1,
            },
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
        const recipeId = await foodDb.createRecipe({
          userId,
          name,
          servings: servings > 0 ? Math.round(servings) : 1,
          notes: parseOptionalString(recipe?.notes),
        });
        recipeIdMap.set(recipe?.id, recipeId);
        summary.recipes.created += 1;

        for (const item of mappedItems) {
          await foodDb.addFoodToRecipe({
            recipeId,
            foodId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
          });
        }
      }

      const allFoodIds = [
        ...ingredientIdMap.values(),
        ...foodIdMap.values(),
      ];
      const { byId: foodById } = await fetchFoods({
        userId,
        ids: Array.from(new Set(allFoodIds)),
        includeDeleted: true,
      });

      for (const entry of logs) {
        const mappedFoodId = entry?.ingredientId
          ? ingredientIdMap.get(entry.ingredientId)
          : entry?.foodId
            ? foodIdMap.get(entry.foodId)
            : null;
        const mappedRecipeId = entry?.recipeId
          ? recipeIdMap.get(entry.recipeId)
          : null;
        const resolvedTargets = [mappedFoodId, mappedRecipeId].filter(Boolean);
        if (resolvedTargets.length !== 1) {
          summary.logs.skipped += 1;
          continue;
        }
        const quantity = parseNumber(entry?.quantity, 1);
        const consumedAt = parseDate(entry?.consumedAt);
        const intakeDate =
          parseIntakeDate(entry?.intakeDate) ?? toIntakeDate(consumedAt);
        let unit = String(entry?.unit || "").trim();

        if (mappedFoodId) {
          const food = foodById.get(mappedFoodId);
          if (!unit) {
            unit = food?.unit || "";
          }
          const normalized = normalizeIngredientQuantity(
            food,
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

        await foodDb.logIntake({
          userId,
          foodId: mappedFoodId,
          recipeId: mappedRecipeId,
          quantity,
          unit,
          loggedAtEpoch: Math.floor(consumedAt.getTime() / 1000),
          intakeDate,
          notes: parseOptionalString(entry?.notes),
        });
        summary.logs.created += 1;
      }

      if (incomingTargets.size) {
        for (const target of incomingTargets.values()) {
          const key = String(target?.key || "").trim();
          if (!key) {
            summary.customTargets.skipped += 1;
            continue;
          }
          const catalog = TARGET_CATALOG[key];
          const isCore = isCoreTargetKey(key);
          const targetValue = parseOptionalNumber(target?.target);
          if (targetValue === null && !isCore) {
            summary.customTargets.skipped += 1;
            continue;
          }
          if (targetValue !== null && targetValue < 0) {
            summary.customTargets.skipped += 1;
            continue;
          }
          const unit = target?.unit || catalog?.unit || "g";
          const nutrient = await ensureNutrient(key, unit, 0);
          const label =
            String(target?.label || catalog?.label || key).trim() ||
            catalog?.label ||
            key;
          const allowOver = parseBoolean(target?.allowOver);

          const existing = await foodDb.getUserDailyValueByNutrient({
            userId,
            nutrientId: nutrient.id,
          });
          if (existing) {
            await foodDb.updateUserDailyValue({
              id: existing.id,
              label,
              targetValue: targetValue ?? 0,
              allowExceed: allowOver ? 1 : 0,
            });
            summary.customTargets.updated += 1;
          } else {
            await foodDb.addUserDailyValue({
              userId,
              nutrientId: nutrient.id,
              label,
              targetValue: targetValue ?? 0,
              allowExceed: allowOver ? 1 : 0,
            });
            summary.customTargets.created += 1;
          }
        }
      }

      await ensureCoreTargets(userId);
      await foodDb.commitTransaction();
    } catch (error) {
      await foodDb.rollbackTransaction();
      throw error;
    }

    res.json(summary);
  })
);

app.use("/api", requireAuth);

const buildRecipeItems = async (items, userId) => {
  const ingredientIds = items
    .map((item) => Number(item.ingredientId))
    .filter((id) => Number.isFinite(id));
  const uniqueIngredientIds = Array.from(new Set(ingredientIds));
  const { byId: ingredientMap } = await fetchFoods({
    userId,
    ids: uniqueIngredientIds,
    isIngredient: true,
    includeDeleted: false,
  });
  if (ingredientMap.size !== uniqueIngredientIds.length) {
    return { error: "Ingredient not found." };
  }
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
      foodId: ingredientId,
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
    const { foods } = await fetchFoods({
      userId: req.foodUserId,
      isIngredient: true,
      barcode,
      search,
    });
    res.json(foods.map(serializeFood));
  })
);

app.get(
  "/api/barcode-lookup",
  asyncHandler(async (req, res) => {
    const barcode = String(req.query.barcode || "").trim();
    const provider = String(req.query.provider || "auto")
      .trim()
      .toLowerCase();
    const type = String(req.query.type || "ingredient").trim().toLowerCase();

    if (!barcode) {
      return res.status(400).json({ error: "Barcode is required." });
    }

    const allowedProviders = ["auto", "openfoodfacts", "usda", "nutritionix"];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({ error: "Unknown provider." });
    }
    if (!["ingredient", "food"].includes(type)) {
      return res.status(400).json({ error: "Unknown lookup type." });
    }
    const isFood = type === "food";

    const existingLookup = await fetchFoods({
      userId: req.foodUserId,
      isIngredient: !isFood,
      barcode,
    });
    const existing = existingLookup.foods[0];
    if (existing) {
      return res.json({
        source: "local",
        [isFood ? "food" : "ingredient"]: serializeFood(existing),
      });
    }

    const cacheKey = getBarcodeCacheKey(barcode, provider);
    const cached = readBarcodeCache(cacheKey);
    const mapResult = (result) => {
      if (!result) {
        return null;
      }
      if (!isFood) {
        return result;
      }
      return { source: result.source, food: result.ingredient };
    };
    if (cached) {
      return res.json(mapResult(cached));
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
            return res.json(mapResult(result));
          }
        }
        if (nextProvider === "usda") {
          const result = await lookupUsda(barcode);
          if (result) {
            cacheResult(result);
            return res.json(mapResult(result));
          }
        }
        if (nextProvider === "openfoodfacts") {
          const result = await lookupOpenFoodFacts(barcode);
          if (result) {
            cacheResult(result);
            return res.json(mapResult(result));
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
    const data = buildFoodPayload(req.body, true);
    if (!data) {
      return res
        .status(400)
        .json({ error: "Ingredient name and unit are required." });
    }

    const ingredientId = await foodDb.createFood({
      userId: req.foodUserId,
      name: data.name,
      barcode: data.barcode,
      ingredientsList: data.ingredientsList,
      allergensList: data.allergensList,
      servingSize: data.servingSize,
      servingUnit: data.servingUnit,
      servingsPerContainer: data.servingsPerContainer,
      isIngredient: 1,
    });
    const nutrients = buildFoodNutrientValues(req.body);
    await upsertFoodNutrients(ingredientId, nutrients);
    await saveDefaultAlternateUnit(
      ingredientId,
      data.servingLabel,
      data.servingSize,
      data.servingUnit
    );
    const model = buildFoodModel(
      {
        id: ingredientId,
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_label: data.servingLabel,
        serving_unit: data.servingUnit,
        serving_size: data.servingSize,
        servings_per_container: data.servingsPerContainer,
        is_ingredient: 1,
        is_deleted: 0,
      },
      nutrients
    );
    res.status(201).json(serializeFood(model));
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
    const existing = await foodDb.getFoodForUser({
      foodId: ingredientId,
      userId: req.foodUserId,
      isIngredient: true,
      includeDeleted: false,
    });
    if (!existing) {
      return res.status(404).json({ error: "Ingredient not found." });
    }
    const data = buildFoodPayload(req.body, true);
    if (!data) {
      return res
        .status(400)
        .json({ error: "Ingredient name and unit are required." });
    }

    await foodDb.updateFoodForUser({
      foodId: ingredientId,
      userId: req.foodUserId,
      data: {
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_size: data.servingSize,
        serving_unit: data.servingUnit,
        servings_per_container: data.servingsPerContainer,
      },
    });
    const nutrients = buildFoodNutrientValues(req.body);
    await upsertFoodNutrients(ingredientId, nutrients);
    await saveDefaultAlternateUnit(
      ingredientId,
      data.servingLabel,
      data.servingSize,
      data.servingUnit
    );
    const model = buildFoodModel(
      {
        id: ingredientId,
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_label: data.servingLabel,
        serving_unit: data.servingUnit,
        serving_size: data.servingSize,
        servings_per_container: data.servingsPerContainer,
        is_ingredient: 1,
        is_deleted: 0,
      },
      nutrients
    );
    res.json(serializeFood(model));
  })
);

app.delete(
  "/api/ingredients/:id",
  asyncHandler(async (req, res) => {
    const ingredientId = Number(req.params.id);
    if (!Number.isFinite(ingredientId)) {
      return res.status(400).json({ error: "Invalid ingredient id." });
    }
    const result = await foodDb.softDeleteFoodForUser({
      foodId: ingredientId,
      userId: req.foodUserId,
      isIngredient: true,
    });
    if (!result.changes) {
      return res.status(404).json({ error: "Ingredient not found." });
    }
    res.status(204).end();
  })
);

app.get(
  "/api/foods",
  asyncHandler(async (req, res) => {
    const { barcode, search } = req.query;
    const { foods } = await fetchFoods({
      userId: req.foodUserId,
      isIngredient: false,
      barcode,
      search,
    });
    res.json(foods.map(serializeFood));
  })
);

app.post(
  "/api/foods",
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
    const data = buildFoodPayload(req.body, false);
    if (!data) {
      return res.status(400).json({ error: "Food name and unit are required." });
    }
    const foodId = await foodDb.createFood({
      userId: req.foodUserId,
      name: data.name,
      barcode: data.barcode,
      ingredientsList: data.ingredientsList,
      allergensList: data.allergensList,
      servingSize: data.servingSize,
      servingUnit: data.servingUnit,
      servingsPerContainer: data.servingsPerContainer,
      isIngredient: 0,
    });
    const nutrients = buildFoodNutrientValues(req.body);
    await upsertFoodNutrients(foodId, nutrients);
    await saveDefaultAlternateUnit(
      foodId,
      data.servingLabel,
      data.servingSize,
      data.servingUnit
    );
    const model = buildFoodModel(
      {
        id: foodId,
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_label: data.servingLabel,
        serving_unit: data.servingUnit,
        serving_size: data.servingSize,
        servings_per_container: data.servingsPerContainer,
        is_ingredient: 0,
        is_deleted: 0,
      },
      nutrients
    );
    res.status(201).json(serializeFood(model));
  })
);

app.put(
  "/api/foods/:id",
  asyncHandler(async (req, res) => {
    const foodId = Number(req.params.id);
    if (!Number.isFinite(foodId)) {
      return res.status(400).json({ error: "Invalid food id." });
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
    const existing = await foodDb.getFoodForUser({
      foodId,
      userId: req.foodUserId,
      isIngredient: false,
      includeDeleted: false,
    });
    if (!existing) {
      return res.status(404).json({ error: "Food not found." });
    }
    const data = buildFoodPayload(req.body, false);
    if (!data) {
      return res.status(400).json({ error: "Food name and unit are required." });
    }
    await foodDb.updateFoodForUser({
      foodId,
      userId: req.foodUserId,
      data: {
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_size: data.servingSize,
        serving_unit: data.servingUnit,
        servings_per_container: data.servingsPerContainer,
      },
    });
    const nutrients = buildFoodNutrientValues(req.body);
    await upsertFoodNutrients(foodId, nutrients);
    await saveDefaultAlternateUnit(
      foodId,
      data.servingLabel,
      data.servingSize,
      data.servingUnit
    );
    const model = buildFoodModel(
      {
        id: foodId,
        name: data.name,
        barcode: data.barcode,
        ingredients_list: data.ingredientsList,
        allergens_list: data.allergensList,
        serving_label: data.servingLabel,
        serving_unit: data.servingUnit,
        serving_size: data.servingSize,
        servings_per_container: data.servingsPerContainer,
        is_ingredient: 0,
        is_deleted: 0,
      },
      nutrients
    );
    res.json(serializeFood(model));
  })
);

app.delete(
  "/api/foods/:id",
  asyncHandler(async (req, res) => {
    const foodId = Number(req.params.id);
    if (!Number.isFinite(foodId)) {
      return res.status(400).json({ error: "Invalid food id." });
    }
    const result = await foodDb.softDeleteFoodForUser({
      foodId,
      userId: req.foodUserId,
      isIngredient: false,
    });
    if (!result.changes) {
      return res.status(404).json({ error: "Food not found." });
    }
    res.status(204).end();
  })
);

app.get(
  "/api/recipes",
  asyncHandler(async (req, res) => {
    const { recipes } = await fetchRecipes({ userId: req.foodUserId });
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

    const { payloadItems, error } = await buildRecipeItems(
      items,
      req.foodUserId
    );
    if (error) {
      return res.status(400).json({ error });
    }

    await foodDb.beginTransaction();
    let recipeId;
    try {
      recipeId = await foodDb.createRecipe({
        userId: req.foodUserId,
        name,
        servings: servings > 0 ? Math.round(servings) : 1,
        notes,
      });
      for (const item of payloadItems) {
        await foodDb.addFoodToRecipe({
          recipeId,
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
        });
      }
      await foodDb.commitTransaction();
    } catch (error) {
      await foodDb.rollbackTransaction();
      throw error;
    }

    const { recipes } = await fetchRecipes({
      userId: req.foodUserId,
      ids: [recipeId],
      includeDeleted: true,
    });
    const recipe = recipes[0];
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

    const { payloadItems, error } = await buildRecipeItems(
      items,
      req.foodUserId
    );
    if (error) {
      return res.status(400).json({ error });
    }

    const existing = await foodDb.getRecipeForUser({
      recipeId,
      userId: req.foodUserId,
      includeDeleted: false,
    });
    if (!existing) {
      return res.status(404).json({ error: "Recipe not found." });
    }

    await foodDb.beginTransaction();
    try {
      await foodDb.deleteFoodsInRecipe(recipeId);
      await foodDb.updateRecipe({
        recipeId,
        name,
        servings: servings > 0 ? Math.round(servings) : 1,
        notes,
      });
      for (const item of payloadItems) {
        await foodDb.addFoodToRecipe({
          recipeId,
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit,
        });
      }
      await foodDb.commitTransaction();
    } catch (error) {
      await foodDb.rollbackTransaction();
      throw error;
    }

    const { recipes } = await fetchRecipes({
      userId: req.foodUserId,
      ids: [recipeId],
      includeDeleted: true,
    });
    const recipe = recipes[0];
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
    const result = await foodDb.softDeleteRecipeForUser({
      recipeId,
      userId: req.foodUserId,
    });
    if (!result.changes) {
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
    let startDate = null;
    let endDate = null;
    if (dateRange) {
      startDate = toIntakeDate(dateRange.start);
      endDate = toIntakeDate(dateRange.end);
    }
    const limitValue = limit !== null ? Math.min(limit, 500) : null;
    const rows = await foodDb.listUserIntakeLogs({
      userId: req.foodUserId,
      startDate,
      endDate,
      limit: limitValue,
      offset,
    });
    const foodIds = Array.from(
      new Set(rows.map((row) => row.food_id).filter(Boolean))
    );
    const recipeIds = Array.from(
      new Set(rows.map((row) => row.recipe_id).filter(Boolean))
    );
    const { byId: foodById } = await fetchFoods({
      userId: req.foodUserId,
      ids: foodIds,
      includeDeleted: true,
    });
    const { byId: recipeById } = await fetchRecipes({
      userId: req.foodUserId,
      ids: recipeIds,
      includeDeleted: true,
    });

    const entries = rows.map((row) => {
      const food = row.food_id ? foodById.get(row.food_id) : null;
      const recipe = row.recipe_id ? recipeById.get(row.recipe_id) : null;
      const isIngredient = food?.isIngredient;
      return {
        id: row.id,
        ingredientId: isIngredient ? row.food_id : null,
        foodId: !isIngredient ? row.food_id : null,
        recipeId: row.recipe_id ?? null,
        quantity: row.quantity,
        unit: row.unit,
        notes: row.notes ?? null,
        consumedAt: parseNumber(row.logged_at_epoch, 0) * 1000,
        intakeDate: row.intake_date ?? null,
        ingredient: isIngredient ? food : null,
        food: !isIngredient ? food : null,
        recipe,
      };
    });

    res.json(entries.map(formatLogEntry));
  })
);

app.get(
  "/api/custom-targets",
  asyncHandler(async (req, res) => {
    const targets = await getCustomTargetsForUser(req.foodUserId);
    res.json(targets);
  })
);

app.post(
  "/api/custom-targets",
  asyncHandler(async (req, res) => {
    const key = String(req.body.key || "").trim();
    const catalog = TARGET_CATALOG[key];
    if (!catalog) {
      return res.status(400).json({ error: "Unsupported target type." });
    }
    const isCore = isCoreTargetKey(key);
    const target = parseOptionalNumber(req.body.target);
    if (target === null) {
      if (!isCore) {
        return res
          .status(400)
          .json({ error: "Target must be greater than 0." });
      }
    } else if (target < 0 || (!isCore && target <= 0)) {
      return res.status(400).json({ error: "Target must be greater than 0." });
    }
    const label = String(req.body.label || catalog.label).trim() || catalog.label;
    const allowOver = parseBoolean(req.body.allowOver);

    const nutrient = await ensureNutrient(key, catalog.unit, 0);
    const existing = await foodDb.getUserDailyValueByNutrient({
      userId: req.foodUserId,
      nutrientId: nutrient.id,
    });
    if (existing) {
      return res.status(409).json({ error: "Target already exists." });
    }
    const createdId = await foodDb.addUserDailyValue({
      userId: req.foodUserId,
      nutrientId: nutrient.id,
      label,
      targetValue: target ?? 0,
      allowExceed: allowOver ? 1 : 0,
    });

    res.status(201).json({
      id: createdId,
      key,
      label,
      unit: nutrient.unit,
      target: target ?? null,
      allowOver,
    });
  })
);

app.put(
  "/api/custom-targets/:id",
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ error: "Invalid target id." });
    }

    const existing = await foodDb.getUserDailyValueById({
      id: targetId,
      userId: req.foodUserId,
    });
    if (!existing) {
      return res.status(404).json({ error: "Target not found." });
    }
    const isCore = isCoreTargetKey(existing.name);

    const data = {};
    if (req.body.label !== undefined) {
      const label = String(req.body.label || "").trim();
      if (!label) {
        return res.status(400).json({ error: "Label is required." });
      }
      data.label = label;
    }
    if (req.body.target !== undefined) {
      const target = parseOptionalNumber(req.body.target);
      if (target === null) {
        if (!isCore) {
          return res
            .status(400)
            .json({ error: "Target must be greater than 0." });
        }
      } else if (target < 0 || (!isCore && target <= 0)) {
        return res.status(400).json({ error: "Target must be greater than 0." });
      }
      data.target_value = target ?? 0;
    }
    if (req.body.allowOver !== undefined) {
      data.allow_exceed = parseBoolean(req.body.allowOver) ? 1 : 0;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "No updates provided." });
    }

    await foodDb.updateUserDailyValue({
      id: existing.id,
      label: data.label,
      targetValue: data.target_value,
      allowExceed: data.allow_exceed,
    });

    const updatedLabel =
      data.label ??
      existing.label ??
      TARGET_CATALOG[existing.name]?.label ??
      existing.name;
    const updatedTarget =
      data.target_value !== undefined ? data.target_value : existing.target_value;
    const updatedAllow =
      data.allow_exceed !== undefined
        ? data.allow_exceed
        : existing.allow_exceed;

    res.json({
      id: existing.id,
      key: existing.name,
      label: updatedLabel,
      unit: existing.unit,
      target: updatedTarget > 0 ? updatedTarget : null,
      allowOver: Boolean(updatedAllow),
    });
  })
);

app.delete(
  "/api/custom-targets/:id",
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ error: "Invalid target id." });
    }
    const result = await foodDb.deleteUserDailyValue({
      id: targetId,
      userId: req.foodUserId,
    });
    if (!result.changes) {
      return res.status(404).json({ error: "Target not found." });
    }
    res.status(204).end();
  })
);

app.post(
  "/api/logs",
  asyncHandler(async (req, res) => {
    const ingredientId = req.body.ingredientId
      ? Number(req.body.ingredientId)
      : null;
    const foodId = req.body.foodId ? Number(req.body.foodId) : null;
    const recipeId = req.body.recipeId ? Number(req.body.recipeId) : null;
    const invalidField = findInvalidNumberField(req.body, ["quantity"]);
    if (invalidField) {
      return res
        .status(400)
        .json({ error: `${invalidField} must be a number.` });
    }

    const selectedTargets = [ingredientId, foodId, recipeId].filter((id) =>
      Number.isFinite(id)
    );
    if (selectedTargets.length !== 1) {
      return res
        .status(400)
        .json({ error: "Select a food, ingredient, or recipe." });
    }

    const quantity = parseNumber(req.body.quantity, 1);
    let unit = req.body.unit ? String(req.body.unit).trim() : "";
    let ingredient = null;
    let food = null;
    let recipe = null;

    if (ingredientId) {
      const { byId } = await fetchFoods({
        userId: req.foodUserId,
        ids: [ingredientId],
        isIngredient: true,
        includeDeleted: false,
      });
      ingredient = byId.get(ingredientId) || null;
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

    if (foodId) {
      const { byId } = await fetchFoods({
        userId: req.foodUserId,
        ids: [foodId],
        isIngredient: false,
        includeDeleted: false,
      });
      food = byId.get(foodId) || null;
      if (!food) {
        return res.status(404).json({ error: "Food not found." });
      }
      if (!unit) {
        unit = food.unit;
      }
      const normalized = normalizeIngredientQuantity(food, quantity, unit);
      if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
      }
    }

    if (recipeId) {
      const { byId } = await fetchRecipes({
        userId: req.foodUserId,
        ids: [recipeId],
        includeDeleted: false,
      });
      recipe = byId.get(recipeId) || null;
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

    const consumedAt = parseDate(req.body.consumedAt);
    const intakeDate =
      parseIntakeDate(req.body.intakeDate) ?? toIntakeDate(consumedAt);
    const logId = await foodDb.logIntake({
      userId: req.foodUserId,
      foodId: ingredientId || foodId,
      recipeId,
      quantity,
      unit,
      loggedAtEpoch: Math.floor(consumedAt.getTime() / 1000),
      intakeDate,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
    });

    const entry = {
      id: logId,
      ingredientId: ingredientId || null,
      foodId: foodId || null,
      recipeId: recipeId || null,
      quantity,
      unit,
      notes: req.body.notes ? String(req.body.notes).trim() : null,
      consumedAt: consumedAt.getTime(),
      intakeDate,
      ingredient,
      food,
      recipe,
    };

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
    const result = await foodDb.deleteUserIntakeLog({
      logId: entryId,
      userId: req.foodUserId,
    });
    if (!result.changes) {
      return res.status(404).json({ error: "Log entry not found." });
    }
    res.status(204).end();
  })
);

app.get("/login", (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  return renderPage(res, "login", { title: `${APP_NAME} Login` });
});

app.get(
  "/",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "index", {
      title: `${APP_NAME} Dashboard`,
      active: "dashboard",
    });
  })
);

app.get(
  "/ingredients",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "ingredients", {
      title: `${APP_NAME} Ingredients`,
      active: "ingredients",
    });
  })
);

app.get(
  "/foods",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "foods", {
      title: `${APP_NAME} Foods`,
      active: "foods",
    });
  })
);

app.get(
  "/recipes",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "recipes", {
      title: `${APP_NAME} Recipes`,
      active: "recipes",
    });
  })
);

app.get(
  "/log",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "log", {
      title: `${APP_NAME} Log Intake`,
      active: "log",
    });
  })
);

app.get(
  "/settings",
  requirePageAuth,
  asyncHandler(async (req, res) => {
    renderPage(res, "settings", {
      title: `${APP_NAME} Settings`,
      active: "settings",
    });
  })
);

app.get("/index.html", (req, res) => res.redirect("/"));
app.get("/ingredients.html", (req, res) => res.redirect("/ingredients"));
app.get("/foods.html", (req, res) => res.redirect("/foods"));
app.get("/recipes.html", (req, res) => res.redirect("/recipes"));
app.get("/log.html", (req, res) => res.redirect("/log"));
app.get("/settings.html", (req, res) => res.redirect("/settings"));
app.get("/login.html", (req, res) => res.redirect("/login"));

app.use(express.static("public", { index: false }));

app.use((error, req, res, next) => {
  if (error.code === "SQLITE_CONSTRAINT") {
    return res.status(409).json({ error: "Constraint violation." });
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

let server = null;

const init = async () => {
  await foodDb.open();
  await foodDb.initSchema();
  await authDb.open();
  await authDb.initSchema();
  await ensureNutrients();
  await authDb.deleteExpiredSessions(new Date().toISOString());
  server = startServer();
};

const shutdown = async () => {
  try {
    await authDb.close();
    await foodDb.close();
  } catch (error) {
    console.error(error);
  }
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

init().catch((error) => {
  console.error("Failed to start server.");
  console.error(error);
  process.exit(1);
});

process.on("SIGINT", () => {
  shutdown();
});
process.on("SIGTERM", () => {
  shutdown();
});
