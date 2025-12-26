'use client';
import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2, Sparkles } from 'lucide-react';

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load memory only after mount to avoid hydration errors
  useEffect(() => { 
    const saved = MemoryBank.load();
    if (saved) setMessages(saved);
  }, []);

  useEffect(() => { 
    MemoryBank.save(messages);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.error(e);
      setStatus('idle');
      setError("Neural Link Error: I cannot reach my core brain right now.");
    }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return;
    const rec = new Speech();
    rec.onstart = () => { setStatus('listening'); window.speechSynthesis.cancel(); };
    rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
    rec.onend = () => setStatus('idle');
    rec.start();
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-black text-white p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.15),transparent)] pointer-events-none" />
      
      <div className="z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-kyle-blue" size={20} />
          <h1 className="text-xl font-bold tracking-tighter uppercase">Kyle<span className="text-kyle-blue italic">OS</span></h1>
        </div>
        <button onClick={() => { MemoryBank.clear(); setMessages([]); }} className="p-2 glass rounded-full hover:bg-red-500/20 transition-all">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
        <OrbFace state={status} />
        
        {error && <div className="absolute top-1/4 glass px-6 py-2 rounded-full border-red-500/50 text-red-400 text-sm animate-pulse">{error}</div>}

        <div className="w-full max-w-2xl h-[45vh] overflow-y-auto mt-8 px-4 no-scrollbar space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`p-4 rounded-3xl glass ${m.role === 'user' ? 'bg-kyle-blue/10 border-kyle-blue/30' : 'bg-white/5 border-white/10'}`}>
                {m.type === 'image' ? <img src={m.content} className="rounded-2xl w-full md:w-80 shadow-2xl border border-white/10" /> : <p className="text-lg font-light tracking-wide">{m.content}</p>}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-6 md:p-10 flex gap-4 max-w-4xl mx-auto w-full z-20">
        <button onClick={startListening} className={`p-5 rounded-full glass border border-white/10 transition-all duration-500 ${status === 'listening' ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'text-kyle-green hover:border-kyle-green/50'}`}>
          <Mic size={28}/>
        </button>
        <input 
          className="flex-1 bg-white/5 border border-white/10 backdrop-blur-3xl rounded-full px-8 text-xl outline-none focus:border-kyle-blue transition-all" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend(input)} 
          placeholder={status === 'listening' ? "Neural Link Listening..." : "Communicate with Kyle..."}
        />
        <button onClick={() => handleSend(input)} className="p-5 rounded-full bg-kyle-blue text-black font-bold hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,243,255,0.4)]">
          <Send size={28}/>
        </button>
      </div>
    </main>
  );
}
