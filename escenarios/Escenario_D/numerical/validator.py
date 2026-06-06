def validar_datos(x, y):
    """Verifica que los arrays x (días) e y (precios) sean válidos."""
    if not x or not y:
        raise ValueError("Los datos de días y precios no pueden estar vacíos.")
    if len(x) != len(y):
        raise ValueError("La cantidad de días debe ser igual a la cantidad de precios registrados.")
    if len(x) < 2:
        raise ValueError("Se necesitan al menos dos puntos de datos para integrar.")
    if any(p < 0 for p in y):
        raise ValueError("Los precios no pueden ser negativos.")
    return True