'use client';
import { useState, useRef, useEffect } from 'react';
import { 
  Send, Terminal as TerminalIcon, Mic, MicOff, 
  Play, Pause, SkipBack, SkipForward, Radio 
} from 'lucide-react';
import { askKyle } from '../lib/api';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Terminal({ onImageCommand }: { onImageCommand: (p: string) => void }) {
  // --- STATE ---
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Audio Player State (Restored)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);

  // Wake Word State
  const [isListening, setIsListening] = useState(false); // Is the mic strictly "Open"?
  const [wakeWordActive, setWakeWordActive] = useState(false); // Has "KYLE" been triggered?
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false); 
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading, currentSentenceIdx]);

  // --- AUDIO ENGINE (PLAYER) ---
  const processAndSpeak = (text: string) => {
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
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(sentence);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 1.0; utterance.rate = 1.0;

    utterance.onend = () => {
      // Auto-advance to next sentence
      playNextSentence();
    };

    window.speechSynthesis.speak(utterance);
  };

  const playNextSentence = () => {
    setSpeechQueue(prev => {
      setCurrentSentenceIdx(idx => {
        const nextIdx = idx + 1;
        if (nextIdx < prev.length) {
          speakSentence(prev[nextIdx]);
          return nextIdx;
        } else {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setWakeWordActive(false); // Reset wake word after interaction
          return 0;
        }
      });
      return prev;
    });
  };

  // --- PLAYER CONTROLS ---
  const handlePauseResume = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleSeek = (direction: 'prev' | 'next') => {
    window.speechSynthesis.cancel();
    let newIdx = direction === 'next' ? currentSentenceIdx + 1 : currentSentenceIdx - 1;
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= speechQueue.length) {
        setIsSpeaking(false); isSpeakingRef.current = false; return;
    }
    setCurrentSentenceIdx(newIdx);
    speakSentence(speechQueue[newIdx]);
    setIsPaused(false);
  };

  const forceStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setSpeechQueue([]);
  };

  // --- WAKE WORD ENGINE ("THE EAR") ---
  const startListening = () => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    if (!SpeechRecognitionAPI || recognitionRef.current) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true; // Use interim to catch "Kyle" faster
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const lastResultIdx = event.results.length - 1;
      const transcript = event.results[lastResultIdx][0].transcript.toLowerCase().trim();
      const isFinal = event.results[lastResultIdx].isFinal;

      // 1. WAKE WORD CHECK
      if (transcript.includes("kyle") || transcript.includes("coil") || transcript.includes("carl")) {
         if (!wakeWordActive) {
           setWakeWordActive(true);
           // If he's talking, shut him up
           if (isSpeakingRef.current) forceStop();
         }
      }

      // 2. PROCESS COMMAND (Only if active)
      if (wakeWordActive || isListening) { // "isListening" is manual override
         setInput(transcript);
         
         // If user stops talking (final result), send it
         if (isFinal && wakeWordActive) {
            // Strip the wake word out so we don't send "Kyle, hello" every time
            const cleanText = transcript.replace(/kyle|coil|carl/gi, "").trim();
            if (cleanText.length > 0) {
              handleSend(cleanText);
            }
         }
      }
    };

    recognition.onend = () => {
      // Auto-restart listener (Forever loop)
      recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    // Reset Input
    setInput('');
    setWakeWordActive(false); // Go back to sleep/passive mode
    
    const userMsg = { role: 'user', content: textToSend };
    setHistory(prev => [...prev, userMsg]);
    setLoading(true);

    if (textToSend.toLowerCase().startsWith('/image') || textToSend.toLowerCase().includes('generate image')) {
       const prompt = textToSend.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || textToSend);
       const reply = `Generating visual: ${prompt}`;
       setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
       processAndSpeak(reply);
       setLoading(false);
       return;
    }

    try {
      const response = await askKyle([...historyRef.current, userMsg]);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      processAndSpeak(response); 
    } catch (e) {
      setHistory(prev => [...prev, { role: 'assistant', content: "Network Failure." }]);
    } finally {
      setLoading(false);
    }
  };

  // Start listening on mount (optional, or wait for user click)
  // useEffect(() => { startListening() }, []); 

  return (
    <div className="flex flex-col h-full font-mono text-sm relative">
      
      {/* HEADER: Media Player (Restored) */}
      <div className={`absolute top-0 left-0 w-full p-2 z-20 flex justify-between items-center transition-all duration-300 ${isSpeaking ? 'bg-green-900/40 border-b border-green-500' : 'bg-transparent'}`}>
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full transition-colors ${wakeWordActive ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : (isListening ? 'bg-green-500' : 'bg-gray-500')}`}></div>
           <span className="text-[10px] uppercase tracking-widest text-green-100">
             {wakeWordActive ? "LISTENING..." : (isListening ? "PASSIVE MODE" : "OFFLINE")}
           </span>
        </div>

        {/* Player Controls */}
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <button onClick={() => handleSeek('prev')} className="p-1 text-neon-green hover:text-white"><SkipBack size={18}/></button>
           <button onClick={handlePauseResume} className="p-1 text-neon-green hover:text-white">
             {isPaused ? <Play size={18}/> : <Pause size={18}/>}
           </button>
           <button onClick={() => handleSeek('next')} className="p-1 text-neon-green hover:text-white"><SkipForward size={18}/></button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 pt-12 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-20 text-center flex flex-col items-center">
            <Radio className={`mb-4 ${isListening ? 'text-neon-green animate-pulse' : 'text-gray-600'}`} size={48} />
            <p className="text-lg text-neon-green tracking-widest">KYLE OS v1.5</p>
            <p className="text-xs text-gray-500 mt-2">SAY "KYLE" TO WAKE UP</p>
            <button 
              onClick={startListening}
              className="mt-4 px-4 py-2 border border-green-800 text-green-500 rounded hover:bg-green-900/20 text-xs"
            >
              INITIALIZE AUDIO SENSORS
            </button>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg border ${msg.role === 'user' ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-transparent border-none text-neon-green'}`}>
              <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
              {/* Highlight Progress Bar */}
              {msg.role === 'assistant' && i === history.length - 1 && isSpeaking && (
                 <div className="mt-2 h-1 w-full bg-green-900/30 rounded overflow-hidden">
                    <div className="h-full bg-neon-green transition-all duration-300" style={{ width: `${((currentSentenceIdx + 1) / speechQueue.length) * 100}%` }}></div>
                 </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-neon-green animate-pulse text-xs pl-2">&gt; PROCESSING...</div>}
        <div ref={scrollRef} />
      </div>

      {/* INPUT BAR */}
      <div className="mt-2 border-t border-green-900/50 pt-2 flex gap-2 items-center bg-black/80 p-2">
        <span className={`text-neon-green ${wakeWordActive ? 'animate-bounce' : ''}`}>&gt;</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-green-100 focus:outline-none placeholder-green-900 text-base"
          placeholder={wakeWordActive ? "Listening to command..." : "Say 'Kyle'..."}
        />
        
        <button 
          onClick={startListening} 
          className={`p-3 rounded-full transition-all duration-300 ${wakeWordActive ? 'bg-red-600 text-white shadow-[0_0_15px_red]' : (isListening ? 'text-neon-green bg-green-900/20' : 'text-gray-500')}`}
        >
          {wakeWordActive ? <Mic size={20} /> : (isListening ? <Mic size={20} /> : <MicOff size={20} />)}
        </button>
      </div>
    </div>
  );
}
