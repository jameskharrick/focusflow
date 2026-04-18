"use client";

import { useState, useCallback } from "react";
import { AppState, SessionConfig, GeneratedContent, LoadingStatus } from "@/lib/types";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import SessionPlayer from "./components/SessionPlayer";

const initialStatus: LoadingStatus = {
  prompts: "pending",
  music: "pending",
};

async function fetchVideo(
  musicStyle: SessionConfig["musicStyle"],
  duration: SessionConfig["duration"],
  excludeVideoId?: string
): Promise<GeneratedContent> {
  const res = await fetch("/api/find-music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicStyle, duration, excludeVideoId }),
  });
  if (!res.ok) throw new Error("Failed to find music");
  const data = await res.json();
  return { videoId: data.videoId, videoTitle: data.title, videoChannel: data.channel };
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("input");
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (sessionConfig: SessionConfig) => {
    setConfig(sessionConfig);
    setError(null);
    setLoadingStatus(initialStatus);
    setAppState("loading");

    try {
      setLoadingStatus((s) => ({ ...s, prompts: "loading" }));
      const promptsRes = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: sessionConfig.task,
          duration: sessionConfig.duration,
          musicStyle: sessionConfig.musicStyle,
        }),
      });
      if (!promptsRes.ok) throw new Error("Failed to generate prompts");
      setLoadingStatus((s) => ({ ...s, prompts: "done", music: "loading" }));

      const newContent = await fetchVideo(sessionConfig.musicStyle, sessionConfig.duration);
      setLoadingStatus((s) => ({ ...s, music: "done" }));
      setContent(newContent);
      setAppState("session");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingStatus((s) => ({
        ...s,
        prompts: s.prompts === "loading" ? "error" : s.prompts,
        music: s.music === "loading" ? "error" : s.music,
      }));
      setTimeout(() => { setAppState("input"); setError(null); }, 3000);
    }
  }, []);

  const findNewVideo = useCallback(async (excludeVideoId: string) => {
    if (!config) return;
    const newContent = await fetchVideo(config.musicStyle, config.duration, excludeVideoId);
    setContent(newContent);
  }, [config]);

  const endSession = useCallback(() => {
    setAppState("input");
    setContent(null);
    setConfig(null);
    setLoadingStatus(initialStatus);
  }, []);

  return (
    <>
      {appState === "input" && (
        <div>
          <InputScreen onStart={startSession} />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-700 text-red-200 text-sm px-5 py-3 rounded-xl backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>
      )}
      {appState === "loading" && <LoadingScreen status={loadingStatus} />}
      {appState === "session" && config && content && (
        <SessionPlayer
          config={config}
          content={content}
          onFindNew={findNewVideo}
          onEnd={endSession}
        />
      )}
    </>
  );
}
