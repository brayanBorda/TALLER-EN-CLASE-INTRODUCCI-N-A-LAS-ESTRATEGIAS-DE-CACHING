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
document.getElementById("graph-month-selector").addEventListener("change", (e) => {
    // Sincronizamos el selector del dashboard para que ambos siempre coincidan
    document.getElementById("dashboard-month-selector").value = e.target.value;
    renderGraficos();
});

// Genera y descarga el PDF con el gráfico de pastel y la lista de gastos del mes seleccionado
function descargarPDF() {
    mostrarToast("Generando PDF...");

    // Mes que tiene seleccionado el usuario
    const mesGrafico = document.getElementById("graph-month-selector").value;

    const meses = {
        "01": "Enero", "02": "Febrero", "03": "Marzo",
        "04": "Abril", "05": "Mayo", "06": "Junio",
        "07": "Julio", "08": "Agosto", "09": "Septiembre",
        "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    };

    // Título del reporte según el mes
    let tituloReporte;
    if (mesGrafico === "all") {
        tituloReporte = "Reporte Anual 2026";
    } else {
        const [año, mes] = mesGrafico.split("-");
        tituloReporte = `Reporte de ${meses[mes]} ${año}`;
    }

    // Filtramos los gastos del período
    const gastosFiltrados = mesGrafico === "all"
        ? gastos
        : gastos.filter(g => g.fecha.startsWith(mesGrafico));

    const total = gastosFiltrados.reduce((s, g) => s + g.monto, 0);

    // Solo las categorías que tienen algún gasto registrado
    const categoriasDatos = CATEGORIAS.map((c, i) => ({
        nombre: NOMBRES_CAT[c],
        color: COLORES_CAT[i],
        gastado: gastosFiltrados.filter(g => g.categoria === c).reduce((s, g) => s + g.monto, 0)
    })).filter(c => c.gastado > 0);

    // Creamos un chart temporal con fondo blanco y sin animación para capturar
    // la imagen del gráfico correctamente en el PDF.
    const fondoBlancoPDF = {
        id: "fondoBlancoPDF",
        beforeDraw(chart) {
            const ctx = chart.canvas.getContext("2d");
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };

    if (chartPie) chartPie.destroy();

    const ctxPie = document.getElementById("chart-pie").getContext("2d");
    const chartPDF = new Chart(ctxPie, {
        type: "pie",
        data: {
            labels: categoriasDatos.map(c => c.nombre),
            datasets: [{
                data: categoriasDatos.map(c => c.gastado),
                backgroundColor: categoriasDatos.map(c => c.color),
                borderColor: "#ffffff",
                borderWidth: 3,
            }]
        },
        options: {
            responsive: false,
            animation: false,  // sin animación para capturar de inmediato
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [fondoBlancoPDF]
    });

    // Capturamos el canvas como PNG en base64
    const imagenGrafico = document.getElementById("chart-pie").toDataURL("image/png");

    // Destruimos el temporal y volvemos a poner el chart normal de la app
    chartPDF.destroy();
    renderGraficos();

    // Creamos el documento: A4 vertical, en milímetros
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const margen = 15;
    const anchoUtil = 180;  // 210mm - 2×15mm
    let y = 0;

    // Banda violeta en el encabezado
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, "F");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("GastoSmart", margen, 14);
    doc.setFontSize(11);
    doc.setTextColor(199, 210, 254);
    doc.text(tituloReporte, margen, 24);

    y = 38;

    // Gráfico de pastel centrado
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Distribución por categoría", margen, y);
    doc.setFont("helvetica", "normal");
    y += 5;

    const anchoImg = 90;
    const altoImg = 90;
    const xImg = margen + (anchoUtil - anchoImg) / 2;
    doc.addImage(imagenGrafico, "PNG", xImg, y, anchoImg, altoImg);
    y += altoImg + 6;

    // Leyenda manual en 2 columnas: cuadrito de color, nombre, monto y porcentaje
    const colAncho = anchoUtil / 2;
    const tamCuadrito = 4;
    doc.setFontSize(8.5);

    categoriasDatos.forEach((cat, i) => {
        const col = i % 2;
        const fila = Math.floor(i / 2);
        const xCat = margen + col * colAncho;
        const yCat = y + fila * 7;

        // Convertimos el color hex a RGB
        const r = parseInt(cat.color.slice(1, 3), 16);
        const gv = parseInt(cat.color.slice(3, 5), 16);
        const b = parseInt(cat.color.slice(5, 7), 16);
        doc.setFillColor(r, gv, b);
        doc.rect(xCat, yCat - 3.5, tamCuadrito, tamCuadrito, "F");

        const pct = total > 0 ? ((cat.gastado / total) * 100).toFixed(1) : "0.0";
        doc.setTextColor(30, 41, 59);
        doc.text(
            `${cat.nombre}: ${formatMonto(cat.gastado)} (${pct}%)`,
            xCat + tamCuadrito + 2,
            yCat
        );
    });

    y += Math.ceil(categoriasDatos.length / 2) * 7 + 8;

    doc.setDrawColor(226, 232, 240);
    doc.line(margen, y, margen + anchoUtil, y);
    y += 8;

    // Tabla de gastos
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Detalle de gastos", margen, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    const cols = {
        fecha: margen,
        desc: margen + 28,
        cat: margen + 100,
        monto: margen + 142
    };
    const altoFila = 7;

    // Cabecera de la tabla
    doc.setFillColor(99, 102, 241);
    doc.rect(margen, y, anchoUtil, altoFila, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Fecha", cols.fecha + 2, y + 5);
    doc.text("Descripción", cols.desc, y + 5);
    doc.text("Categoría", cols.cat, y + 5);
    doc.text("Monto", cols.monto, y + 5);
    y += altoFila;

    // Filas con color alternado
    doc.setFontSize(8);
    if (gastosFiltrados.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text("No hay gastos registrados para este período.", cols.fecha + 2, y + 5);
        y += altoFila;
    } else {
        gastosFiltrados.forEach((g, i) => {
            if (i % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(margen, y, anchoUtil, altoFila, "F");
            }

            // Descripción larga la cortamos para que no se salga de la columna
            const desc = g.descripcion.length > 33
                ? g.descripcion.substring(0, 30) + "..."
                : g.descripcion;
            const nombreCat = NOMBRES_CAT[g.categoria] || g.categoria;

            doc.setTextColor(100, 116, 139);
            doc.text(g.fecha, cols.fecha + 2, y + 5);
            doc.setTextColor(30, 41, 59);
            doc.text(desc, cols.desc, y + 5);
            doc.text(nombreCat, cols.cat, y + 5);
            doc.text(formatMonto(g.monto), cols.monto, y + 5);

            y += altoFila;
            if (y > 270) { doc.addPage(); y = 20; }  // nueva página si se acaba el espacio
        });
    }

    // Total al final de la tabla
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margen, y, margen + anchoUtil, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text("Total gastado:", cols.cat, y);
    doc.setTextColor(30, 41, 59);
    doc.text(formatMonto(total), cols.monto, y);
    doc.setFont("helvetica", "normal");

    // Pie de página con fecha de generación
    y += 12;
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Generado por GastoSmart — ${new Date().toLocaleDateString("es-CO")}`,
        margen, y
    );

    // Nombre del archivo y descarga
    const nombreArchivo = mesGrafico === "all"
        ? "GastoSmart-Anual-2026.pdf"
        : `GastoSmart-${meses[mesGrafico.split("-")[1]]}-${mesGrafico.split("-")[0]}.pdf`;

    doc.save(nombreArchivo);
    mostrarToast("PDF descargado", "success");
}