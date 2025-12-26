import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || "");

export const aiService = {
  async process(history: any[], input: string) {
    // 1. Image Command Logic
    if (input.toLowerCase().startsWith('/image')) {
      const prompt = input.replace('/image', '').trim();
      return { 
        type: 'image', 
        content: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true&model=flux` 
      };
    }

    // 2. Gemini Text Chat Logic
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const chat = model.startChat({
        history: history.filter(m => m.type !== 'image').map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });
      const result = await chat.sendMessage(input);
      return { type: 'text', content: result.response.text() };
    } catch (error) {
      console.error("Gemini Error:", error);
      return { type: 'text', content: "Neural Link Error: I cannot reach my core brain right now." };
    }
  }
};
