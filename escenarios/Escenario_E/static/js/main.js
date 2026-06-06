// static/js/main.js
function toggleModelParams() {
    var seleccion = document.getElementById('modelo').value;
    
    // Ocultar todos los paneles de variables exógenas
    document.getElementById('params-modelo-1').style.display = 'none';
    document.getElementById('params-modelo-2').style.display = 'none';
    document.getElementById('params-modelo-3').style.display = 'none';
    
    // Revelar el panel activo
    document.getElementById('params-modelo-' + seleccion).style.display = 'block';
    
    // Inyección dinámica de aproximaciones iniciales recomendadas según la naturaleza de la función
    if (seleccion === '1') {
        document.getElementById('a_bis').value = '0';
        document.getElementById('b_bis').value = '25';
        document.getElementById('x0_new').value = '5';
        document.getElementById('x0_sec').value = '0';
        document.getElementById('x1_sec').value = '5';
    } else if (seleccion === '2') {
        document.getElementById('a_bis').value = '100';
        document.getElementById('b_bis').value = '1000';
        document.getElementById('x0_new').value = '300';
        document.getElementById('x0_sec').value = '200';
        document.getElementById('x1_sec').value = '400';
    } else if (seleccion === '3') {
        document.getElementById('a_bis').value = '0';
        document.getElementById('b_bis').value = '3';
        document.getElementById('x0_new').value = '0.5';
        document.getElementById('x0_sec').value = '0';
        document.getElementById('x1_sec').value = '1';
    }
}

// Mantener el estado visual correcto tras recargas por peticiones POST
document.addEventListener('DOMContentLoaded', function() {
    var seleccion = document.getElementById('modelo').value;
    if(document.getElementById('params-modelo-' + seleccion)){
        document.getElementById('params-modelo-1').style.display = 'none';
        document.getElementById('params-modelo-2').style.display = 'none';
        document.getElementById('params-modelo-3').style.display = 'none';
        document.getElementById('params-modelo-' + seleccion).style.display = 'block';
    }
});