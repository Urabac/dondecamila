import { db, SETTINGS, COLLECTIONS, ORDERS } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const { whatsapp, currency, business } = SETTINGS;
const money = n => currency + Number(n).toFixed(2);
let PRODUCTS = [], category = "Todos", term = "", cart = {};

try { cart = JSON.parse(localStorage.getItem("dc-cart")) || {}; } catch (e) {}
const save = () => { try { localStorage.setItem("dc-cart", JSON.stringify(cart)); } catch (e) {} };
$("#contactLink").href = $("#waFloat").href = `https://wa.me/${whatsapp}`;
$("#empty").hidden = false; $("#empty").textContent = "Cargando menú…";

/* Productos en vivo: solo de las colecciones definidas en COLLECTIONS */
const LABELS = Object.keys(COLLECTIONS), byCol = {};
LABELS.forEach(label => {
  onSnapshot(collection(db, COLLECTIONS[label]), snap => {
    byCol[label] = snap.docs.map(d => ({ id: d.id, col: COLLECTIONS[label], ...d.data(), category: label }));
    PRODUCTS = LABELS.flatMap(l => (byCol[l] || []).slice().sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0)))
      .filter(p => p.active !== false);
    renderChips(); renderGrid(); renderCart();
  }, err => {
    console.error(err);
    $("#empty").hidden = false; $("#empty").textContent = "No se pudo cargar el menú. Intenta de nuevo en unos minutos.";
  });
});

function renderChips() {
  const cats = ["Todos", ...LABELS.filter(l => PRODUCTS.some(p => p.category === l))];
  if (!cats.includes(category)) category = "Todos";
  $("#chips").innerHTML = cats.map(c => `<button class="chip${c === category ? " on" : ""}" data-c="${c}">${c}</button>`).join("");
}
$("#chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  category = b.dataset.c; renderChips(); renderGrid();
});
$("#search").addEventListener("input", e => { term = e.target.value.trim().toLowerCase(); renderGrid(); });

function renderGrid() {
  const list = PRODUCTS.filter(p =>
    (category === "Todos" || p.category === category) &&
    [p.name, p.category, p.description].join(" ").toLowerCase().includes(term));
  $("#count").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
  $("#empty").hidden = list.length > 0;
  $("#empty").textContent = PRODUCTS.length ? "No encontramos productos con esa búsqueda." : "Pronto tendremos productos disponibles.";
  $("#grid").innerHTML = list.map(p => `
    <article class="card${p.soldOut ? " sold" : ""}">
      <div class="img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : ""}
        ${p.soldOut ? '<span class="tag dark">Agotado</span>' : p.badge ? `<span class="tag">${p.badge}</span>` : ""}
      </div>
      <div class="info">
        <small>${p.category || ""}</small>
        <h4>${p.name}</h4>
        <p>${p.description || ""}</p>
        <div class="row"><strong>${money(p.price)}</strong>
          <button class="add" data-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Agotado" : "Agregar"}</button>
        </div>
      </div>
    </article>`).join("");
}
$("#grid").addEventListener("click", e => {
  const b = e.target.closest(".add"); if (!b || b.disabled) return;
  cart[b.dataset.id] = (cart[b.dataset.id] || 0) + 1;
  save(); renderCart(); toast("Agregado al pedido");
});

/* Carrito */
const cartItems = () => Object.entries(cart)
  .map(([id, q]) => ({ p: PRODUCTS.find(x => x.id === id), q }))
  .filter(i => i.p && !i.p.soldOut);

function renderCart() {
  const items = cartItems();
  const count = items.reduce((s, i) => s + i.q, 0);
  const total = items.reduce((s, i) => s + i.q * i.p.price, 0);
  $("#cartCount").textContent = count;
  $("#total").textContent = money(total);
  $("#checkout").style.display = count ? "" : "none";
  $("#cartItems").innerHTML = count ? items.map(({ p, q }) => `
    <div class="line">
      <div><b>${p.name}</b><small>${money(p.price)} c/u</small></div>
      <div class="qty"><button data-a="-" data-id="${p.id}">−</button><span>${q}</span><button data-a="+" data-id="${p.id}">+</button></div>
    </div>`).join("") : '<p class="empty-cart">Tu pedido está vacío. Agrega algo del menú.</p>';
}
$("#cartItems").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const id = b.dataset.id; cart[id] = (cart[id] || 0) + (b.dataset.a === "+" ? 1 : -1);
  if (cart[id] <= 0) delete cart[id];
  save(); renderCart();
});
document.querySelectorAll('input[name="mode"]').forEach(r => r.onchange = () => {
  const d = document.querySelector('input[name="mode"]:checked').value === "delivery";
  $("#address").hidden = !d; $("#address").required = d;
});
$("#clearCart").onclick = () => { cart = {}; save(); renderCart(); };

const drawer = open => {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", !open);
  $("#overlay").hidden = !open;
};
$("#openCart").onclick = () => drawer(true);
$("#closeCart").onclick = $("#overlay").onclick = () => drawer(false);
document.addEventListener("keydown", e => e.key === "Escape" && drawer(false));

/* Enviar pedido: se guarda en Firestore y se abre WhatsApp */
$("#checkout").addEventListener("submit", async e => {
  e.preventDefault();
  const items = cartItems(); if (!items.length) return;
  const f = new FormData(e.target);
  const mode = f.get("mode") === "delivery" ? "delivery" : "retiro";
  const total = items.reduce((s, i) => s + i.q * i.p.price, 0);
  const number = String(Date.now()).slice(-6);
  const order = {
    number, status: "nuevo", total, delivery: mode,
    customer: { name: f.get("name"), phone: f.get("phone"), address: mode === "delivery" ? f.get("address") : "" },
    notes: f.get("notes") || "",
    items: items.map(i => ({ id: i.p.id, name: i.p.name, price: i.p.price, qty: i.q })),
    createdAt: serverTimestamp()
  };
  const msg = [
    `*Nuevo pedido #${number} - ${business}*`, "",
    ...order.items.map(i => `• ${i.qty} x ${i.name} — ${money(i.qty * i.price)}`), "",
    `*Total: ${money(total)}*`, "",
    `Nombre: ${order.customer.name}`, `Teléfono: ${order.customer.phone}`,
    `Tipo: ${mode === "delivery" ? "Delivery" : "Retiro en local"}`,
    ...(mode === "delivery" ? [`Dirección: ${order.customer.address}`] : []),
    order.notes ? `Notas: ${order.notes}` : ""
  ].join("\n");
  const w = window.open("", "_blank");           // se abre antes del await para evitar bloqueos
  const btn = e.target.querySelector(".send"); btn.disabled = true;
  try { await addDoc(collection(db, ORDERS), order); }
  catch (err) { console.error(err); }             // aunque falle, el pedido llega por WhatsApp
  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  w ? (w.location.href = url) : (location.href = url);
  cart = {}; save(); renderCart(); drawer(false); e.target.reset(); $("#address").hidden = true; $("#address").required = false; btn.disabled = false;
  toast(`Pedido #${number} enviado`);
});

function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2000);
}
renderCart();
