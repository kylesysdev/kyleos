'use client';
import { useState, useEffect, useRef } from 'react';
import { geminiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2 } from 'lucide-react';

export default function KyleOS() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Memory on load
  useEffect(() => { setMessages(MemoryBank.load()); }, []);
  
  // Save to Memory whenever messages change
  useEffect(() => { 
    MemoryBank.save(messages);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      setStatus('speaking');
      const response = await geminiService.chat(messages, text);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Native Browser TTS
      const speech = new SpeechSynthesisUtterance(response);
      speech.onend = () => setStatus('idle');
      window.speechSynthesis.speak(speech);
    } catch (e) {
      setStatus('idle');
    }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return alert("Voice not supported");
    
    const rec = new Speech();
    rec.onstart = () => setStatus('listening');
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      handleSend(transcript);
    };
    rec.onend = () => setStatus('idle');
    rec.start();
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-white font-sans p-4">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#0f172a,transparent)] pointer-events-none" />

      {/* Header */}
      <div className="z-10 flex justify-between items-center p-4">
        <h1 className="text-xl font-bold tracking-tighter text-cyan-400">KYLE OS v4.0</h1>
        <button onClick={() => { MemoryBank.clear(); setMessages([]); }} className="p-2 hover:text-red-400 transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      {/* Center Stage: The Face & Chat */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
        <OrbFace state={status} />
        
        <div className="mt-8 w-full max-w-2xl h-64 overflow-y-auto no-scrollbar space-y-4 px-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl backdrop-blur-md border ${m.role === 'user' ? 'bg-cyan-600/20 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Bottom Bar: Input */}
      <div className="z-20 p-6 flex gap-3 max-w-4xl mx-auto w-full">
         <button onClick={startListening} className={`p-4 rounded-full backdrop-blur-md border transition-all ${status === 'listening' ? 'border-red-500 text-red-500 animate-pulse' : 'border-white/10 text-green-400'}`}>
           <Mic size={24}/>
         </button>
         <input 
           className="flex-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-8 text-lg outline-none focus:border-cyan-500 transition-all"
           placeholder="Message Kyle..."
           value={input}
           onChange={(e) => setInput(e.target.value)}
           onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
         />
         <button onClick={() => handleSend(input)} className="p-4 rounded-full bg-cyan-600 shadow-lg shadow-cyan-900/20 hover:scale-105 active:scale-95 transition-all">
           <Send size={24}/>
         </button>
      </div>
    </main>
  );
}
