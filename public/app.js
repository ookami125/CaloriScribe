const state = {
  ingredients: [],
  foods: [],
  recipes: [],
  logs: [],
  targets: null,
  customTargets: [],
  logImpact: null,
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

const elements = {
  ingredientList: qs("#ingredient-list"),
  ingredientForm: qs("#ingredient-form"),
  ingredientStatus: qs("#ingredient-status"),
  ingredientSearch: qs("#ingredient-search"),
  ingredientFormTitle: qs("#ingredient-form-title"),
  ingredientId: qs("#ingredient-id"),
  ingredientSubmit: qs("#ingredient-submit"),
  ingredientCancel: qs("#ingredient-cancel"),
  barcodeInput: qs("#barcode-input"),
  barcodeLookup: qs("#barcode-lookup"),
  extraNutrientSelect: qs("#extra-nutrient-select"),
  extraNutrients: qs("#extra-nutrients"),
  addNutrient: qs("#add-nutrient"),
  foodList: qs("#food-list"),
  foodForm: qs("#food-form"),
  foodStatus: qs("#food-status"),
  foodSearch: qs("#food-search"),
  foodFormTitle: qs("#food-form-title"),
  foodId: qs("#food-id"),
  foodSubmit: qs("#food-submit"),
  foodCancel: qs("#food-cancel"),
  foodBarcodeInput: qs("#food-barcode-input"),
  foodBarcodeLookup: qs("#food-barcode-lookup"),
  foodExtraNutrientSelect: qs("#food-extra-nutrient-select"),
  foodExtraNutrients: qs("#food-extra-nutrients"),
  addFoodNutrient: qs("#add-food-nutrient"),
  recipeForm: qs("#recipe-form"),
  recipeItems: qs("#recipe-items"),
  recipeStatus: qs("#recipe-status"),
  recipeList: qs("#recipe-list"),
  addRecipeItem: qs("#add-recipe-item"),
  recipeCalories: qs("#recipe-calories"),
  recipeCaloriesMeta: qs("#recipe-calories-meta"),
  recipeProtein: qs("#recipe-protein"),
  recipeCarbs: qs("#recipe-carbs"),
  recipeFat: qs("#recipe-fat"),
  recipeCaloriesProgress: qs("#recipe-calories-progress"),
  recipeProteinProgress: qs("#recipe-protein-progress"),
  recipeCarbsProgress: qs("#recipe-carbs-progress"),
  recipeFatProgress: qs("#recipe-fat-progress"),
  recipeProteinMeta: qs("#recipe-protein-meta"),
  recipeCarbsMeta: qs("#recipe-carbs-meta"),
  recipeFatMeta: qs("#recipe-fat-meta"),
  recipeCustomTargetsList: qs("#recipe-custom-targets-list"),
  recipeCustomTargetsEmpty: qs("#recipe-custom-targets-empty"),
  logForm: qs("#log-form"),
  logItem: qs("#log-item"),
  logStatus: qs("#log-status"),
  logList: qs("#log-list"),
  customTargetsList: qs("#custom-targets-list"),
  customTargetsEmpty: qs("#custom-targets-empty"),
  logImpactCard: qs("#log-impact-card"),
  logImpactCalories: qs("#log-impact-calories"),
  logImpactProtein: qs("#log-impact-protein"),
  logImpactCarbs: qs("#log-impact-carbs"),
  logImpactFat: qs("#log-impact-fat"),
  logImpactNote: qs("#log-impact-note"),
  todayCalories: qs("#today-calories"),
  todayProtein: qs("#today-protein"),
  todayCarbs: qs("#today-carbs"),
  todayFat: qs("#today-fat"),
  caloriesProgress: qs("#calories-progress"),
  caloriesImpactProgress: qs("#calories-impact-progress"),
  proteinProgress: qs("#protein-progress"),
  proteinImpactProgress: qs("#protein-impact-progress"),
  carbsProgress: qs("#carbs-progress"),
  carbsImpactProgress: qs("#carbs-impact-progress"),
  fatProgress: qs("#fat-progress"),
  fatImpactProgress: qs("#fat-impact-progress"),
  caloriesTarget: qs("#calories-target"),
  proteinTarget: qs("#protein-target"),
  carbsTarget: qs("#carbs-target"),
  fatTarget: qs("#fat-target"),
  targetForm: qs("#target-form"),
  targetStatus: qs("#target-status"),
  customTargetForm: qs("#custom-target-form"),
  customTargetStatus: qs("#custom-target-status"),
  customTargetList: qs("#custom-target-list"),
  customTargetKey: qs("#custom-target-key"),
  customTargetSubmit: qs("#custom-target-submit"),
  daySelector: qs("#day-selector"),
  logDateFilter: qs("#log-date-filter"),
  dayInputs: qsa("[data-day-input]"),
  dayActionButtons: qsa("[data-day-action]"),
  scanModal: qs("#scan-modal"),
  scanVideo: qs("#scan-video"),
  scanStatus: qs("#scan-status"),
  closeScan: qs("#close-scan"),
  confirmModal: qs("#confirm-modal"),
  confirmTitle: qs("#confirm-title"),
  confirmMessage: qs("#confirm-message"),
  confirmAccept: qs("#confirm-accept"),
  confirmCancel: qs("#confirm-cancel"),
  confirmClose: qs("#confirm-close"),
  editTargetModal: qs("#edit-target-modal"),
  editTargetInput: qs("#edit-target-input"),
  editTargetSave: qs("#edit-target-save"),
  editTargetCancel: qs("#edit-target-cancel"),
  editTargetClose: qs("#edit-target-close"),
  logoutButton: qs("#logout-button"),
  exportButton: qs("#export-button"),
  importButton: qs("#import-button"),
  importFile: qs("#import-file"),
  importStatus: qs("#import-status"),
  passwordForm: qs("#password-form"),
  passwordStatus: qs("#password-status"),
};

let editingIngredientId = null;
let editingFoodId = null;

const EXTRA_NUTRIENTS = [
  { name: "saturatedFat", label: "Saturated fat (g)", step: "0.01" },
  { name: "transFat", label: "Trans fat (g)", step: "0.01" },
  { name: "cholesterolMg", label: "Cholesterol (mg)", step: "0.01" },
  { name: "sodiumMg", label: "Sodium (mg)", step: "0.01" },
  { name: "dietaryFiber", label: "Dietary fiber (g)", step: "0.01" },
  { name: "totalSugars", label: "Total sugars (g)", step: "0.01" },
  { name: "addedSugars", label: "Added sugars (g)", step: "0.01" },
  { name: "vitaminDMcg", label: "Vitamin D (mcg)", step: "0.01" },
  { name: "calciumMg", label: "Calcium (mg)", step: "0.01" },
  { name: "ironMg", label: "Iron (mg)", step: "0.01" },
  { name: "potassiumMg", label: "Potassium (mg)", step: "0.01" },
];

const CUSTOM_TARGET_OPTIONS = [
  { key: "saturatedFat", label: "Saturated fat", unit: "g" },
  { key: "transFat", label: "Trans fat", unit: "g" },
  { key: "cholesterolMg", label: "Cholesterol", unit: "mg" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "dietaryFiber", label: "Dietary fiber", unit: "g" },
  { key: "totalSugars", label: "Total sugars", unit: "g" },
  { key: "addedSugars", label: "Added sugars", unit: "g" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "mcg" },
  { key: "calciumMg", label: "Calcium", unit: "mg" },
  { key: "ironMg", label: "Iron", unit: "mg" },
  { key: "potassiumMg", label: "Potassium", unit: "mg" },
];
const CORE_TARGET_OPTIONS = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];
const CORE_TARGET_KEYS = new Set(
  CORE_TARGET_OPTIONS.map((option) => option.key)
);
const CORE_TARGET_LOOKUP = new Map(
  CORE_TARGET_OPTIONS.map((option) => [option.key, option])
);
const DEFAULT_CUSTOM_TARGET_VALUE = 1;
const CUSTOM_TARGET_LOOKUP = new Map(
  CUSTOM_TARGET_OPTIONS.map((option) => [option.key, option])
);

const DAY_STORAGE_KEY = "nutritionTrackerSelectedDay";
const setupEditButton = (button, label = "Edit name") => {
  button.className = "icon-button edit-button";
  const icon = document.createElement("span");
  icon.className = "icon-mask edit";
  icon.setAttribute("aria-hidden", "true");
  button.replaceChildren(icon);
  button.setAttribute("aria-label", label);
  button.title = label;
};
const setupDeleteButton = (button, options = {}) => {
  button.className = "icon-button delete-button";
  if (options.card) {
    button.classList.add("card-delete");
  }
  const icon = document.createElement("span");
  icon.className = "icon-mask";
  icon.setAttribute("aria-hidden", "true");
  button.replaceChildren(icon);
  const label = options.label || "Delete";
  button.setAttribute("aria-label", label);
  button.title = label;
};

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const downloadJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const setActionStatus = (element, message, tone = "") => {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.style.color = tone === "error" ? "#b42318" : "";
};

const confirmDialog = ({
  title = "Confirm action",
  message = "Are you sure?",
  confirmText = "Delete",
  cancelText = "Cancel",
} = {}) => {
  const modal = elements.confirmModal;
  const titleEl = elements.confirmTitle;
  const messageEl = elements.confirmMessage;
  const acceptButton = elements.confirmAccept;
  const cancelButton = elements.confirmCancel;
  const closeButton = elements.confirmClose;

  if (!modal || !acceptButton || !cancelButton) {
    return Promise.resolve(window.confirm(message));
  }

  if (titleEl) {
    titleEl.textContent = title;
  }
  if (messageEl) {
    messageEl.textContent = message;
  }
  acceptButton.textContent = confirmText;
  cancelButton.textContent = cancelText;
  if (closeButton) {
    closeButton.textContent = "Close";
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    let settled = false;
    const handleAccept = () => close(true);
    const handleCancel = () => close(false);
    const handleBackdrop = (event) => {
      if (event.target === modal) {
        close(false);
      }
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };
    const cleanup = () => {
      acceptButton.removeEventListener("click", handleAccept);
      cancelButton.removeEventListener("click", handleCancel);
      if (closeButton) {
        closeButton.removeEventListener("click", handleCancel);
      }
      modal.removeEventListener("click", handleBackdrop);
      document.removeEventListener("keydown", handleKeydown);
    };
    const close = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      cleanup();
      resolve(result);
    };

    acceptButton.addEventListener("click", handleAccept);
    cancelButton.addEventListener("click", handleCancel);
    if (closeButton) {
      closeButton.addEventListener("click", handleCancel);
    }
    modal.addEventListener("click", handleBackdrop);
    document.addEventListener("keydown", handleKeydown);

    requestAnimationFrame(() => acceptButton.focus());
  });
};

const closeCardMenus = () => {
  qsa(".card-menu.open").forEach((menu) => {
    menu.classList.remove("open");
    const button = menu.querySelector(".menu-button");
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  });
};

const createCardMenu = (items) => {
  const wrapper = document.createElement("div");
  wrapper.className = "card-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button menu-button";
  button.setAttribute("aria-label", "Card actions");
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "menu-icon";
  for (let i = 0; i < 3; i += 1) {
    const bar = document.createElement("span");
    bar.className = "menu-bar";
    icon.appendChild(bar);
  }
  button.appendChild(icon);

  const panel = document.createElement("div");
  panel.className = "menu-panel";
  panel.setAttribute("role", "menu");

  items.forEach((item) => {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = `menu-item${item.tone === "danger" ? " danger" : ""}`;
    entry.textContent = item.label;
    entry.setAttribute("role", "menuitem");
    entry.addEventListener("click", async () => {
      closeCardMenus();
      await item.onClick();
    });
    panel.appendChild(entry);
  });

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.contains("open");
    closeCardMenus();
    if (!isOpen) {
      wrapper.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });

  wrapper.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  wrapper.append(button, panel);
  return wrapper;
};

const editTargetDialog = (target) => {
  const modal = elements.editTargetModal;
  const input = elements.editTargetInput;
  const saveButton = elements.editTargetSave;
  const cancelButton = elements.editTargetCancel;
  const closeButton = elements.editTargetClose;

  if (!modal || !input || !saveButton || !cancelButton) {
    return Promise.resolve(null);
  }

  input.value = target?.label || "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    let settled = false;
    const close = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      cleanup();
      resolve(result);
    };
    const handleSave = () => {
      input.value = input.value.trim();
      if (!input.reportValidity()) {
        return;
      }
      close(input.value);
    };
    const handleCancel = () => close(null);
    const handleBackdrop = (event) => {
      if (event.target === modal) {
        close(null);
      }
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      }
      if (event.key === "Enter" && event.target === input) {
        event.preventDefault();
        handleSave();
      }
    };
    const cleanup = () => {
      saveButton.removeEventListener("click", handleSave);
      cancelButton.removeEventListener("click", handleCancel);
      if (closeButton) {
        closeButton.removeEventListener("click", handleCancel);
      }
      modal.removeEventListener("click", handleBackdrop);
      document.removeEventListener("keydown", handleKeydown);
    };

    saveButton.addEventListener("click", handleSave);
    cancelButton.addEventListener("click", handleCancel);
    if (closeButton) {
      closeButton.addEventListener("click", handleCancel);
    }
    modal.addEventListener("click", handleBackdrop);
    document.addEventListener("keydown", handleKeydown);

    requestAnimationFrame(() => input.focus());
  });
};

const buildLogsUrl = (dateValue) => {
  const params = new URLSearchParams();
  if (dateValue) {
    params.set("date", dateValue);
  }
  const query = params.toString();
  return query ? `/api/logs?${query}` : "/api/logs";
};

const formatNumber = (value, precision = 1) => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(precision).replace(/\.0$/, "");
};

const parseNumeric = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTargetInput = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { value: null, allowOver: false, isValid: true };
  }
  const allowOver = raw.endsWith("+");
  const cleaned = allowOver ? raw.slice(0, -1).trim() : raw;
  if (!cleaned) {
    return { value: null, allowOver, isValid: !allowOver };
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: null, allowOver, isValid: false };
  }
  return { value: parsed, allowOver, isValid: true };
};

const formatTargetInputValue = (value, allowOver) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const base = String(value);
  return allowOver ? `${base}+` : base;
};

const isCoreTargetKey = (key) => CORE_TARGET_KEYS.has(key);

const getCoreTargetOption = (key) => CORE_TARGET_LOOKUP.get(key) || null;

const getCustomTargetOption = (key) =>
  CUSTOM_TARGET_LOOKUP.get(key) || null;

const getTargetOption = (key) =>
  getCustomTargetOption(key) || getCoreTargetOption(key);

const getCustomTargetData = (key) =>
  (state.customTargets || []).find((target) => target.key === key) || null;

const getCustomTargetLabel = (key) => {
  const target = getCustomTargetData(key);
  if (target?.label) {
    return target.label;
  }
  const option = getTargetOption(key);
  return option?.label || key;
};

const getCustomTargetUnit = (key) => {
  const target = getCustomTargetData(key);
  if (target?.unit) {
    return target.unit;
  }
  const option = getTargetOption(key);
  return option?.unit || "";
};

const deriveCoreTargets = (customTargets = []) => {
  const targetMap = new Map(customTargets.map((target) => [target.key, target]));
  const read = (key) => targetMap.get(key) || {};
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

const getAvailableTargetOptions = () => {
  const existingKeys = new Set(
    (state.customTargets || []).map((target) => target.key)
  );
  return [...CORE_TARGET_OPTIONS, ...CUSTOM_TARGET_OPTIONS].filter(
    (option) => !existingKeys.has(option.key)
  );
};

const setCustomTargetUnit = (key) => {
  const option = getTargetOption(key);
  if (elements.customTargetUnit) {
    elements.customTargetUnit.textContent = option?.unit || "";
  }
  return option;
};

const setStatus = (element, message, tone = "") => {
  if (!element) {
    return;
  }
  element.textContent = message;
  element.style.color = tone === "error" ? "#b42318" : "";
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEntryDayValue = (entry) => {
  if (entry?.intakeDate) {
    return entry.intakeDate;
  }
  const consumed = new Date(entry?.consumedAt || 0);
  if (Number.isNaN(consumed.getTime())) {
    return "";
  }
  return toDateInputValue(consumed);
};

const formatEntryTimestamp = (entry) => {
  const consumed = new Date(entry?.consumedAt || 0);
  if (Number.isNaN(consumed.getTime())) {
    return "";
  }
  const day = entry?.intakeDate
    ? new Date(`${entry.intakeDate}T00:00:00`)
    : consumed;
  const dateLabel = day.toLocaleDateString();
  const timeLabel = consumed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} · ${timeLabel}`;
};

const toLocalDateTimeValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

const parseQuantityValue = (value) => {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return null;
  }
  if (cleaned.includes(" ")) {
    const parts = cleaned.split(/\s+/);
    const whole = parseFloat(parts[0]);
    const fraction = parseQuantityValue(parts.slice(1).join(" "));
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
  const amount = parseQuantityValue(match[1] || "1");
  const unit = normalizeServingUnit(match[2]);
  if (!amount || !unit) {
    return null;
  }
  return { amount, unit };
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

const isSameDay = (date, target) =>
  date.getFullYear() === target.getFullYear() &&
  date.getMonth() === target.getMonth() &&
  date.getDate() === target.getDate();

const getStoredDayValue = () => {
  try {
    return localStorage.getItem(DAY_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
};

const setStoredDayValue = (value) => {
  if (!value) {
    return;
  }
  try {
    localStorage.setItem(DAY_STORAGE_KEY, value);
  } catch (error) {
    // Ignore storage errors (private mode, quota, etc.)
  }
};

const getSelectedDayValue = () => {
  const input = elements.dayInputs?.[0] || elements.daySelector || elements.logDateFilter;
  const inputValue = input?.value || "";
  return inputValue || getStoredDayValue();
};

const getSelectedDate = () => parseDateInput(getSelectedDayValue());

const setDayInputs = (value) => {
  if (!value) {
    return;
  }
  (elements.dayInputs || []).forEach((input) => {
    if (input.value !== value) {
      input.value = value;
    }
  });
  if (elements.daySelector && elements.daySelector.value !== value) {
    elements.daySelector.value = value;
  }
  if (elements.logDateFilter && elements.logDateFilter.value !== value) {
    elements.logDateFilter.value = value;
  }
};

const applySelectedDayValue = (value, options = {}) => {
  if (!value) {
    return;
  }
  setStoredDayValue(value);
  setDayInputs(value);
  if (!options.skipRefresh) {
    refreshLogs(value).catch((error) => {
      setStatus(elements.logStatus, error.message, "error");
    });
  }
};

const initializeDaySelection = () => {
  const stored = getStoredDayValue();
  const initial = parseDateInput(stored)
    ? stored
    : toDateInputValue(new Date());
  applySelectedDayValue(initial, { skipRefresh: true });
};

const shiftSelectedDay = (delta) => {
  const current = getSelectedDate() || new Date();
  const next = new Date(current);
  next.setDate(next.getDate() + delta);
  applySelectedDayValue(toDateInputValue(next));
};

const buildDetails = (title, entries, options = {}) => {
  if (!entries.length) {
    return null;
  }
  const details = document.createElement("details");
  details.className = "details-card";

  const summary = document.createElement("summary");
  summary.className = options.summaryClass || "";
  if (options.summaryContent) {
    summary.appendChild(options.summaryContent);
  } else {
    summary.textContent = options.summaryText || title;
  }

  let closeButton = null;
  if (!options.hideCloseButton) {
    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "details-close";
    closeButton.setAttribute("aria-label", "Close details");
    closeButton.textContent = "×";
  }

  const grid = document.createElement("div");
  grid.className = "details-grid";

  entries.forEach((entry) => {
    const line = document.createElement("span");
    const label = document.createElement("strong");
    label.textContent = `${entry.label}:`;
    line.append(label, ` ${entry.value}`);
    if (entry.wide) {
      line.classList.add("span-all");
    }
    grid.appendChild(line);
  });

  if (closeButton) {
    details.append(summary, closeButton, grid);
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      details.removeAttribute("open");
    });
  } else {
    details.append(summary, grid);
  }

  return details;
};

const getExtraConfig = (name) =>
  EXTRA_NUTRIENTS.find((nutrient) => nutrient.name === name);

const updateExtraNutrientSelect = () => {
  if (!elements.extraNutrientSelect || !elements.extraNutrients) {
    return;
  }
  const existing = new Set(
    qsa("[data-nutrient]", elements.extraNutrients).map(
      (node) => node.dataset.nutrient
    )
  );
  elements.extraNutrientSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a nutrient";
  elements.extraNutrientSelect.appendChild(placeholder);

  EXTRA_NUTRIENTS.filter((nutrient) => !existing.has(nutrient.name)).forEach(
    (nutrient) => {
      const option = document.createElement("option");
      option.value = nutrient.name;
      option.textContent = nutrient.label;
      elements.extraNutrientSelect.appendChild(option);
    }
  );

  elements.extraNutrientSelect.disabled =
    elements.extraNutrientSelect.options.length === 1;
  if (elements.addNutrient) {
    elements.addNutrient.disabled = elements.extraNutrientSelect.disabled;
  }
};

const createExtraField = (name, value = "") => {
  if (!elements.extraNutrients) {
    return;
  }
  const config = getExtraConfig(name);
  if (!config) {
    return;
  }
  const existing = elements.extraNutrients.querySelector(
    `[data-nutrient="${name}"]`
  );
  if (existing) {
    const input = existing.querySelector("input");
    if (input && value !== undefined && value !== null) {
      input.value = value;
    }
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "extra-nutrient";
  wrapper.dataset.nutrient = name;

  const label = document.createElement("label");
  label.textContent = config.label;

  const input = document.createElement("input");
  input.name = config.name;
  input.type = "number";
  input.step = config.step || "0.01";
  input.value = value ?? "";

  label.appendChild(input);

  const actions = document.createElement("div");
  actions.className = "field-actions";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    wrapper.remove();
    updateExtraNutrientSelect();
  });

  actions.appendChild(remove);
  wrapper.append(label, actions);
  elements.extraNutrients.appendChild(wrapper);
  updateExtraNutrientSelect();
};

const resetExtraNutrients = () => {
  if (!elements.extraNutrients) {
    return;
  }
  elements.extraNutrients.innerHTML = "";
  updateExtraNutrientSelect();
};

const updateFoodExtraNutrientSelect = () => {
  if (!elements.foodExtraNutrients || !elements.foodExtraNutrientSelect) {
    return;
  }
  const existing = new Set(
    qsa("[data-nutrient]", elements.foodExtraNutrients).map(
      (node) => node.dataset.nutrient
    )
  );
  elements.foodExtraNutrientSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a nutrient";
  elements.foodExtraNutrientSelect.appendChild(placeholder);

  EXTRA_NUTRIENTS.filter((nutrient) => !existing.has(nutrient.name)).forEach(
    (nutrient) => {
      const option = document.createElement("option");
      option.value = nutrient.name;
      option.textContent = nutrient.label;
      elements.foodExtraNutrientSelect.appendChild(option);
    }
  );

  elements.foodExtraNutrientSelect.disabled =
    elements.foodExtraNutrientSelect.options.length === 1;
  if (elements.addFoodNutrient) {
    elements.addFoodNutrient.disabled =
      elements.foodExtraNutrientSelect.disabled;
  }
};

const createFoodExtraField = (name, value = "") => {
  if (!elements.foodExtraNutrients) {
    return;
  }
  const config = getExtraConfig(name);
  if (!config) {
    return;
  }
  const existing = elements.foodExtraNutrients.querySelector(
    `[data-nutrient="${name}"]`
  );
  if (existing) {
    const input = existing.querySelector("input");
    if (input && value !== undefined && value !== null) {
      input.value = value;
    }
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "extra-nutrient";
  wrapper.dataset.nutrient = name;

  const label = document.createElement("label");
  label.textContent = config.label;

  const input = document.createElement("input");
  input.name = config.name;
  input.type = "number";
  input.step = config.step || "0.01";
  input.value = value ?? "";

  label.appendChild(input);

  const actions = document.createElement("div");
  actions.className = "field-actions";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    wrapper.remove();
    updateFoodExtraNutrientSelect();
  });

  actions.appendChild(remove);
  wrapper.append(label, actions);
  elements.foodExtraNutrients.appendChild(wrapper);
  updateFoodExtraNutrientSelect();
};

const resetFoodExtraNutrients = () => {
  if (!elements.foodExtraNutrients) {
    return;
  }
  elements.foodExtraNutrients.innerHTML = "";
  updateFoodExtraNutrientSelect();
};

const renderIngredients = () => {
  if (!elements.ingredientList) {
    return;
  }
  const search = elements.ingredientSearch
    ? elements.ingredientSearch.value.trim().toLowerCase()
    : "";
  const items = search
    ? state.ingredients.filter((item) =>
        item.name.toLowerCase().includes(search)
      )
    : state.ingredients;

  elements.ingredientList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = "No ingredients yet.";
    elements.ingredientList.appendChild(empty);
    return;
  }

  items.forEach((ingredient) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const title = document.createElement("h4");
    title.textContent = ingredient.name;

    const summary = document.createElement("div");
    summary.className = "meta";
    summary.textContent = `${formatNumber(ingredient.calories)} cal, ${formatNumber(
      ingredient.protein
    )}p, ${formatNumber(ingredient.carbs)}c, ${formatNumber(
      ingredient.fat
    )}f per ${ingredient.unit}`;

    const barcode = document.createElement("div");
    barcode.className = "meta";
    barcode.textContent = ingredient.barcode
      ? `Barcode: ${ingredient.barcode}`
      : "Barcode: none";

    const entries = [];
    if (ingredient.servingSize) {
      entries.push({ label: "Serving size", value: ingredient.servingSize });
    }
    if (ingredient.servingsPerContainer) {
      entries.push({
        label: "Servings per container",
        value: ingredient.servingsPerContainer,
      });
    }
    if (ingredient.ingredientsList) {
      entries.push({
        label: "Ingredients",
        value: ingredient.ingredientsList,
        wide: true,
      });
    }
    if (ingredient.allergens) {
      entries.push({
        label: "Allergens",
        value: ingredient.allergens,
        wide: true,
      });
    }
    if (ingredient.vitamins) {
      entries.push({
        label: "Other vitamins",
        value: ingredient.vitamins,
        wide: true,
      });
    }

    const extraFacts = [
      ["Saturated fat", ingredient.saturatedFat, "g"],
      ["Trans fat", ingredient.transFat, "g"],
      ["Cholesterol", ingredient.cholesterolMg, "mg"],
      ["Sodium", ingredient.sodiumMg, "mg"],
      ["Dietary fiber", ingredient.dietaryFiber, "g"],
      ["Total sugars", ingredient.totalSugars, "g"],
      ["Added sugars", ingredient.addedSugars, "g"],
      ["Vitamin D", ingredient.vitaminDMcg, "mcg"],
      ["Calcium", ingredient.calciumMg, "mg"],
      ["Iron", ingredient.ironMg, "mg"],
      ["Potassium", ingredient.potassiumMg, "mg"],
    ];

    extraFacts.forEach(([label, value, unit]) => {
      if (value === null || value === undefined) {
        return;
      }
      entries.push({
        label,
        value: `${formatNumber(value)} ${unit}`.trim(),
      });
    });

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    const summaryText = document.createElement("span");
    summaryText.className = "meta details-summary-text";
    summaryText.textContent = "Full label details";
    summaryContent.append(summaryToggle, summaryText);

    const details = buildDetails("Full label details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const menu = createCardMenu([
      {
        label: "Edit",
        onClick: async () => {
          setIngredientFormMode(ingredient);
          if (elements.ingredientForm) {
            elements.ingredientForm.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        },
      },
      {
        label: "Move to food",
        onClick: async () => {
          await convertIngredientToFood(ingredient);
        },
      },
      {
        label: "Delete ingredient",
        tone: "danger",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Delete ingredient",
            message: `Delete ${ingredient.name}? Recipes and logs will keep the ingredient details.`,
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.ingredientStatus, "Deleting...");
            await api(`/api/ingredients/${ingredient.id}`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.ingredientStatus, "Ingredient deleted.");
          } catch (error) {
            setStatus(elements.ingredientStatus, error.message, "error");
          }
        },
      },
    ]);

    card.classList.add("has-menu");

    card.append(title, summary, barcode, menu);
    if (details) {
      card.appendChild(details);
    }
    elements.ingredientList.appendChild(card);
  });
};

const renderFoods = () => {
  if (!elements.foodList) {
    return;
  }
  const search = elements.foodSearch
    ? elements.foodSearch.value.trim().toLowerCase()
    : "";
  const items = search
    ? state.foods.filter((item) => item.name.toLowerCase().includes(search))
    : state.foods;

  elements.foodList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = "No foods yet.";
    elements.foodList.appendChild(empty);
    return;
  }

  items.forEach((food) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const title = document.createElement("h4");
    title.textContent = food.name;

    const summary = document.createElement("div");
    summary.className = "meta";
    summary.textContent = `${formatNumber(food.calories)} cal, ${formatNumber(
      food.protein
    )}p, ${formatNumber(food.carbs)}c, ${formatNumber(food.fat)}f per ${food.unit}`;

    const barcode = document.createElement("div");
    barcode.className = "meta";
    barcode.textContent = food.barcode ? `Barcode: ${food.barcode}` : "Barcode: none";

    const entries = [];
    if (food.servingSize) {
      entries.push({ label: "Serving size", value: food.servingSize });
    }
    if (food.servingsPerContainer) {
      entries.push({
        label: "Servings per container",
        value: food.servingsPerContainer,
      });
    }
    if (food.ingredientsList) {
      entries.push({
        label: "Ingredients",
        value: food.ingredientsList,
        wide: true,
      });
    }
    if (food.allergens) {
      entries.push({
        label: "Allergens",
        value: food.allergens,
        wide: true,
      });
    }
    if (food.vitamins) {
      entries.push({
        label: "Other vitamins",
        value: food.vitamins,
        wide: true,
      });
    }

    const extraFacts = [
      ["Saturated fat", food.saturatedFat, "g"],
      ["Trans fat", food.transFat, "g"],
      ["Cholesterol", food.cholesterolMg, "mg"],
      ["Sodium", food.sodiumMg, "mg"],
      ["Dietary fiber", food.dietaryFiber, "g"],
      ["Total sugars", food.totalSugars, "g"],
      ["Added sugars", food.addedSugars, "g"],
      ["Vitamin D", food.vitaminDMcg, "mcg"],
      ["Calcium", food.calciumMg, "mg"],
      ["Iron", food.ironMg, "mg"],
      ["Potassium", food.potassiumMg, "mg"],
    ];

    extraFacts.forEach(([label, value, unit]) => {
      if (value === null || value === undefined) {
        return;
      }
      entries.push({
        label,
        value: `${formatNumber(value)} ${unit}`.trim(),
      });
    });

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    const summaryText = document.createElement("span");
    summaryText.className = "meta details-summary-text";
    summaryText.textContent = "Full label details";
    summaryContent.append(summaryToggle, summaryText);

    const details = buildDetails("Full label details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const menu = createCardMenu([
      {
        label: "Edit",
        onClick: async () => {
          setFoodFormMode(food);
          if (elements.foodForm) {
            elements.foodForm.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        },
      },
      {
        label: "Move to ingredient",
        onClick: async () => {
          await convertFoodToIngredient(food);
        },
      },
      {
        label: "Delete food",
        tone: "danger",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Delete food",
            message: `Delete ${food.name}? Logs will keep the food details.`,
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.foodStatus, "Deleting...");
            await api(`/api/foods/${food.id}`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.foodStatus, "Food deleted.");
          } catch (error) {
            setStatus(elements.foodStatus, error.message, "error");
          }
        },
      },
    ]);

    card.classList.add("has-menu");

    card.append(title, summary, barcode, menu);
    if (details) {
      card.appendChild(details);
    }
    elements.foodList.appendChild(card);
  });
};

const buildLibraryPayload = (item) => ({
  name: item?.name ?? "",
  barcode: item?.barcode ?? "",
  calories: item?.calories ?? 0,
  protein: item?.protein ?? 0,
  carbs: item?.carbs ?? 0,
  fat: item?.fat ?? 0,
  unit: item?.unit ?? "",
  servingSize: item?.servingSize ?? "",
  servingsPerContainer: item?.servingsPerContainer ?? "",
  saturatedFat: item?.saturatedFat ?? "",
  transFat: item?.transFat ?? "",
  cholesterolMg: item?.cholesterolMg ?? "",
  sodiumMg: item?.sodiumMg ?? "",
  dietaryFiber: item?.dietaryFiber ?? "",
  totalSugars: item?.totalSugars ?? "",
  addedSugars: item?.addedSugars ?? "",
  vitaminDMcg: item?.vitaminDMcg ?? "",
  calciumMg: item?.calciumMg ?? "",
  ironMg: item?.ironMg ?? "",
  potassiumMg: item?.potassiumMg ?? "",
  ingredientsList: item?.ingredientsList ?? "",
  vitamins: item?.vitamins ?? "",
  allergens: item?.allergens ?? "",
});

const convertIngredientToFood = async (ingredient) => {
  if (!ingredient) {
    return;
  }
  if (
    ingredient.barcode &&
    state.foods.some((food) => food.barcode === ingredient.barcode)
  ) {
    setStatus(
      elements.ingredientStatus,
      "Food with that barcode already exists. Remove it or clear the barcode first.",
      "error"
    );
    return;
  }

  const confirmed = await confirmDialog({
    title: "Move to food",
    message: `Move ${ingredient.name} to foods? Recipes and logs will keep the ingredient details.`,
    confirmText: "Move",
    cancelText: "Cancel",
  });
  if (!confirmed) {
    return;
  }

  try {
    setStatus(elements.ingredientStatus, "Moving...");
    await api("/api/foods", {
      method: "POST",
      body: buildLibraryPayload(ingredient),
    });
    await api(`/api/ingredients/${ingredient.id}`, { method: "DELETE" });
    await refreshData();
    setStatus(elements.ingredientStatus, "Moved to foods.");
  } catch (error) {
    setStatus(elements.ingredientStatus, error.message, "error");
  }
};

const convertFoodToIngredient = async (food) => {
  if (!food) {
    return;
  }
  if (
    food.barcode &&
    state.ingredients.some((ingredient) => ingredient.barcode === food.barcode)
  ) {
    setStatus(
      elements.foodStatus,
      "Ingredient with that barcode already exists. Remove it or clear the barcode first.",
      "error"
    );
    return;
  }

  const confirmed = await confirmDialog({
    title: "Move to ingredient",
    message: `Move ${food.name} to ingredients? Logs will keep the food details.`,
    confirmText: "Move",
    cancelText: "Cancel",
  });
  if (!confirmed) {
    return;
  }

  try {
    setStatus(elements.foodStatus, "Moving...");
    await api("/api/ingredients", {
      method: "POST",
      body: buildLibraryPayload(food),
    });
    await api(`/api/foods/${food.id}`, { method: "DELETE" });
    await refreshData();
    setStatus(elements.foodStatus, "Moved to ingredients.");
  } catch (error) {
    setStatus(elements.foodStatus, error.message, "error");
  }
};

const updateRecipeOverview = () => {
  if (!elements.recipeCalories || !elements.recipeItems) {
    return;
  }

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const customTotals = {};
  CUSTOM_TARGET_OPTIONS.forEach((option) => {
    customTotals[option.key] = 0;
  });
  const targets = state.targets || {};
  const rows = Array.from(
    elements.recipeItems.querySelectorAll(".recipe-item-row")
  );

  rows.forEach((row) => {
    const select = row.querySelector("select");
    const inputs = row.querySelectorAll("input");
    const quantityInput = inputs[0];
    const unitInput = inputs[1];
    const ingredientId = Number(select?.value);
    const ingredient = state.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }
    const quantity = Math.max(parseNumeric(quantityInput?.value, 1), 0);
    const unit = String(unitInput?.value || ingredient.unit || "").trim();
    const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
    if (normalized.error) {
      return;
    }
    totals.calories += parseNumeric(ingredient.calories, 0) * normalized.quantity;
    totals.protein += parseNumeric(ingredient.protein, 0) * normalized.quantity;
    totals.carbs += parseNumeric(ingredient.carbs, 0) * normalized.quantity;
    totals.fat += parseNumeric(ingredient.fat, 0) * normalized.quantity;
    CUSTOM_TARGET_OPTIONS.forEach((option) => {
      customTotals[option.key] +=
        parseNumeric(ingredient[option.key], 0) * normalized.quantity;
    });
  });

  elements.recipeCalories.textContent = formatNumber(totals.calories, 0);
  if (elements.recipeProtein) {
    elements.recipeProtein.textContent = `${formatNumber(totals.protein)}g`;
  }
  if (elements.recipeCarbs) {
    elements.recipeCarbs.textContent = `${formatNumber(totals.carbs)}g`;
  }
  if (elements.recipeFat) {
    elements.recipeFat.textContent = `${formatNumber(totals.fat)}g`;
  }

  setProgressBar(
    elements.recipeCaloriesProgress,
    totals.calories,
    targets.calories
  );
  setProgressBar(elements.recipeProteinProgress, totals.protein, targets.protein);
  setProgressBar(elements.recipeCarbsProgress, totals.carbs, targets.carbs);
  setProgressBar(elements.recipeFatProgress, totals.fat, targets.fat);

  if (elements.recipeCaloriesMeta && elements.recipeForm) {
    const servingsInput = elements.recipeForm.querySelector("[name='servings']");
    const servingsRaw = parseNumeric(servingsInput?.value, 1);
    const servings = Math.max(1, Math.round(servingsRaw));
    const servingsLabel =
      servings === 1 ? "Total recipe" : `${servings} servings`;
    const caloriesTarget = formatTarget(
      targets.calories,
      " cal",
      Boolean(targets.caloriesAllowOver)
    );
    elements.recipeCaloriesMeta.textContent = caloriesTarget
      ? `Target: ${caloriesTarget} · ${servingsLabel}`
      : servingsLabel;
  }

  if (elements.recipeProteinMeta) {
    const proteinTarget = formatTarget(
      targets.protein,
      "g",
      Boolean(targets.proteinAllowOver)
    );
    elements.recipeProteinMeta.textContent = proteinTarget
      ? `Target: ${proteinTarget}`
      : "Target not set";
  }
  if (elements.recipeCarbsMeta) {
    const carbsTarget = formatTarget(
      targets.carbs,
      "g",
      Boolean(targets.carbsAllowOver)
    );
    elements.recipeCarbsMeta.textContent = carbsTarget
      ? `Target: ${carbsTarget}`
      : "Target not set";
  }
  if (elements.recipeFatMeta) {
    const fatTarget = formatTarget(
      targets.fat,
      "g",
      Boolean(targets.fatAllowOver)
    );
    elements.recipeFatMeta.textContent = fatTarget
      ? `Target: ${fatTarget}`
      : "Target not set";
  }

  renderRecipeCustomTargets(customTotals);
};

const renderRecipeCustomTargets = (totals) => {
  if (!elements.recipeCustomTargetsList || !elements.recipeCustomTargetsEmpty) {
    return;
  }
  const targets = (state.customTargets || []).filter(
    (target) => !isCoreTargetKey(target.key)
  );
  elements.recipeCustomTargetsList.innerHTML = "";
  if (!targets.length) {
    elements.recipeCustomTargetsEmpty.hidden = false;
    return;
  }
  elements.recipeCustomTargetsEmpty.hidden = true;

  targets.forEach((target) => {
    const current = parseNumeric(totals?.[target.key], 0);
    const targetValue = parseNumeric(target.target, 0);
    const unit = target.unit || getCustomTargetOption(target.key)?.unit || "";
    const percent =
      targetValue > 0 ? Math.min(100, (current / targetValue) * 100) : 0;

    const item = document.createElement("div");
    item.className = "macro-item custom-target-item";
    if (!target.allowOver && targetValue > 0 && current > targetValue) {
      item.classList.add("is-over");
    }

    const label = document.createElement("span");
    label.className = "macro-label";
    label.textContent = target.label;

    const value = document.createElement("h3");
    value.textContent = `${formatNumber(current)}${unit}`;

    const progress = document.createElement("div");
    progress.className = "progress small";
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = `${percent}%`;
    progress.appendChild(bar);

    const meta = document.createElement("span");
    meta.className = "meta";
    const suffix = target.allowOver ? "+" : "";
    meta.textContent = `Target: ${formatNumber(targetValue)}${unit}${suffix}`;

    item.append(label, value, progress, meta);
    elements.recipeCustomTargetsList.appendChild(item);
  });
};

const renderRecipeItems = () => {
  if (!elements.recipeItems) {
    return;
  }
  elements.recipeItems.innerHTML = "";
  if (!state.ingredients.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "Add ingredients before building recipes.";
    elements.recipeItems.appendChild(empty);
    updateRecipeOverview();
    return;
  }
  addRecipeRow();
  updateRecipeOverview();
};

const addRecipeRow = () => {
  if (!elements.recipeItems) {
    return;
  }
  const row = document.createElement("div");
  row.className = "recipe-item-row";

  const select = document.createElement("select");
  state.ingredients.forEach((ingredient) => {
    const option = document.createElement("option");
    option.value = ingredient.id;
    option.textContent = ingredient.name;
    option.dataset.unit = ingredient.unit;
    select.appendChild(option);
  });

  const quantity = document.createElement("input");
  quantity.type = "number";
  quantity.step = "0.01";
  quantity.value = "1";

  const unit = document.createElement("input");
  unit.type = "text";
  unit.value = state.ingredients[0]?.unit || "";

  select.addEventListener("change", () => {
    const selected = select.options[select.selectedIndex];
    if (selected?.dataset.unit) {
      unit.value = selected.dataset.unit;
    }
    updateRecipeOverview();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    row.remove();
    updateRecipeOverview();
  });

  row.append(select, quantity, unit, remove);
  elements.recipeItems.appendChild(row);
  quantity.addEventListener("input", updateRecipeOverview);
  unit.addEventListener("input", updateRecipeOverview);
  updateRecipeOverview();
};

const renderRecipes = () => {
  if (!elements.recipeList) {
    return;
  }
  elements.recipeList.innerHTML = "";
  if (!state.recipes.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = "No recipes yet.";
    elements.recipeList.appendChild(empty);
    return;
  }

  state.recipes.forEach((recipe) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const title = document.createElement("h4");
    title.textContent = recipe.name;

    const summary = document.createElement("div");
    summary.className = "meta";
    summary.textContent = `${recipe.servings} servings`;

    const perServingText = `Per serving: ${formatNumber(
      recipe.nutrition.perServing.calories
    )} cal, ${formatNumber(recipe.nutrition.perServing.protein)}p, ${formatNumber(
      recipe.nutrition.perServing.carbs
    )}c, ${formatNumber(recipe.nutrition.perServing.fat)}f`;

    const totalLine = `Total: ${formatNumber(
      recipe.nutrition.totals.calories
    )} cal, ${formatNumber(recipe.nutrition.totals.protein)}p, ${formatNumber(
      recipe.nutrition.totals.carbs
    )}c, ${formatNumber(recipe.nutrition.totals.fat)}f`;

    const ingredientsLine = recipe.items
      .map(
        (item) => `${item.ingredient.name} ${item.quantity} ${item.unit || ""}`
      )
      .join(", ");

    const entries = [
      { label: "Per serving", value: perServingText.replace("Per serving: ", "") },
      { label: "Total", value: totalLine.replace("Total: ", "") },
    ];

    if (ingredientsLine) {
      entries.push({ label: "Ingredients", value: ingredientsLine, wide: true });
    }
    if (recipe.notes) {
      entries.push({ label: "Notes", value: recipe.notes, wide: true });
    }

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    const summaryText = document.createElement("span");
    summaryText.className = "meta details-summary-text";
    summaryText.textContent = perServingText;
    summaryContent.append(summaryToggle, summaryText);

    const details = buildDetails("Full recipe details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    card.classList.add("has-delete");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    setupDeleteButton(deleteButton, { label: "Delete recipe", card: true });
    deleteButton.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: "Delete recipe",
        message: `Delete ${recipe.name}? Logged intakes will keep the recipe details.`,
      });
      if (!confirmed) {
        return;
      }
      try {
        setStatus(elements.recipeStatus, "Deleting...");
        await api(`/api/recipes/${recipe.id}`, { method: "DELETE" });
        await refreshData();
        setStatus(elements.recipeStatus, "Recipe deleted.");
      } catch (error) {
        setStatus(elements.recipeStatus, error.message, "error");
      }
    });

    card.append(title, summary);
    if (details) {
      card.appendChild(details);
    }
    card.appendChild(deleteButton);

    elements.recipeList.appendChild(card);
  });
};

const renderLogList = () => {
  if (!elements.logList) {
    return;
  }
  elements.logList.innerHTML = "";
  const selectedDayValue = getSelectedDayValue();
  const filteredLogs = selectedDayValue
    ? state.logs.filter(
        (entry) => getEntryDayValue(entry) === selectedDayValue
      )
    : state.logs;
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => parseNumeric(b.consumedAt, 0) - parseNumeric(a.consumedAt, 0)
  );

  if (!sortedLogs.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = selectedDayValue
      ? "No logs for this day."
      : "No logs yet.";
    elements.logList.appendChild(empty);
    return;
  }

  const limit = Number(elements.logList.dataset.limit || 0);
  const entries = limit ? sortedLogs.slice(0, limit) : sortedLogs;

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const title = document.createElement("h4");
    title.textContent = entry.label || "Entry";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${formatNumber(entry.quantity)} ${entry.unit} · ${formatEntryTimestamp(
      entry
    )}`;

    const macrosSummary = document.createElement("span");
    macrosSummary.className = "meta details-summary-text";
    const baseSummary = `${formatNumber(
      entry.nutrition.calories
    )} cal, ${formatNumber(entry.nutrition.protein)}p, ${formatNumber(
      entry.nutrition.carbs
    )}c, ${formatNumber(entry.nutrition.fat)}f`;
    const customSummary = (state.customTargets || [])
      .filter((target) => !isCoreTargetKey(target.key))
      .map((target) => {
        const unit = getCustomTargetUnit(target.key);
        const value = parseNumeric(entry?.nutrition?.[target.key], 0);
        return `${target.label}: ${formatNumber(value)}${unit}`.trim();
      });
    macrosSummary.textContent = customSummary.length
      ? `${baseSummary} · ${customSummary.join(" · ")}`
      : baseSummary;

    const detailEntries = [];
    if (entry.notes) {
      detailEntries.push({ label: "Notes", value: entry.notes, wide: true });
    }
    detailEntries.push({
      label: "Calories",
      value: `${formatNumber(entry.nutrition.calories)} cal`,
    });
    detailEntries.push({
      label: "Protein",
      value: `${formatNumber(entry.nutrition.protein)} g`,
    });
    detailEntries.push({
      label: "Carbs",
      value: `${formatNumber(entry.nutrition.carbs)} g`,
    });
    detailEntries.push({
      label: "Fat",
      value: `${formatNumber(entry.nutrition.fat)} g`,
    });
    CUSTOM_TARGET_OPTIONS.forEach((target) => {
      const unit = getCustomTargetUnit(target.key);
      const label = getCustomTargetLabel(target.key);
      const value = parseNumeric(entry?.nutrition?.[target.key], 0);
      detailEntries.push({
        label,
        value: `${formatNumber(value)} ${unit}`.trim(),
      });
    });

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    summaryContent.append(summaryToggle, macrosSummary);
    const details = buildDetails("Full entry details", detailEntries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    setupDeleteButton(deleteButton, { label: "Delete log entry", card: true });
    deleteButton.addEventListener("click", async () => {
      const confirmed = await confirmDialog({
        title: "Delete log entry",
        message: "Delete this log entry?",
      });
      if (!confirmed) {
        return;
      }
      try {
        setStatus(elements.logStatus, "Deleting...");
        await api(`/api/logs/${entry.id}`, { method: "DELETE" });
        await refreshLogs(getSelectedDayValue());
        setStatus(elements.logStatus, "Log entry deleted.");
      } catch (error) {
        setStatus(elements.logStatus, error.message, "error");
      }
    });

    card.classList.add("has-delete");
    card.append(title, meta);
    if (details) {
      card.appendChild(details);
    }
    card.appendChild(deleteButton);

    elements.logList.appendChild(card);
  });
};

const getSelectedDayTotals = () => {
  const targetValue = getSelectedDayValue() || toDateInputValue(new Date());
  return state.logs.reduce(
    (acc, entry) => {
      if (getEntryDayValue(entry) !== targetValue) {
        return acc;
      }
      acc.calories += entry.nutrition.calories;
      acc.protein += entry.nutrition.protein;
      acc.carbs += entry.nutrition.carbs;
      acc.fat += entry.nutrition.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

const updateTodayStats = () => {
  const totals = getSelectedDayTotals();

  if (elements.todayCalories) {
    elements.todayCalories.textContent = formatNumber(totals.calories, 0);
  }
  if (elements.todayProtein) {
    elements.todayProtein.textContent = `${formatNumber(totals.protein)}g`;
  }
  if (elements.todayCarbs) {
    elements.todayCarbs.textContent = `${formatNumber(totals.carbs)}g`;
  }
  if (elements.todayFat) {
    elements.todayFat.textContent = `${formatNumber(totals.fat)}g`;
  }

  updateProgressBars(totals);
  updateLogImpact();
  renderCustomTargetsPanel();
};

const setProgressBar = (bar, value, target) => {
  if (!bar) {
    return;
  }
  if (!target || !Number.isFinite(target) || target <= 0) {
    bar.style.width = "0%";
    return;
  }
  const percent = Math.min(100, (value / target) * 100);
  bar.style.width = `${percent}%`;
};

const setImpactBar = (bar, value, target, options = {}) => {
  if (!bar) {
    return;
  }
  const numericTarget = parseNumeric(target, 0);
  if (!numericTarget || numericTarget <= 0) {
    bar.style.width = "0%";
    bar.classList.remove("is-over");
    return;
  }
  const numericValue = parseNumeric(value, 0);
  const percent = Math.min(100, (numericValue / numericTarget) * 100);
  bar.style.width = `${percent}%`;
  if (options.warnOver) {
    bar.classList.toggle("is-over", numericValue > numericTarget);
  } else {
    bar.classList.remove("is-over");
  }
};

const formatTarget = (value, unit, allowOver = false) => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const suffix = allowOver ? "+" : "";
  return `${formatNumber(value)}${unit}${suffix}`;
};

const updateProgressBars = (totals) => {
  const targets = state.targets || {};
  setProgressBar(elements.caloriesProgress, totals.calories, targets.calories);
  setProgressBar(elements.proteinProgress, totals.protein, targets.protein);
  setProgressBar(elements.carbsProgress, totals.carbs, targets.carbs);
  setProgressBar(elements.fatProgress, totals.fat, targets.fat);

  if (elements.caloriesTarget) {
    const caloriesTarget = formatTarget(
      targets.calories,
      "",
      Boolean(targets.caloriesAllowOver)
    );
    elements.caloriesTarget.textContent = caloriesTarget
      ? `Target: ${caloriesTarget}`
      : "Target not set";
  }
  if (elements.proteinTarget) {
    const proteinTarget = formatTarget(
      targets.protein,
      "g",
      Boolean(targets.proteinAllowOver)
    );
    elements.proteinTarget.textContent = proteinTarget
      ? `Target: ${proteinTarget}`
      : "Protein";
  }
  if (elements.carbsTarget) {
    const carbsTarget = formatTarget(
      targets.carbs,
      "g",
      Boolean(targets.carbsAllowOver)
    );
    elements.carbsTarget.textContent = carbsTarget
      ? `Target: ${carbsTarget}`
      : "Carbs";
  }
  if (elements.fatTarget) {
    const fatTarget = formatTarget(
      targets.fat,
      "g",
      Boolean(targets.fatAllowOver)
    );
    elements.fatTarget.textContent = fatTarget
      ? `Target: ${fatTarget}`
      : "Fat";
  }
};

const getSelectedDayNutrientTotals = (keys) => {
  const totals = {};
  keys.forEach((key) => {
    totals[key] = 0;
  });
  if (!keys.length) {
    return totals;
  }
  const targetValue = getSelectedDayValue() || toDateInputValue(new Date());
  state.logs.forEach((entry) => {
    if (getEntryDayValue(entry) !== targetValue) {
      return;
    }
    keys.forEach((key) => {
      totals[key] += parseNumeric(entry?.nutrition?.[key], 0);
    });
  });
  return totals;
};

const renderCustomTargetsPanel = () => {
  if (!elements.customTargetsList || !elements.customTargetsEmpty) {
    return;
  }
  const targets = (state.customTargets || []).filter(
    (target) => !isCoreTargetKey(target.key)
  );
  elements.customTargetsList.innerHTML = "";
  if (!targets.length) {
    elements.customTargetsEmpty.hidden = false;
    return;
  }
  elements.customTargetsEmpty.hidden = true;

  const totals = getSelectedDayNutrientTotals(
    targets.map((target) => target.key)
  );
  const impactTotals = state.logImpact || {};

  targets.forEach((target) => {
    const current = parseNumeric(totals[target.key], 0);
    const impactValue = parseNumeric(impactTotals[target.key], 0);
    const projectedValue = current + impactValue;
    const targetValue = parseNumeric(target.target, 0);
    const unit = target.unit || getCustomTargetOption(target.key)?.unit || "";
    const percent =
      targetValue > 0 ? Math.min(100, (current / targetValue) * 100) : 0;
    const projectedPercent =
      targetValue > 0
        ? Math.min(100, (projectedValue / targetValue) * 100)
        : 0;
    const item = document.createElement("div");
    item.className = "macro-item custom-target-item";
    if (!target.allowOver && targetValue > 0 && current > targetValue) {
      item.classList.add("is-over");
    }

    const label = document.createElement("span");
    label.className = "macro-label";
    label.textContent = target.label;

    const value = document.createElement("h3");
    value.textContent = `${formatNumber(current)}${unit}`;

    const progress = document.createElement("div");
    progress.className = "progress small";
    const impactBar = document.createElement("div");
    impactBar.className = "progress-bar secondary";
    impactBar.style.width = `${projectedPercent}%`;
    if (!target.allowOver && targetValue > 0 && projectedValue > targetValue) {
      impactBar.classList.add("is-over");
    }
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = `${percent}%`;
    progress.append(impactBar, bar);

    const meta = document.createElement("span");
    meta.className = "meta";
    const suffix = target.allowOver ? "+" : "";
    meta.textContent = `Target: ${formatNumber(targetValue)}${unit}${suffix}`;

    item.append(label, value, progress, meta);
    elements.customTargetsList.appendChild(item);
  });
};

const populateCustomTargetSelect = () => {
  if (!elements.customTargetKey) {
    return [];
  }
  elements.customTargetKey.innerHTML = "";
  const options = getAvailableTargetOptions();
  if (!options.length) {
    const item = document.createElement("option");
    item.value = "";
    item.textContent = "All targets added";
    elements.customTargetKey.appendChild(item);
  } else {
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.key;
      item.textContent = `${option.label} (${option.unit})`;
      elements.customTargetKey.appendChild(item);
    });
  }
  elements.customTargetKey.disabled = !options.length;
  if (elements.customTargetSubmit) {
    elements.customTargetSubmit.disabled = !options.length;
  }
  return options;
};

const resetCustomTargetForm = () => {
  if (!elements.customTargetForm) {
    return;
  }
  elements.customTargetForm.reset();
  const options = populateCustomTargetSelect();
  if (elements.customTargetKey) {
    elements.customTargetKey.disabled = !options.length;
    const defaultKey = options[0]?.key || "";
    elements.customTargetKey.value = defaultKey;
    setCustomTargetUnit(defaultKey);
  }
  if (elements.customTargetSubmit) {
    elements.customTargetSubmit.textContent = "Add";
  }
};

const renderCustomTargetList = () => {
  if (!elements.customTargetList) {
    return;
  }
  const targets = state.customTargets || [];
  const coreOrder = new Map(
    CORE_TARGET_OPTIONS.map((option, index) => [option.key, index])
  );
  const orderedTargets = [...targets].sort((a, b) => {
    const aCore = coreOrder.has(a.key);
    const bCore = coreOrder.has(b.key);
    if (aCore && bCore) {
      return coreOrder.get(a.key) - coreOrder.get(b.key);
    }
    if (aCore) {
      return -1;
    }
    if (bCore) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });
  elements.customTargetList.innerHTML = "";
  if (!orderedTargets.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "No targets yet.";
    elements.customTargetList.appendChild(empty);
    return;
  }

  orderedTargets.forEach((target) => {
    const entry = document.createElement("div");
    entry.className = "custom-target-entry";

    const header = document.createElement("div");
    header.className = "custom-target-header";

    const label = document.createElement("label");
    label.className = "custom-target-label";
    const unit = target.unit || getTargetOption(target.key)?.unit || "";
    label.textContent = unit ? `${target.label} (${unit})` : target.label;

    const editButton = document.createElement("button");
    editButton.type = "button";
    setupEditButton(editButton, `Edit ${target.label} name`);
    editButton.addEventListener("click", async () => {
      const statusEl = elements.targetStatus || elements.customTargetStatus;
      const updated = await editTargetDialog(target);
      if (!updated || updated === target.label) {
        return;
      }
      try {
        setStatus(statusEl, "Saving...");
        await api(`/api/custom-targets/${target.id}`, {
          method: "PUT",
          body: { label: updated },
        });
        await refreshData();
        setStatus(statusEl, "Target updated.");
      } catch (error) {
        setStatus(statusEl, error.message, "error");
      }
    });

    header.append(label, editButton);

    const fieldRow = document.createElement("div");
    fieldRow.className = "custom-target-field";

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = formatTargetInputValue(target.target, target.allowOver);
    input.dataset.customTargetId = String(target.id);
    input.dataset.customTargetLabel = target.label;
    const inputId = `custom-target-input-${target.id}`;
    input.id = inputId;
    label.setAttribute("for", inputId);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    setupDeleteButton(deleteButton, { label: `Delete ${target.label} target` });
    deleteButton.addEventListener("click", async () => {
      const statusEl = elements.targetStatus || elements.customTargetStatus;
      const confirmed = await confirmDialog({
        title: "Delete target",
        message: `Delete the ${target.label} target?`,
      });
      if (!confirmed) {
        return;
      }
      try {
        setStatus(statusEl, "Deleting...");
        await api(`/api/custom-targets/${target.id}`, { method: "DELETE" });
        await refreshData();
        setStatus(statusEl, "Target deleted.");
      } catch (error) {
        setStatus(statusEl, error.message, "error");
      }
    });

    fieldRow.append(input, deleteButton);
    entry.append(header, fieldRow);
    elements.customTargetList.appendChild(entry);
  });
};

const formatImpactValue = (value, unit, precision = 1) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? "+" : "";
  return `${sign}${formatNumber(safeValue, precision)}${unit}`;
};

const createImpactTotals = () => {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  CUSTOM_TARGET_OPTIONS.forEach((target) => {
    totals[target.key] = 0;
  });
  return totals;
};

const setLogImpactValues = (impact) => {
  if (elements.logImpactCalories) {
    elements.logImpactCalories.textContent = formatImpactValue(
      impact.calories,
      " cal",
      0
    );
  }
  if (elements.logImpactProtein) {
    elements.logImpactProtein.textContent = formatImpactValue(
      impact.protein,
      "g"
    );
  }
  if (elements.logImpactCarbs) {
    elements.logImpactCarbs.textContent = formatImpactValue(impact.carbs, "g");
  }
  if (elements.logImpactFat) {
    elements.logImpactFat.textContent = formatImpactValue(impact.fat, "g");
  }
};

const updateLogImpact = () => {
  if (!elements.logImpactCard || !elements.logForm || !elements.logItem) {
    return;
  }
  const emptyImpact = createImpactTotals();
  const warnCarbsOver = !state.targets?.carbsAllowOver;
  const warnFatOver = !state.targets?.fatAllowOver;
  if (elements.logItem.disabled) {
    setLogImpactValues(emptyImpact);
    state.logImpact = emptyImpact;
    setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
    setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
    setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
      warnOver: warnCarbsOver,
    });
    setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
      warnOver: warnFatOver,
    });
    setStatus(elements.logImpactNote, "Select an item to preview.");
    renderCustomTargetsPanel();
    return;
  }

  const type = elements.logForm.querySelector(
    "input[name='entryType']:checked"
  )?.value;
  const itemId = Number(elements.logItem.value);
  if (!type || !Number.isFinite(itemId)) {
    setLogImpactValues(emptyImpact);
    state.logImpact = emptyImpact;
    setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
    setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
    setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
      warnOver: warnCarbsOver,
    });
    setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
      warnOver: warnFatOver,
    });
    setStatus(elements.logImpactNote, "Select an item to preview.");
    renderCustomTargetsPanel();
    return;
  }

  const quantityField = elements.logForm.querySelector("[name='quantity']");
  const unitField = elements.logForm.querySelector("[name='unit']");
  const quantity = Math.max(parseNumeric(quantityField?.value, 1), 0);
  const unit = String(unitField?.value ?? "").trim();
  let impact = emptyImpact;
  let note = "";

  if (type === "ingredient") {
    const ingredient = state.ingredients.find((item) => item.id === itemId);
    if (!ingredient) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, "Ingredient not found.", "error");
      renderCustomTargetsPanel();
      return;
    }
    const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
    if (normalized.error) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, normalized.error, "error");
      renderCustomTargetsPanel();
      return;
    }
    impact = {
      calories: parseNumeric(ingredient.calories, 0) * normalized.quantity,
      protein: parseNumeric(ingredient.protein, 0) * normalized.quantity,
      carbs: parseNumeric(ingredient.carbs, 0) * normalized.quantity,
      fat: parseNumeric(ingredient.fat, 0) * normalized.quantity,
    };
    CUSTOM_TARGET_OPTIONS.forEach((target) => {
      impact[target.key] =
        parseNumeric(ingredient[target.key], 0) * normalized.quantity;
    });
  } else if (type === "food") {
    const food = state.foods.find((item) => item.id === itemId);
    if (!food) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, "Food not found.", "error");
      renderCustomTargetsPanel();
      return;
    }
    const normalized = normalizeIngredientQuantity(food, quantity, unit);
    if (normalized.error) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, normalized.error, "error");
      renderCustomTargetsPanel();
      return;
    }
    impact = {
      calories: parseNumeric(food.calories, 0) * normalized.quantity,
      protein: parseNumeric(food.protein, 0) * normalized.quantity,
      carbs: parseNumeric(food.carbs, 0) * normalized.quantity,
      fat: parseNumeric(food.fat, 0) * normalized.quantity,
    };
    CUSTOM_TARGET_OPTIONS.forEach((target) => {
      impact[target.key] =
        parseNumeric(food[target.key], 0) * normalized.quantity;
    });
  } else {
    const recipe = state.recipes.find((item) => item.id === itemId);
    if (!recipe?.nutrition?.perServing) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, "Recipe data unavailable.", "error");
      renderCustomTargetsPanel();
      return;
    }
    const normalized = normalizeRecipeQuantity(quantity, unit);
    if (normalized.error) {
      setLogImpactValues(emptyImpact);
      state.logImpact = emptyImpact;
      setImpactBar(elements.caloriesImpactProgress, 0, state.targets?.calories);
      setImpactBar(elements.proteinImpactProgress, 0, state.targets?.protein);
      setImpactBar(elements.carbsImpactProgress, 0, state.targets?.carbs, {
        warnOver: warnCarbsOver,
      });
      setImpactBar(elements.fatImpactProgress, 0, state.targets?.fat, {
        warnOver: warnFatOver,
      });
      setStatus(elements.logImpactNote, normalized.error, "error");
      renderCustomTargetsPanel();
      return;
    }
    impact = {
      calories:
        parseNumeric(recipe.nutrition.perServing.calories, 0) *
        normalized.quantity,
      protein:
        parseNumeric(recipe.nutrition.perServing.protein, 0) *
        normalized.quantity,
      carbs:
        parseNumeric(recipe.nutrition.perServing.carbs, 0) *
        normalized.quantity,
      fat:
        parseNumeric(recipe.nutrition.perServing.fat, 0) * normalized.quantity,
    };
    CUSTOM_TARGET_OPTIONS.forEach((target) => {
      impact[target.key] =
        parseNumeric(recipe.nutrition.perServing[target.key], 0) *
        normalized.quantity;
    });
  }

  setLogImpactValues(impact);
  state.logImpact = impact;
  const totals = getSelectedDayTotals();
  const projected = {
    calories: totals.calories + impact.calories,
    protein: totals.protein + impact.protein,
    carbs: totals.carbs + impact.carbs,
    fat: totals.fat + impact.fat,
  };
  setImpactBar(
    elements.caloriesImpactProgress,
    projected.calories,
    state.targets?.calories
  );
  setImpactBar(
    elements.proteinImpactProgress,
    projected.protein,
    state.targets?.protein
  );
  setImpactBar(
    elements.carbsImpactProgress,
    projected.carbs,
    state.targets?.carbs,
    { warnOver: !state.targets?.carbsAllowOver }
  );
  setImpactBar(
    elements.fatImpactProgress,
    projected.fat,
    state.targets?.fat,
    { warnOver: !state.targets?.fatAllowOver }
  );
  setStatus(elements.logImpactNote, note);
  renderCustomTargetsPanel();
};

const renderLogSelect = () => {
  if (!elements.logItem || !elements.logForm) {
    return;
  }
  const type = elements.logForm.querySelector(
    "input[name='entryType']:checked"
  ).value;
  elements.logItem.innerHTML = "";

  const items =
    type === "ingredient"
      ? state.ingredients
      : type === "food"
        ? state.foods
        : state.recipes;
  if (!items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent =
      type === "ingredient"
        ? "Add ingredients to log single products."
        : type === "food"
          ? "Add foods to log store-bought items."
        : "Add recipes to log meals.";
    elements.logItem.appendChild(option);
    elements.logItem.disabled = true;
    updateLogImpact();
    return;
  }

  elements.logItem.disabled = false;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    elements.logItem.appendChild(option);
  });
  updateLogImpact();
};

const refreshLogs = async (dateValue) => {
  const logs = await api(buildLogsUrl(dateValue));
  state.logs = logs;
  renderLogList();
  updateTodayStats();
};

const refreshData = async () => {
  const selectedDay = getSelectedDayValue();
  const [ingredients, foods, recipes, logs, customTargets] =
    await Promise.all([
      api("/api/ingredients"),
      api("/api/foods"),
      api("/api/recipes"),
      api(buildLogsUrl(selectedDay)),
      api("/api/custom-targets"),
    ]);
  state.ingredients = ingredients;
  state.foods = foods;
  state.recipes = recipes;
  state.logs = logs;
  state.customTargets = customTargets;
  state.targets = deriveCoreTargets(customTargets);

  renderIngredients();
  renderFoods();
  renderRecipeItems();
  renderRecipes();
  renderLogSelect();
  renderLogList();
  renderCustomTargetList();
  resetCustomTargetForm();
  updateTodayStats();
  updateRecipeOverview();
};

const setIngredientFieldValue = (name, value, options = {}) => {
  if (!elements.ingredientForm) {
    return;
  }
  const field = elements.ingredientForm.querySelector(`[name="${name}"]`);
  if (!field) {
    return;
  }
  const allowEmpty = options.allowEmpty !== false;
  if (!allowEmpty && (value === null || value === undefined || value === "")) {
    return;
  }
  field.value = value ?? "";
};

const applyIngredientData = (data, options = {}) => {
  if (!data) {
    return;
  }
  setIngredientFieldValue("name", data.name, options);
  setIngredientFieldValue("barcode", data.barcode || "", options);
  setIngredientFieldValue("calories", data.calories, options);
  setIngredientFieldValue("protein", data.protein, options);
  setIngredientFieldValue("carbs", data.carbs, options);
  setIngredientFieldValue("fat", data.fat, options);
  setIngredientFieldValue("unit", data.unit, options);
  setIngredientFieldValue("ingredientsList", data.ingredientsList, options);
  setIngredientFieldValue("vitamins", data.vitamins, options);
  setIngredientFieldValue("allergens", data.allergens, options);
  setIngredientFieldValue("servingSize", data.servingSize, options);
  setIngredientFieldValue(
    "servingsPerContainer",
    data.servingsPerContainer,
    options
  );

  const extraValues = {
    saturatedFat: data.saturatedFat,
    transFat: data.transFat,
    cholesterolMg: data.cholesterolMg,
    sodiumMg: data.sodiumMg,
    dietaryFiber: data.dietaryFiber,
    totalSugars: data.totalSugars,
    addedSugars: data.addedSugars,
    vitaminDMcg: data.vitaminDMcg,
    calciumMg: data.calciumMg,
    ironMg: data.ironMg,
    potassiumMg: data.potassiumMg,
  };

  if (elements.extraNutrients) {
    resetExtraNutrients();
    Object.entries(extraValues).forEach(([name, value]) => {
      const hasValue = value !== null && value !== undefined && value !== "";
      if (!hasValue) {
        return;
      }
      createExtraField(name, value);
    });
  }
};

const setIngredientFormMode = (ingredient) => {
  if (!elements.ingredientForm) {
    return;
  }
  if (!ingredient) {
    editingIngredientId = null;
    if (elements.ingredientFormTitle) {
      elements.ingredientFormTitle.textContent = "Add ingredient";
    }
    if (elements.ingredientSubmit) {
      elements.ingredientSubmit.textContent = "Save ingredient";
    }
    if (elements.ingredientCancel) {
      elements.ingredientCancel.hidden = true;
    }
    elements.ingredientForm.reset();
    if (elements.ingredientId) {
      elements.ingredientId.value = "";
    }
    if (elements.barcodeInput) {
      elements.barcodeInput.value = "";
    }
    resetExtraNutrients();
    return;
  }

  editingIngredientId = ingredient.id;
  if (elements.ingredientFormTitle) {
    elements.ingredientFormTitle.textContent = "Edit ingredient";
  }
  if (elements.ingredientSubmit) {
    elements.ingredientSubmit.textContent = "Update ingredient";
  }
  if (elements.ingredientCancel) {
    elements.ingredientCancel.hidden = false;
  }
  if (elements.ingredientId) {
    elements.ingredientId.value = String(ingredient.id);
  }

  applyIngredientData(ingredient, { allowEmpty: true });
};

const findIngredientByBarcode = (barcode) =>
  state.ingredients.find((ingredient) => ingredient.barcode === barcode);

const lookupBarcode = async (barcode) => {
  setStatus(elements.ingredientStatus, "Looking up barcode...");
  const response = await api(
    `/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}`
  );
  if (!response || !response.ingredient) {
    throw new Error("No product found for that barcode.");
  }
  applyIngredientData(response.ingredient, { allowEmpty: false });
  const sourceLabel =
    response.source === "local"
      ? "your library"
      : response.source === "nutritionix"
      ? "Nutritionix"
      : response.source === "usda"
        ? "USDA"
        : "Open Food Facts";
  setStatus(
    elements.ingredientStatus,
    `Loaded data from ${sourceLabel}. Review and save.`
  );
};

const handleBarcodeDetected = async (barcode) => {
  if (elements.barcodeInput) {
    elements.barcodeInput.value = barcode;
  }
  setStatus(elements.scanStatus, `Detected barcode ${barcode}`);

  const existing = findIngredientByBarcode(barcode);
  if (existing) {
    setIngredientFormMode(existing);
    setStatus(
      elements.ingredientStatus,
      `Matched ${existing.name} in your library.`
    );
    return;
  }

  try {
    await lookupBarcode(barcode);
  } catch (error) {
    if (existing) {
      setStatus(
        elements.ingredientStatus,
        `Matched ${existing.name} in your library.`
      );
      return;
    }
    setStatus(elements.ingredientStatus, error.message, "error");
  }
};

const setFoodFieldValue = (name, value, options = {}) => {
  if (!elements.foodForm) {
    return;
  }
  const field = elements.foodForm.querySelector(`[name="${name}"]`);
  if (!field) {
    return;
  }
  const allowEmpty = options.allowEmpty !== false;
  if (!allowEmpty && (value === null || value === undefined || value === "")) {
    return;
  }
  field.value = value ?? "";
};

const applyFoodData = (data, options = {}) => {
  if (!data) {
    return;
  }
  setFoodFieldValue("name", data.name, options);
  setFoodFieldValue("barcode", data.barcode || "", options);
  setFoodFieldValue("calories", data.calories, options);
  setFoodFieldValue("protein", data.protein, options);
  setFoodFieldValue("carbs", data.carbs, options);
  setFoodFieldValue("fat", data.fat, options);
  setFoodFieldValue("unit", data.unit, options);
  setFoodFieldValue("ingredientsList", data.ingredientsList, options);
  setFoodFieldValue("vitamins", data.vitamins, options);
  setFoodFieldValue("allergens", data.allergens, options);
  setFoodFieldValue("servingSize", data.servingSize, options);
  setFoodFieldValue("servingsPerContainer", data.servingsPerContainer, options);

  const extraValues = {
    saturatedFat: data.saturatedFat,
    transFat: data.transFat,
    cholesterolMg: data.cholesterolMg,
    sodiumMg: data.sodiumMg,
    dietaryFiber: data.dietaryFiber,
    totalSugars: data.totalSugars,
    addedSugars: data.addedSugars,
    vitaminDMcg: data.vitaminDMcg,
    calciumMg: data.calciumMg,
    ironMg: data.ironMg,
    potassiumMg: data.potassiumMg,
  };

  if (elements.foodExtraNutrients) {
    resetFoodExtraNutrients();
    Object.entries(extraValues).forEach(([name, value]) => {
      const hasValue = value !== null && value !== undefined && value !== "";
      if (!hasValue) {
        return;
      }
      createFoodExtraField(name, value);
    });
  }
};

const setFoodFormMode = (food) => {
  if (!elements.foodForm) {
    return;
  }
  if (!food) {
    editingFoodId = null;
    if (elements.foodFormTitle) {
      elements.foodFormTitle.textContent = "Add food";
    }
    if (elements.foodSubmit) {
      elements.foodSubmit.textContent = "Save food";
    }
    if (elements.foodCancel) {
      elements.foodCancel.hidden = true;
    }
    elements.foodForm.reset();
    if (elements.foodId) {
      elements.foodId.value = "";
    }
    if (elements.foodBarcodeInput) {
      elements.foodBarcodeInput.value = "";
    }
    resetFoodExtraNutrients();
    return;
  }

  editingFoodId = food.id;
  if (elements.foodFormTitle) {
    elements.foodFormTitle.textContent = "Edit food";
  }
  if (elements.foodSubmit) {
    elements.foodSubmit.textContent = "Update food";
  }
  if (elements.foodCancel) {
    elements.foodCancel.hidden = false;
  }
  if (elements.foodId) {
    elements.foodId.value = String(food.id);
  }

  applyFoodData(food, { allowEmpty: true });
};

const findFoodByBarcode = (barcode) =>
  state.foods.find((food) => food.barcode === barcode);

const lookupFoodBarcode = async (barcode) => {
  setStatus(elements.foodStatus, "Looking up barcode...");
  const response = await api(
    `/api/barcode-lookup?barcode=${encodeURIComponent(barcode)}&type=food`
  );
  if (!response || !response.food) {
    throw new Error("No product found for that barcode.");
  }
  applyFoodData(response.food, { allowEmpty: false });
  const sourceLabel =
    response.source === "local"
      ? "your library"
      : response.source === "nutritionix"
      ? "Nutritionix"
      : response.source === "usda"
        ? "USDA"
        : "Open Food Facts";
  setStatus(
    elements.foodStatus,
    `Loaded data from ${sourceLabel}. Review and save.`
  );
};

const handleFoodBarcodeDetected = async (barcode) => {
  if (elements.foodBarcodeInput) {
    elements.foodBarcodeInput.value = barcode;
  }
  setStatus(elements.scanStatus, `Detected barcode ${barcode}`);

  const existing = findFoodByBarcode(barcode);
  if (existing) {
    setFoodFormMode(existing);
    setStatus(elements.foodStatus, `Matched ${existing.name} in your library.`);
    return;
  }

  try {
    await lookupFoodBarcode(barcode);
  } catch (error) {
    if (existing) {
      setStatus(elements.foodStatus, `Matched ${existing.name} in your library.`);
      return;
    }
    setStatus(elements.foodStatus, error.message, "error");
  }
};

const setupScan = () => {
  if (!elements.scanModal || !elements.scanVideo || !elements.closeScan) {
    return;
  }
  let active = false;
  let stream = null;
  let detector = null;
  let zxingReader = null;
  let scanTarget = "ingredient";

  const stopVideoStream = () => {
    const mediaStream = elements.scanVideo.srcObject;
    if (mediaStream && mediaStream.getTracks) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    elements.scanVideo.srcObject = null;
  };

  const stopScan = () => {
    active = false;
    if (zxingReader) {
      zxingReader.reset();
      zxingReader = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    stopVideoStream();
  };

  const scanLoop = async () => {
    if (!active || !detector) {
      return;
    }

    try {
      const barcodes = await detector.detect(elements.scanVideo);
      if (barcodes.length) {
        const barcode = barcodes[0].rawValue;
        if (scanTarget === "food") {
          await handleFoodBarcodeDetected(barcode);
        } else {
          await handleBarcodeDetected(barcode);
        }
        closeScanModal();
        return;
      }
    } catch (error) {
      setStatus(elements.scanStatus, error.message, "error");
    }

    requestAnimationFrame(scanLoop);
  };

  const startScan = async () => {
    const ZXing = window.ZXing;
    if ("BarcodeDetector" in window) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        elements.scanVideo.srcObject = stream;
        detector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
        active = true;
        setStatus(elements.scanStatus, "Scanning...");
        requestAnimationFrame(scanLoop);
        return;
      } catch (error) {
        setStatus(elements.scanStatus, error.message, "error");
        return;
      }
    }

    if (!ZXing) {
      setStatus(
        elements.scanStatus,
        "Barcode scanning is not available here. Try Chrome or enable camera access.",
        "error"
      );
      return;
    }

    try {
      zxingReader = new ZXing.BrowserMultiFormatReader();
      active = true;
      setStatus(elements.scanStatus, "Scanning...");
      await zxingReader.decodeFromVideoDevice(
        null,
        elements.scanVideo,
        async (result, err) => {
          if (!active) {
            return;
          }
          if (result) {
            const barcode = result.getText();
            if (scanTarget === "food") {
              await handleFoodBarcodeDetected(barcode);
            } else {
              await handleBarcodeDetected(barcode);
            }
            closeScanModal();
            return;
          }
          if (err) {
            const errName = err.name || "";
            const errMessage = err.message || "";
            const isNotFound =
              errName === "NotFoundException" ||
              errMessage.toLowerCase().includes("notfound") ||
              errMessage.toLowerCase().includes("object can not be found") ||
              (ZXing.NotFoundException && err instanceof ZXing.NotFoundException);
            if (!isNotFound) {
              setStatus(elements.scanStatus, errMessage, "error");
            }
          }
        }
      );
    } catch (error) {
      setStatus(elements.scanStatus, error.message, "error");
    }
  };

  const openScanModal = async () => {
    elements.scanModal.classList.add("open");
    elements.scanModal.setAttribute("aria-hidden", "false");
    await startScan();
  };

  const closeScanModal = () => {
    elements.scanModal.classList.remove("open");
    elements.scanModal.setAttribute("aria-hidden", "true");
    stopScan();
  };

  qsa("[data-scan-trigger]").forEach((button) => {
    button.addEventListener("click", async () => {
      scanTarget = button.dataset.scanTarget || "ingredient";
      await openScanModal();
    });
  });
  elements.closeScan.addEventListener("click", closeScanModal);
};

const setupNavToggle = () => {
  qsa("[data-nav-toggle]").forEach((toggle) => {
    const header = toggle.closest(".site-header");
    const nav = header?.querySelector(".nav-links");
    if (!nav) {
      return;
    }
    const closeMenu = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    qsa("a, button", nav).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  });
};

const wireForms = () => {
  const handleDayInputChange = (event) => {
    const value = event.target.value;
    if (!value) {
      return;
    }
    applySelectedDayValue(value);
  };

  if (elements.ingredientForm) {
    elements.ingredientForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const payload = Object.fromEntries(formData.entries());
      delete payload.id;
      try {
        const wasEditing = Boolean(editingIngredientId);
        setStatus(elements.ingredientStatus, "Saving...");
        if (editingIngredientId) {
          await api(`/api/ingredients/${editingIngredientId}`, {
            method: "PUT",
            body: payload,
          });
        } else {
          await api("/api/ingredients", { method: "POST", body: payload });
        }
        setIngredientFormMode(null);
        await refreshData();
        setStatus(
          elements.ingredientStatus,
          wasEditing ? "Ingredient updated." : "Ingredient saved."
        );
      } catch (error) {
        setStatus(elements.ingredientStatus, error.message, "error");
      }
    });
  }

  if (elements.ingredientCancel) {
    elements.ingredientCancel.addEventListener("click", () => {
      setIngredientFormMode(null);
      setStatus(elements.ingredientStatus, "Edit cancelled.");
    });
  }

  if (elements.addNutrient) {
    elements.addNutrient.addEventListener("click", () => {
      const selected = elements.extraNutrientSelect?.value || "";
      if (!selected) {
        setStatus(
          elements.ingredientStatus,
          "Select a nutrient to add.",
          "error"
        );
        return;
      }
      createExtraField(selected, "");
      if (elements.extraNutrientSelect) {
        elements.extraNutrientSelect.value = "";
      }
    });
  }

  if (elements.ingredientSearch) {
    elements.ingredientSearch.addEventListener("input", renderIngredients);
  }

  if (elements.barcodeLookup) {
    elements.barcodeLookup.addEventListener("click", async () => {
      const barcode = elements.barcodeInput?.value.trim();
      if (!barcode) {
        setStatus(
          elements.ingredientStatus,
          "Enter a barcode to look up.",
          "error"
        );
        return;
      }
      const existing = findIngredientByBarcode(barcode);
      if (existing) {
        setIngredientFormMode(existing);
        setStatus(
          elements.ingredientStatus,
          `Matched ${existing.name} in your library.`
        );
        return;
      }
      try {
        await lookupBarcode(barcode);
      } catch (error) {
        if (existing) {
          setStatus(
            elements.ingredientStatus,
            `Matched ${existing.name} in your library.`
          );
          return;
        }
        setStatus(elements.ingredientStatus, error.message, "error");
      }
    });
  }

  if (elements.foodForm) {
    elements.foodForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const payload = Object.fromEntries(formData.entries());
      delete payload.id;
      try {
        const wasEditing = Boolean(editingFoodId);
        setStatus(elements.foodStatus, "Saving...");
        if (editingFoodId) {
          await api(`/api/foods/${editingFoodId}`, {
            method: "PUT",
            body: payload,
          });
        } else {
          await api("/api/foods", { method: "POST", body: payload });
        }
        setFoodFormMode(null);
        await refreshData();
        setStatus(
          elements.foodStatus,
          wasEditing ? "Food updated." : "Food saved."
        );
      } catch (error) {
        setStatus(elements.foodStatus, error.message, "error");
      }
    });
  }

  if (elements.foodCancel) {
    elements.foodCancel.addEventListener("click", () => {
      setFoodFormMode(null);
      setStatus(elements.foodStatus, "Edit cancelled.");
    });
  }

  if (elements.addFoodNutrient) {
    elements.addFoodNutrient.addEventListener("click", () => {
      const selected = elements.foodExtraNutrientSelect?.value || "";
      if (!selected) {
        setStatus(elements.foodStatus, "Select a nutrient to add.", "error");
        return;
      }
      createFoodExtraField(selected, "");
      if (elements.foodExtraNutrientSelect) {
        elements.foodExtraNutrientSelect.value = "";
      }
    });
  }

  if (elements.foodSearch) {
    elements.foodSearch.addEventListener("input", renderFoods);
  }

  if (elements.foodBarcodeLookup) {
    elements.foodBarcodeLookup.addEventListener("click", async () => {
      const barcode = elements.foodBarcodeInput?.value.trim();
      if (!barcode) {
        setStatus(elements.foodStatus, "Enter a barcode to look up.", "error");
        return;
      }
      const existing = findFoodByBarcode(barcode);
      if (existing) {
        setFoodFormMode(existing);
        setStatus(elements.foodStatus, `Matched ${existing.name} in your library.`);
        return;
      }
      try {
        await lookupFoodBarcode(barcode);
      } catch (error) {
        if (existing) {
          setStatus(
            elements.foodStatus,
            `Matched ${existing.name} in your library.`
          );
          return;
        }
        setStatus(elements.foodStatus, error.message, "error");
      }
    });
  }

  if (elements.addRecipeItem) {
    elements.addRecipeItem.addEventListener("click", () => {
      if (!state.ingredients.length) {
        setStatus(elements.recipeStatus, "Add ingredients first.", "error");
        return;
      }
      addRecipeRow();
    });
  }

  if (elements.recipeForm) {
    elements.recipeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const items = Array.from(
        elements.recipeItems?.querySelectorAll(".recipe-item-row") || []
      ).map((row) => {
        const [select, quantity, unit] = row.querySelectorAll("select, input");
        return {
          ingredientId: Number(select.value),
          quantity: Number(quantity.value || 1),
          unit: unit.value || "unit",
        };
      });

      const payload = {
        name: formData.get("name"),
        servings: formData.get("servings"),
        notes: formData.get("notes"),
        items,
      };

      try {
        setStatus(elements.recipeStatus, "Saving...");
        await api("/api/recipes", { method: "POST", body: payload });
        event.target.reset();
        if (elements.recipeItems) {
          elements.recipeItems.innerHTML = "";
        }
        renderRecipeItems();
        await refreshData();
        setStatus(elements.recipeStatus, "Recipe saved.");
      } catch (error) {
        setStatus(elements.recipeStatus, error.message, "error");
      }
    });

    const servingsInput = elements.recipeForm.querySelector("[name='servings']");
    if (servingsInput) {
      servingsInput.addEventListener("input", updateRecipeOverview);
    }
  }

  if (elements.logForm) {
    elements.logForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const type = formData.get("entryType");
      if (elements.logItem?.disabled) {
        setStatus(
          elements.logStatus,
          "Add a food, ingredient, or recipe before logging intake.",
          "error"
        );
        return;
      }
      const itemIdValue = elements.logItem?.value;
      const itemId = Number(itemIdValue);
      if (!itemIdValue || !Number.isFinite(itemId)) {
        setStatus(
          elements.logStatus,
          "Select a valid food, ingredient, or recipe.",
          "error"
        );
        return;
      }

      const payload = {
        quantity: formData.get("quantity"),
        unit: formData.get("unit"),
        notes: formData.get("notes"),
      };
      const selectedDate = getSelectedDate();
      const now = new Date();
      const consumedAt = selectedDate
        ? new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds()
          )
        : now;
      payload.consumedAt = consumedAt.getTime();
      payload.intakeDate = toDateInputValue(selectedDate || consumedAt);

      if (type === "ingredient") {
        payload.ingredientId = itemId;
      } else if (type === "food") {
        payload.foodId = itemId;
      } else {
        payload.recipeId = itemId;
      }

      try {
        setStatus(elements.logStatus, "Saving...");
        await api("/api/logs", { method: "POST", body: payload });
        event.target.reset();
        updateLogImpact();
        await refreshData();
        setStatus(elements.logStatus, "Entry logged.");
      } catch (error) {
        setStatus(elements.logStatus, error.message, "error");
      }
    });
  }

  if (elements.logForm) {
    elements.logForm
      .querySelectorAll("input[name='entryType']")
      .forEach((input) => {
        input.addEventListener("change", renderLogSelect);
      });
    if (elements.logItem) {
      elements.logItem.addEventListener("change", updateLogImpact);
    }
    const quantityInput = elements.logForm.querySelector("[name='quantity']");
    const unitInput = elements.logForm.querySelector("[name='unit']");
    if (quantityInput) {
      quantityInput.addEventListener("input", updateLogImpact);
    }
    if (unitInput) {
      unitInput.addEventListener("input", updateLogImpact);
    }
  }

  (elements.dayInputs || []).forEach((input) => {
    input.addEventListener("change", handleDayInputChange);
  });

  (elements.dayActionButtons || []).forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.dayAction;
      if (action === "prev") {
        shiftSelectedDay(-1);
        return;
      }
      if (action === "next") {
        shiftSelectedDay(1);
        return;
      }
      if (action === "today") {
        applySelectedDayValue(toDateInputValue(new Date()));
      }
    });
  });

  if (elements.targetForm) {
    elements.targetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const targetInputs = qsa("[data-custom-target-id]", elements.targetForm);
      if (!targetInputs.length) {
        setStatus(elements.targetStatus, "No targets to update.");
        return;
      }
      const targetById = new Map(
        (state.customTargets || []).map((target) => [target.id, target])
      );
      const updates = [];
      for (const input of targetInputs) {
        const targetId = Number(input.dataset.customTargetId);
        if (!Number.isFinite(targetId)) {
          continue;
        }
        const existing = targetById.get(targetId);
        if (!existing) {
          continue;
        }
        const label = input.dataset.customTargetLabel || existing.label || "Target";
        const parsedTarget = parseTargetInput(input.value);
        if (!parsedTarget.isValid) {
          setStatus(
            elements.targetStatus,
            `${label} must be a number (append + to allow overage).`,
            "error"
          );
          return;
        }
        const isCore = isCoreTargetKey(existing.key);
        if (!isCore && (parsedTarget.value === null || parsedTarget.value <= 0)) {
          setStatus(
            elements.targetStatus,
            `${label} must be greater than 0 (append + to allow overage).`,
            "error"
          );
          return;
        }
        if (
          existing.target === parsedTarget.value &&
          existing.allowOver === parsedTarget.allowOver
        ) {
          continue;
        }
        updates.push({
          id: targetId,
          payload: {
            target: parsedTarget.value,
            allowOver: parsedTarget.allowOver,
          },
        });
      }
      try {
        setStatus(elements.targetStatus, "Saving...");
        if (!updates.length) {
          setStatus(elements.targetStatus, "No changes to save.");
          return;
        }
        await Promise.all(
          updates.map((update) =>
            api(`/api/custom-targets/${update.id}`, {
              method: "PUT",
              body: update.payload,
            })
          )
        );
        await refreshData();
        setStatus(elements.targetStatus, "Targets saved.");
      } catch (error) {
        setStatus(elements.targetStatus, error.message, "error");
      }
    });
  }

  if (elements.customTargetForm) {
    if (elements.customTargetKey) {
      elements.customTargetKey.addEventListener("change", (event) => {
        setCustomTargetUnit(event.target.value);
      });
    }

    elements.customTargetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const key = String(formData.get("key") || "").trim();
      const option = getTargetOption(key);
      if (!key || !option) {
        setStatus(elements.customTargetStatus, "Select a target.", "error");
        return;
      }
      const isCore = isCoreTargetKey(key);
      const payload = {
        key,
        label: option.label || "Custom target",
        target: isCore ? null : DEFAULT_CUSTOM_TARGET_VALUE,
        allowOver: false,
      };

      try {
        setStatus(elements.customTargetStatus, "Adding...");
        const created = await api("/api/custom-targets", {
          method: "POST",
          body: payload,
        });
        resetCustomTargetForm();
        await refreshData();
        setStatus(
          elements.customTargetStatus,
          "Target added. Set its value above and save."
        );
        const newInput = elements.targetForm?.querySelector(
          `[data-custom-target-id="${created?.id}"]`
        );
        if (newInput) {
          newInput.focus();
          newInput.select();
        }
      } catch (error) {
        setStatus(elements.customTargetStatus, error.message, "error");
      }
    });
  }

  if (elements.exportButton) {
    elements.exportButton.addEventListener("click", async () => {
      const button = elements.exportButton;
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Exporting...";
      try {
        const data = await api("/api/export");
        const stamp = toDateInputValue(new Date());
        downloadJson(data, `caloriscribe-export-${stamp}.json`);
      } catch (error) {
        button.textContent = "Export failed";
        setTimeout(() => {
          button.textContent = originalLabel;
        }, 2000);
        return;
      } finally {
        button.disabled = false;
      }
      button.textContent = originalLabel;
    });
  }

  if (elements.importButton && elements.importFile) {
    elements.importButton.addEventListener("click", () => {
      elements.importFile.click();
    });

    elements.importFile.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      const button = elements.importButton;
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Importing...";
      setActionStatus(elements.importStatus, "");
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const result = await api("/api/import", {
          method: "POST",
          body: payload,
        });
        const message = `Imported ${result.ingredients.created} ingredients, ${result.recipes.created} recipes, ${result.logs.created} logs.`;
        setActionStatus(elements.importStatus, message);
        await refreshData();
      } catch (error) {
        setActionStatus(
          elements.importStatus,
          error.message || "Import failed.",
          "error"
        );
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
        elements.importFile.value = "";
      }
    });
  }

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", async () => {
      try {
        await api("/api/logout", { method: "POST" });
      } catch (error) {
        // Ignore logout errors and force redirect.
      } finally {
        window.location.href = "/login";
      }
    });
  }

  if (elements.passwordForm) {
    elements.passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const payload = {
        oldPassword: formData.get("oldPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      };
      try {
        setStatus(elements.passwordStatus, "Updating...");
        await api("/api/change-password", { method: "POST", body: payload });
        event.target.reset();
        setStatus(elements.passwordStatus, "Password updated.");
      } catch (error) {
        setStatus(elements.passwordStatus, error.message, "error");
      }
    });
  }
};

const init = () => {
  document.addEventListener("click", closeCardMenus);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCardMenus();
    }
  });
  initializeDaySelection();
  updateExtraNutrientSelect();
  updateFoodExtraNutrientSelect();
  resetCustomTargetForm();
  wireForms();
  setupNavToggle();
  setupScan();
  refreshData().catch((error) => {
    setStatus(elements.logStatus, error.message, "error");
    setStatus(elements.ingredientStatus, error.message, "error");
    setStatus(elements.foodStatus, error.message, "error");
    setStatus(elements.recipeStatus, error.message, "error");
    setStatus(elements.targetStatus, error.message, "error");
    setStatus(elements.customTargetStatus, error.message, "error");
  });
};

init();
