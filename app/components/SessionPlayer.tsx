"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SessionConfig, GeneratedContent } from "@/lib/types";

interface Props {
  config: SessionConfig;
  content: GeneratedContent;
  onEnd: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionPlayer({ config, content, onEnd }: Props) {
  const totalSeconds = config.duration * 60;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = (timeLeft / totalSeconds) * 100;
  const isNearEnd = timeLeft <= 60 && timeLeft > 0;

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsVisible(false);
    setTimeout(onEnd, 600);
  }, [onEnd]);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.7;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimeout(handleEnd, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleEnd]);

  return (
    <div
      className={`fixed inset-0 transition-opacity duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background image with Ken Burns */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center ken-burns"
          style={{ backgroundImage: `url(${content.image})` }}
        />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Looping audio */}
      <audio ref={audioRef} src={content.audio} loop preload="auto" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between px-6 py-12">
        {/* Task label */}
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] text-white/40 uppercase mb-1">
            Working on
          </p>
          <p className="text-white/70 text-sm font-light max-w-sm text-center">
            {config.task}
          </p>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${
                isNearEnd
                  ? "bg-red-500/30 scale-150"
                  : "bg-indigo-500/20 scale-125 animate-pulse"
              }`}
            />
            <div
              className={`relative w-48 h-48 rounded-full border flex items-center justify-center transition-colors duration-1000 ${
                isNearEnd ? "border-red-400/40" : "border-indigo-400/30"
              }`}
            >
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 192 192"
              >
                <circle
                  cx="96" cy="96" r="88"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="2"
                />
                <circle
                  cx="96" cy="96" r="88"
                  fill="none"
                  stroke={isNearEnd ? "rgba(248,113,113,0.6)" : "rgba(129,140,248,0.6)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center">
                <span
                  className={`text-4xl font-extralight tabular-nums transition-colors duration-1000 ${
                    isNearEnd ? "text-red-300" : "text-white"
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
                <p className="text-white/30 text-xs mt-1 tracking-widest uppercase">
                  remaining
                </p>
              </div>
            </div>
          </div>

          {/* Music style badge */}
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-widest uppercase">
              {config.musicStyle}
            </span>
          </div>
        </div>

        {/* End button */}
        <button
          onClick={handleEnd}
          className="text-white/30 hover:text-white/70 text-xs tracking-[0.2em] uppercase transition-colors duration-200 border border-white/10 hover:border-white/30 rounded-full px-6 py-2.5 backdrop-blur-sm"
        >
          End Session
        </button>
      </div>
    </div>
  );
}
