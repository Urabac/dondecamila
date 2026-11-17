<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Panel · Dondecamila</title>
<link rel="icon" href="/images/logo.png">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{font-family:"DM Sans",system-ui,sans-serif;background:#f4f2ee;color:#0b0b0b;font-size:14px}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
[hidden]{display:none!important}
#login{min-height:100vh;display:grid;place-items:center;padding:20px}
#loginForm{background:#fff;padding:32px;border-radius:12px;width:min(380px,100%);display:flex;flex-direction:column;gap:12px;text-align:center}
#loginForm img{width:84px;margin:0 auto;border-radius:50%}
input,select,textarea{border:1px solid #ddd8cf;border-radius:8px;padding:10px 12px;background:#fff;width:100%}
.btn{background:#0b0b0b;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:500}
.btn.ghost{background:#fff;color:#0b0b0b;border:1px solid #ddd8cf}
.btn.red{background:#fff;color:#b3261e;border:1px solid #e8c4c1}
.err{color:#b3261e;font-size:13px;min-height:16px}
header{background:#0b0b0b;color:#fff;display:flex;align-items:center;gap:20px;padding:12px 24px;position:sticky;top:0;z-index:5;flex-wrap:wrap}
header img{width:42px;border-radius:50%}
header h1{font-size:17px;flex:1}
nav{display:flex;gap:6px}
nav button{background:none;border:0;color:#bbb;padding:8px 14px;border-radius:999px}
nav button.on{background:#fff;color:#0b0b0b;font-weight:700}
#newCount{background:#d62618;color:#fff;border-radius:999px;padding:1px 7px;font-size:12px;margin-left:4px}
#newCount:empty{display:none}
main{max-width:1100px;margin:0 auto;padding:24px}
.bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px}
.bar select{width:auto}
.card{background:#fff;border:1px solid #e6e2db;border-left:5px solid #ccc;border-radius:10px;padding:16px;margin-bottom:12px}
.card.st-nuevo{border-left-color:#d62618}.card.st-preparando{border-left-color:#f0a500}
.card.st-encamino{border-left-color:#2f7de1}.card.st-entregado{border-left-color:#25a244}.card.st-cancelado{opacity:.6}
.h{display:flex;gap:14px;align-items:center;margin-bottom:8px;flex-wrap:wrap}.h span{color:#777;flex:1}.h select{width:auto}
.card ul{list-style:none;padding:0;margin:10px 0;border-top:1px dashed #ddd;border-bottom:1px dashed #ddd}
.card li{display:flex;justify-content:space-between;padding:6px 0}
.f{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.f span{display:flex;gap:8px;flex-wrap:wrap}
.f a{text-decoration:none;display:inline-block}
#banner{background:#fde8e6;color:#8a1c14;padding:12px 16px;border-radius:8px;margin-bottom:16px;line-height:1.4}
.st{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#eee}
.st.nuevo{background:#fde8e6;color:#b3261e}.st.confirmado{background:#fff3d1;color:#8a5a00}.st.entregado{background:#dff5e3;color:#1a7f37}
.mute{color:#888;padding:30px;text-align:center}
#pform{background:#fff;border:1px solid #e6e2db;border-radius:10px;padding:20px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
#pform .full{grid-column:1/-1}#pform label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#555}
#pform .chk{flex-direction:row;align-items:center;gap:8px;font-size:14px;color:#0b0b0b}#pform .chk input{width:auto}
#preview{max-height:110px;border-radius:8px;margin-top:6px}
.prow{display:flex;gap:14px;align-items:center;background:#fff;border:1px solid #e6e2db;border-radius:10px;padding:10px;margin-bottom:8px}
.prow img,.prow .ph{width:64px;height:64px;border-radius:8px;object-fit:cover;background:#222}
.prow .t{flex:1}.prow small{color:#777}.prow .a{display:flex;gap:6px;flex-wrap:wrap}
.pill{font-size:11px;background:#eee;border-radius:999px;padding:2px 8px;margin-left:6px}
/* Pedido manual */
#manualBtn{white-space:nowrap}
.mm{position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.mm[hidden]{display:none!important}
.mm-box{background:#fff;border-radius:14px;width:min(640px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;overflow:hidden}
.mm-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #eee}
.mm-head h2{font-size:18px}
.mm-x{background:none;border:0;font-size:26px;line-height:1;padding:0 4px;color:#555}
.mm-body{padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.mm-body > *{flex-shrink:0}
.mm-body label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#555}
.mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mm-tipo{display:flex;gap:8px;flex-wrap:wrap}
.mm-tipo label{flex-direction:row!important;align-items:center;gap:6px!important;font-size:14px!important;color:#0b0b0b!important;border:1px solid #ddd8cf;border-radius:999px;padding:7px 14px;cursor:pointer}
.mm-tipo label:has(input:checked){background:#0b0b0b;color:#fff!important;border-color:#0b0b0b}
.mm-tipo input{width:auto;margin:0}
#mProds{border:1px solid #ddd8cf;border-radius:8px;max-height:min(300px,45dvh);min-height:120px;overflow-y:auto}
.mp{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid #f0ede7;font-size:14px}
.mp:first-child{border-top:0}
.mp.on{background:#f7f5f0}
.mp small{display:block;color:#888;font-size:12px}
.mm-foot{border-top:1px solid #eee;padding:14px 20px;display:flex;flex-direction:column;gap:10px;background:#faf9f6}
#mResumen{font-size:14px;line-height:1.5}
#mResumen .tt{font-size:18px;font-weight:700}
.mm-foot .chk{display:flex;align-items:center;gap:8px;font-size:14px}
.mm-foot .chk input{width:auto;margin:0}
.mm-btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.pill.man{background:#e8eefc;color:#1f4fb3}
@media(max-width:600px){.mm{padding:0;align-items:flex-end}.mm-box{max-height:100dvh;border-radius:14px 14px 0 0}.mm-grid{grid-template-columns:1fr}.mm-btns .btn{flex:1}}
#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0b0b0b;color:#fff;padding:12px 20px;border-radius:999px;opacity:0;transition:.25s;pointer-events:none}
#toast.show{opacity:1}
/* Filtros de pedidos */
.ofil{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ofil select,.ofil input{width:auto}
.ofil input{min-width:170px}
#osum{color:#555;font-size:13px;margin:-6px 0 14px}
#osum:empty{display:none}
/* Productos del combo */
#comboBox{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#555}
#comboPick{border:1px solid #ddd8cf;border-radius:8px;max-height:280px;overflow-y:auto;background:#fff}
.cp{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid #f0ede7;color:#0b0b0b;font-size:14px}
.cp:first-child{border-top:0}
.cp.on{background:#f7f5f0}
.cp small{display:block;color:#888;font-size:12px}
.cpq{display:flex;align-items:center;gap:8px;flex:none}
.cpq button{width:28px;height:28px;border-radius:50%;border:1px solid #ddd8cf;background:#fff;font-size:15px;line-height:1;padding:0}
.cpq button.plus{background:#0b0b0b;color:#fff;border-color:#0b0b0b}
#comboSum{color:#555}
@media(max-width:700px){#pform{grid-template-columns:1fr}main{padding:14px}.ofil,.ofil select,.ofil input{width:100%}}
</style>
</head>
<body>
<section id="login">
  <form id="loginForm" onsubmit="return false">
    <img src="/images/logo.png" alt="Dondecamila">
    <h2>Panel administrativo</h2>
    <input name="email" type="email" placeholder="Correo" required autocomplete="username">
    <input name="password" type="password" placeholder="Contraseña" required autocomplete="current-password">
    <p class="err" id="err"></p>
    <button class="btn">Entrar</button>
  </form>
</section>

<div id="panel" hidden>
  <header>
    <img src="/images/logo.png" alt="">
    <h1>Panel Dondecamila</h1>
    <nav>
      <button class="on" data-t="orders">Pedidos <b id="newCount"></b></button>
      <button data-t="products">Subir producto</button>
    </nav>
    <div id="tasa-admin"></div>
    <button class="btn ghost" id="logout">Salir</button>
  </header>
  <main>
    <p id="banner" hidden></p>
    <section id="orders">
      <div class="bar" style="flex-wrap:wrap"><h2>Pedidos</h2>
        <div class="ofil">
        <button class="btn" id="manualBtn" type="button">+ Pedido manual</button>
        <input id="q" type="search" inputmode="numeric" placeholder="Buscar # de pedido">
        <select id="range"><option value="hoy">Hoy</option><option value="ayer">Ayer</option><option value="semana">Esta semana</option><option value="mes">Este mes</option><option value="">Todos</option></select>
        <select id="filter"><option value="">Todos</option><option value="nuevo">Pendientes de pago</option><option value="confirmado">Confirmados</option><option value="entregado">Entregados</option><option value="cancelado">Cancelados</option></select>
        </div>
      </div>
      <p id="osum"></p>
      <div id="ordersList"></div>
    </section>
    <section id="products" hidden>
      <div class="bar"><h2 id="ptitle">Nuevo producto</h2></div>
      <form id="pform">
        <input type="hidden" name="pid">
        <label>Nombre<input name="n" required></label>
        <label>Categoría<select name="cat" required></select></label>
        <label>Precio<input name="price" type="number" step="0.01" min="0" required></label>
        <label>Etiqueta (opcional)<input name="badge" placeholder="LA FAVORITA"></label>
        <label class="full">Descripción<textarea name="desc" rows="2"></textarea></label>
        <label class="full">Foto<input name="img" type="file" accept="image/*"><img id="preview" hidden alt=""></label>
        <label class="chk"><input type="checkbox" name="sold"> Agotado</label>
        <label class="chk"><input type="checkbox" name="act" checked> Visible en la tienda</label>
        <label class="chk"><input type="checkbox" name="extras"> Permite adicionales (al pedirlo, se le ofrecen al cliente)</label>
        <div class="full" id="comboBox" hidden>Productos que incluye el combo
          <div id="comboPick"></div>
          <small id="comboSum"></small>
        </div>
        <div class="full"><button class="btn" id="saveBtn">Guardar producto</button> <button type="button" class="btn ghost" id="cancelEdit" hidden>Cancelar edición</button></div>
      </form>
      <div id="plist"></div>
    </section>
  </main>
</div>
<div id="manual" class="mm" hidden>
  <form id="mform" class="mm-box" novalidate>
    <div class="mm-head"><h2>Pedido manual</h2><button type="button" class="mm-x" id="mCerrar" aria-label="Cerrar">×</button></div>
    <div class="mm-body">
      <div class="mm-grid">
        <label>Nombre del cliente<input name="name" placeholder="Ej: María" autocomplete="off"></label>
        <label>Teléfono (opcional)<input name="phone" type="tel" inputmode="numeric" placeholder="04121234567" autocomplete="off"></label>
      </div>
      <div class="mm-tipo">
        <label><input type="radio" name="mode" value="comer" checked> Comer aquí</label>
        <label><input type="radio" name="mode" value="retiro"> Retiro en local</label>
        <label><input type="radio" name="mode" value="delivery"> Delivery</label>
      </div>
      <label id="mZonaBox" hidden>Zona de delivery<select name="zona"></select></label>
      <label>Productos<input id="mBuscar" type="search" placeholder="Buscar producto…" autocomplete="off"></label>
      <div id="mProds"></div>
      <label>Notas (opcional)<textarea name="notes" rows="2" placeholder="Sin cebolla, extra salsa…"></textarea></label>
    </div>
    <div class="mm-foot">
      <div id="mResumen"></div>
      <label class="chk"><input type="checkbox" name="pagado" checked> Pago recibido (queda confirmado)</label>
      <div class="mm-btns">
        <button type="submit" class="btn ghost" data-print="0">Guardar</button>
        <button type="submit" class="btn" data-print="1">Guardar e imprimir</button>
      </div>
    </div>
  </form>
</div>
<div id="toast"></div>
<script>
window.addEventListener("error", function (e) { window.__adminErr = e.message; });
setTimeout(function () {
  if (window.__adminReady) return;
  document.getElementById("err").textContent =
    "No se pudo cargar el panel. " + (window.__adminErr ? "Detalle: " + window.__adminErr + ". " : "") +
    "Revisa que firebase-config.js y admin/admin.js estén actualizados en GitHub.";
}, 3000);
</script>
<script type="module" src="/admin/admin.js"></script>
</body>
</html>
