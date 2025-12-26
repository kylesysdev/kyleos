'use client';
import { useState, useEffect } from 'react';
import { Mic, Send, Trash2, Zap } from 'lucide-react';

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    try {
      setStatus('speaking');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      setStatus('idle');
    } catch (e) { setStatus('idle'); }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen w-full bg-black text-white p-4 flex flex-col">
      <div className="flex justify-between p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-cyan-400">KYLEOS 4.0</h1>
        <button onClick={() => setMessages([])}><Trash2 /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="p-3 rounded-2xl bg-white/10 max-w-[80%] border border-white/10">
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 flex gap-2">
        <button onClick={() => {}} className="p-4 bg-white/5 rounded-full text-green-400"><Mic /></button>
        <input 
          className="flex-1 bg-white/10 rounded-full px-6 outline-none border border-white/20"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend(input)}
          placeholder="Communicate..."
        />
        <button onClick={() => handleSend(input)} className="p-4 bg-cyan-500 rounded-full text-black"><Send /></button>
      </div>
    </main>
  );
}
