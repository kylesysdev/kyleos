import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || "");

export const aiService = {
  async process(history: any[], input: string) {
    if (input.toLowerCase().startsWith('/image')) {
      const prompt = input.replace('/image', '').trim();
      return { type: 'image', content: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&model=flux` };
    }

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
};
