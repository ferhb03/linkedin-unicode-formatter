// ============================================
// LinkedIn Unicode Formatter - app.js (FULL)
// Editor (izq): texto normal con formato visual
// Output (der): Unicode listo para copiar/pegar
// ============================================

// ---------- DOM ----------
const editor = document.getElementById("editor");     // contenteditable div
const output = document.getElementById("output");     // readonly textarea
const charCount = document.getElementById("charCount");

const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const separatorBtn = document.getElementById("separator");

const iconSelect = document.getElementById("iconSelect");
const toolbarButtons = document.querySelectorAll("button[data-style]");

// ---------- Unicode mapping helpers ----------
function codePoint(ch) {
  return ch.codePointAt(0);
}

function mapLatin(ch, baseUpper, baseLower) {
  const cp = codePoint(ch);
  if (cp >= 65 && cp <= 90) return String.fromCodePoint(baseUpper + (cp - 65));     // A-Z
  if (cp >= 97 && cp <= 122) return String.fromCodePoint(baseLower + (cp - 97));   // a-z
  return ch;
}

function mapDigits(ch, baseDigit) {
  const cp = codePoint(ch);
  if (cp >= 48 && cp <= 57) return String.fromCodePoint(baseDigit + (cp - 48));    // 0-9
  return ch;
}

const styles = {
  // Mathematical Bold
  bold: (ch) => {
    let m = mapLatin(ch, 0x1D400, 0x1D41A); // A-Z, a-z
    m = mapDigits(m, 0x1D7CE);            // 0-9
    return m;
  },

  // Mathematical Italic (solo letras)
  italic: (ch) => mapLatin(ch, 0x1D434, 0x1D44E),

  // Mathematical Bold Italic (solo letras)
  boldItalic: (ch) => mapLatin(ch, 0x1D468, 0x1D482),

  // Mathematical Monospace
  mono: (ch) => {
    let m = mapLatin(ch, 0x1D670, 0x1D68A);
    m = mapDigits(m, 0x1D7F6);
    return m;
  }
};

// ---------- Icon library (optgroups) ----------
const ICON_GROUPS = {
  "Checks & Crosses": [
    "✅", "☑️", "✔️", "🟩", "🟩✔️", "🟩✅",
    "❌", "✖️", "❎", "🟥", "🟥❌", "🟥✖️",
    "🟢", "🔴", "🟡"
  ],
  "Prioridad / Atención": [
    "⚠️", "🚨", "🔥", "⚡", "❗", "❓", "‼️", "⁉️", "🛑",
    "🔺", "🔻"
  ],
  "Acción / Trabajo": [
    "🛠️", "🔧", "⚙️", "📌", "🎯", "🚀", "📍", "🔁", "🔄",
    "➡️", "↗️", "↘️"
  ],
  "Ideas / Pensar": [
    "💡", "🧠", "📐", "📏", "🧩", "🔍", "🧪", "🧭"
  ],
  "Documentos / Datos": [
    "📝", "📄", "📚", "📑", "🧾", "📋",
    "📊", "📈", "📉", "🔎"
  ],
  "Comunicación / Personas": [
    "👥", "🤝", "🙋", "💬", "📣", "📞", "✉️", "🔔", "🗣️"
  ],
  "Tiempo / Proceso": [
    "⏱️", "⌛", "🕒", "🗓️", "🔂", "🔁", "➡️"
  ],
  "Bullets & Separadores": [
    "•", "◦", "▪️", "▫️", "🔹", "🔸", "➜", "→",
    "—", "–", "│", "┃", "⋯"
  ]
};

function populateIcons() {
  if (!iconSelect) return;
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

// ---------- Contenteditable insertion helpers ----------
function insertTextAtCursor(text) {
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    // fallback: append
    editor.appendChild(document.createTextNode(text));
    return;
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));

  // move caret after inserted text
  range.setStart(range.endContainer, range.endOffset);
  range.collapse(true);

  sel.removeAllRanges();
  sel.addRange(range);
}

function insertPlainTextWithNewlines(text) {
  editor.focus();

  // Normalizar saltos de línea (Windows/Word/Docs)
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    // Si no hay selección, agregamos al final
    editor.textContent += normalized;
    return;
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Insertar líneas con <br> para respetar formato de párrafo visual
  const parts = normalized.split("\n");
  parts.forEach((part, idx) => {
    range.insertNode(document.createTextNode(part));
    if (idx < parts.length - 1) {
      range.insertNode(document.createElement("br"));
    }
  });

  // Mover caret al final de lo insertado
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(editor);
  newRange.collapse(false);
  sel.addRange(newRange);
}

function insertNewlinesAround(text) {
  // inserta con saltos de línea respetando estilo "texto"
  insertTextAtCursor(text);
}

// Wrap selection with <code> for mono
function wrapSelectionWithTag(tagName) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const wrapper = document.createElement(tagName);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);

  // move caret to end of wrapper
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  newRange.collapse(false);
  sel.addRange(newRange);
}

// ---------- Convert editor HTML -> Unicode text ----------
function htmlToUnicode(html) {
  const container = document.createElement("div");
  container.innerHTML = html;

  const raw = walkNode(container, { bold: false, italic: false, mono: false });

  // Normalizaciones:
  // - nbsp -> space
  // - demasiados \n al final -> trim suave
  return raw.replace(/\u00A0/g, " ").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function walkNode(node, style) {
  let out = "";

  node.childNodes.forEach(child => {
    // Text node
    if (child.nodeType === Node.TEXT_NODE) {
      out += applyUnicodeStyle(child.nodeValue, style);
      return;
    }

    // Not element
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const tag = child.tagName.toLowerCase();
    const next = { ...style };

    // Style tags
    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "code" || tag === "tt" || tag === "pre") next.mono = true;

    // Line breaks
    if (tag === "br") {
      out += "\n";
      return;
    }

    // Block-ish elements: add newline after
    if (tag === "div" || tag === "p") {
      out += walkNode(child, next);
      out += "\n";
      return;
    }

    // List handling: turn LI into lines with bullet
    if (tag === "ul" || tag === "ol") {
      out += walkNode(child, next);
      out += "\n";
      return;
    }

    if (tag === "li") {
      const liText = walkNode(child, next).trim();
      if (liText) out += `• ${liText}\n`;
      return;
    }

    // Default: inline container
    out += walkNode(child, next);
  });

  return out;
}

function applyUnicodeStyle(text, style) {
  // Prioridad: mono > bold+italic > bold > italic > normal
  let mapper = null;

  if (style.mono) mapper = styles.mono;
  else if (style.bold && style.italic) mapper = styles.boldItalic;
  else if (style.bold) mapper = styles.bold;
  else if (style.italic) mapper = styles.italic;

  if (!mapper) return text;

  return Array.from(text).map(mapper).join("");
}

// ---------- Sync Output ----------
function syncOutput() {
  const unicodeText = htmlToUnicode(editor.innerHTML);
  output.value = unicodeText;
  charCount.textContent = String(unicodeText.length);
}

// ---------- Buttons: B / I / M (visual formatting only) ----------
toolbarButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const styleKey = btn.getAttribute("data-style");
    editor.focus();

    if (styleKey === "bold") document.execCommand("bold");
    if (styleKey === "italic") document.execCommand("italic");
    if (styleKey === "mono") wrapSelectionWithTag("code");

    syncOutput();
  });
});

// ---------- Bullets (apply to selected lines in editor) ----------
function bulletizeSelection(prefix) {
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const selectedText = sel.toString();

  // Si no hay selección, aplicamos al "párrafo" actual (linea): fallback simple
  const textToProcess = selectedText && selectedText.length > 0
    ? selectedText
    : "";

  if (!textToProcess) {
    // Sin selección: insertamos prefix y un espacio (comportamiento útil)
    insertTextAtCursor(prefix + " ");
    syncOutput();
    return;
  }

  const lines = textToProcess.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (/^(•|✅|🔹|🔸|▪️|▫️|-|→|➜)\s+/.test(trimmed)) return line;
    return `${prefix} ${line}`;
  }).join("\n");

  // Reemplazar selección por texto con bullets (sin conservar tags dentro de selección)
  // Nota: esto convierte la selección a texto plano, lo cual es ideal para "post profesional".
  range.deleteContents();
  range.insertNode(document.createTextNode(lines));

  // Mover caret al final
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.setStart(range.endContainer, range.endOffset);
  newRange.collapse(true);
  sel.addRange(newRange);

  syncOutput();
}

// ---------- Separator ----------
separatorBtn.addEventListener("click", () => {
  insertNewlinesAround("\n────────────\n");
  syncOutput();
});

// ---------- Icons insert ----------
iconSelect.addEventListener("change", () => {
  const v = iconSelect.value;
  if (v) insertTextAtCursor(v + " ");
  iconSelect.value = "";
  syncOutput();
});

// ---------- Copy ----------
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    const old = copyBtn.textContent;
    copyBtn.textContent = "Copiado";
    setTimeout(() => (copyBtn.textContent = old), 900);
  } catch {
    alert("No se pudo copiar. Probá manualmente (Ctrl+C).");
  }
});

// ---------- Clear ----------
clearBtn.addEventListener("click", () => {
  editor.innerHTML = "";
  syncOutput();
});

// ---------- Live sync ----------
editor.addEventListener("input", syncOutput);

editor.addEventListener("paste", (e) => {
  e.preventDefault();

  // 1) Tomar texto plano
  const text =
    (e.clipboardData || window.clipboardData).getData("text/plain") || "";

  // 2) Insertar respetando saltos de línea
  insertPlainTextWithNewlines(text);

  // 3) Actualizar output
  syncOutput();
});


// Init
syncOutput();
