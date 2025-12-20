'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Terminal as TerminalIcon, Mic, MicOff, Volume2, VolumeX, Repeat } from 'lucide-react';
import { askKyle } from '../lib/api';

// Fix for browser speech recognition types
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Terminal({ onImageCommand }: { onImageCommand: (p: string) => void }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ref to keep track of history inside the speech callback
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // --- VOICE OUTPUT (TTS) ---
  const speak = (text: string) => {
    if (isMuted || typeof window === 'undefined') return;
    
    // Stop previous speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a good English voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 0.9; 
    utterance.rate = 1.1;

    // CONTINUOUS MODE: Start listening again after Kyle finishes speaking
    if (continuousMode) {
      utterance.onend = () => {
        setTimeout(() => startListening(), 500); // Small pause before listening
      };
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // --- VOICE INPUT (STT) ---
  const startListening = () => {
    if (typeof window === 'undefined') return;
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice control requires Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // AUTO-SEND: Immediately send what was heard
        handleSend(transcript); 
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', content: textToSend };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Image Command Check
    if (textToSend.toLowerCase().startsWith('/image') || textToSend.toLowerCase().includes('generate image')) {
       const prompt = textToSend.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || textToSend);
       
       const responseText = `[FLUX ENGINE] Generating visual: "${prompt}"`;
       setHistory(prev => [...prev, { role: 'assistant', content: responseText }]);
       speak("Generating image now.");
       
       setLoading(false);
       return;
    }

    // AI Text Request
    try {
      // Use historyRef to ensure we have the latest context
      const response = await askKyle([...historyRef.current, userMsg]);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      speak(response);
    } catch (error) {
      setHistory(prev => [...prev, { role: 'assistant', content: "ERROR: Connection interrupted." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm relative">
      {/* Top Controls */}
      <div className="absolute top-0 right-0 p-2 z-10 flex gap-2">
        <button 
          onClick={() => setContinuousMode(!continuousMode)}
          className={`p-1 rounded transition-colors ${continuousMode ? 'text-neon-green animate-pulse border border-green-500' : 'text-gray-600 hover:text-green-500'}`}
          title={continuousMode ? "Continuous Mode: ON" : "Continuous Mode: OFF"}
        >
          <Repeat size={16} />
        </button>
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-1 rounded hover:bg-green-900/30 transition-colors ${isMuted ? 'text-gray-500' : 'text-neon-green'}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-10 text-center flex flex-col items-center">
            <TerminalIcon className="mb-2 opacity-50" size={32} />
            <p>KYLE OS v1.2</p>
            <p className="text-[10px] mt-2 tracking-widest uppercase">
              {continuousMode ? "Continuous Voice Active" : "Awaiting Input"}
            </p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-2 rounded border ${msg.role === 'user' ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-transparent border-none text-neon-green'}`}>
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        
        {loading && (
           <div className="text-neon-green animate-pulse text-xs">&gt; THINKING...</div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Bar */}
      <div className="mt-2 border-t border-green-900/50 pt-2 flex gap-2 items-center">
        <span className="text-neon-green py-3 pl-2">&gt;</span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-green-100 focus:outline-none placeholder-green-900"
          placeholder={continuousMode ? "Listening..." : "Type or click Mic..."}
          autoComplete="off"
        />
        
        <button 
          onClick={startListening} 
          className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse border border-red-500' : 'text-neon-green hover:bg-green-900/30'}`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button onClick={() => handleSend()} className="px-4 text-neon-green hover:text-white transition-colors">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
