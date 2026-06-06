import numpy as np

def resolver_heun(sistema_oriente, y0, t, return_details=False):
    """
    Resuelve un sistema de EDOs usando el método de Heun (Predictor-Corrector).
    sistema_oriente: Función que recibe (t, y) y devuelve el vector de derivadas.
    y0: Vector de condiciones iniciales [N0, M0, D0].
    t: Array de puntos temporales discretizados.
    """
    n_pasos = len(t)
    n_ecuaciones = len(y0)
    y = np.zeros((n_pasos, n_ecuaciones))
    y[0] = y0
    detalles = []

    for i in range(n_pasos - 1):
        h = t[i+1] - t[i]
        t_actual = t[i]
        y_actual = y[i]

        # Paso Predictor (Euler hacia adelante)
        f_actual = np.array(sistema_oriente(t_actual, y_actual))
        y_predicho = y_actual + h * f_actual

        # Paso Corrector (Trapecio utilizando el punto predicho)
        f_predicho = np.array(sistema_oriente(t[i+1], y_predicho))
        y[i+1] = y_actual + (h / 2.0) * (f_actual + f_predicho)

        if return_details:
            detalles.append({
                'f_actual': float(f_actual[1]),
                'M_pred': float(y_predicho[1]),
                'f_predicho': float(f_predicho[1]),
                'M_final': float(y[i+1][1])
            })

    return (y, detalles) if return_details else y