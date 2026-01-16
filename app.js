// ============================================
// LinkedIn Unicode Formatter - app.js (FULL, CLEAN)
// Editor (izq): texto normal con formato visual
// Output (der): Unicode listo para copiar/pegar
// - Pegar sin formato (Word/Docs) automático
// - Cursor queda donde corresponde al pegar
// - Sin lógica de bullets (ya estaban en íconos)
// ============================================

// ---------- DOM ----------
const editor = document.getElementById("editor");     // contenteditable div
const output = document.getElementById("output");     // readonly textarea
const charCount = document.getElementById("charCount");

const clearFormatBtn = document.getElementById("clearFormat");

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
    m = mapDigits(m, 0x1D7CE);             // 0-9
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
    editor.appendChild(document.createTextNode(text));
    return;
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const tn = document.createTextNode(text);
  range.insertNode(tn);

  // colocar caret después del texto insertado
  range.setStartAfter(tn);
  range.collapse(true);

  sel.removeAllRanges();
  sel.addRange(range);
}

function insertPlainTextWithNewlines(text) {
  editor.focus();

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    editor.textContent += normalized;
    return;
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // Armamos todo en un fragment en el orden correcto
  const frag = document.createDocumentFragment();
  const parts = normalized.split("\n");

  parts.forEach((part, idx) => {
    frag.appendChild(document.createTextNode(part));
    if (idx < parts.length - 1) frag.appendChild(document.createElement("br"));
  });

  // Insertar el fragmento (una sola operación, sin invertir orden)
  range.insertNode(frag);

  // Mover caret al final de lo insertado
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(editor);
  newRange.collapse(false);
  sel.addRange(newRange);
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

  // mover caret al final del wrapper
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
  // - compactar saltos excesivos
  return raw
  .replace(/\u00A0/g, " ")
  // Permite más Enter seguidos (máximo 4 saltos = hasta 2 líneas en blanco)
  .replace(/\n{5,}/g, "\n\n\n\n")
  .trimEnd();

}

function walkNode(node, style) {
  let out = "";

  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += applyUnicodeStyle(child.nodeValue, style);
      return;
    }

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

  // Block elements: always end with newline (handles empty paragraphs too)
  if (tag === "div" || tag === "p") {
  out += walkNode(child, next);
  out += "\n";
  return;
}

    // Lists: export li as bullet lines
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


// ---------- Clear Format ----------
function stripAllFormatting() {
  // Convierte todo el editor a texto plano, preservando saltos visuales
  const plain = editor.innerText;      // innerText respeta saltos
  editor.textContent = plain;          // textContent evita HTML
  syncOutput();
}

function stripSelectionFormatting() {
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    // sin selección -> todo
    stripAllFormatting();
    return;
  }

  // Obtener texto plano de la selección
  const selectedPlain = sel.toString();

  // Reemplazar selección por texto plano (sin tags)
  range.deleteContents();

  // Insertar respetando saltos dentro de la selección
  insertPlainTextWithNewlines(selectedPlain);

  syncOutput();
}

if (clearFormatBtn) {
  clearFormatBtn.addEventListener("click", () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      stripSelectionFormatting();
    } else {
      stripAllFormatting();
    }
  });
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

// ---------- Separator ----------
separatorBtn.addEventListener("click", () => {
  insertTextAtCursor("\n────────────\n");
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

// ---------- Paste as plain text (auto) ----------
editor.addEventListener("paste", (e) => {
  e.preventDefault();

  let text =
    (e.clipboardData || window.clipboardData).getData("text/plain") || "";

  // Limpieza típica de Word/Docs
  text = text
    .replace(/\u00A0/g, " ")   // nbsp
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-");

  insertPlainTextWithNewlines(text);
  syncOutput();
});

// Init
syncOutput();
