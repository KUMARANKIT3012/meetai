"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type AIAvatarState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
    state: AIAvatarState;
    agentName: string;
    className?: string;
}

export const AIAvatar = ({ state, agentName, className }: Props) => {
    const [pulseIntensity, setPulseIntensity] = useState(1);

    // Vary pulse intensity based on state
    useEffect(() => {
        if (state === "speaking") {
            // Randomize intensity while speaking for dynamic effect
            const interval = setInterval(() => {
                setPulseIntensity(0.8 + Math.random() * 0.4);
            }, 150);
            return () => clearInterval(interval);
        } else {
            setPulseIntensity(1);
        }
    }, [state]);

    const getStateColors = () => {
        switch (state) {
            case "idle":
                return {
                    primary: "from-blue-500 to-cyan-400",
                    glow: "shadow-blue-500/50",
                    ring: "border-blue-400/30",
                };
            case "listening":
                return {
                    primary: "from-green-500 to-emerald-400",
                    glow: "shadow-green-500/50",
                    ring: "border-green-400/30",
                };
            case "thinking":
                return {
                    primary: "from-purple-500 to-violet-400",
                    glow: "shadow-purple-500/50",
                    ring: "border-purple-400/30",
                };
            case "speaking":
                return {
                    primary: "from-orange-500 to-amber-400",
                    glow: "shadow-orange-500/50",
                    ring: "border-orange-400/30",
                };
        }
    };

    const colors = getStateColors();

    return (
        <div className={cn("relative flex flex-col items-center gap-2", className)}>
            {/* Outer pulsing rings */}
            <div className="relative">
                {/* Ring 3 - Outermost */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-full border-2 opacity-20",
                        colors.ring,
                        state === "speaking" && "animate-ping"
                    )}
                    style={{
                        transform: `scale(${1.8 * pulseIntensity})`,
                        transition: "transform 0.15s ease-out",
                    }}
                />

                {/* Ring 2 */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-full border-2 opacity-30",
                        colors.ring,
                        state !== "idle" && "animate-pulse"
                    )}
                    style={{
                        transform: `scale(${1.4 * pulseIntensity})`,
                        transition: "transform 0.15s ease-out",
                    }}
                />

                {/* Ring 1 - Inner glow */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-full opacity-40 blur-sm",
                        `bg-gradient-to-br ${colors.primary}`
                    )}
                    style={{
                        transform: `scale(${1.2 * pulseIntensity})`,
                        transition: "transform 0.15s ease-out",
                    }}
                />

                {/* Main orb */}
                <div
                    className={cn(
                        "relative size-16 rounded-full",
                        `bg-gradient-to-br ${colors.primary}`,
                        "shadow-lg",
                        colors.glow,
                        state === "thinking" && "animate-pulse"
                    )}
                    style={{
                        boxShadow: `0 0 ${20 * pulseIntensity}px 5px currentColor`,
                        transition: "box-shadow 0.15s ease-out",
                    }}
                >
                    {/* Inner highlight */}
                    <div className="absolute top-2 left-3 size-4 rounded-full bg-white/40 blur-sm" />

                    {/* Animated particles */}
                    {state === "speaking" && (
                        <>
                            <div className="absolute -top-1 left-1/2 size-2 rounded-full bg-white/60 animate-bounce"
                                style={{ animationDelay: "0ms" }} />
                            <div className="absolute top-1/2 -right-1 size-1.5 rounded-full bg-white/50 animate-bounce"
                                style={{ animationDelay: "100ms" }} />
                            <div className="absolute -bottom-1 left-1/3 size-1.5 rounded-full bg-white/50 animate-bounce"
                                style={{ animationDelay: "200ms" }} />
                        </>
                    )}

                    {/* AI Icon in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                            className="size-8 text-white/90"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                            <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                            <circle cx="15" cy="13" r="1.5" fill="currentColor" />
                            <path d="M9 17h6" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Agent name label */}
            <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-medium text-white/90 drop-shadow-md">
                    {agentName}
                </span>
                <span className={cn(
                    "text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full",
                    state === "idle" && "bg-blue-500/20 text-blue-300",
                    state === "listening" && "bg-green-500/20 text-green-300",
                    state === "thinking" && "bg-purple-500/20 text-purple-300",
                    state === "speaking" && "bg-orange-500/20 text-orange-300"
                )}>
                    {state}
                </span>
            </div>
        </div>
    );
};
