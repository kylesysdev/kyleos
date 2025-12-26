import Groq from "groq-sdk";

// Defensive check to prevent the "Neural silence"
const groq = new Groq({ 
  apiKey: process.env.NEXT_PUBLIC_GROQ_KEY || "missing_key",
  dangerouslyAllowBrowser: true 
});

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

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "You are Kyle, an elite AI OS. Be witty and concise." },
          ...history.filter(m => m.type !== 'image').map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          { role: "user", content: input }
        ],
        model: "llama3-8b-8192",
      });

      return { 
        type: 'text', 
        content: chatCompletion.choices[0]?.message?.content || "Neural silence." 
      };
    } catch (error) {
      console.error("Neural Error:", error);
      throw error;
    }
  }
};
