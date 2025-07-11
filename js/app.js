// app.js

// Configuración personalizada (usa tu propia config del Paso 1)
const firebaseConfig = {
  apiKey: "AIzaSyC3WZseiyASn9_8JmtSX-7UY0V__MmOGQI",
  authDomain: "hondaguardias-7c69b.firebaseapp.com",
  projectId: "hondaguardias-7c69b",
  storageBucket: "hondaguardias-7c69b.firebasestorage.app",
  messagingSenderId: "333873832947",
  appId: "1:333873832947:web:18b0b6728ffb541ecf6886",
};
// Inicializar Firebase si aún no se ha hecho
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Crear referencia global a Firestore
const db = firebase.firestore();

function abrirModal(fechaStr, modoEdicion = false, eventoData = null) {
  fechaSeleccionada = fechaStr;
  document.getElementById("modalGuardia").style.display = "flex";
  document.getElementById("modalGuardia").focus();

  if (modoEdicion && eventoData) {
    document.getElementById("idGuardia").value = eventoData.id;
    document.getElementById("nombreGuardia").value = extraerNombre(eventoData.title);
    document.getElementById("turnoGuardia").value = eventoData.title.includes("AM") ? "am" : "pm";
    document.getElementById("tituloModalGuardia").textContent = "Editar Guardia";
    document.getElementById("iconModal").innerHTML = eventoData.title.includes("AM") ? "☀️" : "🌙";
    document.getElementById("btnEliminarGuardia").style.display = "block";
  } else {
    document.getElementById("idGuardia").value = "";
    document.getElementById("nombreGuardia").value = "";
    document.getElementById("turnoGuardia").value = "am";
    document.getElementById("tituloModalGuardia").textContent = "Nueva Guardia";
    document.getElementById("iconModal").innerHTML = "👤";
    document.getElementById("btnEliminarGuardia").style.display = "none";
  }

  // 👉 Enfoca el input de nombre después de abrir el modal
  setTimeout(() => {
    document.getElementById("nombreGuardia").focus();
  }, 10);
}

function cerrarModal() {
  document.getElementById("modalGuardia").style.display = "none";
  document.getElementById("nombreGuardia").value = "";
  document.getElementById("idGuardia").value = "";
}

// Acciones de cierre
document.getElementById("btnCerrarModal").onclick = document.getElementById("btnCancelar").onclick = cerrarModal;

// Permitir cerrar con ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") cerrarModal();
});

// Permitir cerrar al hacer click fuera del modal
document.getElementById("modalGuardia").addEventListener("mousedown", function (e) {
  if (e.target === this) cerrarModal();
});

db.collection("guardias")
  .get()
  .then((querySnapshot) => {
    console.log("Firestore conectado. Docs encontrados:", querySnapshot.size);
  })
  .catch((error) => {
    console.error("Error al conectar a Firestore:", error);
  });

let calendar;

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendario-guardias");
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "es", // <-- Esta línea pone todo en español
    initialView: "dayGridMonth",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [],

    // 👇 Agrega esto
    eventContent: function (arg) {
      return { html: arg.event.title };
    },

    dateClick: function (info) {
      abrirModal(info.dateStr);
    },

    eventClick: function (info) {
      const evento = info.event;
      document.getElementById("idGuardia").value = evento.id;
      document.getElementById("nombreGuardia").value = extraerNombre(evento.title);
      document.getElementById("turnoGuardia").value = evento.title.includes("AM") ? "am" : "pm";
      fechaSeleccionada = evento.startStr.split("T")[0];
      document.getElementById("modalGuardia").style.display = "block";
    },
  });

  calendar.render();
});

function cargarGuardiasDesdeFirestore() {
  db.collection("guardias").onSnapshot((snapshot) => {
    calendar.getEvents().forEach((e) => e.remove());
    snapshot.forEach((doc) => {
      const data = doc.data();
      let titleVisual = "";
      let colorVisual = data.color || "#007bff";

      if (data.tipo === "guardia") {
        // Mostramos emoji y badge solo para guardias
        const nombreColaborador = extraerNombre(data.title);
        const isAM = data.title.includes("AM");
        const icono = isAM ? "☀️" : "🌙";
        colorVisual = data.color || (isAM ? "#FFA500" : "#007bff");
        titleVisual = `${icono} <span class="badge-colaborador">${nombreColaborador}</span>`;
      }

      if (data.tipo === "recordatorio") {
        // Mostramos ícono de campana y título del recordatorio
        titleVisual = `🛎️ <span class="badge-colaborador">${data.titulo || ""}</span>`;
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

// Llamar función después de renderizar el calendario
cargarGuardiasDesdeFirestore();

let fechaSeleccionada = null;

function abrirModal(fechaStr) {
  fechaSeleccionada = fechaStr;
  document.getElementById("modalGuardia").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modalGuardia").style.display = "none";
  document.getElementById("nombreGuardia").value = "";
  document.getElementById("idGuardia").value = "";
}

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

    // Para recordatorio, solo una hora puntual
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
  const ref = id ? db.collection("guardias").doc(id).update(data) : db.collection("guardias").add(data);

  ref
    .then(() => {
      mostrarToast(id ? "Evento actualizado" : "Evento registrado");
      cerrarModal();
    })
    .catch((err) => {
      console.error("Error al guardar:", err);
    });
});

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

let modeloSeleccionado = "";
let versionSeleccionada = "";
let precioSeleccionado = "";
let imagenSeleccionada = "";
let precios = {};

window.onload = async () => {
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

function cargarVersiones() {
  const modelo = document.getElementById("modelo").value;
  const selectVersion = document.getElementById("version");

  selectVersion.innerHTML = '<option value="">--Selecciona versión--</option>';
  if (!modelo) return;

  hondaData[modelo].forEach((version) => {
    const option = document.createElement("option");
    option.value = version;
    option.textContent = version;
    selectVersion.appendChild(option);
  });

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
  const todoListo = modelo && version && imagen.complete && imagen.naturalHeight !== 0;
  boton.disabled = !todoListo;
}

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

function cambiarTab(tabId) {
  document.querySelectorAll(".tab-section").forEach((sec) => sec.classList.remove("active"));
  document.querySelectorAll(".tab-bar button").forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  document.getElementById(`tab-${tabId}`).classList.add("active");
}

function enviarACliente() {
  const numero = document.getElementById("telefono-cliente").value.trim();
  if (!numero) {
    alert("Ingresa un número válido.");
    return;
  }
  if (!modeloSeleccionado || !versionSeleccionada || !precioSeleccionado) {
    alert("Faltan datos del vehículo seleccionado.");
    return;
  }

  const mensaje = encodeURIComponent(
    `👋 Hola, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*.

🚗 Te comparto la ficha del vehículo:
🔹 Modelo: *${modeloSeleccionado}*
🔸 Versión: *${versionSeleccionada}*
💰 Precio: *${precioSeleccionado}*

📞 Si tienes alguna duda o deseas agendar una cita, estoy a tus órdenes para asesorarte.

✉️ Correo: fortiz.hondamontejo@gmail.com
📘 Facebook: fb.com/honda.israelortiz
📍 Ubicación: Honda Montejo, Mérida`
  );

  setTimeout(() => {
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
  }, 2500);
}

function aplicarModoOscuroDesdeStorage() {
  const darkModeActivo = localStorage.getItem("modoOscuro") === "true";
  if (darkModeActivo) {
    document.body.classList.add("dark-mode");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  aplicarModoOscuroDesdeStorage();

  const toggleBtn = document.getElementById("toggle-darkmode");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const activo = document.body.classList.contains("dark-mode");
      localStorage.setItem("modoOscuro", activo);
    });
  }

  // Botón de actualización manual
  const btnActualizar = document.getElementById("btn-actualizar");
  if (btnActualizar) {
    btnActualizar.addEventListener("click", actualizarApp);
  }
});

// =====================
// REGISTRO Y DETECCIÓN DE ACTUALIZACIÓN SW
// =====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then((registration) => {
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        newWorker.onstatechange = () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
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

// Muestra el banner de actualización de la app
function mostrarBotonActualizacion() {
  const contenedor = document.getElementById("actualizacion-info");
  const listaCambios = document.getElementById("lista-cambios");
  const boton = document.getElementById("btn-actualizar");

  if (contenedor && listaCambios && boton) {
    listaCambios.innerHTML = `
      <li>📄 Precios actualizados (precios.json)</li>
      <li>📑 Oferta comercial (oferta.pdf)</li>
      <li>🧾 Bonos y descuentos (descuentos.pdf)</li>
      <li>📅 Guardias del mes (guardias.pdf)</li>
    `;
    contenedor.style.display = "block";
    boton.style.display = "inline-block";
  }
}

// Función para forzar la actualización al hacer click en el botón
function actualizarApp() {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg.waiting) {
      reg.waiting.postMessage("SKIP_WAITING");
    }
  });
  setTimeout(() => {
    window.location.reload();
  }, 800);
}

// Conecta el botón de actualizar
document.getElementById("btn-actualizar").onclick = actualizarApp;

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

const style = document.createElement("style");
style.textContent = `
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: #333;
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  opacity: 0.9;
}
`;
document.head.appendChild(style);

function extraerNombre(titulo) {
  // Si por accidente recibes HTML, saca solo el nombre
  if (titulo.includes("<span")) {
    // Extrae con Regex (no recomendado para producción, pero suficiente aquí)
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
    document.getElementById("tituloModalGuardia").textContent = "Nuevo Recordatorio";
  }
});
