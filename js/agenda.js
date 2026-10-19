// ==============================
// AGENDA — guardias, recordatorios (incluye seguimientos de leads) y rol del mes
// Firestore: guardias/{id}
//   guardia:      { tipo:"guardia", turno:"am"|"pm", nombre, title, start, end, color }
//   recordatorio: { tipo:"recordatorio", titulo, nota, start, end, color, leadId?, completado? }
// ==============================
import { db, collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, writeBatch } from "./firebase.js";
import { $, $$, abrirHoja, cerrarHoja, toast, confirmar, escapeHtml, fechaLocalISO } from "./ui.js";
import { ASESOR } from "./config.js";

const COL = "guardias";
const TURNOS = {
  am: { icono: "☀️", label: "AM", horas: "8–14 h", inicio: "08:00:00", fin: "14:00:00", color: "#ff9f0a" },
  pm: { icono: "🌙", label: "PM", horas: "14–20 h", inicio: "14:00:00", fin: "20:00:00", color: "#0a84ff" },
};
const COLOR_REC = "#30b158";
const COLOR_HECHO = "#8e8e93";
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

let eventos = []; // normalizados
let calendar = null;
let renderizado = false;

// ---------- Normalización (incluye datos de la versión anterior) ----------
function normalizar(id, d) {
  const fecha = (d.start || "").slice(0, 10);
  if (d.tipo === "guardia") {
    const t = d.title || "";
    const turno = d.turno || (t.includes("AM") ? "am" : "pm");
    const nombre = d.nombre || t.replace(/<[^>]*>/g, "").replace("Guardia ", "").replace(/ (AM|PM)$/, "").trim();
    return { id, tipo: "guardia", turno, nombre, fecha, start: d.start, end: d.end };
  }
  return {
    id,
    tipo: "recordatorio",
    titulo: d.titulo || (d.title || "").replace("🛎️ ", ""),
    nota: d.nota || "",
    fecha,
    hora: (d.start || "").slice(11, 16),
    start: d.start,
    end: d.end,
    leadId: d.leadId || "",
    completado: !!d.completado,
  };
}

const esMia = (g) => g.nombre.toLowerCase() === ASESOR.nombreCorto.toLowerCase();

function datosGuardia(fecha, turno, nombre) {
  const t = TURNOS[turno];
  return {
    tipo: "guardia",
    turno,
    nombre,
    title: "Guardia " + nombre.toUpperCase() + " " + t.label, // compatibilidad con la versión anterior
    start: fecha + "T" + t.inicio,
    end: fecha + "T" + t.fin,
    color: t.color,
  };
}

// ---------- Escrituras (sin await: Firestore las encola si no hay red) ----------
const avisarError = (e) => toast("No se pudo guardar en la nube (" + (e.code || e.message) + ")", "error");

/** Crea o actualiza un recordatorio. Devuelve su id. */
export function guardarRecordatorio({ id, titulo, nota = "", fecha, hora, leadId = "" }) {
  const ref = id ? doc(db, COL, id) : doc(collection(db, COL));
  const start = fecha + "T" + (hora || "09:00");
  setDoc(ref, { tipo: "recordatorio", title: "🛎️ " + titulo, titulo, nota, start, end: start, color: COLOR_REC, leadId, completado: false }).catch(avisarError);
  return ref.id;
}

export function eliminarEvento(id) {
  if (id) deleteDoc(doc(db, COL, id)).catch(avisarError);
}

export const getEvento = (id) => eventos.find((e) => e.id === id);

// ---------- Calendario ----------
function contenidoEvento(arg) {
  const e = getEvento(arg.event.id);
  const span = document.createElement("span");
  span.className = "fc-ev";
  if (!e) return { domNodes: [span] };
  span.textContent =
    e.tipo === "guardia"
      ? TURNOS[e.turno].icono + " " + (esMia(e) ? TURNOS[e.turno].label : e.nombre)
      : (e.completado ? "✓ " : "🛎️ ") + e.titulo;
  return { domNodes: [span] };
}

function pintarCalendario() {
  if (!calendar) return;
  calendar.batchRendering(() => {
    calendar.getEvents().forEach((e) => e.remove());
    eventos.forEach((e) =>
      calendar.addEvent({
        id: e.id,
        title: e.tipo === "guardia" ? e.nombre : e.titulo,
        start: e.start,
        end: e.tipo === "guardia" ? e.end : undefined,
        allDay: false,
        color: e.tipo === "guardia" ? TURNOS[e.turno].color : e.completado ? COLOR_HECHO : COLOR_REC,
      }),
    );
  });
}

export function mostrarAgenda() {
  if (!calendar) return;
  if (!renderizado) {
    calendar.render();
    renderizado = true;
  } else calendar.updateSize();
}

// ---------- Panel "Hoy" ----------
function renderHoy() {
  const hoy = fechaLocalISO();
  const limite = fechaLocalISO(new Date(Date.now() + 7 * 864e5));
  const guardiaHoy = eventos.find((e) => e.tipo === "guardia" && e.fecha === hoy && esMia(e));
  const pendientes = eventos
    .filter((e) => e.tipo === "recordatorio" && !e.completado && e.fecha <= limite)
    .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

  const titulo = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const guardiaHTML = guardiaHoy
    ? '<span class="hoy-guardia ' + guardiaHoy.turno + '">' + TURNOS[guardiaHoy.turno].icono + " Guardia " + TURNOS[guardiaHoy.turno].label + " · " + TURNOS[guardiaHoy.turno].horas + "</span>"
    : '<span class="hoy-guardia libre">Sin guardia hoy</span>';

  const lista = pendientes.length
    ? pendientes
        .map((e) => {
          const vencido = e.fecha < hoy;
          const cuando = e.fecha === hoy ? "Hoy" : vencido ? "Vencido · " + fechaCorta(e.fecha) : fechaCorta(e.fecha);
          return (
            '<div class="pendiente' + (vencido ? " vencido" : "") + '" data-id="' + e.id + '">' +
            '<button class="check" data-accion="completar" title="Marcar como hecho"><span class="ms">radio_button_unchecked</span></button>' +
            '<div class="pendiente-main" data-accion="abrir"><strong>' + escapeHtml(e.titulo) + "</strong>" +
            "<small>" + cuando + (e.hora ? " · " + e.hora : "") + (e.leadId ? ' · <span class="ms ms-sm">person</span> lead' : "") + "</small></div></div>"
          );
        })
        .join("")
    : '<p class="muted">Sin pendientes para los próximos 7 días 🎉</p>';

  $("#agenda-hoy").innerHTML =
    '<div class="card hoy-card"><div class="hoy-head"><h2>' + titulo.charAt(0).toUpperCase() + titulo.slice(1) + "</h2>" + guardiaHTML + "</div>" +
    '<h4 class="hoy-sub">Pendientes</h4>' + lista + "</div>";

  const badge = $("#badge-agenda");
  const urgentes = pendientes.filter((e) => e.fecha <= hoy).length;
  badge.hidden = !urgentes;
  badge.textContent = urgentes;
}

const fechaCorta = (iso) => new Date(iso + "T12:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });

// ---------- Hoja de evento ----------
const ev = { id: "", tipo: "guardia", turno: "am", leadId: "" };

function setSegmento(cont, attr, valor) {
  $$("button", cont).forEach((b) => b.classList.toggle("active", b.dataset[attr] === valor));
}

function pintarTipoEvento() {
  setSegmento($("#ev-tipo"), "tipo", ev.tipo);
  $("#ev-sec-guardia").hidden = ev.tipo !== "guardia";
  $("#ev-sec-recordatorio").hidden = ev.tipo !== "recordatorio";
  $("#ev-titulo-h").textContent = (ev.id ? "Editar " : "Nuevo ") + (ev.tipo === "guardia" ? "guardia" : "recordatorio");
}

function abrirEvento(fecha, existente = null) {
  ev.id = existente?.id || "";
  ev.tipo = existente?.tipo || "guardia";
  ev.turno = existente?.turno || "am";
  ev.leadId = existente?.leadId || "";
  $("#ev-fecha").value = existente?.fecha || fecha || fechaLocalISO();
  $("#ev-nombre").value = existente?.nombre || ASESOR.nombreCorto;
  $("#ev-rec-titulo").value = existente?.titulo || "";
  $("#ev-rec-hora").value = existente?.hora || "";
  $("#ev-rec-nota").value = existente?.nota || "";
  $("#ev-eliminar").hidden = !ev.id;
  $("#ev-abrir-lead").hidden = !ev.leadId;
  $("#ev-tipo").hidden = !!ev.id; // no se cambia el tipo de un evento existente
  setSegmento($("#ev-turno"), "turno", ev.turno);
  pintarTipoEvento();
  abrirHoja($("#sheet-evento"));
}

function guardarEvento() {
  const fecha = $("#ev-fecha").value;
  if (!fecha) return toast("Selecciona la fecha", "error");
  if (ev.tipo === "guardia") {
    const nombre = $("#ev-nombre").value.trim();
    if (!nombre) return toast("Ingresa el nombre", "error");
    const ref = ev.id ? doc(db, COL, ev.id) : doc(collection(db, COL));
    setDoc(ref, datosGuardia(fecha, ev.turno, nombre)).catch(avisarError);
  } else {
    const titulo = $("#ev-rec-titulo").value.trim();
    const hora = $("#ev-rec-hora").value;
    if (!titulo) return toast("Ingresa un título", "error");
    if (!hora) return toast("Selecciona la hora", "error");
    guardarRecordatorio({ id: ev.id, titulo, nota: $("#ev-rec-nota").value.trim(), fecha, hora, leadId: ev.leadId });
  }
  cerrarHoja($("#sheet-evento"));
  toast(ev.id ? "Evento actualizado" : "Evento agregado", "success");
}

async function eliminarEventoActual() {
  if (!ev.id) return;
  if (!(await confirmar("¿Eliminar este evento?", "", { ok: "Eliminar", peligro: true }))) return;
  eliminarEvento(ev.id);
  cerrarHoja($("#sheet-evento"));
  toast("Evento eliminado", "info");
}

// ---------- Rol del mes ----------
let rol = {}; // { "2026-10-05": "am" | "pm" }

function guardiasMiasDelMes(anio, mes) {
  const pref = anio + "-" + String(mes + 1).padStart(2, "0");
  return eventos.filter((e) => e.tipo === "guardia" && esMia(e) && e.fecha.startsWith(pref));
}

function cargarRolDesdeCalendario() {
  const anio = Number($("#rol-anio").value);
  const mes = Number($("#rol-mes").value);
  rol = {};
  guardiasMiasDelMes(anio, mes).forEach((g) => (rol[g.fecha] = g.turno));
  renderRol();
}

function renderRol() {
  const anio = Number($("#rol-anio").value);
  const mes = Number($("#rol-mes").value);
  const dias = new Date(anio, mes + 1, 0).getDate();
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const hoy = fechaLocalISO();
  let html = '<div class="rol-head">' + ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => "<span>" + d + "</span>").join("") + "</div><div class=\"rol-days\">";
  for (let i = 0; i < offset; i++) html += '<span class="rol-day vacio"></span>';
  for (let d = 1; d <= dias; d++) {
    const f = anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const t = rol[f] || "";
    html +=
      '<button class="rol-day ' + t + (f === hoy ? " hoy" : "") + '" data-fecha="' + f + '"><b>' + d + "</b><i>" + (t ? TURNOS[t].icono : "") + "</i></button>";
  }
  $("#rol-grid").innerHTML = html + "</div>";
}

function abrirRol() {
  const hoy = new Date();
  $("#rol-mes").innerHTML = MESES.map((m, i) => '<option value="' + i + '">' + m + "</option>").join("");
  $("#rol-anio").innerHTML = [hoy.getFullYear(), hoy.getFullYear() + 1].map((y) => '<option value="' + y + '">' + y + "</option>").join("");
  $("#rol-mes").value = hoy.getMonth();
  $("#rol-anio").value = hoy.getFullYear();
  cargarRolDesdeCalendario();
  abrirHoja($("#sheet-rol"));
}

async function guardarRol() {
  const anio = Number($("#rol-anio").value);
  const mes = Number($("#rol-mes").value);
  const existentes = {};
  const sobrantes = [];
  guardiasMiasDelMes(anio, mes).forEach((g) => (existentes[g.fecha] ? sobrantes.push(g.id) : (existentes[g.fecha] = g)));

  const batch = writeBatch(db);
  let n = 0;
  const dias = new Date(anio, mes + 1, 0).getDate();
  for (let d = 1; d <= dias; d++) {
    const f = anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const quiero = rol[f] || "";
    const hay = existentes[f];
    if (quiero && !hay) batch.set(doc(collection(db, COL)), datosGuardia(f, quiero, ASESOR.nombreCorto));
    else if (quiero && hay && hay.turno !== quiero) batch.set(doc(db, COL, hay.id), datosGuardia(f, quiero, hay.nombre));
    else if (!quiero && hay) batch.delete(doc(db, COL, hay.id));
    else continue;
    n++;
  }
  sobrantes.forEach((id) => {
    batch.delete(doc(db, COL, id));
    n++;
  });
  if (!n) {
    cerrarHoja($("#sheet-rol"));
    return toast("Sin cambios en el rol", "info");
  }
  batch.commit().catch(avisarError);
  cerrarHoja($("#sheet-rol"));
  toast("Rol de " + MESES[mes] + " guardado (" + n + " cambio" + (n === 1 ? "" : "s") + ")", "success");
}

// ---------- Init ----------
export function iniciarAgenda() {
  const el = $("#calendario");
  if (window.FullCalendar) {
    calendar = new FullCalendar.Calendar(el, {
      locale: "es",
      initialView: "dayGridMonth",
      height: "auto",
      firstDay: 1,
      headerToolbar: { left: "prev,next", center: "title", right: "today" },
      buttonText: { today: "Hoy" },
      dayMaxEvents: 3,
      eventDisplay: "block",
      displayEventTime: false,
      eventContent: contenidoEvento,
      dateClick: (info) => abrirEvento(info.dateStr),
      eventClick: (info) => abrirEvento(null, getEvento(info.event.id)),
    });
  } else {
    el.innerHTML = '<p class="muted">El calendario necesita conexión la primera vez.</p>';
  }

  $("#btn-nuevo-evento").addEventListener("click", () => abrirEvento(fechaLocalISO()));
  $("#btn-rol-mes").addEventListener("click", abrirRol);

  $("#ev-tipo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tipo]");
    if (!b) return;
    ev.tipo = b.dataset.tipo;
    pintarTipoEvento();
  });
  $("#ev-turno").addEventListener("click", (e) => {
    const b = e.target.closest("[data-turno]");
    if (!b) return;
    ev.turno = b.dataset.turno;
    setSegmento($("#ev-turno"), "turno", ev.turno);
  });
  $("#ev-guardar").addEventListener("click", guardarEvento);
  $("#ev-eliminar").addEventListener("click", eliminarEventoActual);
  $("#ev-abrir-lead").addEventListener("click", () => {
    cerrarHoja($("#sheet-evento"));
    document.dispatchEvent(new CustomEvent("lead:abrir", { detail: ev.leadId }));
  });

  $("#agenda-hoy").addEventListener("click", (e) => {
    const item = e.target.closest(".pendiente");
    if (!item) return;
    const evento = getEvento(item.dataset.id);
    if (!evento) return;
    if (e.target.closest('[data-accion="completar"]')) {
      updateDoc(doc(db, COL, evento.id), { completado: true }).catch(avisarError);
      toast("Pendiente completado", "success");
    } else if (evento.leadId) {
      document.dispatchEvent(new CustomEvent("lead:abrir", { detail: evento.leadId }));
    } else abrirEvento(null, evento);
  });

  $("#rol-mes").addEventListener("change", cargarRolDesdeCalendario);
  $("#rol-anio").addEventListener("change", cargarRolDesdeCalendario);
  $("#rol-grid").addEventListener("click", (e) => {
    const b = e.target.closest(".rol-day[data-fecha]");
    if (!b) return;
    const f = b.dataset.fecha;
    rol[f] = !rol[f] ? "am" : rol[f] === "am" ? "pm" : "";
    b.className = "rol-day " + rol[f] + (f === fechaLocalISO() ? " hoy" : "");
    b.querySelector("i").textContent = rol[f] ? TURNOS[rol[f]].icono : "";
  });
  $("#btn-rol-limpiar").addEventListener("click", () => {
    rol = {};
    renderRol();
  });
  $("#btn-rol-guardar").addEventListener("click", guardarRol);

  renderHoy();
  onSnapshot(
    collection(db, COL),
    (snap) => {
      eventos = snap.docs.map((d) => normalizar(d.id, d.data())).filter((e) => e.fecha);
      pintarCalendario();
      renderHoy();
      document.dispatchEvent(new CustomEvent("agenda:cambio"));
    },
    (err) => console.warn("Agenda:", err.code),
  );
  // refrescar "Hoy" al volver a la app (por si cambió el día)
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && renderHoy());
}
