let chartBar = null;
let chartPie = null;


// Tenemos graficos de barras y pastel para mostrar el resumen mensual/anual, además de una lista detallda
function renderGraficos() {
    const mesGrafico = document.getElementById("graph-month-selector").value;
    
    // Filtro para del mes selleccionado o todos los meses
    let gastosFiltrados, tituloResumen;
    
    if (mesGrafico === "all") {
        gastosFiltrados = gastos;
        tituloResumen = "Resumen Anual 2026";
    } else {
        gastosFiltrados = gastos.filter(g => g.fecha.startsWith(mesGrafico));
        const meses = {
            "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
            "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
            "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
        };
        const [año, mes] = mesGrafico.split("-");
        tituloResumen = `Resumen de ${meses[mes]} ${año}`;
    }
    
    document.getElementById("monthly-summary-title").textContent = tituloResumen;
    
    const gastado = CATEGORIAS.map((c) =>
        gastosFiltrados.filter((g) => g.categoria === c).reduce((s, g) => s + g.monto, 0),
    );
    const limites = CATEGORIAS.map((c) => {
        const presupuestoBase = presupuestos[c] || 0;
        return mesGrafico === "all" ? presupuestoBase * 12 : presupuestoBase;
    });
    const colores = COLORES_CAT;
    const labels = CATEGORIAS.map((c) => NOMBRES_CAT[c]);

    // Configuración de eventos para las pestañas de gráficos
    document.querySelectorAll(".tab").forEach((tab) =>
        tab.addEventListener("click", () => {
            document
                .querySelectorAll(".tab")
                .forEach((t) => t.classList.remove("active"));
            document
                .querySelectorAll(".chart-panel")
                .forEach((p) => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
        }),
    );

    const ctxBar = document.getElementById("chart-bar").getContext("2d");
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctxBar, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Presupuesto",
                    data: limites,
                    backgroundColor: "rgba(99,102,241,0.4)",
                    borderColor: "#6366f1",
                    borderWidth: 1,
                },
                {
                    label: "Gastado",
                    data: gastado,
                    backgroundColor: colores.map((c) => c + "cc"),
                    borderColor: colores,
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#f1f5f9" } } },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
                y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
            },
        },
    });

    const ctxPie = document.getElementById("chart-pie").getContext("2d");
    if (chartPie) chartPie.destroy();
    const totalGeneral = gastado.reduce((s, v) => s + v, 0);
    chartPie = new Chart(ctxPie, {
        type: "doughnut",
        data: {
            labels,
            datasets: [
                {
                    data: gastado,
                    backgroundColor: colores,
                    borderColor: "#1e293b",
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#f1f5f9", font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const pct =
                                totalGeneral > 0
                                    ? ((ctx.raw / totalGeneral) * 100).toFixed(1)
                                    : 0;
                            return ` ${formatMonto(ctx.raw)} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });

    const listEl = document.getElementById("monthly-summary-list");
    const items = CATEGORIAS
        .map((c, i) => ({ cat: c, gastado: gastado[i], limite: limites[i] }))
        .filter((x) => x.gastado > 0);
    if (items.length === 0) {
        listEl.innerHTML = `<li class="empty-state">Sin datos para este mes</li>`;
    } else {
        listEl.innerHTML = items
            .map(
                (x) => `
        <li class="summary-list-item">
        <span>${NOMBRES_CAT[x.cat]}</span>
        <div style="text-align:right">
            <span class="s-amount">-${formatMonto(x.gastado)}</span>
            ${x.limite > 0 ? `<br><span class="s-cat">límite: ${formatMonto(x.limite)}</span>` : ""}
        </div>
        </li>`,
            )
            .join("");
    }
}

// Evento para actualizar los gráficos al cambiar el mes seleccionado
document.getElementById("graph-month-selector").addEventListener("change", () => {
    renderGraficos();
});
