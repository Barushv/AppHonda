// app.js

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

const precios = {
  CITY: {
    Sport: "$405,900.00",
    Prime: "$437,900.00",
    Touring: "$468,900.00",
  },
  CIVIC: {
    "i-Style": "$590,900.00",
    "Sport HEV": "$694,900.00",
    Touring: "$734,900.00",
  },
  ACCORD: {
    Prime: "$775,900.00",
    Touring: "$915,900.00",
  },
  BRV: {
    Uniq: "$488,900.00",
    Touring: "$529,900.00",
  },
  HRV: {
    Uniq: "$610,900.00",
    Sport: "$650,900.00",
    Touring: "$680,900.00",
  },
  CRV: {
    Turbo: "$748,900.00",
    "Turbo Plus": "$804,900.00",
    Touring: "$858,900.00",
    "Touring Hev": "$947,900.00",
  },
  PILOT: {
    Touring: "$1,200,900.00",
    "Black Edition": "$1,230,900.00",
  },
  ODYSSEY: {
    Touring: "$1,182,900.00",
    "Black Edition": "$1,212,900.00",
  },
};

// =============================
// VARIABLES GLOBALES SELECCIÓN
// =============================
let modeloSeleccionado = "";
let versionSeleccionada = "";
let precioSeleccionado = "";
let imagenSeleccionada = "";

window.onload = () => {
  const selectModelo = document.getElementById("modelo");
  Object.keys(hondaData).forEach((modelo) => {
    const option = document.createElement("option");
    option.value = modelo;
    option.textContent = modelo;
    selectModelo.appendChild(option);
  });
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
  imagen.src = `img/${modelo.toLowerCase()}.png`;
  imagen.alt = modelo;
  imagen.onload = verificarCargado;
  document.getElementById("info-modelo").textContent = "";
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
    imagenSeleccionada = document.getElementById("imagen").src;
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

  const cargado =
    modelo && version && imagen.complete && imagen.naturalHeight !== 0;
  boton.disabled = !cargado;
}

function generarPDF() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const imagen = document.getElementById("imagen");
  const precio = precios[modelo]?.[version] || "Precio no disponible";

  if (!modelo || !version) {
    alert("Por favor selecciona un modelo y una versión.");
    return;
  }

  document.getElementById("selector-menu").style.display = "none";
  document.querySelector(".tab-bar").style.display = "none";
  document.getElementById("qr-contacto").style.display = "block";

  const exportar = () => {
    const container = document.createElement("div");
    container.style.backgroundColor = "#fff";
    container.style.padding = "20px";
    container.style.textAlign = "center";

    const logo = document.getElementById("logo-vehiculo").cloneNode(true);
    logo.style.maxWidth = "150px";
    logo.style.margin = "0 auto 20px";
    container.appendChild(logo);

    const infoBlock = document.createElement("div");
    infoBlock.innerHTML = `
      <h2>${modelo}</h2>
      <p><strong>Versión:</strong> ${version}</p>
      <p><strong>Precio:</strong> ${precio}</p>
    `;
    container.appendChild(infoBlock);

    const imagenClone = new Image();
    imagenClone.src = imagen.src;
    imagenClone.alt = imagen.alt;
    imagenClone.style.maxWidth = "100%";
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
      });
  };

  if (!imagen.complete || imagen.naturalHeight === 0) {
    imagen.onload = exportar;
  } else {
    exportar();
  }
}

function cambiarTab(tabId) {
  document
    .querySelectorAll(".tab-section")
    .forEach((sec) => sec.classList.remove("active"));
  document
    .querySelectorAll(".tab-bar button")
    .forEach((btn) => btn.classList.remove("active"));

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
  // Generar PDF personalizado
/*   generarFichaPDF(
    modeloSeleccionado,
    versionSeleccionada,
    precioSeleccionado,
    imagenSeleccionada
  ); */
  
  // Preparar mensaje WhatsApp
  const mensaje = encodeURIComponent(
    `👋 Hola, soy *Israel Ortiz*, asesor de ventas en *Honda Montejo*.\n\n🚗 Te comparto la ficha del vehículo:\n🔹 Modelo: *${modeloSeleccionado}*\n🔸 Versión: *${versionSeleccionada}*\n💰 Precio: *${precioSeleccionado}*\n\n📞 Si tienes alguna duda o deseas agendar una cita, estoy a tus órdenes para asesorarte.\n\n✉️ Correo: fortiz.hondamontejo@gmail.com\n📘 Facebook: fb.com/honda.israelortiz\n📍 Ubicación: Honda Montejo, Mérida`
  );

  // Enviar mensaje por WhatsApp con un pequeño delay
  setTimeout(() => {
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank");
  }, 2500);
}

function generarFichaPDF(modelo, version, precio, imagenSrc) {
  document.getElementById("qr-contacto").style.display = "block";
  document.getElementById("selector-menu").style.display = "none";
  document.querySelector(".tab-bar").style.display = "none";

  const contenedor = document.createElement("div");
  contenedor.style.backgroundColor = "#fff";
  contenedor.style.padding = "20px";
  contenedor.style.textAlign = "center";

  const titulo = document.createElement("h2");
  titulo.textContent = modelo;
  contenedor.appendChild(titulo);

  const datos = document.createElement("p");
  datos.innerHTML = `<strong>Versión:</strong> ${version}<br><strong>Precio:</strong> ${precio}`;
  contenedor.appendChild(datos);

  const imagen = new Image();
  imagen.src = imagenSrc;
  imagen.alt = `${modelo} ${version}`;
  imagen.style.maxWidth = "100%";
  contenedor.appendChild(imagen);

  html2pdf()
    .set({
      margin: 10,
      filename: `${modelo}_${version}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {},
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(contenedor)
    .save()
    .then(() => {
      document.getElementById("selector-menu").style.display = "block";
      document.querySelector(".tab-bar").style.display = "flex";
      document.getElementById("qr-contacto").style.display = "none";
    });
}

/* document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-darkmode");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
    });
  }
});
 */

// Guardar el estado del modo oscuro
function aplicarModoOscuroDesdeStorage() {
  const darkModeActivo = localStorage.getItem("modoOscuro") === "true";
  if (darkModeActivo) {
    document.body.classList.add("dark-mode");
  }
}

// Al cargar la página
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
});
