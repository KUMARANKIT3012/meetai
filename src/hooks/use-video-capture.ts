"use client";

import { useState, useCallback, useRef } from "react";

interface UseVideoCaptureOptions {
    maxWidth?: number;
    quality?: number;
}

export function useVideoCapture(options: UseVideoCaptureOptions = {}) {
    const { maxWidth = 640, quality = 0.7 } = options;

    const [lastFrame, setLastFrame] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureDebug, setCaptureDebug] = useState<string>("");
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Initialize canvas lazily
    const getCanvas = useCallback(() => {
        if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
        }
        return canvasRef.current;
    }, []);

    // Capture frame from a video element
    const captureFromVideo = useCallback((video: HTMLVideoElement): string | null => {
        if (!video) {
            console.log("[VideoCapture] No video element provided");
            return null;
        }

        if (video.readyState < 2) {
            console.log("[VideoCapture] Video not ready, readyState:", video.readyState);
            return null;
        }

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.log("[VideoCapture] Video has no dimensions");
            return null;
        }

        try {
            const canvas = getCanvas();
            const aspectRatio = video.videoHeight / video.videoWidth;

            // Scale down if needed (Groq has 4MB limit for base64)
            const width = Math.min(video.videoWidth, maxWidth);
            const height = Math.round(width * aspectRatio);

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                console.log("[VideoCapture] Failed to get canvas context");
                return null;
            }

            ctx.drawImage(video, 0, 0, width, height);

            // Get base64 without the data URL prefix
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

            console.log("[VideoCapture] Successfully captured frame, size:", base64.length, "bytes");
            return base64;
        } catch (error) {
            console.error("[VideoCapture] Error capturing video frame:", error);
            return null;
        }
    }, [getCanvas, maxWidth, quality]);

    // Capture current meeting video frame - more aggressive search
    const captureFrame = useCallback(async (): Promise<string | null> => {
        setIsCapturing(true);
        let debugInfo = "";

        try {
            // Strategy 1: Look for video elements in the DOM
            const allVideos = document.querySelectorAll("video");
            debugInfo += `Found ${allVideos.length} video elements. `;
            console.log("[VideoCapture] Found", allVideos.length, "video elements");

            // Log info about each video
            allVideos.forEach((video, idx) => {
                console.log(`[VideoCapture] Video ${idx}:`, {
                    readyState: video.readyState,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    paused: video.paused,
                    src: video.src?.substring(0, 50),
                    srcObject: video.srcObject ? "MediaStream" : "none"
                });
            });

            // Try each video element
            for (const video of allVideos) {
                // Check if video has content
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    console.log("[VideoCapture] Attempting capture from video with dimensions:", video.videoWidth, "x", video.videoHeight);

                    // Try to capture
                    try {
                        const frame = captureFromVideo(video);
                        if (frame && frame.length > 1000) { // Ensure it's not just a blank frame
                            setLastFrame(frame);
                            debugInfo += `Captured from video ${video.videoWidth}x${video.videoHeight}`;
                            setCaptureDebug(debugInfo);
                            return frame;
                        }
                    } catch (e) {
                        console.log("[VideoCapture] Failed to capture from this video:", e);
                    }
                }
            }

            // Strategy 2: Look for video in iframes (cross-origin might fail)
            const iframes = document.querySelectorAll("iframe");
            debugInfo += `Found ${iframes.length} iframes. `;

            // Strategy 3: Look for canvas elements that might contain video
            const canvases = document.querySelectorAll("canvas");
            debugInfo += `Found ${canvases.length} canvas elements. `;

            for (const canvas of canvases) {
                if (canvas.width > 100 && canvas.height > 100) {
                    try {
                        const dataUrl = canvas.toDataURL("image/jpeg", quality);
                        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
                        if (base64.length > 1000) {
                            console.log("[VideoCapture] Captured from canvas:", canvas.width, "x", canvas.height);
                            setLastFrame(base64);
                            debugInfo += `Captured from canvas ${canvas.width}x${canvas.height}`;
                            setCaptureDebug(debugInfo);
                            return base64;
                        }
                    } catch (e) {
                        console.log("[VideoCapture] Canvas capture failed (possibly cross-origin):", e);
                    }
                }
            }

            debugInfo += "No capturable video found.";
            setCaptureDebug(debugInfo);
            console.warn("[VideoCapture] No active video found to capture");
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, [captureFromVideo, quality]);

    // Capture from a specific MediaStream
    const captureFromStream = useCallback(async (stream: MediaStream): Promise<string | null> => {
        setIsCapturing(true);

        try {
            const video = document.createElement("video");
            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;

            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => {
                    video.play().then(() => resolve()).catch(reject);
                };
                video.onerror = reject;
                setTimeout(() => reject(new Error("Timeout")), 5000);
            });

            // Wait for video to render
            await new Promise(resolve => setTimeout(resolve, 100));

            const frame = captureFromVideo(video);

            // Cleanup
            video.srcObject = null;

            if (frame) {
                setLastFrame(frame);
            }

            return frame;
        } catch (error) {
            console.error("[VideoCapture] Error capturing from stream:", error);
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, [captureFromVideo]);

    // Take screenshot of entire screen (requires permission)
    const captureScreen = useCallback(async (): Promise<string | null> => {
        setIsCapturing(true);

        try {
            // Request screen capture permission
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            const frame = await captureFromStream(stream);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            return frame;
        } catch (error) {
            console.error("[VideoCapture] Screen capture failed:", error);
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, [captureFromStream]);

    // Clear the last captured frame
    const clearFrame = useCallback(() => {
        setLastFrame(null);
        setCaptureDebug("");
    }, []);

    return {
        lastFrame,
        isCapturing,
        captureDebug,
        captureFrame,
        captureFromStream,
        captureFromVideo,
        captureScreen,
        clearFrame,
    };
}
