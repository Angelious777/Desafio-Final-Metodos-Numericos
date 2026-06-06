const Jacobi_Definition = {
    formula: `$$x_i^{(k+1)} = \\frac{1}{A_{ii}} \\left( b_i - \\sum_{j \\neq i} A_{ij} x_j^{(k)} \\right)$$`,
    code: `function solveJacobi(A, b, maxIter=100, tol=1e-6) {
    let n = A.length;
    let x = new Array(n).fill(0);
    let xNew = new Array(n).fill(0);
    
    for (let k = 0; k < maxIter; k++) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (i !== j) sum += A[i][j] * x[j];
            }
            xNew[i] = (b[i] - sum) / A[i][i];
        }
        if (normaDiferencia(xNew, x) < tol) break;
        x = [...xNew];
    }
    return x;
}`
};