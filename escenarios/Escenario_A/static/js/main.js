/**
 * LÓGICA DE CONTROL DE INTERFAZ Y MODELADO DE RED
 */

// Instancias globales de gráficos para evitar el error "Canvas is already in use"
let chartConvergencia = null;
let chartDemanda = null;
let animationFrameId = null; 

// Variables globales para el renderizador dinámico de red
let networkCanvas = null;
let networkCtx = null;
let current3DData = { A: [], x: [], demandas: [] };
let networkAngle = 0;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-simulador");
    const selectMetodo = document.getElementById("select-metodo");
    const sorParamWrapper = document.getElementById("sor-param-wrapper");
    const btnReiniciar = document.getElementById("btn-reiniciar");

    // Inicializar referencia del canvas y redimensionar correctamente
    networkCanvas = document.getElementById("canvas-2d-network");
    if (networkCanvas) {
        networkCtx = networkCanvas.getContext("2d");
        resizeNetworkCanvas();
        window.addEventListener("resize", resizeNetworkCanvas);
    }

    // Mostrar/ocultar parámetro Omega según el método seleccionado
    selectMetodo.addEventListener("change", () => {
        if (selectMetodo.value === "sor") {
            sorParamWrapper.classList.remove("d-none");
        } else {
            sorParamWrapper.classList.add("d-none");
        }
        if (networkCanvas) {
            networkCtx = networkCanvas.getContext("2d");
            resizeNetworkCanvas();
            window.addEventListener("resize", resizeNetworkCanvas);
        }
        updateAlgorithmDisplay(selectMetodo.value);
    });

    // Botón para resetear simulación y regresar a reposo
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", () => {
            form.reset();
            sorParamWrapper.classList.add("d-none");
            document.getElementById("placeholder-results").classList.remove("d-none");
            document.getElementById("panel-resultados-dinamicos").classList.add("d-none");
            
            // Detener el bucle de animación de forma segura
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            if (networkCtx && networkCanvas) {
                networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
            }
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // 1. Recolección de Datos de la UI
        const dN = parseFloat(document.getElementById("demand-norte").value) || 0;
        const dC = parseFloat(document.getElementById("demand-centro").value) || 0;
        const dS = parseFloat(document.getElementById("demand-sur").value) || 0;

        const r1n = parseFloat(document.getElementById("r-p1-n").value) || 0;
        const r1c = parseFloat(document.getElementById("r-p1-c").value) || 0;
        const r1s = parseFloat(document.getElementById("r-p1-s").value) || 0;

        const r2n = parseFloat(document.getElementById("r-p2-n").value) || 0;
        const r2c = parseFloat(document.getElementById("r-p2-c").value) || 0;
        const r2s = parseFloat(document.getElementById("r-p2-s").value) || 0;

        const r3n = parseFloat(document.getElementById("r-p3-n").value) || 0;
        const r3c = parseFloat(document.getElementById("r-p3-c").value) || 0;
        const r3s = parseFloat(document.getElementById("r-p3-s").value) || 0;

        const metodo = selectMetodo.value;
        updateAlgorithmDisplay(metodo);
        const tol = parseFloat(document.getElementById("param-tol").value) || 1e-6;
        const maxIter = parseInt(document.getElementById("param-maxiter").value) || 100;
        const omega = parseFloat(document.getElementById("param-omega").value) || 1.0;

        // 2. MODELO MATEMÁTICO ADAPTATIVO (Construcción de A y b)
        let fN = r1n + r2n + r3n;
        let fC = r1c + r2c + r3c;
        let fS = r1s + r2s + r3s;

        let A = [
            [2.5 + fN, 0.4, 0.3],
            [0.3, 2.5 + fC, 0.5],
            [0.4, 0.2, 2.5 + fS]
        ];
        let b = [dN, dC, dS];

        // 3. Cálculos Diagnósticos
        let kappa = calculateConditionNumber(A);
        let dominancia = checkDiagonalDominance(A);

        // 4. Ejecución del Algoritmo Elegido
        let resultado;
        if (metodo === "lu") resultado = solveLU(A, b);
        else if (metodo === "jacobi") resultado = solveJacobi(A, b, tol, maxIter);
        else if (metodo === "gauss_seidel") resultado = solveGaussSeidel(A, b, tol, maxIter);
        else if (metodo === "sor") resultado = solveSOR(A, b, omega, tol, maxIter);
        else if (metodo === "gradiente_conjugado") resultado = solveConjugateGradient(A, b, tol, maxIter);

        // 5. Renderizar Resultados en la Interfaz Retro
        document.getElementById("placeholder-results").classList.add("d-none");
        document.getElementById("panel-resultados-dinamicos").classList.remove("d-none");

        renderMatrizCompilada(A, b);
        renderMetricas(kappa, resultado.error, resultado.iterations);
        renderDominancia(dominancia);
        renderSolucionFinal(resultado.x);
        renderInterpretacionSocioEconomica(kappa, dominancia, resultado.x, [dN, dC, dS]);
        renderCuestionarioAnalitico(
            A,
            [dN, dC, dS],
            resultado.x,
            kappa,
            dominancia,
            {
                r1n,r1c,r1s,
                r2n,r2c,r2s,
                r3n,r3c,r3s
            }
        );
        
        // 6. CONTROL DINÁMICO DE PANELES (Bloque Iterativo vs Bloque Directo LU)
        const bloqueIterativo = document.getElementById("bloque-iterativo");
        const bloqueLU = document.getElementById("bloque-lu");

        if (metodo === "lu") {
            if(bloqueLU) bloqueLU.classList.remove("d-none");
            if(bloqueIterativo) bloqueIterativo.classList.add("d-none");
            renderDesgloseLU(resultado.L, resultado.U, resultado.x);
        } else {
            if(bloqueIterativo) bloqueIterativo.classList.remove("d-none");
            if(bloqueLU) bloqueLU.classList.add("d-none");
            renderHistorialIteraciones(resultado.history || []);
        }

        // ==========================================
        // 7. ACTUALIZACIÓN GRÁFICA DEL SISTEMA (Three.js e Intersección de Planos)
        // ==========================================
        renderGraficoDemanda([dN, dC, dS], resultado.x);
        renderGraficoConvergencia(resultado.history || [], metodo, resultado.error);

        // Invocar al manejador 3D de Three.js pasando la Matriz A, el Vector b y la Solución x
        if (typeof Visualization3DManager !== 'undefined') {
            // Definimos las etiquetas de las zonas
            const etiquetas = ["Zona Norte", "Zona Centro", "Zona Sur"];
            
            // Estructuramos los limitadores opcionales basados en la UI
            const restricciones = {
                bloqueo_zona_centro: r1c + r2c + r3c, 
                reduccion_ruta_sur: r1s + r2s + r3s
            };
            
            // Enviamos los datos reales calculados al motor geométrico 3D
            Visualization3DManager.updateVisualSystem(
                A, 
                b, 
                resultado.x, 
                etiquetas, 
                [1200, 1000, 800], // Capacidades base relativas
                restricciones
            );
        }
    });
});

// Ajuste dinámico de dimensiones internas del Canvas para evitar pixelado
function resizeNetworkCanvas() {
    if (!networkCanvas) return;
    const rect = networkCanvas.getBoundingClientRect();
    networkCanvas.width = rect.width || 400;
    networkCanvas.height = rect.height || 300;
}

// --- FUNCIONES DE CONTROL GRÁFICO (CHART.JS) ---

function renderGraficoDemanda(demandas, suministros) {
    const canvas = document.getElementById("grafico-demanda");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (chartDemanda) chartDemanda.destroy();

    chartDemanda = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Zona Norte', 'Zona Centro', 'Zona Sur'],
            datasets: [
                {
                    label: 'Demanda Requerida (b)',
                    data: demandas.map(v => parseFloat(v) || 0),
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1.5
                },
                {
                    label: 'Suministro Calculado (x)',
                    data: suministros.map(v => v < 0 || isNaN(v) ? 0 : parseFloat(v)),
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderGraficoConvergencia(history, metodo, errorFinal) {
    const canvas = document.getElementById("grafico-convergencia");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (chartConvergencia) chartConvergencia.destroy();

    let labels = [];
    let data = [];

    if (metodo === "lu" || !history || history.length === 0) {
        labels = ['Iteración 1'];
        data = [errorFinal];
    } else {
        labels = history.map(h => `Iter ${h.iter}`);
        data = history.map(h => h.error);
    }

    chartConvergencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Error Residual ||Ax - b||',
                data: data,
                fill: false,
                borderColor: '#007bff',
                backgroundColor: '#007bff',
                tension: 0.15,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: data.some(v => v > 0) ? 'logarithmic' : 'linear',
                    title: { display: true, text: 'Magnitud del Error' }
                }
            }
        }
    });
}

// --- RENDERIZADOR GEOMÉTRICO DINÁMICO CENTRALIZADO ---
function init3DNetworkVisual() {
    if (!networkCanvas || !networkCtx) return;

    // Cancelar cualquier iteración previa del bucle de renderizado antes de lanzar uno nuevo
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    function drawFrame() {
        networkAngle += 0.012; 
        networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);

        // Fondo de terminal retro de baja luminancia
        networkCtx.fillStyle = "#0d1117";
        networkCtx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);

        const { A, x, demandas } = current3DData;
        if (!A || A.length === 0) return;

        // Mapear nodos en órbita tridimensional calculada
        const nodes = [
            { name: "Nodo Norte", fluid: x[0] || 0, d: demandas[0] || 0, x3d: Math.cos(networkAngle) * 75, y3d: -35, z3d: Math.sin(networkAngle) * 75 },
            { name: "Nodo Centro", fluid: x[1] || 0, d: demandas[1] || 0, x3d: Math.cos(networkAngle + 2*Math.PI/3) * 75, y3d: 15, z3d: Math.sin(networkAngle + 2*Math.PI/3) * 75 },
            { name: "Nodo Sur", fluid: x[2] || 0, d: demandas[2] || 0, x3d: Math.cos(networkAngle + 4*Math.PI/3) * 75, y3d: 45, z3d: Math.sin(networkAngle + 4*Math.PI/3) * 75 }
        ];

        const cx = networkCanvas.width / 2;
        const cy = networkCanvas.height / 2;
        const fov = 180; 

        // Transformación y proyección de perspectiva estable
        nodes.forEach(n => {
            const scale = fov / (fov + n.z3d);
            n.projX = cx + n.x3d * scale;
            n.projY = cy + n.y3d * scale;
            n.radius = 11 * scale;
        });

        // Dibujar aristas vectoriales de interconexión matricial
        networkCtx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i !== j && A[i] && A[i][j] !== undefined) {
                    networkCtx.strokeStyle = `rgba(0, 255, 130, ${0.15 + Math.abs(A[i][j]) * 0.3})`;
                    networkCtx.beginPath();
                    networkCtx.moveTo(nodes[i].projX, nodes[i].projY);
                    networkCtx.lineTo(nodes[j].projX, nodes[j].projY);
                    networkCtx.stroke();
                }
            }
        }

        // Dibujar los vértices de las subestaciones urbanas
        nodes.forEach(n => {
            networkCtx.beginPath();
            const deficitSevere = (n.d - n.fluid) > 5;
            networkCtx.fillStyle = deficitSevere ? "rgba(255, 60, 60, 0.85)" : "rgba(0, 230, 110, 0.85)";
            networkCtx.arc(n.projX, n.projY, n.radius, 0, 2 * Math.PI);
            networkCtx.fill();

            // Tipografía vectorial retro integrada
            networkCtx.fillStyle = "#ffffff";
            networkCtx.font = "bold 10px monospace";
            networkCtx.fillText(n.name, n.projX - 25, n.projY - n.radius - 6);
            networkCtx.font = "9px monospace";
            networkCtx.fillStyle = "#a2b1c6";
            networkCtx.fillText(`${n.fluid.toFixed(1)} kLts`, n.projX - 22, n.projY + n.radius + 12);
        });

        animationFrameId = requestAnimationFrame(drawFrame);
    }

    animationFrameId = requestAnimationFrame(drawFrame);
}

// --- FUNCIONES ORIGINALES DE SOPORTE MATEMÁTICO SANITIZADAS ---

function calculateConditionNumber(A) {
    if (typeof invert3x3 !== 'function') return 1.0;
    let invA = invert3x3(A);
    if (!invA) return Infinity; // Manejo preventivo si la matriz es singular
    return normInfinity(A) * normInfinity(invA);
}

function checkDiagonalDominance(A) {
    let status = [];
    for (let i = 0; i < 3; i++) {
        let diag = Math.abs(A[i][i]);
        let sumRest = 0;
        for (let j = 0; j < 3; j++) {
            if (i !== j) sumRest += Math.abs(A[i][j]);
        }
        status.push({ diag, sumRest, isDominant: diag > sumRest });
    }
    return status;
}

function renderMatrizCompilada(A, b) {
    let html = `<thead><tr><th>Fila</th><th>x₁ (Norte)</th><th>x₂ (Centro)</th><th>x₃ (Sur)</th><th>b (Demanda)</th></tr></thead><tbody>`;
    for(let i=0; i<3; i++) {
        html += `<tr><td><strong>[${i+1}]</strong></td><td>${A[i][0].toFixed(2)}</td><td>${A[i][1].toFixed(2)}</td><td>${A[i][2].toFixed(2)}</td><td class="text-primary fw-bold">${b[i].toFixed(1)}</td></tr>`;
    }
    html += `</tbody>`;
    const target = document.getElementById("tabla-matriz-generada");
    if(target) target.innerHTML = html;
}

function renderMetricas(kappa, error, iter) {
    const condEl = document.getElementById("metric-condicion");
    if(condEl) condEl.innerText = (kappa === Infinity || isNaN(kappa)) ? "∞" : kappa.toFixed(4);
    
    let estadoCond = document.getElementById("metric-condicion-estado");
    if (estadoCond) {
        if (kappa < 8) {
            estadoCond.className = "fw-bold text-success";
            estadoCond.innerText = "[SISTEMA LOGÍSTICO ESTABLE]";
        } else {
            estadoCond.className = "fw-bold text-warning";
            estadoCond.innerText = "[VULNERABLE / MAL CONDICIONADO]";
        }
    }
    const errEl = document.getElementById("metric-error");
    const iterEl = document.getElementById("metric-iteraciones");
    if(errEl) errEl.innerText = (typeof error === 'number') ? error.toExponential(4) : error;
    if(iterEl) iterEl.innerText = iter;
}

function renderDominancia(dominancia) {
    let html = "";
    dominancia.forEach((row, idx) => {
        let badge = row.isDominant ? '<span class="text-success">[SÍ]</span>' : '<span class="text-danger fw-bold">[NO]</span>';
        html += `<tr><td>Fila ${idx+1}</td><td>${row.diag.toFixed(2)}</td><td>${row.sumRest.toFixed(2)}</td><td>${badge}</td></tr>`;
    });
    const domTable = document.getElementById("tabla-dominancia-diagonal");
    if(domTable) {
        const tbody = domTable.querySelector("tbody");
        if(tbody) tbody.innerHTML = html;
    }
}

function renderSolucionFinal(x) {
    let zones = ["Zona Norte", "Zona Centro", "Zona Sur"];
    let html = `<thead><tr><th>Nodo Objetivo</th><th>Suministro Calculado</th></tr></thead><tbody>`;
    for(let i=0; i<3; i++) {
        let val = isNaN(x[i]) || x[i] < 0 ? 0 : x[i];
        html += `<tr><td><strong>${zones[i]}</strong></td><td class="text-success fw-bold">${val.toFixed(2)} kLts</td></tr>`;
        
        let q1Text = document.getElementById("cuestion-1");
        if(q1Text) {
            if(i === 0) q1Text.innerHTML = "";
            q1Text.innerHTML += `• <strong>${zones[i]}:</strong> ${val.toFixed(2)} kLts asignados.<br>`;
        }
    }
    html += `</tbody>`;
    const solTable = document.getElementById("tabla-solucion-final");
    if(solTable) solTable.innerHTML = html;
}

function renderHistorialIteraciones(history) {
    let tbody = document.getElementById("tabla-iteraciones-body");
    if(!tbody) return;
    if(!history || history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted small">[Sin datos de iteración]</td></tr>`;
        return;
    }
    let html = "";
    history.forEach(h => {
        let xStr = `[${h.x.map(v => v.toFixed(2)).join(", ")}]`;
        html += `<tr>
            <td>${h.iter}</td>
            <td><span class="text-dark fw-bold">${xStr}</span></td>
            <td class="text-danger font-monospace">${h.error.toExponential(4)}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function renderDesgloseLU(L, U, x) {
    const buildMatrixBox = (M) => {
        if(!M) return '';
        return `<div style="font-family: monospace; font-size: 11px; border-left: 3px solid #555; border-right: 3px solid #555; padding: 2px 6px; background: #fafafa; text-align: left; line-height: 1.3;">` +
            M.map(row => row.map(v => v.toFixed(2).padStart(6)).join(" ")).join("<br>") +
            `</div>`;
    };
    const buildVectorBox = (V) => {
        if(!V) return '';
        return `<div style="font-family: monospace; font-size: 11px; border-left: 3px solid #28a745; border-right: 3px solid #28a745; padding: 2px 6px; background: #f4fff4; text-align: left; line-height: 1.3;">` +
            V.map(v => v.toFixed(2).padStart(6)).join("<br>") +
            `</div>`;
    };

    const ml = document.getElementById("contenedor-matriz-l");
    const mu = document.getElementById("contenedor-matriz-u");
    const vx = document.getElementById("contenedor-vector-x");
    if(ml && L) ml.innerHTML = buildMatrixBox(L);
    if(mu && U) mu.innerHTML = buildMatrixBox(U);
    if(vx && x) vx.innerHTML = buildVectorBox(x);
}

function renderInterpretacionSocioEconomica(kappa, dominancia, x, demandas) {
    let box = document.getElementById("box-interpretacion");
    if(!box) return;
    let isMalCondicionado = kappa >= 8 || kappa === Infinity;
    let tieneFilasNoDominantes = dominancia.some(r => !r.isDominant);
    
    let txt = `CRÍTICA OPERATIVA:\n`;
    if (isMalCondicionado || tieneFilasNoDominantes) {
        txt += `⚠ ADVERTENCIA: La red de transportes presenta anomalías severas debido a los bloqueos simulados. El sistema ha perdido consistencia matemática (Matriz No Dominante Diagonalmente con Número de Condición Elevado = ${isNaN(kappa) ? "∞" : kappa.toFixed(2)}).\n`;
        txt += `Consecuencia: Pequeñas fluctuaciones en los centros de acopio provocarán un desabastecimiento caótico o asimetrías de stock en las estaciones de servicio.\n`;
    } else {
        txt += `✓ ESTADO: La red logística fluye con estabilidad controlada. Los algoritmos iterativos convergen óptimamente debido a una clara dominancia diagonal estructural.\n`;
    }
    
    txt += `\nESTADO DE NODOS URBANOS:\n`;
    let zonas = ["Norte", "Centro", "Sur"];
    for(let i=0; i<3; i++) {
        let deficit = demandas[i] - (x[i] || 0);
        if (deficit > 5) {
            txt += `- Zona ${zonas[i]}: Alerta de desabastecimiento. Brecha insatisfecha de ${deficit.toFixed(1)} Unidades.\n`;
        } else {
            txt += `- Zona ${zonas[i]}: Suministro óptimo equilibrado.\n`;
        }
    }
    box.innerText = txt;
}

function updateAlgorithmDisplay(metodo) {
    const display = document.getElementById("formula-display");
    const codeBox = document.getElementById("box-codigo-algoritmo");

    if (!display || !codeBox) return;

    // 1. Definimos los datos en una estructura de objeto (Diccionario)
    const algoritmos = {
        jacobi: {
            formula: "\\[ x_i^{(k+1)} = \\frac{1}{A_{ii}}\\left(b_i-\\sum_{j\\neq i}A_{ij}x_j^{(k)}\\right) \\]",
            codigo: `// jacobi.js\nfor(let i = 0; i < n; i++){\n    let sigma = 0;\n    for(let j = 0; j < n; j++){\n        if(i !== j) sigma += A[i][j] * x[j];\n    }\n    xNew[i] = (b[i] - sigma) / A[i][i];\n}`
        },
        gauss_seidel: {
            formula: "\\[ x_i^{(k+1)} = \\frac{1}{A_{ii}}\\left(b_i-\\sum_{j<i}A_{ij}x_j^{(k+1)}-\\sum_{j>i}A_{ij}x_j^{(k)}\\right) \\]",
            codigo: `// gauss_seidel.js\nfor(let i = 0; i < n; i++){\n    let sigma = 0;\n    for(let j = 0; j < n; j++){\n        if(j !== i) sigma += A[i][j] * x[j];\n    }\n    x[i] = (b[i] - sigma) / A[i][i];\n}`
        },
        sor: {
            formula: "\\[ x_i^{(k+1)}=(1-\\omega)x_i^{(k)}+\\frac{\\omega}{A_{ii}}(b_i-\\sum A_{ij}x_j) \\]",
            codigo: `// sor.js\nlet xGS = (b[i] - sigma) / A[i][i];\nx[i] = (1 - omega) * x[i] + omega * xGS;`
        },
        lu: {
            formula: "\\[ A=L\\cdot U \\]",
            codigo: `// lu.js\nfor(let k = i; k < n; k++){\n    let sum = 0;\n    for(let j = 0; j < i; j++) sum += L[i][j] * U[j][k];\n    U[i][k] = A[i][k] - sum;\n}\nL[i][i] = 1;`
        },
        gradiente_conjugado: {
            formula: "\\[ \\alpha_k=\\frac{r_k^Tr_k}{p_k^TAp_k} \\]",
            codigo: `// gradiente_conjugado.js\nlet alpha = rsold / dot(p, Ap);\nx = addVectors(x, scaleVector(alpha, p));\nr = subtractVectors(r, scaleVector(alpha, Ap));`
        }
    };

    // 2. Extraemos el contenido correspondiente
    const config = algoritmos[metodo];

    if (config) {
        display.innerHTML = config.formula;
        codeBox.innerText = config.codigo;
    }

    // 3. Renderizado MathJax
    if (window.MathJax && typeof MathJax.typeset === 'function') {
        MathJax.typeset();
    }
}

function renderCuestionarioAnalitico(
    A,
    demandas,
    solucion,
    kappa,
    dominancia,
    rutas
) {

    const q2 = document.getElementById("cuestion-2");
    const q3 = document.getElementById("cuestion-3");
    const q4 = document.getElementById("cuestion-4");
    const q5 = document.getElementById("cuestion-5");

    if (!q2 || !q3 || !q4 || !q5) {
        console.error("Faltan elementos del cuestionario");
        return;
    }

    // =====================================================
    // DATOS AUXILIARES
    // =====================================================
    const zonas = ["Norte", "Centro", "Sur"];
    const deficits = demandas.map((d, i) => {
        return d - (solucion[i] || 0);
    });
    const totalDemanda = demandas.reduce((a, b) => a + b, 0);
    const totalSuministro = solucion.reduce((a, b) => a + b, 0);
    const coberturaGlobal =
        totalDemanda > 0
            ? (totalSuministro / totalDemanda) * 100
            : 100;

    // =====================================================
    // PREGUNTA 2
    // ¿Qué pasa si una ruta se bloquea?
    // =====================================================

    const rutasArray = Object.values(rutas);
    const bloqueos = rutasArray.filter(v => v === 0).length;

    const alertas = rutasArray.filter(v => v === 0.5).length;

    const totalRutas = rutasArray.length;

    let porcentajeBloqueado = (bloqueos / totalRutas) * 100;

    if (bloqueos === 0 && alertas === 0) {
        q2.innerHTML =
            `La red opera en condiciones normales. Las ${totalRutas} rutas mantienen disponibilidad completa y no existen restricciones relevantes de transporte. El sistema puede redistribuir el suministro con alta flexibilidad y bajo riesgo operativo.`;
    }
    else if (bloqueos <= 2) {
        q2.innerHTML =
            `Se identificaron ${bloqueos} rutas bloqueadas y ${alertas} rutas con capacidad reducida. Aunque existen restricciones puntuales, la red conserva suficientes alternativas para mantener el abastecimiento mediante redistribución de flujos.`;
    }
    else if (bloqueos <= 5) {
        q2.innerHTML =
            `La infraestructura logística presenta una afectación moderada. Actualmente ${bloqueos} de ${totalRutas} rutas (${porcentajeBloqueado.toFixed(1)}%) se encuentran bloqueadas. El sistema continúa funcionando, pero depende cada vez más de corredores alternativos y presenta menor capacidad de respuesta ante nuevas interrupciones.`;
    }
    else {
        q2.innerHTML =
            `La red presenta una fragmentación severa. Existen ${bloqueos} rutas bloqueadas de un total de ${totalRutas}, lo que limita significativamente la conectividad entre plantas y zonas de consumo. Bajo estas condiciones, cualquier incremento de demanda o nueva interrupción podría provocar desabastecimiento regional.`;
    }

    // =====================================================
    // PREGUNTA 3
    // ¿Qué zona queda más afectada?
    // =====================================================

    let peorIndice = 0;
    for (let i = 1; i < deficits.length; i++) {
        if (deficits[i] > deficits[peorIndice]) {
            peorIndice = i;
        }
    }
    if (deficits[peorIndice] <= 0) {
        q3.innerHTML =
            `Las tres zonas reciben una asignación suficiente respecto a la demanda establecida. No se detectan déficits operativos significativos y el suministro calculado satisface los requerimientos proyectados.`;
    }
    else {
        const coberturaZona =
            (solucion[peorIndice] / demandas[peorIndice]) * 100;

        q3.innerHTML =
            `La Zona ${zonas[peorIndice]} es la más afectada por las condiciones actuales de la red. Su demanda asciende a ${demandas[peorIndice].toFixed(2)} unidades, mientras que el modelo calcula una asignación de ${solucion[peorIndice].toFixed(2)} unidades. Esto representa una cobertura aproximada del ${coberturaZona.toFixed(1)}% y un déficit de ${deficits[peorIndice].toFixed(2)} unidades.`;
    }

    // =====================================================
    // PREGUNTA 4
    // ¿El sistema es estable o sensible?
    // =====================================================

    const filasNoDominantes =
        dominancia.filter(d => !d.isDominant).length;
    if (kappa < 10 && filasNoDominantes === 0) {
        q4.innerHTML =
            `El sistema presenta un comportamiento estable. El número de condición κ = ${kappa.toFixed(2)} es bajo y todas las ecuaciones conservan dominancia diagonal. Esto indica que pequeñas variaciones en los datos de entrada producirán cambios proporcionales y predecibles en la solución.`;
    }
    else if (kappa < 50) {
        q4.innerHTML =
            `El sistema muestra sensibilidad moderada. El número de condición κ = ${kappa.toFixed(2)} sugiere que ciertos cambios en la demanda o en los coeficientes de la red pueden amplificarse parcialmente durante el cálculo. La solución sigue siendo confiable, aunque menos robusta que en un sistema bien condicionado.`;
    }
    else {
        q4.innerHTML =
            `El sistema es altamente sensible. El número de condición κ = ${kappa.toFixed(2)} indica que pequeñas perturbaciones en los parámetros de entrada podrían provocar variaciones importantes en la solución obtenida. Desde el punto de vista logístico, la red presenta una vulnerabilidad elevada frente a cambios operativos o fluctuaciones de demanda.`;
    }

    // =====================================================
    // PREGUNTA 5
    // ¿Qué pasa si aumenta la demanda?
    // =====================================================

    if (coberturaGlobal >= 95) {
        q5.innerHTML =
            `La cobertura global del sistema alcanza aproximadamente el ${coberturaGlobal.toFixed(1)}% de la demanda total. Bajo este escenario existe margen suficiente para absorber incrementos moderados de consumo sin alterar drásticamente la distribución actual.`;
    }
    else if (coberturaGlobal >= 80) {
        q5.innerHTML =
            `La cobertura global es cercana al ${coberturaGlobal.toFixed(1)}%. Un aumento significativo de la demanda obligaría a redistribuir recursos entre zonas y podría generar déficits localizados en los sectores con mayor presión de consumo.`;
    }
    else {
        q5.innerHTML =
            `La cobertura global es únicamente del ${coberturaGlobal.toFixed(1)}% respecto a la demanda total. La red opera con una capacidad limitada y cualquier incremento adicional de demanda incrementaría los déficits existentes, reduciendo la estabilidad del abastecimiento.`;
    }
}