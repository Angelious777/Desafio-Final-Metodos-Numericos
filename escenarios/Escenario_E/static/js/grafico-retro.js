/**
 * Motor de renderizado gráfico para la demostración geométrica
 * de Bisección, Newton-Raphson y Secante.
 */
function drawSimulationChart() {
    const canvas = document.getElementById('retroMethodCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Limpiar espacio de dibujo por seguridad en re-renders
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configuración de dimensiones y puntos de origen
    const width = canvas.width;
    const height = canvas.height;
    const originX = 80;
    const originY = 220;
    
    // Función cúbica matemática de prueba para la visualización analítica
    function f(x) {
        let val = x - 4.5;
        return val * val * val - 5 * val + 15;
    }
    
    // Conversores de unidades espaciales a píxeles en pantalla
    const getXPixel = (xVal) => originX + xVal * 55;
    const getYPixel = (yVal) => originY - yVal * 2.5;

    // ==========================================
    // 1. DIBUJO DE EJES CARTESIANOS
    // ==========================================
    ctx.strokeStyle = '#cfcfc6'; // Corresponde a var(--border)
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX - 30, originY); ctx.lineTo(width - 30, originY); // Eje X
    ctx.moveTo(originX, 20); ctx.lineTo(originX, height - 20);          // Eje Y
    ctx.stroke();

    // Señalización de la Raíz Exacta (Alfa)
    const alphaX = 6.45; 
    ctx.fillStyle = '#b52b2b'; // Color euler / danger
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('Raíz (α)', getXPixel(alphaX) - 25, originY + 35);
    
    ctx.beginPath();
    ctx.arc(getXPixel(alphaX), originY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // ==========================================
    // 2. DIBUJO DE LA CURVA f(x)
    // ==========================================
    ctx.strokeStyle = '#44443f'; // Corresponde a var(--text)
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let x = 0.5; x <= 9.5; x += 0.1) {
        let px = getXPixel(x);
        let py = getYPixel(f(x));
        if (first) { 
            ctx.moveTo(px, py); 
            first = false; 
        } else { 
            ctx.lineTo(px, py); 
        }
    }
    ctx.stroke();
    
    ctx.fillStyle = '#44443f';
    ctx.font = 'italic 12px "Tahoma"';
    ctx.fillText('f(x)', width - 60, getYPixel(f(9.5)) - 10);

    // ==========================================
    // 3. CAPA: MÉTODO DE BISECCIÓN (Verde)
    // ==========================================
    const ax = 1.5, bx = 8.5;
    ctx.strokeStyle = '#1e6b36'; // Corresponde a val-rk4
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]); // Líneas discontinuas
    
    // Línea vertical del límite inferior 'a'
    ctx.beginPath(); ctx.moveTo(getXPixel(ax), originY - 40); ctx.lineTo(getXPixel(ax), originY + 40); ctx.stroke();
    ctx.fillStyle = '#1e6b36'; ctx.font = '11px "JetBrains Mono"'; ctx.fillText('a', getXPixel(ax) - 4, originY + 15);
    
    // Línea vertical del límite superior 'b'
    ctx.beginPath(); ctx.moveTo(getXPixel(bx), originY - 40); ctx.lineTo(getXPixel(bx), originY + 40); ctx.stroke();
    ctx.fillText('b', getXPixel(bx) - 4, originY + 15);
    
    // Marcación del punto medio 'c0'
    const cx = (ax + bx) / 2;
    ctx.fillStyle = '#1e6b36'; ctx.beginPath(); ctx.arc(getXPixel(cx), originY, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('c₀', getXPixel(cx) - 6, originY - 10);
    ctx.setLineDash([]); // Restaurar trazo continuo

    // ==========================================
    // 4. CAPA: MÉTODO DE NEWTON-RAPHSON (Azul)
    // ==========================================
    const x0_new = 8.8;
    const fx0_new = f(x0_new);
    const x1_new = 6.9; 
    ctx.strokeStyle = '#00529b'; // Corresponde a val-heun
    ctx.lineWidth = 1.5;
    
    // Evaluar punto semilla sobre la curva f(x0)
    ctx.fillStyle = '#00529b';
    ctx.beginPath(); ctx.arc(getXPixel(x0_new), getYPixel(fx0_new), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillText('f(x₀)', getXPixel(x0_new) + 8, getYPixel(fx0_new));
    
    // Trazo de la recta tangente proyectada al eje X
    ctx.beginPath();
    ctx.moveTo(getXPixel(x0_new), getYPixel(fx0_new));
    ctx.lineTo(getXPixel(x1_new) - 20, originY);
    ctx.stroke();
    ctx.fillText('x₁ (NR)', getXPixel(x1_new) - 15, originY - 10);

    // ==========================================
    // 5. CAPA: MÉTODO DE LA SECANTE (Rojo)
    // ==========================================
    const xs0 = 2.5, xs1 = 7.8;
    const fxs0 = f(xs0), fxs1 = f(xs1);
    ctx.strokeStyle = '#b52b2b'; // Corresponde a val-euler
    ctx.lineWidth = 1.5;
    
    // Intersección de los dos puntos de apoyo de la secante
    ctx.fillStyle = '#b52b2b';
    ctx.beginPath(); ctx.arc(getXPixel(xs0), getYPixel(fxs0), 4, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(getXPixel(xs1), getYPixel(fxs1), 4, 0, 2 * Math.PI); ctx.fill();
    
    // Trazado de la cuerda secante cruzando la función
    ctx.beginPath();
    ctx.moveTo(getXPixel(xs0), getYPixel(fxs0));
    ctx.lineTo(getXPixel(xs1) + 10, getYPixel(fxs1) + 8);
    ctx.stroke();
    ctx.fillText('x₂ (Sec)', getXPixel(6.0), originY + 15);

    // ==========================================
    // 6. CAJA DE LEYENDA TÉCNICA
    // ==========================================
    ctx.fillStyle = '#fafaf6'; // Fondo var(--bg-window)
    ctx.fillRect(width - 210, 25, 190, 85);
    ctx.strokeStyle = '#cfcfc6';
    ctx.strokeRect(width - 210, 25, 190, 85);

    ctx.font = '11px "Tahoma", sans-serif';
    ctx.fillStyle = '#1e6b36'; ctx.fillText('■ Bisección (Intervalos)', width - 195, 45);
    ctx.fillStyle = '#00529b'; ctx.fillText('■ Newton-Raphson (Tangente)', width - 195, 65);
    ctx.fillStyle = '#b52b2b'; ctx.fillText('■ Secante (Cuerda)', width - 195, 85);
}

// Inicializar el renderizado del lienzo una vez construido el DOM
document.addEventListener('DOMContentLoaded', drawSimulationChart);