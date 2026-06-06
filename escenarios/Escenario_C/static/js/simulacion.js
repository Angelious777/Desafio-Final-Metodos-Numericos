let chartInstancia = null;
let datosInicialesX = [];
let datosInicialesY = [];

// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    // Extraer de forma segura los datos quemados en el HTML desde Flask
    const contenedorDatos = document.getElementById('datos-flask');
    if (contenedorDatos) {
        datosInicialesX = JSON.parse(contenedorDatos.getAttribute('data-x'));
        datosInicialesY = JSON.parse(contenedorDatos.getAttribute('data-y'));
    }

    // Inicializar el gráfico inicial solo con los puntos base
    inicializarGrafico();

    // Asignar el evento click al botón de simulación
    const btnSimular = document.getElementById('btn-simular');
    if (btnSimular) {
        btnSimular.addEventListener('click', ejecutarSimulacion);
    }
});

/**
 * Inicializa y actualiza la instancia del gráfico
 * @param {Array} curvaX - Puntos del eje X para la línea continua
 * @param {Array} curvaY - Puntos del eje Y para la línea continua
 * @param {Object|null} puntoInterpolado - Coordenadas {x, y} del nuevo día calculado
 */
function inicializarGrafico(curvaX = [], curvaY = [], puntoInterpolado = null) {
    const ctx = document.getElementById('graficoPrecios').getContext('2d');
    
    // Si ya existe un gráfico previo, lo destruimos para evitar duplicados visuales al mover el mouse
    if (chartInstancia) {
        chartInstancia.destroy();
    }

    // Construimos los datasets base
    const datasets = [
        {
            label: 'Datos Reales Muestreados',
            data: datosInicialesX.map((x, i) => ({x: x, y: datosInicialesY[i]})),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            pointRadius: 7,
            showLine: false,
            type: 'scatter',
            order: 2
        },
        {
            label: 'Curva de Ajuste / Reconstrucción',
            data: curvaX.map((x, i) => ({x: x, y: curvaY[i]})),
            borderColor: 'rgba(13, 110, 253, 0.7)',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 3
        }
    ];

    // Si el usuario ya simuló un día, inyectamos dinámicamente el nuevo punto destacado
    if (puntoInterpolado) { 
        datasets.push({
            label: `Día ${puntoInterpolado.x.toFixed(1)} Estimado`,
            data: [puntoInterpolado],
            borderColor: 'rgb(40, 167, 69)',
            backgroundColor: 'rgba(40, 167, 69, 0.8)',
            pointRadius: 10,       
            pointHoverRadius: 12,
            type: 'scatter',
            order: 1               
        });
    }

    chartInstancia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: curvaX.length > 0 ? curvaX.map(v => `Día ${v.toFixed(1)}`) : datosInicialesX.map(v => `Día ${v}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // OBLIGATORIO: Permite que el gráfico llene el contenedor div de 380px sin encogerse
            scales: {
                x: { 
                    type: 'linear', 
                    position: 'bottom', 
                    title: { display: true, text: 'Días transcurridos' },
                    min: 1,
                    max: 30
                },
                y: { 
                    title: { display: true, text: 'Precio (Bs)' } 
                }
            }
        }
    });
}

function ejecutarSimulacion() {
    const xInput = document.getElementById('x_input');
    if (!xInput) return;

    const xVal = parseFloat(xInput.value);

    fetch('/Escenario_C/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x_val: xVal })
    })
    .then(response => response.json())
    .then(data => {
        // Mostrar la sección oculta de los resultados
        document.getElementById('seccion-resultados').classList.remove('d-none');

        // Asignar las respuestas numéricas en las etiquetas HTML
        document.getElementById('res-lagrange').innerText = data.lagrange_res.toFixed(4) + " Bs";
        document.getElementById('res-newton').innerText = data.newton_res.toFixed(4) + " Bs";
        document.getElementById('res-spline').innerText = data.spline_res.toFixed(4) + " Bs";

        // Insertar las memorias de cálculo dinámicas
        document.getElementById('exp-lagrange').innerHTML = data.lagrange_exp;
        document.getElementById('exp-newton').innerHTML = data.newton_exp;
        document.getElementById('exp-spline').innerHTML = data.spline_exp;

        // Obligar a MathJax a compilar los nuevos strings de LaTeX insertados
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise();
        }

        // Estructuramos el nuevo punto utilizando el resultado de Lagrange (o el que prefieras destacar)
        const nuevoPunto = {
            x: xVal,
            y: data.lagrange_res
        };

        // Redibujamos la gráfica pasando la curva completa Y el punto interactivo
        inicializarGrafico(data.x_curva, data.y_curva, nuevoPunto);
    })
    .catch(error => console.error("Error en la simulación:", error));
}