const state = {
  ingredients: [],
  foods: [],
  recipes: [],
  logs: [],
  customTargets: [],
  targetLookup: new Map(),
  logImpact: null,
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

// FIXME: Some of this looks non-generic.
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
  recipeFormTitle: qs("#recipe-form-title"),
  recipeSubmit: qs("#recipe-submit"),
  recipeCancel: qs("#recipe-cancel"),
  recipeItems: qs("#recipe-items"),
  recipeStatus: qs("#recipe-status"),
  recipeList: qs("#recipe-list"),
  recipeListPanel: qs("#recipe-list-panel"),
  recipeIngredientsPanel: qs("#recipe-ingredients-panel"),
  recipePanelRecipes: qs("#recipe-panel-recipes"),
  recipePanelIngredients: qs("#recipe-panel-ingredients"),
  recipeIngredientSearch: qs("#recipe-ingredient-search"),
  recipeIngredientList: qs("#recipe-ingredient-list"),
  addRecipeItem: qs("#add-recipe-item"),
  logForm: qs("#log-form"),
  logItem: qs("#log-item"),
  logStatus: qs("#log-status"),
  logList: qs("#log-list"),
  customTargetsList: qs("#custom-targets-list"),
  customTargetsEmpty: qs("#custom-targets-empty"),
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
let editingRecipeId = null;
let recipePanelMode = "recipes";

// FIXME: This should all come from the FoodDB.
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
const DEFAULT_CUSTOM_TARGET_VALUE = 1;
const CUSTOM_TARGET_LOOKUP = new Map(
  CUSTOM_TARGET_OPTIONS.map((option) => [option.key, option])
);

const formatNutrientLabel = (label, unit) =>
  unit ? `${label} (${unit})` : label;
const getExtraNutrientOptions = () => {
  const targets = new Map(
    (state.customTargets || []).map((target) => [target.key, target])
  );
  return CUSTOM_TARGET_OPTIONS.map((option) => {
    const target = targets.get(option.key);
    const label = target?.label || option.label;
    const unit = target?.unit || option.unit;
    return {
      name: option.key,
      label: formatNutrientLabel(label, unit),
    };
  });
};

const DAY_STORAGE_KEY = "nutritionTrackerSelectedDay";
const getTargetLookup = () => state.targetLookup || new Map();
const getTargetData = (key) => getTargetLookup().get(key) || null;
const getTargetLabel = (key) => {
  const target = getTargetData(key);
  if (target?.label) {
    return target.label;
  }
  return CUSTOM_TARGET_LOOKUP.get(key)?.label || key;
};
const getTargetUnit = (key) => {
  const target = getTargetData(key);
  if (target?.unit) {
    return target.unit;
  }
  return CUSTOM_TARGET_LOOKUP.get(key)?.unit || "";
};
const getTargetValue = (key) => getTargetData(key)?.target ?? null;
const getTargetAllowOver = (key) => Boolean(getTargetData(key)?.allowOver);
const getTrackedTargetKeys = () =>
  (state.customTargets || []).map((target) => target.key);
const isOptionalTargetKey = (key) => !CUSTOM_TARGET_LOOKUP.has(key);
const getPrecisionForUnit = (unit) => {
  const normalized = String(unit || "").toLowerCase();
  return normalized === "cal" || normalized === "kcal" ? 0 : 1;
};
const formatNutrientValue = (value, unit) =>
  formatNumber(value, getPrecisionForUnit(unit));
const formatNutrientDisplay = (value, unit) => {
  const formatted = formatNutrientValue(value, unit);
  if (!unit) {
    return formatted;
  }
  if (unit.startsWith(" ")) {
    return `${formatted}${unit}`;
  }
  const spacer = unit.length > 1 ? " " : "";
  return `${formatted}${spacer}${unit}`;
};
const getTargetKeyFromId = (id, prefix = "", suffix = "") => {
  if (!id || !id.startsWith(prefix)) {
    return null;
  }
  if (suffix && !id.endsWith(suffix)) {
    return null;
  }
  const start = prefix.length;
  const end = suffix ? -suffix.length : undefined;
  const key = id.slice(start, end);
  return key || null;
};
const getTargetKeysFromSelector = (selector, prefix = "", suffix = "") => {
  const keys = [];
  qsa(selector).forEach((element) => {
    const key = getTargetKeyFromId(element.id, prefix, suffix);
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  });
  return keys;
};
const getTargetElementMap = (selector, prefix = "", suffix = "") => {
  const map = new Map();
  qsa(selector).forEach((element) => {
    const key = getTargetKeyFromId(element.id, prefix, suffix);
    if (key) {
      map.set(key, element);
    }
  });
  return map;
};
const getElementUnitSuffix = (element, fallbackUnit = "") => {
  if (!element) {
    return fallbackUnit;
  }
  if (element.dataset.unitSuffix !== undefined) {
    return element.dataset.unitSuffix;
  }
  const text = String(element.textContent || "");
  const match = text.match(/(\s*[a-zA-Z]+)$/);
  const suffix = match ? match[1] : "";
  element.dataset.unitSuffix = suffix;
  return element.dataset.unitSuffix || fallbackUnit;
};
const getElementFallbackText = (element) => {
  if (!element) {
    return "";
  }
  if (element.dataset.fallbackText !== undefined) {
    return element.dataset.fallbackText;
  }
  element.dataset.fallbackText = element.textContent || "";
  return element.dataset.fallbackText;
};
const getPrimaryTargetKeys = () => {
  const keys = [];
  const addKeys = (list) => {
    list.forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
  };
  addKeys(getTargetKeysFromSelector("[id^='today-']", "today-"));
  addKeys(
    getTargetKeysFromSelector(
      "[id$='-progress']:not([id^='recipe-'])",
      "",
      "-progress"
    )
  );
  addKeys(
    getTargetKeysFromSelector(
      "[id^='recipe-'][id$='-progress']",
      "recipe-",
      "-progress"
    )
  );
  addKeys(getTargetKeysFromSelector("[id^='log-impact-']", "log-impact-"));
  if (keys.length) {
    return keys;
  }
  return (state.customTargets || [])
    .map((target) => target.key)
    .filter((key) => isOptionalTargetKey(key));
};
const getPrimaryTargetKeySet = () => new Set(getPrimaryTargetKeys());
const getSecondaryTargets = () => {
  const primaryKeys = getPrimaryTargetKeySet();
  return (state.customTargets || []).filter(
    (target) => !primaryKeys.has(target.key)
  );
};
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

const setupArchiveButton = (button, options = {}) => {
  button.className = "icon-button archive-button";
  const icon = document.createElement("span");
  icon.className = "icon-mask";
  icon.setAttribute("aria-hidden", "true");
  button.replaceChildren(icon);
  const label = options.label || "Archive";
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
  confirmText = "Confirm",
  confirmTone = "primary",
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
  if (acceptButton) {
    acceptButton.classList.remove("primary", "danger", "ghost");
    if (confirmTone) {
      acceptButton.classList.add(confirmTone);
    }
  }
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
    if (typeof menu._closeMenu === "function") {
      menu._closeMenu();
      return;
    }
    menu.classList.remove("open");
    const button = menu.querySelector(".menu-button");
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  });
};

const positionCardMenu = (wrapper, panel) => {
  if (!wrapper || !panel) {
    return;
  }
  const rect = wrapper.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const margin = 12;
  const offset = 8;

  let top = rect.bottom + offset;
  let left = rect.right - panelRect.width;

  if (left < margin) {
    left = margin;
  }
  if (left + panelRect.width > viewportWidth - margin) {
    left = Math.max(margin, viewportWidth - panelRect.width - margin);
  }

  panel.style.maxHeight = "";
  panel.style.overflowY = "";

  if (top + panelRect.height > viewportHeight - margin) {
    const aboveTop = rect.top - panelRect.height - offset;
    if (aboveTop >= margin) {
      top = aboveTop;
    } else {
      const spaceBelow = viewportHeight - rect.bottom - margin - offset;
      const spaceAbove = rect.top - margin - offset;
      if (spaceAbove > spaceBelow) {
        top = margin;
        panel.style.maxHeight = `${Math.max(spaceAbove, 120)}px`;
        panel.style.overflowY = "auto";
      } else {
        top = rect.bottom + offset;
        panel.style.maxHeight = `${Math.max(spaceBelow, 120)}px`;
        panel.style.overflowY = "auto";
      }
    }
  }

  panel.style.top = `${Math.max(margin, top)}px`;
  panel.style.left = `${Math.max(margin, left)}px`;
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

  const handleReposition = () => positionCardMenu(wrapper, panel);
  const cleanup = () => {
    window.removeEventListener("resize", handleReposition);
    document.removeEventListener("scroll", handleReposition, true);
    wrapper._menuCleanup = null;
  };
  const closeMenu = () => {
    wrapper.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    panel.classList.remove("open");
    if (panel.isConnected) {
      panel.remove();
    }
    cleanup();
  };
  wrapper._closeMenu = closeMenu;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.contains("open");
    closeCardMenus();
    if (!isOpen) {
      wrapper.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      if (!panel.isConnected) {
        document.body.appendChild(panel);
      }
      panel.classList.add("open");
      panel.style.visibility = "hidden";
      panel.style.pointerEvents = "none";
      requestAnimationFrame(() => {
        positionCardMenu(wrapper, panel);
        panel.style.visibility = "";
        panel.style.pointerEvents = "";
      });
      window.addEventListener("resize", handleReposition);
      document.addEventListener("scroll", handleReposition, true);
      wrapper._menuCleanup = cleanup;
    }
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  wrapper.append(button);
  return wrapper;
};

const cloneTemplate = (selector) => {
  const template = qs(selector);
  if (!template || !template.content) {
    return null;
  }
  const node = template.content.firstElementChild;
  return node ? node.cloneNode(true) : null;
};

const buildListCard = ({
  title = "",
  metaLines = [],
  menuItems = [],
  actions = [],
  details = null,
  className = "",
} = {}) => {
  const card = cloneTemplate("#list-card-template") || document.createElement("div");
  if (!card.classList.contains("list-card")) {
    card.classList.add("list-card");
  }
  if (className) {
    className
      .split(" ")
      .filter(Boolean)
      .forEach((token) => card.classList.add(token));
  }

  let titleEl = card.querySelector("[data-card-title]") || card.querySelector("h4");
  if (!titleEl) {
    titleEl = document.createElement("h4");
    card.appendChild(titleEl);
  }
  if (titleEl) {
    titleEl.textContent = title;
  }

  const metas = (metaLines || []).filter(Boolean);
  const metaContainer = card.querySelector("[data-card-meta-container]");
  if (metaContainer) {
    const metaTemplate =
      metaContainer.querySelector("[data-card-meta-line]") ||
      document.createElement("div");
    metaTemplate.classList.add("meta");
    metaContainer.innerHTML = "";
    if (metas.length) {
      metas.forEach((line) => {
        const meta = metaTemplate.cloneNode(true);
        meta.removeAttribute("data-card-meta-line");
        meta.textContent = line;
        metaContainer.appendChild(meta);
      });
    } else {
      metaContainer.remove();
    }
  } else if (metas.length) {
    metas.forEach((line) => {
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = line;
      card.appendChild(meta);
    });
  }

  const actionsContainer = card.querySelector("[data-card-actions]");
  if (actionsContainer) {
    actionsContainer.innerHTML = "";
    if (actions.length) {
      actions.forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.className || "ghost";
        button.textContent = action.label;
        button.addEventListener("click", action.onClick);
        actionsContainer.appendChild(button);
      });
    } else {
      actionsContainer.remove();
    }
  } else if (actions.length) {
    const actionsEl = document.createElement("div");
    actionsEl.className = "actions";
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.className || "ghost";
      button.textContent = action.label;
      button.addEventListener("click", action.onClick);
      actionsEl.appendChild(button);
    });
    card.appendChild(actionsEl);
  }

  const menuSlot = card.querySelector("[data-card-menu]");
  if (menuItems && menuItems.length) {
    card.classList.add("has-menu");
    const menu = createCardMenu(menuItems);
    if (menuSlot) {
      menuSlot.appendChild(menu);
    } else {
      card.appendChild(menu);
    }
  } else if (menuSlot) {
    menuSlot.remove();
  }

  const detailsSlot = card.querySelector("[data-card-details]");
  if (details) {
    if (detailsSlot) {
      detailsSlot.appendChild(details);
    } else {
      card.appendChild(details);
    }
  } else if (detailsSlot) {
    detailsSlot.remove();
  }

  return card;
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

const createTotals = (keys) =>
  keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

const addTotals = (totals, source, multiplier, keys) => {
  keys.forEach((key) => {
    totals[key] += parseNumeric(source?.[key], 0) * multiplier;
  });
};

const buildPrimarySummaryText = (nutrition) => {
  const keys = getPrimaryTargetKeys();
  if (!keys.length) {
    return "";
  }
  return keys
    .map((key) => {
      const value = parseNumeric(nutrition?.[key], 0);
      const unit = getTargetUnit(key);
      const label = getTargetLabel(key);
      return `${label}: ${formatNutrientDisplay(value, unit)}`.trim();
    })
    .join(", ");
};

const buildNutritionDetailEntries = (nutrition) => {
  return (state.customTargets || []).map((target) => {
    const unit = getTargetUnit(target.key);
    const label = getTargetLabel(target.key);
    const value = parseNumeric(nutrition?.[target.key], 0);
    return {
      label,
      value: `${formatNutrientDisplay(value, unit)}`.trim(),
    };
  });
};

const buildExtraFactEntries = (item) =>
  getSecondaryTargets().reduce((entries, target) => {
    const value = item?.[target.key];
    if (value === null || value === undefined) {
      return entries;
    }
    const label = getTargetLabel(target.key);
    const unit = getTargetUnit(target.key);
    entries.push({
      label,
      value: `${formatNutrientDisplay(value, unit)}`.trim(),
    });
    return entries;
  }, []);

const LIBRARY_FIELD_KEYS = [
  "name",
  "barcode",
  "unit",
  "ingredientsList",
  "vitamins",
  "allergens",
  "servingSize",
  "servingsPerContainer",
];

const applyLibraryFieldValues = (setter, data, options = {}) => {
  LIBRARY_FIELD_KEYS.forEach((field) => {
    setter(field, data?.[field], options);
  });
  const targetKeys = getTrackedTargetKeys();
  if (targetKeys.length) {
    targetKeys.forEach((key) => {
      setter(key, data?.[key], options);
    });
    return;
  }
  Object.keys(data || {}).forEach((key) => {
    if (typeof data?.[key] === "number") {
      setter(key, data?.[key], options);
    }
  });
};

const buildExtraNutrientValues = (data) =>
  CUSTOM_TARGET_OPTIONS.reduce((values, option) => {
    values[option.key] = data?.[option.key];
    return values;
  }, {});

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

const getCatalogTargetOption = (key) => CUSTOM_TARGET_LOOKUP.get(key) || null;

const getAvailableTargetOptions = () => {
  const existingKeys = new Set(
    (state.customTargets || []).map((target) => target.key)
  );
  return CUSTOM_TARGET_OPTIONS.filter((option) => !existingKeys.has(option.key));
};

const setCustomTargetUnit = (key) => {
  const option = getCatalogTargetOption(key);
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
  const dateLabel = consumed.toLocaleDateString();
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
  getExtraNutrientOptions().find((nutrient) => nutrient.name === name);

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

  getExtraNutrientOptions()
    .filter((nutrient) => !existing.has(nutrient.name))
    .forEach((nutrient) => {
      const option = document.createElement("option");
      option.value = nutrient.name;
      option.textContent = nutrient.label;
      elements.extraNutrientSelect.appendChild(option);
    });

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
  input.step = config.step || "1";
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

  getExtraNutrientOptions()
    .filter((nutrient) => !existing.has(nutrient.name))
    .forEach((nutrient) => {
      const option = document.createElement("option");
      option.value = nutrient.name;
      option.textContent = nutrient.label;
      elements.foodExtraNutrientSelect.appendChild(option);
    });

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
  input.step = config.step || "1";
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
    const summaryLine = buildPrimarySummaryText(ingredient);
    const summaryText = summaryLine
      ? `${summaryLine} per ${ingredient.unit}`
      : `Per ${ingredient.unit}`;
    const barcodeText = ingredient.barcode
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

    entries.push(...buildExtraFactEntries(ingredient));

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    const summaryLabel = document.createElement("span");
    summaryLabel.className = "meta details-summary-text";
    summaryLabel.textContent = "Full label details";
    summaryContent.append(summaryToggle, summaryLabel);

    const details = buildDetails("Full label details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const menuItems = [
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
        label: "Archive ingredient",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Archive ingredient",
            message: `Archive ${ingredient.name}? Recipes and logs will keep the ingredient details.`,
            confirmText: "Archive",
            confirmTone: "primary",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.ingredientStatus, "Archiving...");
            await api(`/api/ingredients/${ingredient.id}`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.ingredientStatus, "Ingredient archived.");
          } catch (error) {
            setStatus(elements.ingredientStatus, error.message, "error");
          }
        },
      },
      {
        label: "Delete ingredient",
        tone: "danger",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Delete ingredient",
            message: `Delete ${ingredient.name}? This removes related log history and recipe items.`,
            confirmText: "Delete",
            confirmTone: "danger",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.ingredientStatus, "Deleting...");
            await api(`/api/ingredients/${ingredient.id}?mode=hard`, {
              method: "DELETE",
            });
            await refreshData();
            setStatus(elements.ingredientStatus, "Ingredient deleted.");
          } catch (error) {
            setStatus(elements.ingredientStatus, error.message, "error");
          }
        },
      },
    ];

    const card = buildListCard({
      title: ingredient.name,
      metaLines: [summaryText, barcodeText],
      menuItems,
      details,
    });
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
    const summaryLine = buildPrimarySummaryText(food);
    const summaryText = summaryLine
      ? `${summaryLine} per ${food.unit}`
      : `Per ${food.unit}`;
    const barcodeText = food.barcode ? `Barcode: ${food.barcode}` : "Barcode: none";

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

    entries.push(...buildExtraFactEntries(food));

    const summaryContent = document.createElement("span");
    summaryContent.className = "details-summary-row";
    const summaryToggle = document.createElement("span");
    summaryToggle.className = "details-summary-toggle";
    summaryToggle.setAttribute("aria-hidden", "true");
    summaryToggle.textContent = "▼";
    const summaryLabel = document.createElement("span");
    summaryLabel.className = "meta details-summary-text";
    summaryLabel.textContent = "Full label details";
    summaryContent.append(summaryToggle, summaryLabel);

    const details = buildDetails("Full label details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const menuItems = [
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
        label: "Archive food",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Archive food",
            message: `Archive ${food.name}? Logs will keep the food details.`,
            confirmText: "Archive",
            confirmTone: "primary",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.foodStatus, "Archiving...");
            await api(`/api/foods/${food.id}`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.foodStatus, "Food archived.");
          } catch (error) {
            setStatus(elements.foodStatus, error.message, "error");
          }
        },
      },
      {
        label: "Delete food",
        tone: "danger",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Delete food",
            message: `Delete ${food.name}? This removes related log history and recipe items.`,
            confirmText: "Delete",
            confirmTone: "danger",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.foodStatus, "Deleting...");
            await api(`/api/foods/${food.id}?mode=hard`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.foodStatus, "Food deleted.");
          } catch (error) {
            setStatus(elements.foodStatus, error.message, "error");
          }
        },
      },
    ];

    const card = buildListCard({
      title: food.name,
      metaLines: [summaryText, barcodeText],
      menuItems,
      details,
    });
    elements.foodList.appendChild(card);
  });
};

const buildLibraryPayload = (item) => {
  const payload = {
    name: item?.name ?? "",
    barcode: item?.barcode ?? "",
    unit: item?.unit ?? "",
    servingSize: item?.servingSize ?? "",
    servingsPerContainer: item?.servingsPerContainer ?? "",
    ingredientsList: item?.ingredientsList ?? "",
    vitamins: item?.vitamins ?? "",
    allergens: item?.allergens ?? "",
  };
  getTrackedTargetKeys().forEach((key) => {
    payload[key] = item?.[key] ?? "";
  });
  return payload;
};

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
    confirmTone: "primary",
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
    confirmTone: "primary",
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

const setRecipePanelMode = (mode) => {
  if (!elements.recipeList || !elements.recipeIngredientList) {
    return;
  }
  const nextMode = mode === "ingredients" ? "ingredients" : "recipes";
  recipePanelMode = nextMode;
  if (elements.recipePanelRecipes) {
    elements.recipePanelRecipes.classList.toggle(
      "is-active",
      nextMode === "recipes"
    );
  }
  if (elements.recipePanelIngredients) {
    elements.recipePanelIngredients.classList.toggle(
      "is-active",
      nextMode === "ingredients"
    );
  }
  if (elements.recipeListPanel) {
    elements.recipeListPanel.hidden = nextMode !== "recipes";
  }
  if (elements.recipeIngredientsPanel) {
    elements.recipeIngredientsPanel.hidden = nextMode !== "ingredients";
  }
};

const getRecipeRows = () =>
  Array.from(elements.recipeItems?.querySelectorAll(".recipe-item-row") || []);

const ensureRecipeItemsPlaceholder = () => {
  if (!elements.recipeItems) {
    return;
  }
  const existing = elements.recipeItems.querySelector(".recipe-items-empty");
  const hasRows = Boolean(elements.recipeItems.querySelector(".recipe-item-row"));
  if (hasRows) {
    if (existing) {
      existing.remove();
    }
    return;
  }
  if (!existing) {
    const empty = document.createElement("p");
    empty.className = "meta recipe-items-empty";
    empty.textContent = "Use the ingredient list to add items.";
    elements.recipeItems.appendChild(empty);
  }
};

const clearRecipeItemsPlaceholder = () => {
  if (!elements.recipeItems) {
    return;
  }
  const existing = elements.recipeItems.querySelector(".recipe-items-empty");
  if (existing) {
    existing.remove();
  }
};

const addRecipeRow = (ingredient, options = {}) => {
  if (!elements.recipeItems || !ingredient) {
    return;
  }
  clearRecipeItemsPlaceholder();
  const row = document.createElement("div");
  row.className = "recipe-item-row";
  row.dataset.ingredientId = String(ingredient.id);
  row._ingredient = ingredient;

  const name = document.createElement("div");
  name.className = "recipe-item-name";
  const title = document.createElement("span");
  title.textContent = ingredient.name;
  name.appendChild(title);
  if (ingredient.barcode) {
    const barcode = document.createElement("span");
    barcode.className = "meta";
    barcode.textContent = `Barcode: ${ingredient.barcode}`;
    name.appendChild(barcode);
  }

  const quantity = document.createElement("input");
  quantity.type = "number";
  quantity.step = "1";
  quantity.value = options.quantity ?? "1";
  quantity.className = "recipe-quantity";

  const unit = document.createElement("input");
  unit.type = "text";
  unit.value = options.unit ?? ingredient.unit ?? "";
  unit.className = "recipe-unit";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    row.remove();
    ensureRecipeItemsPlaceholder();
    updateRecipeOverview();
  });

  row.append(name, quantity, unit, remove);
  elements.recipeItems.appendChild(row);
  quantity.addEventListener("input", updateRecipeOverview);
  unit.addEventListener("input", updateRecipeOverview);
  if (!options.skipUpdate) {
    updateRecipeOverview();
  }
};

const renderRecipeItems = (items = []) => {
  if (!elements.recipeItems) {
    return;
  }
  elements.recipeItems.innerHTML = "";
  if (!items.length) {
    ensureRecipeItemsPlaceholder();
    updateRecipeOverview();
    return;
  }
  items.forEach((item) => {
    const ingredient =
      item?.ingredient ||
      state.ingredients.find((entry) => entry.id === item?.ingredientId);
    if (!ingredient) {
      return;
    }
    addRecipeRow(ingredient, {
      quantity: item.quantity,
      unit: item.unit,
      skipUpdate: true,
    });
  });
  ensureRecipeItemsPlaceholder();
  updateRecipeOverview();
};

const updateRecipeImpact = (impactTotals, hasItems) => {
  if (!elements.recipeForm) {
    return;
  }
  const baseTotals = getSelectedDayTotals();
  const primaryKeys = getPrimaryTargetKeys();
  if (!hasItems) {
    state.logImpact = null;
    renderTodayTotals(baseTotals, null);
    updateProgressBars(baseTotals);
    setImpactBars(createTotals(primaryKeys));
    renderCustomTargetsPanel();
    return;
  }

  state.logImpact = impactTotals;
  renderTodayTotals(baseTotals, impactTotals);
  updateProgressBars(baseTotals);
  const projected = createTotals(primaryKeys);
  primaryKeys.forEach((key) => {
    projected[key] =
      parseNumeric(baseTotals?.[key], 0) + parseNumeric(impactTotals?.[key], 0);
  });
  setImpactBars(projected);
  renderCustomTargetsPanel();
};

const updateRecipeOverview = () => {
  if (!elements.recipeItems) {
    return;
  }

  const trackedKeys = getTrackedTargetKeys();
  const totals = createTotals(trackedKeys);
  const rows = getRecipeRows();

  rows.forEach((row) => {
    const ingredientId = Number(row.dataset.ingredientId);
    const ingredient =
      row._ingredient ||
      state.ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) {
      return;
    }
    const quantityInput = row.querySelector(".recipe-quantity");
    const unitInput = row.querySelector(".recipe-unit");
    const quantity = Math.max(parseNumeric(quantityInput?.value, 1), 0);
    const unit = String(unitInput?.value || ingredient.unit || "").trim();
    const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
    if (normalized.error) {
      return;
    }
    addTotals(totals, ingredient, normalized.quantity, trackedKeys);
  });

  const servingsInput = elements.recipeForm?.querySelector("[name='servings']");
  const servingsRaw = parseNumeric(servingsInput?.value, 1);
  const servings = Math.max(1, Math.round(servingsRaw));
  const perServing = createTotals(trackedKeys);
  trackedKeys.forEach((key) => {
    perServing[key] = parseNumeric(totals?.[key], 0) / servings;
  });
  updateRecipeImpact(perServing, rows.length > 0);
};

const renderRecipeIngredientList = () => {
  if (!elements.recipeIngredientList) {
    return;
  }
  const query = elements.recipeIngredientSearch
    ? elements.recipeIngredientSearch.value.trim().toLowerCase()
    : "";
  const items = query
    ? state.ingredients.filter((ingredient) => {
        const nameMatch = ingredient.name.toLowerCase().includes(query);
        const barcode = String(ingredient.barcode || "").toLowerCase();
        const barcodeMatch = barcode.includes(query);
        return nameMatch || barcodeMatch;
      })
    : state.ingredients;

  elements.recipeIngredientList.innerHTML = "";
  if (!state.ingredients.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = "Add ingredients to your library first.";
    elements.recipeIngredientList.appendChild(empty);
    return;
  }
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.textContent = "No ingredients match that search.";
    elements.recipeIngredientList.appendChild(empty);
    return;
  }

  items.forEach((ingredient) => {
    const summaryText = ingredient.barcode
      ? `Barcode: ${ingredient.barcode}`
      : "Barcode: none";
    const actions = [
      {
        label: "Add",
        onClick: () => {
          addRecipeRow(ingredient);
        },
      },
    ];

    const card = buildListCard({
      title: ingredient.name,
      metaLines: [summaryText],
      actions,
    });
    elements.recipeIngredientList.appendChild(card);
  });
};

const setRecipeFormMode = (recipe) => {
  if (!elements.recipeForm) {
    return;
  }
  if (!recipe) {
    editingRecipeId = null;
    if (elements.recipeFormTitle) {
      elements.recipeFormTitle.textContent = "Create recipe";
    }
    if (elements.recipeSubmit) {
      elements.recipeSubmit.textContent = "Create recipe";
    }
    if (elements.recipeCancel) {
      elements.recipeCancel.hidden = true;
    }
    elements.recipeForm.reset();
    renderRecipeItems([]);
    setRecipePanelMode("recipes");
    return;
  }

  editingRecipeId = recipe.id;
  if (elements.recipeFormTitle) {
    elements.recipeFormTitle.textContent = "Edit recipe";
  }
  if (elements.recipeSubmit) {
    elements.recipeSubmit.textContent = "Save recipe";
  }
  if (elements.recipeCancel) {
    elements.recipeCancel.hidden = false;
  }

  const nameInput = elements.recipeForm.querySelector("[name='name']");
  const servingsInput = elements.recipeForm.querySelector("[name='servings']");
  const notesInput = elements.recipeForm.querySelector("[name='notes']");
  if (nameInput) {
    nameInput.value = recipe.name || "";
  }
  if (servingsInput) {
    servingsInput.value = recipe.servings || 1;
  }
  if (notesInput) {
    notesInput.value = recipe.notes || "";
  }
  renderRecipeItems(recipe.items || []);
  setRecipePanelMode("ingredients");
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
    const summaryText = `${recipe.servings} servings`;

    const perServingSummary = buildPrimarySummaryText(
      recipe.nutrition.perServing
    );
    const perServingText = perServingSummary
      ? `Per serving: ${perServingSummary}`
      : "Per serving";

    const totalSummary = buildPrimarySummaryText(recipe.nutrition.totals);
    const totalLine = totalSummary ? `Total: ${totalSummary}` : "Total";

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
    const summaryLabel = document.createElement("span");
    summaryLabel.className = "meta details-summary-text";
    summaryLabel.textContent = perServingText;
    summaryContent.append(summaryToggle, summaryLabel);

    const details = buildDetails("Full recipe details", entries, {
      summaryContent,
      summaryClass: "details-summary",
    });

    const menuItems = [
      {
        label: "Edit",
        onClick: async () => {
          setRecipeFormMode(recipe);
          elements.recipeForm?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      },
      {
        label: "Archive recipe",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Archive recipe",
            message: `Archive ${recipe.name}? Logged intakes will keep the recipe details.`,
            confirmText: "Archive",
            confirmTone: "primary",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.recipeStatus, "Archiving...");
            await api(`/api/recipes/${recipe.id}`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.recipeStatus, "Recipe archived.");
          } catch (error) {
            setStatus(elements.recipeStatus, error.message, "error");
          }
        },
      },
      {
        label: "Delete recipe",
        tone: "danger",
        onClick: async () => {
          const confirmed = await confirmDialog({
            title: "Delete recipe",
            message: `Delete ${recipe.name}? This removes related log history.`,
            confirmText: "Delete",
            confirmTone: "danger",
          });
          if (!confirmed) {
            return;
          }
          try {
            setStatus(elements.recipeStatus, "Deleting...");
            await api(`/api/recipes/${recipe.id}?mode=hard`, { method: "DELETE" });
            await refreshData();
            setStatus(elements.recipeStatus, "Recipe deleted.");
          } catch (error) {
            setStatus(elements.recipeStatus, error.message, "error");
          }
        },
      },
    ];

    const card = buildListCard({
      title: recipe.name,
      metaLines: [summaryText],
      menuItems,
      details,
    });

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
    const titleText = entry.label || "Entry";
    const metaText = `${formatNumber(entry.quantity)} ${entry.unit} · ${formatEntryTimestamp(
      entry
    )}`;

    const macrosSummary = document.createElement("span");
    macrosSummary.className = "meta details-summary-text";
    const baseSummary = buildPrimarySummaryText(entry.nutrition);
    const customSummary = getSecondaryTargets().map((target) => {
      const unit = getTargetUnit(target.key);
      const label = getTargetLabel(target.key);
      const value = parseNumeric(entry?.nutrition?.[target.key], 0);
      return `${label}: ${formatNutrientDisplay(value, unit)}`.trim();
    });
    if (baseSummary && customSummary.length) {
      macrosSummary.textContent = `${baseSummary} · ${customSummary.join(" · ")}`;
    } else {
      macrosSummary.textContent = baseSummary || customSummary.join(" · ");
    }

    const detailEntries = [];
    if (entry.notes) {
      detailEntries.push({ label: "Notes", value: entry.notes, wide: true });
    }
    detailEntries.push(...buildNutritionDetailEntries(entry.nutrition));

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
        confirmText: "Delete",
        confirmTone: "danger",
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

    const card = buildListCard({
      title: titleText,
      metaLines: [metaText],
      details,
      className: "has-delete",
    });
    card.appendChild(deleteButton);

    elements.logList.appendChild(card);
  });
};

const getSelectedDayTotals = () =>
  getSelectedDayNutrientTotals(getTrackedTargetKeys());

const shouldShowImpactValues = (impact) => {
  if (elements.logForm) {
    return Boolean(impact && !elements.logItem?.disabled);
  }
  if (elements.recipeForm) {
    return Boolean(impact);
  }
  return false;
};

const renderTodayTotals = (totals, impact) => {
  const statElements = getTargetElementMap("[id^='today-']", "today-");
  const shouldShowImpact = shouldShowImpactValues(impact);
  statElements.forEach((element, key) => {
    const unit = getTargetUnit(key);
    const suffix = getElementUnitSuffix(element, unit);
    const value = parseNumeric(totals?.[key], 0);
    const baseText = `${formatNutrientValue(value, unit)}${suffix}`;
    const impactValue = parseNumeric(impact?.[key], 0);
    const showImpact =
      shouldShowImpact && Number.isFinite(impactValue) && impactValue !== 0;
    if (showImpact) {
      const impactSpan = document.createElement("span");
      impactSpan.className = "impact-inline";
      const targetValue = parseNumeric(getTargetValue(key), 0);
      const projected = value + impactValue;
      const willOver =
        targetValue > 0 && projected > targetValue && !getTargetAllowOver(key);
      if (willOver) {
        impactSpan.classList.add("is-over");
      }
      impactSpan.textContent = formatImpactValue(impactValue, suffix);
      element.replaceChildren(baseText, " ", impactSpan);
    } else {
      element.textContent = baseText;
    }
  });
};

const updateTodayStats = () => {
  const totals = getSelectedDayTotals();

  renderTodayTotals(totals, null);

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

const setImpactBars = (values) => {
  const impactBars = getTargetElementMap(
    "[id$='-impact-progress']",
    "",
    "-impact-progress"
  );
  impactBars.forEach((bar, key) => {
    setImpactBar(bar, values?.[key], getTargetValue(key), {
      warnOver: !getTargetAllowOver(key),
    });
  });
};

const formatTarget = (value, unit, allowOver = false) => {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const suffix = allowOver ? "+" : "";
  return `${formatNutrientDisplay(value, unit)}${suffix}`;
};

const updateProgressBars = (totals) => {
  const progressBars = getTargetElementMap(
    "[id$='-progress']:not([id^='recipe-'])",
    "",
    "-progress"
  );
  progressBars.forEach((bar, key) => {
    setProgressBar(bar, totals?.[key], getTargetValue(key));
    const macroItem = bar.closest(".macro-item");
    if (macroItem) {
      const targetValue = parseNumeric(getTargetValue(key), 0);
      const current = parseNumeric(totals?.[key], 0);
      const isOver =
        targetValue > 0 && current > targetValue && !getTargetAllowOver(key);
      macroItem.classList.toggle("is-over", isOver);
    }
  });

  const targetLabels = getTargetElementMap("[id$='-target']", "", "-target");
  targetLabels.forEach((element, key) => {
    const targetValue = formatTarget(
      getTargetValue(key),
      getTargetUnit(key),
      getTargetAllowOver(key)
    );
    element.textContent = targetValue
      ? `Target: ${targetValue}`
      : getElementFallbackText(element);
  });
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
  const targets = getSecondaryTargets();
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
  const showImpact = shouldShowImpactValues(state.logImpact);

  targets.forEach((target) => {
    const current = parseNumeric(totals[target.key], 0);
    const impactValue = parseNumeric(impactTotals[target.key], 0);
    const projectedValue = current + impactValue;
    const targetValue = parseNumeric(target.target, 0);
    const unit = getTargetUnit(target.key);
    const percent =
      targetValue > 0 ? Math.min(100, (current / targetValue) * 100) : 0;
    const projectedPercent =
      targetValue > 0
        ? Math.min(100, (projectedValue / targetValue) * 100)
        : 0;
    const item = document.createElement("div");
    item.className = "macro-item";
    if (!target.allowOver && targetValue > 0 && current > targetValue) {
      item.classList.add("is-over");
    }

    const label = document.createElement("span");
    label.className = "macro-label";
    label.textContent = getTargetLabel(target.key);

    const value = document.createElement("h3");
    const baseText = formatNutrientDisplay(current, unit);
    if (showImpact && impactValue !== 0) {
      const impactSpan = document.createElement("span");
      impactSpan.className = "impact-inline";
      if (!target.allowOver && targetValue > 0 && projectedValue > targetValue) {
        impactSpan.classList.add("is-over");
      }
      impactSpan.textContent = formatImpactValue(impactValue, unit);
      value.replaceChildren(baseText, " ", impactSpan);
    } else {
      value.textContent = baseText;
    }

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
    meta.textContent = `Target: ${formatNutrientDisplay(
      targetValue,
      unit
    )}${suffix}`;

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
  const orderedTargets = [...targets];
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
    const unit = getTargetUnit(target.key);
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

    const archiveButton = document.createElement("button");
    archiveButton.type = "button";
    setupArchiveButton(archiveButton, {
      label: `Archive ${target.label} target`,
    });
    archiveButton.addEventListener("click", async () => {
      const statusEl = elements.targetStatus || elements.customTargetStatus;
      const confirmed = await confirmDialog({
        title: "Archive target",
        message: `Archive the ${target.label} target?`,
        confirmText: "Archive",
        confirmTone: "primary",
      });
      if (!confirmed) {
        return;
      }
      try {
        setStatus(statusEl, "Archiving...");
        await api(`/api/custom-targets/${target.id}`, { method: "DELETE" });
        await refreshData();
        setStatus(statusEl, "Target archived.");
      } catch (error) {
        setStatus(statusEl, error.message, "error");
      }
    });

    fieldRow.append(input, archiveButton);
    entry.append(header, fieldRow);
    elements.customTargetList.appendChild(entry);
  });
};

const formatImpactValue = (value, unit) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? "+" : "";
  return `${sign}${formatNutrientDisplay(safeValue, unit)}`;
};

const createImpactTotals = () => createTotals(getTrackedTargetKeys());

const setLogImpactValues = (impact) => {
  const logImpactElements = getTargetElementMap(
    "[id^='log-impact-']",
    "log-impact-"
  );
  logImpactElements.forEach((element, key) => {
    const unit = getTargetUnit(key);
    const suffix = getElementUnitSuffix(element, unit);
    element.textContent = formatImpactValue(impact?.[key], suffix);
  });
};

const updateLogImpact = () => {
  if (!elements.logForm || !elements.logItem) {
    return;
  }
  const emptyImpact = createImpactTotals();
  const baseTotals = getSelectedDayTotals();
  const resetImpact = (message, tone) => {
    setLogImpactValues(emptyImpact);
    state.logImpact = emptyImpact;
    setImpactBars(emptyImpact);
    setStatus(elements.logImpactNote, message, tone);
    renderCustomTargetsPanel();
    renderTodayTotals(baseTotals, emptyImpact);
  };
  if (elements.logItem.disabled) {
    resetImpact("Select an item to preview.");
    return;
  }

  const type = elements.logForm.querySelector(
    "input[name='entryType']:checked"
  )?.value;
  const itemId = Number(elements.logItem.value);
  if (!type || !Number.isFinite(itemId)) {
    resetImpact("Select an item to preview.");
    return;
  }

  const quantityField = elements.logForm.querySelector("[name='quantity']");
  const unitField = elements.logForm.querySelector("[name='unit']");
  const quantity = Math.max(parseNumeric(quantityField?.value, 1), 0);
  const unit = String(unitField?.value ?? "").trim();
  let source = null;
  let normalizedQuantity = 0;

  if (type === "ingredient") {
    const ingredient = state.ingredients.find((item) => item.id === itemId);
    if (!ingredient) {
      resetImpact("Ingredient not found.", "error");
      return;
    }
    const normalized = normalizeIngredientQuantity(ingredient, quantity, unit);
    if (normalized.error) {
      resetImpact(normalized.error, "error");
      return;
    }
    source = ingredient;
    normalizedQuantity = normalized.quantity;
  } else if (type === "food") {
    const food = state.foods.find((item) => item.id === itemId);
    if (!food) {
      resetImpact("Food not found.", "error");
      return;
    }
    const normalized = normalizeIngredientQuantity(food, quantity, unit);
    if (normalized.error) {
      resetImpact(normalized.error, "error");
      return;
    }
    source = food;
    normalizedQuantity = normalized.quantity;
  } else {
    const recipe = state.recipes.find((item) => item.id === itemId);
    if (!recipe?.nutrition?.perServing) {
      resetImpact("Recipe data unavailable.", "error");
      return;
    }
    const normalized = normalizeRecipeQuantity(quantity, unit);
    if (normalized.error) {
      resetImpact(normalized.error, "error");
      return;
    }
    source = recipe.nutrition.perServing;
    normalizedQuantity = normalized.quantity;
  }

  const impact = createImpactTotals();
  addTotals(impact, source, normalizedQuantity, getTrackedTargetKeys());
  setLogImpactValues(impact);
  state.logImpact = impact;
  const primaryKeys = getPrimaryTargetKeys();
  const projected = createTotals(primaryKeys);
  primaryKeys.forEach((key) => {
    projected[key] =
      parseNumeric(baseTotals?.[key], 0) + parseNumeric(impact?.[key], 0);
  });
  setImpactBars(projected);
  setStatus(elements.logImpactNote, "");
  renderCustomTargetsPanel();
  renderTodayTotals(baseTotals, impact);
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
  state.targetLookup = new Map(
    (customTargets || []).map((target) => [target.key, target])
  );
  updateExtraNutrientSelect();
  updateFoodExtraNutrientSelect();

  renderIngredients();
  renderFoods();
  setRecipeFormMode(null);
  renderRecipeIngredientList();
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
  applyLibraryFieldValues(setIngredientFieldValue, data, options);
  const extraValues = buildExtraNutrientValues(data);

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

  applyLibraryFieldValues(setFoodFieldValue, data, options);
  const extraValues = buildExtraNutrientValues(data);

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

const handleRecipeIngredientBarcodeDetected = (barcode) => {
  setRecipePanelMode("ingredients");
  if (elements.recipeIngredientSearch) {
    elements.recipeIngredientSearch.value = barcode;
  }
  renderRecipeIngredientList();
  setStatus(elements.scanStatus, `Detected barcode ${barcode}`);
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
        } else if (scanTarget === "recipe-ingredient") {
          handleRecipeIngredientBarcodeDetected(barcode);
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
            } else if (scanTarget === "recipe-ingredient") {
              handleRecipeIngredientBarcodeDetected(barcode);
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

  qsa("[data-recipe-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.recipePanel;
      setRecipePanelMode(panel);
    });
  });

  if (elements.recipeIngredientSearch) {
    elements.recipeIngredientSearch.addEventListener(
      "input",
      renderRecipeIngredientList
    );
  }

  if (elements.addRecipeItem) {
    elements.addRecipeItem.addEventListener("click", () => {
      if (!state.ingredients.length) {
        setStatus(elements.recipeStatus, "Add ingredients first.", "error");
        return;
      }
      setRecipePanelMode("ingredients");
      elements.recipeIngredientSearch?.focus();
    });
  }

  if (elements.recipeCancel) {
    elements.recipeCancel.addEventListener("click", () => {
      setRecipeFormMode(null);
      setStatus(elements.recipeStatus, "Edit cancelled.");
    });
  }

  if (elements.recipeForm) {
    elements.recipeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const items = getRecipeRows()
        .map((row) => {
          const ingredientId = Number(row.dataset.ingredientId);
          if (!Number.isFinite(ingredientId)) {
            return null;
          }
          const quantityInput = row.querySelector(".recipe-quantity");
          const unitInput = row.querySelector(".recipe-unit");
          return {
            ingredientId,
            quantity: Number(quantityInput?.value || 1),
            unit: unitInput?.value || "unit",
          };
        })
        .filter(Boolean);

      if (!items.length) {
        setStatus(elements.recipeStatus, "Add ingredients first.", "error");
        return;
      }

      const payload = {
        name: formData.get("name"),
        servings: formData.get("servings"),
        notes: formData.get("notes"),
        items,
      };

      try {
        const wasEditing = Boolean(editingRecipeId);
        setStatus(elements.recipeStatus, "Saving...");
        if (editingRecipeId) {
          await api(`/api/recipes/${editingRecipeId}`, {
            method: "PUT",
            body: payload,
          });
        } else {
          await api("/api/recipes", { method: "POST", body: payload });
        }
        setRecipeFormMode(null);
        await refreshData();
        setStatus(
          elements.recipeStatus,
          wasEditing ? "Recipe updated." : "Recipe saved."
        );
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
      payload.consumedAt = now.getTime();
      payload.intakeDate = toDateInputValue(selectedDate || now);

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
        const isOptional = isOptionalTargetKey(existing.key);
        if (!isOptional && (parsedTarget.value === null || parsedTarget.value <= 0)) {
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
      const option = getCatalogTargetOption(key);
      if (!key || !option) {
        setStatus(elements.customTargetStatus, "Select a target.", "error");
        return;
      }
      const isOptional = isOptionalTargetKey(key);
      const payload = {
        key,
        label: option.label || "Custom target",
        target: isOptional ? null : DEFAULT_CUSTOM_TARGET_VALUE,
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
