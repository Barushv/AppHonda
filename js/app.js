// ==============================
// HONDAGO — punto de entrada
// ==============================
import { protegerPagina, cerrarSesion } from "./firebase.js";
import { $, $$, aplicarTema, getTema, setTema, confirmar } from "./ui.js";
import { ASESOR, APP_VERSION } from "./config.js";
import { iniciarVehiculos } from "./vehiculos.js";
import { iniciarFinanciamiento } from "./financiamiento.js";
import { iniciarLeads } from "./leads.js";
import { iniciarAgenda, mostrarAgenda } from "./agenda.js";
import { iniciarTarjeta } from "./tarjeta.js";
import { registrarSW } from "./pwa.js";

aplicarTema();
registrarSW();

// ---------- Pestañas ----------
const TAB_KEY = "hondago_tab";

export function cambiarTab(tab) {
  $$(".tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
  $$(".tab-bar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("#app-titulo").textContent = tab === "vehiculos" ? "HondaGo" : $("#tab-" + tab).dataset.titulo;
  window.scrollTo(0, 0);
  if (tab === "agenda") mostrarAgenda();
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {}
}

$$(".tab-bar button").forEach((b) => b.addEventListener("click", () => cambiarTab(b.dataset.tab)));

// ---------- Más: tema, créditos, sesión ----------
function pintarTema() {
  const t = getTema();
  $$("#tema-switch button").forEach((b) => b.classList.toggle("active", b.dataset.tema === t));
}
$$("#tema-switch button").forEach((b) =>
  b.addEventListener("click", () => {
    setTema(b.dataset.tema);
    pintarTema();
  }),
);
pintarTema();

$("#creditos-texto").innerHTML =
  "Desarrollado por <strong>" + ASESOR.nombre + "</strong><br>Versión " + APP_VERSION + "<br>" + ASESOR.correo + "<br>" +
  '<a href="https://' + ASESOR.facebook + '" target="_blank" rel="noopener">' + ASESOR.facebook + "</a>";

$("#btn-logout").addEventListener("click", async () => {
  if (await confirmar("¿Cerrar sesión?", "Tus leads se quedan guardados en la nube.", { ok: "Cerrar sesión", peligro: true })) {
    await cerrarSesion();
    location.reload();
  }
});

// ---------- Arranque (solo con sesión válida) ----------
protegerPagina($("#login"), (user) => {
  $("#sesion-email").textContent = user.email;
  iniciarVehiculos();
  iniciarFinanciamiento();
  iniciarLeads({ irA: cambiarTab });
  iniciarAgenda({ irA: cambiarTab });
  iniciarTarjeta();

  // #leads, #agenda… (atajos del ícono) o la última pestaña usada
  let inicial = location.hash.slice(1);
  if (!$("#tab-" + inicial)) {
    try {
      inicial = sessionStorage.getItem(TAB_KEY) || "vehiculos";
    } catch {
      inicial = "vehiculos";
    }
  }
  cambiarTab(inicial);
});
