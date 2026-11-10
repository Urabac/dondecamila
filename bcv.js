// api/bcv.js — Función de Vercel: devuelve la tasa oficial del BCV.
// Se publica sola en https://TU-DOMINIO/api/bcv al subir esta carpeta "api" a la raíz del proyecto.
// Vercel guarda la respuesta 5 minutos en caché para no saturar la fuente.

const FUENTE = "https://ve.dolarapi.com/v1/dolares/oficial";

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(FUENTE, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("La fuente respondió " + r.status);
    const d = await r.json();

    const tasa = Number(d.promedio ?? d.precio ?? d.venta);
    if (!tasa || isNaN(tasa)) throw new Error("Respuesta sin tasa");

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({
      tasa,
      fecha: d.fechaActualizacion || new Date().toISOString(),
      fuente: "BCV"
    });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "No se pudo obtener la tasa BCV", detalle: String(e.message || e) });
  }
};
