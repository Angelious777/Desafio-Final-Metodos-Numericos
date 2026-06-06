# numerical/jacobi.py
from numerical.helpers import calcular_residuo

def jacobi(A, b, tol=1e-6, max_iter=100):
    n = len(A)
    x = [0.0] * n  # Vector inicial aproximado (ceros)
    historial_errores = []
    
    for k in range(max_iter):
        x_nuevo = [0.0] * n
        for i in range(n):
            if A[i][i] == 0:
                return {"error": f"Elemento cero detectado en la diagonal (Fila {i+1})."}
            
            suma = sum(A[i][j] * x[j] for j in range(n) if i != j)
            x_nuevo[i] = (b[i] - suma) / A[i][i]
        
        err = calcular_residuo(A, x_nuevo, b)
        historial_errores.append(err)
        
        if err < tol:
            return {
                "solucion": x_nuevo,
                "iteraciones": k + 1,
                "error_final": err,
                "historial_errores": historial_errores,
                "convergio": True
            }
        x = x_nuevo

    return {
        "solucion": x,
        "iteraciones": max_iter,
        "error_final": err,
        "historial_errores": historial_errores,
        "convergio": False
    }