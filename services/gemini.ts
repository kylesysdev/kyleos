import { GoogleGenerativeAI } from "@google/generative-ai";

// Force check for the API key to prevent silent failures
const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;

if (!apiKey) {
  console.error("NEURAL ERROR: NEXT_PUBLIC_GEMINI_KEY is missing from environment.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

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

      // Using Gemini 1.5 Flash for faster "Neural" response
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const chat = model.startChat({
        history: history.filter(m => m.type !== 'image').map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage(input);
      const text = result.response.text();
      
      return { type: 'text', content: text };
    } catch (error) {
      console.error("Neural processing failed:", error);
      throw error;
    }
  }
};
