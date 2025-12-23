"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    SendIcon,
    MicIcon,
    MicOffIcon,
    Volume2Icon,
    VolumeXIcon,
    Loader2Icon,
    BotIcon,
    UserIcon,
    XIcon,
    MessageSquareIcon
} from "lucide-react";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface Props {
    agentInstructions: string;
    agentName: string;
}

export const AIChatPanel = ({ agentInstructions, agentName }: Props) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { isListening, transcript, isSupported: sttSupported, startListening, stopListening } = useSpeechRecognition();
    const { isSpeaking, isSupported: ttsSupported, speak, stop: stopSpeaking } = useSpeechSynthesis();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // When transcript updates from voice, set it as input
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    const sendMessage = useCallback(async (messageToSend?: string) => {
        const finalMessage = messageToSend || input;
        if (!finalMessage.trim() || isLoading) return;

        const userMessage = finalMessage.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    agentInstructions,
                    chatHistory: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to get response");
            }

            // Check if response has a body
            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            let assistantMessage = "";
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    assistantMessage += chunk;

                    setMessages((prev) => {
                        const newMessages = [...prev];
                        if (newMessages.length > 0) {
                            newMessages[newMessages.length - 1] = {
                                role: "assistant",
                                content: assistantMessage,
                            };
                        }
                        return newMessages;
                    });
                }
            } finally {
                reader.releaseLock();
            }

            // Speak the response if auto-speak is enabled
            if (autoSpeak && ttsSupported && assistantMessage) {
                speak(assistantMessage);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}` },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, agentInstructions, messages, autoSpeak, ttsSupported, speak]);

    const handleVoiceToggle = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Auto-send when speech recognition completes
    useEffect(() => {
        if (!isListening && transcript) {
            sendMessage(transcript);
        }
    }, [isListening, transcript, sendMessage]);

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 rounded-full size-14 bg-primary shadow-lg z-50"
                size="icon"
            >
                <MessageSquareIcon className="size-6" />
            </Button>
        );
    }

    return (
        <div className="fixed bottom-24 right-4 w-80 md:w-96 h-[500px] bg-background border rounded-lg shadow-xl flex flex-col z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <BotIcon className="size-5 text-primary" />
                    <span className="font-medium text-sm">{agentName}</span>
                </div>
                <div className="flex items-center gap-1">
                    {ttsSupported && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                                if (isSpeaking) stopSpeaking();
                                setAutoSpeak(!autoSpeak);
                            }}
                        >
                            {autoSpeak ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />}
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsOpen(false)}>
                        <XIcon className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4">
                        <BotIcon className="size-12 mb-2 opacity-50" />
                        <p className="text-sm">Start chatting with {agentName}</p>
                        <p className="text-xs mt-1">Type or use the microphone</p>
                    </div>
                )}
                <div className="space-y-3">
                    {messages.map((message, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex gap-2",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {message.role === "assistant" && (
                                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <BotIcon className="size-4 text-primary" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white text-gray-900 border border-gray-200"
                                )}
                            >
                                {message.content || (
                                    <Loader2Icon className="size-4 animate-spin" />
                                )}
                            </div>
                            {message.role === "user" && (
                                <div className="size-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                    <UserIcon className="size-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                    className="flex gap-2"
                >
                    {sttSupported && (
                        <Button
                            type="button"
                            variant={isListening ? "destructive" : "secondary"}
                            size="icon"
                            onClick={handleVoiceToggle}
                            disabled={isLoading}
                        >
                            {isListening ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
                        </Button>
                    )}
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Type a message..."}
                        disabled={isLoading || isListening}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        {isLoading ? (
                            <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                            <SendIcon className="size-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
