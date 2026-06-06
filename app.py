from flask import Flask, render_template

app = Flask(__name__)

from escenarios.Escenario_A.routes import escenario_A_bp
from escenarios.Escenario_B.routes import escenario_B_bp
from escenarios.Escenario_C.routes import escenario_C_bp
from escenarios.Escenario_D.routes import escenario_D_bp
from escenarios.Escenario_E.routes import escenario_E_bp
from escenarios.Escenario_F.routes import escenario_F_bp
from escenarios.Escenario_G.routes import escenario_G_bp

app.register_blueprint(
    escenario_A_bp, 
    url_prefix='/escenario_A'
)

app.register_blueprint(
    escenario_B_bp, 
    url_prefix='/escenario_B'
)

app.register_blueprint(
    escenario_C_bp, 
    url_prefix='/escenario_C'
)

app.register_blueprint(
    escenario_D_bp, 
    url_prefix='/escenario_D'
)

app.register_blueprint(
    escenario_E_bp, 
    url_prefix='/escenario_E'
)

app.register_blueprint(
    escenario_F_bp, 
    url_prefix='/escenario_F'
)

app.register_blueprint(
    escenario_G_bp, 
    url_prefix='/escenario_G'
)


# Ruta para la página principal (index.html)
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # El modo debug=True permite ver los cambios en tiempo real sin reiniciar el servidor
    app.run(debug=True, port=5000)