'use client';

import { useState } from 'react';
import Terminal from '../components/Terminal';
import Visualizer from '../components/Visualizer';

export default function Home() {
  const [currentImagePrompt, setCurrentImagePrompt] = useState<string | null>(null);

  return (
    <main className="flex h-screen w-screen bg-neon-dark bg-[size:40px_40px] bg-grid-pattern p-2 md:p-4 gap-4 overflow-hidden relative">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black pointer-events-none" />

      {/* LEFT COLUMN: Brain/Chat */}
      <div className="w-full md:w-1/2 h-full border-neon bg-glass rounded-lg flex flex-col relative z-10">
        <div className="flex items-center justify-between px-4 py-2 border-b border-green-900 bg-green-900/10">
          <span className="text-xs font-bold tracking-widest text-neon-green">KYLE_CORE // TERMINAL</span>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-green-900"></div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2">
           <Terminal onImageCommand={setCurrentImagePrompt} />
        </div>
      </div>

      {/* RIGHT COLUMN: Visuals & Status */}
      <div className="hidden md:flex w-1/2 h-full flex-col gap-4 z-10">
        
        {/* Top: Visualizer */}
        <div className="flex-1 border-neon-blue bg-glass rounded-lg overflow-hidden flex flex-col">
           <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-900 bg-cyan-900/10">
            <span className="text-xs font-bold tracking-widest text-neon-blue">FLUX_ENGINE // VISUALIZER</span>
             <span className="text-[10px] text-cyan-700">60 FPS</span>
          </div>
          <div className="flex-1 relative">
            <Visualizer prompt={currentImagePrompt} />
          </div>
        </div>
        
        {/* Bottom: System Status / Data */}
        <div className="h-1/3 border-neon bg-glass rounded-lg p-4 font-mono text-xs text-gray-400">
           <h3 className="text-neon-green mb-2 pb-1 border-b border-gray-800">SYSTEM_DIAGNOSTICS</h3>
           <div className="space-y-2">
             <div className="flex justify-between">
               <span>&gt; NETWORK_LATENCY</span>
               <span className="text-neon-blue">24ms</span>
             </div>
             <div className="flex justify-between">
               <span>&gt; MEMORY_ALLOCATION</span>
               <span className="text-neon-blue">14%</span>
             </div>
             <div className="flex justify-between">
               <span>&gt; POLLINATIONS_API</span>
               <span className="text-neon-green">CONNECTED</span>
             </div>
             <div className="mt-4 text-[10px] text-gray-600">
               KYLE OS v1.0.0<br/>
               (c) 2025 MOSTAFA
             </div>
           </div>
        </div>
      </div>
    </main>
  );
}
