// 1. TEXT GENERATION (Brain)
export async function askKyle(messages: any[]) {
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { 
            role: 'system', 
            content: 'You are KYLE (Knowledge Yielding Lifelike Engine). You are a futuristic AI assistant. You answer concisely. You have a dry, witty personality.' 
          },
          ...messages
        ],
        model: 'openai', 
        seed: 42,
      }),
    });
    
    if (!response.ok) throw new Error('API Error');
    return await response.text();
    
  } catch (error) {
    console.error(error);
    return "I cannot connect to my neural core right now.";
  }
}

// 2. IMAGE GENERATION (Vision)
export function generateImageUrl(prompt: string): string {
  const safePrompt = encodeURIComponent(prompt);
  // Using 'flux' model for best quality
  return `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&enhance=true&model=flux`;
}
