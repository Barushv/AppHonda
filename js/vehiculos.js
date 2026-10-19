// ==============================
// VEHÍCULOS — catálogo, selección de versión y envío por WhatsApp
// ==============================
import { $, escapeHtml, formatoPrecio, drivePreview, toast } from "./ui.js";
import { suscribirCatalogo, modelosVisibles, aniosDe } from "./catalogo.js";
import { agregarLead } from "./leads-store.js";
import { ASESOR } from "./config.js";

let modelos = [];
const sel = { modeloId: "", anio: "", idx: -1 };

const modeloActual = () => modelos.find((m) => m.id === sel.modeloId);
const versionActual = () => modeloActual()?.anios[sel.anio]?.versiones[sel.idx] || null;

function fichaActual() {
  const v = versionActual();
  if (!v) return "";
  return (modeloActual().anios[sel.anio].fichas?.[v.tipo] || "").trim();
}

// ---------- Render ----------
function renderStrip() {
  $("#modelos-strip").innerHTML = modelos
    .map(
      (m) =>
        '<button class="modelo-chip' + (m.id === sel.modeloId ? " active" : "") + '" data-id="' + escapeHtml(m.id) + '" role="option">' +
        '<img src="' + escapeHtml(m.imagen) + '" alt="" loading="lazy" />' +
        "<span>" + escapeHtml(m.nombre) + "</span></button>",
    )
    .join("");
}

function renderDetalle() {
  const m = modeloActual();
  $("#modelo-detalle").hidden = !m;
  $("#vehiculo-vacio").hidden = !!m;
  if (!m) return renderResumen();

  const img = $("#modelo-img");
  if (img.getAttribute("src") !== m.imagen) img.src = m.imagen;
  img.alt = m.nombre;
  $("#modelo-nombre").textContent = m.nombre;

  const anios = aniosDe(m, { soloPublicados: true });
  $("#anio-chips").innerHTML =
    anios.length > 1
      ? anios.map((a) => '<button data-anio="' + a + '" class="' + (a === sel.anio ? "active" : "") + '">' + a + "</button>").join("")
      : '<span class="anio-unico">' + (anios[0] || "") + "</span>";

  const versiones = m.anios[sel.anio]?.versiones || [];
  $("#versiones").innerHTML = versiones
    .map(
      (v, i) =>
        '<button class="version-card' + (i === sel.idx ? " active" : "") + '" data-idx="' + i + '">' +
        '<span class="version-nombre">' + escapeHtml(v.nombre) + (v.tipo === "hev" ? ' <i class="badge-hev">HEV</i>' : "") + "</span>" +
        '<span class="version-precio">' + formatoPrecio(v.precio) + "</span>" +
        '<span class="ms version-check">check_circle</span></button>',
    )
    .join("");
  renderResumen();
}

function renderResumen() {
  const v = versionActual();
  const m = modeloActual();
  const res = $("#resumen-sel");
  if (!v) {
    res.innerHTML = '<span class="ms">touch_app</span> Selecciona una versión';
    res.classList.remove("ok");
  } else {
    res.innerHTML =
      "<strong>" + escapeHtml(m.nombre + " " + v.nombre + " " + sel.anio) + "</strong><span>" + formatoPrecio(v.precio) + "</span>";
    res.classList.add("ok");
  }
  $("#btn-enviar").disabled = !v;
  const ficha = fichaActual();
  const btnFicha = $("#btn-ficha");
  btnFicha.disabled = !v || !ficha;
  btnFicha.lastChild.textContent = v && !ficha ? " Ficha técnica no disponible" : " Enviar solo ficha técnica";
}

// ---------- Selección ----------
function elegirModelo(id) {
  const m = modelos.find((x) => x.id === id);
  if (!m) return;
  sel.modeloId = id;
  sel.anio = aniosDe(m, { soloPublicados: true })[0] || "";
  sel.idx = -1;
  renderStrip();
  renderDetalle();
  $("#modelo-detalle").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function alCambiarCatalogo(lista) {
  modelos = modelosVisibles(lista);
  // Conservar la selección si sigue existiendo
  const m = modeloActual();
  if (!m) Object.assign(sel, { modeloId: "", anio: "", idx: -1 });
  else {
    const anios = aniosDe(m, { soloPublicados: true });
    if (!anios.includes(sel.anio)) Object.assign(sel, { anio: anios[0], idx: -1 });
    else if (!m.anios[sel.anio].versiones[sel.idx]) sel.idx = -1;
  }
  renderStrip();
  renderDetalle();
}

// ---------- WhatsApp ----------
export function buildWaNumber(phoneRaw) {
  const p = (phoneRaw || "").trim().replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p.slice(1).replace(/\D/g, "");
  if (p.startsWith("00")) return p.slice(2).replace(/\D/g, "");
  const digits = p.replace(/\D/g, "");
  if (digits.length > 10) return digits;
  return ASESOR.codigoPais + digits;
}

function telefonoValido(raw) {
  const p = (raw || "").trim();
  const digits = p.replace(/\D/g, "");
  if (p.startsWith("+") || p.startsWith("00")) return digits.length >= 11;
  return digits.length >= 10;
}

/** 9991234567 → 999 123 4567 mientras se escribe (no toca números con +) */
function formatearTelefono(input) {
  const v = input.value;
  if (v.trim().startsWith("+")) return;
  const d = v.replace(/\D/g, "").slice(0, 12);
  input.value = d.length > 10 ? d : [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");
}

function abrirWa(numero, textoCodificado) {
  const waUrl = "https://wa.me/" + numero + "?text=" + textoCodificado;
  const w = window.open(waUrl, "_blank");
  if (!w) location.href = waUrl;
}

// Codificación propia: deja los emojis tal cual para que WhatsApp los muestre bien
export const codificarMensaje = (texto) =>
  texto
    .split("")
    .map((c) => {
      const code = c.codePointAt(0);
      if (code > 0x00ff) return c;
      if (" \t\n\r".includes(c)) return encodeURIComponent(c);
      if ("!#$&'()*+,/:;=?@[]".includes(c)) return encodeURIComponent(c);
      return c;
    })
    .join("");

function leerCliente() {
  const nombre = $("#nombre-cliente").value.trim();
  const telefono = $("#telefono-cliente").value.trim();
  return { nombre, telefono };
}

function validarCliente(telefono) {
  if (!telefono || !telefonoValido(telefono)) {
    toast("Ingresa un número de WhatsApp válido (10 dígitos)", "error");
    $("#telefono-cliente").focus();
    return false;
  }
  return true;
}

function enviarACliente() {
  const m = modeloActual();
  const v = versionActual();
  if (!v) return toast("Selecciona modelo y versión primero", "error");
  const { nombre, telefono } = leerCliente();
  if (!validarCliente(telefono)) return;

  const modeloSeleccionado = m.nombre;
  const versionSeleccionada = v.nombre + " " + sel.anio;
  const precioSeleccionado = formatoPrecio(v.precio);
  const linkFicha = fichaActual();

  const saludo = nombre
    ? "\u{1F44B} Hola *" + nombre + "*, soy *" + ASESOR.nombre + "*, asesor de ventas en *" + ASESOR.agencia + "*."
    : "\u{1F44B} Hola, soy *" + ASESOR.nombre + "*, asesor de ventas en *" + ASESOR.agencia + "*.";

  let lineas = [
    saludo,
    "",
    "\u{1F697} Te comparto la información del vehículo de tu interés:",
    "\u{1F539} Modelo: *" + modeloSeleccionado + "*",
    "\u{1F538} Versión: *" + versionSeleccionada + "*",
    "\u{1F4B0} Precio: *" + precioSeleccionado + "*",
  ];
  if (linkFicha) lineas.push("", "\u{1F4C4} *Ficha técnica:*", linkFicha);
  lineas = lineas.concat([
    "",
    "\u{1F4DE} Estoy a tus órdenes para asesorarte y resolver cualquier duda.",
    "",
    "✉️ Correo: " + ASESOR.correo,
    "\u{1F4D8} Facebook: " + ASESOR.facebook,
    "\u{1F4CD} " + ASESOR.agencia + ", " + ASESOR.ciudad,
  ]);

  const numeroWa = buildWaNumber(telefono);
  agregarLead({
    dateISO: new Date().toISOString(),
    name: nombre,
    phone: numeroWa,
    phoneRaw: telefono,
    model: modeloSeleccionado,
    version: versionSeleccionada,
    price: precioSeleccionado,
    fichaUrl: linkFicha,
    status: "nuevo",
    notas: [],
  });
  toast("Lead guardado", "success");
  abrirWa(numeroWa, codificarMensaje(lineas.join("\n")));
}

function enviarFicha() {
  const url = fichaActual();
  if (!url) return toast("Esta versión no tiene ficha técnica configurada", "info");
  const m = modeloActual();
  const v = versionActual();
  const { nombre, telefono } = leerCliente();
  if (!telefono) {
    window.open(drivePreview(url), "_blank");
    return;
  }
  if (!validarCliente(telefono)) return;
  const texto =
    (nombre ? "Hola *" + nombre + "*, a" : "A") + "quí te comparto la ficha técnica del *" + m.nombre + " " + v.nombre + " " + sel.anio + "*:\n\n" + url;
  abrirWa(buildWaNumber(telefono), encodeURIComponent(texto));
}

// ---------- Init ----------
export function iniciarVehiculos() {
  $("#modelos-strip").addEventListener("click", (e) => {
    const b = e.target.closest(".modelo-chip");
    if (b) elegirModelo(b.dataset.id);
  });
  $("#anio-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-anio]");
    if (!b) return;
    sel.anio = b.dataset.anio;
    sel.idx = -1;
    renderDetalle();
  });
  $("#versiones").addEventListener("click", (e) => {
    const b = e.target.closest(".version-card");
    if (!b) return;
    sel.idx = Number(b.dataset.idx);
    renderDetalle();
  });

  const tel = $("#telefono-cliente");
  tel.addEventListener("input", () => {
    formatearTelefono(tel);
    tel.classList.remove("invalid");
  });
  tel.addEventListener("blur", () => tel.classList.toggle("invalid", !!tel.value && !telefonoValido(tel.value)));

  $("#btn-enviar").addEventListener("click", enviarACliente);
  $("#btn-ficha").addEventListener("click", enviarFicha);

  suscribirCatalogo(alCambiarCatalogo);
}
