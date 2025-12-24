"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionConstructor;
        webkitSpeechRecognition: SpeechRecognitionConstructor;
    }
}

/**
 * Converts LaTeX math notation to speakable text
 */
function latexToSpeech(text: string): string {
    let result = text;

    // Remove display math delimiters ($$...$$)
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => {
        return convertLatexExpression(content);
    });

    // Remove inline math delimiters ($...$)
    result = result.replace(/\$(.*?)\$/g, (_, content) => {
        return convertLatexExpression(content);
    });

    // Clean up multiple spaces
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

function convertLatexExpression(latex: string): string {
    let result = latex.trim();

    // Fractions: \frac{a}{b} → "a over b"
    result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');

    // Square root: \sqrt{x} → "square root of x"
    result = result.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
    result = result.replace(/\\sqrt\s*(\w)/g, 'square root of $1');

    // Nth root: \sqrt[n]{x} → "nth root of x"
    result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1th root of $2');

    // Superscripts (powers)
    result = result.replace(/(\w)\^2(?![0-9])/g, '$1 squared');
    result = result.replace(/(\w)\^\{2\}/g, '$1 squared');
    result = result.replace(/(\w)\^3(?![0-9])/g, '$1 cubed');
    result = result.replace(/(\w)\^\{3\}/g, '$1 cubed');
    result = result.replace(/(\w)\^\{([^}]+)\}/g, '$1 to the power of $2');
    result = result.replace(/(\w)\^(\w)/g, '$1 to the power of $2');

    // Subscripts: x_n → "x sub n"
    result = result.replace(/(\w)_\{([^}]+)\}/g, '$1 sub $2');
    result = result.replace(/(\w)_(\w)/g, '$1 sub $2');

    // Greek letters
    const greekLetters: Record<string, string> = {
        '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma',
        '\\delta': 'delta', '\\epsilon': 'epsilon', '\\theta': 'theta',
        '\\lambda': 'lambda', '\\mu': 'mu', '\\pi': 'pi',
        '\\sigma': 'sigma', '\\omega': 'omega', '\\phi': 'phi',
        '\\psi': 'psi', '\\rho': 'rho', '\\tau': 'tau',
    };

    for (const [latex, spoken] of Object.entries(greekLetters)) {
        result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), spoken);
    }

    // Common math symbols
    result = result.replace(/\\times/g, ' times ');
    result = result.replace(/\\cdot/g, ' times ');
    result = result.replace(/\\div/g, ' divided by ');
    result = result.replace(/\\pm/g, ' plus or minus ');
    result = result.replace(/\\leq/g, ' less than or equal to ');
    result = result.replace(/\\geq/g, ' greater than or equal to ');
    result = result.replace(/\\neq/g, ' not equal to ');
    result = result.replace(/\\approx/g, ' approximately ');
    result = result.replace(/\\infty/g, ' infinity ');
    result = result.replace(/\\sum/g, ' sum of ');
    result = result.replace(/\\prod/g, ' product of ');
    result = result.replace(/\\int/g, ' integral of ');
    result = result.replace(/\\lim/g, ' limit of ');
    result = result.replace(/\\sin/g, ' sine of ');
    result = result.replace(/\\cos/g, ' cosine of ');
    result = result.replace(/\\tan/g, ' tangent of ');
    result = result.replace(/\\log/g, ' log of ');
    result = result.replace(/\\ln/g, ' natural log of ');

    // Equals and basic operators
    result = result.replace(/=/g, ' equals ');
    result = result.replace(/\+/g, ' plus ');
    result = result.replace(/-/g, ' minus ');
    result = result.replace(/</g, ' less than ');
    result = result.replace(/>/g, ' greater than ');

    // Clean up remaining backslashes and braces
    result = result.replace(/\\/g, '');
    result = result.replace(/[{}]/g, '');
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Cleans text for TTS by removing markdown and converting LaTeX
 */
function cleanTextForSpeech(text: string): string {
    let result = text;

    // Convert LaTeX to speech
    result = latexToSpeech(result);

    // Remove markdown formatting
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
    result = result.replace(/\*([^*]+)\*/g, '$1'); // Italic
    result = result.replace(/`([^`]+)`/g, '$1'); // Inline code
    result = result.replace(/```[\s\S]*?```/g, ''); // Code blocks
    result = result.replace(/#+\s*/g, ''); // Headers
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
    result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, ''); // Images

    // Clean up
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

// Speech Recognition Hook
export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognitionAPI =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            setIsSupported(!!SpeechRecognitionAPI);

            if (SpeechRecognitionAPI) {
                recognitionRef.current = new SpeechRecognitionAPI();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "en-US";

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    const current = event.resultIndex;
                    const result = event.results[current];
                    if (result.isFinal) {
                        setTranscript(result[0].transcript);
                    }
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current.onerror = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript("");
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        isSupported,
        startListening,
        stopListening,
    };
}

// Enhanced TTS Hook with ElevenLabs support + browser fallback
export function useSpeechSynthesis() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [useElevenLabs, setUseElevenLabs] = useState(true); // Try ElevenLabs first
    const [elevenLabsAvailable, setElevenLabsAvailable] = useState<boolean | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsSupported(true); // We always have at least browser TTS

            // Create audio element for ElevenLabs
            audioRef.current = new Audio();
            audioRef.current.onended = () => setIsSpeaking(false);
            audioRef.current.onerror = () => setIsSpeaking(false);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Speak using ElevenLabs API
    const speakWithElevenLabs = useCallback(async (text: string): Promise<boolean> => {
        try {
            const response = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                console.log("[TTS] ElevenLabs not available, falling back to browser TTS");
                setElevenLabsAvailable(false);
                return false;
            }

            setElevenLabsAvailable(true);
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                await audioRef.current.play();
                setIsSpeaking(true);

                // Clean up URL when done
                audioRef.current.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    setIsSpeaking(false);
                };
            }

            return true;
        } catch (error) {
            console.error("[TTS] ElevenLabs error:", error);
            setElevenLabsAvailable(false);
            return false;
        }
    }, []);

    // Fallback to browser TTS
    const speakWithBrowser = useCallback((text: string) => {
        if (!("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        utteranceRef.current = new SpeechSynthesisUtterance(text);
        utteranceRef.current.rate = 1.0;
        utteranceRef.current.pitch = 1.0;
        utteranceRef.current.volume = 1.0;

        // Try to use a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Microsoft')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utteranceRef.current.voice = preferredVoice;
        }

        utteranceRef.current.onstart = () => setIsSpeaking(true);
        utteranceRef.current.onend = () => setIsSpeaking(false);
        utteranceRef.current.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utteranceRef.current);
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!text) return;

        // Clean the text for speech
        const cleanedText = cleanTextForSpeech(text);
        if (!cleanedText) return;

        // Stop any current speech
        if (audioRef.current) {
            audioRef.current.pause();
        }
        window.speechSynthesis?.cancel();

        // Try ElevenLabs if enabled and not known to be unavailable
        if (useElevenLabs && elevenLabsAvailable !== false) {
            const success = await speakWithElevenLabs(cleanedText);
            if (success) return;
        }

        // Fallback to browser TTS
        speakWithBrowser(cleanedText);
    }, [useElevenLabs, elevenLabsAvailable, speakWithElevenLabs, speakWithBrowser]);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

    return {
        isSpeaking,
        isSupported,
        speak,
        stop,
        useElevenLabs,
        setUseElevenLabs,
        elevenLabsAvailable,
    };
}
