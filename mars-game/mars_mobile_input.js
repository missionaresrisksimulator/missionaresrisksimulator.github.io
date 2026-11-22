/*
 * M.A.R.S. — Inline native mobile inputs (v8: live DOM sync)
 *
 * The Pygame form remains visible and keeps its original layout. On touch
 * devices, real HTML inputs sit exactly on top of the two Pygame field
 * rectangles. The browser itself receives the tap and opens its native
 * keyboard; no delayed/programmatic focus from the Pygame event loop is used.
 *
 * A transparent HTML hit target sits over the existing Pygame Continue
 * button and stores a submit signal. Python polls both values and that signal.
 */
(function () {
  "use strict";

  const LOGICAL_WIDTH = 900;
  const LOGICAL_HEIGHT = 600;
  const STORAGE = {
    name: "MARS_NATIVE_FORM_NAME_V8",
    age: "MARS_NATIVE_FORM_AGE_V8",
    active: "MARS_NATIVE_FORM_ACTIVE_V8",
    submit: "MARS_NATIVE_FORM_SUBMIT_V8"
  };

  // These are the exact Pygame Rect coordinates in main.py.
  const ELEMENT_RECTS = {
    nombre: { x: 280, y: 245, width: 340, height: 48 },
    edad: { x: 280, y: 325, width: 340, height: 48 },
    continuar: { x: 330, y: 410, width: 240, height: 48 }
  };

  // Keep the complete game document in English and opt out of automatic
  // browser translation. The canvas-rendered Pygame UI is English as well.
  function lockEnglishDocument() {
    const root = document.documentElement;
    if (root) {
      root.lang = "en";
      root.setAttribute("translate", "no");
      root.classList.add("notranslate");
    }
    if (document.body) {
      document.body.lang = "en";
      document.body.setAttribute("translate", "no");
      document.body.classList.add("notranslate");
    }
  }

  lockEnglishDocument();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lockEnglishDocument, { once: true });
  }

  const controls = Object.create(null);
  const values = { nombre: "", edad: "" };
  let enabled = false;
  let activeField = "nombre";
  let submitPending = false;
  let canvas = null;
  let resizeObserver = null;
  let mutationObserver = null;
  let styleElement = null;

  function isTouchDevice() {
    const ua = (navigator && navigator.userAgent) || "";
    const coarse = typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const points = Number(navigator && navigator.maxTouchPoints) || 0;
    const appleTouchMac = navigator && navigator.platform === "MacIntel" && points > 1;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarse || points > 0 || appleTouchMac;
  }

  function normalizeValue(field, value) {
    const text = String(value == null ? "" : value);
    if (field === "edad") return text.replace(/[^0-9]/g, "").slice(0, 3);
    return text.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 20);
  }

  function persistValues() {
    try {
      window.localStorage.setItem(STORAGE.name, values.nombre);
      window.localStorage.setItem(STORAGE.age, values.edad);
      window.localStorage.setItem(STORAGE.active, activeField);
    } catch (_) {
      // The live DOM values remain available through getValue() if storage is blocked.
    }
  }

  function updateValue(field) {
    const input = controls[field];
    if (!input) return "";

    const next = normalizeValue(field, input.value);
    if (next !== input.value) {
      const cursor = input.selectionStart;
      input.value = next;
      try {
        const safeCursor = Math.min(cursor == null ? next.length : cursor, next.length);
        input.setSelectionRange(safeCursor, safeCursor);
      } catch (_) { /* Some mobile keyboards do not expose selection ranges. */ }
    }

    values[field] = next;
    persistValues();
    return next;
  }

  function addStyles() {
    if (styleElement && styleElement.isConnected) return;

    styleElement = document.createElement("style");
    styleElement.id = "mars-inline-native-input-styles-v8";
    styleElement.textContent = `
      .mars-inline-native-field,
      .mars-inline-native-submit {
        position: fixed !important;
        display: none;
        margin: 0 !important;
        box-sizing: border-box !important;
        z-index: 2147483647 !important;
        transform-origin: top left !important;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      .mars-inline-native-field {
        padding: 0 12px !important;
        border: 0 !important;
        border-radius: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #f0f0f0 !important;
        -webkit-text-fill-color: #f0f0f0 !important;
        caret-color: #ffd700 !important;
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 21px !important;
        font-weight: 700 !important;
        line-height: 48px !important;
        letter-spacing: normal !important;
        text-align: left !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      .mars-inline-native-field::placeholder {
        color: #6e737d !important;
        -webkit-text-fill-color: #6e737d !important;
        opacity: 1 !important;
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 21px !important;
        font-weight: 700 !important;
      }
      .mars-inline-native-submit {
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        color: transparent !important;
        box-shadow: none !important;
        opacity: 0.01 !important;
        -webkit-appearance: none !important;
        appearance: none !important;
      }
      .mars-inline-native-submit:focus,
      .mars-inline-native-field:focus {
        outline: 0 !important;
        box-shadow: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(styleElement);
  }

  function createField(field) {
    if (controls[field] && controls[field].isConnected) return controls[field];

    const input = document.createElement("input");
    input.type = "text";
    input.id = `mars-inline-native-${field}-v8`;
    input.className = "mars-inline-native-field notranslate";
    input.setAttribute("translate", "no");
    input.setAttribute("lang", "en");
    input.setAttribute("translate", "no");
    input.setAttribute("aria-label", field === "nombre" ? "Player name" : "Player age");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", field === "nombre" ? "words" : "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("enterkeyhint", field === "nombre" ? "next" : "done");
    input.setAttribute("inputmode", field === "edad" ? "numeric" : "text");
    input.maxLength = field === "edad" ? 3 : 20;
    input.placeholder = field === "nombre" ? "Enter your name" : "Age";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.style.display = "none";

    input.addEventListener("focus", function () {
      activeField = field;
      persistValues();
    });

    // The native input element is the source of truth. Listen to all editing
    // pathways, while Python also polls input.value directly every game frame.
    ["input", "change", "keyup", "compositionend"].forEach(function (eventName) {
      input.addEventListener(eventName, function () {
        activeField = field;
        updateValue(field);
      });
    });
    ["paste", "cut", "drop"].forEach(function (eventName) {
      input.addEventListener(eventName, function () {
        activeField = field;
        window.setTimeout(function () { updateValue(field); }, 0);
      });
    });
    input.addEventListener("pointerdown", function () {
      activeField = field;
      persistValues();
    }, { passive: true });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (field === "nombre") {
          const age = controls.edad;
          if (age) age.focus();
        } else {
          input.blur();
        }
      } else if (event.key === "Tab") {
        event.preventDefault();
        const next = controls[field === "nombre" ? "edad" : "nombre"];
        if (next) next.focus();
      }
    });

    document.body.appendChild(input);
    controls[field] = input;
    return input;
  }

  function createSubmitTarget() {
    if (controls.continuar && controls.continuar.isConnected) return controls.continuar;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "mars-inline-native-submit-v8";
    button.className = "mars-inline-native-submit notranslate";
    button.setAttribute("translate", "no");
    button.setAttribute("aria-label", "Continue");
    button.style.display = "none";

    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (!enabled) return;
      updateValue("nombre");
      updateValue("edad");
      submitPending = true;
      try { window.localStorage.setItem(STORAGE.submit, "1"); } catch (_) { /* handled by memory fallback */ }
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    });

    document.body.appendChild(button);
    controls.continuar = button;
    return button;
  }

  function placeElement(element, logicalRect, canvasRect, scaleX, scaleY) {
    Object.assign(element.style, {
      display: "block",
      left: `${canvasRect.left + logicalRect.x * scaleX}px`,
      top: `${canvasRect.top + logicalRect.y * scaleY}px`,
      width: `${logicalRect.width}px`,
      height: `${logicalRect.height}px`,
      transform: `scale(${scaleX}, ${scaleY})`
    });
  }

  // If a device rounds CSS coordinates differently and a tap lands on the
  // canvas beside an HTML input, catch it synchronously in the real pointer
  // event. This direct user-gesture path is important for iOS virtual keyboards.
  function handleCanvasPointerDown(event) {
    if (!enabled || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) * LOGICAL_WIDTH / rect.width;
    const y = (event.clientY - rect.top) * LOGICAL_HEIGHT / rect.height;
    const nameRect = ELEMENT_RECTS.nombre;
    const ageRect = ELEMENT_RECTS.edad;
    let input = null;

    if (x >= nameRect.x && x <= nameRect.x + nameRect.width && y >= nameRect.y && y <= nameRect.y + nameRect.height) {
      input = controls.nombre;
    } else if (x >= ageRect.x && x <= ageRect.x + ageRect.width && y >= ageRect.y && y <= ageRect.y + ageRect.height) {
      input = controls.edad;
    }

    if (input) {
      event.preventDefault();
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    }
  }

  function updatePositions() {
    if (!enabled) return;

    const currentCanvas = document.getElementById("canvas");
    if (!currentCanvas) return;
    canvas = currentCanvas;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = rect.width / LOGICAL_WIDTH;
    const scaleY = rect.height / LOGICAL_HEIGHT;

    placeElement(controls.nombre, ELEMENT_RECTS.nombre, rect, scaleX, scaleY);
    placeElement(controls.edad, ELEMENT_RECTS.edad, rect, scaleX, scaleY);
    placeElement(controls.continuar, ELEMENT_RECTS.continuar, rect, scaleX, scaleY);
  }

  function setEnabled(state) {
    const next = Boolean(state);

    if (next) {
      addStyles();
      createField("nombre");
      createField("edad");
      createSubmitTarget();

      if (!enabled) {
        values.nombre = "";
        values.edad = "";
        activeField = "nombre";
        submitPending = false;
        controls.nombre.value = "";
        controls.edad.value = "";
        try { window.localStorage.setItem(STORAGE.submit, "0"); } catch (_) { /* ignore */ }
        persistValues();
      }

      enabled = true;
      updatePositions();
    } else {
      enabled = false;
      ["nombre", "edad"].forEach(function (field) {
        const input = controls[field];
        if (!input) return;
        if (document.activeElement === input) input.blur();
        input.style.display = "none";
      });
      const button = controls.continuar;
      if (button) button.style.display = "none";
    }
  }

  window.MARSInput = {
    isTouchDevice: isTouchDevice,
    setEnabled: setEnabled,
    // Kept for compatibility with existing Python code. Native controls
    // receive focus directly from the user's touch, not from this method.
    focusField: function (field, initialValue) {
      const input = controls[field];
      if (!enabled || !input) return false;
      if (!input.value && initialValue) {
        input.value = normalizeValue(field, initialValue);
        updateValue(field);
      }
      return true;
    },
    getField: function () { return activeField; },
    getValue: function (field) {
      const key = (field === "nombre" || field === "edad")
        ? field
        : (activeField === "edad" ? "edad" : "nombre");
      const input = controls[key];
      // Return the live DOM value first. The caller must never depend on a
      // possibly stale localStorage copy for normal keyboard input.
      if (!input) return "";
      return normalizeValue(key, input.value);
    },
    getValues: function () {
      return {
        nombre: controls.nombre ? normalizeValue("nombre", controls.nombre.value) : "",
        edad: controls.edad ? normalizeValue("edad", controls.edad.value) : ""
      };
    },
    consumeSubmission: function () {
      const pending = submitPending;
      submitPending = false;
      return pending;
    },
    isEnabled: function () { return enabled; }
  };

  function attachCanvasObserver() {
    const currentCanvas = document.getElementById("canvas");
    if (currentCanvas && currentCanvas !== canvas) {
      if (canvas) canvas.removeEventListener("pointerdown", handleCanvasPointerDown, true);
      canvas = currentCanvas;
      canvas.addEventListener("pointerdown", handleCanvasPointerDown, true);
      if (resizeObserver) resizeObserver.disconnect();
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(function () { updatePositions(); });
        resizeObserver.observe(canvas);
      }
    }
    updatePositions();
  }

  function startObservers() {
    attachCanvasObserver();

    if (document.body && window.MutationObserver && !mutationObserver) {
      mutationObserver = new MutationObserver(function () {
        if (!canvas || !canvas.isConnected) attachCanvasObserver();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("resize", updatePositions, { passive: true });
    window.addEventListener("orientationchange", function () {
      window.setTimeout(updatePositions, 150);
    }, { passive: true });
    window.addEventListener("scroll", updatePositions, { passive: true, capture: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObservers, { once: true });
  } else {
    startObservers();
  }
  window.addEventListener("load", attachCanvasObserver, { once: true });
})();
