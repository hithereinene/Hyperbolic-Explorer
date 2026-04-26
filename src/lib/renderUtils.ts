import { innerProduct, poincareProject } from './math';

export function getThreeVector(pt: number[]): [number, number, number] {
    if (pt.length === 2) return [pt[0], pt[1], 0];
    if (pt.length === 3) return [pt[0], pt[1], pt[2]];
    
    // For 4D or higher (already projected to Poincare ball, so norm < 1)
    // Reduce dimension by dimension using Stereographic projection from the boundary sphere
    let current = pt.slice();
    while (current.length > 3) {
        const last = current[current.length - 1];
        // Stereographic projection from (0, ..., 0, 1)
        const scale = 1 / (1.0001 - last);
        const next = [];
        for (let i = 0; i < current.length - 1; i++) {
            next.push(current[i] * scale);
        }
        current = next;
    }
    
    return [current[0], current[1], current[2]];
}

// Generates points along a hyperbolic geodesic between two hyperboloid points p0, p1
// D is the metric diagonal for inner product
export function generateGeodesicArc(p0: number[], p1: number[], D: number[], isHyperbolic: boolean, steps: number = 8): number[][] {
    const pts: number[][] = [];
    if (isHyperbolic) {
        // Hyperbolic interpolation
        const dot = innerProduct(p0, p1, D); // Should be <= -1
        let d = Math.acosh(Math.max(1, -dot));
        if (isNaN(d) || d < 0.001) {
            // Fallback: interpolate in Minkowski space and then project
            // This yields circular arcs in Poincare for space-like geodesics too.
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pt = p0.map((x, j) => x * (1-t) + p1[j] * t);
                pts.push(poincareProject(pt, D));
            }
            return pts;
        }
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const s1 = Math.sinh((1 - t) * d) / Math.sinh(d);
            const s2 = Math.sinh(t * d) / Math.sinh(d);
            const pt = p0.map((x, j) => x * s1 + p1[j] * s2);
            pts.push(poincareProject(pt, D));
        }
    } else {
        // Spherical interpolation
        const dot = innerProduct(p0, p1, D); // Should be < 1
        let d = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        // Simple projection function for spherical
        const sphericalProject = (v: number[]) => {
            // Protect against division by zero (south pole)
            const scale = 1 / (Math.abs(1 + v[0]) < 1e-5 ? 1e-5 : (1 + v[0]));
            const proj = [];
            for(let i=1; i<v.length; i++) proj.push(v[i] * scale);
            return proj;
        };

        if (isNaN(d) || d < 0.001) {
            return [sphericalProject(p0), sphericalProject(p1)];
        }
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const s1 = Math.sin((1 - t) * d) / Math.sin(d);
            const s2 = Math.sin(t * d) / Math.sin(d);
            const pt = p0.map((x, j) => x * s1 + p1[j] * s2);
            pts.push(sphericalProject(pt));
        }
    }
    return pts;
}