// ==============================
// CATÁLOGO — modelo → año → versiones (compartido por la app y precios.html)
//
// Firestore: catalogo/{id} = {
//   nombre, imagen, orden,
//   anios: { "2026": { estado: "publicado"|"borrador"|"oculto", versiones: [{nombre, precio, tipo}], fichas: {gasolina, hev} } },
//   updatedAt
// }
// ==============================
import { db, collection, doc, onSnapshot, setDoc, writeBatch, getDocs } from "./firebase.js";

const CACHE_KEY = "hondago_catalogo_v2";
export const TIPOS = { gasolina: "Gasolina", hev: "HEV ⚡" };
export const ESTADOS = { publicado: "Publicado", borrador: "Borrador", oculto: "Oculto" };

export function normalizarModelo(m, id) {
  const anios = {};
  Object.entries(m.anios || {}).forEach(([anio, a]) => {
    anios[anio] = {
      estado: ESTADOS[a.estado] ? a.estado : "publicado",
      fichas: { ...(a.fichas || {}) },
      versiones: (a.versiones || []).map((v) => ({
        nombre: String(v.nombre || "").trim(),
        precio: Number(v.precio) || 0,
        tipo: v.tipo === "hev" ? "hev" : "gasolina",
      })),
    };
  });
  return { id: id || m.id, nombre: m.nombre, imagen: m.imagen || "", orden: Number(m.orden) || 99, anios };
}

const ordenar = (lista) => lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

/** Años de un modelo, del más reciente al más antiguo */
export const aniosDe = (modelo, { soloPublicados = false } = {}) =>
  Object.keys(modelo.anios)
    .filter((a) => !soloPublicados || modelo.anios[a].estado === "publicado")
    .sort((a, b) => b - a);

/** Modelos con al menos un año publicado (lo que ve la app) */
export const modelosVisibles = (lista) => lista.filter((m) => aniosDe(m, { soloPublicados: true }).length);

export async function cargarCatalogoBase() {
  const resp = await fetch("json/precios.json");
  const data = await resp.json();
  return ordenar((data.modelos || []).map((m) => normalizarModelo(m)));
}

function leerCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return Array.isArray(raw) && raw.length ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Llama a onChange(lista) con el catálogo: primero lo guardado en el teléfono
 * (o precios.json) y después cada vez que cambie en Firestore.
 */
export async function suscribirCatalogo(onChange) {
  const cache = leerCache();
  if (cache) onChange(cache);
  else {
    try {
      onChange(await cargarCatalogoBase());
    } catch (e) {
      console.error("Catálogo base no disponible", e);
    }
  }

  return onSnapshot(
    collection(db, "catalogo"),
    (snap) => {
      if (snap.empty) return; // aún no se importa el catálogo a Firestore: seguimos con el JSON
      const lista = ordenar(snap.docs.map((d) => normalizarModelo(d.data(), d.id)));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(lista));
      } catch {}
      onChange(lista);
    },
    (err) => console.warn("Catálogo Firestore:", err.code),
  );
}

export async function guardarModelo(modelo) {
  const { id, ...data } = normalizarModelo(modelo);
  await setDoc(doc(db, "catalogo", id), { ...data, updatedAt: new Date().toISOString() });
}

export async function catalogoFirestoreVacio() {
  const snap = await getDocs(collection(db, "catalogo"));
  return snap.empty;
}

/** Copia el catálogo de precios.json a Firestore (solo la primera vez) */
export async function importarCatalogoBase() {
  const base = await cargarCatalogoBase();
  const batch = writeBatch(db);
  const ahora = new Date().toISOString();
  base.forEach(({ id, ...data }) => batch.set(doc(db, "catalogo", id), { ...data, updatedAt: ahora }));
  await batch.commit();
  return base.length;
}
