/**
 * Renderiza el gráfico matemático de comparación de métodos numéricos
 * utilizando Chart.js a partir de los datos inyectados en el DOM.
 */
document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById('graficoReservas');
    if (!canvas) return; // Salvaguarda si no existe el gráfico en pantalla

    // Recuperar los datos desde los atributos personalizados 'data-*' del canvas
    const etiquetasTiempo = JSON.parse(canvas.getAttribute('data-tiempo'));
    const datosEuler = JSON.parse(canvas.getAttribute('data-euler'));
    const datosHeun = JSON.parse(canvas.getAttribute('data-heun'));
    const datosRK4 = JSON.parse(canvas.getAttribute('data-rk4'));
    const umbralValor = parseFloat(canvas.getAttribute('data-umbral'));
    
    // Crear el arreglo plano para la línea del umbral crítico
    const umbralFijo = Array(etiquetasTiempo.length).fill(umbralValor);

    // Configuración y construcción del gráfico de líneas
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetasTiempo,
            datasets: [
                {
                    label: 'Método de Euler',
                    data: datosEuler,
                    borderColor: '#dc3545',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Método de Heun',
                    data: datosHeun,
                    borderColor: '#0d6efd',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Método Runge-Kutta 4 (RK4)',
                    data: datosRK4,
                    borderColor: '#198754',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Umbral Crítico de Alerta',
                    data: umbralFijo,
                    borderColor: '#ffc107',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo transcurrido (Días)', font: { weight: 'bold' } }
                },
                y: {
                    title: { display: true, text: 'Volumen de Reserva en Planta', font: { weight: 'bold' } },
                    beginAtZero: false
                }
            }
        }
    });
});