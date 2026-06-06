/**
 * MOTOR EXPERTO EN MÉTODOS NUMÉRICOS - SISTEMAS DE ECUACIONES LINEALES
 */

// Helper: Calcula la norma infinito de una matriz 3x3
function normInfinity(matrix) {
    let maxRowSum = 0;
    for (let i = 0; i < matrix.length; i++) {
        let rowSum = 0;
        for (let j = 0; j < matrix[i].length; j++) {
            rowSum += Math.abs(matrix[i][j]);
        }
        if (rowSum > maxRowSum) maxRowSum = rowSum;
    }
    return maxRowSum;
}

// Helper: Invierte una matriz 3x3 mediante la regla de Cramer/Adjunta
function invert3x3(A) {
    let det = A[0][0]*(A[1][1]*A[2][2] - A[1][2]*A[2][1]) -
              A[0][1]*(A[1][0]*A[2][2] - A[1][2]*A[2][0]) +
              A[0][2]*(A[1][0]*A[2][1] - A[1][1]*A[2][0]);
              
    if (Math.abs(det) < 1e-12) return null;
    
    let inv = [[0,0,0], [0,0,0], [0,0,0]];
    inv[0][0] = (A[1][1]*A[2][2] - A[1][2]*A[2][1]) / det;
    inv[0][1] = (A[0][2]*A[2][1] - A[0][1]*A[2][2]) / det;
    inv[0][2] = (A[0][1]*A[1][2] - A[0][2]*A[1][1]) / det;
    
    inv[1][0] = (A[1][2]*A[2][0] - A[1][0]*A[2][2]) / det;
    inv[1][1] = (A[0][0]*A[2][2] - A[0][2]*A[2][0]) / det;
    inv[1][2] = (A[0][2]*A[1][0] - A[0][0]*A[1][2]) / det;
    
    inv[2][0] = (A[1][0]*A[2][1] - A[1][1]*A[2][0]) / det;
    inv[2][1] = (A[0][1]*A[2][0] - A[0][0]*A[2][1]) / det;
    inv[2][2] = (A[0][0]*A[1][1] - A[0][1]*A[1][0]) / det;
    
    return inv;
}

// Helper: Calcula el error residual ||Ax - b|| (Norma Euclidiana)
function calculateResidualError(A, x, b) {
    let errorSum = 0;
    for (let i = 0; i < A.length; i++) {
        let rowSum = 0;
        for (let j = 0; j < A[i].length; j++) {
            rowSum += A[i][j] * (x[j] || 0);
        }
        errorSum += Math.pow(rowSum - b[i], 2);
    }
    return Math.sqrt(errorSum);
}

// 1. MÉTODO DIRECTO: Factorización LU (Doolittle)
function solveLU(A, b) {
    let n = A.length;
    let L = [[1,0,0], [0,1,0], [0,0,1]];
    let U = [[0,0,0], [0,0,0], [0,0,0]];
    
    // Descomposición
    for (let i = 0; i < n; i++) {
        for (let k = i; k < n; k++) {
            let sum = 0;
            for (let j = 0; j < i; j++) sum += (L[i][j] * U[j][k]);
            U[i][k] = A[i][k] - sum;
        }
        for (let k = i + 1; k < n; k++) {
            let sum = 0;
            for (let j = 0; j < i; j++) sum += (L[k][j] * U[j][i]);
            L[k][i] = (A[k][i] - sum) / (U[i][i] || 1e-12);
        }
    }
    
    // Sustitución hacia adelante Ly = b
    let y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
        y[i] = b[i] - sum;
    }
    
    // Sustitución hacia atrás Ux = y
    let x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += U[i][j] * x[j];
        x[i] = (y[i] - sum) / (U[i][i] || 1e-12);
    }
    
    return { x, iterations: 1, error: calculateResidualError(A, x, b), L, U };
}

// 2. MÉTODO ITERATIVO: Jacobi
function solveJacobi(A, b, tol, maxIter) {
    let n = A.length;
    let x0 = new Array(n).fill(0);
    let x = new Array(n).fill(0);
    let iter = 0;
    let error = Infinity;
    let history = [];
    
    while (iter < maxIter && error > tol) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (j !== i) sum += A[i][j] * x0[j];
            }
            x[i] = (b[i] - sum) / (A[i][i] || 1e-12);
        }
        error = calculateResidualError(A, x, b);
        iter++;
        history.push({ iter, x: [...x], error });
        x0 = [...x];
    }
    return { x, iterations: iter, error, history };
}

// 3. MÉTODO ITERATIVO: Gauss-Seidel
function solveGaussSeidel(A, b, tol, maxIter) {
    let n = A.length;
    let x = new Array(n).fill(0);
    let iter = 0;
    let error = Infinity;
    let history = [];
    
    while (iter < maxIter && error > tol) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (j !== i) sum += A[i][j] * x[j];
            }
            x[i] = (b[i] - sum) / (A[i][i] || 1e-12);
        }
        error = calculateResidualError(A, x, b);
        iter++;
        history.push({ iter, x: [...x], error });
    }
    return { x, iterations: iter, error, history };
}

// 4. MÉTODO ITERATIVO: SOR (Sobre-Relajación)
function solveSOR(A, b, omega, tol, maxIter) {
    let n = A.length;
    let x = new Array(n).fill(0);
    let iter = 0;
    let error = Infinity;
    let history = [];
    
    while (iter < maxIter && error > tol) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (j !== i) sum += A[i][j] * x[j];
            }
            let x_gs = (b[i] - sum) / (A[i][i] || 1e-12);
            x[i] = (1 - omega) * x[i] + omega * x_gs;
        }
        error = calculateResidualError(A, x, b);
        iter++;
        history.push({ iter, x: [...x], error });
    }
    return { x, iterations: iter, error, history };
}

// 5. OPTIMIZACIÓN: Gradiente Conjugado
function solveConjugateGradient(A, b, tol, maxIter) {
    let n = A.length;
    let x = new Array(n).fill(0);
    let r = [...b]; 
    let p = [...r];
    let iter = 0;
    let error = calculateResidualError(A, x, b);
    let history = [];
    
    while (iter < maxIter && error > tol) {
        let Ap = [0,0,0];
        for(let i=0; i<n; i++) {
            for(let j=0; j<n; j++) Ap[i] += A[i][j] * p[j];
        }
        
        let rTr = r[0]*r[0] + r[1]*r[1] + r[2]*r[2];
        let pAp = p[0]*Ap[0] + p[1]*Ap[1] + p[2]*Ap[2];
        let alpha = rTr / (pAp || 1e-12);
        
        for(let i=0; i<n; i++) x[i] += alpha * p[i];
        
        let r_new = [0,0,0];
        for(let i=0; i<n; i++) r_new[i] = r[i] - alpha * Ap[i];
        
        let r_new_Tr_new = r_new[0]*r_new[0] + r_new[1]*r_new[1] + r_new[2]*r_new[2];
        error = Math.sqrt(r_new_Tr_new);
        iter++;
        history.push({ iter, x: [...x], error });

        if (error < tol) {
            x = x.map(val => isNaN(val) ? 0 : val);
            break;
        }
        
        let beta = r_new_Tr_new / (rTr || 1e-12);
        for(let i=0; i<n; i++) p[i] = r_new[i] + beta * p[i];
        r = [...r_new];
    }
    return { x, iterations: iter, error, history };
}