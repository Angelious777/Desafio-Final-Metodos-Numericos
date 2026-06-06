// ============================================
// DATOS BASE DE SIMULACIÓN
// ============================================
let datosSimulacion = {
    "dias": [1, 5, 10, 15, 20, 25, 30],

    "arroz":     [20, 22.4, 22.9, 23.5, 24.2, 25.0, 25.8],
    "aceite":    [15, 18, 25.3, 23.1, 22.0, 22.1, 23.2],
    "huevo":     [30, 32.5, 35, 40, 42.0, 50.2, 56.5],
    "papa":      [5, 5.4, 6.0, 6.8, 7.6, 8.5, 9.5],

    "pollo":     [18, 22, 28, 35, 50, 80, 100],
    "carne_res": [60, 65, 72, 80, 90, 105, 120],

    "tomate":    [6, 7, 8.5, 10, 12, 16, 20],
    "zanahoria": [4, 4.6, 5.3, 6.2, 7.1, 8.0, 10.0]
};

// Diccionario para formatear las etiquetas legibles del Combo Box
const nombresProductos = {
    "arroz": "Arroz (Bs/kg)",
    "aceite": "Aceite (Bs/Litro)",
    "huevo": "Huevo (Bs/U.)",
    "papa": "Papa (Bs/kg)",
    "pollo": "Pollo (Bs/kg)",
    "carne_res": "Carne de Res (Bs/kg)",
    "tomate": "Tomate (Bs/kg)",
    "zanahoria": "Zanahoria (Bs/kg)"
};

const infoMetodos = {
    "trapecio": "Aproxima el área conectando los puntos con líneas rectas. Soporta intervalos no uniformes de manera exacta.",
    "simpson13": "Usa parábolas para conectar grupos de 3 puntos. Condición estricta: 'n' debe ser par e intervalos uniformes.",
    "simpson38": "Usa curvas cúbicas para conectar grupos de 4 puntos. Condición estricta: 'n' debe ser múltiplo de 3 e intervalos uniformes."
};

document.addEventListener('DOMContentLoaded', () => {
    const selectProducto = document.getElementById('producto-select');
    const selectMetodo = document.getElementById('metodo-select');
    const btnCalcular = document.getElementById('btn-calcular');
    const btnAnalisis = document.getElementById('btn-analisis');
    const btnCerrarCanasta = document.getElementById('btn-cerrar-canasta');
    const ventanaCanasta = document.getElementById('ventana-canasta');
    const infoMetodoDiv = document.getElementById('metodo-info');

    // === AJUSTE: Población dinámica del select antes de cargar datos ===
    adaptarComboBox(selectProducto);

    cargarTablaInteractiva(selectProducto.value);
    if (infoMetodoDiv) infoMetodoDiv.innerText = infoMetodos[selectMetodo.value];

    selectProducto.addEventListener('change', (e) => cargarTablaInteractiva(e.target.value));
    selectMetodo.addEventListener('change', (e) => {
        if (infoMetodoDiv) infoMetodoDiv.innerText = infoMetodos[e.target.value];
    });

    btnCalcular.addEventListener('click', () => {
        limpiarBitacora();
        logBitacora("[1] Datos cargados desde la interfaz de entrada.");
        
        const datosActuales = extraerDatosDeTabla();
        const producto = selectProducto.value;
        const metodo = selectMetodo.value;

        logBitacora(`[2] Método seleccionado: ${metodo.toUpperCase()}`);

        if (!validarDatos(datosActuales.dias)) {
            logBitacora("[!] ERROR CRÍTICO: Validación de datos fallida. Abortando cálculo.");
            return;
        }

        // Renderizado gráfico
        if (typeof renderizarGraficoPrecios === 'function') {
            renderizarGraficoPrecios(datosActuales.dias, datosActuales.precios, producto.toUpperCase());
        }

        // Ejecutar motor matemático
        ejecutarMotorMatematico(metodo, datosActuales);
    });

    btnAnalisis.addEventListener('click', () => ventanaCanasta.style.display = 'flex');
    btnCerrarCanasta.addEventListener('click', () => ventanaCanasta.style.display = 'none');
});

// ============================================
// FUNCIONES DEL MOTOR MATEMÁTICO
// ============================================

function ejecutarMotorMatematico(metodoSeleccionado, datos) {
    const x = datos.dias;
    const y = datos.precios;
    const n = x.length - 1;
    const a = x[0];
    const b = x[n];
    
    // Cálculo de h promedio
    let h = (b - a) / n;
    h = Math.round(h * 100) / 100; 

    logBitacora(`[4] Parámetros discretizados: a=${a}, b=${b}, n=${n}, h=${h}`);

    // Actualizar Panel de Discretización
    document.getElementById('param-a').innerText = a;
    document.getElementById('param-b').innerText = b;
    document.getElementById('param-n').innerText = n;
    document.getElementById('param-h').innerText = h;

    // Verificar Condiciones
    const verificacionDiv = document.getElementById('math-verificacion');
    let cumpleCondicion = verificarCondicionMetodo(metodoSeleccionado, n);
    
    if (cumpleCondicion.valido) {
        verificacionDiv.innerHTML = `<span style="color: green;">✓ ${cumpleCondicion.mensaje}</span>`;
        logBitacora(`[3] Verificación de condiciones: ${cumpleCondicion.mensaje} (CUMPLIDA)`);
    } else {
        verificacionDiv.innerHTML = `<span style="color: red;">✗ ${cumpleCondicion.mensaje}</span>`;
        logBitacora(`[3] Verificación de condiciones: ${cumpleCondicion.mensaje} (FALLIDA)`);
    }

    // Calcular todos los métodos para la tabla comparativa
    const resTrapecio = calcularTrapecio(h, y);
    const resSimpson13 = calcularSimpson13(h, y, n);
    const resSimpson38 = calcularSimpson38(h, y, n);

    let resultadoPrincipal, detallesMetodo;

    // Gestión adaptativa contra fallos de restricción matemática
    if (metodoSeleccionado === 'trapecio') {
        resultadoPrincipal = resTrapecio.area;
        detallesMetodo = resTrapecio;
    } else if (metodoSeleccionado === 'simpson13') {
        if (n % 2 !== 0) {
            logBitacora("[!] CONTROL: 'n' es impar. Simpson 1/3 no puede procesarse. Redireccionando a Trapecio.");
            resultadoPrincipal = resTrapecio.area;
            detallesMetodo = resTrapecio;
        } else {
            resultadoPrincipal = resSimpson13.area;
            detallesMetodo = resSimpson13;
        }
    } else {
        if (n % 3 !== 0) {
            logBitacora("[!] CONTROL: 'n' no es múltiplo de 3. Simpson 3/8 no puede procesarse. Redireccionando a Trapecio.");
            resultadoPrincipal = resTrapecio.area;
            detallesMetodo = resTrapecio;
        } else {
            resultadoPrincipal = resSimpson38.area;
            detallesMetodo = resSimpson38;
        }
    }

    logBitacora(`[5] Construcción de la matriz de coeficientes y fórmula general completada.`);
    
    // Generar tablas matemáticas (Coeficientes) usando la estructura del método final ejecutado
    actualizarTablaCoeficientes(y, detallesMetodo.coeficientes);

    // Calcular Ideal y Pérdida
    const gastoIdeal = y[0] * (b - a);
    const perdida = resultadoPrincipal - gastoIdeal;

    // Actualizar Interfaz (Fórmulas y Resultados)
    actualizarInterfazMatematica(a, b, resultadoPrincipal, detallesMetodo, gastoIdeal, perdida, metodoSeleccionado);
    
    // Comparativa de errores
    actualizarTablaComparativa(resultadoPrincipal, resTrapecio.area, resSimpson13.area, resSimpson38.area);

    logBitacora(`[7] Evaluación numérica ejecutada.`);
    logBitacora(`[8] Resultado final del área integral: ${resultadoPrincipal.toFixed(2)} Bs.`);
    logBitacora(`[9] Generación de análisis económico completada.`);
}

// ============================================
// ALGORITMOS DE INTEGRACIÓN
// ============================================

function calcularTrapecio(h, y) {
    // Adaptación dinámica para procesar intervalos no uniformes reais (pasos variables)
    const x = Array.from(document.querySelectorAll('.din-dia')).map(i => parseFloat(i.value) || 0);
    let area = 0;
    let coeficientes = y.map((_, i) => (i === 0 || i === y.length - 1) ? 1 : 2);
    
    for (let i = 0; i < y.length - 1; i++) {
        let h_individual = x[i+1] - x[i];
        area += ((y[i] + y[i+1]) / 2) * h_individual;
    }
    
    return {
        area: area,
        coeficientes: coeficientes,
        formulaGral: `S = \\sum_{i=0}^{n-1} \\frac{h_i}{2} [f(x_i) + f(x_{i+1})]`,
        fraccionH: `h_{\\text{var}}`,
        suma: Math.round((area / (h || 1)) * 100) / 100
    };
}

function calcularSimpson13(h, y, n) {
    if (n % 2 !== 0) return { area: 0, coeficientes: [], formulaGral: 'N/A (n debe ser par)', fraccionH: '', suma: 0 };
    
    let coeficientes = y.map((_, i) => {
        if (i === 0 || i === n) return 1;
        return i % 2 === 0 ? 2 : 4;
    });

    let sumaIntermedia = 0;
    for (let i = 0; i < y.length; i++) {
        sumaIntermedia += y[i] * coeficientes[i];
    }

    let area = (h / 3) * sumaIntermedia;

    return {
        area: area,
        coeficientes: coeficientes,
        formulaGral: `S = \\frac{h}{3} [f(x_0) + 4 \\sum_{impares} f(x_i) + 2 \\sum_{pares} f(x_i) + f(x_n)]`,
        fraccionH: `\\frac{${h}}{3}`,
        suma: sumaIntermedia
    };
}

function calcularSimpson38(h, y, n) {
    if (n % 3 !== 0) return { area: 0, coeficientes: [], formulaGral: 'N/A (n debe ser múltiplo de 3)', fraccionH: '', suma: 0 };
    
    let coeficientes = y.map((_, i) => {
        if (i === 0 || i === n) return 1;
        return i % 3 === 0 ? 2 : 3;
    });

    let sumaIntermedia = 0;
    for (let i = 0; i < y.length; i++) {
        sumaIntermedia += y[i] * coeficientes[i];
    }

    let area = ((3 * h) / 8) * sumaIntermedia;

    return {
        area: area,
        coeficientes: coeficientes,
        formulaGral: `S = \\frac{3h}{8} [f(x_0) + 3f(x_1) + 3f(x_2) + 2f(x_3) + ... + f(x_n)]`,
        fraccionH: `\\frac{3(${h})}{8}`,
        suma: Math.round(sumaIntermedia * 100) / 100
    };
}

// ============================================
// FUNCIONES AUXILIARES Y RENDERIZADO
// ============================================

// Llena el Combo Box de forma automática basándose en las llaves de datosSimulacion
function adaptarComboBox(selectProducto) {
    if (!selectProducto) return;
    
    selectProducto.innerHTML = ''; // Limpiar mensaje estático de carga

    Object.keys(datosSimulacion).forEach(key => {
        // Ignoramos la clave 'dias' porque define el eje X y no un producto computable
        if (key !== 'dias') {
            const option = document.createElement('option');
            option.value = key; // Valor interno para JS (ej: 'carne_res')
            option.textContent = nombresProductos[key] || key.toUpperCase(); // Etiqueta visual agradable
            selectProducto.appendChild(option);
        }
    });
}

function cargarTablaInteractiva(producto) {
    const tbody = document.getElementById('body-datos-entrada');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    datosSimulacion.dias.forEach((d, i) => {
        // Blindaje contra desfases de tamaño entre arrays de precios y días
        const precioSeguro = (datosSimulacion[producto] && datosSimulacion[producto][i] !== undefined) 
            ? datosSimulacion[producto][i] 
            : 0;

        tbody.innerHTML += `<tr>
            <td style="background: #f0f0f0;"><strong>${i}</strong></td>
            <td><input type="number" class="din-dia retro-input" value="${d}" style="text-align: center;"></td>
            <td><input type="number" class="din-precio retro-input" value="${precioSeguro}" step="0.1" style="text-align: center;"></td>
        </tr>`;
    });
}

function extraerDatosDeTabla() {
    return {
        // Fallback inmediato a 0 si se encuentran inputs vacíos
        dias: Array.from(document.querySelectorAll('.din-dia')).map(i => parseFloat(i.value) || 0),
        precios: Array.from(document.querySelectorAll('.din-precio')).map(i => parseFloat(i.value) || 0)
    };
}

function validarDatos(x) {
    for (let i = 0; i < x.length - 1; i++) {
        if (x[i+1] <= x[i]) {
            alert(`Error detectado en x[${i+1}] y x[${i}]: El día ${x[i+1]} no puede ser menor o igual al día ${x[i]}. Verifique los datos.`);
            return false;
        }
        let salto = x[i+1] - x[i];
        if (salto > 10 || salto < 1) { 
            logBitacora(`[!] Advertencia: Salto anormal detectado entre x[${i}] y x[${i+1}] (Diferencia: ${salto}).`);
        }
    }
    return true;
}

function verificarCondicionMetodo(metodo, n) {
    if (metodo === 'simpson13') {
        return { valido: n % 2 === 0, mensaje: `Número de intervalos n=${n}. Para Simpson 1/3, n debe ser par.` };
    } else if (metodo === 'simpson38') {
        return { valido: n % 3 === 0, mensaje: `Número de intervalos n=${n}. Para Simpson 3/8, n debe ser múltiplo de 3.` };
    }
    return { valido: true, mensaje: `Regla del Trapecio aplicable para cualquier cantidad de intervalos (n=${n}).` };
}

function actualizarTablaCoeficientes(y, coeficientes) {
    const tbody = document.getElementById('body-coeficientes');
    tbody.innerHTML = '';
    
    if (!coeficientes || coeficientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="color: red;">No es posible generar coeficientes en la vista principal para este método debido a restricciones.</td></tr>`;
        return;
    }

    coeficientes.forEach((coef, i) => {
        let producto = (y[i] * coef).toFixed(2);
        tbody.innerHTML += `<tr>
            <td style="font-family: monospace;">f(x_${i})</td>
            <td>${y[i]}</td>
            <td><strong>${coef}</strong></td>
            <td>${producto}</td>
        </tr>`;
    });
}

function actualizarInterfazMatematica(a, b, resultado, detalles, gastoIdeal, perdida, metodo) {
    document.getElementById('resp-gasto-real').innerText = `${resultado.toFixed(2)} Bs`;
    document.getElementById('resp-gasto-ideal').innerText = `${gastoIdeal.toFixed(2)} Bs`;
    
    const perdidaElem = document.getElementById('resp-perdida');
    if (perdida > 0) {
        perdidaElem.innerText = `${perdida.toFixed(2)} Bs`;
        perdidaElem.style.color = "var(--danger)";
    } else {
        perdidaElem.innerText = `0.00 Bs (Sin pérdida)`;
        perdidaElem.style.color = "var(--green-medium)";
    }

    // Generar sustitución LaTeX (Paso 6)
    logBitacora(`[6] Generando sustitución matemática explícita.`);
    let strSustitucion = "";
    if (detalles.coeficientes && detalles.coeficientes.length > 0) {
        const terminos = detalles.coeficientes.map((coef, i) => coef === 1 ? `${yGlobal[i] || 0}` : `${coef}(${yGlobal[i] || 0})`);
        strSustitucion = `S = ${detalles.fraccionH} \\left[ ${terminos.join(' + ')} \\right]`;
    } else {
        strSustitucion = "\\text{Fórmula no aplicable para el método seleccionado originalmente.}";
    }

    document.getElementById('math-integral').innerHTML = `$$ \\text{Área} = \\int_{${a}}^{${b}} f(x) \\,dx \\approx ${resultado.toFixed(2)} $$`;
    document.getElementById('math-formula-general').innerHTML = `$$ ${detalles.formulaGral} $$`;
    document.getElementById('math-formula-sustituida').innerHTML = `$$ ${strSustitucion} $$`;
    
    if (detalles.suma > 0) {
        document.getElementById('math-operacion-intermedia').innerHTML = `$$ S = ${detalles.fraccionH} (${detalles.suma}) $$`;
    } else {
        document.getElementById('math-operacion-intermedia').innerHTML = `$$ S = - $$`;
    }

    document.getElementById('math-resultado-final').innerHTML = `Área Calculada = ${resultado.toFixed(2)} Bs`;

    // Renderizar LaTeX
    if (window.MathJax) {
        MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
    }
}

// Variable global temporal para la sustitución LaTeX
let yGlobal = [];
function ejecutarMotorMatematicoWrapper(metodo, datos) {
    yGlobal = datos.precios; 
}
const originalEjecutar = ejecutarMotorMatematico;
ejecutarMotorMatematico = function(m, d) {
    ejecutarMotorMatematicoWrapper(m, d);
    originalEjecutar(m, d);
}

function actualizarTablaComparativa(resPrincipal, areaTrap, areaS13, areaS38) {
    const poblarFila = (idComp, idErr, valorMetodo) => {
        document.getElementById(idComp).innerText = valorMetodo > 0 ? valorMetodo.toFixed(2) : "N/A";
        
        let dif = Math.abs(resPrincipal - valorMetodo);
        let errCell = document.getElementById(idErr);
        
        if (valorMetodo === 0 || resPrincipal === 0) {
            errCell.innerText = "-";
            errCell.style.color = "#888";
        } else if (dif === 0) {
            errCell.innerText = "0.00 (Referencia)";
            errCell.style.color = "green";
        } else {
            errCell.innerText = `± ${dif.toFixed(2)} Bs`;
            errCell.style.color = "var(--danger)";
        }
    };

    poblarFila('comp-trap', 'err-trap', areaTrap);
    poblarFila('comp-simp13', 'err-simp13', areaS13);
    poblarFila('comp-simp38', 'err-simp38', areaS38);
}

// ============================================
// SISTEMA DE LOGS (BITÁCORA)
// ============================================

function limpiarBitacora() {
    document.getElementById('bitacora-contenido').innerHTML = "";
}

function logBitacora(mensaje) {
    const b = document.getElementById('bitacora-contenido');
    const now = new Date();
    const tiempo = now.toLocaleTimeString('es-ES', { hour12: false });
    b.innerHTML += `<div><span style="color: #888;">[${tiempo}]</span> ${mensaje}</div>`;
    b.scrollTop = b.scrollHeight; 
}