// static/js/charts.js

const ChartManager = {
    instance: null, 

    initOrUpdateChart(unidadesReales, demandasOriginales) {
        const canvasEl = document.getElementById('chart-distribucion');
        if (!canvasEl) {
            console.warn("ChartManager: No se encontró el elemento canvas '#chart-distribucion' en el HTML.");
            return;
        }
        
        const ctx = canvasEl.getContext('2d');
        const datosReales = unidadesReales || {};
        const demandas = demandasOriginales || {};

        // Extracción segura asegurando tipos flotantes o numéricos estables
        const asignadoMiles = [
            (parseFloat(datosReales.Zona_Norte) || 0) / 1000,
            (parseFloat(datosReales.Zona_Centro) || 0) / 1000,
            (parseFloat(datosReales.Zona_Sur) || 0) / 1000
        ];

        const demandasMiles = [
            parseFloat(demandas.Norte) || 0,
            parseFloat(demandas.Centro) || 0,
            parseFloat(demandas.Sur) || 0
        ];

        // Destrucción limpia de instancias previas para evitar superposiciones de gráficos
        if (this.instance) {
            this.instance.destroy();
        }

        this.instance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Zona Norte', 'Zona Centro', 'Zona Sur'],
                datasets: [
                    {
                        label: 'Asignación Calculada (Miles Lts)',
                        data: asignadoMiles,
                        backgroundColor: '#a9b8a2', 
                        borderColor: '#93a38c',
                        borderWidth: 1
                    },
                    {
                        label: 'Demanda Requerida (Miles Lts)',
                        data: demandasMiles,
                        backgroundColor: '#d8e1ea', 
                        borderColor: '#b9c8d6',
                        borderWidth: 1,
                        borderDash: [4, 4] 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: { family: 'Tahoma', size: 11 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#efefe9' },
                        title: { display: true, text: 'Volumen Físico (Miles Lts)', font: { weight: 'bold' } }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
};