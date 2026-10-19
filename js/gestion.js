// ==============================
// GESTIÓN (web) — financiamiento del mes
// ==============================
import { protegerPagina } from "./firebase.js";
import { $, toast, aplicarTema, drivePreview, formatDateTime } from "./ui.js";
import { suscribirFinanciamiento, guardarFinanciamiento, nombreMes, mesActual, esLinkValido } from "./financiamiento-data.js";

aplicarTema();

let fin = {};
let editado = false; // el usuario ya empezó a escribir

function pintar() {
  const tag = $("#g-vig-tag");
  tag.textContent = fin.vigencia ? nombreMes(fin.vigencia) : "Sin vigencia";
  tag.className = "tag" + (fin.vigencia && fin.vigencia < mesActual() ? " tag-oculto" : " tag-publicado");
  ["oferta", "descuentos"].forEach((k) => {
    const act = fin[k + "UpdatedAt"];
    $("#g-" + k + "-act").textContent = act ? "Actualizado: " + formatDateTime(act) : "";
  });
  // no sobreescribir lo que se está escribiendo
  if (!editado) {
    $("#g-vigencia").value = fin.vigencia || mesActual();
    $("#g-oferta").value = fin.oferta || "";
    $("#g-descuentos").value = fin.descuentos || "";
  }
}

async function guardar() {
  const cambios = {
    vigencia: $("#g-vigencia").value || mesActual(),
    oferta: $("#g-oferta").value.trim(),
    descuentos: $("#g-descuentos").value.trim(),
  };
  if (!esLinkValido(cambios.oferta) || !esLinkValido(cambios.descuentos)) return toast("Revisa los links: deben empezar con https://", "error");
  const btn = $("#g-guardar");
  btn.disabled = true;
  try {
    await guardarFinanciamiento(fin, cambios);
    editado = false;
    toast("Financiamiento guardado", "success");
  } catch (e) {
    toast("No se pudo guardar (" + (e.code || e.message) + ")", "error");
  }
  btn.disabled = false;
}

protegerPagina($("#login"), () => {
  document.querySelectorAll("[data-probar]").forEach((b) =>
    b.addEventListener("click", () => {
      const url = $("#" + b.dataset.probar).value.trim();
      url ? window.open(drivePreview(url), "_blank") : toast("Primero pega el link", "info");
    }),
  );
  $("#g-guardar").addEventListener("click", guardar);
  $(".main").addEventListener("input", () => (editado = true));
  suscribirFinanciamiento((data) => {
    fin = data;
    pintar();
  });
});
