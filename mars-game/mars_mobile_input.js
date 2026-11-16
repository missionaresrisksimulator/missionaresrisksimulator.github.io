/* M.A.R.S. — Mobile text-entry bridge
   Uses a real HTML input only on touch/mobile devices. Desktop keeps the
   original Pygame KEYDOWN/TEXTINPUT handling. */
(function () {
  "use strict";

  const values = { nombre: "", edad: "" };
  let enabled = false;
  let activeField = "nombre";
  let input = null;

  function isTouchDevice() {
    const coarsePointer = typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(
      (navigator && navigator.userAgent) || ""
    );
    return Boolean(coarsePointer || mobileUserAgent);
  }

  function ensureInput() {
    if (input && input.isConnected) return input;

    input = document.createElement("input");
    input.type = "text";
    input.id = "mars-mobile-text-input";
    input.setAttribute("aria-label", "M.A.R.S. player information");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("enterkeyhint", "done");

    // Keep the input rendered and focusable: mobile Safari/Chrome may refuse
    // to open the virtual keyboard for display:none or visibility:hidden.
    Object.assign(input.style, {
      position: "fixed",
      left: "50%",
      top: "50%",
      width: "4px",
      height: "4px",
      minWidth: "4px",
      minHeight: "4px",
      padding: "0",
      margin: "0",
      border: "0",
      outline: "0",
      opacity: "0.02",
      color: "transparent",
      background: "transparent",
      caretColor: "transparent",
      zIndex: "2147483647",
      fontSize: "16px",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none"
    });

    input.addEventListener("input", function () {
      if (!activeField) return;
      let next = input.value;
      if (activeField === "nombre") {
        next = next.slice(0, 20);
      } else {
        next = next.replace(/\D/g, "").slice(0, 3);
      }
      if (next !== input.value) input.value = next;
      values[activeField] = next;
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        focusField(activeField === "nombre" ? "edad" : "nombre");
      } else if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });

    document.body.appendChild(input);
    return input;
  }

  function focusField(field, initialValue) {
    if (!enabled || (field !== "nombre" && field !== "edad")) return;
    const el = ensureInput();
    activeField = field;

    if (typeof initialValue === "string") {
      values[field] = field === "nombre"
        ? initialValue.slice(0, 20)
        : initialValue.replace(/\D/g, "").slice(0, 3);
    }

    el.value = values[field] || "";
    el.inputMode = field === "edad" ? "numeric" : "text";
    el.maxLength = field === "edad" ? 3 : 20;
    el.autocapitalize = field === "nombre" ? "words" : "off";

    // Must run directly in response to the canvas pointer event.
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      el.focus();
    }
  }

  window.MARSInput = {
    isTouchDevice,
    setEnabled(state) {
      enabled = Boolean(state);
      if (!enabled && input) input.blur();
    },
    focusField,
    getField() {
      return activeField || "";
    },
    getValue() {
      return activeField ? (values[activeField] || "") : "";
    },
    isEnabled() {
      return enabled;
    }
  };

  function attachCanvasListener(canvas) {
    if (!canvas || canvas.dataset.marsInputBridge === "ready") return;
    canvas.dataset.marsInputBridge = "ready";

    canvas.addEventListener("pointerdown", function (event) {
      if (!enabled) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // Match the Pygame logical canvas size (900 × 600).
      const x = (event.clientX - rect.left) * 900 / rect.width;
      const y = (event.clientY - rect.top) * 600 / rect.height;

      if (x >= 280 && x <= 620 && y >= 245 && y <= 293) {
        focusField("nombre", values.nombre);
      } else if (x >= 280 && x <= 620 && y >= 325 && y <= 373) {
        focusField("edad", values.edad);
      }
    }, { passive: true });
  }

  function attachIfAvailable() {
    const canvas = document.getElementById("canvas");
    if (canvas) attachCanvasListener(canvas);
  }

  function startCanvasObserver() {
    attachIfAvailable();
    if (!document.body || !window.MutationObserver) return;
    const observer = new MutationObserver(attachIfAvailable);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCanvasObserver, { once: true });
  } else {
    startCanvasObserver();
  }
  window.addEventListener("load", attachIfAvailable, { once: true });
})();
