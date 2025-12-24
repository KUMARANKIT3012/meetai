// Server-only Groq client with Vision support
import "server-only";

import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.warn("GROQ_API_KEY is not set - AI chat will not work");
}

const groq = apiKey ? new Groq({ apiKey }) : null;

// Text-only model (faster for regular chat)
const TEXT_MODEL = "llama-3.3-70b-versatile";

// Vision-capable model (for image analysis)
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

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
        model: TEXT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
}

export async function streamChatWithAI(
    message: string,
    systemInstructions: string,
    chatHistory: { role: "user" | "assistant"; content: string }[] = [],
    imageBase64?: string
) {
    if (!groq) {
        throw new Error("Groq API key not configured");
    }

    // Build the user message content
    type ContentPart =
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } };

    const userContent: ContentPart[] = [{ type: "text", text: message }];

    // Add image if provided (vision mode)
    if (imageBase64) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
            },
        });
    }

    // Use vision model if image is provided, otherwise use text model
    const model = imageBase64 ? VISION_MODEL : TEXT_MODEL;

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemInstructions },
        ...chatHistory.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
        { role: "user", content: userContent },
    ];

    const stream = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
    });

    return stream;
}

// Vision-specific chat function for analyzing images
export async function analyzeImageWithAI(
    prompt: string,
    imageBase64: string,
    systemInstructions: string = "You are a helpful AI assistant with vision capabilities. Describe what you see accurately and helpfully."
) {
    if (!groq) {
        throw new Error("Groq API key not configured");
    }

    const response = await groq.chat.completions.create({
        model: VISION_MODEL,
        messages: [
            { role: "system", content: systemInstructions },
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                        },
                    },
                ],
            },
        ],
        temperature: 0.7,
        max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
}
