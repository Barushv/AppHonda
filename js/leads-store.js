// ==============================
// LEADS — almacenamiento local + sincronización con Firestore (colección "leads")
//
// La copia local (localStorage) permite ver y capturar leads sin conexión.
// Firestore es la fuente de verdad: lo que se borra o edita en otro dispositivo
// llega aquí por onSnapshot. Las escrituras sin red las encola el SDK.
// ==============================
import { db, collection, doc, onSnapshot, setDoc, writeBatch } from "./firebase.js";

const KEY = "hondago_leads_v2";
let leads = leerLocal();
const listeners = new Set();

function leerLocal() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (v2.length) return v2;
    // Migración v1 → v2
    const v1 = JSON.parse(localStorage.getItem("hondago_leads_v1") || "[]");
    return v1.map((l, i) => ({
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
  } catch {
    return [];
  }
}

function emitir() {
  try {
    localStorage.setItem(KEY, JSON.stringify(leads));
  } catch {}
  listeners.forEach((fn) => fn(leads));
}

const sinInternos = ({ _synced, ...rest }) => rest;
const subir = (l) => setDoc(doc(db, "leads", l.id), sinInternos(l)).catch((e) => console.warn("Lead sin subir:", e.code));

async function enLotes(ids, op) {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach((x) => op(batch, x));
    await batch.commit();
  }
}

export const getLeads = () => leads;
export const getLead = (id) => leads.find((l) => l.id === id);

export function onLeadsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function generarId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "ld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

/** Escucha la colección de Firestore y mantiene la copia local al día */
export function iniciarSyncLeads({ onError } = {}) {
  let primera = true;
  return onSnapshot(
    collection(db, "leads"),
    (snap) => {
      const remotos = new Map(snap.docs.map((d) => [d.id, { ...d.data(), id: d.id }]));
      leads.forEach((l) => {
        const r = remotos.get(l.id);
        if (!r) {
          // Nunca llegó a la nube (capturado sin sesión o con la versión anterior): se sube.
          // Si ya estaba sincronizado y no está, se borró en otro dispositivo.
          if (!l._synced) {
            subir(l);
            remotos.set(l.id, l);
          }
        } else if (primera && (l.updatedAt || "") > (r.updatedAt || "")) {
          subir(l);
          remotos.set(l.id, l);
        }
      });
      primera = false;
      leads = [...remotos.values()].map((l) => ({ ...l, _synced: true }));
      emitir();
    },
    (err) => {
      console.warn("Sync leads:", err.code);
      onError?.(err);
    },
  );
}

export function agregarLead(lead) {
  const l = { status: "nuevo", notas: [], ...lead, id: lead.id || generarId(), updatedAt: new Date().toISOString() };
  leads = [...leads, l];
  emitir();
  subir(l);
  return l;
}

/** cambios: objeto a fusionar o función (lead) => cambios */
export function actualizarLead(id, cambios) {
  const actual = getLead(id);
  if (!actual) return null;
  const parcial = typeof cambios === "function" ? cambios(actual) : cambios;
  const l = { ...actual, ...parcial, updatedAt: new Date().toISOString() };
  leads = leads.map((x) => (x.id === id ? l : x));
  emitir();
  subir(l);
  return l;
}

export async function eliminarLeads(ids) {
  const set = new Set(ids);
  leads = leads.filter((l) => !set.has(l.id));
  emitir();
  await enLotes([...set], (b, id) => b.delete(doc(db, "leads", id)));
}

export async function borrarTodos() {
  await eliminarLeads(leads.map((l) => l.id));
}

/** Restaura un respaldo: reemplaza todo o fusiona sin duplicar */
export async function restaurarLeads(entrantes, { reemplazar }) {
  const limpios = entrantes.map((l) => ({
    ...sinInternos(l),
    id: l.id || generarId(),
    notas: l.notas || [],
    status: l.status || "nuevo",
    updatedAt: new Date().toISOString(),
  }));
  let nuevos;
  if (reemplazar) {
    const quitar = leads.map((l) => l.id).filter((id) => !limpios.some((n) => n.id === id));
    await enLotes(quitar, (b, id) => b.delete(doc(db, "leads", id)));
    nuevos = limpios;
    leads = limpios;
  } else {
    const clave = (l) => (l.phoneRaw || "") + "|" + (l.model || "") + "|" + (l.dateISO || "").slice(0, 10);
    const ids = new Set(leads.map((l) => l.id));
    const claves = new Set(leads.map(clave));
    nuevos = limpios.filter((l) => !ids.has(l.id) && !claves.has(clave(l)));
    leads = [...leads, ...nuevos];
  }
  emitir();
  await enLotes(nuevos, (b, l) => b.set(doc(db, "leads", l.id), l));
  return nuevos.length;
}
