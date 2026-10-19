// ==============================
// PWA — registro del service worker y aviso de nueva versión
// ==============================
import { $ } from "./ui.js";

function mostrarAviso(reg) {
  const banner = $("#update-banner");
  const btnMas = $("#btn-mas-actualizar");
  const actualizar = () => reg.waiting?.postMessage("SKIP_WAITING");
  if (banner) {
    banner.hidden = false;
    $("#btn-actualizar").onclick = actualizar;
  }
  if (btnMas) {
    btnMas.hidden = false;
    btnMas.onclick = actualizar;
  }
}

export function registrarSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("service-worker.js")
    .then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) mostrarAviso(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) mostrarAviso(reg);
        });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    })
    .catch((err) => console.warn("SW:", err));

  // En la primera instalación clients.claim() también dispara controllerchange: ahí no se recarga
  const habiaControlador = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando || !habiaControlador) return;
    recargando = true;
    location.reload();
  });
}
