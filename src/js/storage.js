let gastos = [];
let presupuestos = {};
let ingresoMensual = 0;

// Esta funcion carga los datos guardados en localStorage al iniciar la aplicación
function cargarDatos() {
  gastos = JSON.parse(localStorage.getItem("gs_gastos") || "[]");
  presupuestos = JSON.parse(localStorage.getItem("gs_presupuestos") || "{}");
  ingresoMensual = parseFloat(localStorage.getItem("gs_ingreso") || "0");
}

// Esta función guarda los datos actuales en localStorage
function guardarDatos() {
  localStorage.setItem("gs_gastos", JSON.stringify(gastos));
  localStorage.setItem("gs_presupuestos", JSON.stringify(presupuestos));
  localStorage.setItem("gs_ingreso", ingresoMensual);
}

cargarDatos();