import numpy as np
from escenarios.Escenario_G.numerical.Heun import resolver_heun
from escenarios.Escenario_G.numerical.rk4 import resolver_rk4

def modelo_descontento(t, y, params):
    """
    Ecuaciones diferenciales del Escenario G:
    N'(t) = -a*N*M + b*D
    M'(t) = a*N*M - c*M*D
    D'(t) = k*M - r*D
    """
    N, M, D = y
    a, b, c, k, r = params['a'], params['b'], params['c'], params['k'], params['r']

    # Prevenir valores negativos físicos por aproximación numérica extrema
    N = max(0, N)
    M = max(0, M)
    D = max(0, D)

    dN_dt = -a * N * M + b * D
    dM_dt = a * N * M - c * M * D
    dD_dt = k * M - r * D

    return [dN_dt, dM_dt, dD_dt]

def ejecutar_simulacion(params):
    # Desempaquetado de parámetros de simulación
    y0 = [params['N0'], params['M0'], params['D0']]
    t_max = float(params.get('t_max', 50.0))
    h = float(params.get('h', 0.0))
    pasos = int(params.get('pasos', 0))

    if h > 0:
        pasos = max(2, int(np.floor(t_max / h)) + 1)
    elif pasos < 2:
        pasos = 200

    t = np.linspace(0.0, t_max, pasos)
    
    # Selección de algoritmo
    detalles_metodo = []
    if params.get('metodo') == 'heun':
        resultados, detalles_metodo = resolver_heun(lambda t, y: modelo_descontento(t, y, params), y0, t, return_details=True)
    else:
        resultados, detalles_metodo = resolver_rk4(lambda t, y: modelo_descontento(t, y, params), y0, t, return_details=True)

    N_seq, M_seq, D_seq = resultados[:, 0], resultados[:, 1], resultados[:, 2]

    # --- MOTOR DE ANALÍTICA SOCIAL ---
    # 1. ¿Tiende a estabilizarse?
    cambio_final_M = abs(M_seq[-1] - M_seq[-5])
    estabiliza = "Sí (Equilibrio Crónico/Paz)" if cambio_final_M < 0.1 else "No (Fluctuación/Crecimiento Activo)"

    # 2. Tendencia de los manifestantes
    tendencia = "Disminuye" if M_seq[-1] < M_seq[int(len(M_seq)/4)] else "Aumenta o permanece Crónico"
    
    # 3. Punto de masa máxima (Pico de conflicto)
    idx_max = np.argmax(M_seq)
    pico_manifestantes = float(M_seq[idx_max])
    tiempo_pico = float(t[idx_max])

    # 4. Análisis teórico de parámetros destructivos
    total_poblacion = y0[0] + y0[1] + y0[2]
    riesgo_masificacion = "Alto Riesgo" if params['a'] * total_poblacion > params['c'] * (params['k']/max(1e-5, params['r'])) else "Bajo Control Institucional"

    analisis = {
        "estabiliza": estabiliza,
        "tendencia": tendencia,
        "pico_manifestantes": round(pico_manifestantes, 2),
        "tiempo_pico": round(tiempo_pico, 1),
        "riesgo_masificacion": riesgo_masificacion
    }

    return {
        "t": t.tolist(),
        "N": N_seq.tolist(),
        "M": M_seq.tolist(),
        "D": D_seq.tolist(),
        "analisis": analisis,
        "metodo_data": detalles_metodo
    }