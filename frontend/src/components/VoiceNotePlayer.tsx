import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  isMe?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSpeedCycle = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-2xl w-64 md:w-72 ${
        isMe ? 'bg-white/10 text-white' : 'bg-[#FDF8EE] text-[#191C3B] border border-[#EAD9BE]'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
            isMe
              ? 'bg-[#FAF7F2] text-[#191C3B] hover:bg-white'
              : 'bg-[#191C3B] text-white hover:bg-[#101226]'
          }`}
          title={isPlaying ? 'रोकें • Pause' : 'चलाएं • Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform / Progress Slider */}
        <div className="flex-1 flex flex-col justify-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#E8E2D5] rounded-lg appearance-none cursor-pointer accent-[#D97706]"
          />
          <div className="flex justify-between text-[10px] mt-1 font-mono opacity-80">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Speed Button (1x, 1.5x, 2x) */}
        <button
          type="button"
          onClick={handleSpeedCycle}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
            isMe
              ? 'bg-white/20 text-[#FAF7F2] hover:bg-white/30'
              : 'bg-[#EAD9BE] text-[#B45309] hover:bg-[#D97706] hover:text-white'
          }`}
          title="प्लेबैक गति बदलें"
        >
          {playbackSpeed}×
        </button>

        {/* Download Audio */}
        <a
          href={src}
          download="voice_note.webm"
          className={`p-1.5 rounded-lg transition-all ${
            isMe
              ? 'text-white/80 hover:text-white hover:bg-white/10'
              : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
          }`}
          title="ध्वनि संदेश डाउनलोड करें"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
