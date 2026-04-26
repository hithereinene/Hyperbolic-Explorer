import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { getCoxeterMatrix, EXAMPLES } from './lib/examples';
import { CoxeterGroup } from './lib/CoxeterGroup';
import { getThreeVector, generateGeodesicArc } from './lib/renderUtils';
import * as THREE from 'three';

const COLORS = [
  '#ff3b30', '#ff9500', '#ffcc00', '#4cd964',
  '#5ac8fa', '#007aff', '#5856d6', '#ff2d55'
];

interface VisualizationProps {
    symbol: number[];
    depth: number;
}

function GeometryVisualization({ symbol, depth }: VisualizationProps) {
    const data = useMemo(() => {
        try {
            const M = getCoxeterMatrix(symbol);
            const group = new CoxeterGroup(M);
            const res = group.generateEdges(depth);
            console.log(`Generated ${res.edges.length} edges`);
            return res;
        } catch(e) {
            console.error(e);
            return { edges: [], isHyperbolic: false, metric: [] };
        }
    }, [symbol, depth]);

    const lines = useMemo(() => {
        return data.edges.map((e, idx) => {
            const arc = generateGeodesicArc(e[0], e[1], data.metric, data.isHyperbolic, 12);
            return arc.map(pt => new THREE.Vector3(...getThreeVector(pt)));
        }).filter(l => l.length > 0);
    }, [data]);

    return (
        <group>
            {lines.map((pts, i) => (
                <Line
                    key={i}
                    points={pts}
                    color={COLORS[i % COLORS.length]}
                    lineWidth={1.5}
                    transparent
                    opacity={0.8}
                />
            ))}
            {/* Draw boundary sphere/disk */}
            {data.isHyperbolic && symbol.length >= 3 && (
                 <mesh>
                 <sphereGeometry args={[1, 32, 32]} />
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
               </mesh>
            )}
            {data.isHyperbolic && symbol.length === 2 && (
                 <mesh>
                 <circleGeometry args={[1, 64]} />
                 <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
                 <mesh>
                    <ringGeometry args={[0.99, 1, 64]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.3} transparent />
                 </mesh>
               </mesh>
            )}
        </group>
    );
}

export default function App() {
    const [selectedId, setSelectedId] = useState(-1);
    const [customSymbolStr, setCustomSymbolStr] = useState("3,7");
    const [depth, setDepth] = useState(EXAMPLES[0].depth);

    const preset = EXAMPLES[selectedId];
    
    // Parse custom symbol
    const parsedSymbol = useMemo(() => {
        if (preset) return preset.symbol;
        return customSymbolStr.split(',').map(s => {
            const val = s.trim();
            if (val.toLowerCase() === 'inf' || val === '∞') return Infinity;
            return parseInt(val) || 3;
        });
    }, [preset, customSymbolStr]);

    return (
        <div className="w-full h-screen bg-neutral-950 flex flex-col font-sans text-neutral-100 overflow-hidden">
            <header className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 backdrop-blur">
                <div className="flex flex-col">
                    <h1 className="text-xl font-medium tracking-tight text-white mb-1">
                        Hyperbolic Explorer
                    </h1>
                    <p className="text-sm text-neutral-400">
                        N-dimensional Coxeter group tilings (Schlegel / Poincare projections)
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                        <label className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Symbol (e.g. 3,7 or 5,3,4)</label>
                        <input
                            type="text"
                            value={customSymbolStr}
                            onChange={(e) => {
                                setCustomSymbolStr(e.target.value);
                                setSelectedId(-1);
                            }}
                            className="bg-neutral-800 border border-neutral-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow w-32"
                            placeholder="3, 7"
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <label className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Preset</label>
                        <select 
                            className="bg-neutral-800 border border-neutral-700 text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow w-48"
                            value={selectedId}
                            onChange={(e) => {
                                const id = parseInt(e.target.value);
                                setSelectedId(id);
                                if (id >= 0) {
                                    setDepth(EXAMPLES[id].depth);
                                    setCustomSymbolStr(EXAMPLES[id].symbol.map(s => s === Infinity ? '∞' : s).join(', '));
                                }
                            }}
                        >
                            <option value={-1}>Custom</option>
                            {EXAMPLES.map((ex, i) => (
                                <option key={i} value={i}>{ex.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative">
                <Canvas camera={{ position: [0, 0, 2.5], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <GeometryVisualization symbol={parsedSymbol} depth={depth} />
                    <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
                    </EffectComposer>
                </Canvas>
                <div className="absolute bottom-6 left-6 pointer-events-none">
                    <div className="bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-lg p-4 max-w-sm pointer-events-auto">
                        <h3 className="font-semibold text-white mb-2">{preset ? preset.name : 'Custom Tiling'}</h3>
                        <p className="text-sm text-neutral-400 mb-4 whitespace-nowrap">
                            Coxeter Symbol: {`{${parsedSymbol.map(s => s === Infinity ? '∞' : s).join(', ')}}`}
                        </p>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center mb-1">
                             <label className="text-xs text-neutral-500 uppercase tracking-wider">Recursion Depth</label>
                           </div>
                           <div className="flex justify-between items-center bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                               <input 
                                 type="number" 
                                 min={1} 
                                 value={depth} 
                                 onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
                                 className="w-full bg-transparent text-sm font-mono text-white focus:outline-none"
                               />
                           </div>
                           <p className="text-[10px] text-neutral-500 leading-tight">
                             Warning: High depth values may freeze the browser due to exponential growth.
                           </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
