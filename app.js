const $ = s => document.querySelector(s);
const { whatsapp, currency } = CONFIG;
const money = n => currency + n.toFixed(2);
let category = "Todos", query = "", cart = {};

try { cart = JSON.parse(localStorage.getItem("wasaro-cart")) || {}; } catch (e) {}
const save = () => { try { localStorage.setItem("wasaro-cart", JSON.stringify(cart)); } catch (e) {} };

$("#contactLink").href = $("#waFloat").href = `https://wa.me/${whatsapp}`;

/* Categorías */
const cats = ["Todos", ...new Set(PRODUCTS.map(p => p.category))];
$("#chips").innerHTML = cats.map(c => `<button class="chip${c === category ? " on" : ""}" data-c="${c}">${c}</button>`).join("");
$("#chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  category = b.dataset.c;
  document.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === b));
  renderGrid();
});
$("#search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); renderGrid(); });

/* Productos */
function renderGrid() {
  const list = PRODUCTS.filter(p =>
    (category === "Todos" || p.category === category) &&
    (p.name + " " + p.category + " " + p.description).toLowerCase().includes(query));
  $("#count").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
  $("#empty").hidden = list.length > 0;
  $("#grid").innerHTML = list.map(p => `
    <article class="card${p.soldOut ? " sold" : ""}">
      <div class="img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
        ${p.soldOut ? '<span class="tag dark">Agotado</span>' : p.badge ? `<span class="tag">${p.badge}</span>` : ""}
      </div>
      <div class="info">
        <small>${p.category}</small>
        <h4>${p.name}</h4>
        <p>${p.description}</p>
        <div class="row"><strong>${money(p.price)}</strong>
          <button class="add" data-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Agotado" : "Agregar"}</button>
        </div>
      </div>
    </article>`).join("");
}
$("#grid").addEventListener("click", e => {
  const b = e.target.closest(".add"); if (!b || b.disabled) return;
  const id = b.dataset.id; cart[id] = (cart[id] || 0) + 1;
  save(); renderCart(); toast("Agregado al pedido");
});

/* Carrito */
function renderCart() {
  const items = Object.entries(cart).map(([id, q]) => ({ p: PRODUCTS.find(x => x.id == id), q })).filter(i => i.p);
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
$("#clearCart").onclick = () => { cart = {}; save(); renderCart(); };

const drawer = (open) => {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", !open);
  $("#overlay").hidden = !open;
};
$("#openCart").onclick = () => drawer(true);
$("#closeCart").onclick = $("#overlay").onclick = () => drawer(false);
document.addEventListener("keydown", e => e.key === "Escape" && drawer(false));

/* Enviar por WhatsApp */
$("#checkout").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const items = Object.entries(cart).map(([id, q]) => ({ p: PRODUCTS.find(x => x.id == id), q })).filter(i => i.p);
  if (!items.length) return;
  const total = items.reduce((s, i) => s + i.q * i.p.price, 0);
  const msg = [
    "*Nuevo pedido - Dondecamila*", "",
    ...items.map(i => `• ${i.q} x ${i.p.name} — ${money(i.q * i.p.price)}`), "",
    `*Total: ${money(total)}*`, "",
    `Nombre: ${f.get("name")}`, `Dirección: ${f.get("address")}`,
    f.get("notes") ? `Notas: ${f.get("notes")}` : ""
  ].join("\n");
  window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
});

function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 1500);
}

renderGrid(); renderCart();
