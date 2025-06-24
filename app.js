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
  CITY_Sport: "$405,900.00",
  CITY_Prime: "$437,900.00",
  CITY_Touring: "$468,900.00",
  "CIVIC_i-Style": "$590,900.00",
  "CIVIC_Sport HEV": "$694,900.00",
  CIVIC_Touring: "$734,900.00",
  ACCORD_Prime: "$775,900.00",
  ACCORD_Touring: "$915,900.00",
  BRV_Uniq: "$488,900.00",
  BRV_Touring: "$529,900.00",
  HRV_Uniq: "$610,900.00",
  HRV_Sport: "$650,900.00",
  HRV_Touring: "$680,900.00",
  CRV_Turbo: "$748,900.00",
  "CRV_Turbo Plus": "$804,900.00",
  CRV_Touring: "$858,900.00",
  "CRV_Touring Hev": "$947,900.00",
  PILOT_Touring: "$1,200,900.00",
  "PILOT_Black Edition": "$1,230,900.00",
  ODYSSEY_Touring: "$1,182,900.00",
  "ODYSSEY_Black Edition": "$1,212,900.00",
};

window.onload = () => {
  const modeloSelect = document.getElementById("modelo");
  for (let modelo in hondaData) {
    const option = document.createElement("option");
    option.value = modelo;
    option.text = modelo;
    modeloSelect.appendChild(option);
  }
};

function cargarVersiones() {
  const modelo = document.getElementById("modelo").value;
  const versionSelect = document.getElementById("version");
  versionSelect.innerHTML = "";

  if (hondaData[modelo]) {
    hondaData[modelo].forEach((version) => {
      const opt = document.createElement("option");
      opt.value = version;
      opt.text = version;
      versionSelect.appendChild(opt);
    });
  }

  actualizarImagen();
  actualizarPrecio();
}

function actualizarImagen() {
  const modelo = document.getElementById("modelo").value;
  document.getElementById("imagen").src = modelo
    ? "img/" + modelo.toLowerCase() + ".png"
    : "";
}

function actualizarPrecio() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const clave = modelo + "_" + version;
  const precio = precios[clave] || "—";

  document.getElementById("info-modelo").innerHTML = `
    <p><strong>Modelo:</strong> ${modelo}</p>
    <p><strong>Versión:</strong> ${version}</p>
    <p><strong>Precio:</strong> ${precio}</p>
  `;
}

function generarPDF() {
  const boton = document.querySelector("button");
  const selector = document.getElementById("selector-menu");

  boton.style.display = "none";
  selector.style.display = "none";

  const imagen = document.getElementById("imagen");

  // Espera a que la imagen cargue completamente
  if (!imagen.complete) {
    imagen.onload = () => descargarPDF(boton, selector);
  } else {
    descargarPDF(boton, selector);
  }
}

function descargarPDF(boton, selector) {
  html2pdf()
    .from(document.getElementById("content"))
    .save("Ficha-Honda.pdf")
    .then(() => {
      boton.style.display = "block";
      selector.style.display = "block";
    });
}
