const GradienteConjugado_Definition = {
    formula: `$$\\alpha_k = \\frac{r_k^T r_k}{p_k^T A p_k}, \\quad x_{k+1} = x_k + \\alpha_k p_k, \\quad r_{k+1} = r_k - \\alpha_k A p_k$$`,
    code: `function solveGradienteConjugado(A, b) {
    // Método iterativo de optimización para matrices simétricas y definidas positivas
    // Inicializa r = b - A*x, p = r
    // En cada iteración calcula el paso óptimo alfa y actualiza la dirección de descenso beta
    // Minimiza el residuo de manera ortogonal en un espacio de Krylov.
}`
};