// ============================================
// LinkedIn Unicode Formatter - app.js (FULL, STABLE)
// Editor (izq): texto normal (visual)
// Output (der): Unicode para copiar/pegar
// - Pegar SIN formato (Word/Docs) garantizado
// - Botón Tx: quita formato (selección o todo)
// - B / I / S / M: formato visual -> conversión Unicode en Output
// ============================================

// ---------- DOM ----------
const editor = document.getElementById("editor");     // contenteditable div
const output = document.getElementById("output");     // readonly textarea
const charCount = document.getElementById("charCount");

const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const separatorBtn = document.getElementById("separator");
const iconSelect = document.getElementById("iconSelect");

const clearFormatBtn = document.getElementById("clearFormat");
const toolbarButtons = document.querySelectorAll('button[data-style]');

// Guard rails (si falta algo en HTML, evitamos romper todo)
if (!editor || !output || !charCount) {
  console.error("Faltan elementos esenciales (editor/output/charCount). Revisá ids en index.html");
}

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
    let m = mapLatin(ch, 0x1D400, 0x1D41A);
    m = mapDigits(m, 0x1D7CE);
    return m;
  },

  // Mathematical Italic (solo letras)
  italic: (ch) => mapLatin(ch, 0x1D434, 0x1D44E),

  // Mathematical Bold Italic (solo letras)
  boldItalic: (ch) => mapLatin(ch, 0x1D468, 0x1D482),

  // Mathematical Script (solo letras; con mapa para evitar huecos)
  script: (ch) => {
    const upper = {
      A:"𝒜",B:"ℬ",C:"𝒞",D:"𝒟",E:"ℰ",F:"ℱ",G:"𝒢",H:"ℋ",I:"ℐ",J:"𝒥",K:"𝒦",L:"ℒ",M:"ℳ",
      N:"𝒩",O:"𝒪",P:"𝒫",Q:"𝒬",R:"ℛ",S:"𝒮",T:"𝒯",U:"𝒰",V:"𝒱",W:"𝒲",X:"𝒳",Y:"𝒴",Z:"𝒵"
    };
    const lower = {
      a:"𝒶",b:"𝒷",c:"𝒸",d:"𝒹",e:"𝑒",f:"𝒻",g:"𝑔",h:"𝒽",i:"𝒾",j:"𝒿",k:"𝓀",l:"𝓁",m:"𝓂",
      n:"𝓃",o:"𝑜",p:"𝓅",q:"𝓆",r:"𝓇",s:"𝓈",t:"𝓉",u:"𝓊",v:"𝓋",w:"𝓌",x:"𝓍",y:"𝓎",z:"𝓏"
    };
    return upper[ch] || lower[ch] || ch;
  },

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
    "✅","☑️","✔️","🟩","🟩✔️","🟩✅",
    "❌","✖️","❎","🟥","🟥❌","🟥✖️",
    "🟢","🔴","🟡"
  ],
  "Prioridad / Atención": [
    "⚠️","🚨","🔥","⚡","❗","❓","‼️","⁉️","🛑","🔺","🔻"
  ],
  "Acción / Trabajo": [
    "🛠️","🔧","⚙️","📌","🎯","🚀","📍","🔁","🔄","➡️","↗️","↘️"
  ],
  "Ideas / Pensar": [
    "💡","🧠","📐","📏","🧩","🔍","🧪","🧭"
  ],
  "Documentos / Datos": [
    "📝","📄","📚","📑","🧾","📋","📊","📈","📉","🔎"
  ],
  "Comunicación / Personas": [
    "👥","🤝","🙋","💬","📣","📞","✉️","🔔","🗣️"
  ],
  "Tiempo / Proceso": [
    "⏱️","⌛","🕒","🗓️","🔂","🔁","➡️"
  ],
  "Bullets & Separadores": [
    "•","◦","▪️","▫️","🔹","🔸","➜","→","—","–","│","┃","⋯"
  ]
};

function populateIcons() {
  if (!iconSelect) return;
  iconSelect.innerHTML = `<option value="">Insertar ícono…</option>`;
  for (const groupName in ICON_GROUPS) {
    const og = document.createElement("optgroup");
    og.label = groupName;
    ICON_GROUPS[groupName].forEach(icon => {
      const opt = document.createElement("option");
      opt.value = icon;
      opt.textContent = icon;
      og.appendChild(opt);
    });
    iconSelect.appendChild(og);
  }
}
populateIcons();

// ---------- Contenteditable insertion helpers ----------
function insertTextAtCursor(text) {
  if (!editor) return;
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

  // caret después
  range.setStartAfter(tn);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertPlainTextWithNewlines(text) {
  if (!editor) return;
  editor.focus();

  const normalized = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    editor.textContent += normalized;
    return;
  }

  const range = sel.getRangeAt(0);
  range.deleteContents();

  const frag = document.createDocumentFragment();
  const parts = normalized.split("\n");

  parts.forEach((part, idx) => {
    frag.appendChild(document.createTextNode(part));
    if (idx < parts.length - 1) frag.appendChild(document.createElement("br"));
  });

  range.insertNode(frag);

  // caret al final del editor (simple y estable)
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(editor);
  newRange.collapse(false);
  sel.addRange(newRange);
}

function wrapSelectionWithTag(tagName) {
  if (!editor) return;
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const wrapper = document.createElement(tagName);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);

  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  newRange.collapse(false);
  sel.addRange(newRange);
}

function wrapSelectionWithSpanAttr(attrName, attrValue) {
  if (!editor) return;
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const span = document.createElement("span");
  span.setAttribute(attrName, attrValue);
  span.appendChild(range.extractContents());
  range.insertNode(span);

  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  newRange.collapse(false);
  sel.addRange(newRange);
}

// ---------- Convert editor HTML -> Unicode text ----------
function htmlToUnicode(html) {
  const container = document.createElement("div");
  container.innerHTML = html;

  const raw = walkNode(container, { bold: false, italic: false, mono: false, script: false });

  return raw
    .replace(/\u00A0/g, " ")
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

    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "code" || tag === "tt" || tag === "pre") next.mono = true;
    if (tag === "span" && child.getAttribute("data-script") === "1") next.script = true;

    if (tag === "br") { out += "\n"; return; }

    if (tag === "div" || tag === "p") {
      out += walkNode(child, next);
      out += "\n";
      return;
    }

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

    out += walkNode(child, next);
  });

  return out;
}

function applyUnicodeStyle(text, style) {
  let mapper = null;

  if (style.mono) mapper = styles.mono;
  else if (style.script) mapper = styles.script;
  else if (style.bold && style.italic) mapper = styles.boldItalic;
  else if (style.bold) mapper = styles.bold;
  else if (style.italic) mapper = styles.italic;

  if (!mapper) return text;
  return Array.from(text).map(mapper).join("");
}

// ---------- Sync Output ----------
function syncOutput() {
  if (!editor || !output || !charCount) return;
  const unicodeText = htmlToUnicode(editor.innerHTML);
  output.value = unicodeText;
  charCount.textContent = String(unicodeText.length);
}

// ---------- Clear Format (Tx) ----------
function stripAllFormatting() {
  if (!editor) return;
  const plain = editor.innerText;   // respeta saltos
  editor.textContent = plain;       // elimina HTML
  syncOutput();
}

function stripSelectionFormatting() {
  if (!editor) return;
  editor.focus();

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    stripAllFormatting();
    return;
  }

  const selectedPlain = sel.toString();
  range.deleteContents();
  insertPlainTextWithNewlines(selectedPlain);
  syncOutput();
}

if (clearFormatBtn) {
  clearFormatBtn.addEventListener("click", () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) stripSelectionFormatting();
    else stripAllFormatting();
  });
}

// ---------- Toolbar buttons (B / I / S / M) ----------
toolbarButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (!editor) return;
    const styleKey = btn.getAttribute("data-style");
    editor.focus();

    if (styleKey === "bold") document.execCommand("bold");
    if (styleKey === "italic") document.execCommand("italic");
    if (styleKey === "script") wrapSelectionWithSpanAttr("data-script", "1");
    if (styleKey === "mono") wrapSelectionWithTag("code");

    syncOutput();
  });
});

// ---------- Separator ----------
if (separatorBtn) {
  separatorBtn.addEventListener("click", () => {
    insertTextAtCursor("\n────────────\n");
    syncOutput();
  });
}

// ---------- Icons insert ----------
if (iconSelect) {
  iconSelect.addEventListener("change", () => {
    const v = iconSelect.value;
    if (v) insertTextAtCursor(v + " ");
    iconSelect.value = "";
    syncOutput();
  });
}

// ---------- Copy ----------
if (copyBtn) {
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
}

// ---------- Clear ----------
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (!editor) return;
    editor.innerHTML = "";
    syncOutput();
  });
}

// ---------- Live sync ----------
if (editor) {
  editor.addEventListener("input", syncOutput);

  // Paste as plain text (auto)
  editor.addEventListener("paste", (e) => {
    e.preventDefault();

    let text = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
    text = text
      .replace(/\u00A0/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-");

    insertPlainTextWithNewlines(text);
    syncOutput();
  });
}

// Init
syncOutput();
