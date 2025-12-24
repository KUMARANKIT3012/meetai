import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// High-quality ElevenLabs voices (free tier available)
const VOICES = {
    rachel: "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, natural female
    drew: "29vD33N1CtxCmqQRPOHJ", // Drew - confident male
    clyde: "2EiwWnXFnvU5JabPnv8n", // Clyde - war veteran, deep
    domi: "AZnzlk1XvdvUeBnXmlld", // Domi - young female
    dave: "CYw3kZ02Hs0563khs1Fj", // Dave - conversational male
    fin: "D38z5RcWu1voky8WS1ja", // Fin - sailor, gruff
    sarah: "EXAVITQu4vr4xnSDxMaL", // Sarah - soft, news presenter
    antoni: "ErXwobaYiN019PkySvjV", // Antoni - well-rounded male
    thomas: "GBv7mTt0atIp3Br8iCZE", // Thomas - calm male
    charlie: "IKne3meq5aSn9XLyUdCD", // Charlie - casual australian
    george: "JBFqnCBsd6RMkjVDRZzb", // George - warm british
    emily: "LcfcDJNUP1GQjkzn1xUU", // Emily - calm female
    elli: "MF3mGyEYCl7XYWbV9V6O", // Elli - young female
    callum: "N2lVS1w4EtoT3dr4eOWO", // Callum - intense male
    patrick: "ODq5zmih8GrVes37Dizd", // Patrick - shouty male
    harry: "SOYHLrjzK2X1ezoPC6cr", // Harry - anxious male
    liam: "TX3LPaxmHKxFdv7VOQHJ", // Liam - articulate male
    dorothy: "ThT5KcBeYPX3keUQqHPh", // Dorothy - pleasant british
    josh: "TxGEqnHWrfWFTfGW9XjX", // Josh - deep male
    arnold: "VR6AewLTigWG4xSOukaG", // Arnold - crisp male
    charlotte: "XB0fDUnXU5powFXDhCwa", // Charlotte - seductive
    matilda: "XrExE9yKIg1WjnnlVkGX", // Matilda - warm female
    matthew: "Yko7PKs4b1qGz229Oqxg", // Matthew - audiobook narrator
    james: "ZQe5CZNOzWyzPSCn5a3c", // James - deep australian
    joseph: "Zlb1dXrM653N07WRdFW3", // Joseph - british narrator
    adam: "pNInz6obpgDQGcFmaJgB", // Adam - deep male
    sam: "yoZ06aMxZJJ28mfd3POQ", // Sam - raspy male
};

// Default to Rachel (warm, natural)
const DEFAULT_VOICE = VOICES.rachel;

export async function POST(request: NextRequest) {
    try {
        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json(
                { error: "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in your environment." },
                { status: 500 }
            );
        }

        const { text, voiceId } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        const voice = voiceId || DEFAULT_VOICE;

        // Call ElevenLabs API
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
            {
                method: "POST",
                headers: {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_monolingual_v1", // Use multilingual_v2 for better quality
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error("[ElevenLabs] Error:", error);
            return NextResponse.json(
                { error: `ElevenLabs API error: ${response.status}` },
                { status: response.status }
            );
        }

        // Return audio as ArrayBuffer
        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error("[TTS] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint to list available voices
export async function GET() {
    return NextResponse.json({
        voices: Object.entries(VOICES).map(([name, id]) => ({ name, id })),
        defaultVoice: "rachel",
    });
}
