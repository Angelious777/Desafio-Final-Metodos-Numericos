/**
 * main.js - Motor de Gestión de Interfaz
 * Maneja la lógica de ventanas, estados y limpieza de recursos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Gestión de Ventanas (Cerrar/Minimizar/Efecto Retro)
    const setupWindowControls = () => {
        const windows = document.querySelectorAll('.retro-window');
        
        windows.forEach(win => {
            const closeBtn = win.querySelector('.window-controls button:last-child');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    win.style.transition = 'all 0.3s ease';
                    win.style.opacity = '0';
                    win.style.transform = 'scale(0.95)';
                    
                    // Ocultar después de la animación
                    setTimeout(() => {
                        win.style.display = 'none';
                    }, 300);
                });
            }
        });
    };

    // 2. Sistema de Drag & Drop para ventanas (Opcional pero recomendado en interfaces retro)
    const enableDraggableWindows = () => {
        const headers = document.querySelectorAll('.window-header');
        headers.forEach(header => {
            header.addEventListener('mousedown', (e) => {
                const win = e.target.closest('.retro-window');
                let shiftX = e.clientX - win.getBoundingClientRect().left;
                let shiftY = e.clientY - win.getBoundingClientRect().top;

                function moveAt(pageX, pageY) {
                    win.style.left = pageX - shiftX + 'px';
                    win.style.top = pageY - shiftY + 'px';
                }

                function onMouseMove(event) {
                    moveAt(event.pageX, event.pageY);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.onmouseup = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.onmouseup = null;
                };
            });
        });
    };

    // 3. Inicializador del sistema
    setupWindowControls();
    enableDraggableWindows();

    // 4. Listener para evitar que los gráficos se desborden al redimensionar la ventana
    window.addEventListener('resize', () => {
        if (typeof chartPreciosInstance !== 'undefined' && chartPreciosInstance) {
            chartPreciosInstance.resize();
        }
    });

    console.log("Sistema de interfaz retro inicializado correctamente.");
});