import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure you set NEXT_PUBLIC_GEMINI_KEY in your Vercel/Render env settings
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || "");

export const geminiService = {
  async chat(history: any[], message: string) {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro", 
      systemInstruction: "You are Kyle, a witty, high-intelligence system. Be concise." 
    });
    
    // Map history to Google's expected format
    const chat = model.startChat({
      history: history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  }
};
