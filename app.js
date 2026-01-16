// =========================
// Elementos UI
// =========================
const input = document.getElementById("input");
const output = document.getElementById("output");
const charCount = document.getElementById("charCount");

const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const bulletDot = document.getElementById("bulletDot");
const bulletCheck = document.getElementById("bulletCheck");
const separatorBtn = document.getElementById("separator");
const iconSelect = document.getElementById("iconSelect");

const toolbarButtons = document.querySelectorAll("button[data-style]");

// =========================
// Helpers Unicode (Bold/Italic/Mono)
// =========================
function codePoint(ch) {
  return ch.codePointAt(0);
}

function mapLatin(ch, baseUpper, baseLower) {
  const cp = codePoint(ch);
  // A-Z
  if (cp >= 65 && cp <= 90) return String.fromCodePoint(baseUpper + (cp - 65));
  // a-z
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(baseLower + (cp - 97));
  return ch;
}

function mapDigits(ch, baseDigit) {
  const cp = codePoint(ch);
  // 0-9
  if (cp >= 48 && cp <= 57) return String.fromCodePoint(baseDigit + (cp - 48));
  return ch;
}

// Nota:
// - Italic no cubre dígitos bien en Unicode "mathematical italic" -> dejamos solo letras.
// - Bold y Mono sí cubren 0-9 en los rangos estándar.
const styles = {
  // Mathematical Bold
  bold: (ch) => {
    // Bold A-Z: U+1D400, a-z: U+1D41A, 0-9: U+1D7CE
    let m = mapLatin(ch, 0x1D400, 0x1D41A);
    m = mapDigits(m, 0x1D7CE);
    return m;
  },

  // Mathematical Italic
  italic: (ch) => {
    // Italic A-Z: U+1D434, a-z: U+1D44E
    return mapLatin(ch, 0x1D434, 0x1D44E);
  },

  // Mathematical Monospace
  mono: (ch) => {
    // Mono A-Z: U+1D670, a-z: U+1D68A, 0-9: U+1D7F6
    let m = mapLatin(ch, 0x1D670, 0x1D68A);
    m = mapDigits(m, 0x1D7F6);
    return m;
  }
};

// =========================
// Aplicar estilo a selección
// =========================
function applyStyleToSelection(styleKey) {
  const styleFn = styles[styleKey];
  if (!styleFn) return;

  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (start === end) return; // nada seleccionado

  const before = input.value.slice(0, start);
  const selected = input.value.slice(start, end);
  const after = input.value.slice(end);

  const transformed = Array.from(selected).map(styleFn).join("");

  input.value = before + transformed + after;

  // restaurar selección transformada
  input.focus();
  input.selectionStart = start;
  input.selectionEnd = start + transformed.length;

  syncOutput();
}

// =========================
// Sincronización y contador
// =========================
function syncOutput() {
  output.value = input.value;
  charCount.textContent = String(output.value.length);
}

// =========================
// Bullets por líneas (en selección o texto entero)
// =========================
function bulletize(prefix) {
  const start = input.selectionStart;
  const end = input.selectionEnd;

  const text = input.value;
  const selection = start === end ? text : text.slice(start, end);

  const lines = selection.split("\n").map(l => {
    const trimmed = l.trim();
    if (!trimmed) return l; // mantener líneas vacías
    // Evitar doble bullet si ya tiene uno simple
    if (/^(•|✅|🔹|🔸|▪️|▫️|-|→|➜)\s+/.test(trimmed)) return l;
    return `${prefix} ${l}`;
  }).join("\n");

  if (start === end) {
    input.value = lines;
  } else {
    input.value = text.slice(0, start) + lines + text.slice(end);
    input.focus();
    input.selectionStart = start;
    input.selectionEnd = start + lines.length;
  }

  syncOutput();
}

// =========================
// Inserción en cursor
// =========================
function insertAtCursor(str) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const text = input.value;

  input.value = text.slice(0, start) + str + text.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + str.length;

  syncOutput();
}

// =========================
// Librería de íconos por grupos (optgroup)
// =========================
const ICON_GROUPS = {
  "Checks & Crosses": [
    // "cuadrado verde con tilde" y "cuadrado rojo con cruz" (mejor aproximación Unicode)
    "✅", "☑️", "✔️", "🟩", "🟩✔️", "🟩✅",
    "❌", "✖️", "❎", "🟥", "🟥❌", "🟥✖️",
    "🟢", "🔴", "🟡"
  ],

  "Prioridad / Atención": [
    "⚠️", "🚨", "🔥", "⚡", "❗", "❓", "‼️", "⁉️",
    "🔺", "🔻", "🛑"
  ],

  "Acción / Trabajo": [
    "🛠️", "🔧", "⚙️", "📌", "🎯", "🚀", "📍", "🔁",
    "➡️", "↗️", "↘️", "🔄"
  ],

  "Ideas / Pensar": [
    "💡", "🧠", "📐", "📏", "🧩", "🔍", "🧪", "🧭"
  ],

  "Documentos / Datos": [
    "📝", "📄", "📚", "📑", "🧾",
    "📊", "📈", "📉",
    "🔎", "📋"
  ],

  "Comunicación / Personas": [
    "👥", "🤝", "🙋", "💬", "📣", "📞", "✉️", "🔔",
    "🗣️"
  ],

  "Tiempo / Proceso": [
    "⏱️", "⌛", "🕒", "🗓️",
    "🔂", "🔁", "✅", "➡️"
  ],

  "Bullets & Separadores": [
    "•", "◦", "▪️", "▫️", "🔹", "🔸",
    "➜", "→", "—", "–", "│", "┃", "⋯"
  ]
};

function populateIcons() {
  iconSelect.innerHTML = `<option value="">Insertar ícono…</option>`;

  for (const groupName in ICON_GROUPS) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;

    ICON_GROUPS[groupName].forEach(icon => {
      const opt = document.createElement("option");
      opt.value = icon;
      opt.textContent = icon;
      optgroup.appendChild(opt);
    });

    iconSelect.appendChild(optgroup);
  }
}

populateIcons();

// =========================
// Eventos
// =========================

// Botones de estilo
toolbarButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const styleKey = btn.getAttribute("data-style");
    applyStyleToSelection(styleKey);
  });
});

// Bullets
bulletDot.addEventListener("click", () => bulletize("•"));
bulletCheck.addEventListener("click", () => bulletize("✅"));

// Separador
separatorBtn.addEventListener("click", () => insertAtCursor("\n────────────\n"));

// Íconos (insertar al cursor)
iconSelect.addEventListener("change", () => {
  const v = iconSelect.value;
  if (v) insertAtCursor(v + " ");
  iconSelect.value = "";
});

// Copiar
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    copyBtn.textContent = "Copiado";
    setTimeout(() => (copyBtn.textContent = "Copiar resultado"), 900);
  } catch {
    alert("No se pudo copiar. Probá manualmente (Ctrl+C).");
  }
});

// Limpiar
clearBtn.addEventListener("click", () => {
  input.value = "";
  syncOutput();
});

// Sync en vivo
input.addEventListener("input", syncOutput);

// Init
syncOutput();
