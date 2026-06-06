# numerical/model_builder.py

def construir_sistema_logistico(plantas, demandas, costos, rutas):
    """
    Construye dinámicamente la matriz A y el vector b a partir de datos operativos reales.
    
    Estructura de entrada esperada (diccionarios):
    - plantas: {"P1": 120, "P2": 100, "P3": 80}
    - demandas: {"Norte": 90, "Centro": 110, "Sur": 100}
    - costos: {"P1": {"Norte": 4, "Centro": 6, ...}, ...}
    - rutas: {"P1": {"Norte": 1.0, "Centro": 1.0, ...}, ...}
    """
    
    # Matriz base recomendada para asegurar estabilidad y dominancia diagonal estándar
    # A = [[40, 10, 5], [8, 30, 6], [4, 5, 25]]
    # b = [1200, 900, 700]
    
    # Extraer variables con valores de respaldo (fallbacks) por seguridad
    c_p1 = plantas.get("P1", 120)
    c_p2 = plantas.get("P2", 100)
    c_p3 = plantas.get("P3", 80)
    
    d_norte = demandas.get("Norte", 90)
    d_centro = demandas.get("Centro", 110)
    d_sur = demandas.get("Sur", 100)
    
    # Calcular promedios de estado de rutas por cada zona de destino
    factor_norte = (rutas["P1"]["Norte"] + rutas["P2"]["Norte"] + rutas["P3"]["Norte"]) / 3.0
    factor_centro = (rutas["P1"]["Centro"] + rutas["P2"]["Centro"] + rutas["P3"]["Centro"]) / 3.0
    factor_sur = (rutas["P1"]["Sur"] + rutas["P2"]["Sur"] + rutas["P3"]["Sur"]) / 3.0
    
    # --- CONSTRUCCIÓN DE LA MATRIZ A ---
    # El coeficiente diagonal (capacidad de auto-abastecimiento eficiente de la zona) 
    # se ve directamente afectado si las rutas principales hacia ella sufren bloqueos.
    A = [
        [40.0 * factor_norte,  10.0,                  5.0],
        [8.0,                  30.0 * factor_centro,  6.0],
        [4.0,                  5.0,                   25.0 * factor_sur]
    ]
    
    # --- CONSTRUCCIÓN DEL VECTOR b ---
    # Representa la carga logística total requerida, indexada por la demanda de la zona
    # y balanceada por la capacidad disponible en las plantas de origen.
    b = [
        float(d_norte * 10 + (c_p1 + c_p2 - c_p3)),
        float(d_centro * 5 + (c_p1 + c_p2 + c_p3)),
        float(d_sur * 4 + (c_p2 + c_p3))
    ]
    
    return A, b

def generar_interpretacion_logistica(solucion, demandas, condicion_estado):
    """Genera un análisis textual detallado del estado de la red de distribución."""
    zonas = ["Norte", "Centro", "Sur"]
    texto = "### ANÁLISIS E INTERPRETACIÓN OPERATIVA\n\n"
    
    # Interpretación del volumen físico
    for i, zona in enumerate(zonas):
        litros_reales = solucion[i] * 1000
        demanda_original = demandas.get(zona, 100) * 1000
        deficit = demanda_original - litros_reales
        
        texto += f"- **Zona {zona}:** Se han asignado {litros_reales:,.2f} litros. "
        if deficit > 0:
            texto += f"⚠️ Presenta un **déficit de {deficit:,.2f} litros** respecto a su demanda original.\n"
        else:
            texto += f"✅ Demanda completamente satisfecha (Superávit de {abs(deficit):,.2f} litros).\n"
            
    # Diagnóstico de resiliencia del sistema técnico
    texto += f"\n### ESTABILIDAD DE LA RED\n"
    if condicion_estado == "Excelente" or condicion_estado == "Buena":
        texto += "🟢 La red de transporte es **estable**. Pequeñas variaciones en los bloqueos o demandas no provocarán un colapso en los planes de asignación energética."
    elif condicion_estado == "Sensible":
        texto += "🟡 La red se encuentra en un estado **sensible**. Cambios imprevistos en las rutas de acceso podrían alterar drásticamente las soluciones calculadas."
    else:
        texto += "🔴 **Alerta Logística:** El sistema está mal condicionado. La combinación de bloqueos actuales impide un cálculo de distribución confiable sin reestructurar las rutas prioritarias."
        
    return texto