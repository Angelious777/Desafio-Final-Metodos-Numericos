# numerical/gradiente_conjugado.py
from numerical.helpers import calcular_residuo

def producto_matriz_vector(A, v):
    """Multiplica una matriz de nxn por un vector de nx1 (Puro Python)."""
    return [sum(A[i][j] * v[j] for j in range(len(v))) for i in range(len(A))]

def producto_punto(v1, v2):
    """Calcula el producto punto entre dos vectores."""
    return sum(x * y for x, y in zip(v1, v2))

def gradiente_conjugado(A, b, tol=1e-6, max_iter=100):
    n = len(A)
    x = [0.0] * n  # Aproximación inicial
    
    # r0 = b - A * x0
    Ax0 = producto_matriz_vector(A, x)
    r = [b[i] - Ax0[i] for i in range(n)]
    
    # Dirección inicial p0 = r0
    p = list(r)
    
    r_punto_r = producto_punto(r, r)
    historial_errores = []
    
    for k in range(max_iter):
        err = calcular_residuo(A, x, b)
        historial_errores.append(err)
        
        if err < tol:
            return {
                "solucion": x,
                "iteraciones": k,
                "error_final": err,
                "historial_errores": historial_errores,
                "convergio": True
            }
            
        Ap = producto_matriz_vector(A, p)
        p_Ap = producto_punto(p, Ap)
        
        if p_Ap == 0:
            break  # Evitar división entre cero si p se vuelve vector nulo
            
        # Alfa = (r_k^T * r_k) / (p_k^T * A * p_k)
        alfa = r_punto_r / p_Ap
        
        # x_{k+1} = x_k + alfa * p_k
        x = [x[i] + alfa * p[i] for i in range(n)]
        
        # r_{k+1} = r_k - alfa * A * p_k
        r = [r[i] - alfa * Ap[i] for i in range(n)]
        
        nuevo_r_punto_r = producto_punto(r, r)
        
        # Beta = (r_{k+1}^T * r_{k+1}) / (r_k^T * r_k)
        beta = nuevo_r_punto_r / r_punto_r
        r_punto_r = nuevo_r_punto_r
        
        # p_{k+1} = r_{k+1} + beta * p_k
        p = [r[i] + beta * p[i] for i in range(n)]

    err_final = calcular_residuo(A, x, b)
    historial_errores.append(err_final)
    
    return {
        "solucion": x,
        "iteraciones": max_iter,
        "error_final": err_final,
        "historial_errores": historial_errores,
        "convergio": err_final < tol
    }