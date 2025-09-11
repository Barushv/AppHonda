// ==============================
// CONFIGURACIÓN FIREBASE
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyC3WZseiyASn9_8JmtSX-7UY0V__MmOGQI",
  authDomain: "hosndaguardias-7c69b.firebaseapp.com",
  projectId: "hondaguardias-7c69b",
  storageBucket: "hondaguardias-7c69b.appspot.com",
  messagingSenderId: "333873832947",
  appId: "1:333873832947:web:18b0b6728ffb541ecf6886",
};
// Inicializa Firebase si no existe
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==============================
// DATOS DE VEHÍCULOS Y PRECIOS
// ==============================
const hondaData = {
  CITY: ["Sport", "Prime", "Touring"],
  CIVIC: ["i-Style", "Sport HEV", "Touring"],
  ACCORD: ["Prime", "Touring"],
  BRV: ["Uniq", "Touring"],
  HRV: ["Uniq", "Sport", "Touring"],
  CRV: ["Turbo", "Turbo Plus", "Touring", "Touring Hev"],
  PILOT: ["Touring", "Black Edition"],
  ODYSSEY: ["Touring", "Black Edition"],
};
let precios = {};
let modeloSeleccionado = "";
let versionSeleccionada = "";
let precioSeleccionado = "";
let imagenSeleccionada = "";

// ==============================
// CARGA INICIAL DE MODELOS Y PRECIOS
// ==============================
window.onload = async () => {
  // Cargar modelos al selector
  const selectModelo = document.getElementById("modelo");
  Object.keys(hondaData).forEach((modelo) => {
    const option = document.createElement("option");
    option.value = modelo;
    option.textContent = modelo;
    selectModelo.appendChild(option);
  });

  // Cargar precios desde JSON externo
  try {
    const response = await fetch("json/precios.json");
    precios = await response.json();
  } catch (error) {
    console.error("Error cargando precios:", error);
  }
};

// ==============================
// CAMBIO DE VERSIÓN/MODELO
// ==============================
function cargarVersiones() {
  const modelo = document.getElementById("modelo").value;
  const selectVersion = document.getElementById("version");

  // Limpia y deja placeholder
  selectVersion.innerHTML = '<option value="">--Selecciona versión--</option>';
  if (!modelo) return;

  // 1) Origen de versiones: a partir de las claves del JSON de precios (si existe),
  //    y si no, del arreglo hondaData[modelo] como respaldo.
  let versiones = [];
  if (precios && precios[modelo]) {
    versiones = Object.keys(precios[modelo]);
  } else {
    versiones = hondaData[modelo] || [];
  }

  // 2) Separamos por año: 2026 vs (todo lo demás = 2025/previo).
  const is2026 = (v) => /\b2026\b/.test(v);
  const v2026 = versiones
    .filter(is2026)
    .sort((a, b) => a.localeCompare(b, "es"));
  const v2025 = versiones
    .filter((v) => !is2026(v))
    .sort((a, b) => a.localeCompare(b, "es"));

  // Utilidad: agrega un <optgroup> con opciones
  const addGroup = (label, arr, year) => {
    if (!arr.length) return;
    const og = document.createElement("optgroup");
    og.label = label;
    arr.forEach((val) => {
      const op = document.createElement("option");
      op.value = val; // Importante: value conserva el nombre con año (p.ej. "Turbo Plus 2026")
      // Texto visible sin el año al final (ej. "Turbo Plus")
      const display = val.replace(/\s20\d{2}\b/g, "");
      op.textContent = display;
      og.appendChild(op);
    });
    selectVersion.appendChild(og);
  };

  // 3) Pintamos grupos: primero 2026 y luego 2025
  addGroup("Versiones 2026", v2026, 2026);
  addGroup("Versiones 2025", v2025, 2025);

  // 4) Imagen y verificación como tenías
  actualizarImagen(modelo);
  verificarCargado();
}

function actualizarImagen(modelo) {
  const imagen = document.getElementById("imagen");
  const newSrc = `img/${modelo.toLowerCase()}.png`;

  imagen.onload = () => {
    imagenSeleccionada = imagen.src;
    verificarCargado();
  };

  imagen.src = newSrc;
  imagen.alt = modelo;
}

function actualizarPrecio() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const info = document.getElementById("info-modelo");

  if (modelo && version) {
    const precio = precios[modelo]?.[version] || "Precio no disponible";
    info.textContent = `Precio: ${precio}`;
    modeloSeleccionado = modelo;
    versionSeleccionada = version;
    precioSeleccionado = precio;
  } else {
    info.textContent = "";
  }

  verificarCargado();
}

function verificarCargado() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const imagen = document.getElementById("imagen");
  const boton = document.getElementById("btn-generar");
  const todoListo =
    modelo && version && imagen.complete && imagen.naturalHeight !== 0;
  boton.disabled = !todoListo;
}

// ==============================
// GENERAR PDF DE FICHA
// ==============================
function generarPDF() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const imagen = document.getElementById("imagen");
  const boton = document.getElementById("btn-generar");
  const precio = precios[modelo]?.[version] || "Precio no disponible";

  if (!modelo || !version) {
    alert("Por favor selecciona un modelo y una versión.");
    return;
  }

  // Desactiva el botón mientras genera el PDF
  boton.disabled = true;

  const exportar = () => {
    document.getElementById("selector-menu").style.display = "none";
    document.querySelector(".tab-bar").style.display = "none";
    document.getElementById("qr-contacto").style.display = "block";

    const container = document.createElement("div");
    container.style.backgroundColor = "#fff";
    container.style.padding = "20px";
    container.style.textAlign = "center";
    container.style.maxWidth = "550px";
    container.style.margin = "0 auto";

    const logo = document.getElementById("logo-vehiculo").cloneNode(true);
    logo.style.maxWidth = "150px";
    logo.style.margin = "0 auto 20px";
    container.appendChild(logo);

    const infoBlock = document.createElement("div");
    infoBlock.innerHTML = `
      <h2 style="margin: 10px 0;">${modelo}</h2>
      <p><strong>Versión:</strong> ${version}</p>
      <p><strong>Precio:</strong> ${precio}</p>
    `;
    container.appendChild(infoBlock);

    const imagenClone = new Image();
    imagenClone.src = imagen.src;
    imagenClone.alt = imagen.alt;
    imagenClone.onload = () => {
      imagenClone.style.maxWidth = "90%";
      imagenClone.style.height = "auto";
      imagenClone.style.display = "block";
      imagenClone.style.margin = "20px auto 0";

      container.appendChild(imagenClone);

      html2pdf()
        .set({
          margin: 10,
          filename: `${modelo}_${version}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {},
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save()
        .then(() => {
          document.getElementById("selector-menu").style.display = "block";
          document.querySelector(".tab-bar").style.display = "flex";
          document.getElementById("qr-contacto").style.display = "none";
          verificarCargado();
        });
    };
  };

  // Esperar a que la imagen original cargue antes de clonar
  if (!imagen.complete || imagen.naturalHeight === 0) {
    imagen.onload = () => exportar();
  } else {
    exportar();
  }
}

// =====================================
// Helper: normaliza el número para wa.me
// =====================================
function buildWaNumber(phoneRaw, codPaisRaw) {
  // Limpia: deja dígitos y + para detección
  let p = (phoneRaw || "").trim().replace(/[^\d+]/g, "");

  // Caso 1: usuario ya puso formato internacional "+.."
  if (p.startsWith("+")) {
    return p.slice(1).replace(/\D/g, ""); // wa.me no acepta el '+'
  }

  // Caso 2: usuario puso "00.."
  if (p.startsWith("00")) {
    return p.slice(2).replace(/\D/g, "");
  }

  // Caso 3: solo dígitos
  let digits = p.replace(/\D/g, "");

  // Si trae más de 10, asumimos que ya incluye código país
  if (digits.length > 10) return digits;

  // Si son 10 dígitos, asumimos número local y anteponemos código país
  let cc = (codPaisRaw || "+52").replace(/[^\d]/g, "") || "52";
  return cc + digits;
}

// =====================================
// Helper: abre WhatsApp con fallback anti-popup
// =====================================
function openWhatsApp(numeroWa, mensaje, delayMs = 0) {
  const url = `https://wa.me/${numeroWa}?text=${mensaje}`;
  const openFn = () => {
    const win = window.open(url, "_blank");
    if (!win) window.location.href = url; // fallback si bloquean popups
  };
  if (delayMs > 0) setTimeout(openFn, delayMs);
  else openFn();
}
// ==============================
// LEADS (localStorage) + búsqueda + tamaño página + paginación + selección/borrado
// ==============================
const LEADS_KEY = "hondago_leads_v1";

// --- Generar ID para cada lead nuevo ---
function generateLeadId() {
  try {
    return crypto.randomUUID();
  } catch {
    return (
      "ld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    );
  }
}

// --- Base de almacenamiento ---
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
  if (!lead.id) lead.id = generateLeadId(); // asegura id en nuevos leads
  const leads = getLeads();
  leads.push(lead);
  setLeads(leads);
  updateLeadCounter();
  // Si quieres ver el nuevo lead arriba cuando estás en la vista de Leads:
  // leadPage = 1; renderLeadsList();
}
function updateLeadCounter() {
  const el = document.getElementById("lead-count");
  if (el) el.textContent = getLeads().length;
}

// ==============================
// Backup (Export) y Restore (Import) de Leads en JSON
// ==============================

// Exporta TODOS los leads a un archivo .json (respaldo fiel, sin pérdida)
function exportLeadsJSON() {
  const payload = {
    meta: {
      app: "HondaGo",
      schema: 1,
      exportedAt: new Date().toISOString(),
    },
    leads: getLeads(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-hondago-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Abre el selector de archivo (input oculto)
function openRestoreLeadsDialog() {
  const input = document.getElementById("lead-restore-file");
  if (input) {
    input.value = ""; // limpia selección previa
    input.click();
  }
}

// Al cargar, conectamos el input-file para restaurar
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("lead-restore-file");
  if (input && !input._restoreBound) {
    input._restoreBound = true;
    input.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await restoreLeadsFromFile(file);
    });
  }
});

// Helper: normaliza teléfono para dedupe (si no existiera ya en tu código)
if (typeof normalizePhoneRaw !== "function") {
  function normalizePhoneRaw(raw) {
    return String(raw || "").replace(/[^\d+]/g, "");
  }
}

// Restaura leads desde archivo .json
// - Si aceptas en el confirm: REEMPLAZA todo por el backup (sin duplicados internos)
// - Si cancelas en el confirm: FUSIONA con lo actual (sin duplicados)
async function restoreLeadsFromFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Soporta {leads:[...]} o directamente [...]
    let incoming = Array.isArray(data)
      ? data
      : Array.isArray(data.leads)
      ? data.leads
      : null;
    if (!incoming) {
      alert("El archivo no tiene el formato esperado.");
      return;
    }

    const replaceAll = confirm(
      "¿Reemplazar TODOS los leads actuales por el respaldo?\n\nAceptar = Reemplazar todo\nCancelar = Fusionar sin duplicados"
    );

    const current = getLeads();

    // Dedupe keys
    const keyFor = (l) => {
      const phone = normalizePhoneRaw(l.phoneRaw || "");
      const day = (l.dateISO || "").slice(0, 10); // YYYY-MM-DD
      return `tel:${phone}|day:${day}|model:${l.model || ""}|version:${
        l.version || ""
      }|price:${l.price || ""}`;
    };

    // Limpia/asegura campos y IDs en los importados
    const cleaned = incoming.map((l) => {
      const c = { ...l };
      if (!c.id) {
        c.id =
          typeof generateLeadId === "function"
            ? generateLeadId()
            : "ld_" +
              Date.now().toString(36) +
              Math.random().toString(36).slice(2, 8);
      }
      if (!c.dateISO) c.dateISO = new Date().toISOString();
      c.name = String(c.name || "");
      c.phoneRaw = String(c.phoneRaw || "");
      c.countryCode = String(c.countryCode || "");
      c.phone = String(c.phone || ""); // wa.me (opcional)
      c.model = String(c.model || "");
      c.version = String(c.version || "");
      c.price = String(c.price || "");
      return c;
    });

    let result = [];

    if (replaceAll) {
      // Reemplaza todo, evitando duplicados dentro del mismo backup
      const seenIds = new Set();
      const seenKeys = new Set();
      for (const l of cleaned) {
        if (seenIds.has(l.id)) continue;
        const k = keyFor(l);
        if (seenKeys.has(k)) continue;
        seenIds.add(l.id);
        seenKeys.add(k);
        result.push(l);
      }
    } else {
      // Fusiona con lo actual (prioriza no duplicar)
      const byId = new Set(current.map((l) => l.id).filter(Boolean));
      const keyset = new Set(current.map(keyFor));
      result = current.slice();
      for (const l of cleaned) {
        if (byId.has(l.id)) continue;
        const k = keyFor(l);
        if (keyset.has(k)) continue;
        byId.add(l.id);
        keyset.add(k);
        result.push(l);
      }
    }

    setLeads(result);

    // Ajusta UI
    if (typeof updateLeadCounter === "function") updateLeadCounter();
    if (typeof renderLeadsList === "function") {
      if (typeof leadPage !== "undefined") {
        const size =
          typeof leadUI !== "undefined" && leadUI.pageSize
            ? leadUI.pageSize
            : 50;
        const pages = Math.max(1, Math.ceil(result.length / size));
        if (leadPage > pages) leadPage = pages;
      }
      renderLeadsList();
    }

    if (typeof mostrarToast === "function") {
      mostrarToast(
        replaceAll ? "Leads restaurados (reemplazo)" : "Leads fusionados",
        "success"
      );
    } else {
      alert(
        replaceAll
          ? "Leads restaurados (reemplazo)."
          : "Leads fusionados sin duplicados."
      );
    }
  } catch (err) {
    console.error(err);
    alert("No se pudo restaurar el archivo. Verifica que sea un JSON válido.");
  }
}

// --- Estado de UI ---
let leadPage = 1; // página actual
let leadUI = {
  search: "", // término de búsqueda (lowercase)
  pageSize: 50, // 25 / 50 / 100 (control en HTML)
};

// --- Setters de toolbar ---
function setLeadSearch(val) {
  leadUI.search = String(val || "")
    .trim()
    .toLowerCase();
  leadPage = 1;
  renderLeadsList();
}
function setLeadPageSize(val) {
  const n = parseInt(val, 10) || 50;
  leadUI.pageSize = Math.max(10, Math.min(n, 500));
  leadPage = 1;
  renderLeadsList();
}

// --- Helpers de paginación ---
function calcLeadPages(total) {
  const size = leadUI.pageSize || 50;
  return Math.max(1, Math.ceil(total / size));
}
function nextLeadPage() {
  const total = filterLeads(getLeads()).length;
  const pages = calcLeadPages(total);
  if (leadPage < pages) {
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

// --- Filtro por término (nombre/teléfono/modelo/versión/precio) ---
function filterLeads(leads) {
  const q = leadUI.search;
  if (!q) return leads;
  return leads.filter((l) => {
    const hay = [l.name, l.phoneRaw, l.model, l.version, l.price]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return hay.includes(q);
  });
}

// --- Render con filtro + paginación + checkboxes ---
function renderLeadsList() {
  const cont = document.getElementById("lead-list");
  if (!cont) return;

  // 1) Datos + filtro
  const all = getLeads();
  updateLeadCounter();
  const filtered = filterLeads(all);

  // 2) Orden (más recientes primero)
  const sorted = filtered
    .slice()
    .sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));

  // 3) Paginación
  const size = leadUI.pageSize || 50;
  const total = sorted.length;
  const pages = calcLeadPages(total);
  if (leadPage > pages) leadPage = pages;

  const start = (leadPage - 1) * size;
  const pageItems = sorted.slice(start, start + size);

  // 4) Pintar
  if (!pageItems.length) {
    cont.innerHTML = `<p style="text-align:center;color:#777;margin:12px 0">
      ${total ? "No hay resultados para tu búsqueda." : "Aún no hay leads."}
    </p>`;
  } else {
    const rows = pageItems
      .map(
        (l) => `
      <tr>
        <td><input type="checkbox" class="lead-check" data-id="${l.id}"></td>
        <td>${formatDateTime(l.dateISO)}</td>
        <td>${escapeHtml(l.name || "")}</td>
        <td>${escapeHtml(l.phoneRaw || "")}</td>
        <td>${escapeHtml(l.model || "")}</td>
        <td>${escapeHtml(l.version || "")}</td>
        <td>${escapeHtml(l.price || "")}</td>
      </tr>
    `
      )
      .join("");

    cont.innerHTML = `
      <div class="lead-table">
        <table>
          <thead>
            <tr>
              <th style="width:1%;white-space:nowrap;">
                <input type="checkbox" id="lead-check-all" onclick="toggleLeadSelectAll(this)">
              </th>
              <th>Fecha</th><th>Nombre</th><th>Teléfono</th>
              <th>Modelo</th><th>Versión</th><th>Precio</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // 5) Indicador de página
  const info = document.getElementById("lead-page-info");
  if (info) info.textContent = `Página ${total ? leadPage : 1} / ${pages}`;

  // 6) Estado inicial de la barra de selección
  updateLeadSelectionUI();
}

// --- Selección masiva (página visible) ---
function toggleLeadSelectAll(master) {
  document
    .querySelectorAll("#lead-list .lead-check")
    .forEach((ch) => (ch.checked = master.checked));
  updateLeadSelectionUI();
}

// --- Muestra/oculta barra de selección + contador ---
function updateLeadSelectionUI() {
  const checks = Array.from(
    document.querySelectorAll("#lead-list .lead-check")
  );
  const selected = checks.filter((c) => c.checked).length;

  const bar = document.getElementById("lead-selection");
  const count = document.getElementById("lead-selected-count");

  if (bar) bar.classList.toggle("show", selected > 0);
  if (count) count.textContent = selected;
}

// --- Borrar seleccionados (página visible) ---
function deleteSelectedLeads() {
  const checked = Array.from(
    document.querySelectorAll("#lead-list .lead-check:checked")
  );
  if (!checked.length) {
    alert("Selecciona al menos un lead.");
    return;
  }
  if (!confirm(`¿Eliminar ${checked.length} lead(s) seleccionado(s)?`)) return;

  const idsToDelete = new Set(checked.map((ch) => ch.getAttribute("data-id")));
  const leads = getLeads();
  const remaining = leads.filter((l) => !idsToDelete.has(l.id));
  setLeads(remaining);

  const pages = calcLeadPages(remaining.length);
  if (leadPage > pages) leadPage = pages;

  renderLeadsList();
  updateLeadCounter();
  updateLeadSelectionUI();
  alert("Lead(s) eliminado(s).");
}

// =====================================================
// Exportar CSV (teléfono clickeable) + Borrar todo
// =====================================================

function exportLeadsCSV() {
  const leads = getLeads();
  if (!leads.length) {
    alert("No hay leads.");
    return;
  }

  // Encabezados
  const headers = [
    "Fecha",
    "Nombre",
    "WhatsApp (link)", // Excel lo vuelve hipervínculo
    "Teléfono ingresado",
    "Código país",
    "Modelo",
    "Versión",
    "Precio",
  ];

  const rows = leads.map((l) => [
    l.dateISO || "",
    l.name || "",
    l.phone || "", // URL completa https://wa.me/...
    String(l.phoneRaw || ""), // texto plano
    l.countryCode || "",
    l.model || "",
    l.version || "",
    l.price || "",
  ]);

  // Escapado CSV + BOM UTF-8 para acentos
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const toCsv = (arr) =>
    arr.map((r) => r.map((v) => esc(v)).join(",")).join("\r\n");

  const csv = "\uFEFF" + toCsv([headers, ...rows]); // BOM UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-hondago-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearLeads() {
  if (!confirm("¿Borrar todos los leads guardados?")) return;
  localStorage.removeItem(LEADS_KEY);
  leadPage = 1;
  renderLeadsList();
  updateLeadCounter();
  alert("Leads borrados.");
}

// --- (Opcional) borrar todo ---
function clearLeads() {
  if (confirm("¿Borrar todos los leads guardados?")) {
    localStorage.removeItem(LEADS_KEY);
    leadPage = 1;
    renderLeadsList();
    alert("Leads borrados.");
  }
}

// --- Utilidades ---
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}
function formatDateTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

// --- Delegación de eventos para actualizar barra al marcar checks ---
document.addEventListener("DOMContentLoaded", () => {
  const leadList = document.getElementById("lead-list");
  if (leadList) {
    leadList.addEventListener("change", (e) => {
      if (e.target.classList && e.target.classList.contains("lead-check")) {
        updateLeadSelectionUI();
      }
      if (e.target.id === "lead-check-all") {
        updateLeadSelectionUI();
      }
    });
  }
});

// =====================================
// Enviar WhatsApp (con nombre opcional + guardar lead + abrir WA)
// =====================================
function enviarACliente() {
  const numeroInput = document.getElementById("telefono-cliente");
  const nombreInput = document.getElementById("nombre-cliente"); // opcional si lo agregaste
  const codPaisInput = document.getElementById("cod-pais"); // opcional

  const numeroRaw = (numeroInput?.value || "").trim();
  const nombre = (nombreInput?.value || "").trim();
  const codPais = (codPaisInput?.value || "").trim();

  if (!numeroRaw) {
    alert("Ingresa un número válido.");
    return;
  }
  if (!modeloSeleccionado || !versionSeleccionada || !precioSeleccionado) {
    alert("Faltan datos del vehículo seleccionado.");
    return;
  }

  const saludo = nombre
    ? `👋 Hola *${nombre}*, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*.`
    : `👋 Hola, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*.`;

  const texto = `${saludo}

🚗 Te comparto la ficha del vehículo:
🔹 Modelo: *${modeloSeleccionado}*
🔸 Versión: *${versionSeleccionada}*
💰 Precio: *${precioSeleccionado}*

📞 Si tienes alguna duda o deseas agendar una cita, estoy a tus órdenes para asesorarte.

✉️ Correo: fortiz.hondamontejo@gmail.com
📘 Facebook: fb.com/honda.israelortiz
📍 Ubicación: Honda Montejo, Mérida`;

  const mensaje = encodeURIComponent(texto);

  // Normaliza número para wa.me (SOLO dígitos, con código país)
  const numeroWa = buildWaNumber(numeroRaw, codPais);

  // Guarda el lead localmente
  saveLead({
    dateISO: new Date().toISOString(),
    name: nombre,
    phone: numeroWa, // listo para wa.me (solo dígitos)
    phoneRaw: numeroRaw, // como lo tecleó el usuario
    countryCode: (codPais || "").replace(/[^\d]/g, ""),
    model: modeloSeleccionado,
    version: versionSeleccionada,
    price: precioSeleccionado,
  });

  // Abre WhatsApp (pequeño delay para UX y evitar bloqueos de pop-up)
  openWhatsApp(numeroWa, mensaje, 200);
}

// ==============================
// CONTROL DE TABS PRINCIPALES
// ==============================
function cambiarTab(tabId) {
  if (tabId === "financiamiento") {
    applyPdfVersionParam();
  }
  // Oculta todas las secciones de tabs
  document
    .querySelectorAll(".tab-section")
    .forEach((sec) => sec.classList.remove("active"));
  // Desactiva todos los botones del menú inferior
  document
    .querySelectorAll(".tab-bar button")
    .forEach((btn) => btn.classList.remove("active"));
  // Muestra el tab seleccionado y resalta el botón activo
  document.getElementById(tabId).classList.add("active");
  document.getElementById(`tab-${tabId}`).classList.add("active");

  // Si es 'mas', oculta las subsecciones de 'Más'
  if (tabId === "mas") {
    document
      .querySelectorAll(".sub-mas")
      .forEach((sub) => (sub.style.display = "none"));
    document.getElementById("mas").scrollIntoView({ behavior: "smooth" });
  }
}

// Tab activo por defecto + contador de leads al cargar
document.addEventListener("DOMContentLoaded", () => {
  // Tab por defecto y contador de leads
  cambiarTab("vehiculos");
  updateLeadCounter();

  // ===== Lista fija de colaboradores (autocompletar en el modal) =====
  const colaboradores = ["Israel"];
  const datalist = document.getElementById("colaboradores");
  if (datalist) {
    datalist.innerHTML = colaboradores
      .map((n) => `<option value="${n}">`)
      .join("");
  }
});

// ==============================
// SUBSECCIONES EN "MÁS"
// ==============================
function mostrarSubseccionMas(subId) {
  // Oculta todas las subsecciones
  document
    .querySelectorAll(".sub-mas")
    .forEach((sub) => (sub.style.display = "none"));

  if (subId === "calendario") {
    document.getElementById("sub-mas-calendario").style.display = "block";
    if (typeof calendar !== "undefined") calendar.render(); // asegura render
  } else if (subId === "creditos") {
    document.getElementById("sub-mas-creditos").style.display = "block";
  } else if (subId === "actualizacion") {
    document.getElementById("sub-mas-actualizacion").style.display = "block";
  } else if (subId === "leads") {
    document.getElementById("sub-mas-leads").style.display = "block";

    // ⬇️ Sincroniza toolbar (tamaño de página y búsqueda) con el estado actual
    const sizeSel = document.getElementById("lead-size");
    const searchInp = document.getElementById("lead-search");
    if (sizeSel) sizeSel.value = String(leadUI.pageSize || 50);
    if (searchInp) searchInp.value = leadUI.search || "";

    // Renderiza la lista (aplica filtro + paginación con los valores sincronizados)
    renderLeadsList();
  }
}

// ==============================
// CALENDARIO DE GUARDIAS (FULLCALENDAR + FIRESTORE)
// ==============================
let calendar;

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendario-guardias");
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "es",
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [],

    eventContent: function (arg) {
      return { html: arg.event.title };
    },

    dateClick: function (info) {
      abrirModal(info.dateStr);
    },

    eventClick: function (info) {
      const evento = info.event;
      document.getElementById("idGuardia").value = evento.id;
      document.getElementById("nombreGuardia").value = extraerNombre(
        evento.title
      );
      document.getElementById("turnoGuardia").value = evento.title.includes(
        "AM"
      )
        ? "am"
        : "pm";
      fechaSeleccionada = evento.startStr.split("T")[0];
      abrirModal(fechaSeleccionada, true, evento);
    },
  });

  // No render aquí; se hace cuando abres la sub-sección calendario
  // calendar.render();
});

function cargarGuardiasDesdeFirestore() {
  db.collection("guardias").onSnapshot((snapshot) => {
    if (!calendar) return;

    calendar.getEvents().forEach((e) => e.remove());
    snapshot.forEach((doc) => {
      const data = doc.data();
      let titleVisual = "";
      let colorVisual = data.color || "#007bff";

      if (data.tipo === "guardia") {
        const nombreColaborador = extraerNombre(data.title);
        const isAM = data.title.includes("AM");
        const icono = isAM ? "☀️" : "🌙";
        colorVisual = data.color || (isAM ? "#FFA500" : "#007bff");
        titleVisual = `${icono} <span class="badge-colaborador">${nombreColaborador}</span>`;
      }

      if (data.tipo === "recordatorio") {
        titleVisual = `🛎️ <span class="badge-colaborador">${
          data.titulo || ""
        }</span>`;
        colorVisual = data.color || "#4CAF50";
      }

      calendar.addEvent({
        id: doc.id,
        title: titleVisual,
        start: data.start,
        end: data.end,
        color: colorVisual,
        display: "auto",
      });
    });
  });
}
cargarGuardiasDesdeFirestore();

// ==============================
// MODAL GUARDIAS (abrir/cerrar centrado, bloqueando scroll)
// ==============================
let fechaSeleccionada = null;
let lastScrollY = 0;

function abrirModal(fechaStr, modoEdicion = false, eventoData = null) {
  fechaSeleccionada = fechaStr;

  const modal = document.getElementById("modalGuardia");
  modal.style.display = "flex";
  modal.focus();

  // Bloquea scroll, guardando posición
  lastScrollY = window.scrollY || window.pageYOffset;
  document.body.style.top = `-${lastScrollY}px`;
  document.body.classList.add("modal-open");

  // Modo edición vs nuevo
  if (modoEdicion && eventoData) {
    document.getElementById("idGuardia").value = eventoData.id;
    document.getElementById("nombreGuardia").value = extraerNombre(
      eventoData.title
    );
    document.getElementById("turnoGuardia").value = eventoData.title.includes(
      "AM"
    )
      ? "am"
      : "pm";
    document.getElementById("tituloModalGuardia").textContent =
      "Editar Guardia";
    document.getElementById("iconModal").innerHTML = eventoData.title.includes(
      "AM"
    )
      ? "☀️"
      : "🌙";
    document.getElementById("btnEliminarGuardia").style.display = "block";
  } else {
    document.getElementById("idGuardia").value = "";
    document.getElementById("nombreGuardia").value = "";
    document.getElementById("turnoGuardia").value = "am";
    document.getElementById("tituloModalGuardia").textContent = "Nueva Guardia";
    document.getElementById("iconModal").innerHTML = "👤";
    document.getElementById("btnEliminarGuardia").style.display = "none";
  }

  // Focus al input nombre
  setTimeout(() => document.getElementById("nombreGuardia").focus(), 10);
}

function cerrarModal() {
  const modal = document.getElementById("modalGuardia");
  modal.style.display = "none";
  document.getElementById("nombreGuardia").value = "";
  document.getElementById("idGuardia").value = "";

  // Restaura scroll
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0, lastScrollY);
}

// Acciones de cierre
document.getElementById("btnCerrarModal").onclick = document.getElementById(
  "btnCancelar"
).onclick = cerrarModal;

// Cerrar con ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") cerrarModal();
});

// Cerrar al click fuera del modal
document
  .getElementById("modalGuardia")
  .addEventListener("mousedown", function (e) {
    if (e.target === this) cerrarModal();
  });

// Guardar/Actualizar evento
document.getElementById("guardarGuardia").addEventListener("click", () => {
  const tipo = document.getElementById("tipoEvento").value;
  const id = document.getElementById("idGuardia").value;
  let data = {};

  // GUARDIA
  if (tipo === "guardia") {
    const nombre = document.getElementById("nombreGuardia").value.trim();
    const turno = document.getElementById("turnoGuardia").value;
    if (!nombre) return alert("Ingresa un nombre");

    const horaInicio = turno === "am" ? "08:00:00" : "14:00:00";
    const horaFin = turno === "am" ? "14:00:00" : "20:00:00";
    const color = turno === "am" ? "#FFA500" : "#007bff";

    data = {
      tipo: "guardia",
      title: `Guardia ${nombre.toUpperCase()} ${turno.toUpperCase()}`,
      nombre: nombre,
      turno: turno,
      start: `${fechaSeleccionada}T${horaInicio}`,
      end: `${fechaSeleccionada}T${horaFin}`,
      color: color,
    };
  }

  // RECORDATORIO
  if (tipo === "recordatorio") {
    const titulo = document.getElementById("tituloRecordatorio").value.trim();
    const nota = document.getElementById("notaRecordatorio").value.trim();
    const hora = document.getElementById("horaRecordatorio").value;
    if (!titulo) return alert("Ingresa un título para el recordatorio");
    if (!hora) return alert("Selecciona la hora del recordatorio");

    data = {
      tipo: "recordatorio",
      title: `🛎️ ${titulo}`,
      titulo: titulo,
      nota: nota,
      start: `${fechaSeleccionada}T${hora}`,
      end: `${fechaSeleccionada}T${hora}`,
      color: "#4CAF50",
    };
  }

  // Guardar o actualizar en Firestore
  const ref = id
    ? db.collection("guardias").doc(id).update(data)
    : db.collection("guardias").add(data);

  ref
    .then(() => {
      mostrarToast(id ? "Evento actualizado" : "Evento registrado");
      cerrarModal();
    })
    .catch((err) => {
      console.error("Error al guardar:", err);
    });
});

// Eliminar evento
document.getElementById("btnEliminarGuardia").addEventListener("click", () => {
  const id = document.getElementById("idGuardia").value;
  if (!id) return;

  if (confirm("¿Deseas eliminar esta guardia?")) {
    db.collection("guardias")
      .doc(id)
      .delete()
      .then(() => {
        mostrarToast("Guardia eliminada");
        cerrarModal();
      })
      .catch((err) => {
        console.error("Error al eliminar:", err);
      });
  }
});

// Utilidad: extraer nombre del título visual
function extraerNombre(titulo) {
  // Si por accidente recibes HTML, saca solo el nombre
  if (titulo.includes("<span")) {
    const match = titulo.match(/<span[^>]*>(.*?)<\/span>/);
    return match ? match[1] : "";
  }
  // Si es texto plano, saca solo el nombre
  return titulo.replace("Guardia ", "").replace(" AM", "").replace(" PM", "");
}

// Control dinámico de secciones en el modal según el tipo de evento
const tipoEvento = document.getElementById("tipoEvento");
const seccionGuardia = document.getElementById("seccionGuardia");
const seccionRecordatorio = document.getElementById("seccionRecordatorio");
tipoEvento.addEventListener("change", function () {
  if (this.value === "guardia") {
    seccionGuardia.style.display = "block";
    seccionRecordatorio.style.display = "none";
    document.getElementById("iconModal").textContent = "👤";
    document.getElementById("tituloModalGuardia").textContent = "Nueva Guardia";
  } else if (this.value === "recordatorio") {
    seccionGuardia.style.display = "none";
    seccionRecordatorio.style.display = "block";
    document.getElementById("iconModal").textContent = "🛎️";
    document.getElementById("tituloModalGuardia").textContent =
      "Nuevo Recordatorio";
  }
});

// ==============================
// MODO OSCURO (LOCALSTORAGE)
// ==============================
function aplicarModoOscuroDesdeStorage() {
  const darkModeActivo = localStorage.getItem("modoOscuro") === "true";
  document.body.classList.toggle("dark-mode", darkModeActivo);
  const icon = document.getElementById("icon-darkmode");
  if (icon) icon.textContent = darkModeActivo ? "light_mode" : "dark_mode";
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarModoOscuroDesdeStorage();

  const toggleBtn = document.getElementById("toggle-darkmode");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const darkModeNow = !document.body.classList.contains("dark-mode");
      document.body.classList.toggle("dark-mode", darkModeNow);
      localStorage.setItem("modoOscuro", darkModeNow);
      const icon = document.getElementById("icon-darkmode");
      if (icon) icon.textContent = darkModeNow ? "light_mode" : "dark_mode";
    });
  }
});

// ==============================
// ACTUALIZACIÓN PWA Y BANNER DE CAMBIOS
// ==============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => {
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          newWorker.onstatechange = () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              mostrarBotonActualizacion();
            }
          };
        };
      });
  });

  // Recarga automática cuando el nuevo SW toma control
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

// Muestra el banner/botón de actualización
function mostrarBotonActualizacion() {
  const contenedor = document.getElementById("actualizacion-info");
  const listaCambios = document.getElementById("lista-cambios");
  const boton = document.getElementById("btn-actualizar");
  const btnMasActualizar = document.getElementById("btn-mas-actualizar");

  if (contenedor && listaCambios && boton && btnMasActualizar) {
    listaCambios.innerHTML = `
      <li>📄 Precios actualizados (precios.json)</li>
      <li>📑 Oferta comercial (oferta.pdf)</li>
      <li>🧾 Bonos y descuentos (descuentos.pdf)</li>
      <li>📅 Guardias del mes (guardias.pdf)</li>
    `;
    contenedor.style.display = "block";
    boton.style.display = "inline-block";
    btnMasActualizar.style.display = "block"; // botón visible en menú "Más"
  }
}

// Forzar actualizar SW
function actualizarApp() {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage("SKIP_WAITING");
    }
  });
  setTimeout(() => {
    window.location.reload();
  }, 800);
}
const btnActualizar = document.getElementById("btn-actualizar");
if (btnActualizar) btnActualizar.onclick = actualizarApp;

// ==============================
// TOAST NOTIFICACIONES
// ==============================
function mostrarToast(mensaje, tipo = "success") {
  // tipo: "success", "error", "info"
  let icon = "✅";
  if (tipo === "error") icon = "❌";
  if (tipo === "info") icon = "ℹ️";

  const toast = document.createElement("div");
  toast.className = `toast-ux ${tipo}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${mensaje}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 700);
  }, 2800);
}

// ⚠️ SOLO PARA PRUEBA. Úsalo una vez y luego bórralo/koméntalo.
/* function seedFakeLeads(n = 120) {
  const models = ["CIVIC", "HRV", "CRV", "CITY", "ACCORD"];
  const versions = ["Touring", "Sport", "Prime", "Turbo", "Uniq"];
  const leads = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - i * 3600e3).toISOString();
    leads.push({
      dateISO: d,
      name: `Cliente ${String(i + 1).padStart(3, "0")}`,
      phone: "529991234567",
      phoneRaw: "999 123 4567",
      countryCode: "52",
      model: models[i % models.length],
      version: versions[i % versions.length],
      price: `$${(500000 + i * 1000).toLocaleString()}`,
    });
  }
  localStorage.setItem("hondago_leads_v1", JSON.stringify(leads));
  // Reinicia a la página 1 y re-renderiza
  leadPage = 1;
  renderLeadsList();
  updateLeadCounter();
} */
//seedFakeLeads(); // <- descomenta, recarga, y vuelve a comentar

// Borra únicamente los leads sembrados por el seed (ejemplo: "Cliente 001" y tel fijo)
/* function purgeSeededLeads() {
  const leads = getLeads();
  const filtered = leads.filter((l) => {
    const isSeedName = String(l.name || "").startsWith("Cliente ");
    const isSeedPhone = String(l.phone || "") === "529991234567";
    return !(isSeedName && isSeedPhone);
  });
  setLeads(filtered);
  leadPage = 1;
  renderLeadsList();
  updateLeadCounter();
  alert("Leads de prueba eliminados. Los reales se conservaron.");
}
purgeSeededLeads(); // <- ejecuta una vez y luego comenta/borra */

// --------- Registro del Service Worker con auto-update ---------
(function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  // Ruta relativa para que funcione en GitHub Pages /repo/
  const swUrl = new URL("service-worker.js", location.href);

  navigator.serviceWorker
    .register(swUrl.href)
    .then((reg) => {
      // Fuerza a buscar una versión nueva cuando la pantalla vuelve a ser visible
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });

      // Si ya hay un SW esperando -> pídele activarse
      if (reg.waiting) {
        reg.waiting.postMessage({ action: "skipWaiting" });
      }

      // Detecta SW nuevo
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener("statechange", () => {
          if (
            newSW.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Nuevo SW instalado: actívalo y recarga cuando tome control
            newSW.postMessage({ action: "skipWaiting" });
          }
        });
      });

      // Cuando el SW toma control, recarga 1 vez
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
    })
    .catch((err) => {
      console.warn("SW registration failed:", err);
    });
})();

// ==============================
// PWA Update + PDF cache-busting
// ==============================
const ASSET_VER_KEY = "hondago_asset_ver";

function getAssetVer() {
  return localStorage.getItem(ASSET_VER_KEY) || "1";
}
function bumpAssetVer() {
  const n = parseInt(getAssetVer(), 10) || 1;
  localStorage.setItem(ASSET_VER_KEY, String(n + 1));
}

// Aplica ?v=<assetVer> a los iframes de PDFs (se llama al cargar y tras update)
function applyPdfVersionParam() {
  const v = getAssetVer();
  document
    .querySelectorAll(
      'iframe[src$="pdf/oferta.pdf"], iframe[src$="pdf/descuentos.pdf"]'
    )
    .forEach((ifr) => {
      const u = new URL(ifr.getAttribute("src"), location.href);
      u.searchParams.set("v", v);
      // Deja la ruta en relativo + query para que funcione igual en GitHub Pages
      ifr.src = `${u.pathname}${u.search}`;
    });
}

// Aplica el versionado de PDFs al cargar
document.addEventListener("DOMContentLoaded", applyPdfVersionParam);

// =========== Registro ÚNICO del Service Worker ===========
(function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  const swUrl = new URL("service-worker.js", location.href);
  navigator.serviceWorker
    .register(swUrl)
    .then((reg) => {
      // Cuando encuentra un SW nuevo, mostramos el botón "Actualizar"
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Ya hay uno activo: hay actualización lista
            if (typeof mostrarBotonActualizacion === "function") {
              mostrarBotonActualizacion();
            }
          }
        });
      });
    })
    .catch((err) => console.warn("SW register error:", err));

  // Cuando el nuevo SW toma control -> incrementa version de assets y recarga
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    bumpAssetVer(); // <- sube versión de assets para bustear los PDFs
    refreshing = true;
    location.reload();
  });
})();
