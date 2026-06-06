from flask import Blueprint, render_template, request, jsonify
import json
from numerical.validator import validar_datos
from numerical.trapecio import aplicar_trapecio
from numerical.simpson13 import aplicar_simpson13
from numerical.simpson38 import aplicar_simpson38
from numerical.economic_analysis import (
    calcular_gasto_sin_inflacion, 
    calcular_perdida_poder_adquisitivo, 
    evaluar_impacto_productos
)

escenario_D_bp = Blueprint(
    'escenario_D',
    __name__,
    template_folder='templates',
    static_folder='static'
)

@escenario_D_bp.route('/')
def index():
    return render_template('index.html')

@escenario_D_bp.route('/api/calcular_gasto', methods=['POST'])
def calcular_gasto():
    try:
        data = request.get_json()
        metodo = data.get('metodo', 'trapecio')
        dias = data.get('dias', [])
        precios = data.get('precios', [])
        producto_nombre = data.get('producto', 'Canasta Básica')
        
        validar_datos(dias, precios)
        
        # 1. Ejecutar TODOS los métodos para la tabla comparativa del reporte
        res_trap = aplicar_trapecio(dias, precios)
        res_s13 = aplicar_simpson13(dias, precios)
        res_s38 = aplicar_simpson38(dias, precios)
        
        # 2. Seleccionar el detalle del método principal solicitado
        if metodo == 'simpson13':
            resultado_principal = res_s13
        elif metodo == 'simpson38':
            resultado_principal = res_s38
        else:
            resultado_principal = res_trap
            
        gasto_real = resultado_principal['area_total']
        
        # 3. Indicadores económicos
        dias_totales = dias[-1] - dias[0]
        precio_inicial = precios[0]
        gasto_sin_inflacion = calcular_gasto_sin_inflacion(precio_inicial, dias_totales)
        perdida = calcular_perdida_poder_adquisitivo(gasto_real, gasto_sin_inflacion)
        
        # 4. Respuesta estructurada para el visualizador
        respuesta = {
            "status": "success",
            "dias": dias,
            "producto": producto_nombre,
            "metodo_usado": metodo,
            "gasto_real": gasto_real,
            "gasto_sin_inflacion": round(gasto_sin_inflacion, 2),
            "perdida_adquisitiva": round(perdida, 2),
            "detalle_calculo": resultado_principal.get('detalle', []),
            "latex": {
                "general": resultado_principal.get('formula_latex', ''),
                "sustitucion": resultado_principal.get('sustitucion_latex', '')
            },
            "comparativa": {
                "trapecio": res_trap['area_total'],
                "simpson13": res_s13['area_total'],
                "simpson38": res_s38['area_total']
            }
        }
        
        return jsonify(respuesta)
        
    except ValueError as ve:
        return jsonify({"status": "error", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error en cálculo: {str(e)}"}), 500

@escenario_D_bp.route('/api/analisis_completo', methods=['GET'])
def analisis_completo():
    try:
        # Carga el JSON de tus productos para el análisis global
        with open('data/sample_data.json', 'r') as file:
            datos_completos = json.load(file)
            
        dias = datos_completos.get('dias', [])
        analisis = evaluar_impacto_productos(datos_completos, dias)
        
        return jsonify({
            "status": "success",
            "analisis": analisis
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500