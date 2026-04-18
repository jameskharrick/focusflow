"use client";

import { LoadingStatus } from "@/lib/types";

interface Props {
  status: LoadingStatus;
}

const steps: { key: keyof LoadingStatus; label: string; sub: string }[] = [
  {
    key: "prompts",
    label: "Reading your task",
    sub: "Understanding your focus context...",
  },
  {
    key: "music",
    label: "Finding your soundtrack",
    sub: "Searching YouTube for the perfect match...",
  },
];

function StatusIcon({ state }: { state: LoadingStatus[keyof LoadingStatus] }) {
  if (state === "done") return <span className="text-emerald-400 text-lg">✓</span>;
  if (state === "loading") return (
    <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
  );
  if (state === "error") return <span className="text-red-400 text-lg">✕</span>;
  return <span className="inline-block w-2 h-2 rounded-full bg-gray-700" />;
}

export default function LoadingScreen({ status }: Props) {
  const activeStep = steps.find((s) => status[s.key] === "loading");

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="relative mb-16">
        <div className="w-24 h-24 rounded-full bg-indigo-600 opacity-20 animate-ping absolute inset-0" />
        <div className="w-24 h-24 rounded-full bg-indigo-500 opacity-30 animate-pulse absolute inset-0" />
        <div className="w-24 h-24 rounded-full bg-indigo-400 opacity-80 relative flex items-center justify-center">
          <span className="text-3xl">✦</span>
        </div>
      </div>

      <div className="text-center mb-12 h-16">
        {activeStep && (
          <>
            <h2 className="text-white text-xl font-light tracking-wide mb-2">{activeStep.label}</h2>
            <p className="text-gray-500 text-sm">{activeStep.sub}</p>
          </>
        )}
      </div>

      <div className="space-y-4 w-full max-w-xs">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-4">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <StatusIcon state={status[step.key]} />
            </div>
            <span className={`text-sm transition-colors ${
              status[step.key] === "done" ? "text-gray-400 line-through"
              : status[step.key] === "loading" ? "text-white"
              : status[step.key] === "error" ? "text-red-400"
              : "text-gray-600"
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
