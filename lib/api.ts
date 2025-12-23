// THE BRAIN (Text)
export async function askKyle(messages: any[]) {
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { 
            role: 'system', 
            content: 'You are KYLE (Knowledge Yielding Lifelike Engine). You are a sophisticated, helpful AI assistant. You answer concisely. You can generate code, write poems, and answer complex questions.' 
          },
          ...messages
        ],
        model: 'openai', 
        seed: 42,
      }),
    });
    return await response.text();
  } catch (error) {
    return "I am having trouble connecting to the neural cloud.";
  }
}

// THE EYE (Images)
export function generateImageUrl(prompt: string): string {
  const safePrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&enhance=true&model=flux`;
}
