"use client";

import { useState, useCallback } from "react";
import { AppState, SessionConfig, GeneratedContent, LoadingStatus } from "@/lib/types";
import InputScreen from "./components/InputScreen";
import LoadingScreen from "./components/LoadingScreen";
import SessionPlayer from "./components/SessionPlayer";

const initialStatus: LoadingStatus = {
  prompts: "pending",
  image: "pending",
  music: "pending",
};

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
      // Step 1: Generate prompts via Gemini (with fallback)
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
      const { imagePrompt, musicPrompt } = await promptsRes.json();
      setLoadingStatus((s) => ({ ...s, prompts: "done", image: "loading", music: "loading" }));

      // Step 2: Generate image and music in parallel
      const [imageRes, musicRes] = await Promise.all([
        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt }),
        }),
        fetch("/api/generate-music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ musicPrompt }),
        }),
      ]);

      if (!imageRes.ok) throw new Error("Failed to generate image");
      if (!musicRes.ok) throw new Error("Failed to generate music");

      const [imageData, musicData] = await Promise.all([
        imageRes.json(),
        musicRes.json(),
      ]);

      setLoadingStatus((s) => ({ ...s, image: "done", music: "done" }));
      setContent({ image: imageData.image, audio: musicData.audio });
      setAppState("session");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingStatus((s) => ({
        ...s,
        prompts: s.prompts === "loading" ? "error" : s.prompts,
        image: s.image === "loading" ? "error" : s.image,
        music: s.music === "loading" ? "error" : s.music,
      }));
      setTimeout(() => {
        setAppState("input");
        setError(null);
      }, 3000);
    }
  }, []);

  const endSession = useCallback(() => {
    setAppState("input");
    setContent(null);
    setConfig(null);
    setLoadingStatus(initialStatus);
  }, []);

  return (
    <>
      {appState === "input" && (
        <div className="transition-opacity duration-500">
          <InputScreen onStart={startSession} />
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-700 text-red-200 text-sm px-5 py-3 rounded-xl backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {appState === "loading" && (
        <LoadingScreen status={loadingStatus} />
      )}

      {appState === "session" && config && content && (
        <SessionPlayer
          config={config}
          content={content}
          onEnd={endSession}
        />
      )}
    </>
  );
}
