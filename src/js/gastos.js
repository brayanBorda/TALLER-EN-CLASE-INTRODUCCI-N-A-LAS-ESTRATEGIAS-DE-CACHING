const modalOverlay = document.getElementById("modal-overlay"); // los modal son como ventanas emergentes, y el overlay es la capa que oscurece el fondo
const btnOpenModal = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal = document.getElementById("btn-cancel-modal");
const expenseForm = document.getElementById("expense-form");

let filtroActivo = "all";

function abrirModal() {
    modalOverlay.classList.remove("hidden");
    document.getElementById("exp-date").value = new Date().toISOString().split("T")[0];
}

function cerrarModal() {
    modalOverlay.classList.add("hidden");
    expenseForm.reset();
    limpiarErrores();
}

function limpiarErrores() {
    ["description", "amount", "date", "category"].forEach(id =>
        document.getElementById("err-" + id).textContent = ""
    );
}

function itemGastoHTML(g) {
    return `
    <li class="expense-item" data-id="${g.id}">
        <div class="expense-icon">${ICONOS_CAT[g.categoria] || "OTR"}</div>
        <div class="expense-info">
        <p class="expense-desc">${g.descripcion}</p>
        <div class="expense-meta">
            <span>${g.fecha}</span>
            <span class="expense-cat-badge badge-${g.categoria}">${NOMBRES_CAT[g.categoria] || g.categoria}</span>
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
            mostrarToast("Gasto eliminado", "error");
            renderDashboard();
            renderListaGastos();
            renderPresupuesto();
        });
    });
}

function renderListaGastos() {
    const lista = document.getElementById("full-expense-list");
    const filtrados = filtroActivo === "all"
        ? gastos
        : gastos.filter(g => g.categoria === filtroActivo);

    lista.innerHTML = filtrados.length
        ? filtrados.map(g => itemGastoHTML(g)).join("")
        : `<li class="empty-state">Aún no hay gastos registrados</li>`;

    agregarEventosEliminar(lista);
}

// Interfaz modal
btnOpenModal.addEventListener("click", abrirModal);
btnCloseModal.addEventListener("click", cerrarModal);
btnCancelModal.addEventListener("click", cerrarModal);
modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) cerrarModal();
});

// Formulario de nuevo gasto
expenseForm.addEventListener("submit", e => {
    e.preventDefault();
    limpiarErrores();

    const desc = document.getElementById("exp-description").value.trim();
    const monto = parseFloat(document.getElementById("exp-amount").value);
    const fecha = document.getElementById("exp-date").value;
    const cat = document.getElementById("exp-category").value;
    let valido = true;

    // ifs de validación simples. Para evitar hacer if anidado pues hacemos if normales y negamos la condición. Lo vi en un video y si funciona jasjas
    // estos if validan que el usuario haya ingresado una descripción, un monto válido, una fecha y una categoría. Si alguna de estas condiciones no se cumple, se muestra un mensaje de error y se detiene la ejecución
    if (!desc) {
        document.getElementById("err-description").textContent = "Escribe una descripción.";
        valido = false;
    }
    if (!monto || monto < 1000) {
        document.getElementById("err-amount").textContent = "Monto mínimo: $1.000.";
        valido = false;
    }
    if (!fecha) {
        document.getElementById("err-date").textContent = "Selecciona una fecha.";
        valido = false;
    }
    if (!cat) {
        document.getElementById("err-category").textContent = "Selecciona una categoría.";
        valido = false;
    }
    if (!valido) return;

    const nuevoGasto = {
        id: Date.now(),
        descripcion: desc,
        monto: monto,
        fecha: fecha,
        categoria: cat,
        notas: document.getElementById("exp-notes").value.trim()
    };

    // el unshift es para agregar el nuevo gasto al inicio del array donde se guarda el gasto
    gastos.unshift(nuevoGasto);
    guardarDatos();
    cerrarModal();
    mostrarToast("Gasto registrado correctamente", "success");
    renderDashboard();
    renderListaGastos();
});

// contenedor de los chips de filtro, funciona al darle click a cada chip para que se active básciamente 
document.getElementById("filter-chips").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#filter-chips .chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    filtroActivo = chip.dataset.filter;
    renderListaGastos();
});