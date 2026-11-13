import { db, SETTINGS, COLLECTIONS, ORDERS } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escucharTasa, formatoBs, aBolivares } from "./tasa.js";

const $ = s => document.querySelector(s);
const { whatsapp, currency, business } = SETTINGS;
const money = n => currency + Number(n).toFixed(2);
let PRODUCTS = [], ADDONS = [], category = "Todos", term = "", cart = {};

const BEBIDAS = "Bebidas", COMBOS = "Combos";
const ADICIONALES = "adicionales";            // colección de adicionales (no se muestran como productos)
const ZONAS_DELIVERY = "dc_delivery";         // zonas de delivery con su precio (se cargan en el panel)

/* Tasa en bolívares: la que aplicas desde el panel. Bs. = $ × tasa */
let TASA = 0;
const bs = usd => TASA ? formatoBs(aBolivares(usd, TASA)) : "";
document.head.insertAdjacentHTML("beforeend", `<style>
  .price-bs{display:flex;flex-direction:column;line-height:1.15}
  .price-bs small,.bs-line{font-size:12px;opacity:.65;font-weight:400}
  #totalBs{display:block;font-size:13px;opacity:.7;font-weight:400;margin-top:2px}

  /* Categorías en el teléfono: una sola línea que se desliza, botones más pequeños */
  @media (max-width:700px){
    #chips{display:flex!important;flex-wrap:nowrap!important;justify-content:flex-start!important;gap:8px!important;
      overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;
      scrollbar-width:none;padding:2px 0!important;margin-left:0!important;margin-right:0!important;max-width:100%;
      -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);
              mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
    #chips::-webkit-scrollbar{display:none}
    #chips .chip{flex:none!important;font-size:13px!important;padding:7px 14px!important;min-height:0!important;
      line-height:1.2!important;white-space:nowrap;scroll-snap-align:start;margin:0!important}
  }

  /* Títulos de sección dentro del menú (Combos / Menú) */
  .sec-t{grid-column:1/-1;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;opacity:.55;margin:10px 0 -4px}
  .sec-t:first-child{margin-top:0}
  .card.combo .incl{font-size:13px;line-height:1.35;margin:-2px 0 6px;opacity:.85}
  .card.combo .incl b{font-weight:600}
  .save{display:inline-block;font-size:11px;font-weight:600;color:#1a7f37;background:#dff5e3;border-radius:999px;padding:2px 8px;margin-top:4px;width:max-content}

  .drinks{box-sizing:border-box;grid-column:1/-1;width:100%;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:6px 22px 8px}
  .drinks-t{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;opacity:.55;margin:14px 0 4px}
  .drink-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:16px;padding:14px 0;border-top:1px solid rgba(0,0,0,.07)}
  .drinks-t + .drink-row{border-top:0}
  .drink-row .dn{min-width:0}
  .drink-row .dn b{display:block;font-weight:500;overflow-wrap:anywhere}
  .drink-row .dn small{font-size:12px;color:#b3261e}
  .drink-row .dp{text-align:right;white-space:nowrap;display:flex;flex-direction:column;align-items:flex-end;line-height:1.2}
  .drink-row .dp small{font-size:12px;opacity:.6}
  .drink-row .add{width:auto!important;min-width:0;flex:none;margin:0!important;padding-left:22px;padding-right:22px;white-space:nowrap}
  .drink-row.sold .dn b,.drink-row.sold .dp{opacity:.45}
  @media (max-width:560px){
    .drinks{padding:4px 14px 6px}
    .drink-row{grid-template-columns:minmax(0,1fr) auto;row-gap:8px;column-gap:12px}
    .drink-row .dn{grid-column:1/-1}
    .drink-row .dp{text-align:left;align-items:flex-start}
  }

  /* "¿Y la bebida?" dentro del carrito */
  #drinkUpsell{margin:12px 0 4px}
  #drinkUpsell *{box-sizing:border-box}
  .up-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 14px;border-radius:12px;
    border:1.5px dashed rgba(0,0,0,.25);background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
  .up-btn:hover{border-color:rgba(0,0,0,.55);background:rgba(0,0,0,.03)}
  .up-box{border:1px solid rgba(0,0,0,.1);border-radius:14px;overflow:hidden;animation:upIn .18s ease}
  @keyframes upIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
  .up-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:rgba(0,0,0,.035)}
  .up-head b{font-size:14px}
  .up-done{border:0;background:#0b0b0b;color:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  .up-list{max-height:260px;overflow-y:auto}
  .up-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid rgba(0,0,0,.07)}
  .up-row .un{flex:1;min-width:0}
  .up-row .un b{display:block;font-weight:500;font-size:14px;overflow-wrap:anywhere}
  .up-row .un small{font-size:12px;opacity:.6}
  .up-q{display:flex;align-items:center;gap:8px;flex:none}
  .up-q button{width:30px;height:30px;border-radius:50%;border:1px solid rgba(0,0,0,.2);background:#fff;color:#0b0b0b;font-size:16px;line-height:1;cursor:pointer}
  .up-q button.plus{background:#0b0b0b;color:#fff;border-color:#0b0b0b}
  .up-q span{min-width:16px;text-align:center;font-weight:600}

  /* Detalle de cada línea del carrito (adicionales / contenido del combo) */
  .line .det{display:block;font-size:12px;opacity:.65;margin-top:1px}

  /* Zonas de delivery en el formulario del pedido */
  #zonas{margin:10px 0 4px}
  #zonas *{box-sizing:border-box}
  #zonas .z-t{font-size:13px;font-weight:600;margin:0 0 6px}
  #zonas .z-list{border:1px solid rgba(0,0,0,.12);border-radius:12px;overflow:hidden;background:#fff}
  #zonas label{display:flex;align-items:center;gap:10px;padding:11px 12px;border-top:1px solid rgba(0,0,0,.07);cursor:pointer;margin:0;font-weight:400}
  #zonas label:first-child{border-top:0}
  #zonas label.on{background:rgba(0,0,0,.04)}
  #zonas input{width:18px;height:18px;margin:0;flex:none;accent-color:#0b0b0b}
  #zonas .zn{flex:1;min-width:0;overflow-wrap:anywhere}
  #zonas .zp{text-align:right;white-space:nowrap;font-weight:600;font-size:14px}
  #zonas .zp small{display:block;font-weight:400;font-size:11px;opacity:.6}
  #zonas.falta .z-list{border-color:#b3261e;box-shadow:0 0 0 2px rgba(179,38,30,.15)}
  #zonas .z-err{color:#b3261e;font-size:12px;margin:6px 0 0;display:none}
  #zonas.falta .z-err{display:block}
  #envioNota{display:block;font-size:12px;opacity:.7;font-weight:400;margin-top:2px}

  /* Hoja de adicionales */
  #addonSheet{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.45);padding:0}
  #addonSheet[hidden]{display:none}
  #addonSheet *{box-sizing:border-box}
  .as-box{width:min(460px,100%);max-height:88vh;display:flex;flex-direction:column;background:#fff;color:#0b0b0b;
    border-radius:20px 20px 0 0;animation:asIn .22s ease;font-family:inherit}
  @keyframes asIn{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}
  @media (min-width:600px){#addonSheet{align-items:center;padding:20px}.as-box{border-radius:20px}}
  .as-head{padding:20px 20px 10px}
  .as-head small{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.55}
  .as-head h3{font-size:19px;margin:4px 0 0;line-height:1.2}
  .as-head p{font-size:13px;opacity:.65;margin:4px 0 0}
  .as-list{overflow-y:auto;padding:0 20px}
  .as-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-top:1px solid rgba(0,0,0,.08);cursor:pointer}
  .as-row input{width:20px;height:20px;accent-color:#0b0b0b;flex:none;margin:0}
  .as-row .an{flex:1;min-width:0;font-weight:500;overflow-wrap:anywhere}
  .as-row .ap{text-align:right;white-space:nowrap;font-size:14px;font-weight:600}
  .as-row .ap small{display:block;font-size:11px;font-weight:400;opacity:.6}
  .as-foot{padding:14px 20px 20px;border-top:1px solid rgba(0,0,0,.08);display:grid;grid-template-columns:1fr 1.4fr;gap:10px}
  .as-foot button{border-radius:999px;padding:13px 14px;font:inherit;font-weight:600;cursor:pointer}
  .as-skip{background:#fff;border:1px solid rgba(0,0,0,.2);color:#0b0b0b}
  .as-ok{background:#0b0b0b;border:0;color:#fff}
  .as-ok small{display:block;font-size:11px;font-weight:400;opacity:.75}
</style>`);
escucharTasa(v => {
  TASA = v;
  renderGrid(); renderCart();
  if (openId && !$("#modal").hidden) $("#mPrice").innerHTML = precioModal(PRODUCTS.find(x => x.id === openId));
  if (!$("#addonSheet").hidden) pintarSheet();
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
/* Adicionales (papas extra, queso extra…): solo se ofrecen al pedir productos que los permiten */
onSnapshot(collection(db, ADICIONALES), snap => {
  ADDONS = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  renderCart();
}, err => console.warn("Adicionales no disponibles:", err));

/* Zonas de delivery (ej: "Zona Centro $2"): el cliente elige una y se suma al total */
let ZONAS = [], zonaSel = null;
onSnapshot(collection(db, ZONAS_DELIVERY), snap => {
  ZONAS = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(a.price) - Number(b.price) || String(a.name).localeCompare(String(b.name)));
  if (zonaSel && !ZONAS.some(z => z.id === zonaSel)) zonaSel = null;
  renderCart();
}, err => console.warn("Zonas de delivery no disponibles:", err));
const modoActual = () => document.querySelector('input[name="mode"]:checked')?.value;
const envio = () => modoActual() === "delivery" ? ZONAS.find(z => z.id === zonaSel) || null : null;

/* ---------- Combos ---------- */
const incluye = p => (p.items || []).map(i => `${i.qty} ${i.name}`).join(", ");
function ahorro(p) {
  const separado = (p.items || []).reduce((s, i) => {
    const x = PRODUCTS.find(y => y.id === i.id);
    return s + (x ? Number(x.price) * i.qty : 0);
  }, 0);
  return separado > p.price ? separado - p.price : 0;
}
const comboTieneBebida = p => (p.items || []).some(i => PRODUCTS.find(y => y.id === i.id)?.category === BEBIDAS);

function renderChips() {
  const cats = ["Todos", ...LABELS.filter(l => PRODUCTS.some(p => p.category === l))];
  if (!cats.includes(category)) category = "Todos";
  $("#chips").innerHTML = cats.map(c => `<button class="chip${c === category ? " on" : ""}" data-c="${c}">${c}</button>`).join("");
}
$("#chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  category = b.dataset.c; renderChips(); renderGrid();
  // en el teléfono, deja visible la categoría elegida dentro de la línea
  $(`#chips .chip[data-c="${CSS.escape(category)}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
});
$("#search").addEventListener("input", e => { term = e.target.value.trim().toLowerCase(); renderGrid(); });

const tarjeta = p => {
  const esCombo = p.category === COMBOS, ah = esCombo ? ahorro(p) : 0;
  return `
    <article class="card${p.soldOut ? " sold" : ""}${esCombo ? " combo" : ""}" data-id="${p.id}" tabindex="0">
      <div class="img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : ""}
        ${p.soldOut ? '<span class="tag dark">Agotado</span>' : p.badge ? `<span class="tag">${p.badge}</span>` : ""}
      </div>
      <div class="info">
        <small>${p.category || ""}</small>
        <h4>${p.name}</h4>
        ${esCombo && p.items?.length ? `<p class="incl"><b>Incluye:</b> ${incluye(p)}</p>` : ""}
        <p>${p.description || ""}</p>
        <div class="row"><span class="price-bs"><strong>${money(p.price)}</strong>${TASA ? `<small>${bs(p.price)}</small>` : ""}${ah ? `<span class="save">Ahorras ${money(ah)}</span>` : ""}</span>
          <button class="add" data-id="${p.id}" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Agotado" : "Agregar"}</button>
        </div>
      </div>
    </article>`;
};

function renderGrid() {
  const list = PRODUCTS.filter(p =>
    (category === "Todos" || p.category === category) &&
    [p.name, p.category, p.description, incluye(p)].join(" ").toLowerCase().includes(term));
  $("#count").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
  $("#empty").hidden = list.length > 0;
  $("#empty").textContent = PRODUCTS.length ? "No encontramos productos con esa búsqueda." : "Pronto tendremos productos disponibles.";
  const combos = list.filter(p => p.category === COMBOS);
  const comidas = list.filter(p => p.category !== BEBIDAS && p.category !== COMBOS);
  const bebidas = list.filter(p => p.category === BEBIDAS);
  const conTitulos = combos.length && comidas.length;   // títulos solo si hay combos y menú a la vez
  $("#grid").innerHTML =
    (combos.length ? (conTitulos ? '<h3 class="sec-t">Combos</h3>' : "") + combos.map(tarjeta).join("") : "") +
    (comidas.length ? (conTitulos ? '<h3 class="sec-t">Menú</h3>' : "") + comidas.map(tarjeta).join("") : "") +
    (bebidas.length ? `
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

/* Agregar: si el producto permite adicionales, primero se le preguntan */
const permiteAdicionales = p => p && p.extras && ADDONS.length > 0;
function agregar(id, qty) {
  const p = PRODUCTS.find(x => x.id === id); if (!p || p.soldOut) return;
  if (permiteAdicionales(p)) return abrirSheet(p, qty);
  cart[id] = (cart[id] || 0) + qty; save(); renderCart(); toast("Agregado al pedido");
}
$("#grid").addEventListener("click", e => {
  const b = e.target.closest(".add");
  if (b) { if (!b.disabled) agregar(b.dataset.id, 1); return; }
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
  const inc = p.category === COMBOS && p.items?.length ? "Incluye: " + incluye(p) + ". " : "";
  $("#mDesc").textContent = (inc + (p.description || "")).trim() || "Sin descripción.";
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
  const id = openId, q = mQty; closeModal(); agregar(id, q);
};
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); cerrarSheet(); } });

/* ---------- Hoja "¿Quieres adicionales?" ---------- */
document.body.insertAdjacentHTML("beforeend", '<div id="addonSheet" hidden role="dialog" aria-modal="true"></div>');
let sheet = null;   // { p, qty, sel:Set }
function abrirSheet(p, qty) { sheet = { p, qty, sel: new Set() }; pintarSheet(); $("#addonSheet").hidden = false; document.body.style.overflow = "hidden"; }
function cerrarSheet() { if (!sheet) return; sheet = null; $("#addonSheet").hidden = true; document.body.style.overflow = ""; }
function pintarSheet() {
  if (!sheet) return;
  const { p, qty, sel } = sheet;
  const extra = ADDONS.filter(a => sel.has(a.id)).reduce((s, a) => s + Number(a.price), 0);
  const unit = Number(p.price) + extra;
  $("#addonSheet").innerHTML = `
    <div class="as-box">
      <div class="as-head"><small>Adicionales</small><h3>¿Le agregas algo a tu ${p.name}?</h3>
        <p>${qty > 1 ? `Se aplica a las ${qty} unidades. ` : ""}Elige los que quieras o continúa sin adicionales.</p></div>
      <div class="as-list">${ADDONS.map(a => `
        <label class="as-row"><input type="checkbox" data-ad="${a.id}" ${sel.has(a.id) ? "checked" : ""}>
          <span class="an">${a.name}</span>
          <span class="ap">+${money(a.price)}${TASA ? `<small>${bs(a.price)}</small>` : ""}</span></label>`).join("")}
      </div>
      <div class="as-foot">
        <button type="button" class="as-skip" data-as="skip">Sin adicionales</button>
        <button type="button" class="as-ok" data-as="ok">Agregar · ${money(unit * qty)}${TASA ? `<small>${bs(unit * qty)}</small>` : ""}</button>
      </div>
    </div>`;
}
$("#addonSheet").addEventListener("change", e => {
  const id = e.target.dataset.ad; if (!id || !sheet) return;
  e.target.checked ? sheet.sel.add(id) : sheet.sel.delete(id); pintarSheet();
});
$("#addonSheet").addEventListener("click", e => {
  if (e.target.id === "addonSheet") return cerrarSheet();
  const a = e.target.closest("[data-as]")?.dataset.as; if (!a || !sheet) return;
  const { p, qty, sel } = sheet;
  const key = a === "ok" && sel.size ? p.id + "~" + [...sel].sort().join(".") : p.id;
  cart[key] = (cart[key] || 0) + qty; save(); renderCart(); cerrarSheet(); toast("Agregado al pedido");
});

/* ---------- Carrito ----------
   Cada línea se guarda con una clave: "idProducto" o "idProducto~idAdicional.idAdicional" */
function lineaDe(key, q) {
  const [pid, ads = ""] = key.split("~");
  const p = PRODUCTS.find(x => x.id === pid);
  if (!p || p.soldOut) return null;
  const extras = ads ? ads.split(".").map(id => ADDONS.find(a => a.id === id)).filter(Boolean) : [];
  if (ads && ADDONS.length && extras.length !== ads.split(".").length) return null;   // un adicional ya no existe
  const price = Number(p.price) + extras.reduce((s, a) => s + Number(a.price), 0);
  const name = p.name + (extras.length ? " + " + extras.map(a => a.name).join(" + ") : "");
  const detail = p.category === COMBOS && p.items?.length ? "Incluye: " + incluye(p) : "";
  return { key, p, q, price, name, detail };
}
const cartItems = () => Object.entries(cart).map(([k, q]) => lineaDe(k, q)).filter(Boolean);

function renderCart() {
  const items = cartItems();
  const count = items.reduce((s, i) => s + i.q, 0);
  const zona = envio();
  const total = items.reduce((s, i) => s + i.q * i.price, 0) + (count && zona ? Number(zona.price) : 0);
  $("#cartCount").textContent = count;
  $("#total").textContent = money(total);
  if (!$("#totalBs")) { const s = document.createElement("small"); s.id = "totalBs"; $("#total").after(s); }
  $("#totalBs").textContent = TASA && total ? bs(total) : "";
  if (!$("#envioNota")) { const s = document.createElement("small"); s.id = "envioNota"; $("#totalBs").after(s); }
  $("#envioNota").textContent = count && zona ? `Incluye delivery (${zona.name}): ${money(zona.price)}` : "";
  renderZonas();
  $("#checkout").style.display = count ? "" : "none";
  $("#cartItems").innerHTML = count ? items.map(i => `
    <div class="line">
      <div><b>${i.name}</b>${i.detail ? `<span class="det">${i.detail}</span>` : ""}<small>${money(i.price)} c/u${TASA ? " · " + bs(i.price) : ""}</small></div>
      <div class="qty"><button data-a="-" data-id="${i.key}">−</button><span>${i.q}</span><button data-a="+" data-id="${i.key}">+</button></div>
    </div>`).join("") : '<p class="empty-cart">Tu pedido está vacío. Agrega algo del menú.</p>';
  renderUpsell(items);
}

/* ¿Y la bebida? Si el pedido no tiene bebida, el carrito ofrece agregarla sin salir */
let upsellOpen = false;
function renderUpsell(items) {
  if (!$("#drinkUpsell")) { const d = document.createElement("div"); d.id = "drinkUpsell"; $("#cartItems").after(d); }
  const box = $("#drinkUpsell");
  const disponibles = PRODUCTS.filter(p => p.category === BEBIDAS && !p.soldOut);
  const tieneComida = items.some(i => i.p.category !== BEBIDAS);
  const tieneBebida = items.some(i => i.p.category === BEBIDAS || comboTieneBebida(i.p));
  if (!items.length || !disponibles.length || !tieneComida) upsellOpen = false;
  if (!items.length || !disponibles.length || !tieneComida || (tieneBebida && !upsellOpen)) { box.innerHTML = ""; return; }

  box.innerHTML = upsellOpen ? `
    <div class="up-box">
      <div class="up-head"><b>🥤 Bebidas</b><button type="button" class="up-done" data-up="close">Listo</button></div>
      <div class="up-list">${disponibles.map(p => {
        const q = cart[p.id] || 0;
        return `
        <div class="up-row">
          <div class="un"><b>${p.name}</b><small>${money(p.price)}${TASA ? " · " + bs(p.price) : ""}</small></div>
          <div class="up-q">${q ? `<button type="button" data-up="-" data-id="${p.id}" aria-label="Quitar">−</button><span>${q}</span>` : ""}
            <button type="button" class="plus" data-up="+" data-id="${p.id}" aria-label="Agregar ${p.name}">+</button></div>
        </div>`;
      }).join("")}</div>
    </div>` : `
    <button type="button" class="up-btn" data-up="open">🥤 ¿Y la bebida? Agregar bebida</button>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("#drinkUpsell [data-up]"); if (!b) return;
  const a = b.dataset.up, id = b.dataset.id;
  if (a === "open") upsellOpen = true;
  if (a === "close") upsellOpen = false;
  if (a === "+") cart[id] = (cart[id] || 0) + 1;
  if (a === "-") { cart[id] = (cart[id] || 0) - 1; if (cart[id] <= 0) delete cart[id]; }
  save(); renderCart();
});
$("#cartItems").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const id = b.dataset.id; cart[id] = (cart[id] || 0) + (b.dataset.a === "+" ? 1 : -1);
  if (cart[id] <= 0) delete cart[id];
  save(); renderCart();
});

/* ---------- Tipo de pedido: Delivery / Retiro / Comer aquí ----------
   "Comer aquí" se crea copiando la opción de Retiro, así hereda tu mismo diseño. */
const TIPOS = { delivery: "Delivery", retiro: "Retiro en local", comer: "Comer aquí" };
(function agregarComerAqui() {
  if (document.querySelector('input[name="mode"][value="comer"]')) return;
  const radios = [...document.querySelectorAll('input[name="mode"]')];
  const base = radios.find(r => r.value !== "delivery") || radios[radios.length - 1];
  if (!base) return;
  const label = base.closest("label");
  let nuevo;
  if (label) {
    nuevo = label.cloneNode(true);
    const walker = document.createTreeWalker(nuevo, NodeFilter.SHOW_TEXT);
    let cambiado = false, t;
    while ((t = walker.nextNode())) {
      if (t.nodeValue.trim()) {
        if (!cambiado) { t.nodeValue = t.nodeValue.replace(/\S.*\S|\S/s, "Comer aquí"); cambiado = true; }
        else t.nodeValue = "";
      }
    }
    if (!cambiado) nuevo.append(" Comer aquí");
    label.after(nuevo);
  } else {
    nuevo = document.createElement("label");
    nuevo.innerHTML = '<input type="radio" name="mode"> Comer aquí';
    base.parentElement.after(nuevo);
  }
  const input = nuevo.querySelector('input[name="mode"]');
  input.value = "comer"; input.checked = false; input.removeAttribute("id");
})();
document.addEventListener("change", e => {
  if (e.target.name !== "mode") return;
  const d = e.target.value === "delivery";
  $("#address").hidden = !d; $("#address").required = d;
});
/* Lista de zonas: aparece debajo de la dirección cuando el cliente elige Delivery */
function renderZonas() {
  const addr = $("#address"); if (!addr) return;
  if (!$("#zonas")) { const d = document.createElement("div"); d.id = "zonas"; addr.after(d); }
  const box = $("#zonas");
  if (modoActual() !== "delivery" || !ZONAS.length) { box.innerHTML = ""; box.hidden = true; box.classList.remove("falta"); return; }
  box.hidden = false;
  box.innerHTML = `
    <p class="z-t">Elige tu zona de delivery</p>
    <div class="z-list">${ZONAS.map(z => `
      <label class="${z.id === zonaSel ? "on" : ""}"><input type="radio" name="zona" value="${z.id}" ${z.id === zonaSel ? "checked" : ""}>
        <span class="zn">${z.name}</span>
        <span class="zp">+${money(z.price)}${TASA ? `<small>${bs(z.price)}</small>` : ""}</span></label>`).join("")}
    </div>
    <p class="z-err">Elige una zona para calcular el delivery.</p>`;
}
document.addEventListener("change", e => {
  if (e.target.name === "zona") { zonaSel = e.target.value; $("#zonas")?.classList.remove("falta"); renderCart(); }
  if (e.target.name === "mode") renderCart();
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
  const m = f.get("mode");
  const mode = m === "delivery" ? "delivery" : m === "comer" ? "comer" : "retiro";
  const zona = envio();
  if (mode === "delivery" && ZONAS.length && !zona) {
    $("#zonas")?.classList.add("falta");
    $("#zonas")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return toast("Elige tu zona de delivery");
  }
  const lineas = items.map(i => ({ id: i.key, name: i.name, price: i.price, qty: i.q, ...(i.detail ? { detail: i.detail } : {}) }));
  if (zona) lineas.push({ id: "delivery", name: `Delivery (${zona.name})`, price: Number(zona.price), qty: 1 });
  const total = lineas.reduce((s, i) => s + i.qty * i.price, 0);
  const number = String(Date.now()).slice(-6);
  const order = {
    number, status: "nuevo", total, delivery: mode,
    tasa: TASA || null, totalBs: TASA ? Math.round(aBolivares(total, TASA) * 100) / 100 : null,
    customer: { name: f.get("name"), phone: f.get("phone"), address: mode === "delivery" ? f.get("address") : "" },
    notes: f.get("notes") || "",
    items: lineas,
    createdAt: serverTimestamp()
  };
  const msg = [
    `*Nuevo pedido #${number} - ${business}*`, "",
    ...order.items.map(i => `• ${i.qty} x ${i.name} — ${money(i.qty * i.price)}${i.detail ? `\n   (${i.detail})` : ""}`),
    `*Total: ${money(total)}*`,
    ...(TASA ? [`*Total en bolívares: ${bs(total)}*`] : []), "",
    `Nombre: ${order.customer.name}`, `Teléfono: ${order.customer.phone}`,
    `Tipo: ${TIPOS[mode]}`,
    ...(mode === "delivery" ? [`Dirección: ${order.customer.address}`] : []),
    order.notes ? `Notas: ${order.notes}` : ""
  ].join("\n");
  const w = window.open("", "_blank");           // se abre antes del await para evitar bloqueos
  const btn = e.target.querySelector(".send"); btn.disabled = true;
  try { await addDoc(collection(db, ORDERS), order); }
  catch (err) { console.error(err); }             // aunque falle, el pedido llega por WhatsApp
  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  w ? (w.location.href = url) : (location.href = url);
  cart = {}; zonaSel = null; save(); e.target.reset(); renderCart(); drawer(false); $("#address").hidden = true; $("#address").required = false; btn.disabled = false;
  toast(`Pedido #${number} enviado`);
});

function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2000);
}
renderCart();
