"use client";

import { LoadingStatus } from "@/lib/types";

interface Props {
  status: LoadingStatus;
}

function StatusIcon({ state }: { state: LoadingStatus[keyof LoadingStatus] }) {
  if (state === "done") return <span className="text-emerald-400 text-lg">✓</span>;
  if (state === "loading") return (
    <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
  );
  if (state === "error") return <span className="text-red-400 text-lg">✕</span>;
  return <span className="inline-block w-2 h-2 rounded-full bg-gray-700" />;
}

export default function LoadingScreen({ status }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="relative mb-16">
        <div className="w-24 h-24 rounded-full bg-indigo-600 opacity-20 animate-ping absolute inset-0" />
        <div className="w-24 h-24 rounded-full bg-indigo-500 opacity-30 animate-pulse absolute inset-0" />
        <div className="w-24 h-24 rounded-full bg-indigo-400 opacity-80 relative flex items-center justify-center">
          <span className="text-3xl">✦</span>
        </div>
      </div>

      <div className="text-center mb-12">
        {status.music === "loading" && (
          <>
            <h2 className="text-white text-xl font-light tracking-wide mb-2">Finding your soundtrack</h2>
            <p className="text-gray-500 text-sm">Searching YouTube for the perfect match...</p>
          </>
        )}
        {status.music === "error" && (
          <p className="text-red-400 text-sm">Could not find a video — please try again.</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-6 h-6 flex items-center justify-center">
          <StatusIcon state={status.music} />
        </div>
        <span className={`text-sm transition-colors ${
          status.music === "done" ? "text-gray-400 line-through"
          : status.music === "loading" ? "text-white"
          : status.music === "error" ? "text-red-400"
          : "text-gray-600"
        }`}>
          Finding your soundtrack
        </span>
      </div>
    </div>
  );
}
