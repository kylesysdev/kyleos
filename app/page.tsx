'use client';
import { useState, useEffect, useRef } from 'react';
import { aiService } from '@/services/gemini';
import { MemoryBank } from '@/lib/memory';
import OrbFace from '@/components/OrbFace';
import { Mic, Send, Trash2, Sparkles } from 'lucide-react';

export default function NeuralPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. NEURAL BOOT (Fixes Hydration Error)
  useEffect(() => {
    const saved = MemoryBank.load();
    if (saved) setMessages(saved);
  }, []);

  // 2. MEMORY SYNC
  useEffect(() => {
    MemoryBank.save(messages);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: text, type: 'text' }]);
    setInput('');
    
    try {
      setStatus('speaking');
      const res = await aiService.process(messages, text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.content, type: res.type }]);
      
      if (res.type === 'text') {
        const speech = new SpeechSynthesisUtterance(res.content);
        speech.onend = () => setStatus('idle');
        window.speechSynthesis.speak(speech);
      } else {
        setStatus('idle');
      }
    } catch (e: any) {
      setStatus('idle');
      // 3. NEURAL ERROR HANDLING
      setError("Neural Link Error: I cannot reach my core brain right now.");
    }
  };

  // ... (Keep your existing startListening and UI code here)
}
