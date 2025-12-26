// services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || "");

export const aiService = {
  // Logic to determine if user wants a message or an image
  async processInput(history: any[], input: string) {
    const isImageRequest = input.toLowerCase().startsWith('/image') || input.toLowerCase().includes('generate image');

    if (isImageRequest) {
      // 1. Image Path: Clean prompt and return Pollinations URL
      const prompt = input.replace(/^\/image/i, '').replace(/generate image/i, '').trim();
      const safePrompt = encodeURIComponent(prompt || input);
      return {
        type: 'image',
        content: `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&enhance=true&model=flux`
      };
    } else {
      // 2. Text Path: Call Gemini for a smart response
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const chat = model.startChat({
        history: history.filter(m => m.type !== 'image').map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });
      const result = await chat.sendMessage(input);
      return { type: 'text', content: result.response.text() };
    }
  }
};
