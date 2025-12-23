// Server-only Gemini client
import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set - AI chat will not work");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Using gemini-1.5-flash-8b which has free tier access
export const geminiModel = genAI?.getGenerativeModel({
    model: "gemini-1.5-flash-8b",
});

export async function chatWithGemini(
    message: string,
    systemInstructions: string,
    chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = []
) {
    if (!geminiModel) {
        throw new Error("Gemini API key not configured");
    }

    const chat = geminiModel.startChat({
        history: chatHistory,
    });

    // Prepend system context to the user message
    const contextualMessage = `[Instructions: ${systemInstructions}]\n\n${message}`;

    const result = await chat.sendMessage(contextualMessage);
    const response = result.response;
    return response.text();
}

export async function streamChatWithGemini(
    message: string,
    systemInstructions: string,
    chatHistory: { role: "user" | "model"; parts: { text: string }[] }[] = []
) {
    if (!geminiModel) {
        throw new Error("Gemini API key not configured");
    }

    const chat = geminiModel.startChat({
        history: chatHistory,
    });

    // Prepend system context to the user message
    const contextualMessage = `[Instructions: ${systemInstructions}]\n\n${message}`;

    const result = await chat.sendMessageStream(contextualMessage);
    return result.stream;
}
