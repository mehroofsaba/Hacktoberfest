// Same-origin when served by Express; falls back to localhost if the file is opened directly.
const API = location.protocol.startsWith("http") && location.port === "3000" ? "" : "http://localhost:3000";
const $ = (id) => document.getElementById(id);
const code = $("code"), gutter = $("gutter"), bite = $("bite"), label = $("biteLabel"), result = $("result");
const TITLES = ["What is wrong", "What is happening", "Why it happens", "How to fix it", "What to check next"];

/* ---------- line numbers ---------- */
function lines() {
  const n = Math.max(10, code.value.split("\n").length);
  gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
}
code.addEventListener("input", lines);
code.addEventListener("scroll", () => (gutter.scrollTop = code.scrollTop));
code.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    code.setRangeText("    ", code.selectionStart, code.selectionEnd, "end");
    lines();
  }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) bite.click();
});
lines();

/* ---------- custom language dropdown ---------- */
const LANGS = [
  { name: "Python", chip: "Py", color: "#cfe3f1" },
  { name: "JavaScript", chip: "JS", color: "#fbeab0" },
  { name: "Java", chip: "Jv", color: "#fde0dc" },
  { name: "C", chip: "C", color: "#e6dcf2" },
  { name: "C++", chip: "C+", color: "#dcefe2" },
  { name: "HTML", chip: "<>", color: "#ffd9c7" },
  { name: "CSS", chip: "#", color: "#cfe8d9" },
  { name: "SQL", chip: "DB", color: "#f3d9ee" },
];
let lang = LANGS[0].name, activeIdx = 0;
const dd = $("dd"), ddBtn = $("ddBtn"), ddList = $("ddList");

ddList.innerHTML = LANGS.map((l, i) =>
  `<li role="option" id="opt${i}" data-i="${i}"><span class="chip" style="--c:${l.color}">${l.chip.replace("<", "&lt;").replace(">", "&gt;")}</span>${l.name}</li>`).join("");
const opts = [...ddList.children];

function paint() {
  opts.forEach((o, i) => {
    o.setAttribute("aria-selected", LANGS[i].name === lang);
    o.classList.toggle("active", i === activeIdx);
  });
  ddList.setAttribute("aria-activedescendant", "opt" + activeIdx);
}
function choose(i) {
  lang = LANGS[i].name; activeIdx = i;
  $("ddText").textContent = lang;
  const chip = $("ddChip"); chip.textContent = LANGS[i].chip; chip.style.setProperty("--c", LANGS[i].color);
  closeDD(true);
}
function openDD() {
  activeIdx = LANGS.findIndex((l) => l.name === lang);
  ddList.hidden = false; ddBtn.setAttribute("aria-expanded", "true"); paint(); ddList.focus({ preventScroll: true });
  opts[activeIdx].scrollIntoView({ block: "nearest" });
}
function closeDD(refocus) {
  ddList.hidden = true; ddBtn.setAttribute("aria-expanded", "false");
  if (refocus) ddBtn.focus();
}
ddBtn.addEventListener("click", () => (ddList.hidden ? openDD() : closeDD(true)));
ddList.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) choose(+li.dataset.i); });
ddList.addEventListener("mousemove", (e) => { const li = e.target.closest("li"); if (li && +li.dataset.i !== activeIdx) { activeIdx = +li.dataset.i; paint(); } });
ddList.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowDown" || k === "ArrowUp") {
    e.preventDefault();
    activeIdx = (activeIdx + (k === "ArrowDown" ? 1 : -1) + LANGS.length) % LANGS.length;
    paint(); opts[activeIdx].scrollIntoView({ block: "nearest" });
  } else if (k === "Home" || k === "End") {
    e.preventDefault(); activeIdx = k === "Home" ? 0 : LANGS.length - 1; paint();
  } else if (k === "Enter" || k === " ") { e.preventDefault(); choose(activeIdx); }
  else if (k === "Escape") { e.preventDefault(); closeDD(true); }
  else if (k === "Tab") closeDD(false);
});
ddBtn.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (ddList.hidden) openDD(); }
});
document.addEventListener("click", (e) => { if (!dd.contains(e.target) && !ddList.hidden) closeDD(false); });
paint();

/* ---------- rendering ---------- */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Minimal, safe markdown: fenced code, inline code, bold, paragraphs, bullets.
function md(text) {
  const parts = text.split(/```[^\n]*\n?([\s\S]*?)```/g);
  return parts.map((p, i) => {
    if (i % 2) return `<pre><code>${esc(p.replace(/\n$/, ""))}</code></pre>`;
    let h = esc(p.trim()).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(?:^|\n)[-*] (.+)/g, "\n<li>$1</li>").replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
    return h.split(/\n{2,}/).map((b) => (b.startsWith("<ul>") || !b.trim() ? b : `<p>${b.replace(/\n/g, "<br>")}</p>`)).join("");
  }).join("");
}

function sections(text) {
  const out = {};
  text.split(/^##\s+/m).slice(1).forEach((chunk) => {
    const nl = chunk.indexOf("\n");
    out[chunk.slice(0, nl).trim().toLowerCase()] = chunk.slice(nl + 1).trim();
  });
  return out;
}

function show(html) { result.hidden = false; result.innerHTML = html; result.scrollIntoView({ behavior: "smooth", block: "nearest" }); }

/* ---------- analyze ---------- */
bite.addEventListener("click", async () => {
  if (!code.value.trim()) {
    show('<div class="status err">Paste some code first so I have something to bite.</div>');
    code.focus();
    return;
  }
  bite.disabled = true; label.textContent = "SNIFFING...";
  show('<div class="status"><svg class="sniff"><use href="#bug"/></svg> sniffing through your code...</div>');
  try {
    const res = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.value, language: lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    const s = sections(data.analysis);
    const html = TITLES.map((t, i) => s[t.toLowerCase()] ? `<article class="card c${i}"><h3>${t}</h3>${md(s[t.toLowerCase()])}</article>` : "").join("");
    show(html || `<article class="card c0">${md(data.analysis)}</article>`);
  } catch (err) {
    const offline = err instanceof TypeError;
    show(`<div class="status err">${esc(offline ? "Can't reach the BugBite server. Start it with npm start in the backend folder." : err.message)}</div>`);
  } finally {
    bite.disabled = false; label.textContent = "BITE IT";
  }
});
