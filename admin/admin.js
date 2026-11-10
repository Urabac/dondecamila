import { auth, db, SETTINGS, COLLECTIONS, ORDERS } from "/firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const money = n => SETTINGS.currency + Number(n).toFixed(2);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
  unsubs.push(onSnapshot(query(collection(db, ORDERS), orderBy("createdAt", "desc"), limit(200)), snap => {
    banner("");
    if (!first && snap.docChanges().some(c => c.type === "added" && !c.doc.metadata.hasPendingWrites)) beep();
    first = false;
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderOrders();
  }, e => dbErr("los pedidos", e)));
  Object.entries(COLLECTIONS).forEach(([label, col]) => {
    unsubs.push(onSnapshot(collection(db, col), snap => {
      byCol[label] = snap.docs.map(d => ({ id: d.id, col, ...d.data(), category: label }));
      products = Object.values(byCol).flat().sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      renderProducts();
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
const kind = o => o.delivery === "delivery" ? "Delivery" : "Retiro en local";

function renderOrders() {
  const f = $("#filter").value, list = orders.filter(o => !f || o.status === f);
  $("#newCount").textContent = orders.filter(o => o.status === "nuevo").length || "";
  $("#ordersList").innerHTML = list.length ? list.map(o => {
    const paid = o.status === "confirmado" || o.status === "entregado";
    return `
    <article class="card st-${esc(o.status)}">
      <div class="h"><b>Pedido #${esc(o.number)}</b><span>${fdate(o)}</span><span class="st ${esc(o.status)}" style="flex:none">${LABEL[o.status] || esc(o.status)}</span></div>
      <p><b>${esc(o.customer?.name)}</b> · ${esc(o.customer?.phone)}<br><b>${kind(o)}</b>${o.delivery === "delivery" ? " · " + esc(o.customer?.address) : ""}${o.notes ? `<br><i>Notas: ${esc(o.notes)}</i>` : ""}</p>
      <ul>${(o.items || []).map(i => `<li><span>${esc(i.qty)} × ${esc(i.name)}</span><span>${money(i.qty * i.price)}</span></li>`).join("")}</ul>
      <div class="f"><strong>Total ${money(o.total)}</strong><span>
        ${o.status === "nuevo" ? `<button class="btn" data-a="confirm" data-id="${o.id}">Confirmar pedido (pago recibido)</button>` : ""}
        ${o.status === "confirmado" ? `<button class="btn ghost" data-a="done" data-id="${o.id}">Marcar entregado</button>` : ""}
        ${paid ? `<button class="btn" data-a="print" data-id="${o.id}">Imprimir factura</button>` : ""}
        <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/${waNum(o.customer?.phone)}">WhatsApp</a>
        ${o.status === "nuevo" ? `<button class="btn red" data-a="cancel" data-id="${o.id}">Cancelar</button>` : ""}
        <button class="btn red" data-a="del" data-id="${o.id}">Eliminar</button></span></div>
    </article>`;
  }).join("") : '<p class="mute">Aún no hay pedidos. Cuando un cliente pida desde la tienda, aparecerá aquí.</p>';
}
$("#filter").onchange = renderOrders;
const setStatus = (id, status, extra = {}) => updateDoc(doc(db, ORDERS, id), { status, ...extra }).catch(x => toast("Error: " + x.message));
$("#ordersList").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const o = orders.find(x => x.id === b.dataset.id), a = b.dataset.a;
  if (a === "confirm" && confirm(`¿Confirmar que el pedido #${o.number} fue pagado?`)) setStatus(o.id, "confirmado", { confirmedAt: serverTimestamp() });
  if (a === "done") setStatus(o.id, "entregado");
  if (a === "cancel" && confirm(`¿Cancelar el pedido #${o.number}?`)) setStatus(o.id, "cancelado");
  if (a === "print") printInvoice(o);
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
<table>${(o.items || []).map(i => `<tr><td>${esc(i.qty)} x ${esc(i.name)}<br>&nbsp;&nbsp;${money(i.price)} c/u</td><td>${money(i.qty * i.price)}</td></tr>`).join("")}
<tr class="t"><td>TOTAL</td><td>${money(o.total)}</td></tr></table>
${o.notes ? `<hr><div>Notas: ${esc(o.notes)}</div>` : ""}<hr><div class="c">PAGO CONFIRMADO<br>¡Gracias por tu compra!</div></body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
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
F().cat.innerHTML = Object.keys(COLLECTIONS).map(c => `<option>${esc(c)}</option>`).join("");

function renderProducts() {
  $("#plist").innerHTML = products.length ? products.map(p => `
    <div class="prow">${p.image ? `<img src="${p.image}" alt="">` : '<div class="ph"></div>'}
      <div class="t"><b>${esc(p.name)}</b> <span class="pill">${esc(p.category)}</span>${p.soldOut ? '<span class="pill">Agotado</span>' : ""}${p.active === false ? '<span class="pill">Oculto</span>' : ""}<br><small>${money(p.price)}</small></div>
      <div class="a"><button class="btn ghost" data-a="edit" data-id="${p.id}">Editar</button>
        <button class="btn ghost" data-a="sold" data-id="${p.id}">${p.soldOut ? "Marcar disponible" : "Marcar agotado"}</button>
        <button class="btn red" data-a="del" data-id="${p.id}">Eliminar</button></div></div>`).join("") : '<p class="mute">Aún no hay productos. Sube el primero con el formulario de arriba.</p>';
}
function resetForm() {
  $("#pform").reset(); F().pid.value = ""; $("#preview").hidden = true;
  $("#ptitle").textContent = "Nuevo producto"; $("#cancelEdit").hidden = true;
}
$("#cancelEdit").onclick = resetForm;
F().img.onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  $("#preview").src = URL.createObjectURL(f); $("#preview").hidden = false;
};
$("#pform").onsubmit = async e => {
  e.preventDefault();
  const f = e.target.elements, id = f.pid.value, btn = $("#saveBtn"); btn.disabled = true;
  const data = {
    name: f.n.value.trim(), category: f.cat.value, price: parseFloat(f.price.value),
    description: f.desc.value.trim(), badge: f.badge.value.trim(), soldOut: f.sold.checked, active: f.act.checked
  };
  try {
    if (f.img.files[0]) data.image = await toData(f.img.files[0]);
    const col = COLLECTIONS[f.cat.value];
    if (id) {
      const old = products.find(x => x.id === id);
      if (old.col === col) await updateDoc(doc(db, col, id), data);
      else {
        await addDoc(collection(db, col), { image: old.image || "", ...data, createdAt: old.createdAt || serverTimestamp() });
        await deleteDoc(doc(db, old.col, id));
      }
    } else await addDoc(collection(db, col), { image: "", ...data, createdAt: serverTimestamp() });
    resetForm(); toast("Producto guardado: ya aparece en la tienda");
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
    if (p.image) { $("#preview").src = p.image; $("#preview").hidden = false; }
    $("#ptitle").textContent = "Editando: " + p.name; $("#cancelEdit").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
