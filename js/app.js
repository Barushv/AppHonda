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

// Cargar modelos al iniciar
window.onload = () => {
  const selectModelo = document.getElementById("modelo");
  for (let modelo in hondaData) {
    let opt = document.createElement("option");
    opt.value = modelo;
    opt.textContent = modelo;
    selectModelo.appendChild(opt);
  }
};

// Cargar versiones según modelo
function cargarVersiones() {
  const modelo = document.getElementById("modelo").value;
  const selectVersion = document.getElementById("version");
  selectVersion.innerHTML = '<option value="">--Selecciona versión--</option>';
  if (!modelo) return;

  hondaData[modelo].forEach((version) => {
    let opt = document.createElement("option");
    opt.value = version;
    opt.textContent = version;
    selectVersion.appendChild(opt);
  });

  actualizarImagen(modelo);
}

// Mostrar imagen al elegir modelo
function actualizarImagen(modelo) {
  const imagen = document.getElementById("imagen");
  imagen.src = `img/${modelo.toLowerCase()}.png`;
  imagen.alt = modelo;
  document.getElementById("info-modelo").textContent = "";
}

// Mostrar precio al elegir versión
function actualizarPrecio() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const info = document.getElementById("info-modelo");

  if (modelo && version) {
    const precio = precios[modelo]?.[version] || "Precio no disponible";
    info.textContent = `Precio: ${precio}`;
  } else {
    info.textContent = "";
  }
}

// Generar PDF
function generarPDF() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const imagen = document.getElementById("imagen");
  const precio = precios[modelo]?.[version] || "Precio no disponible";

  if (!modelo || !version) {
    alert("Por favor selecciona un modelo y una versión.");
    return;
  }

  const selectorMenu = document.getElementById("selector-menu");
  const tabBar = document.querySelector(".tab-bar");
  const qr = document.getElementById("qr-contacto");

  selectorMenu.style.display = "none";
  tabBar.style.display = "none";
  qr.style.display = "block";

  // Esperar que la imagen esté cargada antes de exportar
  if (!imagen.complete || imagen.naturalHeight === 0) {
    imagen.onload = () => {
      exportarPDF();
    };
  } else {
    exportarPDF();
  }

  function exportarPDF() {
    const modelo = document.getElementById("modelo").value;
    const version = document.getElementById("version").value;
    const precio = precios[modelo]?.[version] || "Precio no disponible";

    if (!modelo || !version) {
      alert("Por favor selecciona un modelo y una versión.");
      return;
    }

    // Clonar un nuevo contenedor limpio (no modificamos el DOM original)
    const pdfContainer = document.createElement("div");
    pdfContainer.style.backgroundColor = "#ffffff";
    pdfContainer.style.padding = "20px";
    pdfContainer.style.textAlign = "center";
    pdfContainer.style.color = "#333";
    pdfContainer.style.fontFamily =
      "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    // Clonar y centrar el logo
    const logo =
      document.getElementById("logo-vehiculo") ||
      document.getElementById("logo");
    if (logo) {
      const logoClone = logo.cloneNode(true);
      logoClone.style.width = "150px";
      logoClone.style.margin = "0 auto 20px";
      logoClone.style.display = "block";
      pdfContainer.appendChild(logoClone);
    }

    // Insertar nombre, versión y precio
    const infoBlock = document.createElement("div");
    infoBlock.innerHTML = `
    <h2 style="margin:0 0 10px;">${modelo}</h2>
    <p style="margin:5px 0;"><strong>Versión:</strong> ${version}</p>
    <p style="margin:5px 0 20px;"><strong>Precio:</strong> ${precio}</p>
  `;
    pdfContainer.appendChild(infoBlock);

    // Clonar y ajustar imagen del vehículo
    const imgOriginal = document.getElementById("imagen");
    if (imgOriginal) {
      const imgClone = document.createElement("img");
      imgClone.src = imgOriginal.src;
      imgClone.alt = imgOriginal.alt || modelo;
      imgClone.style.width = "300px";
      imgClone.style.maxWidth = "90%";
      imgClone.style.display = "block";
      imgClone.style.margin = "0 auto 20px";
      imgClone.style.opacity = "1";
      imgClone.style.filter = "none";
      pdfContainer.appendChild(imgClone);
    }

    // Agregar QR al final
    const qrOriginal = document.getElementById("qr-contacto");
    if (qrOriginal) {
      const qrClone = qrOriginal.cloneNode(true);
      qrClone.style.display = "block";
      qrClone.style.margin = "20px auto 0";
      pdfContainer.appendChild(qrClone);
    }

    // Generar PDF
    html2pdf()
      .set({
        margin: 10,
        filename: `${modelo}_${version}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(pdfContainer)
      .save();
  }
}
// aqui inicia el codigo para compartir whatsapp
async function compartirFicha() {
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const precio = precios[modelo]?.[version] || "Precio no disponible";

  if (!modelo || !version) {
    alert("Selecciona un modelo y una versión primero.");
    return;
  }

  // Generar el PDF en memoria como Blob
  const pdfBlob = await html2pdf()
    .set({
      margin: 10,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, backgroundColor: "#fff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(document.getElementById("vehiculos"))
    .outputPdf("blob");

  const file = new File([pdfBlob], `${modelo}_${version}.pdf`, {
    type: "application/pdf",
  });

  // Si el navegador soporta compartir archivos…
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Ficha Honda ${modelo}`,
        text: `Te envío la ficha: ${modelo} ${version} – Precio: ${precio}`,
      });
      return;
    } catch (err) {
      console.warn("Share API falló:", err);
    }
  }

  // Fallback: abrir WhatsApp Web/Móvil con texto pre-llenado
  const mensaje = encodeURIComponent(
    `Hola, te comparto la ficha del Honda ${modelo} ${version} - Precio: ${precio}`
  );
  // tu número (incluyendo código país, sin +)
  const telefono = "529993355514";
  window.open(`https://wa.me/${telefono}?text=${mensaje}`, "_blank");
}

// Cambiar entre pestañas
function cambiarTab(tabId) {
  const secciones = document.querySelectorAll(".tab-section");
  const botones = document.querySelectorAll(".tab-bar button");

  secciones.forEach((sec) => sec.classList.remove("active"));
  botones.forEach((btn) => btn.classList.remove("active"));

  const activa = document.getElementById(tabId);
  if (activa) activa.classList.add("active");

  const btnActiva = document.getElementById(`tab-${tabId}`);
  if (btnActiva) btnActiva.classList.add("active");
}

async function enviarACliente() {
  const telEl = document.getElementById("telefono-cliente");
  const tel = telEl.value.trim();
  if (!/^\d{10,13}$/.test(tel)) {
    alert("Ingresa un número válido, ej. 529993355514");
    return;
  }

  // 1) Clonar sección de Vehículos y ponerla en DOM (offscreen, pero visible)
  const orig = document.getElementById("vehiculos");
  const clone = orig.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.classList.add("force-visible"); // opcional para CSS extra
  document.body.appendChild(clone);

  // 2) Generar PDF de ese clon
  const modelo = document.getElementById("modelo").value;
  const version = document.getElementById("version").value;
  const precio = precios[modelo]?.[version] || "Precio no disponible";
  const nombrePdf = `Ficha_${modelo}_${version}.pdf`;

  // Forzar que imágenes (PNG) usen crossOrigin si fuese necesario:
  const imgs = clone.querySelectorAll("img");
  imgs.forEach((img) => img.setAttribute("crossorigin", "anonymous"));

  const pdfBlob = await html2pdf()
    .set({
      margin: 10,
      filename: nombrePdf,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, backgroundColor: "#fff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(clone)
    .outputPdf("blob");

  // 3) Limpiar el clon
  document.body.removeChild(clone);

  // 4) Crear los demás archivos igual que antes
  const vcfText = `BEGIN:VCARD
VERSION:3.0
N:Honda Montejo;Israel
FN:Israel Ortiz
TEL:+529993355514
EMAIL:fortiz.hondamontejo@gmail.com
ORG:Honda Sureste
TITLE:Asesor de Ventas
END:VCARD`;
  const vcfFile = new File(
    [new Blob([vcfText], { type: "text/vcard" })],
    "Israel_Ortiz.vcf",
    { type: "text/vcard" }
  );

  // Foto: asegúrate de que en img/asesor.jpg
  const fotoResp = await fetch("img/asesor.jpg");
  const fotoBlob = await fotoResp.blob();
  const fotoFile = new File([fotoBlob], "Israel_Ortiz.jpg", {
    type: fotoBlob.type,
  });

  // 5) Compartir con Web Share API o fallback
  const mensajeTexto =
    `Hola, te envío la ficha del Honda ${modelo} ${version} (Precio: ${precio}).\n\n` +
    `Aquí mis datos:\nIsrael Ortiz · Asesor de Ventas · Honda Montejo\n` +
    `Tel: +52 999 335 5514\nEmail: fortiz.hondamontejo@gmail.com`;

  if (
    navigator.canShare &&
    navigator.canShare({
      files: [new File([pdfBlob], nombrePdf), vcfFile, fotoFile],
    })
  ) {
    try {
      await navigator.share({
        title: `Ficha Honda ${modelo} ${version}`,
        text: mensajeTexto,
        files: [new File([pdfBlob], nombrePdf), vcfFile, fotoFile],
      });
      return;
    } catch (e) {
      console.warn("Share API error:", e);
    }
  }

  // 6) Fallback a WhatsApp Web/Móvil (solo texto)
  window.open(
    `https://wa.me/${tel}?text=${encodeURIComponent(mensajeTexto)}`,
    "_blank"
  );
}

function mostrarAbout() {
  document.getElementById("modal-about").classList.remove("hidden");
}
function cerrarAbout() {
  document.getElementById("modal-about").classList.add("hidden");
}
