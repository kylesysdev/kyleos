'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Send, Trash2, Zap, Sparkles, AlertCircle } from 'lucide-react';

export default function KyleOS() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. NEURAL BOOT (Persistence)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kyle_v4_history');
      if (saved) setMessages(JSON.parse(saved));
    }
    setIsHydrated(true); // Prevents hydration mismatch
  }, []);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('kyle_v4_history', JSON.stringify(messages));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHydrated]);

  // 2. NEURAL TRANSMISSION (Server-Side Fetch)
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text, type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      setStatus('speaking');

      // --- Image Routing ---
      if (text.toLowerCase().startsWith('/image')) {
        const prompt = text.replace('/image', '').trim();
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true&model=flux`;
        setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image' }]);
        setStatus('idle');
        return;
      }

      // --- Server-Side Brain Link ---
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter(m => m.type !== 'image').map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        })
      });

      if (!response.ok) throw new Error("Neural Link Down");
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, type: 'text' }]);
      
      // Voice Synthesis
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(data.content);
      speech.onend = () => setStatus('idle');
      window.speechSynthesis.speak(speech);

    } catch (e) {
      console.error(e);
      setStatus('idle');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Neural Link bypass required. Verify GROQ_API_KEY in Vercel Settings.", 
        type: 'text' 
      }]);
    }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return alert("Neural sensing not supported on this browser.");
    const rec = new Speech();
    rec.onstart = () => { setStatus('listening'); window.speechSynthesis.cancel(); };
    rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
    rec.onend = () => setStatus('idle');
    rec.start();
  };

  if (!isHydrated) return null;

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-white p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.1),transparent)] pointer-events-none" />
      
      <nav className="z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Zap className="text-cyan-400 animate-pulse" size={20} />
          <h1 className="text-xl font-bold tracking-tighter uppercase">Kyle<span className="text-cyan-400 italic">OS</span></h1>
        </div>
        <button onClick={() => { setMessages([]); localStorage.removeItem('kyle_v4_history'); }} className="p-2 glass rounded-full hover:bg-red-500/20 transition-all">
          <Trash2 size={18} />
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
        {/* Core Visualizer */}
        <div className={`w-32 h-32 rounded-full border border-white/10 flex items-center justify-center transition-all duration-1000 z-10 ${
          status === 'speaking' ? 'scale-125 bg-cyan-500/10 shadow-[0_0_50px_rgba(6,182,212,0.2)]' : 
          status === 'listening' ? 'scale-110 bg-green-500/10 animate-pulse' : 'bg-white/5'
        }`}>
          <div className={`w-3 h-3 rounded-full bg-white transition-all duration-500 ${
            status !== 'idle' ? 'scale-150 shadow-[0_0_20px_white]' : 'opacity-20'
          }`} />
        </div>

        {/* Message Stage */}
        <div className="w-full max-w-2xl h-[45vh] overflow-y-auto mt-8 px-4 no-scrollbar space-y-4 pb-10">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
              <div className={`p-4 rounded-3xl backdrop-blur-3xl border ${
                m.role === 'user' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'
              }`}>
                {m.type === 'image' ? (
                  <img src={m.content} className="rounded-2xl w-full md:w-80 shadow-2xl border border-white/10" alt="Neural Link Visual" />
                ) : (
                  <p className="text-lg font-light tracking-wide leading-relaxed">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="z-20 p-6 md:p-10 flex gap-4 max-w-4xl mx-auto w-full">
        <button onClick={startListening} className={`p-5 rounded-full border border-white/10 backdrop-blur-xl transition-all duration-500 ${
          status === 'listening' ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(255,0,0,0.4)]' : 'text-green-400'
        }`}>
          <Mic size={28}/>
        </button>
        <input 
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-8 text-xl outline-none focus:border-cyan-500 transition-all placeholder-gray-600" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend(input)} 
          placeholder={status === 'listening' ? "Neural Link Listening..." : "Communicate via Server Link..."}
        />
        <button onClick={() => handleSend(input)} className="p-5 rounded-full bg-cyan-500 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all">
          <Send size={28}/>
        </button>
      </div>
    </main>
  );
}
