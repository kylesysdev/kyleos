'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, Send, Trash2, Zap, Sparkles } from 'lucide-react';
import Groq from "groq-sdk";

// --- THE INTEGRATED BRAIN (No external files needed) ---
const groq = new Groq({ 
  apiKey: process.env.NEXT_PUBLIC_GROQ_KEY,
  dangerouslyAllowBrowser: true 
});

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kyle_v4_history');
      if (saved) setMessages(JSON.parse(saved));
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => { 
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('kyle_v4_history', JSON.stringify(messages));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHydrated]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: text, type: 'text' }];
    setMessages(newMsgs);
    setInput('');
    
    try {
      setStatus('speaking');

      // Integrated Image Routing
      if (text.toLowerCase().startsWith('/image')) {
        const prompt = text.replace('/image', '').trim();
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true&model=flux`;
        setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image' }]);
        setStatus('idle');
        return;
      }

      // Integrated Groq Chat
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are KyleOS, a witty AI. Be concise." },
          ...newMsgs.filter(m => m.type !== 'image').map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        ],
        model: "llama3-8b-8192",
      });

      const responseText = completion.choices[0]?.message?.content || "Neural silence.";
      setMessages(prev => [...prev, { role: 'assistant', content: responseText, type: 'text' }]);
      
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(responseText);
      speech.onend = () => setStatus('idle');
      window.speechSynthesis.speak(speech);

    } catch (e) {
      console.error(e);
      setStatus('idle');
      setMessages(prev => [...prev, { role: 'assistant', content: "Neural Link bypass required. Check Groq Key.", type: 'text' }]);
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

  if (!isHydrated) return null;

  return (
    <main className="h-screen w-screen flex flex-col bg-black text-white p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.1),transparent)] pointer-events-none" />
      <div className="z-10 flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={20} />
          <h1 className="text-xl font-bold tracking-tighter">KYLE<span className="text-cyan-400">OS</span></h1>
        </div>
        <button onClick={() => setMessages([])} className="p-2 glass rounded-full hover:bg-red-500/20"><Trash2 size={18} /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        <div className={`w-24 h-24 rounded-full border border-white/20 flex items-center justify-center transition-all duration-1000 ${status === 'speaking' ? 'scale-125 bg-cyan-500/20' : status === 'listening' ? 'scale-110 bg-green-500/20 animate-pulse' : 'bg-white/5'}`}>
          <div className={`w-2 h-2 rounded-full bg-white ${status !== 'idle' ? 'scale-150 shadow-[0_0_15px_white]' : 'opacity-20'}`} />
        </div>
        <div className="w-full max-w-2xl h-[45vh] overflow-y-auto mt-8 px-4 no-scrollbar space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl glass ${m.role === 'user' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/5 border-white/10'}`}>
                {m.type === 'image' ? <img src={m.content} className="rounded-xl w-64 shadow-2xl" /> : <p className="font-light">{m.content}</p>}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>
      <div className="p-6 flex gap-4 max-w-3xl mx-auto w-full z-20">
        <button onClick={startListening} className={`p-5 rounded-full glass border border-white/10 ${status === 'listening' ? 'text-red-500 animate-pulse' : 'text-green-400'}`}><Mic size={28}/></button>
        <input className="flex-1 bg-white/5 border border-white/10 rounded-full px-8 outline-none focus:border-cyan-500" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend(input)} placeholder="Communicate..."/>
        <button onClick={() => handleSend(input)} className="p-5 rounded-full bg-cyan-500 text-black font-bold"><Send size={28}/></button>
      </div>
    </main>
  );
}
