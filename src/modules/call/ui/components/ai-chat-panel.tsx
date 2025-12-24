"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    SendIcon,
    MicIcon,
    MicOffIcon,
    Volume2Icon,
    VolumeXIcon,
    Loader2Icon,
    XIcon,
    EyeIcon,
    EyeOffIcon,
    SparklesIcon,
    CameraIcon
} from "lucide-react";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/use-speech";
import { useVideoCapture } from "@/hooks/use-video-capture";
import { MarkdownMessage } from "@/components/markdown-message";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
    role: "user" | "assistant";
    content: string;
    hasImage?: boolean;
    timestamp?: Date;
}

interface Props {
    agentInstructions: string;
    agentName: string;
    onAIStateChange?: (state: "idle" | "listening" | "thinking" | "speaking") => void;
    cameraStream?: MediaStream | null;
}

// Vision-specific system prompt
const VISION_SYSTEM_PROMPT = `IMPORTANT: You have FULL VISION CAPABILITIES. You CAN see images. An image from the user's video call is attached to this message.

Your task:
1. ALWAYS describe what you see in the image
2. NEVER say you cannot see or are text-only
3. Be specific about people, objects, and activities visible
4. Relate what you see to the user's question

If the image is dark, blurry, or unclear, describe that - but NEVER claim you lack vision.`;

// Math formatting instruction to add to all messages
const MATH_INSTRUCTION = `When responding with mathematical expressions:
- Use LaTeX notation for all math: inline math with $...$ and display math with $$...$$
- Examples: $x^2$ for x squared, $\\sqrt{x}$ for square root, $\\frac{a}{b}$ for fractions
- Use proper symbols: $\\pi$, $\\theta$, $\\sum$, $\\int$, etc.
- NEVER write "superscript 2" - always write $x^2$`;

export const AIChatPanel = ({ agentInstructions, agentName, onAIStateChange, cameraStream }: Props) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [visionEnabled, setVisionEnabled] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { isListening, transcript, isSupported: sttSupported, startListening, stopListening } = useSpeechRecognition();
    const { isSpeaking, isSupported: ttsSupported, speak, stop: stopSpeaking } = useSpeechSynthesis();
    const { captureFrame, captureScreen, captureFromStream, isCapturing } = useVideoCapture();

    // Notify parent of AI state changes
    useEffect(() => {
        if (!onAIStateChange) return;

        if (isSpeaking) {
            onAIStateChange("speaking");
        } else if (isLoading) {
            onAIStateChange("thinking");
        } else if (isListening) {
            onAIStateChange("listening");
        } else {
            onAIStateChange("idle");
        }
    }, [isSpeaking, isLoading, isListening, onAIStateChange]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // When transcript updates from voice
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

        // Capture frame if vision is enabled
        let imageBase64: string | null = null;
        if (visionEnabled) {
            // Strategy 1: Camera stream
            if (cameraStream) {
                try {
                    imageBase64 = await captureFromStream(cameraStream);
                } catch (e) {
                    console.log("[Vision] Camera stream failed:", e);
                }
            }

            // Strategy 2: DOM video
            if (!imageBase64) {
                imageBase64 = await captureFrame();
            }

            // Strategy 3: Screen capture
            if (!imageBase64) {
                try {
                    imageBase64 = await captureScreen();
                } catch (e) {
                    console.log("[Vision] Screen capture failed:", e);
                }
            }

            if (!imageBase64) {
                toast.error("Could not capture frame");
            }
        }

        setMessages((prev) => [...prev, {
            role: "user",
            content: userMessage,
            hasImage: !!imageBase64,
            timestamp: new Date()
        }]);
        setIsLoading(true);

        try {
            // Build system prompt with math instruction
            let systemPrompt = `${MATH_INSTRUCTION}\n\n${agentInstructions}`;
            if (visionEnabled && imageBase64) {
                systemPrompt = `${VISION_SYSTEM_PROMPT}\n\n${MATH_INSTRUCTION}\n\n---\n\n${agentInstructions}`;
            }

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    agentInstructions: systemPrompt,
                    chatHistory: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    imageBase64: imageBase64 || undefined,
                }),
            });

            if (!response.ok) throw new Error("Failed to get response");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            let assistantMessage = "";
            setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                assistantMessage += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0) {
                        newMessages[newMessages.length - 1] = {
                            role: "assistant",
                            content: assistantMessage,
                            timestamp: new Date()
                        };
                    }
                    return newMessages;
                });
            }
            reader.releaseLock();

            if (autoSpeak && ttsSupported && assistantMessage) {
                speak(assistantMessage);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, something went wrong.", timestamp: new Date() },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, agentInstructions, messages, autoSpeak, ttsSupported, speak, visionEnabled, captureFrame, captureScreen, cameraStream, captureFromStream]);

    const handleVoiceToggle = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    useEffect(() => {
        if (!isListening && transcript) {
            sendMessage(transcript);
        }
    }, [isListening, transcript, sendMessage]);

    // Floating button when closed
    if (!isOpen) {
        return (
            <div className="fixed bottom-24 right-4 z-50">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-50 animate-pulse" />

                <Button
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={cn(
                        "relative size-14 rounded-full shadow-2xl",
                        "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600",
                        "hover:from-emerald-500 hover:via-green-500 hover:to-teal-500",
                        "border border-white/20",
                        "transition-all duration-300 ease-out",
                        isHovered && "scale-110 shadow-emerald-500/50"
                    )}
                    size="icon"
                >
                    <SparklesIcon className={cn(
                        "size-6 text-white transition-transform duration-300",
                        isHovered && "rotate-12 scale-110"
                    )} />
                </Button>
            </div>
        );
    }

    return (
        <div className={cn(
            "fixed bottom-24 right-4 z-50",
            "w-[380px] h-[600px]",
            "flex flex-col",
            "rounded-3xl overflow-hidden",
            // Glassmorphism
            "bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-950/95",
            "backdrop-blur-2xl",
            "border border-white/10",
            "shadow-2xl shadow-emerald-500/20",
            // Animation
            "animate-in slide-in-from-bottom-5 fade-in duration-300"
        )}>
            {/* Header */}
            <div className="relative shrink-0 p-4 border-b border-white/10">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-green-600/20 to-teal-600/20" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Avatar with glow */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-md opacity-60" />
                            <div className="relative size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                <SparklesIcon className="size-5 text-white" />
                            </div>
                            {/* Status dot */}
                            <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-900",
                                isLoading ? "bg-yellow-400 animate-pulse" :
                                    isSpeaking ? "bg-green-400 animate-pulse" :
                                        "bg-green-400"
                            )} />
                        </div>

                        <div>
                            <h3 className="font-semibold text-white text-sm">{agentName}</h3>
                            <p className="text-xs text-white/50">
                                {isLoading ? "Thinking..." : isSpeaking ? "Speaking..." : "Online"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Vision toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "size-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10",
                                visionEnabled && "bg-emerald-500/30 text-emerald-300"
                            )}
                            onClick={() => setVisionEnabled(!visionEnabled)}
                        >
                            {visionEnabled ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
                        </Button>

                        {ttsSupported && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "size-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10",
                                    autoSpeak && "bg-emerald-500/30 text-emerald-300"
                                )}
                                onClick={() => {
                                    if (isSpeaking) stopSpeaking();
                                    setAutoSpeak(!autoSpeak);
                                }}
                            >
                                {autoSpeak ? <Volume2Icon className="size-4" /> : <VolumeXIcon className="size-4" />}
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                            onClick={() => setIsOpen(false)}
                        >
                            <XIcon className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Vision indicator */}
                {visionEnabled && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                        <CameraIcon className="size-4 text-emerald-300" />
                        <span className="text-xs text-emerald-200">Vision mode active - I can see your camera</span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                style={{ scrollBehavior: 'smooth' }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        {/* Animated icon */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                            <div className="relative size-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center">
                                <SparklesIcon className="size-8 text-emerald-300" />
                            </div>
                        </div>

                        <h4 className="text-lg font-semibold text-white mb-1">Hey there! 👋</h4>
                        <p className="text-sm text-white/50 mb-6">I&apos;m {agentName}, your AI assistant. How can I help?</p>

                        {/* Quick actions */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            <button
                                onClick={() => {
                                    setVisionEnabled(true);
                                    setInput("What do you see?");
                                }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <CameraIcon className="size-4 inline mr-2" />
                                What do you see?
                            </button>
                            <button
                                onClick={() => setInput("Help me with...")}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                            >
                                💡 Help me with...
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((message, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        {/* Avatar */}
                        {message.role === "assistant" && (
                            <div className="shrink-0">
                                <div className="size-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <SparklesIcon className="size-4 text-white" />
                                </div>
                            </div>
                        )}

                        {/* Message bubble */}
                        <div
                            className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-3 shadow-lg",
                                "overflow-hidden overflow-y-auto max-h-[300px]",
                                message.role === "user"
                                    ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-md"
                                    : "bg-white/10 border border-white/10 text-white rounded-bl-md"
                            )}
                            style={{ wordBreak: "break-word" }}
                        >
                            {message.hasImage && (
                                <div className="flex items-center gap-1.5 text-xs opacity-70 mb-2 pb-2 border-b border-white/10">
                                    <EyeIcon className="size-3" />
                                    <span>Analyzing image...</span>
                                </div>
                            )}

                            {message.content ? (
                                message.role === "assistant" ? (
                                    <MarkdownMessage content={message.content} className="text-white" />
                                ) : (
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                )
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    <span className="text-sm opacity-70">Thinking...</span>
                                </div>
                            )}
                        </div>

                        {/* User avatar */}
                        {message.role === "user" && (
                            <div className="shrink-0">
                                <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <span className="text-sm font-semibold text-white">U</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3 animate-in fade-in duration-200">
                        <div className="size-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <SparklesIcon className="size-4 text-white" />
                        </div>
                        <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1.5">
                                <div className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="shrink-0 p-4 border-t border-white/10 bg-gray-900/50">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                    className="flex gap-2"
                >
                    {/* Voice button */}
                    {sttSupported && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "shrink-0 size-10 rounded-xl",
                                isListening
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={handleVoiceToggle}
                            disabled={isLoading}
                        >
                            {isListening ? (
                                <MicOffIcon className="size-5" />
                            ) : (
                                <MicIcon className="size-5" />
                            )}
                        </Button>
                    )}

                    {/* Input */}
                    <div className="relative flex-1">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Type a message..."}
                            disabled={isLoading || isListening}
                            className={cn(
                                "w-full h-10 px-4 rounded-xl",
                                "bg-white/5 border-white/10",
                                "text-white placeholder:text-white/40",
                                "focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50",
                                "transition-all duration-200"
                            )}
                        />
                    </div>

                    {/* Send button */}
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !input.trim() || isCapturing}
                        className={cn(
                            "shrink-0 size-10 rounded-xl",
                            "bg-gradient-to-br from-emerald-600 to-teal-600",
                            "hover:from-emerald-500 hover:to-teal-500",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "shadow-lg shadow-emerald-500/30",
                            "transition-all duration-200"
                        )}
                    >
                        {isLoading || isCapturing ? (
                            <Loader2Icon className="size-5 animate-spin" />
                        ) : (
                            <SendIcon className="size-5" />
                        )}
                    </Button>
                </form>

            </div>
        </div>
    );
};
