import { ldlD, invertMatrix, innerProduct, reflect, normalizeVector, poincareProject, distancePoincare } from './math';

export class CoxeterGroup {
  N: number;
  G: number[][];
  L: number[][];
  D: number[];
  normals: number[][];
  vertices: number[][];
  timeIndex: number = -1;

  constructor(M: number[][]) {
    this.N = M.length;
    this.G = M.map((row, i) => 
      row.map((m, j) => {
        if (i === j) return 1;
        if (m === Infinity) return -1;
        return -Math.cos(Math.PI / m);
      })
    );

    const { L, D } = ldlD(this.G);
    this.L = L;
    this.D = D;

    for (let i = 0; i < this.N; i++) {
        if (this.D[i] < -1e-8) {
            this.timeIndex = i;
            break;
        }
    }
    
    // Normal vectors in R^{s, t}
    this.normals = [];
    for (let i = 0; i < this.N; i++) {
      const n = Array(this.N).fill(0);
      for (let j = 0; j < this.N; j++) {
        n[j] = this.L[i][j] * Math.sqrt(Math.abs(this.D[j]));
      }
      this.normals.push(n);
    }

    // Adjust invertMatrix logic if it's singular (Euclidean)
    let isEuclidean = false;
    this.vertices = [];
    try {
        const invG = invertMatrix(this.G);
        for (let j = 0; j < this.N; j++) {
          let v = Array(this.N).fill(0);
          for (let i = 0; i < this.N; i++) {
            v[i] = -invG[i][j];
          }
          
          const vCoords = Array(this.N).fill(0);
          for (let i = 0; i < this.N; i++) {
            for (let k = 0; k < this.N; k++) {
              vCoords[k] += v[i] * this.normals[i][k];
            }
          }
          this.vertices.push(vCoords);
        }
    } catch(e) {
        isEuclidean = true;
    }
  }

  generateEdges(maxDepth: number = 4): { edges: [number[], number[]][] } {
      if (this.vertices.length === 0) return { edges: [] };
      const vVertex = this.vertices[this.N - 1]; // v_{N-1}
      
      const targetNorm = this.timeIndex >= 0 ? -1 : 1; 
      let p0 = normalizeVector(vVertex, this.D, targetNorm);
      
      if (this.timeIndex >= 0 && p0[this.timeIndex] < 0) {
          for(let i=0; i<this.N; i++) p0[i] *= -1;
      }
      
      const p1 = reflect(p0, this.normals[this.N - 1], this.D);

      const segments: [number[], number[]][] = [[p0, p1]];
      
      let currentSegments = [...segments];
      const allSegments: [number[], number[]][] = [];
      const segmentMap = new Set<string>();

      // Transformation to center the central point of the fundamental domain
      const isHyperbolic = this.timeIndex >= 0;
      const tIdx = isHyperbolic ? this.timeIndex : 0;
      
      let centerV = Array(this.N).fill(0);
      for(let i=0; i<this.N; i++) {
          for(let j=0; j<this.N; j++) centerV[j] += this.vertices[i][j];
      }
      
      // If we are hyperbolical, ensure centerV is actually time-like
      let centerNormSq = 0;
      if (isHyperbolic) {
          for(let i=0; i<this.N; i++) {
              centerNormSq += centerV[i] * centerV[i] * Math.sign(this.D[i] || 1);
          }
          if (centerNormSq > 0) {
              // Try finding any time-like vertex
              let found = false;
              for(let i=0; i<this.N; i++) {
                  let nv = 0;
                  for(let j=0; j<this.N; j++) nv += this.vertices[i][j]*this.vertices[i][j]*Math.sign(this.D[j]||1);
                  if (nv < 0) {
                      centerV = this.vertices[i].slice();
                      centerNormSq = nv;
                      found = true;
                      break;
                  }
              }
              if (!found) {
                  // Fallback: just use standard time axis (no centering)
                  centerV = Array(this.N).fill(0);
                  centerV[tIdx] = 1;
              }
          }
      }
      
      let pCenter = normalizeVector(centerV, this.D, isHyperbolic ? -1 : 1);
      if (isHyperbolic && pCenter[tIdx] < 0) {
          for(let i=0; i<this.N; i++) pCenter[i] *= -1;
      }

      const xt = pCenter[tIdx];
      let r = 0;
      let u = Array(this.N).fill(0);
      for(let i=0; i<this.N; i++) {
          if (i !== tIdx) {
              const weight = Math.sign(this.D[i] || 1);
              r += weight * pCenter[i] * pCenter[i];
          }
      }
      if (r > 1e-10) {
          r = Math.sqrt(Math.max(0, r)); // ensure positive
          for(let i=0; i<this.N; i++) {
              if (i !== tIdx) u[i] = pCenter[i] / r;
          }
      }

      const applyTransformation = (w: number[]) => {
          if (r <= 1e-10) return w;
          const a = w[tIdx];
          let b = 0;
          for(let i=0; i<this.N; i++) {
              if (i !== tIdx) {
                  b += Math.sign(this.D[i] || 1) * w[i] * u[i];
              }
          }
          let aPrime, bPrime;
          if (isHyperbolic) {
              aPrime = a * xt - b * r;
              bPrime = -a * r + b * xt;
          } else {
              aPrime = a * xt + b * r;
              bPrime = -a * r + b * xt;
          }
          const res = w.slice();
          res[tIdx] += aPrime - a;
          for(let i=0; i<this.N; i++) {
              if (i !== tIdx) {
                  res[i] += (bPrime - b) * u[i];
              }
          }
          return res;
      };

      const project = (v: number[]) => {
          const vTransformed = applyTransformation(v);
          if (this.timeIndex >= 0) {
              return poincareProject(vTransformed, this.D);
          } else {
              // Stereographic or orthogonal for spherical
              // For spherical, project from south pole
              const scale = 1 / (vTransformed[0] + 1); // projecting onto x0=0 hyperplane
              const proj = [];
              for(let i=1; i<this.N; i++) proj.push(vTransformed[i] * scale);
              return proj;
          }
      };

      const toKey = (s: [number[], number[]]) => {
          const pA = project(s[0]);
          const pB = project(s[1]);
          const strA = pA.map(x => x.toFixed(4)).join(',');
          const strB = pB.map(x => x.toFixed(4)).join(',');
          return strA < strB ? `${strA}|${strB}` : `${strB}|${strA}`;
      }

      for (const s of currentSegments) {
          const k = toKey(s);
          if (!segmentMap.has(k)) {
              segmentMap.add(k);
              allSegments.push(s);
          }
      }

      for(let depth=0; depth<maxDepth; depth++) {
          const nextSegments: [number[], number[]][] = [];
          for (const s of currentSegments) {
              for (let i = 0; i < this.N; i++) {
                  const sNew: [number[], number[]] = [
                      reflect(s[0], this.normals[i], this.D),
                      reflect(s[1], this.normals[i], this.D)
                  ];
                  const k = toKey(sNew);
                  if (!segmentMap.has(k)) {
                      segmentMap.add(k);
                      allSegments.push(sNew);
                      nextSegments.push(sNew);
                  }
              }
          }
          currentSegments = nextSegments;
      }
      
      return { edges: allSegments.map(s => [applyTransformation(s[0]), applyTransformation(s[1])]), isHyperbolic: this.timeIndex >= 0, metric: this.D };
  }
}