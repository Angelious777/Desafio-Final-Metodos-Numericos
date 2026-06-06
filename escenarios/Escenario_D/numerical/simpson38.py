def aplicar_simpson38(x, y):
    n = len(x) - 1
    h = (x[1] - x[0])
    
    suma = y[0] + y[-1]
    detalle = []
    
    for i in range(1, n):
        coef = 3 if i % 3 != 0 else 2
        suma += coef * y[i]
        detalle.append({
            "segmento": f"{x[i-1]}-{x[i]}",
            "formula": f"\\frac{{3{h}}}{{8}}({y[i-1]} + 3({y[i]}) + {y[i+1]})",
            "area": round(((3*h)/8)*(y[i-1] + 3*y[i] + y[i+1]), 2)
        })
        
    return {
        "area_total": round(((3 * h) / 8) * suma, 2),
        "formula_latex": "S_{3/8} = \\frac{3h}{8} \\left[ f(x_0) + 3f(x_1) + 3f(x_2) + 2f(x_3) + ... + f(x_n) \\right]",
        "sustitucion_latex": f"S_{{3/8}} = \\frac{{3 \\cdot {h}}}{{8}} \\left[ {y[0]} + 3({y[1]}) + 3({y[2]}) + 2({y[3]}) + {y[-1]} \\right]",
        "detalle": detalle
    }