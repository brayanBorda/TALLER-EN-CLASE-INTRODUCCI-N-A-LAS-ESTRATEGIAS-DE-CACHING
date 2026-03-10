**CASO DE ESTUDIO**

Se requiere crear una app que permita rastrear sus gastos financieros, establece presupuestos y visualiza patrones de gastos.

A continuación, las funcionalidades que debe tener su app:

* Permite registrar sus gastos diarios de forma fácil y rápida 
* A través de categorías de gastos (comida, transporte, ocio, etc.) puede registrar sus gastos de forma predefinida. 
* Establecer presupuestos: Establezca presupuestos mensuales para sus gastos de acuerdo a los ingresos
* Generación de gráficos que contrasten el presupuesto establecido frente al gasto real y resúmenes mensuales de la actividad financiera.

---

**Actividades**

En grupos de 3 integrantes desarrollen la aplicación teniendo en cuenta lo siguiente:

1. Desarrolle la aplicación PWA que cumpla con lo solicitado
2. Aplique todo lo visto en clase para definir el proyecto con todos los archivos del mismo (SW, app.js, index.html, etc)
3. Asegúrese de registrar todos los métodos del service Worker (install, actívate)
4. Valide posibles escenarios de manejo de errores aseguando un comportamiento de aplicación nativa.
5. Asegúrese de tener registrados los elementos del App Shell en el cache storage, mediante la utilización de los métodos de caching vistos en clase.

---

Ya está implementado el Service Worker con install, activate y el fetch en sw.js. 
Se cachean archivos principales.
Registro del Service Worker en app.js.