import { auth, db, SETTINGS, COLLECTIONS, ORDERS } from "/firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.__adminReady = true;
const $ = s => document.querySelector(s);
const money = n => SETTINGS.currency + Number(n).toFixed(2);

/* ---------- Tasa (BCV de referencia + tu tasa) ----------
   Se carga aparte: si tasa.js falta o falla, el panel sigue funcionando igual. */
let TASA = 0, formatoBs = () => "", aBolivares = () => 0;
import("/tasa-admin.js").then(m => m.montarTasaAdmin($("#tasa-admin")))
  .catch(e => console.warn("Barra de tasa no disponible:", e));
import("/tasa.js").then(m => {
  formatoBs = m.formatoBs; aBolivares = m.aBolivares;
  m.escucharTasa(v => { TASA = v; renderProducts(); renderOrders(); });
}).catch(e => console.warn("tasa.js no disponible:", e));
// Bs. de un pedido: usa la tasa guardada en el pedido (la del momento en que se hizo)
const bsPedido = (o, usd) => o.tasa ? " · " + formatoBs(aBolivares(usd, o.tasa)) : "";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/* Categorías del panel: las de la tienda + "Adicionales" (estos no se muestran como productos en la tienda) */
const BEBIDAS = "Bebidas", COMBOS = "Combos", ADIC = "Adicionales", DELIV = "Delivery";
const CATS = { ...COLLECTIONS, [ADIC]: "adicionales", [DELIV]: "dc_delivery" };
const LABEL = { nuevo: "Pendiente de pago", confirmado: "Confirmado", entregado: "Entregado", cancelado: "Cancelado" };
let orders = [], products = [], unsubs = [], first = true; const byCol = {};

const banner = m => { $("#banner").textContent = m || ""; $("#banner").hidden = !m; };
const dbErr = (what, e) => banner(e.code === "permission-denied"
  ? `Sin permiso para leer ${what}. Publica las reglas de Firestore y entra con el correo de administrador que pusiste en las reglas.`
  : `Error al leer ${what}: ${e.message}`);
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2500); }

/* ---------- Sesión ---------- */
const AUTH_MSG = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.", "auth/invalid-email": "El correo no es válido.",
  "auth/unauthorized-domain": "Este dominio no está autorizado: agrégalo en Firebase → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "Activa el proveedor Email/Password en Firebase → Authentication.",
  "auth/network-request-failed": "Sin conexión a internet."
};
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#err").textContent = "";
  try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); }
  catch (x) { $("#err").textContent = AUTH_MSG[x.code] || ("Error: " + (x.code || x.message)); }
};
$("#logout").onclick = () => signOut(auth);
onAuthStateChanged(auth, u => {
  $("#login").hidden = !!u; $("#panel").hidden = !u;
  unsubs.forEach(f => f()); unsubs = []; banner("");
  if (u) start();
});
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x === b));
  $("#orders").hidden = b.dataset.t !== "orders"; $("#products").hidden = b.dataset.t !== "products";
});

function start() {
  first = true;
  unsubs.push(onSnapshot(query(collection(db, ORDERS), orderBy("createdAt", "desc"), limit(600)), snap => {
    banner("");
    if (!first && snap.docChanges().some(c => c.type === "added" && !c.doc.metadata.hasPendingWrites)) beep();
    first = false;
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderOrders();
  }, e => dbErr("los pedidos", e)));
  Object.entries(CATS).forEach(([label, col]) => {
    unsubs.push(onSnapshot(collection(db, col), snap => {
      byCol[label] = snap.docs.map(d => ({ id: d.id, col, ...d.data(), category: label }));
      products = Object.values(byCol).flat().sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      renderProducts(); renderComboPick();
    }, e => dbErr("los productos (" + label + ")", e)));
  });
}
function beep() {
  try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + .3); } catch {}
  toast("🔔 Nuevo pedido recibido");
}

/* ---------- Pedidos ---------- */
const fdate = o => { const d = o.createdAt?.toDate?.(); return d ? d.toLocaleString("es-VE") : "…"; };
const waNum = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "58" + d.slice(1); return d; };
const kind = o => ({ delivery: "Delivery", comer: "Comer aquí" })[o.delivery] || "Retiro en local";

/* Periodo: hoy / ayer / esta semana (desde el lunes) / este mes */
function rangoFechas(r) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dia = 864e5;
  if (r === "hoy") return [hoy, null];
  if (r === "ayer") return [new Date(hoy - dia), hoy];
  if (r === "semana") { const d = new Date(hoy); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d, null]; }
  if (r === "mes") return [new Date(hoy.getFullYear(), hoy.getMonth(), 1), null];
  return [null, null];
}
function renderOrders() {
  const f = $("#filter").value, q = $("#q").value.replace(/\D/g, "");
  const [desde, hasta] = rangoFechas($("#range").value);
  const list = orders.filter(o => {
    if (f && o.status !== f) return false;
    // Números diarios (#1, #2…): búsqueda exacta; números largos de pedidos viejos: por coincidencia
    if (q && !(q.length <= 4 ? String(o.number || "") === q : String(o.number || "").includes(q))) return false;
    const d = o.createdAt?.toDate?.();
    if (desde && (!d || d < desde)) return false;
    if (hasta && (!d || d >= hasta)) return false;
    return true;
  });
  const validos = list.filter(o => o.status !== "cancelado");
  const suma = validos.reduce((s, o) => s + Number(o.total || 0), 0);
  $("#osum").textContent = list.length
    ? `${list.length} pedido${list.length === 1 ? "" : "s"} · Vendido: ${money(suma)}${validos.some(o => o.totalBs) ? " · " + formatoBs(validos.reduce((s, o) => s + Number(o.totalBs || 0), 0)) : ""}`
    : "";
  $("#newCount").textContent = orders.filter(o => o.status === "nuevo").length || "";
  $("#ordersList").innerHTML = list.length ? list.map(o => {
    const paid = o.status === "confirmado" || o.status === "entregado";
    return `
    <article class="card st-${esc(o.status)}">
      <div class="h"><b>Pedido #${esc(o.number)}</b><span>${fdate(o)}</span><span class="st ${esc(o.status)}" style="flex:none">${LABEL[o.status] || esc(o.status)}</span></div>
      <p><b>${esc(o.customer?.name)}</b> · ${esc(o.customer?.phone)}<br><b>${kind(o)}</b>${o.delivery === "delivery" ? " · " + esc(o.customer?.address) : ""}${o.notes ? `<br><i>Notas: ${esc(o.notes)}</i>` : ""}</p>
      <ul>${(o.items || []).map(i => `<li><span>${esc(i.qty)} × ${esc(i.name)}${i.detail ? `<br><small style="color:#777">${esc(i.detail)}</small>` : ""}</span><span>${money(i.qty * i.price)}</span></li>`).join("")}</ul>
      <div class="f"><strong>Total ${money(o.total)}${bsPedido(o, o.total)}${o.tasa ? `<small style="font-weight:400;color:#777"> (tasa ${formatoBs(o.tasa)})</small>` : ""}</strong><span>
        ${o.status === "nuevo" ? `<button class="btn" data-a="confirm" data-id="${o.id}">Confirmar pedido (pago recibido)</button>` : ""}
        ${o.status === "confirmado" ? `<button class="btn ghost" data-a="done" data-id="${o.id}">Marcar entregado</button>` : ""}
        ${paid ? `<button class="btn" data-a="print" data-id="${o.id}">${EN_APP || ES_ANDROID ? "🖨️ Imprimir ticket" : "Imprimir factura"}</button>` : ""}
        <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/${waNum(o.customer?.phone)}">WhatsApp</a>
        ${o.status === "nuevo" ? `<button class="btn red" data-a="cancel" data-id="${o.id}">Cancelar</button>` : ""}
        <button class="btn red" data-a="del" data-id="${o.id}">Eliminar</button></span></div>
    </article>`;
  }).join("") : `<p class="mute">${orders.length ? "No hay pedidos con estos filtros." : "Aún no hay pedidos. Cuando un cliente pida desde la tienda, aparecerá aquí."}</p>`;
}
$("#filter").onchange = $("#range").onchange = renderOrders;
$("#q").oninput = renderOrders;
const setStatus = (id, status, extra = {}) => updateDoc(doc(db, ORDERS, id), { status, ...extra }).catch(x => toast("Error: " + x.message));
$("#ordersList").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const o = orders.find(x => x.id === b.dataset.id), a = b.dataset.a;
  if (a === "confirm" && confirm(`¿Confirmar que el pedido #${o.number} fue pagado?`)) setStatus(o.id, "confirmado", { confirmedAt: serverTimestamp() });
  if (a === "done") setStatus(o.id, "entregado");
  if (a === "cancel" && confirm(`¿Cancelar el pedido #${o.number}?`)) setStatus(o.id, "cancelado");
  if (a === "print") EN_APP ? imprimirApp(o) : ES_ANDROID ? imprimirRawBT(o) : printInvoice(o);
  if (a === "del" && confirm(`¿Eliminar el pedido #${o.number}? No se puede deshacer.`)) deleteDoc(doc(db, ORDERS, o.id)).catch(x => toast(x.message));
});

function printInvoice(o) {
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return alert("Permite las ventanas emergentes para imprimir.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Factura #${esc(o.number)}</title>
<style>body{font:13px/1.4 "Courier New",monospace;width:300px;margin:0 auto;padding:12px;color:#000}
.c{text-align:center}img{width:90px;border-radius:50%}h2{margin:6px 0 2px;font-size:17px}
hr{border:0;border-top:1px dashed #000;margin:10px 0}table{width:100%;border-collapse:collapse}
td{padding:3px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}
.t td{font-size:16px;font-weight:bold;padding-top:6px}@page{margin:6mm}</style></head><body>
<div class="c"><img src="${location.origin}/images/logo.png" alt=""><h2>${esc(SETTINGS.business)}</h2>
<div>Tel: ${esc(SETTINGS.phone)}</div></div><hr>
<div><b>FACTURA #${esc(o.number)}</b><br>Fecha: ${fdate(o)}<br>Cliente: ${esc(o.customer?.name)}<br>Tel: ${esc(o.customer?.phone)}<br>
Tipo: <b>${kind(o)}</b>${o.delivery === "delivery" ? `<br>Dirección: ${esc(o.customer?.address)}` : ""}</div><hr>
<table>${(o.items || []).map(i => `<tr><td>${esc(i.qty)} x ${esc(i.name)}${i.detail ? `<br>&nbsp;&nbsp;(${esc(i.detail)})` : ""}<br>&nbsp;&nbsp;${money(i.price)} c/u</td><td>${money(i.qty * i.price)}</td></tr>`).join("")}
<tr class="t"><td>TOTAL</td><td>${money(o.total)}</td></tr>
${o.tasa ? `<tr class="t"><td>TOTAL Bs.</td><td>${formatoBs(aBolivares(o.total, o.tasa))}</td></tr>` : ""}</table>
${o.notes ? `<hr><div>Notas: ${esc(o.notes)}</div>` : ""}<hr><div class="c">PAGO CONFIRMADO<br>¡Gracias por tu compra!</div></body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

/* ---------- Ticket para impresora térmica (tablet Android + app RawBT) ----------
   En Android, "Imprimir factura" manda el ticket directo a RawBT en formato ESC/POS:
   sin ventana de impresión y con el ancho exacto del rollo.
   TICKET_COLS: 32 para rollo de 58 mm (impresora 602-R58D) · 48 para rollo de 80 mm. */
const TICKET_COLS = 32;
// Las tablets abren Chrome en "modo escritorio" y se hacen pasar por PC; por eso se revisan varias señales.
// Dentro de la app "Panel Dondecamila": imprime directo por Bluetooth, en texto (como Zobaze)
const EN_APP = typeof window.DCPrinter !== "undefined";
const ES_ANDROID = /Android/i.test(navigator.userAgent)
  || navigator.userAgentData?.platform === "Android"
  || (/Linux/i.test(navigator.platform || navigator.userAgent) && navigator.maxTouchPoints > 1);
// Tabla PC850: la que usa la impresora 602-R58D por defecto (se vio en el ticket de Zobaze)
const CP437 = { "á": 0xA0, "é": 0x82, "í": 0xA1, "ó": 0xA2, "ú": 0xA3, "ñ": 0xA4, "Ñ": 0xA5, "ü": 0x81, "Ü": 0x9A,
  "Á": 0xB5, "É": 0x90, "Í": 0xD6, "Ó": 0xE0, "Ú": 0xE9, "¿": 0xA8, "¡": 0xAD, "°": 0xF8 };
function aBytes(str) {
  const out = [];
  for (const ch of String(str ?? "")) {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c < 127) out.push(c);
    else if (CP437[ch]) out.push(CP437[ch]);
    else if (/\s/.test(ch)) out.push(32);
    else for (const x of ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) out.push(x.charCodeAt(0) < 127 ? x.charCodeAt(0) : 63);
  }
  return out;
}
function partir(texto, ancho) {
  const lineas = []; let actual = "";
  for (let p of String(texto ?? "").split(/\s+/).filter(Boolean)) {
    while (p.length > ancho) { if (actual) { lineas.push(actual); actual = ""; } lineas.push(p.slice(0, ancho)); p = p.slice(ancho); }
    if (!p) continue;
    if (!actual) actual = p;
    else if ((actual + " " + p).length <= ancho) actual += " " + p;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}
function ticketBytes(o) {
  const W = TICKET_COLS, ESC = 0x1B, GS = 0x1D, B = [];
  const cmd = (...b) => B.push(...b);
  const ln = (s = "") => { B.push(...aBytes(s), 0x0A); };
  const sep = () => ln("-".repeat(W));
  const fila = (izq, der) => {
    const partes = partir(izq, W - der.length - 1);
    partes.forEach((p, i) => ln(i === 0 ? p.padEnd(W - der.length) + der : p));
  };
  const bloque = (texto, sangria = "") => partir(texto, W - sangria.length).forEach(l => ln(sangria + l));
  const centro = on => cmd(ESC, 0x61, on ? 1 : 0);
  const negrita = on => cmd(ESC, 0x45, on ? 1 : 0);
  const tamaño = n => cmd(GS, 0x21, n);   // 0 normal · 0x01 doble alto · 0x11 doble alto y ancho

  cmd(ESC, 0x40);                        // reiniciar impresora (queda en su tabla PC850: acentos y ñ)
  centro(true); negrita(true); tamaño(0x11); ln(SETTINGS.business); tamaño(0); negrita(false);
  ln("Tel: " + SETTINGS.phone);
  centro(false); sep();
  negrita(true); ln("FACTURA #" + o.number); negrita(false);
  ln("Fecha: " + fdate(o));
  bloque("Cliente: " + (o.customer?.name || ""));
  ln("Tel: " + (o.customer?.phone || ""));
  negrita(true); ln("Tipo: " + kind(o)); negrita(false);
  if (o.delivery === "delivery") bloque("Dirección: " + (o.customer?.address || ""));
  sep();
  (o.items || []).forEach(i => {
    fila(`${i.qty} x ${i.name}`, money(i.qty * i.price));
    if (i.detail) bloque("(" + i.detail + ")", "   ");
    if (i.qty > 1) ln("   " + money(i.price) + " c/u");
  });
  sep();
  negrita(true); tamaño(0x01);
  fila("TOTAL", money(o.total));
  if (o.tasa) fila("TOTAL Bs.", formatoBs(aBolivares(o.total, o.tasa)));
  tamaño(0); negrita(false);
  if (o.notes) { sep(); bloque("Notas: " + o.notes); }
  sep();
  centro(true); negrita(true); ln("PAGO CONFIRMADO"); negrita(false); ln("¡Gracias por tu compra!"); centro(false);
  cmd(ESC, 0x64, 4);                     // avanzar papel para poder arrancarlo (esta impresora no corta)
  return B;
}
/* Ticket en TEXTO SIMPLE: el mismo camino que usa la prueba de texto de RawBT.
   Sin comandos especiales ni imágenes, así funciona en cualquier impresora térmica.
   Las tildes y la ñ se quitan (Peña → Pena) porque esta impresora no las imprime bien. */
const sinAcentos = t => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\n]/g, "");
function ticketTexto(o) {
  const W = TICKET_COLS, L = [];
  const ln = (s = "") => L.push(sinAcentos(s));
  const sep = () => ln("-".repeat(W));
  const centro = s => { s = sinAcentos(s); ln(" ".repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s); };
  const fila = (izq, der) => partir(sinAcentos(izq), W - der.length - 1).forEach((p, i) => ln(i === 0 ? p.padEnd(W - der.length) + der : p));
  const bloque = (texto, sangria = "") => partir(sinAcentos(texto), W - sangria.length).forEach(l => ln(sangria + l));

  centro(String(SETTINGS.business).toUpperCase());
  centro("Tel: " + SETTINGS.phone);
  sep();
  ln("FACTURA #" + o.number);
  ln("Fecha: " + fdate(o));
  bloque("Cliente: " + (o.customer?.name || ""));
  ln("Tel: " + (o.customer?.phone || ""));
  ln("Tipo: " + kind(o));
  if (o.delivery === "delivery") bloque("Direccion: " + (o.customer?.address || ""));
  sep();
  (o.items || []).forEach(i => {
    fila(`${i.qty} x ${i.name}`, money(i.qty * i.price));
    if (i.detail) bloque("(" + i.detail + ")", "   ");
    if (i.qty > 1) ln("   " + money(i.price) + " c/u");
  });
  sep();
  fila("TOTAL", money(o.total));
  if (o.tasa) fila("TOTAL Bs.", formatoBs(aBolivares(o.total, o.tasa)));
  if (o.notes) { sep(); bloque("Notas: " + o.notes); }
  sep();
  centro("PAGO CONFIRMADO");
  centro("Gracias por tu compra!");
  ln(""); ln(""); ln("");
  return L.join("\n");
}
/* En la app: el ticket con comandos de impresora (negritas, letra grande, acentos y ñ) va directo por Bluetooth */
function imprimirApp(o) {
  const bytes = ticketBytes(o);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.slice(i, i + 4096));
  window.DCPrinter.imprimir(btoa(bin));
}
// Botón para cambiar de impresora (solo dentro de la app)
if (EN_APP) {
  const b = document.createElement("button");
  b.className = "btn ghost"; b.type = "button"; b.textContent = "🖨️ Impresora";
  b.title = "Elegir o cambiar la impresora Bluetooth";
  b.onclick = () => window.DCPrinter.elegir();
  $("#logout").before(b);
}

function imprimirRawBT(o) {
  // Si RawBT no está instalado, Android abre la Play Store para instalarlo
  location.href = "intent:" + encodeURIComponent(ticketTexto(o)) + "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
}

/* ---------- Subir producto ---------- */
const toData = file => new Promise((ok, fail) => {
  const r = new FileReader(); r.onerror = fail;
  r.onload = () => {
    const i = new Image(); i.onerror = fail;
    i.onload = () => {
      const s = Math.min(1, 900 / Math.max(i.width, i.height)), c = document.createElement("canvas");
      c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
      c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
      ok(c.toDataURL("image/jpeg", .8));
    };
    i.src = r.result;
  };
  r.readAsDataURL(file);
});
const F = () => $("#pform").elements;
// Orden del selector: productos normales primero; luego Combos, Bebidas y Adicionales
const ESPECIALES = [COMBOS, BEBIDAS, ADIC, DELIV];
F().cat.innerHTML = [...Object.keys(CATS).filter(c => !ESPECIALES.includes(c)), ...ESPECIALES.filter(c => CATS[c])]
  .map(c => `<option>${esc(c)}</option>`).join("");

/* Campos según la categoría:
   - Bebidas: nombre, precio, agotado, visible
   - Adicionales: solo nombre y precio
   - Combos: todo + elegir los productos que incluye */
function camposSegunCategoria() {
  const c = F().cat.value, isB = c === BEBIDAS, isD = c === DELIV, isA = c === ADIC || isD, isC = c === COMBOS;
  const ocultar = (el, h) => el.closest("label").hidden = h;
  [F().desc, F().badge, F().img].forEach(el => ocultar(el, isB || isA));
  [F().sold, F().act].forEach(el => ocultar(el, isA));
  ocultar(F().extras, isB || isA);
  $("#comboBox").hidden = !isC;
  if (isB || isA) $("#preview").hidden = true;
  F().n.placeholder = isB ? "Ej: Pepsi-Cola 2 litros" : isD ? "Ej: Zona Centro" : isA ? "Ej: Papas extra" : isC ? "Ej: Combo Familiar" : "";
  $("#saveBtn").textContent = isD ? "Guardar delivery" : isA ? "Guardar adicional" : isC ? "Guardar combo" : "Guardar producto";
  if (isC) renderComboPick();
}
F().cat.onchange = camposSegunCategoria;

/* Selector de productos del combo */
let comboSel = {};   // { idProducto: cantidad }
function renderComboPick() {
  const box = $("#comboPick"); if (!box || $("#comboBox").hidden) return;
  const elegibles = products.filter(p => p.category !== COMBOS && p.category !== ADIC && p.category !== DELIV)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  box.innerHTML = elegibles.length ? elegibles.map(p => {
    const q = comboSel[p.id] || 0;
    return `<div class="cp${q ? " on" : ""}"><span><b>${esc(p.name)}</b><small>${esc(p.category)} · ${money(p.price)}</small></span>
      <span class="cpq">${q ? `<button type="button" data-cp="-" data-id="${p.id}">−</button><b>${q}</b>` : ""}<button type="button" class="plus" data-cp="+" data-id="${p.id}">+</button></span></div>`;
  }).join("") : '<p class="mute" style="padding:12px">Primero sube productos para poder armar combos.</p>';
  const sel = Object.entries(comboSel).filter(([, q]) => q > 0);
  const separado = sel.reduce((s, [id, q]) => s + (products.find(p => p.id === id)?.price || 0) * q, 0);
  $("#comboSum").textContent = sel.length
    ? `${sel.reduce((s, [, q]) => s + q, 0)} producto(s) · Precio por separado: ${money(separado)}. Pon un precio menor para que el cliente vea cuánto ahorra.`
    : "Toca + para agregar productos al combo.";
}
$("#comboPick").addEventListener("click", e => {
  const b = e.target.closest("[data-cp]"); if (!b) return;
  const id = b.dataset.id;
  comboSel[id] = Math.max(0, Math.min(20, (comboSel[id] || 0) + (b.dataset.cp === "+" ? 1 : -1)));
  if (!comboSel[id]) delete comboSel[id];
  renderComboPick();
});
camposSegunCategoria();

function renderProducts() {
  $("#plist").innerHTML = products.length ? products.map(p => `
    <div class="prow">${p.image ? `<img src="${p.image}" alt="">` : '<div class="ph"></div>'}
      <div class="t"><b>${esc(p.name)}</b> <span class="pill">${esc(p.category)}</span>${p.soldOut ? '<span class="pill">Agotado</span>' : ""}${p.active === false ? '<span class="pill">Oculto</span>' : ""}${p.extras ? '<span class="pill">+ Adicionales</span>' : ""}<br><small>${money(p.price)}${TASA ? " · " + formatoBs(aBolivares(p.price, TASA)) : ""}${p.items?.length ? " · Incluye: " + esc(p.items.map(i => i.qty + " " + i.name).join(", ")) : ""}</small></div>
      <div class="a"><button class="btn ghost" data-a="edit" data-id="${p.id}">Editar</button>
        ${p.category === ADIC || p.category === DELIV ? "" : `<button class="btn ghost" data-a="sold" data-id="${p.id}">${p.soldOut ? "Marcar disponible" : "Marcar agotado"}</button>`}
        <button class="btn red" data-a="del" data-id="${p.id}">Eliminar</button></div></div>`).join("") : '<p class="mute">Aún no hay productos. Sube el primero con el formulario de arriba.</p>';
}
function resetForm() {
  $("#pform").reset(); F().pid.value = ""; $("#preview").hidden = true;
  $("#ptitle").textContent = "Nuevo producto"; $("#cancelEdit").hidden = true;
  comboSel = {}; camposSegunCategoria();
}
$("#cancelEdit").onclick = resetForm;
F().img.onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  $("#preview").src = URL.createObjectURL(f); $("#preview").hidden = false;
};
$("#pform").onsubmit = async e => {
  e.preventDefault();
  const f = e.target.elements, id = f.pid.value, btn = $("#saveBtn"); btn.disabled = true;
  const cat = f.cat.value;
  let data = {
    name: f.n.value.trim(), category: cat, price: parseFloat(f.price.value),
    description: f.desc.value.trim(), badge: f.badge.value.trim(), soldOut: f.sold.checked, active: f.act.checked,
    extras: f.extras.checked
  };
  try {
    if (cat === ADIC || cat === DELIV) data = { name: data.name, category: cat, price: data.price };
    else if (cat === BEBIDAS) Object.assign(data, { description: "", badge: "", image: "", extras: false });
    else if (f.img.files[0]) data.image = await toData(f.img.files[0]);
    if (cat === COMBOS) {
      data.items = Object.entries(comboSel).filter(([, q]) => q > 0).map(([pid, qty]) => {
        const p = products.find(x => x.id === pid); return { id: pid, name: p?.name || "", qty };
      }).filter(i => i.name);
      if (!data.items.length) { alert("Agrega al menos un producto al combo."); btn.disabled = false; return; }
    }
    const col = CATS[cat];
    if (id) {
      const old = products.find(x => x.id === id);
      if (old.col === col) await updateDoc(doc(db, col, id), data);
      else {
        await addDoc(collection(db, col), { image: old.image || "", ...data, createdAt: old.createdAt || serverTimestamp() });
        await deleteDoc(doc(db, old.col, id));
      }
    } else await addDoc(collection(db, col), { image: "", ...data, createdAt: serverTimestamp() });
    resetForm(); toast(cat === DELIV ? "Delivery guardado: ya se ofrece al pedir" : cat === ADIC ? "Adicional guardado" : cat === COMBOS ? "Combo guardado: ya aparece en la tienda" : "Producto guardado: ya aparece en la tienda");
  } catch (err) { alert("No se pudo guardar: " + err.message); }
  btn.disabled = false;
};
$("#plist").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const p = products.find(x => x.id === b.dataset.id);
  if (b.dataset.a === "sold") updateDoc(doc(db, p.col, p.id), { soldOut: !p.soldOut }).catch(x => toast(x.message));
  if (b.dataset.a === "del" && confirm(`¿Eliminar "${p.name}"?`)) deleteDoc(doc(db, p.col, p.id)).catch(x => toast(x.message));
  if (b.dataset.a === "edit") {
    const f = F(); f.pid.value = p.id; f.n.value = p.name; f.cat.value = p.category; f.price.value = p.price;
    f.desc.value = p.description || ""; f.badge.value = p.badge || ""; f.sold.checked = !!p.soldOut; f.act.checked = p.active !== false;
    f.extras.checked = !!p.extras;
    comboSel = Object.fromEntries((p.items || []).map(i => [i.id, i.qty]));
    $("#preview").hidden = true;
    if (p.image) { $("#preview").src = p.image; $("#preview").hidden = false; }
    camposSegunCategoria();
    $("#ptitle").textContent = "Editando: " + p.name; $("#cancelEdit").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
