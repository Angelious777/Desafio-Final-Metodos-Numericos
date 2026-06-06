# numerical/lu.py
from escenarios.Escenario_A.numerical.helpers import calcular_residuo

def lu_decomposition(A):
    """Realiza la descomposición LU usando el método de Doolittle (L con 1s en la diagonal)."""
    n = len(A)
    L = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    U = [[0.0 for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        # Evaluar elementos de la matriz Superior U
        for k in range(i, n):
            suma = sum(L[i][j] * U[j][k] for j in range(i))
            U[i][k] = A[i][k] - suma
            
        # Evaluar elementos de la matriz Inferior L
        for k in range(i + 1, n):
            if U[i][i] == 0:
                return None, None  # Requiere pivoteo o la matriz es singular
            suma = sum(L[k][j] * U[j][i] for j in range(i))
            L[k][i] = (A[k][i] - suma) / U[i][i]
            
    return L, U

def forward_substitution(L, b):
    """Resuelve Ly = b"""
    n = len(L)
    y = [0.0] * n
    for i in range(n):
        suma = sum(L[i][j] * y[j] for j in range(i))
        y[i] = b[i] - suma
    return y

def backward_substitution(U, y):
    """Resuelve Ux = y"""
    n = len(U)
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        if U[i][i] == 0:
            return None
        suma = sum(U[i][j] * x[j] for j in range(i + 1, n))
        x[i] = (y[i] - suma) / U[i][i]
    return x

def lu(A, b):
    """Función principal que envuelve el método LU para el backend."""
    L, U = lu_decomposition(A)
    
    if L is None or U is None:
        return {"error": "La matriz requiere pivoteo o es singular. No se pudo realizar la descomposición LU estándar."}
        
    y = forward_substitution(L, b)
    x = backward_substitution(U, y)
    
    if x is None:
        return {"error": "División entre cero durante la sustitución hacia atrás. U contiene elementos nulos en la diagonal."}
        
    err = calcular_residuo(A, x, b)
    
    # Al ser un método directo, no tiene un "historial de errores" iterativo, 
    # pero devolvemos una estructura compatible con el frontend.
    return {
        "solucion": x,
        "L": L,
        "U": U,
        "iteraciones": 1,  # Métodos directos resuelven en un solo ciclo analítico
        "error_final": err,
        "historial_errores": [err],
        "convergio": True
    }