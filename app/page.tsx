'use client';
import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2, Image as ImageIcon, Sparkles, Moon, Sun } from 'lucide-react';

export default function KyleOS() {
  // --- STATE MANAGEMENT ---
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [isDark, setIsDark] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- PERSISTENCE & THEME ---
  useEffect(() => { 
    setMessages(MemoryBank.load());
    const savedTheme = localStorage.getItem('kyle_theme');
    if (savedTheme) setIsDark(savedTheme === 'dark');
  }, []);
  
  useEffect(() => { 
    MemoryBank.save(messages);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('kyle_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // --- CORE LOGIC ---
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text, type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      setStatus('speaking');
      const result = await aiService.processInput(messages, text);
      
      const aiMsg = { role: 'assistant', content: result.content, type: result.type };
      setMessages(prev => [...prev, aiMsg]);
      
      if (result.type === 'text') {
        const speech = new SpeechSynthesisUtterance(result.content);
        speech.onend = () => setStatus('idle');
        window.speechSynthesis.speak(speech);
      } else {
        setStatus('idle');
      }
    } catch (e) {
      setStatus('idle');
      console.error("System Error:", e);
    }
  };

  const startListening = () => {
    const Speech = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Speech) return alert("Voice sensors not supported on this browser.");
    
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
    <main className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden relative font-sans">
      
      {/* Visual Background Physics */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(0,243,255,0.1),transparent)] pointer-events-none" />

      {/* Header Bar */}
      <nav className="z-20 flex justify-between items-center p-6 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold tracking-tighter text-xl">KYLE OS <span className="text-cyan-500 font-light">4.0</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => { MemoryBank.clear(); setMessages([]); }} className="p-2 hover:text-red-500 transition-colors">
            <Trash2 size={20} />
          </button>
        </div>
      </nav>

      {/* Primary Interaction Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-4 overflow-hidden">
        <div className="mb-8 transform hover:scale-105 transition-transform duration-700">
           <OrbFace state={status} />
        </div>
        
        <div className="w-full max-w-3xl h-[45vh] overflow-y-auto no-scrollbar space-y-6 px-2 md:px-6">
          {messages.length === 0 && (
            <div className="text-center opacity-30 mt-20 animate-pulse">
              <p className="text-lg font-light tracking-widest uppercase">Initializing Neural Link...</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`p-4 md:p-5 rounded-3xl backdrop-blur-xl border max-w-[90%] md:max-w-[75%] shadow-xl ${
                m.role === 'user' 
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-900 dark:text-cyan-100 rounded-tr-md' 
                  : 'bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 rounded-tl-md'
              }`}>
                {m.type === 'image' ? (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={m.content} alt="Visual Output" className="w-full h-auto object-cover" />
                  </div>
                ) : (
                  <p className="leading-relaxed font-light text-base md:text-lg">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Dock */}
      <div className="z-30 p-6 md:p-10 flex flex-col items-center w-full">
         <div className="w-full max-w-4xl glass-panel p-2 flex gap-3 rounded-full items-center shadow-2xl transition-all border border-white/10 dark:bg-black/40">
            <button 
              onClick={startListening} 
              className={`ml-1 p-4 rounded-full transition-all duration-500 ${
                status === 'listening' 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'hover:bg-white/10 text-cyan-500'
              }`}
            >
              <Mic size={24}/>
            </button>
            
            <input 
              className="flex-1 bg-transparent border-none outline-none px-4 text-lg md:text-xl placeholder-slate-500 font-light"
              placeholder={status === 'listening' ? "I'm listening..." : "Ask Kyle anything..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            />

            <button className="hidden md:flex p-4 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
              <ImageIcon size={24}/>
            </button>
            
            <button 
              onClick={() => handleSend(input)} 
              className="p-4 rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 hover:scale-110 active:scale-95 transition-all"
            >
              <Send size={24}/>
            </button>
         </div>
         <p className="mt-4 text-[10px] tracking-[0.3em] uppercase opacity-30 font-bold">Kyle Distributed OS // Mostafa 2025</p>
      </div>
    </main>
  );
}
