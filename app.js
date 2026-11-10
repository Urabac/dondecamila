import { db, SETTINGS, COLLECTIONS, ORDERS } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escucharTasa, formatoBs, aBolivares } from "./tasa.js";

const $ = s => document.querySelector(s);
const { whatsapp, currency, business } = SETTINGS;
const money = n => currency + Number(n).toFixed(2);
let PRODUCTS = [], category = "Todos", term = "", cart = {};

/* Tasa en bolívares: la que aplicas desde el panel. Bs. = $ × tasa */
let TASA = 0;
const bs = usd => TASA ? formatoBs(aBolivares(usd, TASA)) : "";
document.head.insertAdjacentHTML("beforeend", `<style>
  .price-bs{display:flex;flex-direction:column;line-height:1.15}
  .price-bs small,.bs-line{font-size:12px;opacity:.65;font-weight:400}
  #totalBs{display:block;font-size:13px;opacity:.7;font-weight:400;margin-top:2px}
  .drinks{grid-column:1/-1;width:100%;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:6px 22px 8px}
  .drinks-t{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;opacity:.55;margin:14px 0 4px}
  .drink-row{display:flex;align-items:center;gap:16px;padding:14px 0;border-top:1px solid rgba(0,0,0,.07)}
  .drinks-t + .drink-row{border-top:0}
  .drink-row .dn{flex:1;min-width:0}
  .drink-row .dn b{display:block;font-weight:500}
  .drink-row .dn small{font-size:12px;color:#b3261e}
  .drink-row .dp{text-align:right;white-space:nowrap;display:flex;flex-direction:column;line-height:1.2}
  .drink-row .dp small{font-size:12px;opacity:.6}
  .drink-row.sold .dn b,.drink-row.sold .dp{opacity:.45}
  @media (max-width:520px){.drinks{padding:4px 14px 6px}.drink-row{gap:10px}}
</style>`);
const BEBIDAS = "Bebidas";
escucharTasa(v => {
  TASA = v;
  renderGrid(); renderCart();
  if (openId && !$("#modal").hidden) $("#mPrice").innerHTML = precioModal(PRODUCTS.find(x => x.id === openId));
});

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
  const comidas = list.filter(p => p.category !== BEBIDAS);
  const bebidas = list.filter(p => p.category === BEBIDAS);
  $("#grid").innerHTML = comidas.map(p => `
    <article class="card${p.soldOut ? " sold" : ""}" data-id="${p.id}" tabindex="0">
      <div class="img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : ""}
        ${p.soldOut ? '<span class="tag dark">Agotado</span>' : p.badge ? `<span class="tag">${p.badge}</span>` : ""}
      </div>
      <div class="info">
        <small>${p.category || ""}</small>
        <h4>${p.name}</h4>
        <p>${p.description || ""}</p>
        <div class="row"><span class="price-bs"><strong>${money(p.price)}</strong>${TASA ? `<small>${bs(p.price)}</small>` : ""}</span>
          <button class="add" data-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Agotado" : "Agregar"}</button>
        </div>
      </div>
    </article>`).join("") + (bebidas.length ? `
    <section class="drinks">
      <h3 class="drinks-t">Bebidas</h3>
      ${bebidas.map(p => `
      <div class="drink-row${p.soldOut ? " sold" : ""}">
        <div class="dn"><b>${p.name}</b>${p.soldOut ? "<small>Agotado</small>" : ""}</div>
        <div class="dp"><strong>${money(p.price)}</strong>${TASA ? `<small>${bs(p.price)}</small>` : ""}</div>
        <button class="add" data-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Agotado" : "Agregar"}</button>
      </div>`).join("")}
    </section>` : "");
}
$("#grid").addEventListener("click", e => {
  const b = e.target.closest(".add");
  if (b) {
    if (!b.disabled) { cart[b.dataset.id] = (cart[b.dataset.id] || 0) + 1; save(); renderCart(); toast("Agregado al pedido"); }
    return;
  }
  const c = e.target.closest(".card"); if (c) openModal(c.dataset.id);
});
$("#grid").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList.contains("card")) openModal(e.target.dataset.id);
});

/* Detalle del producto */
let openId = null, mQty = 1;
function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  openId = id; mQty = 1;
  $("#mImg").innerHTML = p.image ? `<img src="${p.image}" alt="">` : "";
  $("#mImg img") && ($("#mImg img").alt = p.name);
  $("#mCat").textContent = p.category || "";
  $("#mName").textContent = p.name;
  $("#mDesc").textContent = p.description || "Sin descripción.";
  $("#mPrice").innerHTML = precioModal(p);
  $("#mQty").textContent = 1;
  $("#mAdd").disabled = !!p.soldOut;
  $("#mAdd").textContent = p.soldOut ? "Agotado" : "Agregar al pedido";
  $("#modal").hidden = false; document.body.style.overflow = "hidden";
}
function precioModal(p) {
  if (!p) return "";
  return money(p.price) + (TASA ? ` <span class="bs-line">· ${bs(p.price)}</span>` : "");
}
const closeModal = () => { $("#modal").hidden = true; document.body.style.overflow = ""; };
$("#mClose").onclick = closeModal;
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
$("#mMinus").onclick = () => { mQty = Math.max(1, mQty - 1); $("#mQty").textContent = mQty; };
$("#mPlus").onclick = () => { mQty = Math.min(20, mQty + 1); $("#mQty").textContent = mQty; };
$("#mAdd").onclick = () => {
  if (!openId) return;
  cart[openId] = (cart[openId] || 0) + mQty; save(); renderCart(); closeModal(); toast("Agregado al pedido");
};
document.addEventListener("keydown", e => e.key === "Escape" && closeModal());

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
  if (!$("#totalBs")) { const s = document.createElement("small"); s.id = "totalBs"; $("#total").after(s); }
  $("#totalBs").textContent = TASA && total ? bs(total) : "";
  $("#checkout").style.display = count ? "" : "none";
  $("#cartItems").innerHTML = count ? items.map(({ p, q }) => `
    <div class="line">
      <div><b>${p.name}</b><small>${money(p.price)} c/u${TASA ? " · " + bs(p.price) : ""}</small></div>
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
    tasa: TASA || null, totalBs: TASA ? Math.round(aBolivares(total, TASA) * 100) / 100 : null,
    customer: { name: f.get("name"), phone: f.get("phone"), address: mode === "delivery" ? f.get("address") : "" },
    notes: f.get("notes") || "",
    items: items.map(i => ({ id: i.p.id, name: i.p.name, price: i.p.price, qty: i.q })),
    createdAt: serverTimestamp()
  };
  const msg = [
    `*Nuevo pedido #${number} - ${business}*`, "",
    ...order.items.map(i => `• ${i.qty} x ${i.name} — ${money(i.qty * i.price)}`),
    `*Total: ${money(total)}*`,
    ...(TASA ? [`*Total en bolívares: ${bs(total)}*`] : []), "",
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
