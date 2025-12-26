'use client';
export default function OrbFace({ state }: { state: 'idle' | 'listening' | 'speaking' }) {
  return (
    <div className="relative flex items-center justify-center h-48">
      <div className={`absolute w-40 h-40 rounded-full blur-3xl transition-all duration-1000 
        ${state === 'speaking' ? 'bg-cyan-500/40 animate-speak' : 
          state === 'listening' ? 'bg-green-500/50 animate-pulse' : 'bg-gray-800/20 animate-breath'}`} 
      />
      <div className="w-24 h-24 backdrop-blur-2xl bg-white/10 rounded-full border border-white/20 flex items-center justify-center z-10 shadow-2xl">
        <div className={`w-2 h-2 rounded-full bg-white transition-all duration-500 
          ${state === 'speaking' ? 'scale-[5] bg-cyan-400' : 
            state === 'listening' ? 'scale-[3] bg-green-400' : 'opacity-40'}`} 
        />
      </div>
    </div>
  );
}
