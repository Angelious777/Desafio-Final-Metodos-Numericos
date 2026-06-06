# numerical/sor.py
from escenarios.Escenario_A.numerical.helpers import calcular_residuo

def sor(A, b, omega=1.1, tol=1e-6, max_iter=100):
    n = len(A)
    x = [0.0] * n
    historial_errores = []
    
    if not (0 < omega < 2):
        return {"error": "El factor de relajación omega (ω) debe estar estrictamente entre 0 y 2."}
        
    for k in range(max_iter):
        for i in range(n):
            if A[i][i] == 0:
                return {"error": f"Elemento cero detectado en la diagonal (Fila {i+1})."}
                
            suma = sum(A[i][j] * x[j] for j in range(n) if i != j)
            x_gs = (b[i] - suma) / A[i][i]
            # Combinación lineal ponderada entre el valor anterior y el propuesto por GS
            x[i] = (1 - omega) * x[i] + omega * x_gs
            
        err = calcular_residuo(A, x, b)
        historial_errores.append(err)
        
        if err < tol:
            return {
                "solucion": x,
                "iteraciones": k + 1,
                "error_final": err,
                "historial_errores": historial_errores,
                "convergio": True
            }
            
    return {
        "solucion": x,
        "iteraciones": max_iter,
        "error_final": err,
        "historial_errores": historial_errores,
        "convergio": False
    }