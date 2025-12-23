// Server-only Groq client - FREE and FAST
import "server-only";

import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.warn("GROQ_API_KEY is not set - AI chat will not work");
}

const groq = apiKey ? new Groq({ apiKey }) : null;

export async function chatWithAI(
    message: string,
    systemInstructions: string,
    chatHistory: { role: "user" | "assistant"; content: string }[] = []
) {
    if (!groq) {
        throw new Error("Groq API key not configured");
    }

    const messages = [
        { role: "system" as const, content: systemInstructions },
        ...chatHistory.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user" as const, content: message },
    ];

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Fast and powerful
        messages,
        temperature: 0.7,
        max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
}

export async function streamChatWithAI(
    message: string,
    systemInstructions: string,
    chatHistory: { role: "user" | "assistant"; content: string }[] = []
) {
    if (!groq) {
        throw new Error("Groq API key not configured");
    }

    const messages = [
        { role: "system" as const, content: systemInstructions },
        ...chatHistory.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user" as const, content: message },
    ];

    const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
    });

    return stream;
}
