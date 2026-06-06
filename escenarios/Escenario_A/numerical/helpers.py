# numerical/helpers.py

def calcular_norma_infinito(A):
    """Calcula la norma infinito de una matriz (máxima suma absoluta por filas)."""
    return max(sum(abs(val) for val in fila) for fila in A)

def invertir_matriz(A):
    """Invierte una matriz cuadrada usando eliminación de Gauss-Jordan (Puro Python)."""
    n = len(A)
    # Crear una copia de A combinada con la matriz identidad
    I = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    A_copia = [list(fila) for fila in A]
    
    for i in range(n):
        # Pivoteo parcial simple si el elemento de la diagonal es cero
        if A_copia[i][i] == 0:
            for k in range(i + 1, n):
                if A_copia[k][i] != 0:
                    A_copia[i], A_copia[k] = A_copia[k], A_copia[i]
                    I[i], I[k] = I[k], I[i]
                    break
            else:
                return None # Matriz singular, no invertible

        pivote = A_copia[i][i]
        for j in range(n):
            A_copia[i][j] /= pivote
            I[i][j] /= pivote
            
        for k in range(n):
            if k != i:
                factor = A_copia[k][i]
                for j in range(n):
                    A_copia[k][j] -= factor * A_copia[i][j]
                    I[k][j] -= factor * I[i][j]
    return I

def calcular_condicion(A):
    """Calcula el número de condición usando la norma infinito."""
    norma_A = calcular_norma_infinito(A)
    A_inv = invertir_matriz(A)
    if A_inv is None:
        return float('inf')
    norma_inv = calcular_norma_infinito(A_inv)
    return norma_A * norma_inv

def verificar_dominancia(A):
    """Evalúa la dominancia diagonal fila por fila."""
    n = len(A)
    detalles = []
    es_dominante = True
    
    for i in range(n):
        diag = abs(A[i][i])
        suma_resto = sum(abs(A[i][j]) for j in range(n) if i != j)
        fila_dominante = diag > suma_resto
        if not fila_dominante:
            es_dominante = False
        detalles.append({
            "fila": i + 1,
            "diagonal": diag,
            "suma_resto": suma_resto,
            "estado": "Dominante" if fila_dominante else "No dominante"
        })
    return es_dominante, detalles

def calcular_residuo(A, x, b):
    """Calcula la norma euclidiana del residuo ||Ax - b||."""
    n = len(A)
    residuo_cuadrado = 0.0
    for i in range(n):
        ax_i = sum(A[i][j] * x[j] for j in range(n))
        residuo_cuadrado += (ax_i - b[i]) ** 2
    return residuo_cuadrado ** 0.5