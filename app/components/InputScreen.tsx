"use client";

import { useState } from "react";
import { SessionConfig, MusicStyle, Duration } from "@/lib/types";

const PRESET_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];
const MUSIC_STYLES: MusicStyle[] = [
  "Lo-fi",
  "Ambient",
  "Classical",
  "Jazz",
  "Nature Sounds",
  "Electronic Focus",
  "Epic/Cinematic",
];

type DurationMode = "preset" | "custom" | "indefinite";

interface Props {
  onStart: (config: SessionConfig) => void;
}

export default function InputScreen({ onStart }: Props) {
  const [task, setTask] = useState("");
  const [durationMode, setDurationMode] = useState<DurationMode>("preset");
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [musicStyle, setMusicStyle] = useState<MusicStyle>("Lo-fi");

  const effectiveDuration: Duration =
    durationMode === "indefinite"
      ? null
      : durationMode === "custom"
      ? parseInt(customMinutes) || null
      : presetMinutes;

  const canSubmit =
    task.trim().length > 0 &&
    (durationMode === "indefinite" ||
      durationMode === "preset" ||
      (durationMode === "custom" && parseInt(customMinutes) >= 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onStart({ task: task.trim(), duration: effectiveDuration, musicStyle });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 opacity-80 blur-sm absolute" />
            <div className="w-8 h-8 rounded-full bg-indigo-400 relative" />
            <h1 className="text-3xl font-light tracking-widest text-white">FocusFlow</h1>
          </div>
        </div>

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
            <div className="grid grid-cols-5 gap-2">
              {PRESET_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDurationMode("preset"); setPresetMinutes(d); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    durationMode === "preset" && presetMinutes === d
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                      : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
                  }`}
                >
                  {d}m
                </button>
              ))}

              {/* Custom */}
              <button
                type="button"
                onClick={() => setDurationMode("custom")}
                className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                  durationMode === "custom"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                    : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
                }`}
              >
                Custom
              </button>

              {/* Indefinite */}
              <button
                type="button"
                onClick={() => setDurationMode("indefinite")}
                className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                  durationMode === "indefinite"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                    : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-600 hover:text-gray-200"
                }`}
              >
                ∞
              </button>
            </div>

            {/* Custom minutes input */}
            {durationMode === "custom" && (
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Minutes"
                  autoFocus
                  className="w-full bg-gray-900 border border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                />
                <span className="text-gray-500 text-sm whitespace-nowrap">minutes</span>
              </div>
            )}
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
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium tracking-wide transition-all duration-200 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-900/60 mt-2"
          >
            Start Session
          </button>
        </form>
      </div>
    </div>
  );
}
