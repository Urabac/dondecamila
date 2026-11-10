import { db } from "./firebase-config.js";
import { doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const REF_TASA = doc(db, "dc_config", "tasa");

export async function obtenerBCV() {
  const r = await fetch("/api/bcv");
  if (!r.ok) throw new Error("BCV no disponible");
  return r.json();
}

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

const fmtBs = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatoBs = (bs) => "Bs. " + fmtBs.format(Number(bs) || 0);
export const aBolivares = (usd, tasa) => (Number(usd) || 0) * (Number(tasa) || 0);
