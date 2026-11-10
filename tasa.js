// tasa.js — Tasa BCV (referencia) y tu tasa (la que se aplica a los precios).
// Va en la raíz del proyecto, junto a firebase-config.js y app.js.
import { db } from "./firebase-config.js";
import {
  doc, onSnapshot, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Documento único en Firestore donde se guarda tu tasa
const REF_TASA = doc(db, "dc_config", "tasa");

/* ---------- BCV (solo referencia) ---------- */
export async function obtenerBCV() {
  const r = await fetch("/api/bcv");
  if (!r.ok) throw new Error("BCV no disponible");
  return r.json(); // { tasa, fecha, fuente }
}

/* ---------- Tu tasa ---------- */
// Escucha la tasa en tiempo real: cada vez que la cambias en el panel,
// la tienda se actualiza sola sin recargar.
export function escucharTasa(callback) {
  return onSnapshot(REF_TASA, (snap) => {
    const valor = snap.exists() ? Number(snap.data().valor) : 0;
    callback(valor > 0 ? valor : 0);
  }, () => callback(0));
}

export async function guardarTasa(valor) {
  const n = Number(String(valor).replace(",", "."));
  if (!n || n <= 0) throw new Error("Tasa inválida");
  await setDoc(REF_TASA, { valor: n, actualizado: serverTimestamp() });
  return n;
}

/* ---------- Formato de precios ---------- */
const fmtBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatoUSD = (usd) => "$" + fmtUsd.format(Number(usd) || 0);
export const formatoBs = (bs) => "Bs. " + fmtBs.format(Number(bs) || 0);

// Bolívares = precio en $ × tu tasa
export const aBolivares = (usd, tasa) => (Number(usd) || 0) * (Number(tasa) || 0);

// Texto listo para mostrar: "$10.00 · Bs. 3.650,00" (solo $ si aún no hay tasa)
export function precioDoble(usd, tasa) {
  if (!tasa) return formatoUSD(usd);
  return formatoUSD(usd) + " · " + formatoBs(aBolivares(usd, tasa));
}
