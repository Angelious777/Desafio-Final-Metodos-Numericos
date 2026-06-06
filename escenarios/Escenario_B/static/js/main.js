/**
 * Controla la activación de los campos variables en el formulario
 * según el tipo de escenario seleccionado (Constante o Variable).
 */
function conmutarFlujo() {
    const radioVariable = document.getElementById('flujoVariable');
    if (!radioVariable) return;

    const esVariable = radioVariable.checked;
    
    const inputEntrada = document.getElementById('input_var_entrada');
    const inputConsumo = document.getElementById('input_var_consumo');
    const labelEntrada = document.getElementById('label_var_entrada');
    const labelConsumo = document.getElementById('label_var_consumo');

    if (esVariable) {
        // Habilitar campos y remover estilos opacos
        inputEntrada.disabled = false;
        inputConsumo.disabled = false;
        labelEntrada.classList.remove('text-muted');
        labelConsumo.classList.remove('text-muted');
        
        // Bonus visual: remueve un borde opaco si lo deseas
        inputEntrada.style.borderColor = "var(--border-dark)";
        inputConsumo.style.borderColor = "var(--border-dark)";
    } else {
        // Deshabilitar campos y resetear valores a 0
        inputEntrada.disabled = true;
        inputConsumo.disabled = true;
        inputEntrada.value = 0;
        inputConsumo.value = 0;
        labelEntrada.classList.add('text-muted');
        labelConsumo.classList.add('text-muted');
        
        // Bonus visual: hace que el borde del input acompañe el estado deshabilitado
        inputEntrada.style.borderColor = "var(--border)";
        inputConsumo.style.borderColor = "var(--border)";
    }
}

// Validación rápida antes de enviar el formulario (Evita bucles o valores incoherentes)
document.addEventListener("DOMContentLoaded", function() {
    conmutarFlujo();

    // Opcional: Asegurar que el usuario no envíe un tamaño de paso (h) igual a 0 o negativo
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const hInput = document.querySelector('input[name="h"]');
            if (hInput && parseFloat(hInput.value) <= 0) {
                e.preventDefault();
                alert("El tamaño de paso (h) debe ser un valor mayor que 0 para que la simulación converja.");
            }
        });
    }
});