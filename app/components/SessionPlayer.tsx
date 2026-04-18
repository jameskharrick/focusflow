"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SessionConfig, GeneratedContent } from "@/lib/types";

interface YTPlayerInstance {
  destroy: () => void;
  loadVideoById: (id: string) => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Props {
  config: SessionConfig;
  content: GeneratedContent;
  onFindNew: (excludeVideoId: string) => Promise<void>;
  onEnd: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionPlayer({ config, content, onFindNew, onEnd }: Props) {
  const isIndefinite = config.duration === null;
  const totalSeconds = isIndefinite ? 0 : config.duration! * 60;

  const [elapsed, setElapsed] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFindingNew, setIsFindingNew] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const timeLeft = isIndefinite ? null : Math.max(0, totalSeconds - elapsed);
  const progress = isIndefinite ? null : totalSeconds > 0 ? ((totalSeconds - elapsed) / totalSeconds) * 100 : 100;
  const isNearEnd = timeLeft !== null && timeLeft <= 60 && timeLeft > 0;

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    playerRef.current?.destroy();
    setIsVisible(false);
    setTimeout(onEnd, 500);
  }, [onEnd]);

  const handleFindNew = useCallback(async () => {
    if (isFindingNew) return;
    setIsFindingNew(true);
    try {
      await onFindNew(contentRef.current.videoId);
    } finally {
      setIsFindingNew(false);
    }
  }, [isFindingNew, onFindNew]);

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (!isIndefinite && next >= totalSeconds) {
          clearInterval(timerRef.current!);
          setTimeout(handleEnd, 500);
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [handleEnd, isIndefinite, totalSeconds]);

  // YouTube IFrame API — create player, detect video end for indefinite sessions
  useEffect(() => {
    if (!containerRef.current) return;

    const initPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: content.videoId,
        playerVars: {
          autoplay: 1,
          // Loop for timed sessions; no loop for indefinite (so we can detect end)
          loop: isIndefinite ? 0 : 1,
          playlist: content.videoId, // required for loop to work
          controls: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED && isIndefinite) {
              handleFindNew();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      // Load the IFrame API script once
      if (!document.getElementById("yt-iframe-api")) {
        const script = document.createElement("script");
        script.id = "yt-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — video changes handled below

  // When videoId changes (Find New Flow), load into existing player
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loadVideoById(content.videoId);
    }
  }, [content.videoId]);

  return (
    <div
      className={`min-h-screen bg-gray-950 flex flex-col transition-opacity duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* YouTube player */}
      <div className="flex-1 w-full bg-black relative">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* "Finding new flow" overlay */}
        {isFindingNew && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-10">
            <span className="inline-block w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-white/60 text-sm tracking-widest uppercase">Finding new flow</p>
          </div>
        )}
      </div>

      {/* Info + controls bar */}
      <div className="flex-shrink-0 bg-gray-950 border-t border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

          {/* Task + track info */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">{config.task}</p>
            <p className="text-white/40 text-xs truncate">
              {content.videoTitle} · {content.videoChannel}
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isIndefinite ? (
              <div className="text-right">
                <span className="text-2xl font-extralight tabular-nums leading-none text-white/60">
                  {formatTime(elapsed)}
                </span>
                <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">elapsed</p>
              </div>
            ) : (
              <>
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                    <circle
                      cx="20" cy="20" r="17" fill="none"
                      stroke={isNearEnd ? "rgba(248,113,113,0.8)" : "rgba(129,140,248,0.8)"}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 17}`}
                      strokeDashoffset={`${2 * Math.PI * 17 * (1 - (progress ?? 100) / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-extralight tabular-nums leading-none transition-colors duration-1000 ${
                    isNearEnd ? "text-red-300" : "text-white"
                  }`}>
                    {formatTime(timeLeft!)}
                  </span>
                  <p className="text-white/30 text-xs tracking-widest uppercase mt-0.5">remaining</p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-white/50 text-xs tracking-widest uppercase">{config.musicStyle}</span>
            </div>

            <button
              onClick={handleFindNew}
              disabled={isFindingNew}
              className="text-white/40 hover:text-white/80 text-xs tracking-[0.15em] uppercase transition-colors border border-white/10 hover:border-white/30 rounded-full px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              New Flow
            </button>

            <button
              onClick={handleEnd}
              className="text-white/40 hover:text-white/80 text-xs tracking-[0.15em] uppercase transition-colors border border-white/10 hover:border-white/30 rounded-full px-4 py-2"
            >
              End Session
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
