// ==============================
// FINANCIAMIENTO — pestaña de la app (ver y editar links del mes)
// ==============================
import { $, abrirHoja, cerrarHoja, drivePreview, formatFecha, toast, escapeHtml } from "./ui.js";
import { DOCS_FIN, suscribirFinanciamiento, guardarFinanciamiento, nombreMes, mesActual, esLinkValido } from "./financiamiento-data.js";

let fin = {};

function render() {
  const vig = fin.vigencia;
  const h = $("#fin-vigencia");
  h.textContent = vig ? nombreMes(vig) : "Sin definir";
  h.classList.toggle("vencida", !!vig && vig < mesActual());

  $("#fin-list").innerHTML = Object.entries(DOCS_FIN)
    .map(([k, d]) => {
      const url = fin[k] || "";
      const act = fin[k + "UpdatedAt"];
      return (
        '<button class="row row-card" data-doc="' + k + '"' + (url ? "" : " disabled") + ">" +
        '<span class="ms row-icon row-icon-lg">' + d.icono + "</span>" +
        '<span class="row-main"><strong>' + escapeHtml(d.titulo) + "</strong>" +
        "<small>" + (url ? (act ? "Actualizado el " + formatFecha(act, { day: "numeric", month: "long" }) : escapeHtml(d.desc)) : "Link aún no configurado") + "</small></span>" +
        '<span class="ms">open_in_new</span></button>'
      );
    })
    .join("");
}

function abrirEditor() {
  $("#fin-vig-input").value = fin.vigencia || mesActual();
  $("#fin-oferta-input").value = fin.oferta || "";
  $("#fin-descuentos-input").value = fin.descuentos || "";
  abrirHoja($("#sheet-fin"));
}

async function guardar() {
  const cambios = {
    vigencia: $("#fin-vig-input").value || mesActual(),
    oferta: $("#fin-oferta-input").value.trim(),
    descuentos: $("#fin-descuentos-input").value.trim(),
  };
  if (!esLinkValido(cambios.oferta) || !esLinkValido(cambios.descuentos)) return toast("Revisa los links: deben empezar con https://", "error");
  if (!navigator.onLine) {
    // Firestore lo encola y lo sube al volver la conexión
    guardarFinanciamiento(fin, cambios).catch(() => {});
    cerrarHoja($("#sheet-fin"));
    return toast("Sin conexión: se guardará al volver la red", "info");
  }
  const btn = $("#btn-fin-guardar");
  btn.disabled = true;
  try {
    await guardarFinanciamiento(fin, cambios);
    cerrarHoja($("#sheet-fin"));
    toast("Financiamiento actualizado", "success");
  } catch (e) {
    toast("No se pudo guardar (" + (e.code || e.message) + ")", "error");
  }
  btn.disabled = false;
}

export function iniciarFinanciamiento() {
  $("#fin-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-doc]");
    if (b && fin[b.dataset.doc]) window.open(drivePreview(fin[b.dataset.doc]), "_blank");
  });
  $("#btn-editar-fin").addEventListener("click", abrirEditor);
  $("#btn-fin-guardar").addEventListener("click", guardar);
  render();
  suscribirFinanciamiento((data) => {
    fin = data;
    render();
  });
}
