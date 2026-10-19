// ==============================
// PRECIOS — editor de año-modelo, versiones, precios y fichas (precios.html)
// ==============================
import { protegerPagina } from "./firebase.js";
import { $, $$, abrirHoja, cerrarHoja, toast, confirmar, escapeHtml, aplicarTema, drivePreview } from "./ui.js";
import { suscribirCatalogo, guardarModelo, catalogoFirestoreVacio, importarCatalogoBase, aniosDe, TIPOS } from "./catalogo.js";
import { esLinkValido } from "./financiamiento-data.js";
import { registrarSW } from "./pwa.js";

aplicarTema();
registrarSW();

const HINTS = {
  publicado: "Se muestra en la app para enviar a clientes.",
  borrador: "Solo lo ves aquí. Úsalo mientras capturas un año nuevo.",
  oculto: "No se muestra en la app (por ejemplo, cuando ya no hay inventario).",
};

let catalogo = [];
let vacio = false;
let original = null; // modelo tal como está guardado
let edit = null; // copia de trabajo
let anioSel = "";

const clonar = (o) => JSON.parse(JSON.stringify(o));
const hayCambios = () => !!edit && JSON.stringify(edit) !== JSON.stringify(original);
const digitos = (s) => Number(String(s).replace(/\D/g, "")) || 0;
const miles = (n) => (n ? Number(n).toLocaleString("es-MX") : "");

// ---------- Render ----------
function renderModelos() {
  $("#p-modelos").innerHTML = catalogo
    .map(
      (m) =>
        '<button class="modelo-chip' + (edit?.id === m.id ? " active" : "") + '" data-id="' + escapeHtml(m.id) + '">' +
        '<img src="' + escapeHtml(m.imagen) + '" alt="" loading="lazy"/><span>' + escapeHtml(m.nombre) + "</span>" +
        "<small>" + aniosDe(m).map((a) => a + (m.anios[a].estado === "publicado" ? "" : "*")).join(" · ") + "</small></button>",
    )
    .join("");
}

function renderEditor() {
  $("#p-editor").hidden = !edit;
  $("#save-bar").hidden = !hayCambios();
  if (!edit) return;
  $("#p-img").src = edit.imagen;
  $("#p-nombre").textContent = edit.nombre;

  const anios = aniosDe(edit);
  if (!anios.includes(anioSel)) anioSel = anios[0] || "";
  $("#p-anios").innerHTML =
    anios
      .map((a) => {
        const est = edit.anios[a].estado;
        return '<button data-anio="' + a + '" class="' + (a === anioSel ? "active" : "") + '">' + a + (est !== "publicado" ? ' <i class="tag tag-' + est + '">' + est + "</i>" : "") + "</button>";
      })
      .join("") + '<button class="nuevo" id="btn-nuevo-anio"><span class="ms">add</span> Nuevo año</button>';

  $("#p-anio-panel").hidden = !anioSel;
  $("#p-sin-anios").hidden = !!anioSel;
  if (!anioSel) return;

  const a = edit.anios[anioSel];
  $("#p-anio-titulo").textContent = edit.nombre + " " + anioSel;
  $$("#p-estado button").forEach((b) => b.classList.toggle("active", b.dataset.estado === a.estado));
  $("#p-estado-hint").textContent = HINTS[a.estado];

  $("#p-versiones").innerHTML = a.versiones.length
    ? a.versiones
        .map(
          (v, i) =>
            '<div class="ver-row" data-i="' + i + '">' +
            '<input class="v-nombre" value="' + escapeHtml(v.nombre) + '" placeholder="Nombre de la versión (ej. Sport)" aria-label="Versión" />' +
            '<select class="v-tipo">' + Object.entries(TIPOS).map(([k, l]) => '<option value="' + k + '"' + (v.tipo === k ? " selected" : "") + ">" + l + "</option>").join("") + "</select>" +
            '<div class="v-precio-wrap"><span>$</span><input class="v-precio" inputmode="numeric" value="' + miles(v.precio) + '" placeholder="0" /></div>' +
            '<button class="icon-btn icon-btn-sm v-del" title="Quitar versión"><span class="ms">delete</span></button></div>',
        )
        .join("")
    : '<p class="muted">Sin versiones. Agrega la primera.</p>';

  const tipos = [...new Set(a.versiones.map((v) => v.tipo))];
  $("#p-fichas").innerHTML = tipos.length
    ? tipos
        .map(
          (t) =>
            '<div class="ficha-row" data-tipo="' + t + '"><label class="field-label">' + TIPOS[t] + "</label>" +
            '<div class="input-btn"><input type="url" class="f-url" value="' + escapeHtml(a.fichas[t] || "") + '" placeholder="https://drive.google.com/file/d/…/view" />' +
            '<button class="icon-btn f-probar" title="Probar link"><span class="ms">open_in_new</span></button></div></div>',
        )
        .join("")
    : '<p class="muted">Agrega versiones para capturar sus fichas.</p>';
}

const actualizarBarra = () => ($("#save-bar").hidden = !hayCambios());

// ---------- Acciones ----------
async function elegirModelo(id) {
  if (edit?.id === id) return;
  if (vacio) return toast("Primero toca “Subir catálogo” (arriba)", "info");
  if (hayCambios() && !(await confirmar("Tienes cambios sin guardar", "¿Descartarlos y cambiar de modelo?", { ok: "Descartar", peligro: true }))) return;
  const m = catalogo.find((x) => x.id === id);
  original = clonar(m);
  edit = clonar(m);
  anioSel = aniosDe(m)[0] || "";
  renderModelos();
  renderEditor();
}

function abrirNuevoAnio() {
  const anios = aniosDe(edit);
  $("#na-anio").value = anios.length ? Number(anios[0]) + 1 : new Date().getFullYear() + 1;
  $("#na-base").innerHTML =
    anios.map((a) => '<option value="' + a + '">Copiar versiones y precios de ' + a + "</option>").join("") + '<option value="">Empezar vacío</option>';
  abrirHoja($("#sheet-anio"));
}

function crearAnio() {
  const anio = String(parseInt($("#na-anio").value, 10) || "");
  if (!/^20\d\d$/.test(anio)) return toast("Año inválido", "error");
  if (edit.anios[anio]) return toast(edit.nombre + " " + anio + " ya existe", "error");
  const base = $("#na-base").value;
  edit.anios[anio] = base
    ? { estado: "borrador", versiones: clonar(edit.anios[base].versiones), fichas: clonar(edit.anios[base].fichas) }
    : { estado: "borrador", versiones: [{ nombre: "", precio: 0, tipo: "gasolina" }], fichas: {} };
  anioSel = anio;
  cerrarHoja($("#sheet-anio"));
  renderEditor();
  toast(edit.nombre + " " + anio + " creado como borrador. Ajusta y guarda.", "info");
}

async function eliminarAnio() {
  if (!(await confirmar("¿Eliminar " + edit.nombre + " " + anioSel + "?", "Se quitan sus versiones y precios. Se aplica al guardar.", { ok: "Eliminar", peligro: true }))) return;
  delete edit.anios[anioSel];
  anioSel = "";
  renderEditor();
}

function validar() {
  for (const [anio, a] of Object.entries(edit.anios)) {
    const nombres = new Set();
    for (const v of a.versiones) {
      if (!v.nombre) return anio + ": hay una versión sin nombre";
      if (!(v.precio > 0)) return anio + ": falta el precio de " + v.nombre;
      if (nombres.has(v.nombre.toLowerCase())) return anio + ": la versión " + v.nombre + " está repetida";
      nombres.add(v.nombre.toLowerCase());
    }
    if (a.estado === "publicado" && !a.versiones.length) return anio + ": no se puede publicar sin versiones";
    for (const [t, url] of Object.entries(a.fichas)) if (!esLinkValido(url)) return anio + ": el link de ficha " + TIPOS[t] + " no es válido";
  }
  return "";
}

async function guardar() {
  // limpiar fichas de tipos que ya no tienen versiones
  Object.values(edit.anios).forEach((a) => {
    const tipos = new Set(a.versiones.map((v) => v.tipo));
    Object.keys(a.fichas).forEach((t) => (!tipos.has(t) || !a.fichas[t]) && delete a.fichas[t]);
  });
  const error = validar();
  if (error) return toast(error, "error");

  const btn = $("#btn-guardar");
  btn.disabled = true;
  const promesa = guardarModelo(edit);
  if (!navigator.onLine) {
    promesa.catch(() => {});
    toast("Sin conexión: se guardará al volver la red", "info");
  } else {
    try {
      await promesa;
      toast(edit.nombre + " guardado. Ya se ve en la app.", "success");
    } catch (e) {
      btn.disabled = false;
      return toast("No se pudo guardar (" + (e.code || e.message) + ")", "error");
    }
  }
  btn.disabled = false;
  original = clonar(edit);
  renderEditor();
}

// ---------- Eventos ----------
function enlazar() {
  $("#p-modelos").addEventListener("click", (e) => {
    const b = e.target.closest(".modelo-chip");
    if (b) elegirModelo(b.dataset.id);
  });
  $("#p-anios").addEventListener("click", (e) => {
    if (e.target.closest("#btn-nuevo-anio")) return abrirNuevoAnio();
    const b = e.target.closest("[data-anio]");
    if (!b) return;
    anioSel = b.dataset.anio;
    renderEditor();
  });
  $("#p-estado").addEventListener("click", (e) => {
    const b = e.target.closest("[data-estado]");
    if (!b) return;
    edit.anios[anioSel].estado = b.dataset.estado;
    renderEditor();
  });

  // Edición en línea de versiones (sin re-render para no perder el foco)
  $("#p-versiones").addEventListener("input", (e) => {
    const row = e.target.closest(".ver-row");
    if (!row) return;
    const v = edit.anios[anioSel].versiones[Number(row.dataset.i)];
    if (e.target.classList.contains("v-nombre")) v.nombre = e.target.value.trim();
    if (e.target.classList.contains("v-precio")) {
      v.precio = digitos(e.target.value);
      e.target.value = miles(v.precio);
    }
    actualizarBarra();
  });
  $("#p-versiones").addEventListener("change", (e) => {
    if (!e.target.classList.contains("v-tipo")) return;
    edit.anios[anioSel].versiones[Number(e.target.closest(".ver-row").dataset.i)].tipo = e.target.value;
    renderEditor(); // cambia la lista de fichas
  });
  $("#p-versiones").addEventListener("click", (e) => {
    const del = e.target.closest(".v-del");
    if (!del) return;
    edit.anios[anioSel].versiones.splice(Number(del.closest(".ver-row").dataset.i), 1);
    renderEditor();
  });
  $("#btn-add-ver").addEventListener("click", () => {
    const vs = edit.anios[anioSel].versiones;
    vs.push({ nombre: "", precio: 0, tipo: vs[vs.length - 1]?.tipo || "gasolina" });
    renderEditor();
    $$("#p-versiones .v-nombre").pop()?.focus();
  });

  $("#p-fichas").addEventListener("input", (e) => {
    const row = e.target.closest(".ficha-row");
    if (!row) return;
    edit.anios[anioSel].fichas[row.dataset.tipo] = e.target.value.trim();
    actualizarBarra();
  });
  $("#p-fichas").addEventListener("click", (e) => {
    const b = e.target.closest(".f-probar");
    if (!b) return;
    const url = b.closest(".ficha-row").querySelector(".f-url").value.trim();
    url ? window.open(drivePreview(url), "_blank") : toast("Primero pega el link", "info");
  });

  $("#btn-del-anio").addEventListener("click", eliminarAnio);
  $("#btn-na-crear").addEventListener("click", crearAnio);
  $("#btn-guardar").addEventListener("click", guardar);
  $("#btn-descartar").addEventListener("click", () => {
    edit = clonar(original);
    if (!edit.anios[anioSel]) anioSel = "";
    renderEditor();
  });
  $("#btn-importar").addEventListener("click", async () => {
    const btn = $("#btn-importar");
    btn.disabled = true;
    try {
      const n = await importarCatalogoBase();
      vacio = false;
      $("#banner-import").hidden = true;
      toast(n + " modelos subidos a la nube", "success");
    } catch (e) {
      toast("No se pudo subir (" + (e.code || e.message) + ")", "error");
    }
    btn.disabled = false;
  });

  window.addEventListener("beforeunload", (e) => {
    if (hayCambios()) e.preventDefault();
  });
}

// ---------- Arranque ----------
protegerPagina($("#login"), async () => {
  enlazar();
  try {
    vacio = await catalogoFirestoreVacio();
  } catch (e) {
    toast("No se pudo leer el catálogo (" + (e.code || e.message) + ")", "error");
  }
  $("#banner-import").hidden = !vacio;
  suscribirCatalogo((lista) => {
    catalogo = lista;
    // refrescar el modelo abierto si no hay cambios locales
    if (edit && !hayCambios()) {
      const m = catalogo.find((x) => x.id === edit.id);
      if (m) {
        original = clonar(m);
        edit = clonar(m);
      }
    }
    renderModelos();
    renderEditor();
  });
});
