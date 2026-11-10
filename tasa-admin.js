import { obtenerBCV, escucharTasa, guardarTasa, formatoBs } from "./tasa.js";

export function montarTasaAdmin(contenedor) {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <style>
      .tasa-bar{display:flex;align-items:center;gap:10px;font-size:14px;color:#fff}
      .tasa-bcv{opacity:.85;white-space:nowrap}
      .tasa-form{display:flex;align-items:center;gap:6px}
      .tasa-form input{width:110px;padding:8px 10px;border-radius:999px;border:1px solid #444;background:#1a1a1a;color:#fff;outline:none}
      .tasa-form button{padding:8px 14px;border-radius:999px;border:0;background:#fff;color:#000;font-weight:600;cursor:pointer}
      .tasa-form button:disabled{opacity:.5}
      .tasa-actual{font-size:12px;opacity:.7;white-space:nowrap}
      @media (max-width:760px){.tasa-bar{flex-wrap:wrap}.tasa-actual{display:none}}
    </style>
    <div class="tasa-bar">
      <span class="tasa-bcv">BCV: <b data-bcv>…</b></span>
      <form class="tasa-form" data-form>
        <input data-input type="text" inputmode="decimal" placeholder="Tu tasa">
        <button type="submit" data-btn>Aplicar</button>
      </form>
      <span class="tasa-actual" data-actual>Sin tasa aplicada</span>
    </div>`;

  const elBcv = contenedor.querySelector("[data-bcv]");
  const form = contenedor.querySelector("[data-form]");
  const input = contenedor.querySelector("[data-input]");
  const btn = contenedor.querySelector("[data-btn]");
  const elActual = contenedor.querySelector("[data-actual]");

  async function cargarBCV() {
    try { const { tasa } = await obtenerBCV(); elBcv.textContent = formatoBs(tasa); }
    catch { elBcv.textContent = "no disponible"; }
  }
  cargarBCV();
  setInterval(cargarBCV, 5 * 60 * 1000);

  escucharTasa((valor) => {
    elActual.textContent = valor ? "Aplicada: " + formatoBs(valor) : "Sin tasa aplicada";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true; btn.textContent = "Aplicando…";
    try { await guardarTasa(input.value); input.value = ""; btn.textContent = "✓ Aplicada"; }
    catch (err) {
      alert(err.message === "Tasa inválida" ? "Escribe una tasa válida, por ejemplo 365.50" : "No se pudo guardar la tasa. Revisa las reglas de Firestore.");
    }
    setTimeout(() => { btn.disabled = false; btn.textContent = "Aplicar"; }, 1500);
  });
}
