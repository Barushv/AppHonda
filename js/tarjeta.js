// ==============================
// MI TARJETA — QR con tu contacto (vCard) y envío de tus datos
// ==============================
import { $, abrirHoja, toast } from "./ui.js";
import { ASESOR } from "./config.js";
import { buildWaNumber, codificarMensaje } from "./vehiculos.js";

/** +529993355514 → +52 999 335 5514 */
const telefonoBonito = (t) => t.replace(/^\+(\d{2})(\d{3})(\d{3})(\d{4})$/, "+$1 $2 $3 $4");

function vCard() {
  const [nombre, ...apellidos] = ASESOR.nombre.split(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:" + apellidos.join(" ") + ";" + nombre + ";;;",
    "FN:" + ASESOR.nombre,
    "ORG:" + ASESOR.agencia,
    "TITLE:" + ASESOR.puesto,
    "TEL;TYPE=CELL:" + ASESOR.telefono,
    "EMAIL:" + ASESOR.correo,
    "URL:https://" + ASESOR.facebook,
    "ADR;TYPE=WORK:;;" + ASESOR.agencia + ";" + ASESOR.ciudad + ";" + ASESOR.estado + ";;México",
    "END:VCARD",
  ].join("\r\n");
}

function pintarQR() {
  const cont = $("#tj-qr");
  if (cont.firstChild || !window.qrcode) return;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"]; // acentos (Mérida, Yucatán)
  const qr = qrcode(0, "M");
  qr.addData(vCard(), "Byte");
  qr.make();
  cont.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

function mensajeDatos() {
  return [
    "\u{1F44B} Hola, soy *" + ASESOR.nombre + "*, " + ASESOR.puesto.toLowerCase() + " en *" + ASESOR.agencia + "*.",
    "",
    "\u{1F4F1} WhatsApp: " + telefonoBonito(ASESOR.telefono),
    "✉️ Correo: " + ASESOR.correo,
    "\u{1F4D8} Facebook: " + ASESOR.facebook,
    "\u{1F4CD} " + ASESOR.agencia + ", " + ASESOR.ciudad,
    "",
    "Guarda mi contacto y escríbeme cuando gustes, estoy a tus órdenes.",
  ].join("\n");
}

function enviarPorWhatsApp() {
  // Si hay un cliente capturado en Vehículos, va directo a su chat; si no, WhatsApp pide elegir el chat
  const tel = ($("#telefono-cliente")?.value || "").trim();
  const numero = tel.replace(/\D/g, "").length >= 10 ? buildWaNumber(tel) : "";
  const url = "https://wa.me/" + numero + "?text=" + codificarMensaje(mensajeDatos());
  const w = window.open(url, "_blank");
  if (!w) location.href = url;
}

async function compartirVcf() {
  const nombreArchivo = ASESOR.nombre.replace(/\s+/g, "_") + ".vcf";
  const archivo = new File([vCard()], nombreArchivo, { type: "text/vcard" });
  try {
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: ASESOR.nombre });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }
  // Computadora o navegador sin compartir: se descarga el archivo
  const url = URL.createObjectURL(archivo);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombreArchivo });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Contacto descargado", "success");
}

export function iniciarTarjeta() {
  $("#tj-foto").src = ASESOR.foto;
  $("#tj-foto").alt = ASESOR.nombre;
  $("#tj-nombre").textContent = ASESOR.nombre;
  $("#tj-puesto").textContent = ASESOR.puesto + " · " + ASESOR.agencia + ", " + ASESOR.ciudad;
  $("#tj-tel").href = "tel:" + ASESOR.telefono;
  $("#tj-mail").href = "mailto:" + ASESOR.correo;

  $("#btn-mi-tarjeta").addEventListener("click", () => {
    pintarQR();
    abrirHoja($("#sheet-tarjeta"));
  });
  $("#tj-wa").addEventListener("click", enviarPorWhatsApp);
  $("#tj-vcf").addEventListener("click", compartirVcf);
}
