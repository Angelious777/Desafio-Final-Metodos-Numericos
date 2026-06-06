from flask import Blueprint, render_template, request, jsonify
import numpy as np

escenario_F_bp = Blueprint(
    'escenario_F', 
    __name__, 
    url_prefix='/Escenario_F',
    template_folder='templates',
    static_folder='static'
)

@escenario_F_bp.route("/")
def inicio():
    return render_template("escenario_f.html")

def descomposicion_lu_paso_a_paso(A, b):
    n = len(A)
    L = np.zeros((n, n))
    U = np.zeros((n, n))
    
    for i in range(n):
        L[i][i] = 1.0
        for k in range(i, n):
            suma = sum(L[i][j] * U[j][k] for j in range(i))
            U[i][k] = A[i][k] - suma
        for k in range(i + 1, n):
            suma = sum(L[k][j] * U[j][i] for j in range(i))
            if U[i][i] == 0:
                return None, None, None, None, "Error: División entre cero en la diagonal de U (requiere pivoteo)."
            L[k][i] = (A[k][i] - suma) / U[i][i]

    y = np.zeros(n)
    for i in range(n):
        suma = sum(L[i][j] * y[j] for j in range(i))
        y[i] = b[i] - suma
        
    x = np.zeros(n)
    for i in range(n - 1, -1, -1):
        suma = sum(U[i][j] * x[j] for j in range(i + 1, n))
        x[i] = (y[i] - suma) / U[i][i]
        
    return L, U, y, x, None

@escenario_F_bp.route('/', methods=['GET', 'POST'])         
@escenario_F_bp.route('/escenario_f', methods=['GET', 'POST']) 
def escenario_f_get():
    default_A = [[1.0, 1.0, 1.0], [1.0, 1.005, 0.995], [0.995, 1.0, 1.005]]
    return render_template('escenario_f.html', A=default_A, rumor_porcentaje=0, num_cond=1.0, L=[], U=[], y=[], x=[])

@escenario_F_bp.route('/calcular', methods=['POST'])
def calcular():
    try:
        A = np.array([
            [float(request.form['a00']), float(request.form['a01']), float(request.form['a02'])],
            [float(request.form['a10']), float(request.form['a11']), float(request.form['a12'])],
            [float(request.form['a20']), float(request.form['a21']), float(request.form['a22'])]
        ])
        b_base = np.array([float(request.form['b0']), float(request.form['b1']), float(request.form['b2'])])
        rumor_porcentaje = float(request.form.get('rumor', 0))
        
        b_rumor = b_base * (1 + (rumor_porcentaje / 100.0))
    except ValueError:
        return jsonify({"error": "Por favor, introduce valores numéricos válidos."}), 400

    # 1. Resolver Sistemas mediante LU
    L, U, y_base, x_base, err_msg = descomposicion_lu_paso_a_paso(A, b_base)
    if err_msg:
        return jsonify({"error": err_msg}), 400
        
    _, _, y_rumor, x_rumor, _ = descomposicion_lu_paso_a_paso(A, b_rumor)
        
    # 2. Desglose Teórico del Número de Condición usando la Norma 2 (Espectral)
    norma_A = np.linalg.norm(A, ord=2)
    try:
        A_inv = np.linalg.inv(A)
        norma_A_inv = np.linalg.norm(A_inv, ord=2)
        num_cond = norma_A * norma_A_inv
    except np.linalg.LinAlgError:
        return jsonify({"error": "La matriz A es singular (no invertible). No se puede calcular el número de condición."}), 400
    
    return jsonify({
        "L": [[round(val, 4) for val in row] for row in L.tolist()],
        "U": [[round(val, 4) for val in row] for row in U.tolist()],
        "num_cond": round(num_cond, 2),
        "norma_A": round(norma_A, 4),
        "norma_A_inv": round(norma_A_inv, 4),
        "base": {
            "b": [round(val, 2) for val in b_base.tolist()],
            "y": [round(val, 4) for val in y_base.tolist()],
            "x": [round(val, 4) for val in x_base.tolist()]
        },
        "dinamico": {
            "b": [round(val, 2) for val in b_rumor.tolist()],
            "y": [round(val, 4) for val in y_rumor.tolist()],
            "x": [round(val, 4) for val in x_rumor.tolist()]
        }
    })