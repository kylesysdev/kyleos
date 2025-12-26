import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.NEXT_PUBLIC_GROQ_KEY,
  dangerouslyAllowBrowser: true 
});

export const aiService = {
  async process(history: any[], input: string) {
    try {
      // 1. Handle Images (Still using Pollinations)
      if (input.toLowerCase().startsWith('/image')) {
        const prompt = input.replace('/image', '').trim();
        return { 
          type: 'image', 
          content: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true&model=flux` 
        };
      }

      // 2. Chat with Llama 3 via Groq (Super Fast)
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are Kyle, a witty, high-intelligence system. Be concise and sharp." },
          ...history.filter(m => m.type !== 'image').map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          { role: "user", content: input }
        ],
        model: "llama3-8b-8192", // Fastest model available
      });

      return { 
        type: 'text', 
        content: chatCompletion.choices[0]?.message?.content || "Neural silence." 
      };
    } catch (error) {
      console.error("Groq Neural Error:", error);
      throw error;
    }
  }
};
