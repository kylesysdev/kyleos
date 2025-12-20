'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Terminal as TerminalIcon, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { askKyle } from '../lib/api';

// Definition for the browser's speech recognition
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Terminal({ onImageCommand }: { onImageCommand: (p: string) => void }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Default to sound ON
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // --- VOICE 1: SPEAKING (TTS) ---
  const speak = (text: string) => {
    if (isMuted || typeof window === 'undefined') return;
    
    // Stop any previous speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a "computer" or "male" voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 0.9; // Slightly lower pitch for Jarvis feel
    utterance.rate = 1.1;  // Slightly faster
    window.speechSynthesis.speak(utterance);
  };

  // --- VOICE 2: LISTENING (STT) ---
  const startListening = () => {
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice control not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Optional: Auto-send after speaking? 
      // handleSend(transcript); 
    };

    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', content: textToSend };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Command Parsing
    if (textToSend.toLowerCase().startsWith('/image') || textToSend.toLowerCase().includes('generate image')) {
       const prompt = textToSend.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || textToSend);
       const responseMsg = `[COMMAND ACCEPTED] Rerouting to Flux Engine: "${prompt || textToSend}"`;
       setHistory(prev => [...prev, { role: 'assistant', content: responseMsg }]);
       speak("Rendering visual data.");
       setLoading(false);
       return;
    }

    // Normal Text
    try {
      const response = await askKyle([...history, userMsg]);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      speak(response); // <--- KYLE SPEAKS HERE
    } catch (e) {
      setHistory(prev => [...prev, { role: 'assistant', content: "ERROR: Network Connection Lost." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm relative">
      
      {/* Top Bar Controls */}
      <div className="absolute top-0 right-0 p-2 z-10">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-1 rounded hover:bg-green-900/30 transition-colors ${isMuted ? 'text-gray-500' : 'text-neon-green'}`}
          title={isMuted ? "Unmute System" : "Mute System"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-10 text-center">
            <TerminalIcon className="mx-auto mb-2 opacity-50" size={32} />
            <p>KYLE OS INITIALIZED...</p>
            <p className="text-xs mt-2">CLICK MIC OR TYPE</p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-2 rounded border ${msg.role === 'user' ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-transparent border-none text-neon-green'}`}>
              {msg.role === 'assistant' && <span className="mr-2 opacity-50 text-xs">KYLE:</span>}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        
        {loading && (
           <div className="text-neon-green animate-pulse text-xs">&gt; PROCESSING DATA STREAM...</div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="mt-2 border-t border-green-900/50 pt-2 flex gap-2 items-center">
        <span className="text-neon-green py-3 pl-2">&gt;</span>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-green-100 focus:outline-none placeholder-green-900"
          placeholder={isListening ? "Listening..." : "Type command..."}
          autoComplete="off"
        />

        {/* Microphone Button */}
        <button 
          onClick={startListening} 
          className={`p-2 rounded-full transition-all duration-300 ${isListening ? 'bg-red-900/50 text-red-500 animate-pulse border border-red-500' : 'text-neon-green hover:bg-green-900/30'}`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Send Button */}
        <button onClick={() => handleSend()} className="px-4 text-neon-green hover:text-white transition-colors">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
