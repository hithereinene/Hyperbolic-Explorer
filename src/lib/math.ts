export function ldlD(G: number[][]): { L: number[][], D: number[] } {
  const n = G.length;
  const L: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  const D: number[] = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    L[i][i] = 1;
    let sumD = 0;
    for (let k = 0; k < i; k++) {
      sumD += L[i][k] * L[i][k] * D[k];
    }
    D[i] = G[i][i] - sumD;

    for (let j = i + 1; j < n; j++) {
      let sumL = 0;
      for (let k = 0; k < i; k++) {
        sumL += L[j][k] * L[i][k] * D[k];
      }
      L[j][i] = (G[j][i] - sumL) / D[i];
    }
  }
  return { L, D };
}

export function invertMatrix(M: number[][]): number[][] {
  const n = M.length;
  const A = M.map(row => [...row]);
  const I = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) pivot = j;
    }
    
    // Swap rows
    [A[i], A[pivot]] = [A[pivot], A[i]];
    [I[i], I[pivot]] = [I[pivot], I[i]];
    
    const diag = A[i][i];
    if (Math.abs(diag) < 1e-10) throw new Error("Matrix is singular");
    
    for (let j = 0; j < n; j++) {
      A[i][j] /= diag;
      I[i][j] /= diag;
    }
    
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const factor = A[j][i];
        for (let k = 0; k < n; k++) {
          A[j][k] -= factor * A[i][k];
          I[j][k] -= factor * I[i][k];
        }
      }
    }
  }
  return I;
}

export function innerProduct(u: number[], v: number[], D: number[]): number {
  let sum = 0;
  for(let i = 0; i < u.length; i++) {
    sum += u[i] * v[i] * Math.sign(D[i]);
  }
  return sum;
}

export function reflect(v: number[], n: number[], D: number[]): number[] {
  const dot = innerProduct(v, n, D);
  const n2 = innerProduct(n, n, D); // Should be 1
  return v.map((x, i) => x - 2 * (dot / n2) * n[i]);
}

export function poincareProject(v: number[], D: number[]): number[] {
  let timeIndex = -1;
  for(let i=0; i<D.length; i++) {
    if (D[i] < 0) {
      timeIndex = i;
      break;
    }
  }
  const x0 = v[timeIndex];
  // v_proj = (v_space) / (1 + x0)
  const proj = [];
  const denom = Math.abs(1 + x0) < 1e-5 ? 1e-5 : (1 + x0);
  for(let i=0; i<v.length; i++) {
    if (i !== timeIndex) {
      proj.push(v[i] / denom);
    }
  }
  return proj;
}

export function distancePoincare(p1: number[], p2: number[]): number {
    let d = 0;
    for(let i=0;i<p1.length;i++) d += (p1[i]-p2[i])**2;
    return Math.sqrt(d);
}

export function normalizeVector(v: number[], D: number[], targetNormSQ: number): number[] {
  const normSQ = innerProduct(v, v, D);
  if (Math.abs(normSQ) < 1e-10) return v.map(x => x); // Ideal point, skip normalization or handle specially
  const factor = Math.sqrt(Math.abs(targetNormSQ / normSQ));
  return v.map(x => x * factor);
}

