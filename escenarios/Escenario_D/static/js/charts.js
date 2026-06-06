// Variables globales para las instancias de los gráficos
let chartPreciosInstance = null;
let chartCanastaInstance = null;

// ============================================
// 1. Gráfico Principal (Curva y Área Integral)
// ============================================
function renderizarGraficoPrecios(dias, precios, producto) {
    const canvas = document.getElementById('graficoPrecios');
    if (!canvas) return; // Salvaguarda si el elemento HTML no existe en el DOM
    const ctx = canvas.getContext('2d');
    
    if (chartPreciosInstance) {
        chartPreciosInstance.destroy();
    }

    // BLINDAJE: Aseguramos datos válidos y evitamos arrays vacíos destructivos
    const diasNum = (dias && dias.length > 0) ? dias.map(d => parseFloat(d) || 0) : [0];
    const preciosNum = (precios && precios.length > 0) ? precios.map(p => parseFloat(p) || 0) : [0];

    // Estructura de datos {x, y} requerida para escalas lineales precisas
    const dataReal = diasNum.map((d, i) => ({ x: d, y: preciosNum[i] !== undefined ? preciosNum[i] : 0 }));
    const basePrecioIdeal = preciosNum[0] !== undefined ? preciosNum[0] : 0;
    const dataIdeal = diasNum.map((d) => ({ x: d, y: basePrecioIdeal }));

    // Detectar el método actual para ajustar la geometría de la curva
    const metodoSelect = document.getElementById('metodo-select');
    const metodoActivo = metodoSelect ? metodoSelect.value : 'trapecio';
    
    // Geometría del método: Trapecio usa rectas (0), Simpson usa polinomios curvos (0.4)
    const tensionCurva = (metodoActivo === 'trapecio') ? 0 : 0.4;

    // BLINDAJE: Evitar valores 'Infinity' en Math.min/max si el array se desconfigura
    const xMin = Math.min(...diasNum);
    const xMax = Math.max(...diasNum);
    const yMinRaw = Math.min(...preciosNum);
    const yMaxRaw = Math.max(...preciosNum);

    const yMin = isFinite(yMinRaw) ? Math.floor(yMinRaw * 0.9) : 0;
    const yMax = isFinite(yMaxRaw) ? Math.ceil(yMaxRaw * 1.1) : 100;

    chartPreciosInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Precio Real: ${producto}`,
                    data: dataReal,
                    borderColor: '#d63031',
                    backgroundColor: 'rgba(214, 48, 49, 0.3)',
                    borderWidth: 3,
                    fill: '+1', // Rellena el espacio hacia el dataset siguiente (Precio Ideal)
                    tension: tensionCurva, 
                    pointRadius: 5,
                    pointBackgroundColor: '#d63031',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7
                },
                {
                    label: 'Precio Constante Ideal (Sin inflación)',
                    data: dataIdeal,
                    borderColor: '#0984e3',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${(context.parsed.y || 0).toFixed(2)} Bs`;
                        }
                    }
                },
                legend: {
                    labels: {
                        font: { family: "'JetBrains Mono', monospace", size: 11 }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: isFinite(xMin) ? xMin : 0,
                    max: isFinite(xMax) ? xMax : 30,
                    title: { display: true, text: 'Discretización Temporal (Días)', font: { weight: 'bold' } },
                    ticks: { stepSize: 1 },
                    grid: { color: '#e0e0e0' }
                },
                y: {
                    beginAtZero: false,
                    min: yMin, 
                    max: yMax,
                    title: { display: true, text: 'Magnitud (Bs)', font: { weight: 'bold' } },
                    grid: { color: '#e0e0e0' }
                }
            }
        }
    });

    // Disparar la actualización del análisis global silenciosamente
    generarAnalisisGlobalCanasta();
}

// ============================================
// 2. Gráfico Análisis Canasta Familiar y Tabla
// ============================================
function generarAnalisisGlobalCanasta() {
    if (typeof datosSimulacion === 'undefined') return;

    // === AJUSTE DINÁMICO: Extraer automáticamente todos los productos omitiendo el eje 'dias' ===
    const productos = Object.keys(datosSimulacion).filter(key => key !== 'dias');
    
    // Mapeo seguro con el diccionario de nombres del paso anterior (si no existe, usa un fallback local)
    const mapaNombres = typeof nombresProductos !== 'undefined' ? nombresProductos : {
        "arroz": "Arroz (Bs/kg)", "aceite": "Aceite (Bs/Litro)", "huevo": "Huevo (Bs/U.)", "papa": "Papa (Bs/kg)",
        "pollo": "Pollo (Bs/kg)", "carne_res": "Carne de Res (Bs/kg)", "tomate": "Tomate (Bs/kg)", "zanahoria": "Zanahoria (Bs/kg)"
    };
    
    const dias = datosSimulacion.dias || [1, 5, 10, 15, 20, 25, 30];
    const a = dias[0];
    const b = dias[dias.length - 1];
    
    let resultados = [];

    productos.forEach((prod) => {
        let precios = datosSimulacion[prod] || Array(dias.length).fill(0);
        let gastoReal = 0;
        
        for (let i = 0; i < dias.length - 1; i++) {
            let h_individual = dias[i + 1] - dias[i];
            
            // BLINDAJE: Validar si existen los índices del precio para evitar NaN en cálculos iterativos
            let p_actual = precios[i] !== undefined ? precios[i] : 0;
            let p_siguiente = precios[i + 1] !== undefined ? precios[i + 1] : 0;
            
            gastoReal += (h_individual / 2) * (p_actual + p_siguiente);
        }
        
        let precioBase = precios[0] !== undefined ? precios[0] : 0;
        let gastoIdeal = precioBase * (b - a);
        let perdida = gastoReal - gastoIdeal;
        let porcentaje = (gastoIdeal > 0) ? (perdida / gastoIdeal) * 100 : 0;

        resultados.push({
            nombre: mapaNombres[prod] || prod.toUpperCase(),
            gastoReal: gastoReal,
            perdida: perdida,
            porcentaje: porcentaje
        });
    });

    // Ordenar de mayor a menor impacto de sobrecosto
    resultados.sort((a, b) => b.perdida - a.perdida);

    // 3. Renderizar Gráfico de Barras de la Canasta
    const canvasCanasta = document.getElementById('graficoCanasta');
    if (!canvasCanasta) return;
    
    const ctx = canvasCanasta.getContext('2d');
    if (chartCanastaInstance) chartCanastaInstance.destroy();

    // === AJUSTE DE COLORES: Paleta extendida para soportar múltiples productos sin romperse ===
    const paletaColores = [
        { bg: 'rgba(214, 48, 49, 0.8)', border: '#b33939' },   // Rojo
        { bg: 'rgba(225, 177, 44, 0.8)', border: '#cd6133' },  // Amarillo/Naranja
        { bg: 'rgba(9, 132, 227, 0.8)', border: '#0652DD' },   // Azul
        { bg: 'rgba(46, 204, 113, 0.8)', border: '#27ae60' },  // Verde
        { bg: 'rgba(155, 89, 182, 0.8)', border: '#8e44ad' },  // Morado
        { bg: 'rgba(230, 126, 34, 0.8)', border: '#d35400' },  // Naranja oscuro
        { bg: 'rgba(22, 160, 133, 0.8)', border: '#16a085' },  // Turquesa
        { bg: 'rgba(127, 140, 141, 0.8)', border: '#7f8c8d' }  // Gris
    ];

    // Asignamos colores de manera cíclica usando el operador módulo (%)
    const backgroundColors = resultados.map((_, i) => paletaColores[i % paletaColores.length].bg);
    const borderColors = resultados.map((_, i) => paletaColores[i % paletaColores.length].border);

    chartCanastaInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: resultados.map(r => r.nombre),
            datasets: [{
                label: 'Pérdida Acumulada (Bs)',
                data: resultados.map(r => r.perdida),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Sobrecosto: ${(context.parsed.y || 0).toFixed(2)} Bs`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Sobrecosto Económico (Bs)', font: { weight: 'bold' } }
                }
            }
        }
    });

    // 4. Poblar la tabla de rendimiento del modal (Se adaptará automáticamente a los N productos)
    const tbodyCanasta = document.getElementById('body-tabla-canasta');
    if (tbodyCanasta) {
        tbodyCanasta.innerHTML = '';
        resultados.forEach((res, i) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${i + 1}</strong></td>
                <td>${res.nombre}</td>
                <td style="color: #000080; font-family: monospace;">${res.gastoReal.toFixed(2)}</td>
                <td style="color: #d63031; font-weight: bold;">+${res.porcentaje.toFixed(1)}%</td>
            `;
            tbodyCanasta.appendChild(tr);
        });
    }
}