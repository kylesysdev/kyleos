'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Send, Image as ImageIcon, 
  Play, Pause, SkipBack, SkipForward, 
  MoreHorizontal, Command, Sparkles, StopCircle
} from 'lucide-react';
import { askKyle, generateImageUrl } from '../lib/api';

// --- TYPES ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image'; // Support for image cards
  timestamp: number;
};

// --- MAIN COMPONENT ---
export default function KyleOS() {
  // UI State
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Audio State
  const [isListening, setIsListening] = useState(false); // Mic Status
  const [wakeWordActive, setWakeWordActive] = useState(false); // "Kyle" detected?
  const [isSpeaking, setIsSpeaking] = useState(false); // TTS Status
  const [isPaused, setIsPaused] = useState(false);
  
  // Media Player Logic
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false); 
  const messagesRef = useRef(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  messagesRef.current = messages;

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentSentenceIdx]);

  // Initialize Wake Word on Load (Optional, usually requires click first)
  // useEffect(() => { startListening() }, []);

  // --- 1. CORE INTELLIGENCE ---
  
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Add User Message
    const newUserMsg: Message = { role: 'user', content: text, type: 'text', timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);
    setWakeWordActive(false); // Reset wake status

    // Check for Image Generation
    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().includes('generate image') || text.toLowerCase().includes('make a picture')) {
      const prompt = text.replace(/^\/image/i, '').replace(/generate image/i, '').replace(/make a picture/i, '').trim();
      
      const loadingMsg = "Designing your visual...";
      processAndSpeak(loadingMsg);
      
      // Simulate network delay for effect
      setTimeout(() => {
        const imgUrl = generateImageUrl(prompt);
        setMessages(prev => [...prev, { role: 'assistant', content: imgUrl, type: 'image', timestamp: Date.now() }]);
        setIsLoading(false);
        processAndSpeak("Here is the image you requested.");
      }, 2000);
      return;
    }

    // Normal Text
    try {
      // Filter out images for API history
      const apiHistory = messagesRef.current
        .filter(m => m.type === 'text')
        .map(m => ({ role: m.role, content: m.content }));
        
      const response = await askKyle([...apiHistory, { role: 'user', content: text }]);
      
      const newAiMsg: Message = { role: 'assistant', content: response, type: 'text', timestamp: Date.now() };
      setMessages(prev => [...prev, newAiMsg]);
      
      processAndSpeak(response);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. AUDIO ENGINE (TTS PLAYER) ---

  const processAndSpeak = (text: string) => {
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Split into sentences for seeking
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
    // Select Voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English'));
    if (preferred) utterance.voice = preferred;
    
    utterance.rate = 1.05; // Slightly modern pace
    
    utterance.onend = () => {
       playNextSentence();
    };
    
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
      setIsPaused(true); // Native pause is buggy, we use cancel + logic
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

  // --- 3. WAKE WORD ENGINE ("THE EAR") ---

  const startListening = () => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Api = SpeechRecognition || webkitSpeechRecognition;
    if (!Api || recognitionRef.current) return;

    const recognition = new Api();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
        // Auto-restart for "Always On" feel
        recognition.start(); 
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase().trim();
      const isFinal = result.isFinal;

      // Wake Word Logic
      if (transcript.includes('kyle') || transcript.includes('hey kyle')) {
        setWakeWordActive(true);
        if (isSpeakingRef.current) handlePlayerControl('stop'); // Interrupt
      }

      if (wakeWordActive || isListening) {
        if (isFinal && wakeWordActive) {
          // Command complete
          const cleanText = transcript.replace(/hey|kyle/gi, '').trim();
          if (cleanText) handleSend(cleanText);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- RENDER ---
  return (
    <main className="flex h-screen w-screen bg-black text-white relative overflow-hidden">
      
      {/* BACKGROUND AMBIENCE */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />

      {/* --- SIDEBAR (History / Status) --- */}
      <div className="hidden md:flex w-64 flex-col glass-panel m-4 rounded-2xl p-4 z-10">
        <div className="flex items-center gap-2 mb-8">
           <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
             <Sparkles size={16} className="text-apple-blue" />
           </div>
           <span className="font-semibold tracking-wide">KyleOS 2.0</span>
        </div>
        
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">System Status</p>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-300">{isListening ? "Sensors Online" : "Offline"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wakeWordActive ? 'bg-apple-blue shadow-[0_0_8px_#0A84FF] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm text-gray-300">{wakeWordActive ? "Listening..." : "Passive Mode"}</span>
          </div>
        </div>

        <button 
           onClick={startListening}
           className="w-full py-3 rounded-xl glass-button flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isListening ? "Reboot Sensors" : "Initialize System"}
        </button>
      </div>

      {/* --- MAIN STAGE --- */}
      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {/* TOP BAR (Media Player) */}
        <div className={`h-16 flex items-center justify-between px-8 transition-all duration-500 ${isSpeaking ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
           <div className="flex items-center gap-4 glass-panel px-6 py-2 rounded-full mx-auto">
              <button onClick={() => handlePlayerControl('prev')}><SkipBack size={20} className="hover:text-apple-blue transition-colors"/></button>
              <button onClick={() => handlePlayerControl(isPaused ? 'resume' : 'pause')}>
                {isPaused ? <Play size={24} className="text-apple-blue"/> : <Pause size={24} className="text-apple-blue"/>}
              </button>
              <button onClick={() => handlePlayerControl('next')}><SkipForward size={20} className="hover:text-apple-blue transition-colors"/></button>
              <div className="w-px h-4 bg-white/20 mx-2" />
              <button onClick={() => handlePlayerControl('stop')}><StopCircle size={20} className="text-apple-red hover:scale-110 transition-transform"/></button>
           </div>
        </div>

        {/* CHAT CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Command size={64} strokeWidth={1} />
              <p className="mt-4 text-xl font-light">How can I help you, Mostafa?</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div 
                 className={`max-w-[80%] md:max-w-[60%] p-4 rounded-2xl backdrop-blur-md shadow-lg transition-all duration-300 ${
                   msg.role === 'user' 
                     ? 'bg-apple-blue text-white rounded-tr-sm' 
                     : 'bg-white/10 border border-white/10 rounded-tl-sm hover:bg-white/15'
                 }`}
               >
                 {msg.type === 'text' ? (
                   <div className="leading-relaxed">
                     {msg.content}
                     {/* Highlight Sentence */}
                     {msg.role === 'assistant' && isSpeaking && idx === messages.length - 1 && (
                       <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-apple-blue transition-all duration-500" 
                           style={{ width: `${((currentSentenceIdx + 1) / speechQueue.length) * 100}%` }} 
                         />
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="group relative overflow-hidden rounded-xl">
                     <img src={msg.content} alt="Generated" className="w-full h-auto object-cover" />
                     <div className="absolute bottom-0 left-0 w-full p-2 bg-black/60 backdrop-blur-sm text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                       Generated by Flux
                     </div>
                   </div>
                 )}
               </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white/5 px-4 py-2 rounded-full flex gap-2 items-center">
                 <div className="w-2 h-2 bg-apple-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 bg-apple-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 bg-apple-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 md:p-8 pt-0">
          <div className={`glass-input rounded-2xl p-2 flex items-center gap-2 transition-all duration-300 ${wakeWordActive ? 'shadow-[0_0_20px_rgba(10,132,255,0.3)] border-apple-blue' : ''}`}>
             
             <button 
               onClick={startListening}
               className={`p-3 rounded-xl transition-all ${wakeWordActive ? 'bg-apple-red text-white animate-pulse' : 'hover:bg-white/10 text-gray-400'}`}
             >
               {wakeWordActive ? <Mic size={20} /> : <MicOff size={20} />}
             </button>

             <input 
               className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 px-2"
               placeholder={wakeWordActive ? "Listening..." : "Type a message or say 'Kyle'..."}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
             />

             <button className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
               <ImageIcon size={20} />
             </button>
             
             <button 
               onClick={() => handleSend(input)}
               className="p-3 bg-apple-blue hover:bg-blue-600 text-white rounded-xl transition-transform hover:scale-105 active:scale-95"
             >
               <Send size={20} />
             </button>
          </div>
          <div className="text-center mt-2">
             <span className="text-[10px] text-gray-600 tracking-widest uppercase">KyleOS v2.0 // Vision Edition</span>
          </div>
        </div>

      </div>
    </main>
  );
}
