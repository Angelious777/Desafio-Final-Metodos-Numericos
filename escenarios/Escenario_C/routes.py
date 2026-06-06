from flask import Blueprint, render_template, request, jsonify
import numpy as np

escenario_C_bp = Blueprint(
    'escenario_C', __name__, 
    template_folder='templates', 
    static_folder='static'
)

# Datos reales adaptados al caso de la carne de pollo (Bs/Kg)
DATOS_POLLO = {
    "x": [1, 5, 10, 15, 20, 30],
    "y": [14.0, 15.5, 18.0, 20.5, 22.5, 24.5]
}

def calcular_lagrange(x_datos, y_datos, x_interp):
    n = len(x_datos)
    resultado = 0
    pasos_polinomio = []
    
    # CORREGIDO: Nombre unificado para evitar NameError
    teoria_estructura = (
        "<h5>Estructura Matemática Global (Grado 5)</h5>"
        "<p>Al tener 6 puntos muestreados del mercado avícola, el método de Lagrange genera un único polinomio de grado 5 con la forma estructural:</p>"
        "$$\\text{Formula General: } P_5(x) = y_0 L_0(x) + y_1 L_1(x) + y_2 L_2(x) + y_3 L_3(x) + y_4 L_4(x) + y_5 L_5(x)$$"
        "<p>Donde cada \\(L_i(x)\\) es un polinomio basal que vale 1 en el día \\(x_i\\) y 0 en los demás días de control.</p>"
        "<hr>"
        "<h5>Ejemplificación y Evaluación para el Día x</h5>"
    )
    
    for i in range(n):
        numerador_str = []
        denominador_str = []
        termino_num = 1
        termino_den = 1
        
        for j in range(n):
            if i != j:
                numerador_str.append(f"({x_interp} - {x_datos[j]})")
                denominador_str.append(f"({x_datos[i]} - {x_datos[j]})")
                termino_num *= (x_interp - x_datos[j])
                termino_den *= (x_datos[i] - x_datos[j])
        
        L_i_val = termino_num / termino_den
        resultado += y_datos[i] * L_i_val
        
        num_tex = " \\cdot ".join(numerador_str)
        den_tex = " \\cdot ".join(denominador_str)
        pasos_polinomio.append(
            f"L_{{{i}}}({x_interp}) = \\frac{{{num_tex}}}{{{den_tex}}} = {L_i_val:.4f} \\implies P_{{{i}}} = {y_datos[i]} \\cdot {L_i_val:.4f} = {(y_datos[i]*L_i_val):.4f}"
        )
    
    latex_explicacion = teoria_estructura + "<br>".join([f"\\({p}\\)" for p in pasos_polinomio])
    return float(resultado), latex_explicacion


def calcular_newton(x_datos, y_datos, x_interp):
    n = len(x_datos)
    coef = np.zeros([n, n])
    coef[:,0] = y_datos
    
    # Tabla de diferencias divididas
    for j in range(1, n):
        for i in range(n - j):
            coef[i][j] = (coef[i+1][j-1] - coef[i][j-1]) / (x_datos[i+j] - x_datos[i])
            
    # Coeficientes reales calculados (diagonal superior)
    a0, a1, a2, a3, a4, a5 = coef[0,0], coef[0,1], coef[0,2], coef[0,3], coef[0,4], coef[0,5]
    
    teoria_estructura = (
        "<h5>Estructura Matemática por Diferencias Divididas</h5>"
        "<p>El método de Newton construye el mismo polinomio de grado 5 de manera secuencial a través de sus coeficientes \\(a_i\\):</p>"
        "$$\\text{Formula General: } P_5(x) = a_0 + a_1(x-x_0) + a_2(x-x_0)(x-x_1) + \\dots + a_5(x-x_0)\\dots(x-x_4)$$"
        "<h5>Polinomio Ejemplificado con los Datos Reales:</h5>"
        f"$$P_5(x) = {a0:.2f} + {a1:.4f}(x-1) + {a2:.4f}(x-1)(x-5) + {a3:.4f}(x-1)(x-5)(x-10) + {a4:.4f}(x-1)\\dots(x-15) + {a5:.4f}(x-1)\\dots(x-20)$$"
        "<hr>"
    )
    
    tabla_pasos = []
    for i in range(n):
        fila = f"x_{i}={x_datos[i]} \\mid f[x_{i}]={coef[i][0]:.2f}"
        for j in range(1, n - i):
            fila += f" \\mid f[\\dots]={coef[i][j]:.4f}"
        tabla_pasos.append(f"\\({fila}\\)")

    # Evaluar el polinomio
    resultado = coef[0,0]
    multiplicador = 1.0
    paso_evaluacion = f"P({x_interp}) = {coef[0,0]:.2f}"
    
    for i in range(1, n):
        multiplicador *= (x_interp - x_datos[i-1])
        resultado += coef[0,i] * multiplicador
        paso_evaluacion += f" + ({coef[0,i]:.4f} \\cdot {multiplicador:.2f})"
        
    paso_evaluacion += f" = {resultado:.4f}"
    
    explicacion_completa = (
        teoria_estructura + 
        "<strong>Tabla de Diferencias Divididas (diagonal superior):</strong><br>" + 
        "<br>".join(tabla_pasos) + 
        f"<br><br><strong>Evaluación en el punto:</strong><br>\\({paso_evaluacion}\\)"
    )
    return float(resultado), explicacion_completa


def calcular_splines(x_datos, y_datos, x_interp):
    n = len(x_datos)
    idx = 0
    for i in range(n-1):
        if x_datos[i] <= x_interp <= x_datos[i+1]:
            idx = i
            break
    else:
        idx = n - 2
        
    x0, x1 = x_datos[idx], x_datos[idx+1]
    y0, y1 = y_datos[idx], y_datos[idx+1]
    
    m = (y1 - y0) / (x1 - x0)
    resultado = y0 + m * (x_interp - x0)
    
    teoria_estructura = (
        "<h5>Estructura Matemática por Trazadores (Local Segmentado)</h5>"
        "<p>A diferencia de Lagrange y Newton, Splines divide el dominio en subintervalos, "
        "calculando una trayectoria lineal independiente para cada tramo del mes:</p>"
        "$$\\text{Formula General por Intervalo: } S_i(x) = y_i + m_i(x - x_i) \\quad \\text{para } x \\in [x_i, x_{i+1}]$$"
        "<h5>Sistema Completo de Splines Ejemplificado (Precio de la Carne de Pollo):</h5>"
        "<ul>"
        "<li><strong>Tramo 1 (Días 1 a 5):</strong> \\(S_1(x) = 14.0 + 0.3750(x - 1)\\)</li>"
        "<li><strong>Tramo 2 (Días 5 a 10):</strong> \\(S_2(x) = 15.5 + 0.5000(x - 5)\\)</li>"
        "<li><strong>Tramo 3 (Días 10 a 15):</strong> \\(S_3(x) = 18.0 + 0.5000(x - 10)\\)</li>"
        "<li><strong>Tramo 4 (Días 15 a 20):</strong> \\(S_4(x) = 20.5 + 0.4000(x - 15)\\)</li>"
        "<li><strong>Tramo 5 (Días 20 a 30):</strong> \\(S_5(x) = 22.5 + 0.2000(x - 20)\\)</li>"
        "</ul>"
        "<hr>"
        "<h5>Resolución Local para el Punto Seleccionado:</h5>"
    )
    
    explicacion_local = (
        f"El punto \\(x = {x_interp}\\) se encuentra en el intervalo \\([{x0}, {x1}]\\).<br>"
        f"Pendiente del segmento actual: \\(m = \\frac{{{y1} - {y0}}}{{{x1} - {x0}}} = {m:.4f}\\)<br>"
        f"Ecuación de la recta del tramo activo: \\(S(x) = {y0} + {m:.4f} \\cdot (x - {x0})\\)<br>"
        fr"Resultado final: \(S({x_interp}) = {resultado:.4f}\text{{ Bs/Kg}}\)"
    )
    
    explicacion_completa = teoria_estructura + explicacion_local
    return float(resultado), explicacion_completa


@escenario_C_bp.route('/')
def index():
    return render_template('index.html', datos=DATOS_POLLO)


@escenario_C_bp.route('/calcular', methods=['POST'])
def calcular():
    data = request.get_json()
    x_val = float(data['x_val'])
    x_dat = DATOS_POLLO["x"]
    y_dat = DATOS_POLLO["y"]
    
    res_lagrange, exp_lagrange = calcular_lagrange(x_dat, y_dat, x_val)
    res_newton, exp_newton = calcular_newton(x_dat, y_dat, x_val)
    res_spline, exp_spline = calcular_splines(x_dat, y_dat, x_val)
    
    x_curva = np.linspace(min(x_dat), max(x_dat), 100).tolist()
    y_curva_lagrange = [calcular_lagrange(x_dat, y_dat, x)[0] for x in x_curva]
    
    return jsonify({
        "lagrange_res": res_lagrange,
        "lagrange_exp": exp_lagrange,
        "newton_res": res_newton,
        "newton_exp": exp_newton,
        "spline_res": res_spline,
        "spline_exp": exp_spline,
        "x_curva": x_curva,
        "y_curva": y_curva_lagrange
    })
