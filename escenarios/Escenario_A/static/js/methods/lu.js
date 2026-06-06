const LU_Definition = {
    formula: `$$A = L \\cdot U \\implies L \\cdot y = b \\quad \\text{y} \\quad U \\cdot x = y$$`,
    code: `function solveLU(A, b) {
    let n = A.length;
    let L = Array.from({length: n}, (_, i) => Array(n).fill(i === j ? 1 : 0));
    let U = Array.from({length: n}, () => Array(n).fill(0));
    
    // Descomposición Doolittle
    for (let i = 0; i < n; i++) {
        for (let k = i; k < n; k++) {
            let sum = 0; for (let j = 0; j < i; j++) sum += L[i][j] * U[j][k];
            U[i][k] = A[i][k] - sum;
        }
        for (let k = i + 1; k < n; k++) {
            let sum = 0; for (let j = 0; j < i; j++) sum += L[k][j] * U[j][i];
            L[k][i] = (A[k][i] - sum) / U[i][i];
        }
    }
    // Sustitución hacia adelante (Ly = b) y hacia atrás (Ux = y)
    // Retorna { solucion, L, U }
}`
};