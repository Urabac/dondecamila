module.exports = async function handler(req, res) {
  try {
    const r = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!r.ok) throw new Error("Fuente respondió " + r.status);
    const d = await r.json();
    const tasa = Number(d.promedio ?? d.precio ?? d.venta);
    if (!tasa) throw new Error("Sin tasa");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ tasa, fecha: d.fechaActualizacion || new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ error: "No se pudo obtener la tasa BCV" });
  }
};
