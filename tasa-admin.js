// tasa-admin.js — Barra de tasas para el panel admin.
// Muestra la tasa BCV del día y una casilla para aplicar tu tasa.
// Uso: montarTasaAdmin(document.querySelector("#tasa-admin"));
import { obtenerBCV, escucharTasa, guardarTasa, formatoBs } from "./tasa.js";

export function montarTasaAdmin(contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = `
    <style>
      .tasa-bar{display:flex;align-items:center;gap:10px;font-size:14px;color:#fff}
      .tasa-bcv{opacity:.85;white-space:nowrap}
      .tasa-bcv b{font-weight:600}
      .tasa-form{display:flex;align-items:center;gap:6px}
      .tasa-form input{width:110px;padding:8px 10px;border-radius:999px;border:1px solid #444;
        background:#1a1a1a;color:#fff;font:inherit;outline:none}
      .tasa-form input:focus{border-color:#fff}
      .tasa-form button{padding:8px 14px;border-radius:999px;border:0;background:#fff;color:#000;
        font:inherit;font-weight:600;cursor:pointer}
      .tasa-form button:disabled{opacity:.5;cursor:default}
      .tasa-actual{font-size:12px;opacity:.7;white-space:nowrap}
      @media (max-width:760px){.tasa-bar{flex-wrap:wrap}.tasa-actual{display:none}}
    </style>
    <div class="tasa-bar">
      <span class="tasa-bcv" title="Referencia oficial del Banco Central de Venezuela">
        BCV: <b data-bcv>…</b>
      </span>
      <form class="tasa-form" data-form>
        <input data-input type="text" inputmode="decimal" placeholder="Tu tasa" aria-label="Tu tasa en bolívares por dólar">
        <button type="submit" data-btn>Aplicar</button>
      </form>
      <span class="tasa-actual" data-actual>Sin tasa aplicada</span>
    </div>`;

  const elBcv = contenedor.querySelector("[data-bcv]");
  const form = contenedor.querySelector("[data-form]");
  const input = contenedor.querySelector("[data-input]");
  const btn = contenedor.querySelector("[data-btn]");
  const elActual = contenedor.querySelector("[data-actual]");

  // BCV: carga al abrir y se refresca cada 5 minutos
  async function cargarBCV() {
    try {
      const { tasa, fecha } = await obtenerBCV();
      elBcv.textContent = formatoBs(tasa);
      elBcv.parentElement.title = "BCV · actualizado " + new Date(fecha).toLocaleString("es-VE");
    } catch {
      elBcv.textContent = "no disponible";
    }
  }
  cargarBCV();
  setInterval(cargarBCV, 5 * 60 * 1000);

  // Tu tasa en tiempo real
  escucharTasa((valor) => {
    elActual.textContent = valor ? "Aplicada: " + formatoBs(valor) : "Sin tasa aplicada";
    if (document.activeElement !== input && !input.value) input.placeholder = valor ? String(valor) : "Tu tasa";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = "Aplicando…";
    try {
      await guardarTasa(input.value);
      input.value = "";
      btn.textContent = "✓ Aplicada";
    } catch (err) {
      alert(err.message === "Tasa inválida"
        ? "Escribe una tasa válida, por ejemplo 365.50"
        : "No se pudo guardar la tasa. ¿Iniciaste sesión?");
      btn.textContent = "Aplicar";
    } finally {
      setTimeout(() => { btn.disabled = false; btn.textContent = "Aplicar"; }, 1500);
    }
  });
}
