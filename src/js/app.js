/* =============================================================
   GastoSmart — app.js
   Lógica principal: navegación, gastos, presupuesto, gráficos,
   PWA (Service Worker + install prompt) y modo offline.
   ============================================================= */

// ── 1. SERVICE WORKER ──────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(err =>
    console.warn("SW no registrado:", err)
  );
}

// ── 2. ESTADO DE LA APP ────────────────────────────────────────
// Cargamos datos desde localStorage o inicializamos vacíos
let gastos      = JSON.parse(localStorage.getItem("gs_gastos")      || "[]");
let presupuestos = JSON.parse(localStorage.getItem("gs_presupuestos")|| "{}");
let ingresoMensual = parseFloat(localStorage.getItem("gs_ingreso")  || "0");

const ICONOS_CAT = {
  comida:     "🍔", transporte: "🚌", ocio:       "🎮",
  salud:      "💊", educacion:  "📚", hogar:      "🏠",
  otros:      "📦"
};

function guardarDatos() {
  localStorage.setItem("gs_gastos",       JSON.stringify(gastos));
  localStorage.setItem("gs_presupuestos", JSON.stringify(presupuestos));
  localStorage.setItem("gs_ingreso",      ingresoMensual);
}

// ── 3. NAVEGACIÓN ENTRE VISTAS ─────────────────────────────────
const navItems   = document.querySelectorAll(".nav-item");
const allViews   = document.querySelectorAll(".view");
const btnTexts   = document.querySelectorAll(".btn-text[data-view]");

function mostrarVista(nombre) {
  allViews.forEach(v => v.classList.remove("active"));
  navItems.forEach(n => n.classList.remove("active"));

  const vista = document.getElementById("view-" + nombre);
  if (vista) vista.classList.add("active");

  const navBtn = document.querySelector(`.nav-item[data-view="${nombre}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (nombre === "graficos") renderGraficos();
}

navItems.forEach(btn =>
  btn.addEventListener("click", () => mostrarVista(btn.dataset.view))
);
btnTexts.forEach(btn =>
  btn.addEventListener("click", () => mostrarVista(btn.dataset.view))
);

// ── 4. MODAL AGREGAR GASTO ─────────────────────────────────────
const modalOverlay  = document.getElementById("modal-overlay");
const btnOpenModal  = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal= document.getElementById("btn-cancel-modal");
const expenseForm   = document.getElementById("expense-form");

function abrirModal() {
  modalOverlay.classList.remove("hidden");
  document.getElementById("exp-date").value = new Date().toISOString().split("T")[0];
}
function cerrarModal() {
  modalOverlay.classList.add("hidden");
  expenseForm.reset();
  limpiarErrores();
  document.querySelectorAll(".chip-quick").forEach(c => c.classList.remove("selected"));
}

btnOpenModal .addEventListener("click", abrirModal);
btnCloseModal.addEventListener("click", cerrarModal);
btnCancelModal.addEventListener("click", cerrarModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) cerrarModal(); });

// Chips rápidos de categoría en el modal
document.querySelectorAll(".chip-quick").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("exp-category").value = btn.dataset.cat;
    document.querySelectorAll(".chip-quick").forEach(c => c.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// ── 5. VALIDACIÓN Y GUARDADO DE GASTO ─────────────────────────
function limpiarErrores() {
  ["description","amount","date","category"].forEach(id =>
    document.getElementById("err-" + id).textContent = ""
  );
}

expenseForm.addEventListener("submit", e => {
  e.preventDefault();
  limpiarErrores();

  const desc  = document.getElementById("exp-description").value.trim();
  const monto = parseFloat(document.getElementById("exp-amount").value);
  const fecha = document.getElementById("exp-date").value;
  const cat   = document.getElementById("exp-category").value;
  let valido  = true;

  if (!desc)          { document.getElementById("err-description").textContent = "Escribe una descripción."; valido = false; }
  if (!monto || monto <= 0) { document.getElementById("err-amount").textContent = "Monto debe ser mayor a 0."; valido = false; }
  if (!fecha)         { document.getElementById("err-date").textContent = "Selecciona una fecha."; valido = false; }
  if (!cat)           { document.getElementById("err-category").textContent = "Selecciona una categoría."; valido = false; }
  if (!valido) return;

  const nuevoGasto = {
    id:          Date.now(),
    descripcion: desc,
    monto:       monto,
    fecha:       fecha,
    categoria:   cat,
    notas:       document.getElementById("exp-notes").value.trim()
  };

  gastos.unshift(nuevoGasto);  // más reciente primero
  guardarDatos();
  cerrarModal();
  mostrarToast("✅ Gasto registrado correctamente", "success");
  renderDashboard();
  renderListaGastos();
});

// ── 6. RENDER DASHBOARD ────────────────────────────────────────
function renderDashboard() {
  const totalGastos  = gastos.reduce((s, g) => s + g.monto, 0);
  const totalIngreso = ingresoMensual;
  const balance      = totalIngreso - totalGastos;

  document.getElementById("total-income") .textContent = formatMonto(totalIngreso);
  document.getElementById("total-expense").textContent = formatMonto(totalGastos);
  document.getElementById("total-balance").textContent = formatMonto(balance);

  // Barra de presupuesto global
  const pct = totalIngreso > 0 ? Math.min((totalGastos / totalIngreso) * 100, 100) : 0;
  const bar = document.getElementById("global-budget-bar");
  bar.style.width = pct + "%";
  bar.className   = "progress-bar-fill" + (pct >= 100 ? " over" : pct >= 75 ? " warn" : "");
  document.getElementById("budget-percent-label")  .textContent = Math.round(pct) + "%";
  document.getElementById("budget-overview-detail").textContent =
    `${formatMonto(totalGastos)} de ${formatMonto(totalIngreso)}`;

  // Últimos 5 gastos
  const lista = document.getElementById("recent-expense-list");
  const ultimos = gastos.slice(0, 5);
  lista.innerHTML = ultimos.length
    ? ultimos.map(g => itemGastoHTML(g)).join("")
    : `<li class="empty-state">Aún no hay gastos registrados</li>`;

  agregarEventosEliminar(lista);
}

// ── 7. RENDER LISTA COMPLETA DE GASTOS ────────────────────────
let filtroActivo = "all";

function renderListaGastos() {
  const lista     = document.getElementById("full-expense-list");
  const filtrados = filtroActivo === "all"
    ? gastos
    : gastos.filter(g => g.categoria === filtroActivo);

  lista.innerHTML = filtrados.length
    ? filtrados.map(g => itemGastoHTML(g)).join("")
    : `<li class="empty-state">No hay gastos en esta categoría</li>`;

  agregarEventosEliminar(lista);
}

// Chips de filtro
document.getElementById("filter-chips").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#filter-chips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  filtroActivo = chip.dataset.filter;
  renderListaGastos();
});

// ── 8. HTML DE UN ITEM DE GASTO ────────────────────────────────
function itemGastoHTML(g) {
  return `
    <li class="expense-item" data-id="${g.id}">
      <div class="expense-icon">${ICONOS_CAT[g.categoria] || "📦"}</div>
      <div class="expense-info">
        <p class="expense-desc">${g.descripcion}</p>
        <div class="expense-meta">
          <span>${g.fecha}</span>
          <span class="expense-cat-badge badge-${g.categoria}">${g.categoria}</span>
        </div>
      </div>
      <span class="expense-amount">-${formatMonto(g.monto)}</span>
      <button class="expense-delete" data-id="${g.id}" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
        </svg>
      </button>
    </li>`;
}

function agregarEventosEliminar(contenedor) {
  contenedor.querySelectorAll(".expense-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      gastos = gastos.filter(g => g.id !== id);
      guardarDatos();
      mostrarToast("🗑️ Gasto eliminado", "error");
      renderDashboard();
      renderListaGastos();
      renderPresupuesto();
    });
  });
}

// ── 9. PRESUPUESTO ─────────────────────────────────────────────
document.getElementById("btn-save-income").addEventListener("click", () => {
  const val = parseFloat(document.getElementById("monthly-income").value);
  if (isNaN(val) || val < 0) { mostrarToast("⚠️ Ingresa un ingreso válido", "error"); return; }
  ingresoMensual = val;
  guardarDatos();
  mostrarToast("💾 Ingreso guardado", "success");
  renderDashboard();
  renderPresupuesto();
});

document.getElementById("btn-save-budgets").addEventListener("click", () => {
  document.querySelectorAll(".budget-input").forEach(input => {
    const cat = input.dataset.cat;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val >= 0) presupuestos[cat] = val;
  });
  guardarDatos();
  mostrarToast("💾 Presupuestos guardados", "success");
  renderDashboard();
  renderPresupuesto();
});

function renderPresupuesto() {
  // Rellenar campo de ingreso
  document.getElementById("monthly-income").value = ingresoMensual || "";

  const cats = ["comida","transporte","ocio","salud","educacion","hogar","otros"];
  cats.forEach(cat => {
    const gastadoCat = gastos
      .filter(g => g.categoria === cat)
      .reduce((s, g) => s + g.monto, 0);
    const limite = presupuestos[cat] || 0;
    const pct    = limite > 0 ? Math.min((gastadoCat / limite) * 100, 100) : 0;

    // Mostrar cuánto se ha gastado
    const spentEl = document.getElementById("spent-" + cat);
    if (spentEl) spentEl.textContent = `Gastado: ${formatMonto(gastadoCat)}`;

    // Rellenar inputs con valores guardados
    const input = document.querySelector(`.budget-input[data-cat="${cat}"]`);
    if (input && limite > 0) input.value = limite;

    // Barra de progreso
    const bar = document.getElementById("bar-" + cat);
    if (bar) {
      bar.style.width = pct + "%";
      bar.className   = "progress-bar-fill" + (pct >= 100 ? " over" : pct >= 75 ? " warn" : "");
    }
  });
}

// ── 10. GRÁFICOS ───────────────────────────────────────────────
let chartBar = null;
let chartPie = null;

function renderGraficos() {
  const cats    = ["comida","transporte","ocio","salud","educacion","hogar","otros"];
  const gastado = cats.map(c => gastos.filter(g => g.categoria === c).reduce((s, g) => s + g.monto, 0));
  const limites = cats.map(c => presupuestos[c] || 0);
  const colores = ["#f97316","#06b6d4","#a855f7","#22c55e","#3b82f6","#eab308","#94a3b8"];
  const labels  = cats.map(c => ICONOS_CAT[c] + " " + c);

  // Tabs
  document.querySelectorAll(".tab").forEach(tab =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".chart-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    })
  );

  // Chart: Presupuesto vs Real (barras)
  const ctxBar = document.getElementById("chart-bar").getContext("2d");
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Presupuesto", data: limites, backgroundColor: "rgba(99,102,241,0.4)", borderColor: "#6366f1", borderWidth: 1 },
        { label: "Gastado",     data: gastado, backgroundColor: colores.map(c => c + "cc"), borderColor: colores, borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#f1f5f9" } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
      }
    }
  });

  // Chart: Pie por categoría
  const ctxPie = document.getElementById("chart-pie").getContext("2d");
  if (chartPie) chartPie.destroy();
  const totalGeneral = gastado.reduce((s, v) => s + v, 0);
  chartPie = new Chart(ctxPie, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: gastado, backgroundColor: colores, borderColor: "#1e293b", borderWidth: 2 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#f1f5f9", font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = totalGeneral > 0 ? ((ctx.raw / totalGeneral) * 100).toFixed(1) : 0;
              return ` ${formatMonto(ctx.raw)} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // Resumen mensual en lista
  const listEl = document.getElementById("monthly-summary-list");
  const items  = cats.map((c, i) => ({ cat: c, gastado: gastado[i], limite: limites[i] }))
                     .filter(x => x.gastado > 0);
  if (items.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Sin datos para este mes</li>`;
  } else {
    listEl.innerHTML = items.map(x => `
      <li class="summary-list-item">
        <span>${ICONOS_CAT[x.cat]} ${x.cat}</span>
        <div style="text-align:right">
          <span class="s-amount">-${formatMonto(x.gastado)}</span>
          ${x.limite > 0 ? `<br><span class="s-cat">límite: ${formatMonto(x.limite)}</span>` : ""}
        </div>
      </li>`).join("");
  }
}

// ── 11. TOAST ──────────────────────────────────────────────────
function mostrarToast(msg, tipo = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = "toast " + tipo;
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ── 12. FORMATO DE MONEDA ──────────────────────────────────────
function formatMonto(n) {
  return "$" + (n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── 13. OFFLINE BANNER ─────────────────────────────────────────
const banner = document.getElementById("offline-banner");
function actualizarBanner() {
  banner.classList.toggle("hidden", navigator.onLine);
}
window.addEventListener("online",  actualizarBanner);
window.addEventListener("offline", actualizarBanner);
actualizarBanner();

// ── 14. PWA INSTALL PROMPT ─────────────────────────────────────
let deferredPrompt = null;
const btnInstall   = document.getElementById("btn-install");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.hidden = false;
});

btnInstall.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") btnInstall.hidden = true;
  deferredPrompt = null;
});

// ── 15. INICIALIZACIÓN ─────────────────────────────────────────
renderDashboard();
renderListaGastos();
renderPresupuesto();