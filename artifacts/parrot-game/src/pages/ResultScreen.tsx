import { useEffect, useState } from "react";
import StarField from "../components/StarField";
import { getLeaderboard, LeaderboardEntry } from "../lib/leaderboard";

interface Props {
  score: number;
  timeAlive: number;
  playerName: string;
  onGoHome: () => void;
  onPlayAgain: () => void;
}

interface GameRank {
  label: string;
  emoji: string;
  color: string;
  description: string;
  minSeconds: number;
  rangeLabel: string;
}

const RANKS: GameRank[] = [
  { label: "G10K LEGEND",   emoji: "🏆", color: "#FFD700", description: "ABSOLUTE UNIT. The parrot gods tremble before you.", minSeconds: 60, rangeLabel: "60s+" },
  { label: "Chaos Parrot",  emoji: "🔥", color: "#FF6B00", description: "Born for mayhem. The chaos flows through you.",       minSeconds: 31, rangeLabel: "31–59s" },
  { label: "Street Bird",   emoji: "🐦", color: "#00CFFF", description: "You've seen things. Not enough things, but things.",  minSeconds: 21, rangeLabel: "21–30s" },
  { label: "Baby Parrot",   emoji: "🐣", color: "#FF69B4", description: "Freshly hatched. The world is big and scary.",        minSeconds: 0,  rangeLabel: "0–20s" },
];

function getRank(t: number) {
  for (const r of RANKS) { if (t >= r.minSeconds) return r; }
  return RANKS[RANKS.length - 1];
}

export default function ResultScreen({ score, timeAlive, playerName, onGoHome, onPlayAgain }: Props) {
  const rank       = getRank(timeAlive);
  const finalScore = Math.round(timeAlive * 10) + score;
  const isLegend   = timeAlive >= 60;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  return (
    <div className="quiz-bg relative min-h-screen flex flex-col items-center justify-start p-4 overflow-y-auto overflow-x-hidden">
      <StarField count={isLegend ? 120 : 70} />

      {isLegend && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="absolute text-3xl" style={{
              left: `${(i * 8.3) % 100}%`, top: `${(i * 7.7) % 100}%`,
              animation: `twinkle ${1 + (i % 3) * 0.7}s ease-in-out infinite`,
              animationDelay: `${(i * 0.2) % 2}s`,
            }}>✨</div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center max-w-sm w-full pt-4 pb-8">

        {/* Rank badge */}
        <div className="inline-block px-6 py-2 rounded-full font-black text-sm mb-3 pop-anim" style={{
          background: `${rank.color}22`,
          border: `2px solid ${rank.color}`,
          color: rank.color,
          boxShadow: `0 0 25px ${rank.color}60`,
        }}>
          {rank.label}
        </div>

        <div className={`${isLegend ? "wiggle-anim" : "float-anim"} text-8xl mb-2`}>
          {rank.emoji}
        </div>
        <p className="text-gray-300 text-sm mb-5 italic px-4">{rank.description}</p>

        {/* Stats: three columns */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex gap-2">
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs mb-1">TIME</p>
            <p className="font-black text-2xl" style={{ color: rank.color }}>
              {timeAlive.toFixed(1)}s
            </p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs mb-1">FRUIT PTS</p>
            <p className="font-black text-2xl" style={{ color: "#FFD700" }}>
              🍎 {score}
            </p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs mb-1">FINAL</p>
            <p className="font-black text-2xl" style={{ color: "#a78bfa" }}>
              ⭐ {finalScore}
            </p>
          </div>
        </div>

        <p className="text-gray-600 text-xs mb-4">Final Score = (Time × 10) + Fruit Pts</p>

        {/* Game rank tiers */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left space-y-1.5">
          <p className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-wider">Survival Ranks</p>
          {RANKS.map((r) => {
            const isActive = rank.label === r.label;
            return (
              <div key={r.label} className="flex items-center gap-3 rounded-xl px-3 py-1.5" style={{
                background: isActive ? `${r.color}15` : "transparent",
                border: isActive ? `1px solid ${r.color}40` : "1px solid transparent",
              }}>
                <span className="text-lg">{r.emoji}</span>
                <div className="flex-1">
                  <span className="font-bold text-sm" style={{ color: isActive ? r.color : "#888" }}>{r.label}</span>
                  <span className="text-gray-500 text-xs ml-2">{r.rangeLabel}</span>
                </div>
                {isActive && <span className="text-xs font-black" style={{ color: r.color }}>YOU</span>}
              </div>
            );
          })}
        </div>

        {/* Leaderboard — 3 columns */}
        {leaderboard.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-left">
            <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider">🏅 Leaderboard</p>

            {/* Column headers */}
            <div className="flex items-center gap-2 px-3 mb-1">
              <span style={{ minWidth: 22 }} />
              <span style={{ flex: "0 0 auto", width: 90, fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>NAME</span>
              <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                <span className="text-gray-600 text-xs font-bold">TIME</span>
                <span className="text-gray-600 text-xs font-bold">FRUIT</span>
                <span className="text-gray-600 text-xs font-bold">FINAL</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {leaderboard.slice(0, 10).map((entry, i) => {
                const isMe     = entry.name.toLowerCase() === playerName.toLowerCase();
                const medals   = ["🥇", "🥈", "🥉"];
                const medal    = medals[i] ?? `#${i + 1}`;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{
                    background: isMe ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                    border:     isMe ? "1px solid rgba(167,139,250,0.4)" : "1px solid transparent",
                  }}>
                    <span style={{ fontSize: "1rem", minWidth: 22 }}>{medal}</span>
                    {/* Player name */}
                    <span style={{
                      flex: "0 0 auto", maxWidth: 90,
                      fontSize: "0.78rem", fontWeight: 800,
                      color: isMe ? "#a78bfa" : "rgba(255,255,255,0.7)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.name}
                    </span>
                    <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                        {entry.timeAlive.toFixed(1)}s
                      </span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#FFD700" }}>
                        🍎{entry.score}
                      </span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#a78bfa" }}>
                        ⭐{entry.finalScore}
                      </span>
                    </div>
                    {isMe && (
                      <span style={{ fontSize: "0.6rem", color: "#a78bfa", fontWeight: 900, flexShrink: 0 }}>YOU</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <button className="btn-primary w-full text-xl mb-3" onClick={onPlayAgain}>
          🔄 Play Again
        </button>
        <button
          onClick={onGoHome}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.65)",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          🏠 Back to Home
        </button>

        <p className="text-gray-600 text-xs mt-4">
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
