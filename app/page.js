"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const pains = [
  {
    id: "fomo",
    title: "FOMO / Early Entry",
    description: "I jump in before my setup is complete — afraid to miss the move.",
  },
  {
    id: "late",
    title: "Hesitation / Late Entry",
    description: "I wait too long and enter after the move has already happened.",
  },
  {
    id: "exit",
    title: "Early Exit",
    description: "I close trades too soon and watch them go where I expected.",
  },
  {
    id: "revenge",
    title: "Revenge / Overtrading",
    description: "After a loss I trade more, bigger, or differently than planned.",
  },
  {
    id: "stoploss",
    title: "Stop Loss Tampering",
    description: "I move or remove my stop loss when price gets close.",
  },
  {
    id: "boredom",
    title: "Boredom / Forcing Trades",
    description: "When nothing happens I manufacture reasons to trade.",
  },
];

export default function Home() {
  const [selected, setSelected] = useState(null);
  const router = useRouter();

  function handleStart() {
    if (selected) router.push(`/conversation?pain=${selected}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <span className="text-xl font-semibold tracking-tight text-white">
            Smart<span className="text-blue-400">Log</span>
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full">

          {/* Headline */}
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-semibold text-white mb-3">
              What&apos;s been bothering you lately?
            </h1>
            <p className="text-slate-400 text-base">
              Pick the pattern that feels most familiar right now.
            </p>
          </div>

          {/* Pain cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pains.map((pain) => (
              <button
                key={pain.id}
                onClick={() => setSelected(pain.id)}
                className={`text-left p-5 rounded-xl border transition-all duration-150 ${
                  selected === pain.id
                    ? "border-blue-400 bg-blue-950/50 shadow-lg shadow-blue-900/20"
                    : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                      selected === pain.id
                        ? "border-blue-400 bg-blue-400"
                        : "border-slate-600"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-white text-sm mb-1">
                      {pain.title}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {pain.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 flex justify-center">
            <button
              disabled={!selected}
              onClick={handleStart}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                selected
                  ? "bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              Let&apos;s look at this together →
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
