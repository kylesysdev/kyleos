'use client';
import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages(MemoryBank.load()); }, []);
  useEffect(() => { 
    MemoryBank.save(messages);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: text, type: 'text' }]);
    setInput('');
    
    try {
      setStatus('speaking');
      const res = await aiService.process(messages, text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.content, type: res.type }]);
      
      if (res.type === 'text') {
        const speech = new SpeechSynthesisUtterance(res.content);
        speech.onend = () => setStatus('idle');
        window.speechSynthesis.speak(speech);
      } else setStatus('idle');
    } catch (e) { setStatus('idle'); }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return alert("Microphone not supported.");
    const rec = new Speech();
    rec.onstart = () => setStatus('listening');
    rec.onresult = (e: any) => handleSend(e.results[0][0].transcript);
    rec.onend = () => setStatus('idle');
    rec.start();
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-black text-white p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.1),transparent)] pointer-events-none" />
      
      <div className="z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-kyle-blue" size={20} />
          <h1 className="text-xl font-bold tracking-tighter">KYLE<span className="text-kyle-blue">OS</span></h1>
        </div>
        <button onClick={() => { MemoryBank.clear(); setMessages([]); }} className="text-gray-500 hover:text-red-500 transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        <OrbFace state={status} />
        <div className="w-full max-w-2xl h-[40vh] overflow-y-auto mt-8 px-4 no-scrollbar space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl glass ${m.role === 'user' ? 'bg-kyle-blue/10 border-kyle-blue/20' : 'bg-white/5 border-white/10'}`}>
                {m.type === 'image' ? <img src={m.content} className="rounded-xl w-64 shadow-2xl" /> : <p className="leading-relaxed">{m.content}</p>}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-6 flex gap-3 max-w-3xl mx-auto w-full z-20">
        <button onClick={startListening} className={`p-4 rounded-full glass border border-white/10 transition-all ${status === 'listening' ? 'text-red-500 scale-110 shadow-[0_0_15px_red]' : 'text-kyle-green'}`}>
          <Mic size={24}/>
        </button>
        <input 
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 outline-none focus:border-kyle-blue transition-all text-lg" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend(input)} 
          placeholder="Speak to Kyle..."
        />
        <button onClick={() => handleSend(input)} className="p-4 rounded-full bg-kyle-blue text-black font-bold">
          <Send size={24}/>
        </button>
      </div>
    </main>
  );
}
