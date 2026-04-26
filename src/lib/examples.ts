export function getCoxeterMatrix(symbol: number[]): number[][] {
    const N = symbol.length + 1;
    const M = Array(N).fill(0).map(() => Array(N).fill(2));
    for (let i = 0; i < N; i++) {
        M[i][i] = 1;
        if (i < N - 1) {
            M[i][i + 1] = symbol[i];
            M[i + 1][i] = symbol[i];
        }
    }
    return M;
}

export const EXAMPLES = [
    { name: "2D: Order-7 Triangular {3, 7}", symbol: [3, 7], depth: 6 },
    { name: "2D: Order-6 Pentagonal {5, 6}", symbol: [5, 6], depth: 5 },
    { name: "2D: Order-∞ Triangular {3, ∞}", symbol: [3, Infinity], depth: 6 },
    { name: "3D: Order-5 Cubic {4, 3, 5}", symbol: [4, 3, 5], depth: 5 },
    { name: "3D: Order-4 Dodecahedral {5, 3, 4}", symbol: [5, 3, 4], depth: 5 },
    { name: "3D: Order-5 Dodecahedral {5, 3, 5}", symbol: [5, 3, 5], depth: 4 },
    { name: "3D: Order-5 Tetrahedral {3, 3, 5}", symbol: [3, 3, 5], depth: 4 }, 
    { name: "4D: 120-cell honeycomb {5, 3, 3, 5}", symbol: [5, 3, 3, 5], depth: 3 },
];
