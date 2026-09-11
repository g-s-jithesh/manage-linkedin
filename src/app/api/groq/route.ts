import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize the Groq client. It will automatically use process.env.GROQ_API_KEY
const groq = new Groq();

export async function POST(req: Request) {
  try {
    const { action, text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    let systemPrompt = "";

    if (action === "draft") {
      systemPrompt = `You are an expert LinkedIn copywriter and ghostwriter. Your goal is to take a rough idea or set of raw thoughts and expand them into a structured, engaging LinkedIn post draft. 
      Keep the formatting clean with bullet points where necessary. Ensure there is a strong hook sentence. Do NOT use emojis yet.`;
    } else if (action === "humanize") {
      systemPrompt = `You are a sophisticated LinkedIn "Humanizer". Your job is to take an AI-generated draft and make it sound like a real, authentic human executive.
      CRITICAL INSTRUCTIONS:
      1. Strip out all common AI cliché words (e.g., "delve", "foster", "testament", "tapestry", "seamlessly", "elevate").
      2. Remove cringe LinkedIn tropes like "I am humbled and honored to announce".
      3. Use a conversational, punchy rhythm with varied sentence lengths.
      4. Make the tone confident but vulnerable or relatable.
      5. Add 1-2 relevant emojis, but do not overdo it.
      6. Output ONLY the final post text, nothing else.`;
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      model: "openai/gpt-oss-20b",
      temperature: action === "humanize" ? 0.7 : 0.5,
      max_tokens: 1024,
    });

    const result = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process request";
    console.error("Groq API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: message },
      { status: 500 }
    );
  }
}
