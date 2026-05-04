"use client";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <span className="text-2xl font-semibold tracking-tight">
            Smart<span className="text-blue-400">Log</span>
          </span>
        </div>

        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold mb-3">Session complete</h1>
        <p className="text-slate-400 leading-relaxed">
          Thank you. Your setup has been defined and saved.
        </p>

        <button
          onClick={() => router.push("/")}
          className="mt-10 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← Back to start
        </button>
      </div>
    </div>
  );
}
