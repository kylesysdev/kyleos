export const aiService = {
  async process(history: any[], input: string) {
    try {
      if (input.toLowerCase().startsWith('/image')) {
        const prompt = input.replace('/image', '').trim();
        return { 
          type: 'image', 
          content: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true&model=flux` 
        };
      }

      // Talk to our internal API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...history.filter(m => m.type !== 'image').map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            { role: "user", content: input }
          ]
        })
      });

      if (!response.ok) throw new Error("Neural Link Down");
      const data = await response.json();
      return { type: 'text', content: data.content };
    } catch (error) {
      console.error("Brain failed:", error);
      throw error;
    }
  }
};
