// ==============================
// FINANCIAMIENTO — datos en Firestore config/financiamiento (app y gestión web)
// { oferta, descuentos, vigencia: "2026-10", ofertaUpdatedAt, descuentosUpdatedAt }
// ==============================
import { db, doc, onSnapshot, setDoc } from "./firebase.js";

const ref = () => doc(db, "config", "financiamiento");
const CACHE_KEY = "hondago_financiamiento";

export const DOCS_FIN = {
  oferta: { titulo: "Oferta comercial del mes", desc: "Condiciones y promociones vigentes", icono: "request_quote" },
  descuentos: { titulo: "Bonos e incentivos", desc: "Descuentos y bonos aplicables del período", icono: "redeem" },
};

export function suscribirFinanciamiento(onChange) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (c) onChange(c);
  } catch {}
  return onSnapshot(
    ref(),
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
      onChange(data);
    },
    (err) => console.warn("Financiamiento:", err.code),
  );
}

/** cambios: { oferta?, descuentos?, vigencia? } — marca la fecha de actualización de cada link modificado */
export async function guardarFinanciamiento(actual, cambios) {
  const ahora = new Date().toISOString();
  const data = { ...cambios };
  Object.keys(DOCS_FIN).forEach((k) => {
    if (k in cambios && cambios[k] !== (actual[k] || "")) data[k + "UpdatedAt"] = ahora;
  });
  await setDoc(ref(), data, { merge: true });
}

export function nombreMes(vigencia) {
  if (!vigencia) return "";
  const [y, m] = vigencia.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const mesActual = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

export const esLinkValido = (url) => !url || /^https:\/\/\S+$/.test(url.trim());
