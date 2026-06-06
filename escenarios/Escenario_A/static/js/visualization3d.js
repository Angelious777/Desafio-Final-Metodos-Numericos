/**
 * visualization3d.js
 * Motor de renderizado para sistemas de ecuaciones lineales 3D
 * Utiliza Three.js para la intersección de planos (Ax = b)
 */

let scene, camera, renderer, arrowHelper, controls;
let vectorGroup, planesGroup, pointGroup;
let intersectionRing = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let puntoSolucionMesh = null;
let tooltipElement = null;
let datosSolucionActual = [0, 0, 0];
let etiquetasZonasActuales = ["Zona 1", "Zona 2", "Zona 3"];

const Visualization3DManager = {
    init: function() {
        const container = document.getElementById('canvas-three-container');
        if(!container) return;

        // 1. Tooltip HTML
        if (!document.getElementById('3d-tooltip')) {
            tooltipElement = document.createElement('div');
            tooltipElement.id = '3d-tooltip';
            tooltipElement.style.cssText = 'position:absolute; display:none; background:rgba(251, 251, 249, 0.95); color:#1e3a1e; padding:8px 12px; border:1px solid #b0b5b0; border-radius:4px; font-family:monospace; font-size:11px; pointer-events:none; box-shadow:0px 2px 8px rgba(0,0,0,0.1); z-index:1000;';
            container.appendChild(tooltipElement);
        } else {
            tooltipElement = document.getElementById('3d-tooltip');
        }

        // 2. Escena, Cámara y Render
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf4f4ee); 
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(16, 14, 16);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        // Insertar el canvas WebGL detrás del canvas 2D si existe
        const overlay2D = container.querySelector('#canvas-2d-network');
        if (overlay2D) container.insertBefore(renderer.domElement, overlay2D);
        else container.appendChild(renderer.domElement);

        // 3. Controles
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 2, 0);

        // 4. Guías
        scene.add(new THREE.GridHelper(20, 20, 0xb0b5b0, 0xd8ded8));
        scene.add(new THREE.AxesHelper(10));

        // 5. Grupos
        vectorGroup = new THREE.Group();
        planesGroup = new THREE.Group();
        pointGroup = new THREE.Group();
        scene.add(vectorGroup, planesGroup, pointGroup);

        // 6. Luces
        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(15, 25, 15);
        scene.add(dirLight);

        container.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        window.addEventListener('resize', () => this.resize(), false);
        
        this.animate();
    },

    animate: function() {
        requestAnimationFrame(() => this.animate());
        if (controls) controls.update();
        if (renderer) renderer.render(scene, camera);
    },

    resize: function() {
        const container = document.getElementById('canvas-three-container');
        if (!container || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    },

    updateVisualSystem: function(matrixA, vectorB, solucion, etiquetas, capacidades, restricciones) {
        if (!scene) this.init();
        
        // Calcular solución (robusta) y decidir qué usar
        const computed = solve3x3(matrixA, vectorB);
        const usedSolution = (computed && computed.length === 3) ? computed : (solucion || [0,0,0]);
        datosSolucionActual = usedSolution;
        etiquetasZonasActuales = etiquetas || etiquetasZonasActuales;

        // Limpieza de objetos anteriores (limpiar los grupos completos)
        this.clearGroup(planesGroup);
        this.clearGroup(vectorGroup);
        this.clearGroup(pointGroup);
        arrowHelper = null; puntoSolucionMesh = null; intersectionRing = null;

        // Escala de escena: mapear magnitudes reales a unidades de visualización
        const maxComp = Math.max(1, Math.abs(usedSolution[0]||0), Math.abs(usedSolution[1]||0), Math.abs(usedSolution[2]||0), Math.abs(vectorB[0]||0), Math.abs(vectorB[1]||0), Math.abs(vectorB[2]||0));
        const sceneScale = 4.0 / maxComp; // componente máximo ~4 unidades

        // --- Dibujar Planos correctamente posicionados según A·X = b ---
        for (let i = 0; i < 3; i++) {
            const n = new THREE.Vector3(matrixA[i][0], matrixA[i][1], matrixA[i][2]);
            const len = n.length();
            if (len < 1e-9) continue;
            const nu = n.clone().normalize();

            // b también debe escalarse al espacio de la escena
            const b = (vectorB[i] || 0) * sceneScale;
            const distancia = b / len;

            const planeSize = Math.max(8, 12 * sceneScale);
            const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
            const planeMat = new THREE.MeshPhongMaterial({ color: 0xa9b8a2, side: THREE.DoubleSide, transparent: true, opacity: 0.35, depthWrite: false });

            const mesh = new THREE.Mesh(planeGeo, planeMat);
            // Orientar la normal del plano
            const up = new THREE.Vector3(0,0,1);
            if (Math.abs(nu.dot(up)) < 0.999) mesh.quaternion.setFromUnitVectors(up, nu);
            else mesh.rotateX(Math.PI/2);

            mesh.position.copy(nu.clone().multiplyScalar(distancia));
            planesGroup.add(mesh);
        }

        // --- Dibujar punto solución en coordenadas de escena ---
        const sx = (usedSolution[0] || 0) * sceneScale;
        const sy = (usedSolution[1] || 0) * sceneScale;
        const sz = (usedSolution[2] || 0) * sceneScale;
        const scenePoint = new THREE.Vector3(sx, sy, sz);

        // Esfera solución
        const radius = Math.max(0.12, 0.6 * sceneScale);
        puntoSolucionMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 18), new THREE.MeshPhongMaterial({ color: 0x2b4c37, emissive:0x112211 }));
        puntoSolucionMesh.position.copy(scenePoint);
        pointGroup.add(puntoSolucionMesh);

        // Flecha desde origen hasta la solución
        const dir = scenePoint.clone();
        const distToPoint = Math.max(0.0001, dir.length());
        dir.normalize();
        arrowHelper = new THREE.ArrowHelper(dir, new THREE.Vector3(0,0,0), distToPoint, 0x1e3a1e, Math.max(0.3, 0.15*distToPoint), Math.max(0.15, 0.07*distToPoint));
        vectorGroup.add(arrowHelper);

        // --- Anillo de intersección en el punto (orientado por la media de normales) ---
        try {
            const ringRadius = Math.max(0.2, 0.9 * sceneScale);
            const ringGeo = new THREE.RingGeometry(ringRadius * 0.8, ringRadius, 48);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
            intersectionRing = new THREE.Mesh(ringGeo, ringMat);

            let avg = new THREE.Vector3(0,0,0);
            for (let i=0;i<3;i++) avg.add(new THREE.Vector3(matrixA[i][0], matrixA[i][1], matrixA[i][2]));
            if (avg.length() < 1e-6) avg = new THREE.Vector3(0,0,1);
            avg.normalize();
            const up = new THREE.Vector3(0,0,1);
            if (Math.abs(avg.dot(up)) < 0.999) intersectionRing.quaternion.setFromUnitVectors(up, avg);
            else intersectionRing.rotateX(Math.PI/2);

            intersectionRing.position.copy(scenePoint);
            pointGroup.add(intersectionRing);
        } catch (e) {
            console.warn('Ring creation failed', e);
        }
    },

    clearGroup: function(group) {
        while(group.children.length > 0){
            const obj = group.children[0];
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            group.remove(obj);
        }
    },

    onMouseMove: function(event) {
        const container = document.getElementById('canvas-three-container');
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(puntoSolucionMesh || new THREE.Object3D());

        if (intersects.length > 0) {
            tooltipElement.style.display = 'block';
            tooltipElement.style.left = (event.clientX - rect.left + 15) + 'px';
            tooltipElement.style.top = (event.clientY - rect.top + 15) + 'px';
            tooltipElement.innerHTML = `<strong>FLUJOS:</strong><br>Norte: ${Number(datosSolucionActual[0]).toFixed(2)}<br>Centro: ${Number(datosSolucionActual[1]).toFixed(2)}<br>Sur: ${Number(datosSolucionActual[2]).toFixed(2)}`;
        } else {
            tooltipElement.style.display = 'none';
        }
    }
};

// --- UTIL: solucionador 3x3 (retorna null si singular) ---
function solve3x3(A, b) {
    try {
        const a00 = A[0][0], a01 = A[0][1], a02 = A[0][2];
        const a10 = A[1][0], a11 = A[1][1], a12 = A[1][2];
        const a20 = A[2][0], a21 = A[2][1], a22 = A[2][2];

        const det = a00*(a11*a22 - a12*a21) - a01*(a10*a22 - a12*a20) + a02*(a10*a21 - a11*a20);
        if (Math.abs(det) < 1e-12) return null;

        const invDet = 1.0 / det;
        const c00 =  (a11*a22 - a12*a21) * invDet;
        const c01 = -(a01*a22 - a02*a21) * invDet;
        const c02 =  (a01*a12 - a02*a11) * invDet;

        const c10 = -(a10*a22 - a12*a20) * invDet;
        const c11 =  (a00*a22 - a02*a20) * invDet;
        const c12 = -(a00*a12 - a02*a10) * invDet;

        const c20 =  (a10*a21 - a11*a20) * invDet;
        const c21 = -(a00*a21 - a01*a20) * invDet;
        const c22 =  (a00*a11 - a01*a10) * invDet;

        const x0 = c00*b[0] + c01*b[1] + c02*b[2];
        const x1 = c10*b[0] + c11*b[1] + c12*b[2];
        const x2 = c20*b[0] + c21*b[1] + c22*b[2];
        return [x0, x1, x2];
    } catch (e) {
        return null;
    }
}