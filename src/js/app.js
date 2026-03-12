if ("serviceWorker" in navigator) { // Solo registro el SW
  navigator.serviceWorker.register("./sw.js").catch(err =>
    console.warn("SW no registrado:", err)
  );
}

function formatMonto(n) {
  return "$" + (n || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Esto es para mostrar mensajes de éxito/error sin interrumpir la UX con alertar chiquitas 
function mostrarToast(msg, tipo = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast " + tipo;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

const navItems = document.querySelectorAll(".nav-item");
const allViews = document.querySelectorAll(".view");
const btnTexts = document.querySelectorAll(".btn-text[data-view]");

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

// Renderizado del dashboard principal con resumen de gastos, presupuesto y balance. 
// Cada mes tiene su resumen, presupuesto y balance pero también se puede ver un resumen anual con todos los gastos.
function renderDashboard() {
  const mesSeleccionado = document.getElementById("dashboard-month-selector").value;
  console.log("Mes seleccionado:", mesSeleccionado); // Debug temporal

  let gastosFiltrados, presupuestoTotal;

  if (mesSeleccionado === "all") {
    gastosFiltrados = gastos;
    presupuestoTotal = ingresoMensual * 12; // Se toma en cuenta todo el año, por eso se multiplica por 12
  } else {
    gastosFiltrados = gastos.filter(g => g.fecha.startsWith(mesSeleccionado));
    presupuestoTotal = ingresoMensual;
  }

  console.log("Total gastos:", gastos.length, "Filtrados:", gastosFiltrados.length); // Debug temporal

  const totalGastos = gastosFiltrados.reduce((s, g) => s + g.monto, 0);
  const balance = presupuestoTotal - totalGastos;

  document.getElementById("total-income").textContent = formatMonto(presupuestoTotal);
  document.getElementById("total-expense").textContent = formatMonto(totalGastos);
  document.getElementById("total-balance").textContent = formatMonto(balance);

  const pct = presupuestoTotal > 0 ? Math.min((totalGastos / presupuestoTotal) * 100, 100) : 0;
  const bar = document.getElementById("global-budget-bar");
  bar.style.width = pct + "%";
  bar.className = "progress-bar-fill" + (pct >= 100 ? " over" : pct >= 75 ? " warn" : "");
  document.getElementById("budget-percent-label").textContent = Math.round(pct) + "%";
  document.getElementById("budget-overview-detail").textContent =
    `${formatMonto(totalGastos)} de ${formatMonto(presupuestoTotal)}`;

  const lista = document.getElementById("recent-expense-list");
  const ultimos = gastosFiltrados
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);
  lista.innerHTML = ultimos.length
    ? ultimos.map(g => itemGastoHTML(g)).join("")
    : `<li class="empty-state">Aún no hay gastos registrados para este período</li>`;

  agregarEventosEliminar(lista);
}

function renderPresupuesto() {
  document.getElementById("monthly-income").value = ingresoMensual || "";

  CATEGORIAS.forEach(cat => {
    const gastadoCat = gastos
      .filter(g => g.categoria === cat)
      .reduce((s, g) => s + g.monto, 0);
    const limite = presupuestos[cat] || 0;
    const pct = limite > 0 ? Math.min((gastadoCat / limite) * 100, 100) : 0;

    const spentEl = document.getElementById("spent-" + cat);
    if (spentEl) spentEl.textContent = `Gastado: ${formatMonto(gastadoCat)}`;

    const input = document.querySelector(`.budget-input[data-cat="${cat}"]`);
    if (input && limite > 0) input.value = limite;

    const bar = document.getElementById("bar-" + cat);
    if (bar) {
      bar.style.width = pct + "%";
      bar.className = "progress-bar-fill" + (pct >= 100 ? " over" : pct >= 75 ? " warn" : "");
    }
  });
}

document.getElementById("btn-save-income").addEventListener("click", () => {
  const errEl = document.getElementById("err-income");
  errEl.textContent = "";
  const val = parseFloat(document.getElementById("monthly-income").value);
  if (isNaN(val) || val < 5000) {
    errEl.textContent = "El ingreso debe ser mínimo $5.000.";
    mostrarToast("Ingreso inválido", "error");
    return;
  }
  ingresoMensual = val;
  guardarDatos();
  mostrarToast("Ingreso guardado correctamente", "success");
  renderDashboard();
  renderPresupuesto();
});

document.getElementById("btn-save-budgets").addEventListener("click", () => {
  let hayError = false;

  CATEGORIAS.forEach(cat => {
    const errEl = document.getElementById("err-budget-" + cat);
    errEl.textContent = "";
  });

  document.querySelectorAll(".budget-input").forEach(input => {
    const cat = input.dataset.cat;
    const val = parseFloat(input.value);
    const errEl = document.getElementById("err-budget-" + cat);

    if (input.value && (isNaN(val) || val < 5000)) {
      errEl.textContent = "Mínimo $5.000.";
      hayError = true;
    } else if (!isNaN(val) && val >= 5000) {
      presupuestos[cat] = val;
    } else {
      presupuestos[cat] = 0;
    }
  });

  if (hayError) {
    mostrarToast("Corrige los errores en los presupuestos", "error");
    return;
  }

  guardarDatos();
  mostrarToast("Presupuestos guardados correctamente", "success");
  renderDashboard();
  renderPresupuesto();
});

const banner = document.getElementById("offline-banner");
function actualizarBanner() {
  banner.classList.toggle("hidden", navigator.onLine);
}
window.addEventListener("online", actualizarBanner);
window.addEventListener("offline", actualizarBanner);
actualizarBanner();

// El botón del header descarga el reporte PDF del mes activo en gráficos
document.getElementById("btn-download-pdf").addEventListener("click", () => {
  descargarPDF();
});

document.getElementById("dashboard-month-selector").addEventListener("change", (e) => {
  // Sincronizamos el selector de gráficos para que el PDF use el mismo mes
  document.getElementById("graph-month-selector").value = e.target.value;
  renderDashboard();
});

renderDashboard();
renderListaGastos();
renderPresupuesto();