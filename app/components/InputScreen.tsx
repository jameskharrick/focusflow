"use client";

import { useState } from "react";
import { SessionConfig, MusicStyle, Duration } from "@/lib/types";

const DURATIONS: Duration[] = [5, 10, 15, 20, 25, 30, 45, 60];
const MUSIC_STYLES: MusicStyle[] = [
  "Lo-fi",
  "Ambient",
  "Classical",
  "Jazz",
  "Nature Sounds",
  "Electronic Focus",
  "Epic/Cinematic",
];

interface Props {
  onStart: (config: SessionConfig) => void;
}

export default function InputScreen({ onStart }: Props) {
  const [task, setTask] = useState("");
  const [duration, setDuration] = useState<Duration>(25);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>("Lo-fi");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    onStart({ task: task.trim(), duration, musicStyle });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 opacity-80 blur-sm absolute" />
            <div className="w-8 h-8 rounded-full bg-indigo-400 relative" />
            <h1 className="text-3xl font-light tracking-widest text-white">
              FocusFlow
            </h1>
          </div>
          <p className="text-gray-500 text-sm tracking-wide mt-4">
            AI-crafted ambience for deep work
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 tracking-widest uppercase">
              What are you working on?
            </label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Writing a research paper, coding a new feature..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
              required
            />
          </div>

          {/* Duration picker */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 tracking-widest uppercase">
              Session duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    duration === d
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                      : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Music style */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400 tracking-widest uppercase">
              Music vibe
            </label>
            <select
              value={musicStyle}
              onChange={(e) => setMusicStyle(e.target.value as MusicStyle)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm appearance-none cursor-pointer"
            >
              {MUSIC_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!task.trim()}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium tracking-wide transition-all duration-200 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 mt-2"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
