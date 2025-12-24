"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CallControls, SpeakerLayout, useCallStateHooks } from '@stream-io/video-react-sdk';
import { AIChatPanel } from './ai-chat-panel';
import { AIAvatar, AIAvatarState } from './ai-avatar';

interface Props {
  onLeave: () => void;
  meetingName: string;
  agentName: string;
  agentInstructions: string;
}

export const CallActive = ({ onLeave, meetingName, agentName, agentInstructions }: Props) => {
  const [aiState, setAIState] = useState<AIAvatarState>("idle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Get camera state from Stream.io SDK
  const { useCameraState } = useCallStateHooks();
  const { mediaStream: streamCameraMedia } = useCameraState();

  // Update camera stream when it changes
  useEffect(() => {
    if (streamCameraMedia) {
      setCameraStream(streamCameraMedia);
      console.log("[CallActive] Camera stream available:", streamCameraMedia.id);
    }
  }, [streamCameraMedia]);

  return (
    <div className="flex flex-col justify-between p-4 h-full text-white">
      <div className="bg-[#101213] rounded-full p-4 flex items-center gap-4">
        <Link href="/" className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit">
          <Image src="/logo.svg" width={22} height={22} alt="Logo" />
        </Link>
        <h4 className="text-base">{meetingName}</h4>
      </div>

      {/* Main content area with video and AI avatar */}
      <div className="relative flex-1 flex items-center justify-center">
        <SpeakerLayout />

        {/* AI Avatar - positioned in the corner */}
        <div className="absolute bottom-4 left-4 z-10">
          <AIAvatar
            state={aiState}
            agentName={agentName}
          />
        </div>
      </div>

      <div className='bg-[#101213] rounded-full px-4'>
        <CallControls onLeave={onLeave} />
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        agentName={agentName}
        agentInstructions={agentInstructions}
        onAIStateChange={setAIState}
        cameraStream={cameraStream}
      />
    </div>
  );
};
