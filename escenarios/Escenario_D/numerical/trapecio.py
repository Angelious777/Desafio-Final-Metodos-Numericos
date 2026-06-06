def aplicar_trapecio(x, y):
    n = len(x) - 1
    h = (x[1] - x[0])  # Asumiendo espaciado constante
    
    # Cálculo
    suma = y[0] + y[-1]
    detalle = []
    
    for i in range(n):
        area_seg = (h / 2) * (y[i] + y[i+1])
        detalle.append({
            "segmento": f"{x[i]}-{x[i+1]}",
            "formula": f"\\frac{{{h}}}{{2}}({y[i]} + {y[i+1]})",
            "area": round(area_seg, 2)
        })
        if i > 0 and i < n:
            suma += 2 * y[i]
            
    return {
        "area_total": round((h / 2) * suma, 2),
        "formula_latex": "T = \\frac{h}{2} \\left[ f(x_0) + 2\\sum_{i=1}^{n-1}f(x_i) + f(x_n) \\right]",
        "sustitucion_latex": f"T = \\frac{{{h}}}{{2}} \\left[ {y[0]} + 2({'+'.join(map(str, y[1:-1]))}) + {y[-1]} \\right]",
        "detalle": detalle
    }