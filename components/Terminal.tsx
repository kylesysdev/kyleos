'use client';
import { useState, useRef, useEffect } from 'react';
import { 
  Send, Terminal as TerminalIcon, Mic, MicOff, 
  Play, Pause, SkipBack, SkipForward, Square, Repeat 
} from 'lucide-react';
import { askKyle } from '../lib/api';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function Terminal({ onImageCommand }: { onImageCommand: (p: string) => void }) {
  // Chat State
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Audio Player State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef(history); // For accessing history inside callbacks
  historyRef.current = history;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading, currentSentenceIdx]);

  // --- AUDIO ENGINE: PLAYER LOGIC ---
  
  const processAndSpeak = (text: string) => {
    // 1. Split text into sentences for "Seeking" ability
    // Split by dots, exclamation, questions, but keep the punctuation.
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
    
    setSpeechQueue(cleanSentences);
    setCurrentSentenceIdx(0);
    setIsPaused(false);
    setIsSpeaking(true);
    
    // Start speaking the first sentence
    speakSentence(cleanSentences[0]);
  };

  const speakSentence = (sentence: string) => {
    if (typeof window === 'undefined') return;
    
    // Cancel any current audio
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(sentence);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 0.9;
    utterance.rate = 1.0;

    utterance.onend = () => {
      // When sentence finishes, play next one
      playNextSentence();
    };

    window.speechSynthesis.speak(utterance);
  };

  const playNextSentence = () => {
    setSpeechQueue(prevQueue => {
      setCurrentSentenceIdx(prevIdx => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < prevQueue.length) {
          // Play next
          speakSentence(prevQueue[nextIdx]);
          return nextIdx;
        } else {
          // Finished entire paragraph
          setIsSpeaking(false);
          setSpeechQueue([]);
          // CONTINUOUS MODE: Start listening again now that Kyle is done
          if (continuousMode) {
             startListening();
          }
          return 0;
        }
      });
      return prevQueue; // Return same queue, just needed access to it
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
    
    // Bounds check
    if (newIdx < 0) newIdx = 0;
    if (newIdx >= speechQueue.length) {
        setIsSpeaking(false); // End of list
        return;
    }

    setCurrentSentenceIdx(newIdx);
    speakSentence(speechQueue[newIdx]);
    setIsPaused(false);
  };

  const handleInterrupt = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeechQueue([]);
    // Immediately start listening for user command
    startListening(); 
  };

  // --- VOICE RECOGNITION (Input) ---

  const startListening = () => {
    if (typeof window === 'undefined') return;
    
    // Don't listen if Kyle is talking (Echo prevention)
    if (isSpeaking && !isPaused) return;

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionAPI = SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    // Prevent multiple instances
    if (isListening) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; // We use auto-restart manually
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript); // Auto-send on silence
    };

    recognition.onend = () => {
      setIsListening(false);
      // If continuous mode is on BUT we didn't get a result (just silence), restart? 
      // Usually better to wait for user trigger to avoid loops, but user asked for "Conversation Style".
      // We only restart if Kyle isn't about to speak.
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    // Stop listening while processing
    if (recognitionRef.current) recognitionRef.current.stop();

    const userMsg = { role: 'user', content: textToSend };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Check Image Command
    if (textToSend.toLowerCase().startsWith('/image') || textToSend.toLowerCase().includes('generate image')) {
       const prompt = textToSend.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || textToSend);
       setHistory(prev => [...prev, { role: 'assistant', content: `[FLUX] Generating: "${prompt}"` }]);
       processAndSpeak("I am generating that image for you now.");
       setLoading(false);
       return;
    }

    try {
      const response = await askKyle([...historyRef.current, userMsg]);
      setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      processAndSpeak(response); // Use new player engine
    } catch (e) {
      setHistory(prev => [...prev, { role: 'assistant', content: "Error connecting to AI." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm relative">
      
      {/* HEADER: Media Player & Controls */}
      <div className="absolute top-0 left-0 w-full p-2 z-20 flex justify-between items-center bg-black/40 backdrop-blur-sm border-b border-green-900/30">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setContinuousMode(!continuousMode)}
             className={`p-1.5 rounded transition-all ${continuousMode ? 'text-neon-green bg-green-900/20 border border-neon-green' : 'text-gray-500'}`}
             title="Hands-Free Loop"
           >
             <Repeat size={14} />
           </button>
           <span className="text-[10px] text-green-600 uppercase tracking-widest">
             {continuousMode ? "Hands-Free" : "Manual"}
           </span>
        </div>

        {/* Player Controls (Only show when active) */}
        <div className={`flex items-center gap-1 transition-opacity duration-300 ${isSpeaking || isPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <button onClick={() => handleSeek('prev')} className="p-1 text-neon-green hover:text-white"><SkipBack size={16}/></button>
           <button onClick={handlePauseResume} className="p-1 text-neon-green hover:text-white">
             {isPaused ? <Play size={16}/> : <Pause size={16}/>}
           </button>
           <button onClick={() => handleSeek('next')} className="p-1 text-neon-green hover:text-white"><SkipForward size={16}/></button>
           <button onClick={handleInterrupt} className="p-1 text-red-500 hover:text-red-400 ml-2" title="Interrupt"><Square size={16} fill="currentColor" /></button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 pt-12 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-20 text-center flex flex-col items-center">
            <TerminalIcon className="mb-4 opacity-30" size={48} />
            <p className="text-lg text-neon-green tracking-widest">KYLE OS v1.3</p>
            <p className="text-xs text-gray-600 mt-2">MEDIA ENGINE ONLINE</p>
          </div>
        )}
        
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg border ${msg.role === 'user' ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-transparent border-none text-neon-green'}`}>
              <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
              
              {/* Highlight current sentence being spoken */}
              {msg.role === 'assistant' && i === history.length - 1 && isSpeaking && (
                 <div className="mt-2 h-1 w-full bg-green-900/30 rounded overflow-hidden">
                    <div className="h-full bg-neon-green animate-progress" style={{ width: `${((currentSentenceIdx + 1) / speechQueue.length) * 100}%` }}></div>
                 </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-neon-green animate-pulse text-xs pl-2">&gt; GENERATING RESPONSE...</div>}
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
          placeholder={continuousMode ? "Listening automatically..." : "Type command..."}
        />
        
        <button 
          onClick={isSpeaking ? handleInterrupt : startListening} 
          className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-900/80 text-white animate-pulse shadow-[0_0_15px_#ff0000]' : 'text-neon-green hover:bg-green-900/30'}`}
        >
          {isListening ? <MicOff size={20} /> : (isSpeaking ? <Square size={20} fill="currentColor" className="text-red-500"/> : <Mic size={20} />)}
        </button>
      </div>
    </div>
  );
}
