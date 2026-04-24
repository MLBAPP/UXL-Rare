import { useEffect, useState } from "react";
import StarField from "../components/StarField";
import { getLeaderboard, LeaderboardEntry } from "../lib/leaderboard";

interface ResultScreenProps {
  score: number;
  timeAlive: number;
  onPlayAgain: () => void;
}

interface Rank {
  label: string;
  emoji: string;
  color: string;
  description: string;
  minSeconds: number;
  rangeLabel: string;
}

const RANKS: Rank[] = [
  {
    label: "G10K LEGEND",
    emoji: "🏆",
    color: "#FFD700",
    description: "ABSOLUTE UNIT. The parrot gods tremble before you.",
    minSeconds: 60,
    rangeLabel: "60s+",
  },
  {
    label: "Chaos Parrot",
    emoji: "🔥",
    color: "#FF6B00",
    description: "Born for mayhem. The chaos flows through you.",
    minSeconds: 31,
    rangeLabel: "31–59s",
  },
  {
    label: "Street Bird",
    emoji: "🐦",
    color: "#00CFFF",
    description: "You've seen things. Not enough things, but things.",
    minSeconds: 21,
    rangeLabel: "21–30s",
  },
  {
    label: "Baby Parrot",
    emoji: "🐣",
    color: "#FF69B4",
    description: "Freshly hatched. The world is big and scary and you proved it.",
    minSeconds: 0,
    rangeLabel: "0–20s",
  },
];

function getRank(t: number): Rank {
  for (const r of RANKS) {
    if (t >= r.minSeconds) return r;
  }
  return RANKS[RANKS.length - 1];
}

export default function ResultScreen({ score, timeAlive, onPlayAgain }: ResultScreenProps) {
  const rank     = getRank(timeAlive);
  const isLegend = timeAlive >= 60;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  return (
    <div className="quiz-bg relative min-h-screen flex flex-col items-center justify-start p-4 overflow-y-auto overflow-x-hidden">
      <StarField count={isLegend ? 120 : 80} />

      {isLegend && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute text-3xl"
              style={{
                left: `${(i * 8.3) % 100}%`,
                top: `${(i * 7.7) % 100}%`,
                animation: `twinkle ${1 + (i % 3) * 0.7}s ease-in-out infinite`,
                animationDelay: `${(i * 0.2) % 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center max-w-sm w-full pt-4 pb-8">

        {/* Rank badge */}
        <div
          className="inline-block px-6 py-2 rounded-full font-black text-sm mb-3 pop-anim"
          style={{
            background: `${rank.color}22`,
            border: `2px solid ${rank.color}`,
            color: rank.color,
            boxShadow: `0 0 25px ${rank.color}60`,
          }}
        >
          {rank.label}
        </div>

        <div className={`${isLegend ? "wiggle-anim" : "float-anim"} text-8xl mb-2`}>
          {rank.emoji}
        </div>

        <p className="text-gray-300 text-sm mb-4 italic px-4">{rank.description}</p>

        {/* Score + Time card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex gap-3">
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs mb-1">POINTS</p>
            <p className="font-black text-3xl" style={{ color: "#FFD700", textShadow: "0 0 14px #FFD70088" }}>
              ⭐ {score}
            </p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs mb-1">SURVIVED</p>
            <p className="font-black text-3xl" style={{ color: rank.color, textShadow: `0 0 14px ${rank.color}88` }}>
              {timeAlive.toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Rank tiers */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left space-y-1.5">
          <p className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-wider">Rank Tiers (by time)</p>
          {RANKS.map((r) => {
            const isActive = rank.label === r.label;
            return (
              <div
                key={r.label}
                className="flex items-center gap-3 rounded-xl px-3 py-1.5 transition-all"
                style={{
                  background: isActive ? `${r.color}15` : "transparent",
                  border: isActive ? `1px solid ${r.color}40` : "1px solid transparent",
                }}
              >
                <span className="text-lg">{r.emoji}</span>
                <div className="flex-1">
                  <span className="font-bold text-sm" style={{ color: isActive ? r.color : "#888" }}>
                    {r.label}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">{r.rangeLabel}</span>
                </div>
                {isActive && (
                  <span className="text-xs font-black" style={{ color: r.color }}>YOU</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left">
            <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider">🏅 Leaderboard</p>
            <div className="space-y-2">
              {leaderboard.slice(0, 8).map((entry, i) => {
                const isCurrentRun = entry.score === score && entry.timeAlive === timeAlive;
                const medals = ["🥇", "🥈", "🥉"];
                const medal  = medals[i] ?? `#${i + 1}`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: isCurrentRun ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
                      border: isCurrentRun ? "1px solid rgba(255,215,0,0.3)" : "1px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: "1rem", minWidth: 24 }}>{medal}</span>
                    <div className="flex-1 flex items-baseline gap-1.5">
                      <span style={{ fontWeight: 900, fontSize: "1rem", color: "#FFD700" }}>
                        ⭐ {entry.score}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>pts</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                      {entry.timeAlive.toFixed(1)}s
                    </span>
                    {isCurrentRun && (
                      <span style={{ fontSize: "0.65rem", color: "#FFD700", fontWeight: 900 }}>NEW</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn-primary w-full text-xl mb-3" onClick={onPlayAgain}>
          🔄 Play Again
        </button>

        <p className="text-gray-600 text-xs">
          {isLegend
            ? "🔥 Certified G10K Legend. Screenshot this."
            : timeAlive >= 31
            ? "The chaos is strong with you."
            : timeAlive >= 21
            ? "Keep going. The streets need you."
            : "The egg is calling you back. Try again."}
        </p>
      </div>
    </div>
  );
}
