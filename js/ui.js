// ==============================
// UI — utilidades compartidas (toast, diálogos, hojas, tema, formato)
// ==============================

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]);
}

export const formatoPrecio = (n) => "$" + Number(n || 0).toLocaleString("es-MX");

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

export function formatFecha(iso, opts = { day: "numeric", month: "short" }) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("es-MX", opts);
}

/** "2026-10-19" de la fecha local (no UTC) */
export function fechaLocalISO(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Convierte un link de Drive /view a /preview (abre mejor en Android) */
export const drivePreview = (url) => String(url || "").replace("/view", "/preview");

// ---------- Toast ----------
export function toast(mensaje, tipo = "success") {
  const icon = { success: "check_circle", error: "error", info: "info" }[tipo] || "info";
  const el = document.createElement("div");
  el.className = "toast toast-" + tipo;
  el.innerHTML = '<span class="ms">' + icon + "</span>";
  el.append(document.createTextNode(mensaje));
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 2800);
}

// ---------- Hojas / modales ----------
// Cualquier elemento .sheet se abre con abrirHoja(el) y se cierra con cerrarHoja(el),
// con el fondo, el botón [data-close] o Escape.
const abiertas = [];

export function abrirHoja(el) {
  if (!el || abiertas.includes(el)) return;
  abiertas.push(el);
  el.hidden = false;
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => el.classList.add("open"));
}

export function cerrarHoja(el) {
  if (!el) return;
  const i = abiertas.indexOf(el);
  if (i === -1) return;
  abiertas.splice(i, 1);
  el.classList.remove("open");
  el.dispatchEvent(new CustomEvent("sheet:close"));
  setTimeout(() => {
    if (!abiertas.includes(el)) el.hidden = true;
  }, 250);
  if (!abiertas.length) document.body.classList.remove("no-scroll");
}

document.addEventListener("click", (e) => {
  const close = e.target.closest("[data-close]");
  if (close) return cerrarHoja(close.closest(".sheet"));
  if (e.target.classList?.contains("sheet")) cerrarHoja(e.target);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && abiertas.length) cerrarHoja(abiertas[abiertas.length - 1]);
});

/**
 * Diálogo con botones propios. Devuelve una promesa con el `value` del botón elegido (o null).
 * botones: [{ label, value, estilo: "primary" | "danger" | "ghost" }]
 */
export function dialogo({ titulo, mensaje = "", botones }) {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "sheet sheet-center";
    el.hidden = true;
    el.innerHTML =
      '<div class="sheet-panel dialog"><h3></h3><p class="dialog-msg"></p><div class="dialog-actions"></div></div>';
    el.querySelector("h3").textContent = titulo;
    el.querySelector(".dialog-msg").textContent = mensaje;
    let valor = null;
    const acciones = el.querySelector(".dialog-actions");
    if (botones.length > 2) acciones.classList.add("vertical");
    botones.forEach((b) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-" + (b.estilo || "ghost");
      btn.textContent = b.label;
      btn.onclick = () => {
        valor = b.value;
        cerrarHoja(el);
      };
      acciones.appendChild(btn);
    });
    el.addEventListener("sheet:close", () => {
      setTimeout(() => el.remove(), 300);
      resolve(valor);
    });
    document.body.appendChild(el);
    abrirHoja(el);
  });
}

export async function confirmar(titulo, mensaje = "", { ok = "Aceptar", peligro = false } = {}) {
  const r = await dialogo({
    titulo,
    mensaje,
    botones: [
      { label: "Cancelar", value: false, estilo: "ghost" },
      { label: ok, value: true, estilo: peligro ? "danger" : "primary" },
    ],
  });
  return r === true;
}

// ---------- Tema (auto / claro / oscuro) ----------
const TEMA_KEY = "hondago_tema";

export function getTema() {
  try {
    const t = localStorage.getItem(TEMA_KEY);
    if (t) return t;
    // compatibilidad con la versión anterior
    if (localStorage.getItem("modoOscuro") === "true") return "oscuro";
  } catch {}
  return "auto";
}

export function aplicarTema(tema = getTema()) {
  const root = document.documentElement;
  if (tema === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", tema === "oscuro" ? "dark" : "light");
  const oscuro = tema === "oscuro" || (tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", oscuro ? "#1c1c1e" : "#ffffff");
}

export function setTema(tema) {
  try {
    localStorage.setItem(TEMA_KEY, tema);
  } catch {}
  aplicarTema(tema);
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => aplicarTema());
