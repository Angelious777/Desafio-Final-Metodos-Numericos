from flask import Blueprint ,render_template, request
import math

escenario_B_bp = Blueprint(
    'escenario_B', 
    __name__, 
    url_prefix='/Escenario_B',
    template_folder='templates',
    static_folder='static'
)

@escenario_B_bp.route("/")
def inicio():
    return render_template("escenario_b.html")

def f(t, R, entrada_base, consumo_base, tipo_flujo, var_entrada, var_consumo):
    """
    Función de la derivada dR/dt.
    Si el flujo es variable, la entrada o el consumo cambian en función del tiempo 't'.
    """
    if tipo_flujo == 'variable':
        # El consumo aumenta un porcentaje diario por pánico social
        # La entrada disminuye debido al desabastecimiento
        entrada_dinamica = entrada_base * (1 - var_entrada * t)
        consumo_dinamico = consumo_base * (1 + var_consumo * t)
        
        # Asegurar que la entrada no sea negativa
        entrada_dinamica = max(0, entrada_dinamica)
        return entrada_dinamica - consumo_dinamico
    else:
        # Flujo constante tradicional
        return entrada_base - consumo_base


def resolver_euler(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo):
    pasos = int(dias / h)
    historial = []
    t = 0.0
    R = R0
    historial.append({'i': 0, 't': round(t, 4), 'R': round(R, 4), 'k1': '-', 'k2': '-', 'k3': '-', 'k4': '-'})
    
    for i in range(1, pasos + 1):
        k1 = f(t, R, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        R_siguiente = R + h * k1
        t_siguiente = t + h
        
        historial.append({
            'i': i, 't': round(t_siguiente, 4), 'R': round(R_siguiente, 4),
            'k1': round(k1, 4), 'k2': '-', 'k3': '-', 'k4': '-'
        })
        t = t_siguiente
        R = R_siguiente
    return historial


def resolver_heun(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo):
    pasos = int(dias / h)
    historial = []
    t = 0.0
    R = R0
    historial.append({'i': 0, 't': round(t, 4), 'R': round(R, 4), 'k1': '-', 'k2': '-', 'k3': '-', 'k4': '-'})
    
    for i in range(1, pasos + 1):
        k1 = f(t, R, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        R_pred = R + h * k1
        k2 = f(t + h, R_pred, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        
        R_siguiente = R + (h / 2.0) * (k1 + k2)
        t_siguiente = t + h
        
        historial.append({
            'i': i, 't': round(t_siguiente, 4), 'R': round(R_siguiente, 4),
            'k1': round(k1, 4), 'k2': round(k2, 4), 'k3': '-', 'k4': '-'
        })
        t = t_siguiente
        R = R_siguiente
    return historial


def resolver_rk4(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo):
    pasos = int(dias / h)
    historial = []
    t = 0.0
    R = R0
    historial.append({'i': 0, 't': round(t, 4), 'R': round(R, 4), 'k1': '-', 'k2': '-', 'k3': '-', 'k4': '-'})
    
    for i in range(1, pasos + 1):
        k1 = f(t, R, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        k2 = f(t + h/2.0, R + (h/2.0)*k1, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        k3 = f(t + h/2.0, R + (h/2.0)*k2, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        k4 = f(t + h, R + h*k3, entrada, consumo, tipo_flujo, var_entrada, var_consumo)
        
        R_siguiente = R + (h / 6.0) * (k1 + 2*k2 + 2*k3 + k4)
        t_siguiente = t + h
        
        historial.append({
            'i': i, 't': round(t_siguiente, 4), 'R': round(R_siguiente, 4),
            'k1': round(k1, 4), 'k2': round(k2, 4), 'k3': round(k3, 4), 'k4': round(k4, 4)
        })
        t = t_siguiente
        R = R_siguiente
    return historial


@escenario_B_bp.route('/', methods=['GET', 'POST'])
def index():
    resultados = None
    inputs = {}
    analisis = None
    
    if request.method == 'POST':
        R0 = float(request.form.get('R0', 10000))
        entrada = float(request.form.get('entrada', 1200))
        consumo = float(request.form.get('consumo', 1500))
        h = float(request.form.get('h', 0.1))
        dias = float(request.form.get('dias', 10))
        tipo_flujo = request.form.get('tipo_flujo', 'constante')
        
        var_entrada = float(request.form.get('var_entrada', 0)) / 100.0 if tipo_flujo == 'variable' else 0.0
        var_consumo = float(request.form.get('var_consumo', 0)) / 100.0 if tipo_flujo == 'variable' else 0.0

        inputs = {
            'R0': R0, 'entrada': entrada, 'consumo': consumo, 'h': h, 'dias': dias,
            'tipo_flujo': tipo_flujo, 'var_entrada': var_entrada * 100, 'var_consumo': var_consumo * 100
        }

        # Ejecución de métodos numéricos
        res_euler = resolver_euler(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo)
        res_heun = resolver_heun(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo)
        res_rk4 = resolver_rk4(R0, entrada, consumo, h, dias, tipo_flujo, var_entrada, var_consumo)

        resultados = {'euler': res_euler, 'heun': res_heun, 'rk4': res_rk4}

        # --- MOTOR DE ANÁLISIS AUTOMÁTICO ---
        # 1. Definir un umbral crítico de seguridad (20% de la reserva inicial)
        umbral_critico = R0 * 0.20
        
        # 2. Buscar fallos de desabastecimiento (Reserva <= 0 o Nivel Crítico)
        def evaluar_comportamiento(historial):
            dia_critico = None
            dia_vacio = None
            for fila in historial:
                if dia_critico is None and fila['R'] <= umbral_critico:
                    dia_critico = fila['t']
                if dia_vacio is None and fila['R'] <= 0:
                    dia_vacio = fila['t']
            return dia_critico, dia_vacio

        c_euler, v_euler = evaluar_comportamiento(res_euler)
        c_heun, v_heun = evaluar_comportamiento(res_heun)
        c_rk4, v_rk4 = evaluar_comportamiento(res_rk4)

        # 3. Medir Divergencia Numérica (Diferencia al final entre Euler y RK4)
        R_final_euler = res_euler[-1]['R']
        R_final_rk4 = res_rk4[-1]['R']
        diferencia_final = abs(R_final_rk4 - R_final_euler)

        # 4. Determinar estado de alerta y pautas logísticas según severidad
        if v_rk4 is not None:
            # Caso 1: Colapso total de existencias (Reserva <= 0)
            diagnostico = "DESABASTECIMIENTO INMINENTE DE COMBUSTIBLE"
            color_alerta = "danger"
            interpretacion_reserva = f"Las reservas colapsarán por completo a los {v_rk4} dias. La planta entrará en zona crítica de operación en el día {c_rk4}."
            ventana_alerta = f"El comité de crisis posee un margen de maniobra logístico de exactamente {c_rk4} días para interceptar la escasez física en surtidores."

        elif c_rk4 is not None:
            # Caso 2: Rompió el colchón de seguridad del 20% (Alerta Mala)
            diagnostico = "ALERTA: RESERVAS DE SEGURIDAD COMPROMETIDAS"
            color_alerta = "warning"
            interpretacion_reserva = f"Aunque no se llega a un vacío absoluto de cero, la planta perforará el umbral mínimo operativo en el día {c_rk4}. El inventario disponible es insuficiente para contingencias."
            ventana_alerta = f"Se debe activar de inmediato la importación de emergencia. Dispone de {c_rk4} días antes de que los niveles operacionales caigan a rangos de alto riesgo."

        else:
            # Caso 3: Operación completamente limpia (Logísticamente Estable)
            diagnostico = "Logísticamente Estable (Operación Segura)"
            color_alerta = "success"
            interpretacion_reserva = f"La planta mantendrá existencias estables y por encima del colchón de seguridad del 20% durante todo el período de {dias} días analizado."
            ventana_alerta = "No se requiere activación de ventanas de emergencia inmediatas, la autonomía actual responde con holgura a la demanda proyectada."

        # Pauta sobre Mitigación del Pánico Social
        if tipo_flujo == 'variable' and var_consumo > 0:
            mitigacion_panico = f"El consumo variable registra un incremento diario del {var_consumo*100}%. Las pendientes k dinámicas demuestran que si no se imponen topes de racionamiento rápidos por pánico, el vaciado de las reservas se acelerará geométricamente."
        else:
            mitigacion_panico = "El consumo se mantiene constante. El vaciado es estrictamente lineal, lo que indica que la demanda está controlada y no existen distorsiones por rumores o compras de pánico en este escenario."

        # Pauta sobre Optimización Logística (Divergencia)
        if diferencia_final > 10.0:
            optimizacion_logistica = f"Se detecta alta sensibilidad en la EDO. Existe una discrepancia de {round(diferencia_final, 2)} unidades entre Euler y RK4. Planificar estrategias con el método de Euler subestimaría el riesgo; se exige el uso obligatorio de RK4 para evitar decisiones erróneas."
        else:
            optimizacion_logistica = "Baja sensibilidad numérica. Los tres métodos convergen a valores idénticos debido a la estabilidad lineal del modelo actual. Cualquier método es seguro para la planeación logística de mediano plazo."

        analisis = {
            'diagnostico': diagnostico,
            'color': color_alerta,
            'interpretacion_reserva': interpretacion_reserva,
            'ventana_alerta': ventana_alerta,
            'mitigacion_panico': mitigacion_panico,
            'optimizacion_logistica': optimizacion_logistica,
            'umbral': round(umbral_critico, 2)
        }

    return render_template('index.html', resultados=resultados, inputs=inputs, analisis=analisis)

