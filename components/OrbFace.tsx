'use client';
export default function OrbFace({ state }: { state: 'idle' | 'listening' | 'speaking' }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className={`absolute w-56 h-56 rounded-full blur-[80px] transition-all duration-1000 
        ${state === 'speaking' ? 'bg-cyan-500/40 animate-speak' : 
          state === 'listening' ? 'bg-kyle-green/50 animate-pulse shadow-[0_0_50px_rgba(0,255,65,0.4)]' : 
          'bg-gray-800/20 animate-breath'}`} 
      />
      <div className="w-32 h-32 glass rounded-full flex items-center justify-center z-10 shadow-2xl relative border border-white/20">
        <div className={`w-3 h-3 rounded-full bg-white transition-all duration-500 
          ${state === 'speaking' ? 'scale-[4.5] bg-cyan-400 shadow-[0_0_15px_cyan]' : 
            state === 'listening' ? 'scale-[2.5] bg-kyle-green shadow-[0_0_15px_#00ff41]' : 'opacity-40'}`} 
        />
      </div>
    </div>
  );
}
