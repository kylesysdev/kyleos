'use client';
import { useState, useRef, useEffect } from 'react';
import { 
  Send, Terminal as TerminalIcon, Mic, MicOff, 
  Play, Square, Repeat, Volume2 
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
  
  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false); // Ref for instant access inside event listeners
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // --- AUDIO ENGINE ---

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    
    // Cancel old audio
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 1.0; 
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  };

  // --- VOICE RECOGNITION (The "Ear") ---

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setContinuousMode(false); // Manual stop kills continuous mode
  };

  const startListening = () => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // Prevent duplicates
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // TRUE = Keep listening forever (until we stop it)
    recognition.interimResults = false; 
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      // If continuous mode is on, forcefully restart the ear if it dies
      if (continuousMode) {
        try { recognition.start(); } catch(e) {} 
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognition.onresult = (event: any) => {
      // Get the latest transcript
      const lastResultIdx = event.results.length - 1;
      const transcript = event.results[lastResultIdx][0].transcript.trim();
      
      if (!transcript) return;

      // --- BARGE-IN LOGIC ---
      // If Kyle is speaking, and we hear input, SHUT HIM UP.
      if (isSpeakingRef.current) {
        stopSpeaking(); // <--- This interrupts him mid-sentence
      }

      setInput(transcript);
      handleSend(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Toggle Continuous Mode
  const toggleContinuous = () => {
    const newState = !continuousMode;
    setContinuousMode(newState);
    if (newState && !isListening) {
      startListening();
    }
  };

  // --- BRAIN ---

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    // We do NOT stop listening here anymore. The ear stays open.

    const userMsg = { role: 'user', content: textToSend };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Image Check
    if (textToSend.toLowerCase().startsWith('/image') || textToSend.toLowerCase().includes('generate image')) {
       const prompt = textToSend.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || textToSend);
       const reply = `Generating image: ${prompt}`;
       setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
       speak(reply);
       setLoading(false);
       return;
    }

    try {
      const response = await askKyle([...historyRef.current, userMsg]);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      speak(response); 
    } catch (e) {
      setHistory(prev => [...prev, { role: 'assistant', content: "Connection Error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm relative">
      
      {/* STATUS BAR */}
      <div className="absolute top-0 right-0 p-2 z-10 flex gap-2">
         {/* Continuous Toggle */}
        <button 
          onClick={toggleContinuous}
          className={`px-2 py-1 rounded text-xs border transition-all flex items-center gap-1 ${continuousMode ? 'bg-green-900/40 border-neon-green text-neon-green' : 'border-gray-700 text-gray-500'}`}
        >
          <Repeat size={12} />
          {continuousMode ? "HANDS-FREE ON" : "HANDS-FREE OFF"}
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 pt-8 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-20 text-center flex flex-col items-center">
            <TerminalIcon className="mb-4 opacity-30" size={48} />
            <p className="text-lg text-neon-green tracking-widest">KYLE OS v1.4</p>
            <p className="text-xs text-gray-600 mt-2">DUPLEX AUDIO SYSTEM</p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            
            {/* Message Bubble */}
            <div className={`max-w-[85%] relative p-3 rounded-lg border ${msg.role === 'user' ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-transparent border-none text-neon-green'}`}>
              <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
              
              {/* REPLAY BUTTON (Shows on hover or always on mobile) */}
              {msg.role === 'assistant' && (
                <button 
                  onClick={() => speak(msg.content)}
                  className="absolute -right-8 top-0 p-2 text-gray-600 hover:text-neon-green opacity-50 hover:opacity-100 transition-opacity"
                  title="Replay Audio"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-neon-green animate-pulse text-xs pl-2">&gt; PROCESSING...</div>}
        <div ref={scrollRef} />
      </div>

      {/* INPUT BAR */}
      <div className="mt-2 border-t border-green-900/50 pt-2 flex gap-2 items-center bg-black/80 p-2">
        <span className="text-neon-green animate-pulse">&gt;</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-green-100 focus:outline-none placeholder-green-900 text-base"
          placeholder={continuousMode ? "Listening..." : "Type command..."}
        />
        
        {/* Main Mic/Stop Button */}
        <button 
          onClick={isSpeaking ? stopSpeaking : toggleListening} 
          className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-900/20 text-red-500 border border-red-900 animate-pulse' : 'text-neon-green hover:bg-green-900/30'}`}
        >
          {isSpeaking ? <Square size={20} fill="currentColor" /> : (isListening ? <MicOff size={20} /> : <Mic size={20} />)}
        </button>
      </div>
    </div>
  );
}
