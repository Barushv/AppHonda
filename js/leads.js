// ==============================
// LEADS — pestaña CRM (lista, detalle, notas, seguimientos, respaldo)
// ==============================
import { $, $$, abrirHoja, cerrarHoja, toast, confirmar, dialogo, escapeHtml, formatDateTime, formatFecha, fechaLocalISO } from "./ui.js";
import {
  getLeads,
  getLead,
  onLeadsChange,
  iniciarSyncLeads,
  actualizarLead,
  eliminarLeads,
  borrarTodos,
  restaurarLeads,
} from "./leads-store.js";
import { guardarRecordatorio, eliminarEvento, getEvento } from "./agenda.js";

export const STATUS = {
  nuevo: { label: "Nuevo", icono: "person_add", color: "#0a84ff" },
  contactado: { label: "Contactado", icono: "call", color: "#ff9f0a" },
  seguimiento: { label: "Seguimiento", icono: "autorenew", color: "#5e5ce6" },
  cita: { label: "Cita", icono: "event_available", color: "#32ade6" },
  vendido: { label: "Vendido", icono: "verified", color: "#30b158" },
  descartado: { label: "Descartado", icono: "block", color: "#8e8e93" },
};
const CERRADOS = ["vendido", "descartado"];
const PAGINA = 30;

const ui = { busqueda: "", filtro: "", limite: PAGINA, seleccionando: false, seleccion: new Set(), abierto: "" };
let irA = () => {};

// ---------- Helpers ----------
const statusDe = (l) => (STATUS[l.status] ? l.status : "nuevo");
const enMes = (iso, ref = new Date()) => !!iso && iso.slice(0, 7) === fechaLocalISO(ref).slice(0, 7);

/** Seguimiento vigente del lead (si el recordatorio sigue abierto en la agenda) */
function seguimientoDe(l) {
  const s = l.seguimiento;
  if (!s?.eventoId || CERRADOS.includes(l.status)) return null;
  const ev = getEvento(s.eventoId);
  if (!ev || ev.completado) return null;
  return { ...s, fecha: ev.fecha, hora: ev.hora, vencido: ev.fecha < fechaLocalISO(), hoy: ev.fecha === fechaLocalISO() };
}
const esPendiente = (l) => {
  const s = seguimientoDe(l);
  return !!s && (s.vencido || s.hoy);
};

function badge(status) {
  const m = STATUS[status];
  return '<span class="status-badge" style="--c:' + m.color + '"><span class="ms">' + m.icono + "</span>" + m.label + "</span>";
}

function filtrar(lista) {
  let r = lista;
  if (ui.filtro === "pendientes") r = r.filter(esPendiente);
  else if (ui.filtro) r = r.filter((l) => statusDe(l) === ui.filtro);
  if (ui.busqueda) {
    const q = ui.busqueda;
    r = r.filter((l) => [l.name, l.phoneRaw, l.model, l.version].join(" ").toLowerCase().includes(q));
  }
  return r.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
}

// ---------- Render ----------
function renderStats(leads) {
  const delMes = leads.filter((l) => enMes(l.dateISO)).length;
  const vendidosMes = leads.filter((l) => l.status === "vendido" && enMes(l.vendidoEn || l.updatedAt || l.dateISO)).length;
  const vendidos = leads.filter((l) => l.status === "vendido").length;
  const conv = leads.length ? Math.round((vendidos / leads.length) * 100) : 0;
  const pend = leads.filter(esPendiente).length;
  $("#lead-stats").innerHTML =
    stat(delMes, "Leads del mes") +
    stat(vendidosMes, "Vendidos del mes") +
    stat(conv + "%", "Conversión") +
    '<button class="stat stat-btn' + (pend ? " alerta" : "") + (ui.filtro === "pendientes" ? " active" : "") + '" data-filtro="pendientes">' +
    "<b>" + pend + "</b><small>Seguimientos hoy</small></button>";
}
const stat = (n, l) => '<div class="stat"><b>' + n + "</b><small>" + l + "</small></div>";

function renderChips(leads) {
  const cuenta = (k) => leads.filter((l) => statusDe(l) === k).length;
  $("#lead-chips").innerHTML =
    chip("", "Todos", leads.length) + Object.entries(STATUS).map(([k, m]) => chip(k, m.label, cuenta(k))).join("");
}
const chip = (k, label, n) =>
  '<button class="chip' + (ui.filtro === k ? " active" : "") + '" data-filtro="' + k + '">' + label + " <span>" + n + "</span></button>";

function tarjeta(l) {
  const s = seguimientoDe(l);
  const ultima = l.notas?.length ? l.notas[l.notas.length - 1].texto : "";
  const sel = ui.seleccion.has(l.id);
  return (
    '<article class="lead-card' + (sel ? " selected" : "") + '" data-id="' + escapeHtml(l.id) + '">' +
    (ui.seleccionando ? '<span class="ms lead-check">' + (sel ? "check_circle" : "radio_button_unchecked") + "</span>" : "") +
    '<div class="lead-body">' +
    '<div class="lead-top"><strong>' + escapeHtml(l.name || "Sin nombre") + "</strong>" + badge(statusDe(l)) + "</div>" +
    '<div class="lead-meta">' + escapeHtml([l.model, l.version].filter(Boolean).join(" ")) + (l.price ? " · " + escapeHtml(l.price) : "") + "</div>" +
    '<div class="lead-meta muted">' + escapeHtml(l.phoneRaw || "") + " · " + formatFecha(l.dateISO) + "</div>" +
    (s ? '<div class="lead-seg' + (s.vencido ? " vencido" : s.hoy ? " hoy" : "") + '"><span class="ms">event</span>' + (s.vencido ? "Vencido · " : s.hoy ? "Hoy · " : "") + formatFecha(s.fecha + "T12:00", { weekday: "short", day: "numeric", month: "short" }) + (s.hora ? " " + s.hora : "") + "</div>" : "") +
    (ultima ? '<p class="lead-nota">' + escapeHtml(ultima) + "</p>" : "") +
    "</div>" +
    (ui.seleccionando
      ? ""
      : '<div class="lead-acciones">' +
        '<a class="icon-btn icon-btn-wa" href="https://wa.me/' + encodeURIComponent(l.phone || "") + '" target="_blank" rel="noopener" data-accion="wa" title="WhatsApp"><span class="ms">chat</span></a>' +
        '<a class="icon-btn" href="tel:+' + encodeURIComponent(l.phone || "") + '" data-accion="tel" title="Llamar"><span class="ms">call</span></a>' +
        "</div>") +
    "</article>"
  );
}

function render() {
  const leads = getLeads();
  renderStats(leads);
  renderChips(leads);
  const lista = filtrar(leads);
  const visibles = lista.slice(0, ui.limite);
  $("#lead-list").innerHTML = visibles.length
    ? visibles.map(tarjeta).join("")
    : '<div class="empty"><span class="ms">groups</span><p>' + (leads.length ? "Sin resultados para este filtro." : "Aún no hay leads. Se guardan al enviar información por WhatsApp.") + "</p></div>";
  $("#lead-mas").hidden = lista.length <= ui.limite;
  $("#lead-mas").textContent = "Ver más (" + (lista.length - ui.limite) + ")";
  $("#btn-lead-seleccionar").classList.toggle("active", ui.seleccionando);
  $("#lead-selection").hidden = !ui.seleccionando;
  $("#lead-selected-count").textContent = ui.seleccion.size;
  if (ui.abierto) renderDetalle();
}

// ---------- Detalle ----------
function abrirDetalle(id) {
  if (!getLead(id)) return toast("Ese lead ya no existe", "info");
  ui.abierto = id;
  $("#ld-nota-input").value = "";
  renderDetalle();
  abrirHoja($("#sheet-lead"));
}

function renderDetalle() {
  const l = getLead(ui.abierto);
  if (!l) return cerrarHoja($("#sheet-lead"));
  $("#ld-nombre").textContent = l.name || "Sin nombre";
  $("#ld-wa").href = "https://wa.me/" + encodeURIComponent(l.phone || "");
  $("#ld-tel").href = "tel:+" + encodeURIComponent(l.phone || "");
  $("#ld-telefono").textContent = l.phoneRaw || "—";
  $("#ld-vehiculo").textContent = [l.model, l.version].filter(Boolean).join(" ") || "—";
  $("#ld-precio").textContent = l.price || "—";
  $("#ld-fecha").textContent = formatDateTime(l.dateISO);

  const st = statusDe(l);
  $("#ld-status").innerHTML = Object.entries(STATUS)
    .map(([k, m]) => '<button data-status="' + k + '" class="' + (k === st ? "active" : "") + '" style="--c:' + m.color + '"><span class="ms">' + m.icono + "</span>" + m.label + "</button>")
    .join("");

  const s = seguimientoDe(l);
  $("#ld-seguimiento").innerHTML = s
    ? '<span class="ms">event</span><div><strong>' + escapeHtml(s.titulo || "Seguimiento") + "</strong><small>" +
      formatFecha(s.fecha + "T12:00", { weekday: "long", day: "numeric", month: "long" }) + (s.hora ? " · " + s.hora : "") +
      '</small></div><button class="btn btn-ghost btn-sm" data-seg="editar">Cambiar</button><button class="icon-btn" data-seg="quitar" title="Quitar"><span class="ms">close</span></button>'
    : CERRADOS.includes(st)
      ? ""
      : '<button class="btn btn-ghost btn-block" data-seg="editar"><span class="ms">alarm_add</span> Agendar seguimiento</button>';

  const notas = l.notas || [];
  $("#ld-notas").innerHTML = notas.length
    ? notas
        .map((n, i) => ({ n, i }))
        .reverse()
        .map(
          ({ n, i }) =>
            '<div class="nota-item"><div class="nota-head"><small>' + formatDateTime(n.fecha) + (n.editadoEn ? " · editada" : "") + "</small>" +
            '<span><button class="icon-btn icon-btn-sm" data-nota-edit="' + i + '"><span class="ms">edit</span></button>' +
            '<button class="icon-btn icon-btn-sm" data-nota-del="' + i + '"><span class="ms">delete</span></button></span></div>' +
            "<p>" + escapeHtml(n.texto) + "</p></div>",
        )
        .join("")
    : '<p class="muted">Sin notas aún.</p>';
}

function cambiarStatus(status) {
  const l = getLead(ui.abierto);
  if (!l || statusDe(l) === status) return;
  const cambios = { status };
  if (status === "vendido") cambios.vendidoEn = new Date().toISOString();
  // al cerrar el lead, su recordatorio abierto ya no aplica
  if (CERRADOS.includes(status) && l.seguimiento?.eventoId) {
    eliminarEvento(l.seguimiento.eventoId);
    cambios.seguimiento = null;
  }
  actualizarLead(l.id, cambios);
  toast("Estado: " + STATUS[status].label, "success");
  if ((status === "seguimiento" || status === "cita") && !seguimientoDe(l)) abrirSeguimiento(status);
}

// ---------- Seguimiento ----------
function abrirSeguimiento(motivo) {
  const l = getLead(ui.abierto);
  if (!l) return;
  const s = seguimientoDe(l);
  const vehiculo = [l.model, l.version].filter(Boolean).join(" ");
  const quien = l.name || l.phoneRaw || "cliente";
  $("#seg-titulo-h").textContent = motivo === "cita" ? "Agendar cita" : "Agendar seguimiento";
  $("#seg-titulo").value = s?.titulo || (motivo === "cita" ? "Cita: " : "Seguimiento: ") + quien + (vehiculo ? " — " + vehiculo : "");
  $("#seg-fecha").value = s?.fecha || fechaLocalISO(new Date(Date.now() + 864e5));
  $("#seg-hora").value = s?.hora || "10:00";
  abrirHoja($("#sheet-seguimiento"));
}

function guardarSeguimiento() {
  const l = getLead(ui.abierto);
  if (!l) return;
  const titulo = $("#seg-titulo").value.trim() || "Seguimiento";
  const fecha = $("#seg-fecha").value;
  const hora = $("#seg-hora").value || "10:00";
  if (!fecha) return toast("Selecciona la fecha", "error");
  const eventoId = guardarRecordatorio({ id: l.seguimiento?.eventoId, titulo, fecha, hora, leadId: l.id, nota: [l.model, l.version].filter(Boolean).join(" ") });
  actualizarLead(l.id, { seguimiento: { eventoId, titulo, fecha: fecha + "T" + hora } });
  cerrarHoja($("#sheet-seguimiento"));
  toast("Agendado en tu agenda", "success");
}

function quitarSeguimiento() {
  const l = getLead(ui.abierto);
  if (!l?.seguimiento) return;
  eliminarEvento(l.seguimiento.eventoId);
  actualizarLead(l.id, { seguimiento: null });
}

// ---------- Notas ----------
let notaEditando = -1;

function agregarNota() {
  const input = $("#ld-nota-input");
  const texto = input.value.trim();
  if (!texto) return toast("Escribe algo antes de guardar", "info");
  actualizarLead(ui.abierto, (l) => ({ notas: [...(l.notas || []), { texto, fecha: new Date().toISOString() }] }));
  input.value = "";
  toast("Nota guardada", "success");
}

function editarNota(i) {
  const n = getLead(ui.abierto)?.notas?.[i];
  if (!n) return;
  notaEditando = i;
  $("#edit-nota-texto").value = n.texto;
  abrirHoja($("#sheet-nota"));
}

function guardarNotaEditada() {
  const texto = $("#edit-nota-texto").value.trim();
  if (!texto) return toast("La nota no puede estar vacía", "info");
  actualizarLead(ui.abierto, (l) => ({
    notas: l.notas.map((n, i) => (i === notaEditando ? { ...n, texto, editadoEn: new Date().toISOString() } : n)),
  }));
  cerrarHoja($("#sheet-nota"));
  toast("Nota actualizada", "success");
}

async function borrarNota(i) {
  if (!(await confirmar("¿Eliminar esta nota?", "", { ok: "Eliminar", peligro: true }))) return;
  actualizarLead(ui.abierto, (l) => ({ notas: l.notas.filter((_, j) => j !== i) }));
}

async function eliminarLeadAbierto() {
  const l = getLead(ui.abierto);
  if (!l) return;
  const quien = l.name || l.phoneRaw || "este lead";
  if (!(await confirmar("¿Eliminar a " + quien + "?", "Se borra del teléfono y de la nube, junto con sus notas y su seguimiento.", { ok: "Eliminar", peligro: true }))) return;
  if (l.seguimiento?.eventoId) eliminarEvento(l.seguimiento.eventoId);
  cerrarHoja($("#sheet-lead"));
  eliminarLeads([l.id]).catch(() => toast("No se pudo borrar de la nube", "error"));
  toast("Lead eliminado", "success");
}

// ---------- Selección ----------
function salirSeleccion() {
  ui.seleccionando = false;
  ui.seleccion.clear();
  render();
}

async function borrarSeleccion() {
  const n = ui.seleccion.size;
  if (!n) return toast("Selecciona al menos un lead", "info");
  if (!(await confirmar("¿Eliminar " + n + " lead(s)?", "Se borran también de la nube.", { ok: "Eliminar", peligro: true }))) return;
  const ids = [...ui.seleccion];
  ids.forEach((id) => {
    const ev = getLead(id)?.seguimiento?.eventoId;
    if (ev) eliminarEvento(ev);
  });
  salirSeleccion();
  eliminarLeads(ids).catch(() => toast("Algunos no se borraron de la nube", "error"));
  toast(n + " lead(s) eliminado(s)", "success");
}

// ---------- Respaldo ----------
async function compartirOBajar(filename, blob, title) {
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const sinInternos = (l) => {
  const { _synced, ...r } = l;
  return r;
};

function exportarCSV() {
  const leads = getLeads();
  if (!leads.length) return toast("No hay leads", "info");
  const headers = ["Fecha", "Nombre", "Teléfono", "Modelo", "Versión", "Precio", "Estado", "Próximo seguimiento", "Última nota"];
  const rows = leads.map((l) => [
    l.dateISO || "",
    l.name || "",
    l.phoneRaw || "",
    l.model || "",
    l.version || "",
    l.price || "",
    STATUS[statusDe(l)].label,
    l.seguimiento?.fecha || "",
    l.notas?.length ? l.notas[l.notas.length - 1].texto : "",
  ]);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  compartirOBajar("leads-hondago-" + fechaLocalISO() + ".csv", new Blob([csv], { type: "text/csv;charset=utf-8" }), "HondaGo Leads CSV");
}

function exportarJSON() {
  const payload = { meta: { app: "HondaGo", schema: 3, exportedAt: new Date().toISOString() }, leads: getLeads().map(sinInternos) };
  compartirOBajar("leads-hondago-backup-" + fechaLocalISO() + ".json", new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "HondaGo Backup Leads");
}

async function restaurarDesdeArchivo(file) {
  let entrantes;
  try {
    const data = JSON.parse(await file.text());
    entrantes = Array.isArray(data) ? data : Array.isArray(data.leads) ? data.leads : null;
  } catch {}
  if (!entrantes) return toast("El archivo no es un respaldo válido", "error");
  const modo = await dialogo({
    titulo: "Restaurar " + entrantes.length + " lead(s)",
    mensaje: "Agregar solo suma los que no tienes. Reemplazar borra tus leads actuales y deja únicamente los del respaldo.",
    botones: [
      { label: "Cancelar", value: null, estilo: "ghost" },
      { label: "Reemplazar todo", value: "reemplazar", estilo: "danger" },
      { label: "Agregar", value: "fusionar", estilo: "primary" },
    ],
  });
  if (!modo) return;
  try {
    const n = await restaurarLeads(entrantes, { reemplazar: modo === "reemplazar" });
    toast(modo === "reemplazar" ? "Leads reemplazados" : n + " lead(s) agregados", "success");
  } catch (e) {
    toast("No se pudo subir a la nube (" + (e.code || e.message) + ")", "error");
  }
}

async function borrarTodo() {
  const n = getLeads().length;
  if (!n) return toast("No hay leads", "info");
  if (!(await confirmar("¿Borrar los " + n + " leads?", "Se eliminan del teléfono y de la nube. Te recomiendo descargar un respaldo JSON antes.", { ok: "Borrar todo", peligro: true }))) return;
  getLeads().forEach((l) => l.seguimiento?.eventoId && eliminarEvento(l.seguimiento.eventoId));
  borrarTodos().catch(() => toast("Algunos no se borraron de la nube", "error"));
  toast("Leads borrados", "info");
}

async function menuRespaldo() {
  const op = await dialogo({
    titulo: "Respaldo de leads",
    botones: [
      { label: "Descargar CSV (Excel)", value: "csv", estilo: "ghost" },
      { label: "Descargar respaldo JSON", value: "json", estilo: "ghost" },
      { label: "Restaurar respaldo", value: "restaurar", estilo: "ghost" },
      { label: "Borrar todos los leads", value: "borrar", estilo: "danger-ghost" },
    ],
  });
  if (op === "csv") exportarCSV();
  else if (op === "json") exportarJSON();
  else if (op === "restaurar") {
    const input = $("#lead-restore-file");
    input.value = "";
    input.click();
  } else if (op === "borrar") borrarTodo();
}

// ---------- Init ----------
export function iniciarLeads(opts = {}) {
  irA = opts.irA || irA;

  $("#lead-search").addEventListener("input", (e) => {
    ui.busqueda = e.target.value.trim().toLowerCase();
    ui.limite = PAGINA;
    render();
  });
  const alFiltrar = (e) => {
    const b = e.target.closest("[data-filtro]");
    if (!b) return;
    ui.filtro = ui.filtro === b.dataset.filtro && b.dataset.filtro ? "" : b.dataset.filtro;
    ui.limite = PAGINA;
    render();
  };
  $("#lead-chips").addEventListener("click", alFiltrar);
  $("#lead-stats").addEventListener("click", alFiltrar);
  $("#lead-mas").addEventListener("click", () => {
    ui.limite += PAGINA;
    render();
  });

  $("#lead-list").addEventListener("click", (e) => {
    const card = e.target.closest(".lead-card");
    if (!card || e.target.closest("[data-accion]")) return;
    const id = card.dataset.id;
    if (ui.seleccionando) {
      ui.seleccion.has(id) ? ui.seleccion.delete(id) : ui.seleccion.add(id);
      render();
    } else abrirDetalle(id);
  });

  $("#btn-lead-seleccionar").addEventListener("click", () => (ui.seleccionando ? salirSeleccion() : ((ui.seleccionando = true), render())));
  $("#btn-sel-cancelar").addEventListener("click", salirSeleccion);
  $("#btn-sel-borrar").addEventListener("click", borrarSeleccion);
  $("#btn-lead-menu").addEventListener("click", menuRespaldo);
  $("#lead-restore-file").addEventListener("change", (e) => e.target.files?.[0] && restaurarDesdeArchivo(e.target.files[0]));

  // Detalle
  $("#ld-status").addEventListener("click", (e) => {
    const b = e.target.closest("[data-status]");
    if (b) cambiarStatus(b.dataset.status);
  });
  $("#ld-seguimiento").addEventListener("click", (e) => {
    const b = e.target.closest("[data-seg]");
    if (!b) return;
    b.dataset.seg === "quitar" ? quitarSeguimiento() : abrirSeguimiento(getLead(ui.abierto)?.status);
  });
  $("#btn-nota-add").addEventListener("click", agregarNota);
  $("#ld-notas").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-nota-edit]");
    const del = e.target.closest("[data-nota-del]");
    if (ed) editarNota(Number(ed.dataset.notaEdit));
    if (del) borrarNota(Number(del.dataset.notaDel));
  });
  $("#btn-nota-guardar").addEventListener("click", guardarNotaEditada);
  $("#btn-lead-eliminar").addEventListener("click", eliminarLeadAbierto);
  $("#sheet-lead").addEventListener("sheet:close", () => (ui.abierto = ""));

  // Seguimiento
  $("#btn-seg-guardar").addEventListener("click", guardarSeguimiento);
  $("#seg-rapidas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-dias]");
    if (b) $("#seg-fecha").value = fechaLocalISO(new Date(Date.now() + Number(b.dataset.dias) * 864e5));
  });

  // Abrir un lead desde la agenda
  document.addEventListener("lead:abrir", (e) => {
    irA("leads");
    abrirDetalle(e.detail);
  });
  document.addEventListener("agenda:cambio", render);

  onLeadsChange(render);
  render();

  const estado = $("#sync-estado");
  estado.textContent = navigator.onLine ? "Conectando…" : "Sin conexión: los cambios se suben al volver la red";
  iniciarSyncLeads({
    onError: (err) => {
      estado.textContent = "Leads sin sincronizar (" + err.code + ")";
      estado.classList.add("error");
      toast("Los leads no se pudieron sincronizar con la nube", "error");
    },
  });
  onLeadsChange(() => {
    if (!estado.classList.contains("error")) estado.textContent = "Leads sincronizados con la nube ✓";
  });
}
