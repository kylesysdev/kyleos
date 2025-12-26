'use client';
import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2 } from 'lucide-react';

export default function Page() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kyle_mem');
    if (saved) setMsgs(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('kyle_mem', JSON.stringify(msgs));
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const onSend = async (text: string) => {
    if (!text.trim()) return;
    setMsgs(p => [...p, { role: 'user', content: text, type: 'text' }]);
    setInput('');
    
    try {
      setStatus('speaking');
      const res = await aiService.process(msgs, text);
      setMsgs(p => [...p, { role: 'assistant', content: res.content, type: res.type }]);
      
      if (res.type === 'text') {
        const s = new SpeechSynthesisUtterance(res.content);
        s.onend = () => setStatus('idle');
        window.speechSynthesis.speak(s);
      } else setStatus('idle');
    } catch (e) { setStatus('idle'); }
  };

  const listen = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return;
    const r = new Speech();
    r.onstart = () => setStatus('listening');
    r.onresult = (e: any) => onSend(e.results[0][0].transcript);
    r.onend = () => setStatus('idle');
    r.start();
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-black text-white p-4 font-sans overflow-hidden">
      <div className="flex justify-between items-center p-4 z-20">
        <h1 className="text-xl font-bold text-cyan-400 tracking-tighter">KYLE OS v4</h1>
        <button onClick={() => { localStorage.clear(); setMsgs([]); }}><Trash2 size={20}/></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        <OrbFace state={status} />
        <div className="w-full max-w-2xl h-64 overflow-y-auto mt-8 px-4 no-scrollbar">
          {msgs.map((m, i) => (
            <div key={i} className={`flex mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl backdrop-blur-lg border ${m.role === 'user' ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
                {m.type === 'image' ? <img src={m.content} className="rounded-xl w-64"/> : m.content}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-6 flex gap-3 max-w-3xl mx-auto w-full z-20">
        <button onClick={listen} className={`p-4 rounded-full glass border border-white/10 ${status === 'listening' ? 'text-red-500' : 'text-green-400'}`}><Mic/></button>
        <input className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 outline-none focus:border-cyan-500" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend(input)} placeholder="Speak to Kyle..."/>
        <button onClick={() => onSend(input)} className="p-4 rounded-full bg-cyan-600"><Send/></button>
      </div>
    </main>
  );
}
