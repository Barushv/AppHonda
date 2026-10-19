// ==============================
// FIREBASE — app, auth y Firestore (compartido por todas las páginas)
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3WZseiyASn9_8JmtSX-7UY0V__MmOGQI",
  authDomain: "hondaguardias-7c69b.firebaseapp.com",
  projectId: "hondaguardias-7c69b",
  storageBucket: "hondaguardias-7c69b.appspot.com",
  messagingSenderId: "333873832947",
  appId: "1:333873832947:web:18b0b6728ffb541ecf6886",
};

// Única cuenta con acceso (debe coincidir con firestore.rules)
export const ADMIN_EMAIL = "fortiz.hondamontejo@gmail.com";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Caché persistente: la app funciona sin conexión y las escrituras se sincronizan al volver la red
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export function esAdmin(user) {
  return !!user && user.emailVerified && (user.email || "").toLowerCase() === ADMIN_EMAIL;
}

export async function iniciarSesion() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ login_hint: ADMIN_EMAIL, prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
    } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      throw e;
    }
  }
}

export const cerrarSesion = () => signOut(auth);

/**
 * Muestra la pantalla de acceso hasta que haya sesión de la cuenta autorizada.
 * `gate` es el elemento de login (debe contener [data-login] y [data-login-error]).
 * Llama a onReady(user) una sola vez, cuando el acceso es válido.
 */
export function protegerPagina(gate, onReady) {
  let listo = false;
  const btn = gate.querySelector("[data-login]");
  const err = gate.querySelector("[data-login-error]");
  btn?.addEventListener("click", async () => {
    err.textContent = "";
    btn.disabled = true;
    try {
      await iniciarSesion();
    } catch (e) {
      err.textContent = "No se pudo iniciar sesión (" + (e.code || e.message) + ")";
    }
    btn.disabled = false;
  });

  onAuthStateChanged(auth, async (user) => {
    document.documentElement.classList.remove("auth-pending");
    if (esAdmin(user)) {
      gate.hidden = true;
      if (!listo) {
        listo = true;
        onReady(user);
      }
      return;
    }
    if (user) {
      err.textContent = "La cuenta " + user.email + " no tiene acceso.";
      await signOut(auth);
    }
    gate.hidden = false;
  });
}
