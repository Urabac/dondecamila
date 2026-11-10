import { auth, db, SETTINGS, COLLECTIONS } from "/firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const money = n => SETTINGS.currency + Number(n).toFixed(2);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ST = ["nuevo", "preparando", "en camino", "entregado", "cancelado"];
let orders = [], products = [], unsubs = [], first = true; const byCol = {};

/* ---------- Sesión ---------- */
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#err").textContent = "";
  try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); }
  catch { $("#err").textContent = "Correo o contraseña incorrectos."; }
};
$("#logout").onclick = () => signOut(auth);
onAuthStateChanged(auth, u => {
  $("#login").hidden = !!u; $("#panel").hidden = !u;
  unsubs.forEach(f => f()); unsubs = [];
  if (u) start();
});
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("on", x === b));
  $("#orders").hidden = b.dataset.t !== "orders"; $("#products").hidden = b.dataset.t !== "products";
});

function start() {
  first = true;
  unsubs.push(onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200)), snap => {
    if (!first && snap.docChanges().some(c => c.type === "added" && !c.doc.metadata.hasPendingWrites)) beep();
    first = false;
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderOrders();
  }, e => toast("Error al leer pedidos: " + e.message)));
  Object.entries(COLLECTIONS).forEach(([label, col]) => {
    unsubs.push(onSnapshot(collection(db, col), snap => {
      byCol[label] = snap.docs.map(d => ({ id: d.id, col, ...d.data(), category: label }));
      products = Object.values(byCol).flat().sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      renderProducts();
    }, e => toast("Error al leer " + label + ": " + e.message)));
  });
}

function beep() {
  try { const a = new AudioContext(), o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + .3); } catch {}
  toast("🔔 Nuevo pedido recibido");
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2500); }

/* ---------- Pedidos ---------- */
const fdate = o => { const d = o.createdAt?.toDate?.(); return d ? d.toLocaleString("es-VE") : "…"; };
const waNum = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "58" + d.slice(1); return d; };

function renderOrders() {
  const f = $("#filter").value, list = orders.filter(o => !f || o.status === f);
  $("#newCount").textContent = orders.filter(o => o.status === "nuevo").length || "";
  $("#ordersList").innerHTML = list.length ? list.map(o => `
    <article class="card st-${esc(o.status).replace(" ", "")}">
      <div class="h"><b>Pedido #${esc(o.number)}</b><span>${fdate(o)}</span>
        <select class="status" data-id="${o.id}">${ST.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <p><b>${esc(o.customer?.name)}</b> · ${esc(o.customer?.phone)}<br>${esc(o.customer?.address)}${o.notes ? `<br><i>Notas: ${esc(o.notes)}</i>` : ""}</p>
      <ul>${(o.items || []).map(i => `<li><span>${esc(i.qty)} × ${esc(i.name)}</span><span>${money(i.qty * i.price)}</span></li>`).join("")}</ul>
      <div class="f"><strong>Total ${money(o.total)}</strong><span>
        <button class="btn" data-a="print" data-id="${o.id}">Imprimir factura</button>
        <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/${waNum(o.customer?.phone)}">WhatsApp</a>
        <button class="btn red" data-a="del" data-id="${o.id}">Eliminar</button></span></div>
    </article>`).join("") : '<p class="mute">No hay pedidos.</p>';
}
$("#filter").onchange = renderOrders;
$("#ordersList").addEventListener("change", e => {
  if (e.target.classList.contains("status")) updateDoc(doc(db, "orders", e.target.dataset.id), { status: e.target.value }).catch(x => toast(x.message));
});
$("#ordersList").addEventListener("click", async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const o = orders.find(x => x.id === b.dataset.id);
  if (b.dataset.a === "print") printInvoice(o);
  if (b.dataset.a === "del" && confirm(`¿Eliminar el pedido #${o.number}?`)) deleteDoc(doc(db, "orders", o.id)).catch(x => toast(x.message));
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
<div><b>FACTURA / PEDIDO #${esc(o.number)}</b><br>Fecha: ${fdate(o)}<br>Cliente: ${esc(o.customer?.name)}<br>Tel: ${esc(o.customer?.phone)}<br>Dirección: ${esc(o.customer?.address)}</div><hr>
<table>${(o.items || []).map(i => `<tr><td>${esc(i.qty)} x ${esc(i.name)}</td><td>${money(i.qty * i.price)}</td></tr>`).join("")}
<tr class="t"><td>TOTAL</td><td>${money(o.total)}</td></tr></table>
${o.notes ? `<hr><div>Notas: ${esc(o.notes)}</div>` : ""}<hr><div class="c">¡Gracias por tu compra!</div></body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

/* ---------- Productos ---------- */
const toData = file => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onerror = fail;
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
        <button class="btn red" data-a="del" data-id="${p.id}">Eliminar</button></div></div>`).join("") : '<p class="mute">Aún no hay productos. Crea el primero arriba.</p>';
}
function resetForm() {
  $("#pform").reset(); F().pid.value = ""; $("#preview").hidden = true;
  $("#ptitle").textContent = "Nuevo producto"; $("#cancelEdit").hidden = true;
}
$("#cancelEdit").onclick = resetForm;
$("#pform").elements.img.onchange = e => {
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
      else { // cambió de categoría: se mueve a la otra colección
        await addDoc(collection(db, col), { image: old.image || "", ...data, createdAt: old.createdAt || serverTimestamp() });
        await deleteDoc(doc(db, old.col, id));
      }
    } else await addDoc(collection(db, col), { image: "", ...data, createdAt: serverTimestamp() });
    resetForm(); toast("Producto guardado");
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
