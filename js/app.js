// ==============================
// FIREBASE
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyC3WZseiyASn9_8JmtSX-7UY0V__MmOGQI",
  authDomain: "hosndaguardias-7c69b.firebaseapp.com",
  projectId: "hondaguardias-7c69b",
  storageBucket: "hondaguardias-7c69b.appspot.com",
  messagingSenderId: "333873832947",
  appId: "1:333873832947:web:18b0b6728ffb541ecf6886",
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==============================
// ESTADO GLOBAL
// ==============================
let catalogoModelos = [];
let modeloSeleccionado = "";
let versionSeleccionada = "";
let precioSeleccionado = "";
let fichaActual = null;

const PDF_FINANCIAMIENTO = { oferta: "", descuentos: "" };

function abrirPdfFinanciamiento(tipo) {
  const url = PDF_FINANCIAMIENTO[tipo];
  if (!url || url.trim() === "") {
    mostrarToast("Link de " + tipo + " aún no configurado.", "info");
    return;
  }
  window.open(url.replace("/view", "/preview"), "_blank");
}

// ==============================
// CARGA INICIAL
// ==============================
window.onload = async () => {
  aplicarModoOscuroDesdeStorage();

  // Migración v1 → v2
  try {
    const v1raw = localStorage.getItem("hondago_leads_v1");
    const v2raw = localStorage.getItem("hondago_leads_v2");
    if (v1raw && (!v2raw || v2raw === "[]")) {
      const leadsV1 = JSON.parse(v1raw) || [];
      if (leadsV1.length > 0) {
        const adaptados = leadsV1.map((l, i) => ({
          id: l.id || "ld_" + Date.now().toString(36) + i,
          dateISO: l.dateISO || l.fecha || new Date().toISOString(),
          name: l.name || l.nombre || "",
          phone: l.phone || l.telefono || "",
          phoneRaw: l.phoneRaw || l.telefono || "",
          model: l.model || l.modelo || "",
          version: l.version || "",
          price: l.price || l.precio || "",
          status: l.status || "nuevo",
          notas: l.notas || [],
          fichaUrl: l.fichaUrl || "",
        }));
        localStorage.setItem("hondago_leads_v2", JSON.stringify(adaptados));
      }
    }
  } catch (e) {}

  // Cargar catálogo desde Firestore + JSON
  try {
    const resp = await fetch("json/precios.json");
    const data = await resp.json();
    const baseModelos = data.modelos || [];

    let firestoreOverrides = {};
    try {
      const snap = await db.collection("catalogo_admin").get();
      snap.forEach((doc) => {
        firestoreOverrides[doc.id] = doc.data();
      });
    } catch (_) {}

    try {
      const finSnap = await db.collection("config").doc("financiamiento").get();
      if (finSnap.exists) {
        const fin = finSnap.data();
        if (fin.oferta) PDF_FINANCIAMIENTO.oferta = fin.oferta;
        if (fin.descuentos) PDF_FINANCIAMIENTO.descuentos = fin.descuentos;
      }
    } catch (_) {}

    catalogoModelos = baseModelos.map((m) => {
      const fs = firestoreOverrides[m.nombre];
      if (!fs) return m;
      return { ...m, versiones: fs.versiones || m.versiones, fichas: fs.fichas || m.fichas || {} };
    });
  } catch (e) {
    console.error("Error cargando catálogo:", e);
    mostrarToast("Error cargando catálogo", "error");
    return;
  }

  const selectModelo = document.getElementById("modelo");
  catalogoModelos.forEach((m) => {
    const op = document.createElement("option");
    op.value = m.nombre;
    op.textContent = m.nombre;
    selectModelo.appendChild(op);
  });

  updateLeadCounter();
  cargarLeadsDesdeFirestore();
};

// ==============================
// VEHÍCULOS
// ==============================
function cargarVersiones() {
  const nombreModelo = document.getElementById("modelo").value;
  const selectVersion = document.getElementById("version");
  selectVersion.innerHTML = '<option value="">--Selecciona versión--</option>';
  document.getElementById("info-modelo").innerHTML = "";
  document.getElementById("imagen").src = "";
  const btnFicha = document.getElementById("btn-ficha");
  const btnEnv = document.getElementById("btn-enviar");
  if (btnFicha) btnFicha.style.display = "none";
  if (btnEnv) btnEnv.disabled = true;
  modeloSeleccionado = "";
  versionSeleccionada = "";
  precioSeleccionado = "";
  fichaActual = null;
  if (!nombreModelo) return;

  const modelo = catalogoModelos.find((m) => m.nombre === nombreModelo);
  if (!modelo) return;
  fichaActual = modelo.fichas || null;

  const por2027 = modelo.versiones.filter((v) => v.año === 2027);
  const por2026 = modelo.versiones.filter((v) => v.año === 2026);
  const por2025 = modelo.versiones.filter((v) => v.año === 2025);

  const addGroup = (label, arr) => {
    if (!arr.length) return;
    const og = document.createElement("optgroup");
    og.label = label;
    arr.forEach((v) => {
      const op = document.createElement("option");
      op.value = JSON.stringify({ nombre: v.nombre, precio: v.precio, tipo: v.tipo, año: v.año });
      op.textContent = v.nombre + " " + v.año;
      og.appendChild(op);
    });
    selectVersion.appendChild(og);
  };
  addGroup("Versiones 2027", por2027);
  addGroup("Versiones 2026", por2026);
  addGroup("Versiones 2025", por2025);

  const imagen = document.getElementById("imagen");
  imagen.src = modelo.imagen || "img/" + nombreModelo.toLowerCase() + ".png";
  imagen.alt = nombreModelo;
}

function actualizarPrecio() {
  const rawVal = document.getElementById("version").value;
  const info = document.getElementById("info-modelo");
  const btnEnv = document.getElementById("btn-enviar");
  const btnFicha = document.getElementById("btn-ficha");
  if (!rawVal) {
    info.innerHTML = "";
    if (btnEnv) btnEnv.disabled = true;
    if (btnFicha) btnFicha.style.display = "none";
    return;
  }
  let vData;
  try {
    vData = JSON.parse(rawVal);
  } catch {
    return;
  }

  modeloSeleccionado = document.getElementById("modelo").value;
  versionSeleccionada = vData.nombre + " " + vData.año;
  precioSeleccionado = "$" + Number(vData.precio).toLocaleString("es-MX");

  info.innerHTML =
    '<span class="precio-label">Precio de lista</span>' +
    '<span class="precio-valor">' +
    precioSeleccionado +
    "</span>" +
    (vData.tipo === "hev" ? '<span class="badge-hev">⚡ HEV</span>' : "");

  if (btnEnv) btnEnv.disabled = false;

  if (fichaActual && btnFicha) {
    const tipoVer = vData.tipo || "gasolina";
    const tieneFicha = tipoVer in fichaActual;
    const linkFicha = fichaActual[tipoVer] || "";
    if (tieneFicha) {
      btnFicha.style.display = "block";
      btnFicha.dataset.url = linkFicha;
      btnFicha.dataset.tipo = tipoVer;
      btnFicha.textContent = linkFicha.trim() !== "" ? "📄 Enviar ficha técnica" : "📄 Ficha técnica (sin configurar)";
      btnFicha.style.opacity = linkFicha.trim() !== "" ? "1" : "0.6";
    } else {
      btnFicha.style.display = "none";
    }
  }
}

function abrirFichaTecnica() {
  const btn = document.getElementById("btn-ficha");
  const url = (btn ? btn.dataset.url : "") || "";
  if (!url || url.trim() === "") {
    mostrarToast("Configura el link en Admin → Catálogo", "info");
    return;
  }
  const telefono = (document.getElementById("telefono-cliente").value || "").trim();
  const nombre = (document.getElementById("nombre-cliente").value || "").trim();
  if (telefono) {
    const numeroWa = buildWaNumber(telefono, "");
    const texto =
      (nombre ? "Hola *" + nombre + "*, a" : "A") +
      "quí te comparto la ficha técnica del *" +
      modeloSeleccionado +
      " " +
      versionSeleccionada +
      "*:\n\n" +
      url;
    const waUrl = "https://wa.me/" + numeroWa + "?text=" + encodeURIComponent(texto);
    const w = window.open(waUrl, "_blank");
    if (!w) location.href = waUrl;
  } else {
    window.open(url.replace("/view", "/preview"), "_blank");
  }
}

// ==============================
// WHATSAPP
// ==============================
function buildWaNumber(phoneRaw, codPaisRaw) {
  let p = (phoneRaw || "").trim().replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p.slice(1).replace(/\D/g, "");
  if (p.startsWith("00")) return p.slice(2).replace(/\D/g, "");
  let digits = p.replace(/\D/g, "");
  if (digits.length > 10) return digits;
  return ((codPaisRaw || "+52").replace(/[^\d]/g, "") || "52") + digits;
}

function enviarACliente() {
  const telefonoRaw = (document.getElementById("telefono-cliente").value || "").trim();
  const nombre = (document.getElementById("nombre-cliente").value || "").trim();
  if (!telefonoRaw) {
    mostrarToast("Ingresa un número válido", "error");
    return;
  }
  if (!modeloSeleccionado || !versionSeleccionada) {
    mostrarToast("Selecciona modelo y versión primero", "error");
    return;
  }

  const btnFicha = document.getElementById("btn-ficha");
  const linkFicha = btnFicha && btnFicha.style.display !== "none" && btnFicha.dataset.url ? btnFicha.dataset.url.trim() : "";

  const saludo = nombre
    ? ["\u{1F44B}", " Hola *", nombre, "*, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*."].join("")
    : "\u{1F44B} Hola, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*.";

  let lineas = [
    saludo,
    "",
    "\u{1F697} Te comparto la información del vehículo de tu interés:",
    "\u{1F539} Modelo: *" + modeloSeleccionado + "*",
    "\u{1F538} Versión: *" + versionSeleccionada + "*",
    "\u{1F4B0} Precio: *" + precioSeleccionado + "*",
  ];
  if (linkFicha !== "") {
    lineas.push("");
    lineas.push("\u{1F4C4} *Ficha técnica:*");
    lineas.push(linkFicha);
  }
  lineas = lineas.concat([
    "",
    "\u{1F4DE} Estoy a tus órdenes para asesorarte y resolver cualquier duda.",
    "",
    "\u2709\uFE0F Correo: fortiz.hondamontejo@gmail.com",
    "\u{1F4D8} Facebook: fb.com/honda.israelortiz",
    "\u{1F4CD} Honda Montejo, Mérida",
  ]);

  const texto = lineas.join("\n");
  const numeroWa = buildWaNumber(telefonoRaw, "");

  saveLead({
    id: generateLeadId(),
    dateISO: new Date().toISOString(),
    name: nombre,
    phone: numeroWa,
    phoneRaw: telefonoRaw,
    model: modeloSeleccionado,
    version: versionSeleccionada,
    price: precioSeleccionado,
    fichaUrl: linkFicha,
    status: "nuevo",
    notas: [],
  });
  mostrarToast("Lead guardado ✅", "success");

  const textoCodificado = texto
    .split("")
    .map(function (c) {
      const code = c.codePointAt(0);
      if (code > 0x00ff) return c;
      if (" \t\n\r".includes(c)) return encodeURIComponent(c);
      if ("!#$&'()*+,/:;=?@[]".includes(c)) return encodeURIComponent(c);
      return c;
    })
    .join("");
  const waUrl = "https://wa.me/" + numeroWa + "?text=" + textoCodificado;
  const w = window.open(waUrl, "_blank");
  if (!w) location.href = waUrl;
}

// ==============================
// TABS Y NAVEGACIÓN
// ==============================
function cambiarTab(tabId) {
  document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".tab-bar button").forEach((b) => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  document.getElementById("tab-" + tabId).classList.add("active");
  if (tabId === "mas") {
    document.querySelectorAll(".sub-mas").forEach((s) => (s.style.display = "none"));
    document.getElementById("mas").querySelector(".menu-mas").style.display = "";
  }
}

function mostrarSubseccionMas(subId) {
  document.getElementById("mas").querySelector(".menu-mas").style.display = "none";
  document.querySelectorAll(".sub-mas").forEach((s) => (s.style.display = "none"));
  if (subId === "calendario") {
    document.getElementById("sub-mas-calendario").style.display = "block";
    if (typeof calendar !== "undefined" && calendar) calendar.render();
  } else if (subId === "leads") {
    document.getElementById("sub-mas-leads").style.display = "block";
    const sizeSel = document.getElementById("lead-size");
    const searchIn = document.getElementById("lead-search");
    if (sizeSel) sizeSel.value = String(leadUI.pageSize || 50);
    if (searchIn) searchIn.value = leadUI.search || "";
    renderLeadsList();
  } else if (subId === "creditos") {
    document.getElementById("sub-mas-creditos").style.display = "block";
  } else if (subId === "actualizacion") {
    document.getElementById("sub-mas-actualizacion").style.display = "block";
  }
}

function volverMenuMas() {
  document.querySelectorAll(".sub-mas").forEach((s) => (s.style.display = "none"));
  document.getElementById("mas").querySelector(".menu-mas").style.display = "";
}

// ==============================
// LEADS — STORAGE
// ==============================
const LEADS_KEY = "hondago_leads_v2";

function generateLeadId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "ld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
function getLeads() {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
  } catch {
    return [];
  }
}
function setLeads(arr) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(arr));
}

function saveLead(lead) {
  if (!lead.id) lead.id = generateLeadId();
  if (!lead.status) lead.status = "nuevo";
  if (!lead.notas) lead.notas = [];
  const leads = getLeads();
  leads.push(lead);
  setLeads(leads);
  updateLeadCounter();
  db.collection("leads")
    .doc(lead.id)
    .set(lead)
    .catch(() => {});
}

function sincronizarLeadUpdateFirestore(lead) {
  db.collection("leads")
    .doc(lead.id)
    .set(lead)
    .catch(() => {});
}

async function cargarLeadsDesdeFirestore() {
  if (getLeads().length > 0) return;
  try {
    const snap = await db.collection("leads").orderBy("dateISO", "desc").get();
    if (snap.empty) return;
    const remotos = [];
    snap.forEach((doc) => remotos.push(doc.data()));
    setLeads(remotos);
    updateLeadCounter();
    mostrarToast("Leads restaurados desde la nube ☁️", "info");
  } catch (_) {}
}

function updateLeadCounter() {
  const n = getLeads().length;
  const el1 = document.getElementById("lead-count");
  const el2 = document.getElementById("lead-count-badge");
  if (el1) el1.textContent = n;
  if (el2) el2.textContent = n;
}

// ==============================
// LEADS — FILTROS Y PAGINACIÓN
// ==============================
let leadPage = 1;
let leadUI = { search: "", pageSize: 50, statusFilter: "" };

function setLeadSearch(val) {
  leadUI.search = String(val || "")
    .trim()
    .toLowerCase();
  leadPage = 1;
  renderLeadsList();
}
function setLeadPageSize(val) {
  leadUI.pageSize = Math.max(10, Math.min(parseInt(val, 10) || 50, 500));
  leadPage = 1;
  renderLeadsList();
}
function setLeadStatusFilter(btn, status) {
  document.querySelectorAll(".status-chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  leadUI.statusFilter = status;
  leadPage = 1;
  renderLeadsList();
}
function filterLeads(leads) {
  let list = leads;
  if (leadUI.statusFilter) list = list.filter((l) => (l.status || "nuevo") === leadUI.statusFilter);
  if (leadUI.search) {
    const q = leadUI.search;
    list = list.filter((l) =>
      [l.name, l.phoneRaw, l.model, l.version, l.price, l.status]
        .map((x) => String(x || "").toLowerCase())
        .join(" ")
        .includes(q),
    );
  }
  return list;
}
function calcLeadPages(total) {
  return Math.max(1, Math.ceil(total / (leadUI.pageSize || 50)));
}
function nextLeadPage() {
  if (leadPage < calcLeadPages(filterLeads(getLeads()).length)) {
    leadPage++;
    renderLeadsList();
  }
}
function prevLeadPage() {
  if (leadPage > 1) {
    leadPage--;
    renderLeadsList();
  }
}

// ==============================
// LEADS — BADGES DE ESTADO
// ==============================
const STATUS_META = {
  nuevo: { label: "🆕 Nuevo", color: "#007aff" },
  contactado: { label: "📞 Contactado", color: "#ff9500" },
  seguimiento: { label: "🔄 Seguimiento", color: "#5856d6" },
  cita: { label: "📅 Cita", color: "#34aadc" },
  vendido: { label: "✅ Vendido", color: "#30d158" },
  descartado: { label: "❌ Descartado", color: "#8e8e93" },
};
function statusBadge(status) {
  const m = STATUS_META[status] || STATUS_META["nuevo"];
  return (
    '<span class="status-badge" style="background:' + m.color + "20;color:" + m.color + ";border:1px solid " + m.color + '40">' + m.label + "</span>"
  );
}

// ==============================
// LEADS — RENDER CARDS
// ==============================
function renderLeadsList() {
  const cont = document.getElementById("lead-list");
  if (!cont) return;
  updateLeadCounter();
  const all = getLeads();
  const filtered = filterLeads(all);
  const sorted = filtered.slice().sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
  const size = leadUI.pageSize || 50;
  const total = sorted.length;
  const pages = calcLeadPages(total);
  if (leadPage > pages) leadPage = pages;
  const pageItems = sorted.slice((leadPage - 1) * size, leadPage * size);

  if (!pageItems.length) {
    cont.innerHTML =
      '<p style="text-align:center;color:#777;margin:20px 0">' +
      (total ? "Sin resultados para tu búsqueda." : "Aún no hay leads registrados.") +
      "</p>";
  } else {
    cont.innerHTML =
      '<div class="lead-cards-list">' +
      pageItems
        .map((l) => {
          const ultimaNota = l.notas && l.notas.length ? '<p class="lead-card-nota">' + escapeHtml(l.notas[l.notas.length - 1].texto) + "</p>" : "";
          return (
            '<div class="lead-card" onclick="abrirDetalleLead(\'' +
            l.id +
            "')\">" +
            '<div class="lead-card-top"><div><span class="lead-card-name">' +
            escapeHtml(l.name || "Sin nombre") +
            "</span>" +
            statusBadge(l.status || "nuevo") +
            "</div>" +
            '<span class="lead-card-date">' +
            formatDateTime(l.dateISO) +
            "</span></div>" +
            '<div class="lead-card-mid"><span>🚗 ' +
            escapeHtml(l.model || "") +
            " " +
            escapeHtml(l.version || "") +
            "</span><span>💰 " +
            escapeHtml(l.price || "") +
            "</span></div>" +
            '<div class="lead-card-mid"><span>📱 ' +
            escapeHtml(l.phoneRaw || "") +
            "</span></div>" +
            ultimaNota +
            '<div class="lead-card-actions" onclick="event.stopPropagation()"><input type="checkbox" class="lead-check" data-id="' +
            l.id +
            '" onchange="updateLeadSelectionUI()"></div>' +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }
  const info = document.getElementById("lead-page-info");
  if (info) info.textContent = "Pág " + (total ? leadPage : 1) + " / " + pages;
  updateLeadSelectionUI();
}

// ==============================
// LEADS — SELECCIÓN MASIVA
// ==============================
function updateLeadSelectionUI() {
  const checks = Array.from(document.querySelectorAll("#lead-list .lead-check"));
  const selected = checks.filter((c) => c.checked).length;
  const bar = document.getElementById("lead-selection");
  const count = document.getElementById("lead-selected-count");
  if (bar) bar.classList.toggle("show", selected > 0);
  if (count) count.textContent = selected;
}

function deleteSelectedLeads() {
  const checked = Array.from(document.querySelectorAll("#lead-list .lead-check:checked"));
  if (!checked.length) {
    mostrarToast("Selecciona al menos un lead", "info");
    return;
  }
  if (!confirm("¿Eliminar " + checked.length + " lead(s)?")) return;
  const ids = new Set(checked.map((c) => c.getAttribute("data-id")));
  setLeads(getLeads().filter((l) => !ids.has(l.id)));
  ids.forEach((id) =>
    db
      .collection("leads")
      .doc(id)
      .delete()
      .catch(() => {}),
  );
  renderLeadsList();
  updateLeadCounter();
  mostrarToast("Lead(s) eliminado(s)", "success");
}

// ==============================
// LEADS — DETALLE / CRM
// ==============================
let leadDetalleActual = null;

function abrirDetalleLead(id) {
  const lead = getLeads().find((l) => l.id === id);
  if (!lead) return;
  leadDetalleActual = lead;
  document.getElementById("lead-detail-title").textContent = lead.name || "Lead";
  document.getElementById("ld-fecha").textContent = formatDateTime(lead.dateISO);
  document.getElementById("ld-nombre").textContent = lead.name || "—";
  document.getElementById("ld-telefono").textContent = lead.phoneRaw || "—";
  document.getElementById("ld-tel-link").href = "https://wa.me/" + lead.phone;
  document.getElementById("ld-modelo").textContent = lead.model || "—";
  document.getElementById("ld-version").textContent = lead.version || "—";
  document.getElementById("ld-precio").textContent = lead.price || "—";
  document.getElementById("ld-status").value = lead.status || "nuevo";
  document.getElementById("ld-lead-id").value = id;
  document.getElementById("ld-nota-input").value = "";
  renderNotasLog(lead);
  document.getElementById("modalLead").style.display = "flex";
  bloquearScroll();
}

function renderNotasLog(lead) {
  const log = document.getElementById("ld-notas-log");
  if (!lead.notas || !lead.notas.length) {
    log.innerHTML = '<p class="notas-empty">Sin notas aún. Agrega la primera abajo 👇</p>';
    return;
  }
  log.innerHTML = lead.notas
    .map(
      (n, i) =>
        '<div class="nota-item"><div class="nota-header"><span class="nota-fecha">' +
        formatDateTime(n.fecha) +
        "</span>" +
        '<div class="nota-acciones">' +
        '<button class="nota-btn" onclick="abrirEditarNota(\'' +
        lead.id +
        "'," +
        i +
        ')"><span class="material-icons" style="font-size:16px">edit</span></button>' +
        '<button class="nota-btn nota-btn-del" onclick="eliminarNota(\'' +
        lead.id +
        "'," +
        i +
        ')"><span class="material-icons" style="font-size:16px">delete</span></button>' +
        '</div></div><p class="nota-texto">' +
        escapeHtml(n.texto) +
        "</p></div>",
    )
    .reverse()
    .join("");
}

function guardarEstadoLead() {
  const id = document.getElementById("ld-lead-id").value;
  const status = document.getElementById("ld-status").value;
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return;
  leads[idx].status = status;
  leadDetalleActual = leads[idx];
  setLeads(leads);
  sincronizarLeadUpdateFirestore(leads[idx]);
  renderLeadsList();
  mostrarToast("Estado actualizado", "success");
}

function agregarNotaLead() {
  const inputNota = document.getElementById("ld-nota-input");
  const texto = (inputNota ? inputNota.value : "").trim();
  if (!texto) {
    mostrarToast("Escribe algo antes de guardar", "info");
    return;
  }
  const id = document.getElementById("ld-lead-id").value;
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return;
  if (!leads[idx].notas) leads[idx].notas = [];
  leads[idx].notas.push({ texto, fecha: new Date().toISOString() });
  leadDetalleActual = leads[idx];
  setLeads(leads);
  if (inputNota) inputNota.value = "";
  const leadFresh = getLeads().find((l) => l.id === id);
  if (leadFresh) {
    leadDetalleActual = leadFresh;
    renderNotasLog(leadFresh);
  }
  setTimeout(() => {
    sincronizarLeadUpdateFirestore(leads[idx]);
    renderLeadsList();
  }, 0);
  mostrarToast("Nota guardada ✅", "success");
}

function eliminarNota(leadId, idx) {
  if (!confirm("¿Eliminar esta nota?")) return;
  const leads = getLeads();
  const lIdx = leads.findIndex((l) => l.id === leadId);
  if (lIdx === -1) return;
  leads[lIdx].notas.splice(idx, 1);
  leadDetalleActual = leads[lIdx];
  setLeads(leads);
  sincronizarLeadUpdateFirestore(leads[lIdx]);
  renderNotasLog(leads[lIdx]);
  renderLeadsList();
  mostrarToast("Nota eliminada", "info");
}

function abrirEditarNota(leadId, idx) {
  const lead = getLeads().find((l) => l.id === leadId);
  if (!lead || !lead.notas[idx]) return;
  document.getElementById("edit-nota-texto").value = lead.notas[idx].texto;
  document.getElementById("edit-nota-lead-id").value = leadId;
  document.getElementById("edit-nota-index").value = idx;
  document.getElementById("modalEditarNota").style.display = "flex";
}

function confirmarEditarNota() {
  const texto = document.getElementById("edit-nota-texto").value.trim();
  const leadId = document.getElementById("edit-nota-lead-id").value;
  const idx = parseInt(document.getElementById("edit-nota-index").value, 10);
  if (!texto) {
    mostrarToast("La nota no puede estar vacía", "info");
    return;
  }
  const leads = getLeads();
  const lIdx = leads.findIndex((l) => l.id === leadId);
  if (lIdx === -1) return;
  leads[lIdx].notas[idx].texto = texto;
  leads[lIdx].notas[idx].editadoEn = new Date().toISOString();
  leadDetalleActual = leads[lIdx];
  setLeads(leads);
  sincronizarLeadUpdateFirestore(leads[lIdx]);
  cerrarModalEditarNota();
  renderNotasLog(leads[lIdx]);
  renderLeadsList();
  mostrarToast("Nota actualizada ✅", "success");
}

function cerrarModalEditarNota() {
  document.getElementById("modalEditarNota").style.display = "none";
}
function abrirWaDesdeDetalle() {
  if (leadDetalleActual?.phone) window.open("https://wa.me/" + leadDetalleActual.phone, "_blank");
}
function cerrarModalLead() {
  document.getElementById("modalLead").style.display = "none";
  desbloquearScroll();
  leadDetalleActual = null;
}

// ==============================
// LEADS — EXPORTAR / IMPORTAR
// ==============================
async function shareFile1Tap({ filename, blob, title = "HondaGo", text = "" }) {
  try {
    if (!navigator.share) return false;
    await navigator.share({ title, text, files: [new File([blob], filename, { type: blob.type || "application/octet-stream" })] });
    return true;
  } catch {
    return false;
  }
}

function exportLeadsCSV() {
  const leads = getLeads();
  if (!leads.length) {
    mostrarToast("No hay leads", "info");
    return;
  }
  const headers = ["Fecha", "Nombre", "Teléfono", "Modelo", "Versión", "Precio", "Estado", "Última nota"];
  const rows = leads.map((l) => [
    l.dateISO || "",
    l.name || "",
    l.phoneRaw || "",
    l.model || "",
    l.version || "",
    l.price || "",
    l.status || "nuevo",
    l.notas && l.notas.length ? l.notas[l.notas.length - 1].texto : "",
  ]);
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const filename = "leads-hondago-" + new Date().toISOString().slice(0, 10) + ".csv";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  shareFile1Tap({ filename, blob, title: "HondaGo Leads CSV" }).then((shared) => {
    if (shared) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function exportLeadsJSON() {
  const payload = { meta: { app: "HondaGo", schema: 2, exportedAt: new Date().toISOString() }, leads: getLeads() };
  const filename = "leads-hondago-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  shareFile1Tap({ filename, blob, title: "HondaGo Backup Leads" }).then((shared) => {
    if (shared) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function openRestoreLeadsDialog() {
  const i = document.getElementById("lead-restore-file");
  if (i) {
    i.value = "";
    i.click();
  }
}

function clearLeads() {
  if (!confirm("¿Borrar TODOS los leads? Esta acción no se puede deshacer.")) return;
  localStorage.removeItem(LEADS_KEY);
  leadPage = 1;
  renderLeadsList();
  updateLeadCounter();
  mostrarToast("Leads borrados", "info");
}

async function restoreLeadsFromFile(file) {
  try {
    const data = JSON.parse(await file.text());
    let incoming = Array.isArray(data) ? data : Array.isArray(data.leads) ? data.leads : null;
    if (!incoming) {
      mostrarToast("Formato no válido", "error");
      return;
    }
    const replaceAll = confirm("¿Reemplazar todos los leads actuales?\nAceptar = Reemplazar\nCancelar = Fusionar");
    const current = getLeads();
    const keyFor = (l) => "tel:" + (l.phoneRaw || "") + "|model:" + (l.model || "") + "|date:" + (l.dateISO || "").slice(0, 10);
    const cleaned = incoming.map((l) => ({ ...l, id: l.id || generateLeadId(), notas: l.notas || [], status: l.status || "nuevo" }));
    let result = [];
    if (replaceAll) {
      result = cleaned;
    } else {
      const byId = new Set(current.map((l) => l.id).filter(Boolean));
      const keyset = new Set(current.map(keyFor));
      result = current.slice();
      for (const l of cleaned) {
        if (byId.has(l.id) || keyset.has(keyFor(l))) continue;
        byId.add(l.id);
        keyset.add(keyFor(l));
        result.push(l);
      }
    }
    setLeads(result);
    updateLeadCounter();
    renderLeadsList();
    mostrarToast(replaceAll ? "Leads restaurados ✅" : "Leads fusionados ✅", "success");
  } catch (err) {
    console.error(err);
    mostrarToast("No se pudo restaurar el archivo", "error");
  }
}

// ==============================
// UTILIDADES
// ==============================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m]);
}
function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

// ==============================
// SCROLL LOCK
// ==============================
let lastScrollY = 0;
function bloquearScroll() {
  lastScrollY = window.scrollY || window.pageYOffset;
  document.body.style.top = "-" + lastScrollY + "px";
  document.body.classList.add("modal-open");
}
function desbloquearScroll() {
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0, lastScrollY);
}

// ==============================
// MODO OSCURO
// ==============================
function aplicarModoOscuroDesdeStorage() {
  const dark = localStorage.getItem("modoOscuro") === "true";
  document.body.classList.toggle("dark-mode", dark);
  const icon = document.getElementById("icon-darkmode");
  if (icon) icon.textContent = dark ? "light_mode" : "dark_mode";
}

// ==============================
// TOAST
// ==============================
function mostrarToast(mensaje, tipo = "success") {
  const icon = { success: "✅", error: "❌", info: "ℹ️" }[tipo] || "ℹ️";
  const toast = document.createElement("div");
  toast.className = "toast-ux " + tipo;
  toast.innerHTML = "<span>" + icon + "</span> <span>" + mensaje + "</span>";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 700);
  }, 2800);
}

// ==============================
// CALENDARIO DE GUARDIAS
// ==============================
let calendar;
let fechaSeleccionada = null;

document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendario-guardias");
  if (!calendarEl) return;
  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "es",
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth" },
    events: [],
    eventContent: (arg) => ({ html: arg.event.title }),
    dateClick: (info) => abrirModalGuardia(info.dateStr),
    eventClick: (info) => {
      const ev = info.event;
      fechaSeleccionada = ev.startStr.split("T")[0];
      abrirModalGuardia(fechaSeleccionada, true, ev);
    },
  });
  cargarGuardiasDesdeFirestore();
  const datalist = document.getElementById("colaboradores");
  if (datalist) datalist.innerHTML = '<option value="Israel">';
});

function cargarGuardiasDesdeFirestore() {
  db.collection("guardias").onSnapshot((snap) => {
    if (!calendar) return;
    calendar.getEvents().forEach((e) => e.remove());
    snap.forEach((doc) => {
      const d = doc.data();
      if (!d.tipo) return;
      let title = "",
        color = d.color || "#007bff";
      if (d.tipo === "guardia") {
        const isAM = d.title && d.title.includes("AM");
        color = isAM ? "#FFA500" : "#007bff";
        title = (isAM ? "☀️" : "🌙") + ' <span class="badge-colaborador">' + extraerNombre(d.title || "") + "</span>";
      }
      if (d.tipo === "recordatorio") {
        title = '🛎️ <span class="badge-colaborador">' + (d.titulo || "") + "</span>";
        color = "#4CAF50";
      }
      calendar.addEvent({ id: doc.id, title, start: d.start, end: d.end, color, display: "auto" });
    });
  });
}

function abrirModalGuardia(fechaStr, modoEdicion = false, eventoData = null) {
  fechaSeleccionada = fechaStr;
  document.getElementById("modalGuardia").style.display = "flex";
  bloquearScroll();
  if (modoEdicion && eventoData) {
    document.getElementById("idGuardia").value = eventoData.id;
    document.getElementById("nombreGuardia").value = extraerNombre(eventoData.title);
    document.getElementById("turnoGuardia").value = eventoData.title.includes("AM") ? "am" : "pm";
    document.getElementById("tituloModalGuardia").textContent = "Editar Guardia";
    document.getElementById("iconModal").innerHTML = eventoData.title.includes("AM") ? "☀️" : "🌙";
    document.getElementById("btnEliminarGuardia").style.display = "block";
  } else {
    document.getElementById("idGuardia").value = "";
    document.getElementById("nombreGuardia").value = "Israel";
    document.getElementById("turnoGuardia").value = "am";
    document.getElementById("tituloModalGuardia").textContent = "Nueva Guardia";
    document.getElementById("iconModal").innerHTML = "👤";
    document.getElementById("btnEliminarGuardia").style.display = "none";
  }
  requestAnimationFrame(() => document.getElementById("nombreGuardia")?.focus());
}

function cerrarModalGuardia() {
  document.getElementById("modalGuardia").style.display = "none";
  desbloquearScroll();
}

function extraerNombre(titulo) {
  if (titulo.includes("<span")) {
    const m = titulo.match(/<span[^>]*>(.*?)<\/span>/);
    return m ? m[1] : "";
  }
  return titulo.replace("Guardia ", "").replace(" AM", "").replace(" PM", "");
}

// ==============================
// ROL MENSUAL
// ==============================
let rolGrid = {};

function abrirModalRolMes() {
  const hoy = new Date();
  const selMes = document.getElementById("rol-mes");
  const selAnio = document.getElementById("rol-anio");
  if (!selMes || !selAnio) return;
  selMes.value = hoy.getMonth();
  selAnio.innerHTML = "";
  [hoy.getFullYear(), hoy.getFullYear() + 1].forEach((y) => {
    const op = document.createElement("option");
    op.value = y;
    op.textContent = y;
    selAnio.appendChild(op);
  });
  selAnio.value = hoy.getFullYear();
  rolGrid = {};
  renderRolGrid();
  document.getElementById("modalRolMes").style.display = "flex";
  bloquearScroll();
  selMes.onchange = renderRolGrid;
  selAnio.onchange = renderRolGrid;
}

function cerrarModalRolMes() {
  const m = document.getElementById("modalRolMes");
  if (m) m.style.display = "none";
  desbloquearScroll();
  rolGrid = {};
}

function renderRolGrid() {
  const mes = parseInt(document.getElementById("rol-mes").value, 10);
  const anio = parseInt(document.getElementById("rol-anio").value, 10);
  const dias = new Date(anio, mes + 1, 0).getDate();
  const grid = document.getElementById("rol-grid");
  const diasSemana = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
  let html = '<div class="rol-grid-header">' + diasSemana.map((d) => "<span>" + d + "</span>").join("") + "</div>";
  const offsetLun = (new Date(anio, mes, 1).getDay() + 6) % 7;
  html += '<div class="rol-grid-days">';
  for (let i = 0; i < offsetLun; i++) html += '<div class="rol-day rol-day-empty"></div>';
  for (let d = 1; d <= dias; d++) {
    const fecha = anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    const estado = rolGrid[fecha] || "";
    const clase = estado === "am" ? "rol-day-am" : estado === "pm" ? "rol-day-pm" : "";
    const label = estado === "am" ? "☀️" : estado === "pm" ? "🌙" : "";
    html +=
      '<div class="rol-day ' +
      clase +
      '" data-fecha="' +
      fecha +
      '" onclick="toggleRolDia(\'' +
      fecha +
      "')\">" +
      '<span class="rol-day-num">' +
      d +
      '</span><span class="rol-day-turno">' +
      label +
      "</span></div>";
  }
  html += "</div>";
  grid.innerHTML = html;
}

function toggleRolDia(fecha) {
  const actual = rolGrid[fecha] || "";
  rolGrid[fecha] = actual === "" ? "am" : actual === "am" ? "pm" : "";
  const celda = document.querySelector('.rol-day[data-fecha="' + fecha + '"]');
  if (!celda) return;
  const estado = rolGrid[fecha];
  celda.className = "rol-day" + (estado === "am" ? " rol-day-am" : estado === "pm" ? " rol-day-pm" : "");
  celda.querySelector(".rol-day-turno").textContent = estado === "am" ? "☀️" : estado === "pm" ? "🌙" : "";
}

function limpiarRolGrid() {
  rolGrid = {};
  renderRolGrid();
}

function guardarRolMes() {
  const dias = Object.entries(rolGrid).filter(([, v]) => v === "am" || v === "pm");
  if (!dias.length) {
    mostrarToast("Selecciona al menos un día con turno", "info");
    return;
  }
  const nota = document.getElementById("rol-nota-guardando");
  const btn = document.getElementById("btn-rol-guardar");
  if (nota) nota.style.display = "block";
  if (btn) btn.disabled = true;
  setTimeout(() => _ejecutarGuardadoRol(dias, nota, btn), 0);
}

async function _ejecutarGuardadoRol(dias, nota, btn) {
  let ok = 0,
    err = 0;
  for (let i = 0; i < dias.length; i += 10) {
    await Promise.all(
      dias.slice(i, i + 10).map(async ([fecha, turno]) => {
        try {
          await db.collection("guardias").add({
            tipo: "guardia",
            turno,
            title: "Guardia ISRAEL " + turno.toUpperCase(),
            nombre: "Israel",
            start: fecha + "T" + (turno === "am" ? "08:00:00" : "14:00:00"),
            end: fecha + "T" + (turno === "am" ? "14:00:00" : "20:00:00"),
            color: turno === "am" ? "#FFA500" : "#007bff",
          });
          ok++;
        } catch (_) {
          err++;
        }
      }),
    );
  }
  if (nota) nota.style.display = "none";
  if (btn) btn.disabled = false;
  if (err === 0) {
    mostrarToast("✅ " + ok + " guardias guardadas", "success");
    cerrarModalRolMes();
  } else mostrarToast("⚠️ " + ok + " guardadas, " + err + " fallaron", "error");
}

// ==============================
// DOMContentLoaded — todos los listeners
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // Dark mode
  aplicarModoOscuroDesdeStorage();
  const toggleBtn = document.getElementById("toggle-darkmode");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const now = !document.body.classList.contains("dark-mode");
      document.body.classList.toggle("dark-mode", now);
      localStorage.setItem("modoOscuro", now);
      const icon = document.getElementById("icon-darkmode");
      if (icon) icon.textContent = now ? "light_mode" : "dark_mode";
    });
  }

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarModalGuardia();
      cerrarModalLead();
      cerrarModalEditarNota();
      cerrarModalRolMes();
    }
  });

  // Cerrar modales
  document.getElementById("btnCerrarModal")?.addEventListener("click", cerrarModalGuardia);
  document.getElementById("btnCancelar")?.addEventListener("click", cerrarModalGuardia);
  document.getElementById("modalGuardia")?.addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) cerrarModalGuardia();
  });

  document.getElementById("btnCerrarModalLead")?.addEventListener("click", cerrarModalLead);
  document.getElementById("modalLead")?.addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) cerrarModalLead();
  });

  document.getElementById("btnCerrarEditarNota")?.addEventListener("click", cerrarModalEditarNota);
  document.getElementById("modalEditarNota")?.addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) cerrarModalEditarNota();
  });

  document.getElementById("btnCerrarRolMes")?.addEventListener("click", cerrarModalRolMes);
  document.getElementById("modalRolMes")?.addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) cerrarModalRolMes();
  });

  // Guardar guardia — cierra modal ANTES de escribir a Firestore
  document.getElementById("guardarGuardia")?.addEventListener("click", () => {
    const tipo = document.getElementById("tipoEvento").value;
    const id = document.getElementById("idGuardia").value;
    let data = {};
    if (tipo === "guardia") {
      const nombre = document.getElementById("nombreGuardia").value.trim();
      const turno = document.getElementById("turnoGuardia").value;
      if (!nombre) {
        mostrarToast("Ingresa un nombre", "error");
        return;
      }
      data = {
        tipo,
        turno,
        title: "Guardia " + nombre.toUpperCase() + " " + turno.toUpperCase(),
        nombre,
        start: fechaSeleccionada + "T" + (turno === "am" ? "08:00:00" : "14:00:00"),
        end: fechaSeleccionada + "T" + (turno === "am" ? "14:00:00" : "20:00:00"),
        color: turno === "am" ? "#FFA500" : "#007bff",
      };
    }
    if (tipo === "recordatorio") {
      const titulo = document.getElementById("tituloRecordatorio").value.trim();
      const nota = document.getElementById("notaRecordatorio").value.trim();
      const hora = document.getElementById("horaRecordatorio").value;
      if (!titulo) {
        mostrarToast("Ingresa un título", "error");
        return;
      }
      if (!hora) {
        mostrarToast("Selecciona la hora", "error");
        return;
      }
      data = {
        tipo,
        title: "🛎️ " + titulo,
        titulo,
        nota,
        start: fechaSeleccionada + "T" + hora,
        end: fechaSeleccionada + "T" + hora,
        color: "#4CAF50",
      };
    }
    cerrarModalGuardia();
    const ref = id ? db.collection("guardias").doc(id).update(data) : db.collection("guardias").add(data);
    ref
      .then(() => mostrarToast(id ? "Evento actualizado ✅" : "Guardia registrada ✅", "success"))
      .catch(() => mostrarToast("Error al guardar", "error"));
  });

  // Eliminar guardia
  document.getElementById("btnEliminarGuardia")?.addEventListener("click", () => {
    const id = document.getElementById("idGuardia").value;
    if (!id) return;
    if (!confirm("¿Eliminar esta guardia?")) return;
    cerrarModalGuardia();
    db.collection("guardias")
      .doc(id)
      .delete()
      .then(() => mostrarToast("Guardia eliminada ✅", "success"))
      .catch(() => mostrarToast("Error al eliminar", "error"));
  });

  // Tipo evento
  document.getElementById("tipoEvento")?.addEventListener("change", function () {
    const isGuardia = this.value === "guardia";
    document.getElementById("seccionGuardia").style.display = isGuardia ? "block" : "none";
    document.getElementById("seccionRecordatorio").style.display = isGuardia ? "none" : "block";
    document.getElementById("iconModal").textContent = isGuardia ? "👤" : "🛎️";
    document.getElementById("tituloModalGuardia").textContent = isGuardia ? "Nueva Guardia" : "Nuevo Recordatorio";
  });

  // Restaurar leads desde archivo
  const inputRestore = document.getElementById("lead-restore-file");
  if (inputRestore && !inputRestore._bound) {
    inputRestore._bound = true;
    inputRestore.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) await restoreLeadsFromFile(file);
    });
  }

  cambiarTab("vehiculos");
  updateLeadCounter();
});

// ==============================
// PWA — SERVICE WORKER
// ==============================
function mostrarBotonActualizacion() {
  const cont = document.getElementById("actualizacion-info");
  const lista = document.getElementById("lista-cambios");
  const btn = document.getElementById("btn-actualizar");
  const btnMas = document.getElementById("btn-mas-actualizar");
  if (cont && lista && btn && btnMas) {
    lista.innerHTML =
      "<li>🚗 Catálogo de vehículos 2026</li>" +
      "<li>💼 Módulo Leads con CRM</li>" +
      "<li>📄 Financiamiento con links Drive</li>" +
      "<li>📅 Carga rápida de guardias</li>";
    cont.style.display = "block";
    btn.style.display = "inline-block";
    btnMas.style.display = "block";
  }
}

function actualizarApp() {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) reg.waiting.postMessage({ action: "skipWaiting" });
  });
  setTimeout(() => location.reload(), 800);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-actualizar");
  if (btn) btn.onclick = actualizarApp;
});

const ASSET_VER_KEY = "hondago_asset_ver";
function getAssetVer() {
  return localStorage.getItem(ASSET_VER_KEY) || "1";
}
function bumpAssetVer() {
  localStorage.setItem(ASSET_VER_KEY, String((parseInt(getAssetVer(), 10) || 1) + 1));
}

(function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register(new URL("service-worker.js", location.href).href)
    .then((reg) => {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) mostrarBotonActualizacion();
        });
      });
    })
    .catch((err) => console.warn("SW register error:", err));
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    bumpAssetVer();
    refreshing = true;
    location.reload();
  });
})();
