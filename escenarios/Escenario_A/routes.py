# app.py
from flask import Blueprint, render_template, request, jsonify

# Importar motores matemáticos puros
from escenarios.Escenario_A.numerical.helpers import verificar_dominancia, calcular_condicion
from escenarios.Escenario_A.numerical.model_builder import construir_sistema_logistico, generar_interpretacion_logistica
from escenarios.Escenario_A.numerical.jacobi import jacobi
from escenarios.Escenario_A.numerical.gauss_seidel import gauss_seidel
from escenarios.Escenario_A.numerical.sor import sor
from escenarios.Escenario_A.numerical.lu import lu
from escenarios.Escenario_A.numerical.gradiente_conjugado import gradiente_conjugado

escenario_A_bp = Blueprint(
    'escenario_A',
    __name__,
    template_folder='templates',
    static_folder='static'
)

escenario_A_bp = Blueprint('escenario_A_bp', __name__, url_prefix='/Escenario_A')

@escenario_A_bp.route("/") # Esto hace que la ruta final sea /Escenario_A/
def inicio():
    return render_template("escenario_a.html")

@escenario_A_bp.route("/resolver", methods=["POST"])
def resolver():
    try:
        datos = request.get_json()
        
        # 1. Recuperar variables del formulario del simulador
        plantas = datos.get("plantas")
        demandas = datos.get("demandas")
        costos = datos.get("costos")
        rutas = datos.get("rutas")
        
        metodo = datos.get("metodo", "jacobi").lower()
        
        # Parámetros adicionales de control numérico
        tol = float(datos.get("tolerancia", 1e-6))
        max_iter = int(datos.get("max_iteraciones", 100))
        omega = float(datos.get("omega", 1.1)) # Exclusivo de SOR

        # 2. Construcción automatizada del modelo matemático (Sin caja negra)
        A, b = construir_sistema_logistico(plantas, demandas, costos, rutas)
        
        # 3. Diagnóstico estructural de las matrices generadas
        es_dominante, detalles_dominancia = verificar_dominancia(A)
        valor_condicion = calcular_condicion(A)
        
        # Clasificación del número de condición de acuerdo a la tabla analítica
        if valor_condicion < 10:
            estado_condicion = "Excelente"
        elif 10 <= valor_condicion < 100:
            estado_condicion = "Buena"
        elif 100 <= valor_condicion < 1000:
            estado_condicion = "Sensible"
        else:
            estado_condicion = "Mal condicionada"

        # 4. Conmutador dinámico de ejecución de algoritmos numéricos
        resultado = {}
        if metodo == "jacobi":
            resultado = jacobi(A, b, tol, max_iter)
        elif metodo == "gauss_seidel":
            resultado = gauss_seidel(A, b, tol, max_iter)
        elif metodo == "sor":
            resultado = sor(A, b, omega, tol, max_iter)
        elif metodo == "lu":
            resultado = lu(A, b)
        elif metodo == "gradiente_conjugado":
            resultado = gradiente_conjugado(A, b, tol, max_iter)
        else:
            return jsonify({"status": "error", "message": "Método de resolución no reconocido."}), 400

        # Verificar si ocurrió un error controlado dentro del algoritmo matemático
        if "error" in resultado:
            return jsonify({"status": "error", "message": resultado["error"]}), 422

        # 5. Post-procesamiento: Traducir variables a magnitudes reales (Litros)
        solucion_matematica = resultado["solucion"]
        unidades_reales = {
            "Zona_Norte": solucion_matematica[0] * 1000,
            "Zona_Centro": solucion_matematica[1] * 1000,
            "Zona_Sur": solucion_matematica[2] * 1000
        }
        
        # 6. Generar reporte interpretativo escrito
        texto_interpretacion = generar_interpretacion_logistica(solucion_matematica, demandas, estado_condicion)

        # 7. Empaquetar respuesta JSON estructurada unificada
        respuesta_json = {
            "status": "success",
            "matriz_generada_A": A,
            "vector_generado_b": b,
            "solucion": solucion_matematica,
            "unidades_reales": unidades_reales,
            "iteraciones_realizadas": resultado["iteraciones"],
            "error_residual_final": resultado["error_final"],
            "historial_errores": resultado["historial_errores"],
            "convergio": resultado["convergio"],
            "diagnosticos": {
                "dominancia_diagonal": {
                    "es_dominante": es_dominante,
                    "detalles": detalles_dominancia
                },
                "numero_condicion": {
                    "valor": valor_condicion if valor_condicion != float('inf') else "Infinito (Matriz Singular)",
                    "estado": estado_condicion
                }
            },
            "interpretacion_expert": texto_interpretacion
        }
        
        return jsonify(respuesta_json)

    except Exception as e:
        return jsonify({"status": "error", "message": f"Fallo en procesamiento de datos: {str(e)}"}), 500

