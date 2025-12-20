'use client';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { generateImageUrl } from '../lib/api';
import { useState, useEffect } from 'react';

export default function Visualizer({ prompt }: { prompt: string | null }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (prompt) {
      setLoading(true);
      // We set the URL immediately, but the image takes time to load over network
      setImageUrl(generateImageUrl(prompt));
    }
  }, [prompt]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  if (!prompt) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-cyan-900/50">
        <ImageIcon size={64} strokeWidth={1} />
        <p className="mt-4 text-xs tracking-widest">NO_SIGNAL</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
           <div className="flex flex-col items-center">
             <Loader2 className="animate-spin text-neon-blue mb-2" />
             <span className="text-xs text-cyan-400">RENDERING...</span>
           </div>
        </div>
      )}
      
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt="Generated" 
          onLoad={handleImageLoad}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      
      {/* HUD Overlay */}
      <div className="absolute bottom-0 left-0 w-full bg-black/80 border-t border-cyan-500 p-2 backdrop-blur-md">
        <p className="text-xs text-cyan-300 font-mono truncate">&gt; INPUT: {prompt}</p>
      </div>
    </div>
  );
}
