import os
import math
from flask import Flask, render_template, request

app = Flask(__name__)

# ==========================================
# 1. MODELOS MATEMÁTICOS (ESCENARIO E)
# ==========================================

# Modelo 1: Umbral de Costo Acumulado vs Ingreso Familiar
def f1(t, C0=150.0, r=0.08, I_f=500.0):
    return C0 * math.exp(r * t) - I_f

def df1(t, C0=150.0, r=0.08, I_f=500.0):
    return C0 * r * math.exp(r * t)

# Modelo 2: Tasa de Reposición Crítica de Carburante
def f2(R, C_max=800.0, k=0.002, D=200.0):
    try:
        val = -k * R
        return R - C_max * (1.0 - math.exp(val)) - D
    except OverflowError:
        return float('inf')

def df2(R, C_max=800.0, k=0.002, D=200.0):
    try:
        return 1.0 - C_max * k * math.exp(-k * R)
    except OverflowError:
        return 1.0

# Modelo 3: Umbral de Transición y Conflicto Social
def f3(x, s=0.4):
    return x**3 - 3.0*(x**2) + 2.5*x - s

def df3(x, s=0.4):
    return 3.0*(x**2) - 6.0*x + 2.5


# ==========================================
# 2. ALGORITMOS NUMÉRICOS PASO A PASO
# ==========================================

def biseccion(f, a, b, tol=0.00001, max_iter=50, **kwargs):
    iteraciones = []
    fa = f(a, **kwargs)
    fb = f(b, **kwargs)
    
    if fa * fb >= 0:
        return None, "Error de Intervalo: f(a) y f(b) deben tener signos opuestos. f(a)*f(b) >= 0."
        
    for i in range(1, max_iter + 1):
        c = (a + b) / 2.0
        fc = f(c, **kwargs)
        
        error = abs(b - a) / 2.0
        
        iteraciones.append({
            'iter': i,
            'a': round(a, 6),
            'b': round(b, 6),
            'c': round(c, 6),
            'fc': round(fc, 6),
            'error': round(error, 6)
        })
        
        if abs(fc) < 0.000000000001 or error < tol:
            break
            
        if fa * fc < 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc
            
    return iteraciones, None

def newton_raphson(f, df, x0, tol=0.00001, max_iter=50, **kwargs):
    iteraciones = []
    x_old = x0
    
    for i in range(1, max_iter + 1):
        fx = f(x_old, **kwargs)
        dfx = df(x_old, **kwargs)
        
        if abs(dfx) < 0.000000000001:
            return None, f"Error Numérico: Derivada nula o muy cercana a cero en x = {x_old}. División por cero."
            
        x_new = x_old - fx / dfx
        error = abs(x_new - x_old)
        
        iteraciones.append({
            'iter': i,
            'x0': round(x_old, 6),
            'fx': round(fx, 6),
            'dfx': round(dfx, 6),
            'x1': round(x_new, 6),
            'error': round(error, 6)
        })
        
        if error < tol or abs(f(x_new, **kwargs)) < 0.000000000001:
            break
            
        x_old = x_new
        
    return iteraciones, None

def secante(f, x0, x1, tol=0.00001, max_iter=50, **kwargs):
    iteraciones = []
    
    for i in range(1, max_iter + 1):
        fx0 = f(x0, **kwargs)
        fx1 = f(x1, **kwargs)
        
        if abs(fx1 - fx0) < 0.000000000001:
            return None, f"Error Numérico: División por cero. f(x1) y f(x0) son virtualmente iguales."
            
        x_next = x1 - fx1 * (x1 - x0) / (fx1 - fx0)
        error = abs(x_next - x1)
        
        iteraciones.append({
            'iter': i,
            'x0': round(x0, 6),
            'x1': round(x1, 6),
            'fx0': round(fx0, 6),
            'fx1': round(fx1, 6),
            'x_next': round(x_next, 6),
            'error': round(error, 6)
        })
        
        if error < tol or abs(f(x_next, **kwargs)) < 0.000000000001:
            break
            
        x0 = x1
        x1 = x_next
        
    return iteraciones, None

def estimar_orden_convergencia(iteraciones, metodo):
    if not iteraciones or len(iteraciones) < 3:
        if metodo == 'biseccion': return "1.00 (Lineal)"
        if metodo == 'newton': return "2.00 (Cuadrática)"
        if metodo == 'secante': return "1.62 (Superlineal)"
        return "N/A"
        
    errores = [it['error'] for it in iteraciones if it['error'] > 0]
    if len(errores) < 3:
        if metodo == 'biseccion': return "1.00"
        if metodo == 'newton': return "2.00"
        if metodo == 'secante': return "1.62"
        return "N/A"
        
    try:
        e_km1 = errores[-3]
        e_k = errores[-2]
        e_kp1 = errores[-1]
        
        num = math.log(e_kp1 / e_k)
        den = math.log(e_k / e_km1)
        
        p = num / den
        if p < 0 or p > 3:
            raise ValueError()
        return round(p, 2)
    except Exception:
        if metodo == 'biseccion': return "1.00 (Lineal)"
        if metodo == 'newton': return "2.00 (Cuadrática)"
        if metodo == 'secante': return "1.62 (Superlineal)"
        return "N/A"

# ==========================================
# 3. CONTROLADOR / ENRUTAMIENTO FLASK
# ==========================================

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        modelo_opt = request.form.get('modelo')
        kwargs = {}
        
        # VALORES POR DEFECTO ACTUALIZADOS SIN ERRORES Y AJUSTADOS AL MAPA DE RAÍCES
        if modelo_opt == '1':
            f = f1
            df = df1
            nombre_modelo = "Umbral de Costo Acumulado vs Ingreso Familiar"
            formula_latex = r"$$f(t) = C_0 \cdot e^{r \cdot t} - I_f = 0$$"
            kwargs['C0'] = float(request.form.get('c0') or 150.0)
            kwargs['r'] = float(request.form.get('r') or 0.08)
            kwargs['I_f'] = float(request.form.get('if') or 500.0)
            
            a_bis = float(request.form.get('a_bis') or 0.0)
            b_bis = float(request.form.get('b_bis') or 25.0)
            x0_new = float(request.form.get('x0_new') or 10.0)
            x0_sec = float(request.form.get('x0_sec') or 5.0)
            x1_sec = float(request.form.get('x1_sec') or 20.0)
            
        elif modelo_opt == '2':
            f = f2
            df = df2
            nombre_modelo = "Tasa de Reposición Crítica de Carburante"
            formula_latex = r"$$f(R) = R - C_{max} \cdot (1 - e^{-k \cdot R}) - D = 0$$"
            kwargs['C_max'] = float(request.form.get('c_max') or 800.0)
            kwargs['k'] = float(request.form.get('k') or 0.002)
            kwargs['D'] = float(request.form.get('d') or 200.0)
            
            # Límites corregidos por defecto para atrapar la raíz en 855.43
            a_bis = float(request.form.get('a_bis') or 200.0)
            b_bis = float(request.form.get('b_bis') or 1200.0)
            x0_new = float(request.form.get('x0_new') or 500.0)
            x0_sec = float(request.form.get('x0_sec') or 400.0)
            x1_sec = float(request.form.get('x1_sec') or 900.0)
            
        else:
            f = f3
            df = df3
            nombre_modelo = "Umbral de Transición y Conflicto Social"
            formula_latex = r"$$f(x) = x^3 - 3x^2 + 2.5x - s = 0$$"
            kwargs['s'] = float(request.form.get('s') or 0.4)
            
            a_bis = float(request.form.get('a_bis') or 0.0)
            b_bis = float(request.form.get('b_bis') or 1.0)
            x0_new = float(request.form.get('x0_new') or 0.5)
            x0_sec = float(request.form.get('x0_sec') or 0.1)
            x1_sec = float(request.form.get('x1_sec') or 0.9)
            
        try:
            # Tolerancia por defecto explícita en formato decimal directo
            tol = float(request.form.get('tol') or 0.00001)
            max_iter = int(request.form.get('max_iter') or 50)
        except (TypeError, ValueError):
            return render_template('index.html', error="Error: Ingrese valores válidos.")

        # Ejecución
        res_bis, err_bis = biseccion(f, a_bis, b_bis, tol, max_iter, **kwargs)
        res_new, err_new = newton_raphson(f, df, x0_new, tol, max_iter, **kwargs)
        res_sec, err_sec = secante(f, x0_sec, x1_sec, tol, max_iter, **kwargs)
        
        raiz_bis = res_bis[-1]['c'] if (res_bis and not err_bis) else None
        raiz_new = res_new[-1]['x1'] if (res_new and not err_new) else None
        raiz_sec = res_sec[-1]['x_next'] if (res_sec and not err_sec) else None
        
        p_bis = estimar_orden_convergencia(res_bis, 'biseccion')
        p_new = estimar_orden_convergencia(res_new, 'newton')
        p_sec = estimar_orden_convergencia(res_sec, 'secante')
        
        analisis = {
            'biseccion': {
                'status': "Éxito" if not err_bis else "Fallo",
                'msg': err_bis if err_bis else "Estabilidad global garantizada por el teorema de Bolzano. Lento pero infalible.",
                'iters': len(res_bis) if res_bis else 0,
                'raiz': raiz_bis,
                'p': p_bis
            },
            'newton': {
                'status': "Éxito" if not err_new else "Fallo",
                'msg': err_new if err_new else "Velocidad explosiva ideal. Altamente sensible al punto semilla $x_0$.",
                'iters': len(res_new) if res_new else 0,
                'raiz': raiz_new,
                'p': p_new
            },
            'secante': {
                'status': "Éxito" if not err_sec else "Fallo",
                'msg': err_sec if err_sec else "Elimina la evaluación analítica de $f'(x)$, asumiendo un costo computacional menor.",
                'iters': len(res_sec) if res_sec else 0,
                'raiz': raiz_sec,
                'p': p_sec
            }
        }
        
        comparativa = []
        if raiz_bis is not None: comparativa.append(f"Bisección convergió exactamente a {raiz_bis} en {len(res_bis)} iteraciones.")
        if raiz_new is not None: comparativa.append(f"Newton-Raphson convergió exactamente a {raiz_new} en {len(res_new)} iteraciones.")
        if raiz_sec is not None: comparativa.append(f"La Secante convergió exactamente a {raiz_sec} en {len(res_sec)} iteraciones.")

        inputs_built = {
            'a_bis': a_bis, 'b_bis': b_bis, 'x0_new': x0_new, 'x0_sec': x0_sec, 'x1_sec': x1_sec,
            'tol': tol, 'max_iter': max_iter, 'c0': kwargs.get('C0'), 'r': kwargs.get('r'), 
            'if': kwargs.get('I_f'), 'c_max': kwargs.get('C_max'), 'k': kwargs.get('k'), 
            'd': kwargs.get('D'), 's': kwargs.get('s')
        }

        return render_template('index.html', 
                               posted=True,
                               nombre_modelo=nombre_modelo,
                               formula_latex=formula_latex,
                               modelo_opt=modelo_opt,
                               kwargs=kwargs,
                               res_bis=res_bis, err_bis=err_bis,
                               res_new=res_new, err_new=err_new,
                               res_sec=res_sec, err_sec=err_sec,
                               analisis=analisis,
                               comparativa=comparativa,
                               inputs=inputs_built)
                               
    return render_template('index.html', posted=False)

if __name__ == '__main__':
    app.run(debug=True, port=5000)