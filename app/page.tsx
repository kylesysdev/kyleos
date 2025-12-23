'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Send, Image as ImageIcon, 
  Play, Pause, SkipBack, SkipForward, StopCircle,
  Sun, Moon, Sparkles, Menu, X, Terminal
} from 'lucide-react';
import { askKyle, generateImageUrl } from '../lib/api';

// --- BROWSER TYPES ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}
type Message = {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image'; 
};

export default function KyleOS() {
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Audio State
  const [isListening, setIsListening] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Player Logic
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false); 
  const historyRef = useRef(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Update ref when messages change (so the voice brain remembers context)
  historyRef.current = messages;

  // --- INITIALIZATION ---
  // Set Dark Mode by default on load
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Theme Toggle Effect
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Auto Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSpeaking]);

  // --- 1. AUDIO LISTENER (THE EAR) ---
  const startListening = () => {
    // Check browser support
    if (typeof window === 'undefined') return;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Api = SpeechRecognition || webkitSpeechRecognition;
    
    if (!Api) {
        alert("Your browser does not support Voice. Please use Chrome or Edge.");
        return;
    }
    
    // Prevent double-starting
    if (recognitionRef.current) return;

    const recognition = new Api();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    // Auto-restart if it stops (Always On)
    recognition.onend = () => { 
        if (isListening) recognition.start(); 
    }; 

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().trim();
      const isFinal = result.isFinal;

      // Wake Word Detection
      if (transcript.includes('kyle') || transcript.includes('hey kyle')) {
        setWakeWordActive(true);
        // If he is talking, shut him up
        if (isSpeakingRef.current) handlePlayerControl('stop'); 
      }

      // If Active, Process Command
      if (wakeWordActive || isListening) { // isListening serves as manual override
        if (isFinal && wakeWordActive) {
          const cleanText = transcript.replace(/hey|kyle/gi, '').trim();
          if (cleanText.length > 0) handleSend(cleanText);
        }
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- 2. TTS PLAYER (THE VOICE) ---
  const processAndSpeak = (text: string) => {
    window.speechSynthesis.cancel(); // Stop old audio
    
    // Split text into sentences for "Next/Prev" seeking
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
    
    setSpeechQueue(cleanSentences);
    setCurrentSentenceIdx(0);
    setIsPaused(false);
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    
    speakSentence(cleanSentences[0]);
  };

  const speakSentence = (sentence: string) => {
    if (typeof window === 'undefined') return;
    
    const utterance = new SpeechSynthesisUtterance(sentence);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a good voice
    const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferred) utterance.voice = preferred;
    
    utterance.rate = 1.05; // Slightly fast, modern
    utterance.onend = () => playNextSentence();
    
    window.speechSynthesis.speak(utterance);
  };

  const playNextSentence = () => {
    setSpeechQueue(prev => {
      setCurrentSentenceIdx(idx => {
        const next = idx + 1;
        if (next < prev.length) {
          speakSentence(prev[next]);
          return next;
        } else {
          // Finished paragraph
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          return 0;
        }
      });
      return prev;
    });
  };

  const handlePlayerControl = (action: 'pause' | 'resume' | 'prev' | 'next' | 'stop') => {
    window.speechSynthesis.cancel();
    
    if (action === 'stop') { 
        setIsSpeaking(false); 
        isSpeakingRef.current = false; 
        return; 
    }
    if (action === 'pause') { 
        setIsPaused(true); 
        return; 
    }
    if (action === 'resume') { 
        setIsPaused(false); 
        if (speechQueue[currentSentenceIdx]) speakSentence(speechQueue[currentSentenceIdx]); 
        return; 
    }
    
    let newIdx = currentSentenceIdx;
    if (action === 'next') newIdx++;
    if (action === 'prev') newIdx--;
    
    if (newIdx >= 0 && newIdx < speechQueue.length) {
      setCurrentSentenceIdx(newIdx);
      speakSentence(speechQueue[newIdx]);
      setIsPaused(false);
    } else {
      setIsSpeaking(false);
    }
  };

  // --- 3. MAIN BRAIN (LOGIC) ---
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const newUserMsg: Message = { role: 'user', content: text, type: 'text' };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setWakeWordActive(false); // Reset wake word after command received

    // IMAGE COMMAND CHECK
    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().includes('generate image')) {
      const prompt = text.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
      processAndSpeak("Designing visual.");
      
      // Add Loading state (implied by wait)
      const imgUrl = generateImageUrl(prompt);
      setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image' }]);
      return;
    }

    // TEXT COMMAND
    try {
      // Create context for API (Text only)
      const context = historyRef.current
        .filter(m => m.type === 'text')
        .map(m => ({ role: m.role, content: m.content }));
      
      const response = await askKyle([...context, { role: 'user', content: text }]);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response, type: 'text' }]);
      processAndSpeak(response);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Connection Lost.", type: 'text' }]);
    }
  };

  // --- RENDER ---
  return (
    <main className="flex h-screen w-screen overflow-hidden text-sm md:text-base relative font-sans selection:bg-kyle-green selection:text-black">
      
      {/* MOBILE MENU (Overlay) */}
      {isMobileMenuOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center space-y-8 animate-in fade-in">
           <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 text-white"><X size={32}/></button>
           <h2 className="text-3xl font-bold text-kyle-green tracking-tighter">KYLE OS</h2>
           <button onClick={() => { startListening(); setIsMobileMenuOpen(false); }} className="px-8 py-4 glass rounded-full text-white font-bold">
             REBOOT SENSORS
           </button>
           <div className="flex gap-6">
              <button onClick={() => setTheme('light')} className="p-4 bg-white text-black rounded-full"><Sun size={24}/></button>
              <button onClick={() => setTheme('dark')} className="p-4 bg-gray-900 text-white rounded-full border border-gray-700"><Moon size={24}/></button>
           </div>
        </div>
      )}

      {/* --- LEFT SIDEBAR (Desktop) --- */}
      <div className="hidden md:flex w-80 glass m-6 rounded-3xl flex-col p-8 z-20 shadow-2xl">
        <div className="flex items-center gap-4 mb-12">
           <div className="w-12 h-12 bg-gradient-to-tr from-kyle-green to-kyle-blue rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.3)]">
             <Terminal className="text-black" size={24} />
           </div>
           <div>
             <h1 className="font-bold text-2xl tracking-tight">KYLE OS</h1>
             <p className="text-xs opacity-50 font-mono">PRISM v3.0</p>
           </div>
        </div>
        
        {/* Status Panels */}
        <div className="space-y-4 mb-auto">
           {/* Sensor Status */}
           <div className={`p-4 rounded-2xl border transition-all duration-500 ${isListening ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Microphone</p>
              <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                 <span className="font-bold tracking-wide">{isListening ? "ONLINE" : "OFFLINE"}</span>
              </div>
           </div>
           
           {/* Wake Word Status */}
           <div className={`p-4 rounded-2xl border transition-all duration-300 ${wakeWordActive ? 'bg-kyle-blue/20 border-kyle-blue/50 shadow-[0_0_20px_rgba(0,243,255,0.1)]' : 'bg-white/5 border-white/5'}`}>
              <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">AI Status</p>
              <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${wakeWordActive ? 'bg-kyle-blue animate-ping' : 'bg-gray-500'}`} />
                 <span className="font-bold tracking-wide">{wakeWordActive ? "LISTENING..." : "PASSIVE"}</span>
              </div>
           </div>
        </div>

        {/* Theme Switcher */}
        <div className="flex bg-black/20 rounded-full p-1.5 border border-white/5 mb-4">
           <button onClick={() => setTheme('light')} className={`flex-1 py-2.5 rounded-full flex justify-center transition-all ${theme === 'light' ? 'bg-white text-black shadow-lg' : 'opacity-40 hover:opacity-100'}`}><Sun size={18}/></button>
           <button onClick={() => setTheme('dark')} className={`flex-1 py-2.5 rounded-full flex justify-center transition-all ${theme === 'dark' ? 'bg-gray-800 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}><Moon size={18}/></button>
        </div>
        
        <button onClick={startListening} className="py-4 bg-gradient-to-r from-kyle-green to-kyle-blue text-black font-bold rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg">
           INITIALIZE SYSTEM
        </button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col relative z-10 h-full">
        
        {/* Top Bar */}
        <div className="h-20 flex items-center justify-between px-6 md:px-10">
           <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-3 glass rounded-xl"><Menu/></button>
           
           {/* Floating Media Player */}
           <div className={`mx-auto glass px-8 py-3 rounded-full flex items-center gap-6 transition-all duration-500 shadow-2xl ${isSpeaking ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
              <button onClick={() => handlePlayerControl('prev')} className="hover:text-kyle-green"><SkipBack size={20}/></button>
              <button onClick={() => handlePlayerControl(isPaused ? 'resume' : 'pause')} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                {isPaused ? <Play size={20} className="ml-1 text-kyle-green"/> : <Pause size={20} className="text-kyle-green"/>}
              </button>
              <button onClick={() => handlePlayerControl('next')} className="hover:text-kyle-green"><SkipForward size={20}/></button>
              <div className="w-px h-6 bg-white/20" />
              <button onClick={() => handlePlayerControl('stop')} className="text-red-400 hover:text-red-500"><StopCircle size={22}/></button>
           </div>
        </div>

        {/* --- THE FACE (ANIMATED ORB) --- */}
        {/* Only visible when chat is empty OR listening active */}
        {messages.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
              {/* Outer Glow */}
              <div className={`w-48 h-48 rounded-full blur-3xl transition-all duration-1000
                 ${isSpeaking ? 'bg-kyle-blue/60 animate-speak scale-125' : 
                   wakeWordActive ? 'bg-kyle-green/60 animate-listen scale-110' : 
                   'bg-gray-500/10 animate-breath'} 
              `}></div>
              
              {/* The Core Orb */}
              <div className="w-32 h-32 glass rounded-full flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.2)]">
                 <div className={`w-3 h-3 rounded-full bg-white transition-all duration-300 ${isSpeaking ? 'h-12 w-12 rounded-xl bg-kyle-blue' : (wakeWordActive ? 'bg-kyle-green scale-150' : '')}`} />
              </div>
              
              <p className="mt-12 font-mono text-xs opacity-40 tracking-[0.3em]">SYSTEM ONLINE</p>
           </div>
        )}

        {/* CHAT MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 no-scrollbar z-10">
           {messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[60%] p-5 rounded-3xl backdrop-blur-xl border shadow-lg transition-all ${
                  msg.role === 'user' 
                    ? 'bg-kyle-blue/20 border-kyle-blue/30 text-white rounded-tr-md' 
                    : 'bg-white/5 border-white/10 text-white rounded-tl-md'
                }`}>
                   {msg.type === 'image' ? (
                     <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <img src={msg.content} alt="Generated" className="w-full h-auto"/>
                     </div>
                   ) : (
                     <div>
                       <p className="leading-relaxed text-lg font-light">{msg.content}</p>
                       {/* Sentence Progress Bar */}
                       {msg.role === 'assistant' && isSpeaking && idx === messages.length - 1 && (
                         <div className="mt-3 h-1 w-full bg-black/20 rounded-full overflow-hidden">
                           <div className="h-full bg-kyle-green transition-all duration-300" style={{ width: `${((currentSentenceIdx + 1) / speechQueue.length) * 100}%` }} />
                         </div>
                       )}
                     </div>
                   )}
                </div>
             </div>
           ))}
           <div ref={scrollRef} />
        </div>

        {/* INPUT BAR */}
        <div className="p-4 md:p-8 pt-2 z-20">
           <div className={`glass p-3 rounded-[2rem] flex items-center gap-3 transition-all duration-500 ${wakeWordActive ? 'shadow-[0_0_40px_rgba(0,255,65,0.15)] border-kyle-green/40' : 'hover:border-white/30'}`}>
              
              {/* Mic Button */}
              <button 
                onClick={startListening} 
                className={`p-4 rounded-full transition-all duration-300 ${wakeWordActive ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
              >
                 {wakeWordActive ? <Mic size={22} /> : <MicOff size={22}/>}
              </button>
              
              <input 
                className="flex-1 bg-transparent border-none outline-none px-2 placeholder-gray-500 text-lg"
                placeholder={wakeWordActive ? "Listening..." : "Type or say 'Kyle'..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              />

              <button className="p-4 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <ImageIcon size={22}/>
              </button>
              
              <button 
                onClick={() => handleSend(input)} 
                className="p-4 bg-gradient-to-tr from-kyle-green to-kyle-blue text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)]"
              >
                <Send size={22} strokeWidth={2.5} />
              </button>
           </div>
        </div>

      </div>
    </main>
  );
}
