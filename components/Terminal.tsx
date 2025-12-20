'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Terminal as TerminalIcon } from 'lucide-react';
import { askKyle } from '../lib/api';

export default function Terminal({ onImageCommand }: { onImageCommand: (p: string) => void }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: string, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Command Parsing
    if (input.toLowerCase().startsWith('/image') || input.toLowerCase().includes('generate image')) {
       // Extract the prompt (remove the command part loosely)
       const prompt = input.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
       onImageCommand(prompt || input); // Fallback to full input if regex fails
       setHistory(prev => [...prev, { role: 'assistant', content: `[COMMAND ACCEPTED] Rerouting to Flux Engine: "${prompt || input}"` }]);
       setLoading(false);
       return;
    }

    // Normal Text
    const response = await askKyle([...history, userMsg]);
    setHistory(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full font-mono text-sm">
      <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-gray-500 mt-10 text-center">
            <TerminalIcon className="mx-auto mb-2 opacity-50" size={32} />
            <p>KYLE OS INITIALIZED...</p>
            <p>AWAITING INPUT</p>
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
           <div className="text-neon-green animate-pulse text-xs">> PROCESSING DATA STREAM...</div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="mt-2 border-t border-green-900/50 pt-2 flex gap-2">
        <span className="text-neon-green py-3 pl-2">></span>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-transparent text-green-100 focus:outline-none placeholder-green-900"
          placeholder="Type command..."
          autoComplete="off"
        />
        <button onClick={handleSend} className="px-4 text-neon-green hover:text-white transition-colors">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}