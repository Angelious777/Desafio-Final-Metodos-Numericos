def calcular_gasto_sin_inflacion(precio_inicial, dias_totales):
    """Calcula lo que se hubiera gastado si el precio inicial se mantenía constante."""
    return round(precio_inicial * dias_totales, 2)

def calcular_perdida_poder_adquisitivo(gasto_real, gasto_ideal):
    """Calcula la pérdida monetaria familiar."""
    return round(gasto_real - gasto_ideal, 2)

def evaluar_impacto_productos(datos_productos, dias):
    """Compara varios productos para ver cuál generó mayor pérdida."""
    from .trapecio import aplicar_trapecio
    
    impactos = {}
    dias_totales = dias[-1] - dias[0] + 1
    
    for nombre, precios in datos_productos.items():
        if nombre != "dias":
            gasto_real = aplicar_trapecio(dias, precios)['area_total']
            gasto_ideal = calcular_gasto_sin_inflacion(precios[0], dias_totales)
            perdida = calcular_perdida_poder_adquisitivo(gasto_real, gasto_ideal)
            impactos[nombre] = {
                "gasto_real": gasto_real,
                "perdida": perdida,
                "incremento_porcentual": round((perdida / gasto_ideal) * 100, 2) if gasto_ideal > 0 else 0
            }
            
    # Encontrar el producto con mayor pérdida absoluta
    producto_top = max(impactos, key=lambda k: impactos[k]['perdida'])
    
    return {
        "detalle_productos": impactos,
        "producto_mas_impactante": producto_top,
        "max_perdida": impactos[producto_top]['perdida']
    }