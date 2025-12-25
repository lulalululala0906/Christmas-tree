import React, { useEffect, useState } from 'react';

export const AudioController: React.FC = () => {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Get the audio element defined in index.html
    const audio = document.getElementById('bgm') as HTMLAudioElement;
    
    if (!audio) {
      console.error("Audio element #bgm not found");
      return;
    }

    // Sync React state with the actual audio element state
    // This allows the global script in index.html to start playback, and this button to reflect it
    const updateState = () => {
        setPlaying(!audio.paused);
    };

    audio.addEventListener('play', updateState);
    audio.addEventListener('pause', updateState);

    // Initial check
    if (!audio.paused) {
      setPlaying(true);
    }

    return () => {
      audio.removeEventListener('play', updateState);
      audio.removeEventListener('pause', updateState);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = document.getElementById('bgm') as HTMLAudioElement;
    
    if (audio) {
      if (playing) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      className={`
        pointer-events-auto
        flex-1 md:flex-none
        px-2 py-4 md:px-6 md:py-5 rounded-none
        whitespace-nowrap
        text-white font-black tracking-[0.1em] uppercase text-[10px] md:text-xs
        transition-all duration-500 transform hover:scale-105
        backdrop-blur-xl border border-white/10
        shadow-[0_0_20px_rgba(0,0,0,0.2)]
        ${playing 
          ? 'bg-gradient-to-r from-emerald-950/80 to-black hover:border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
          : 'bg-black/40 hover:bg-white/10'
        }
      `}
      style={{ clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0% 100%)' }}
    >
      {playing ? "MUSIC: ON" : "MUSIC: OFF"}
    </button>
  );
};