import numpy as np

def resolver_rk4(sistema_oriente, y0, t, return_details=False):
    """
    Resuelve un sistema de EDOs usando el método de Runge-Kutta de 4to Orden.
    """
    n_pasos = len(t)
    n_ecuaciones = len(y0)
    y = np.zeros((n_pasos, n_ecuaciones))
    y[0] = y0
    detalles = []

    for i in range(n_pasos - 1):
        h = t[i+1] - t[i]
        t_i = t[i]
        y_i = y[i]

        k1 = np.array(sistema_oriente(t_i, y_i))
        k2 = np.array(sistema_oriente(t_i + h/2, y_i + h*k1/2))
        k3 = np.array(sistema_oriente(t_i + h/2, y_i + h*k2/2))
        k4 = np.array(sistema_oriente(t_i + h, y_i + h*k3))

        y[i+1] = y_i + (h / 6.0) * (k1 + 2*k2 + 2*k3 + k4)

        if return_details:
            detalles.append({
                'k1': float(k1[1]),
                'k2': float(k2[1]),
                'k3': float(k3[1]),
                'k4': float(k4[1])
            })

    return (y, detalles) if return_details else y