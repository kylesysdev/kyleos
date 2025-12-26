'use client';

import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2, Sparkles, AlertCircle } from 'lucide-react';

export default function KyleOS() {
  // --- STATE ---
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Hydration Guard: Prevents blank screen on reload
  const [isHydrated, setIsHydrated] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- NEURAL BOOT (Persistence) ---
  useEffect(() => {
    // Only run on client to avoid "localStorage is not defined"
    const saved = MemoryBank.load();
    if (saved) setMessages(saved);
    setIsHydrated(true); // Signal that client-side mounting is complete
  }, []);

  useEffect(() => {
    if (isHydrated) {
      MemoryBank.save(messages);
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHydrated]);

  // --- LOGIC ---
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: text, type: 'text' }]);
    setInput('');
    
    try {
      setStatus('speaking');
      const res = await aiService.process(messages, text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.content, type: res.type }]);
      
      if (res.type === 'text') {
        window.speechSynthesis.cancel();
        const speech = new SpeechSynthesisUtterance(res.content);
        speech.onend = () => setStatus('idle');
        window.speechSynthesis.speak(speech);
      } else {
        setStatus('idle');
      }
    } catch (e) {
      console.error("Neural processing failed:", e);
      setStatus('idle');
      setError("Neural Link Error: I cannot reach my core brain right now.");
    }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return alert("Microphone sensors not supported on this browser.");
    
    const rec = new Speech();
    rec.onstart = () => {
      setStatus('listening');
      window.speechSynthesis.cancel();
    };
    rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
    rec.onend = () => setStatus('idle');
    rec.start();
  };

  // --- RENDER GUARD ---
  if (!isHydrated) return null; // Wait for hydration to avoid UI flickers

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-white p-4 relative overflow-hidden font-sans">
      {/* Background Physics */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.15),transparent)] pointer-events-none" />
      
      {/* Top Navigation */}
      <nav className="z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={20} />
          <h1 className="text-xl font-bold tracking-tighter uppercase">Kyle<span className="text-cyan-400 italic">OS</span></h1>
        </div>
        <button 
          onClick={() => { MemoryBank.clear(); setMessages([]); }} 
          className="p-2 glass rounded-full hover:bg-red-500/20 transition-all text-gray-400 hover:text-red-400"
        >
          <Trash2 size={18} />
        </button>
      </nav>

      {/* Main Interaction Stage */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
        <OrbFace state={status} />
        
        {/* Error Notification */}
        {error && (
          <div className="absolute top-1/4 glass px-6 py-2 rounded-full border-red-500/50 text-red-400 text-sm flex items-center gap-2 animate-in fade-in zoom-in">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Message Container */}
        <div className="w-full max-w-2xl h-[45vh] overflow-y-auto mt-8 px-4 no-scrollbar space-y-4 pb-10">
          {messages.length === 0 && (
            <div className="text-center opacity-20 py-20 uppercase tracking-[0.3em] text-xs">
              Neural Link Initialized
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
              <div className={`p-4 md:p-5 rounded-3xl glass shadow-2xl ${
                m.role === 'user' 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-50 rounded-tr-md' 
                  : 'bg-white/5 border-white/10 text-white rounded-tl-md'
              }`}>
                {m.type === 'image' ? (
                  <img src={m.content} className="rounded-2xl w-full md:w-80 shadow-2xl border border-white/10" alt="Neural Visual" />
                ) : (
                  <p className="text-base md:text-lg font-light leading-relaxed">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Dock */}
      <div className="z-20 p-6 md:p-10 flex gap-4 max-w-4xl mx-auto w-full">
        <button 
          onClick={startListening} 
          className={`p-5 rounded-full glass border border-white/10 transition-all duration-500 ${
            status === 'listening' 
              ? 'bg-red-500 text-white scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
              : 'text-green-400 hover:border-green-400/50'
          }`}
        >
          <Mic size={28}/>
        </button>
        
        <input 
          className="flex-1 bg-white/5 border border-white/10 backdrop-blur-3xl rounded-full px-8 text-xl outline-none focus:border-cyan-500 transition-all placeholder-gray-600" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend(input)} 
          placeholder={status === 'listening' ? "Neural sensing active..." : "Type to communicate..."}
        />
        
        <button 
          onClick={() => handleSend(input)} 
          className="p-5 rounded-full bg-cyan-500 text-black font-bold hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        >
          <Send size={28}/>
        </button>
      </div>
    </main>
  );
}
