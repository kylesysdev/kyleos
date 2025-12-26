import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_KEY });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: "You are KyleOS." }, ...messages],
      model: "llama3-8b-8192",
    });
    return NextResponse.json({ content: completion.choices[0]?.message?.content });
  } catch (error) {
    return NextResponse.json({ error: "Brain offline" }, { status: 500 });
  }
}
