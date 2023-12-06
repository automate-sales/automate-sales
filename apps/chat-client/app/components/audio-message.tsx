'use client'

import type { MutableRefObject} from "react";
import { useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon
} from "@heroicons/react/24/outline";
import type { Chat } from "database";

export function AudioMessage({ message }: { message: Chat }): JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null) as MutableRefObject<HTMLAudioElement|null>;
  const handleToggleAudio = (): void => {
      if (!audioRef.current) {
          audioRef.current = new Audio(message.media);
          audioRef.current.addEventListener('ended', () => { setIsPlaying(false) });
      }
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(err => { console.error(err) });
      setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <span>Audio</span>
      <button onClick={handleToggleAudio} type='button'>
        {isPlaying ? <PauseIcon aria-label="Pause" className="h-6 w-6"/> : 
          <PlayIcon aria-label="Play" className="h-6 w-6"/>
        }
      </button>
    </div>
  );
};