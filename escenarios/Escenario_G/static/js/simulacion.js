// Contenedor global de instancias para mitigar memory leaks y solapamientos de Chart.js
let chartInstances = {
    evolucion: null,
    crisis: null,
    fase: null,
    derivadas: null
};

window.ultimoResultadoSimulacion = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Enlace seguro de disparadores para los Escenarios Preestablecidos
    asociarEventoSeguro('btn-caso-base', 'click', function() { resetearTabsVisuales(this); cargarEscenario('base'); });
    asociarEventoSeguro('btn-alto-dialogo', 'click', function() { resetearTabsVisuales(this); cargarEscenario('dialogo'); });
    asociarEventoSeguro('btn-sin-mediadores', 'click', function() { resetearTabsVisuales(this); cargarEscenario('sin_mediadores'); });
    asociarEventoSeguro('btn-alta-propagacion', 'click', function() { resetearTabsVisuales(this); cargarEscenario('propagacion'); });
    
    // 2. Evento ejecutor principal del panel manual
    asociarEventoSeguro('btn-calcular', 'click', lanzarSimulacion);
    
    // 3. Simulación inicial automática
    lanzarSimulacion();
});

/**
 * Helper para resetear estilos visuales inconsistentes en las tabs
 */
function resetearTabsVisuales(elementoActivo) {
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('border-win-active'));
    if (elementoActivo && elementoActivo.classList) {
        elementoActivo.classList.add('border-win-active');
    }
}

/**
 * Helper para evitar que un ID faltante en el HTML rompa el script entero
 */
function asociarEventoSeguro(id, evento, funcion) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.addEventListener(evento, funcion);
}

/**
 * Registra y despliega trazas en tiempo real dentro del visor .log retro
 */
function logBitacora(mensaje) {
    const contenedor = document.getElementById('bitacora');
    if (contenedor) {
        const tiempo = new Date().toLocaleTimeString('es-ES', { hour12: false });
        contenedor.innerHTML = `<span>[${tiempo}]</span> ${mensaje}`;
    } else {
        console.log(`[Bitácora]: ${mensaje}`);
    }
}

/**
 * Modifica los inputs del DOM basándose en el escenario analítico seleccionado
 */
function cargarEscenario(tipo) {
    const valores = {
        base:           { N0: 950, M0: 50, D0: 5,  a: 0.002,  b: 0.05, c: 0.04, k: 0.03, r: 0.10 },
        dialogo:        { N0: 950, M0: 50, D0: 5,  a: 0.002,  b: 0.05, c: 0.18, k: 0.03, r: 0.05 },
        sin_mediadores: { N0: 995, M0: 50, D0: 0,  a: 0.0025, b: 0.03, c: 0.00, k: 0.00, r: 0.20 },
        propagacion:    { N0: 950, M0: 50, D0: 5,  a: 0.007,  b: 0.02, c: 0.04, k: 0.02, r: 0.12 }
    };

    const esc = valores[tipo];
    if (!esc) return;

    const inputs = ['N0', 'M0', 'D0', 'a', 'b', 'c', 'k', 'r'];
    inputs.forEach(p => {
        const el = document.getElementById(`inp-${p}`);
        if (el) el.value = esc[p];
    });

    logBitacora(`Preajuste cargado: [Escenario ${tipo.toUpperCase()}]. Reinyectando vectores...`);
    lanzarSimulacion();
}

/**
 * Captura el payload del DOM con tolerancias de fallo y ejecuta la simulación
 */
async function lanzarSimulacion() {
    logBitacora("Calculando matrices de difusión social en motor EDO...");

    const obtenerValor = (id, porDefecto) => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) : porDefecto;
    };
    
    const elMetodo = document.getElementById('sel-metodo');
    const metodoSeleccionado = elMetodo ? elMetodo.value : 'rk4';
    
    const tMax = obtenerValor('inp-tmax', 50);
    const hVisual = obtenerValor('inp-h', 0.10); // Paso de integración
    
    // CORRECCIÓN: Sincronizamos el conteo de iteraciones con el backend
    const pasosCalculados = Math.max(2, Math.floor(tMax / hVisual) + 1);

    const lblMetodo = document.getElementById('lbl-motor-metodo');
    const lblPasos = document.getElementById('lbl-motor-pasos');
    if (lblMetodo) lblMetodo.innerText = (metodoSeleccionado === 'rk4') ? 'RK4' : 'Heun';
    if (lblPasos) lblPasos.innerText = pasosCalculados.toString();

    const payload = {
            N0: obtenerValor('inp-N0', 950),
            M0: obtenerValor('inp-M0', 50),
            D0: obtenerValor('inp-D0', 5),
            a: obtenerValor('inp-a', 0.002),
            b: obtenerValor('inp-b', 0.05),
            c: obtenerValor('inp-c', 0.04),
            k: obtenerValor('inp-k', 0.03),
            r: obtenerValor('inp-r', 0.10),
            t_max: tMax,
            h: hVisual,         // <- CORRECCIÓN: Enviar h directamente
            pasos: pasosCalculados,
            metodo: metodoSeleccionado
        };
    try {
        const respuesta = await fetch(window.location.origin + '/api/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) throw new Error(`HTTP error! status: ${respuesta.status}`);
        const resJson = await respuesta.json();
        
        // CORRECCIÓN: Flexibilidad en la validación. A veces Flask devuelve el dict sin el wrap "status"
        const dataAProcesar = resJson?.data ?? resJson ?? null;

        if (!dataAProcesar?.t) {
            logBitacora("Respuesta inválida del servidor");
            return;
        }

        if (resJson.status === 'success' || dataAProcesar.t) {
            logBitacora(`EDO resuelta [${payload.metodo.toUpperCase()}]. Distribuyendo ecosistema visual...`);
            
            renderizarEcosistemaVisual(dataAProcesar);
            renderizarTablaEstructural(dataAProcesar, payload);
            ejecutarLogicaAutomatizada(dataAProcesar);
        } else {
            logBitacora(`Error del motor numérico: ${resJson.message || 'Estructura de datos no válida'}`);
        }
    } catch (error) {
        logBitacora(`Fallo crítico en hilo simulador: ${error.message}`);
    }
}

/**
 * Orquesta la destrucción y recreación de las 4 instancias interactivas de Chart.js
 */
function renderizarEcosistemaVisual(data) {
    if (!data || !data.t) return;

    window.ultimoResultadoSimulacion = data;
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) chartInstances[key].destroy();
    });

    const labelsTiempo = data.t.map(val => val.toFixed(1));

    // G1: Evolución Temporal
    const canvasEvolucion = document.getElementById('graficoEvolucion');
    if (canvasEvolucion) {
        chartInstances.evolucion = new Chart(canvasEvolucion.getContext('2d'), {
            type: 'line',
            data: {
                labels: labelsTiempo,
                datasets: [
                    { label: 'Neutrales (N)', data: data.N, borderColor: '#5d8aa8', borderWidth: 2, pointRadius: 0, hoverRadius: 5, tension: 0.25, backgroundColor: 'transparent' },
                    { label: 'Manifestantes (M)', data: data.M, borderColor: '#d67c7c', borderWidth: 3, pointRadius: 0, hoverRadius: 6, tension: 0.25, backgroundColor: 'rgba(214, 124, 124, 0.06)', fill: true },
                    { label: 'Mediadores (D)', data: data.D, borderColor: '#a9b8a2', borderWidth: 2, pointRadius: 0, hoverRadius: 5, tension: 0.25, backgroundColor: 'transparent' }
                ]
            },
            options: obtenerOpcionesBase('Evolución Temporal de Poblaciones', 'Tiempo (Jornadas)', 'Individuos', false)
        });
    }

    // G2: Índice de Crisis
    const conflictoNormalizado = data.t.map((_, i) => {
        const den = data.N[i] + data.D[i];
        return den > 0 ? (data.M[i] / den) : 0;
    });
    const canvasCrisis = document.getElementById('graficoCrisis');
    if (canvasCrisis) {
        chartInstances.crisis = new Chart(canvasCrisis.getContext('2d'), {
            type: 'line',
            data: {
                labels: labelsTiempo,
                datasets: [{
                    label: 'Intensidad de Tensión Social Relativa',
                    data: conflictoNormalizado,
                    borderColor: '#b294bb',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(178, 148, 187, 0.08)',
                    fill: true,
                    pointRadius: 0,
                    hoverRadius: 5,
                    tension: 0.25
                }]
            },
            options: obtenerOpcionesBase('Índice de Crisis Estructural Correlacionada', 'Tiempo (Jornadas)', 'Coeficiente de Conflicto (M/(N+D))', false)
        });
    }

    // G3: Plano de Fase (Scatter)
    const datosFase = data.t.map((_, i) => ({ x: data.D[i], y: data.M[i] }));
    const canvasFase = document.getElementById('graficoFase');
    if (canvasFase) {
        chartInstances.fase = new Chart(canvasFase.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Trayectoria del Atractor Social',
                    data: datosFase,
                    borderColor: '#cf9b6d',
                    borderWidth: 2.5,
                    showLine: true,
                    pointRadius: 0,
                    hoverRadius: 6,
                    backgroundColor: '#cf9b6d',
                    tension: 0.2
                }]
            },
            options: obtenerOpcionesBase('Plano de Fase Orbital: Gestión vs Descontento', 'Fuerza de Mediadores (D)', 'Fuerza de Manifestantes (M)', true)
        });
    }

    // G4: Derivadas Numéricas
    const dN = [], dM = [], dD = [], tDerivadas = [];
    for (let i = 0; i < data.t.length - 1; i++) {
        let dt = data.t[i+1] - data.t[i];
        if (dt <= 0) dt = 0.01;
        dN.push((data.N[i+1] - data.N[i]) / dt);
        dM.push((data.M[i+1] - data.M[i]) / dt);
        dD.push((data.D[i+1] - data.D[i]) / dt);
        tDerivadas.push(data.t[i].toFixed(1));
    }
    const canvasDerivadas = document.getElementById('graficoDerivadas');
    if (canvasDerivadas) {
        chartInstances.derivadas = new Chart(canvasDerivadas.getContext('2d'), {
            type: 'line',
            data: {
                labels: tDerivadas,
                datasets: [
                    { label: 'Velocidad Neutrales (dN/dt)', data: dN, borderColor: '#5d8aa8', borderWidth: 1.5, pointRadius: 0, hoverRadius: 4, tension: 0.2 },
                    { label: 'Aceleración Crisis (dM/dt)', data: dM, borderColor: '#d67c7c', borderWidth: 2, pointRadius: 0, hoverRadius: 5, tension: 0.2 },
                    { label: 'Respuesta Institucional (dD/dt)', data: dD, borderColor: '#a9b8a2', borderWidth: 1.5, pointRadius: 0, hoverRadius: 4, tension: 0.2 }
                ]
            },
            options: obtenerOpcionesBase('Vectores de Velocidad Instantánea (Derivadas)', 'Tiempo (Jornadas)', 'Tasa de Variación Real (Personas/Día)', false)
        });
    }

    renderizarMapaSocial(data);
    actualizarIndicadoresFinales(data);
}

function actualizarIndicadoresFinales(data) {
    if (!data) return;
    const tFinal = data.t[data.t.length - 1];
    const nFinal = data.N[data.N.length - 1];
    const mFinal = data.M[data.M.length - 1];
    const dFinal = data.D[data.D.length - 1];

    const asignar = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    asignar('val-t-final', tFinal.toFixed(1));
    asignar('res-final-n', nFinal.toFixed(1));
    asignar('res-final-m', mFinal.toFixed(1));
    asignar('res-final-d', dFinal.toFixed(1));
}

function renderizarMapaSocial(data) {
    const canvas = document.getElementById('canvasMapaLaPaz');
    if (!canvas || !data || !data.t) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    if (width === 0 || height === 0) {
        return;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fondo base del mapa social
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#16191d');
    grad.addColorStop(1, '#272d33');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Red base de calles virtuales
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Puntos de interés social representados por zonas geográficas
    const puntos = [
        { x: width * 0.18, y: height * 0.28, label: 'Centro' },
        { x: width * 0.45, y: height * 0.18, label: 'Norte' },
        { x: width * 0.75, y: height * 0.33, label: 'Sur' },
        { x: width * 0.30, y: height * 0.68, label: 'Este' },
        { x: width * 0.68, y: height * 0.75, label: 'Oeste' }
    ];

    const M = data.M[data.M.length - 1];
    const N = data.N[data.N.length - 1];
    const D = data.D[data.D.length - 1];
    const total = Math.max(1, N + M + D);
    const intensidad = Math.min(1, M / total);

    // Determine distribution among puntos with a smoother spread
    const fracciones = puntos.map((_, idx) => 0.12 + 0.14 * Math.sin((idx + 1) * 1.1));
    const escalaGlobal = 18 + 42 * intensidad;
    const radioBase = 8;

    puntos.forEach((p, idx) => {
        const valor = Math.max(0, M * fracciones[idx]);
        const radio = radioBase + (valor / Math.max(1, M)) * escalaGlobal;
        const alfa = 0.35 + 0.45 * (valor / Math.max(1, M));

        // Glow exterior
        ctx.beginPath();
        ctx.arc(p.x, p.y, radio * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(206, 52, 66, ${alfa * 0.22})`;
        ctx.fill();

        // Círculo principal
        ctx.beginPath();
        ctx.arc(p.x, p.y, radio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(206, 52, 66, ${0.85 + 0.15 * intensidad})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 142, 142, 0.95)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Etiqueta simple
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${p.label}`, p.x + radio + 8, p.y - 6);
        ctx.fillStyle = '#a5c9ff';
        ctx.fillText(`${Math.round(valor)} manifestantes`, p.x + radio + 8, p.y + 10);
    });

    // Barra de leyenda de carga social
    const legendWidth = width * 0.38;
    const legendHeight = 60;
    ctx.fillStyle = 'rgba(15, 18, 22, 0.85)';
    ctx.fillRect(16, height - legendHeight - 16, legendWidth, legendHeight);
    ctx.fillStyle = '#99d6ff';
    ctx.font = '12px monospace';
    ctx.fillText('Mapa Social de La Paz: tamaño de punto ∝ número de manifestantes', 24, height - legendHeight / 2 - 2);
    ctx.fillStyle = '#f6f6f2';
    ctx.fillText(`N=${N.toFixed(0)}  M=${M.toFixed(0)}  D=${D.toFixed(0)}  Total=${total.toFixed(0)}`, 24, height - 16);
}

/**
 * Reconstruye y renderiza dinámicamente la tabla matemática usando 
 * directamente los resultados limpios del backend (Flask) en lugar 
 * de forzar un re-cálculo costoso en el frontend.
 */
function renderizarTablaEstructural(data, params) {
    const tbody = document.getElementById('tabla-estructural-body');
    if (!tbody) {
        logBitacora("Alerta: No se encontró '#tabla-estructural-body'.");
        return;
    }

    tbody.innerHTML = '';
    const fragmento = document.createDocumentFragment();
    
    const totalPuntos = data.t.length;
    // Muestreo dinámico pero con techo seguro para evitar colapso del DOM
    const muestreo = Math.max(1, Math.floor(totalPuntos / 50)); 

    const metodoDetalles = data.metodo_data || [];
    const metodo = params.metodo || 'rk4';

    for (let i = 0; i < totalPuntos; i += muestreo) {
        const t = data.t[i];
        const N = data.N[i];
        const M = data.M[i];
        const D = data.D[i];
        const P = N + M + D;
        const detalle = metodoDetalles[i] || {};

        // CORRECCIÓN: Para evitar el sobre-procesamiento, mostramos 
        // la derivada calculada desde las series de tiempo, o simplemente las poblaciones
        let dm_dt = "0.000";
        if (i < totalPuntos - 1) {
             let dt = data.t[i+1] - data.t[i];
             if(dt > 0) dm_dt = ((data.M[i+1] - data.M[i]) / dt).toFixed(3);
        }

        let col1 = '-';
        let col2 = '-';
        let col3 = '-';
        let col4 = '-';

        if (metodo === 'heun') {
            col1 = detalle.f_actual !== undefined ? detalle.f_actual.toFixed(3) : '-';
            col2 = detalle.M_pred !== undefined ? detalle.M_pred.toFixed(2) : '-';
            col3 = detalle.f_predicho !== undefined ? detalle.f_predicho.toFixed(3) : '-';
            col4 = detalle.M_final !== undefined ? detalle.M_final.toFixed(2) : '-';
        } else {
            col1 = detalle.k1 !== undefined ? detalle.k1.toFixed(3) : '-';
            col2 = detalle.k2 !== undefined ? detalle.k2.toFixed(3) : '-';
            col3 = detalle.k3 !== undefined ? detalle.k3.toFixed(3) : '-';
            col4 = detalle.k4 !== undefined ? detalle.k4.toFixed(3) : '-';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${i + 1}</strong></td>
            <td>${t.toFixed(2)}</td>
            <td>${N.toFixed(1)}</td>
            <td class="text-danger">${M.toFixed(1)}</td>
            <td>${D.toFixed(1)}</td>
            <td><strong>${P.toFixed(0)}</strong></td>
            <td>${col1}</td>
            <td>${col2}</td>
            <td>${col3}</td>
            <td>${col4}</td>
        `;
        fragmento.appendChild(tr);
    }

    tbody.appendChild(fragmento);
    logBitacora(`Matriz estructural inyectada (Mostrando Muestra de ${Math.min(50, totalPuntos)} filas).`);
}

/**
 * Generador de plantillas de configuración para Chart.js
 */
function obtenerOpcionesBase(titulo, xTitle, yTitle, esScatter = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: esScatter ? 'nearest' : 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { font: { family: 'monospace', size: 13 }, color: '#44443f', usePointStyle: true } },
            title: { display: true, text: titulo, font: { family: 'monospace', size: 15, weight: 'bold' }, color: '#2f2f2b' },
            tooltip: {
                backgroundColor: 'rgba(47, 47, 43, 0.95)',
                titleFont: { family: 'monospace', size: 13, weight: 'bold' },
                bodyFont: { family: 'monospace', size: 12 },
                borderColor: '#cfcfc6',
                borderWidth: 1,
                padding: 12,
                usePointStyle: true,
                callbacks: {
                    label: function(context) {
                        if (esScatter) {
                            return ` Mediadores (D): ${context.parsed.x.toFixed(2)} → Manifestantes (M): ${context.parsed.y.toFixed(2)}`;
                        }
                        return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                    }
                }
            }
        },
        scales: {
            x: { 
                type: esScatter ? 'linear' : 'category',
                title: { display: true, text: xTitle, font: { family: 'monospace', size: 12, weight: 'bold' }, color: '#44443f' }, 
                ticks: { font: { family: 'monospace', size: 11 }, color: '#77776f', maxTicksLimit: esScatter ? 10 : 15 },
                grid: { color: '#cfcfc6' } 
            },
            y: { 
                title: { display: true, text: yTitle, font: { family: 'monospace', size: 12, weight: 'bold' }, color: '#44443f' }, 
                ticks: { font: { family: 'monospace', size: 11 }, color: '#77776f' },
                grid: { color: '#cfcfc6' } 
            }
        }
    };
}

/**
 * Evalúa las trazas numéricas y ejecuta el sistema experto cognitivo de forma segura
 */
function ejecutarLogicaAutomatizada(data) {
    if (!data || !data.M || data.M.length === 0) {
        logBitacora("Alerta: Datos insuficientes para el sistema experto cognitivo.");
        return;
    }

    const M = data.M;
    const t = data.t;
    const totalPoblacion = data.N[0] + data.M[0] + data.D[0];

    let maxM = -1; let indicePico = 0;
    for (let i = 0; i < M.length; i++) {
        if (M[i] > maxM) { maxM = M[i]; indicePico = i; }
    }
    
    const asignarTextoSeguro = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.innerText = texto;
    };

    asignarTextoSeguro('val-pico-m', maxM.toFixed(1));
    asignarTextoSeguro('val-pico-t', t[indicePico].toFixed(1));

    // Lógica del Semáforo
    const porcMaxM = (maxM / totalPoblacion) * 100;
    const semaforo = document.getElementById('semaforo-alerta');
    let nivelRiesgo = "";

    if (semaforo) {
        if (porcMaxM < 15) {
            semaforo.innerText = "Bajo Riesgo"; semaforo.style.background = "#a9b8a2"; semaforo.style.color = "#2f2f2b";
            nivelRiesgo = "Estable. Contención institucional eficiente sin desborde de malestar.";
        } else if (porcMaxM >= 15 && porcMaxM < 40) {
            semaforo.innerText = "Riesgo Moderado"; semaforo.style.background = "#cf9b6d"; semaforo.style.color = "#2f2f2b";
            nivelRiesgo = "Alerta Media. Presencia de picos de tensión; requiere intervención focalizada.";
        } else {
            semaforo.innerText = "Crisis Crítica"; semaforo.style.background = "#d67c7c"; semaforo.style.color = "#ffffff";
            nivelRiesgo = "Alto Riesgo. Masificación descontrolada con peligro latente de colapso institucional.";
        }
    }
    asignarTextoSeguro('ans-riesgo', nivelRiesgo);

    const ultimosPuntos = M.slice(-15);
    
    if (ultimosPuntos.length >= 2) {
        const deltaFinal = Math.abs(ultimosPuntos[ultimosPuntos.length - 1] - ultimosPuntos[0]);
        let respuestaEstabiliza = (deltaFinal < 3.0) 
            ? (ultimosPuntos[ultimosPuntos.length - 1] < (totalPoblacion * 0.2) ? "Sí, converge hacia la pacificación sistémica." : "Sí, pero en estado crónico de alta tensión.")
            : "No, el sistema presenta oscilaciones cíclicas o divergencia.";
        asignarTextoSeguro('ans-estabiliza', respuestaEstabiliza);

        const offsetTendencia = M.length >= 10 ? 10 : M.length - 1;
        const diferenciaTendencia = M[M.length - 1] - M[M.length - offsetTendencia];
        let respuestaTendencia = Math.abs(diferenciaTendencia) < 0.5 
            ? "Estacionaria / Meseta neutralizada." 
            : (diferenciaTendencia > 0 ? "Creciente: Expansión masiva activa." : "Decreciente: Proceso sostenido de mitigación.");
        asignarTextoSeguro('ans-tendencia', respuestaTendencia);
    } else {
        asignarTextoSeguro('ans-estabiliza', "Datos insuficientes (t muy corto).");
        asignarTextoSeguro('ans-tendencia', "Datos insuficientes.");
    }
}