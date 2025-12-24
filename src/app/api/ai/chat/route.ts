import { streamChatWithAI } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, agentInstructions, chatHistory = [], imageBase64 } = body;

        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (!agentInstructions) {
            return NextResponse.json(
                { error: "Agent instructions are required" },
                { status: 400 }
            );
        }

        // Check for API key
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: "Groq API key not configured. Get one free at https://console.groq.com" },
                { status: 500 }
            );
        }

        // Pass imageBase64 if provided (vision mode)
        const stream = await streamChatWithAI(
            message,
            agentInstructions,
            chatHistory,
            imageBase64
        );

        // Create a readable stream for the response
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.choices[0]?.delta?.content || "";
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error("Stream error:", error);
                    controller.error(error);
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("AI Chat error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process AI chat" },
            { status: 500 }
        );
    }
}

// Opt out of caching
export const dynamic = "force-dynamic";
