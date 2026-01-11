const state = {
  ingredients: [],
  recipes: [],
  logs: [],
  targets: null,
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
  recipeForm: qs("#recipe-form"),
  recipeItems: qs("#recipe-items"),
  recipeStatus: qs("#recipe-status"),
  recipeList: qs("#recipe-list"),
  addRecipeItem: qs("#add-recipe-item"),
  logForm: qs("#log-form"),
  logItem: qs("#log-item"),
  logStatus: qs("#log-status"),
  logList: qs("#log-list"),
  todayCalories: qs("#today-calories"),
  todayProtein: qs("#today-protein"),
  todayCarbs: qs("#today-carbs"),
  todayFat: qs("#today-fat"),
  caloriesProgress: qs("#calories-progress"),
  proteinProgress: qs("#protein-progress"),
  carbsProgress: qs("#carbs-progress"),
  fatProgress: qs("#fat-progress"),
  caloriesTarget: qs("#calories-target"),
  proteinTarget: qs("#protein-target"),
  carbsTarget: qs("#carbs-target"),
  fatTarget: qs("#fat-target"),
  targetForm: qs("#target-form"),
  targetStatus: qs("#target-status"),
  daySelector: qs("#day-selector"),
  logDateFilter: qs("#log-date-filter"),
  dayInputs: qsa("[data-day-input]"),
  dayActionButtons: qsa("[data-day-action]"),
  scanModal: qs("#scan-modal"),
  scanVideo: qs("#scan-video"),
  scanStatus: qs("#scan-status"),
  closeScan: qs("#close-scan"),
};

let editingIngredientId = null;

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

const DAY_STORAGE_KEY = "nutritionTrackerSelectedDay";

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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

const buildDetails = (title, entries) => {
  if (!entries.length) {
    return null;
  }
  const details = document.createElement("details");
  details.className = "details-card";

  const summary = document.createElement("summary");
  summary.textContent = title;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "details-close";
  closeButton.setAttribute("aria-label", "Close details");
  closeButton.textContent = "×";

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

  details.append(summary, closeButton, grid);

  closeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    details.removeAttribute("open");
  });

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

    const details = buildDetails("Full label details", entries);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      setIngredientFormMode(ingredient);
      if (elements.ingredientForm) {
        elements.ingredientForm.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });

    actions.appendChild(editButton);

    card.append(title, summary, barcode);
    if (details) {
      card.appendChild(details);
    }
    card.appendChild(actions);
    elements.ingredientList.appendChild(card);
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
    return;
  }
  addRecipeRow();
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
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => row.remove());

  row.append(select, quantity, unit, remove);
  elements.recipeItems.appendChild(row);
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

    const perServing = document.createElement("div");
    perServing.className = "meta";
    perServing.textContent = `Per serving: ${formatNumber(
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
      { label: "Per serving", value: perServing.textContent.replace("Per serving: ", "") },
      { label: "Total", value: totalLine.replace("Total: ", "") },
    ];

    if (ingredientsLine) {
      entries.push({ label: "Ingredients", value: ingredientsLine, wide: true });
    }
    if (recipe.notes) {
      entries.push({ label: "Notes", value: recipe.notes, wide: true });
    }

    const details = buildDetails("Full recipe details", entries);

    card.append(title, summary, perServing);
    if (details) {
      card.appendChild(details);
    }

    elements.recipeList.appendChild(card);
  });
};

const renderLogList = () => {
  if (!elements.logList) {
    return;
  }
  elements.logList.innerHTML = "";
  const selectedDate = getSelectedDate();
  const filteredLogs = selectedDate
    ? state.logs.filter((entry) =>
        isSameDay(new Date(entry.consumedAt), selectedDate)
      )
    : state.logs;

  if (!filteredLogs.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = selectedDate
      ? "No logs for this day."
      : "No logs yet.";
    elements.logList.appendChild(empty);
    return;
  }

  const limit = Number(elements.logList.dataset.limit || 0);
  const entries = limit ? filteredLogs.slice(0, limit) : filteredLogs;

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const title = document.createElement("h4");
    title.textContent = entry.label || "Entry";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${formatNumber(entry.quantity)} ${entry.unit} · ${new Date(
      entry.consumedAt
    ).toLocaleString()}`;

    const macros = document.createElement("div");
    macros.className = "meta";
    macros.textContent = `${formatNumber(entry.nutrition.calories)} cal, ${formatNumber(
      entry.nutrition.protein
    )}p, ${formatNumber(entry.nutrition.carbs)}c, ${formatNumber(
      entry.nutrition.fat
    )}f`;

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

    const details = buildDetails("Full entry details", detailEntries);

    card.append(title, meta, macros);
    if (details) {
      card.appendChild(details);
    }

    elements.logList.appendChild(card);
  });
};

const updateTodayStats = () => {
  const targetDate = getSelectedDate() || new Date();

  const totals = state.logs.reduce(
    (acc, entry) => {
      const consumed = new Date(entry.consumedAt);
      if (!isSameDay(consumed, targetDate)) {
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

const formatTarget = (value, unit) => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return `${formatNumber(value)}${unit}`;
};

const updateProgressBars = (totals) => {
  const targets = state.targets || {};
  setProgressBar(elements.caloriesProgress, totals.calories, targets.calories);
  setProgressBar(elements.proteinProgress, totals.protein, targets.protein);
  setProgressBar(elements.carbsProgress, totals.carbs, targets.carbs);
  setProgressBar(elements.fatProgress, totals.fat, targets.fat);

  if (elements.caloriesTarget) {
    const caloriesTarget = formatTarget(targets.calories, "");
    elements.caloriesTarget.textContent = caloriesTarget
      ? `Target: ${caloriesTarget}`
      : "Target not set";
  }
  if (elements.proteinTarget) {
    const proteinTarget = formatTarget(targets.protein, "g");
    elements.proteinTarget.textContent = proteinTarget
      ? `Target: ${proteinTarget}`
      : "Protein";
  }
  if (elements.carbsTarget) {
    const carbsTarget = formatTarget(targets.carbs, "g");
    elements.carbsTarget.textContent = carbsTarget
      ? `Target: ${carbsTarget}`
      : "Carbs";
  }
  if (elements.fatTarget) {
    const fatTarget = formatTarget(targets.fat, "g");
    elements.fatTarget.textContent = fatTarget
      ? `Target: ${fatTarget}`
      : "Fat";
  }
};

const renderTargetsForm = () => {
  if (!elements.targetForm || !state.targets) {
    return;
  }
  const setValue = (name, value) => {
    const field = elements.targetForm.querySelector(`[name="${name}"]`);
    if (!field) {
      return;
    }
    field.value = value ?? "";
  };
  setValue("calories", state.targets.calories);
  setValue("protein", state.targets.protein);
  setValue("carbs", state.targets.carbs);
  setValue("fat", state.targets.fat);
};

const renderLogSelect = () => {
  if (!elements.logItem || !elements.logForm) {
    return;
  }
  const type = elements.logForm.querySelector(
    "input[name='entryType']:checked"
  ).value;
  elements.logItem.innerHTML = "";

  const items = type === "ingredient" ? state.ingredients : state.recipes;
  if (!items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent =
      type === "ingredient"
        ? "Add ingredients to log single products."
        : "Add recipes to log meals.";
    elements.logItem.appendChild(option);
    elements.logItem.disabled = true;
    return;
  }

  elements.logItem.disabled = false;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    elements.logItem.appendChild(option);
  });
};

const refreshLogs = async (dateValue) => {
  const logs = await api(buildLogsUrl(dateValue));
  state.logs = logs;
  renderLogList();
  updateTodayStats();
};

const refreshData = async () => {
  const selectedDay = getSelectedDayValue();
  const [ingredients, recipes, logs, targets] = await Promise.all([
    api("/api/ingredients"),
    api("/api/recipes"),
    api(buildLogsUrl(selectedDay)),
    api("/api/targets"),
  ]);
  state.ingredients = ingredients;
  state.recipes = recipes;
  state.logs = logs;
  state.targets = targets;

  renderIngredients();
  renderRecipeItems();
  renderRecipes();
  renderLogSelect();
  renderLogList();
  renderTargetsForm();
  updateTodayStats();
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

const setupScan = () => {
  if (!elements.scanModal || !elements.scanVideo || !elements.closeScan) {
    return;
  }
  let active = false;
  let stream = null;
  let detector = null;
  let zxingReader = null;

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
        await handleBarcodeDetected(barcode);
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
            await handleBarcodeDetected(barcode);
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
    button.addEventListener("click", openScanModal);
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

    qsa("a", nav).forEach((link) => {
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
  }

  if (elements.logForm) {
    elements.logForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const type = formData.get("entryType");
      if (elements.logItem?.disabled) {
        setStatus(
          elements.logStatus,
          "Add an ingredient or recipe before logging intake.",
          "error"
        );
        return;
      }
      const itemIdValue = elements.logItem?.value;
      const itemId = Number(itemIdValue);
      if (!itemIdValue || !Number.isFinite(itemId)) {
        setStatus(
          elements.logStatus,
          "Select a valid ingredient or recipe.",
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
      if (selectedDate) {
        const now = new Date();
        const consumedAt = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        );
        payload.consumedAt = toLocalDateTimeValue(consumedAt);
      }

      if (type === "ingredient") {
        payload.ingredientId = itemId;
      } else {
        payload.recipeId = itemId;
      }

      try {
        setStatus(elements.logStatus, "Saving...");
        await api("/api/logs", { method: "POST", body: payload });
        event.target.reset();
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
      const formData = new FormData(event.target);
      const payload = {
        calories: formData.get("calories"),
        protein: formData.get("protein"),
        carbs: formData.get("carbs"),
        fat: formData.get("fat"),
      };
      try {
        setStatus(elements.targetStatus, "Saving...");
        const targets = await api("/api/targets", {
          method: "PUT",
          body: payload,
        });
        state.targets = targets;
        renderTargetsForm();
        updateTodayStats();
        setStatus(elements.targetStatus, "Targets saved.");
      } catch (error) {
        setStatus(elements.targetStatus, error.message, "error");
      }
    });
  }
};

const init = () => {
  initializeDaySelection();
  updateExtraNutrientSelect();
  wireForms();
  setupNavToggle();
  setupScan();
  refreshData().catch((error) => {
    setStatus(elements.logStatus, error.message, "error");
    setStatus(elements.ingredientStatus, error.message, "error");
    setStatus(elements.recipeStatus, error.message, "error");
    setStatus(elements.targetStatus, error.message, "error");
  });
};

init();
