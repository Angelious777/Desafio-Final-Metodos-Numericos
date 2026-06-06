from flask import Blueprint, render_template, jsonify, request
from escenarios.Escenario_G.simulation.solver import ejecutar_simulacion

escenario_G_bp = Blueprint(
    'escenario_G',
    __name__,
    template_folder='templates',
    static_folder='static'
)


@escenario_G_bp.route('/')
def index():
    return render_template('index.html')

@escenario_G_bp.route('/api/simular', methods=['POST'])
def api_simular():
    data = request.json
    try:
        # Extracción y parsing seguro de datos de entrada desde la UI
        params = {
            'N0': float(data.get('N0', 1000)),
            'M0': float(data.get('M0', 10)),
            'D0': float(data.get('D0', 2)),
            'a': float(data.get('a', 0.001)),
            'b': float(data.get('b', 0.1)),
            'c': float(data.get('c', 0.05)),
            'k': float(data.get('k', 0.02)),
            'r': float(data.get('r', 0.1)),
            't_max': float(data.get('t_max', 50)),
            'h': float(data.get('h', 0.1)),
            'pasos': int(data.get('pasos', 200)),
            'metodo': data.get('metodo', 'rk4')
        }
        
        resultados = ejecutar_simulacion(params)
        return jsonify({"status": "success", "data": resultados})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
