def aplicar_simpson13(x, y):
    n = len(x) - 1
    h = (x[1] - x[0])
    
    suma = y[0] + y[-1]
    detalle = []
    
    for i in range(1, n):
        coef = 4 if i % 2 != 0 else 2
        suma += coef * y[i]
        detalle.append({
            "segmento": f"{x[i-1]}-{x[i+1]}",
            "formula": f"\\frac{{{h}}}{{3}}({y[i-1]} + {coef} \\cdot {y[i]} + {y[i+1]})",
            "area": round((h/3)*(y[i-1] + coef*y[i] + y[i+1]), 2)
        })
        
    return {
        "area_total": round((h / 3) * suma, 2),
        "formula_latex": "S_{1/3} = \\frac{h}{3} \\left[ f(x_0) + 4\\sum f(x_{impar}) + 2\\sum f(x_{par}) + f(x_n) \\right]",
        "sustitucion_latex": f"S_{{1/3}} = \\frac{{{h}}}{{3}} \\left[ {y[0]} + 4({y[1]}) + 2({y[2]}) + ... + {y[-1]} \\right]",
        "detalle": detalle
    }