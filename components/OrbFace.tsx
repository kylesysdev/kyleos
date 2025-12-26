'use client';

export default function OrbFace({ state }: { state: 'idle' | 'listening' | 'speaking' }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Dynamic Glow: Pulses Green when listening, Blue when speaking */}
      <div className={`absolute w-48 h-48 rounded-full blur-3xl transition-all duration-1000 
        ${state === 'speaking' ? 'bg-cyan-500/40 animate-pulse' : 
          state === 'listening' ? 'bg-green-500/50 animate-ping' : 'bg-gray-500/10'}`} 
      />
      
      {/* The Glass Orb */}
      <div className="w-32 h-32 backdrop-blur-xl bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-2xl relative z-10">
        <div className={`w-3 h-3 rounded-full bg-white transition-all duration-500 
          ${state === 'speaking' ? 'scale-[3.5] bg-cyan-400' : 
            state === 'listening' ? 'scale-[2.0] bg-green-400' : 'scale-100 opacity-50'}`} 
        />
      </div>
    </div>
  );
}
