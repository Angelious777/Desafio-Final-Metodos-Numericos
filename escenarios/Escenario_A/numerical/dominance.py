import numpy as np

def check_diagonal_dominance(A):
    """
    Evalúa la dominancia diagonal de una matriz A (lista de listas o np.array).
    Retorna un diccionario con el desglose por fila y el estado global.
    """
    A_np = np.array(A, dtype=float)
    n = A_np.shape[0]
    rows_analysis = []
    is_dominant = True
    
    for i in range(n):
        diag_val = abs(A_np[i, i])
        row_sum = sum(abs(A_np[i, j]) for j in range(n) if i != j)
        condition_met = diag_val > row_sum
        if not condition_met:
            is_dominant = False
            
        rows_analysis.append({
            "fila": i + 1,
            "valor_diagonal": float(diag_val),
            "suma_restante": float(row_sum),
            "condicion": f"|{diag_val:.2f}| > |{row_sum:.2f}|",
            "estado": "Cumple" if condition_met else "No Cumple"
        })
        
    return {
        "es_dominante": is_dominant,
        "analisis_filas": rows_analysis
    }