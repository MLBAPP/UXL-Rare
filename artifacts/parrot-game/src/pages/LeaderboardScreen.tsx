import { useEffect, useState } from "react";
import StarField from "../components/StarField";
import { getLeaderboard, LeaderboardEntry } from "../lib/leaderboard";

interface Props {
  onGoHome: () => void;
}

export default function LeaderboardScreen({ onGoHome }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      className="quiz-bg relative min-h-screen flex flex-col items-center justify-start p-5 overflow-y-auto overflow-x-hidden"
      style={{ background: "linear-gradient(180deg,#07041a,#0f0630 40%,#1a0a45)" }}
    >
      <StarField count={70} />

      <div className="relative z-10 text-center max-w-sm w-full pt-4 pb-10">

        <div className="float-anim text-5xl mb-3">🏆</div>
        <h2 className="text-4xl font-black text-yellow-300 neon-text mb-1">Leaderboard</h2>
        <p className="text-purple-300 text-xs font-semibold mb-6 uppercase tracking-widest">
          Top 10 • Ranked by Final Score
        </p>

        {entries.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-4xl mb-3">🦜</div>
            <p className="text-gray-400 font-bold">No runs yet!</p>
            <p className="text-gray-600 text-sm mt-1">Play the game to claim the top spot.</p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 mb-5 text-left"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            {/* Column headers */}
            <div className="flex items-center gap-2 px-2 mb-2">
              <span style={{ minWidth: 26 }} />
              <span style={{ flex: 1, fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                PLAYER
              </span>
              <span style={{ minWidth: 46, textAlign: "right", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                TIME
              </span>
              <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                FRUIT
              </span>
              <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                FINAL
              </span>
            </div>

            <div className="space-y-1.5">
              {entries.map((entry, i) => {
                const isTop3 = i < 3;
                const medal = medals[i] ?? `#${i + 1}`;
                const rowColor =
                  i === 0 ? "rgba(255,215,0,0.10)"
                  : i === 1 ? "rgba(192,192,192,0.08)"
                  : i === 2 ? "rgba(205,127,50,0.08)"
                  : "rgba(255,255,255,0.03)";
                const borderColor =
                  i === 0 ? "rgba(255,215,0,0.30)"
                  : i === 1 ? "rgba(192,192,192,0.20)"
                  : i === 2 ? "rgba(205,127,50,0.20)"
                  : "transparent";
                const nameColor =
                  i === 0 ? "#FFD700"
                  : i === 1 ? "#d0d0d0"
                  : i === 2 ? "#cd7f32"
                  : "rgba(255,255,255,0.75)";

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl px-2 py-2"
                    style={{ background: rowColor, border: `1px solid ${borderColor}` }}
                  >
                    <span style={{ fontSize: isTop3 ? "1.1rem" : "0.85rem", minWidth: 26, textAlign: "center" }}>
                      {medal}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      color: nameColor,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {entry.name}
                    </span>
                    <span style={{ minWidth: 46, textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                      {entry.timeAlive.toFixed(1)}s
                    </span>
                    <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "#FFD700" }}>
                      🍎{entry.score}
                    </span>
                    <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.82rem", fontWeight: 900, color: "#a78bfa" }}>
                      ⭐{entry.finalScore}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-gray-600 text-xs text-center mt-4">
              Final Score = (Time × 10) + Fruit Pts
            </p>
          </div>
        )}

        <button
          className="btn-primary w-full text-xl"
          onClick={onGoHome}
        >
          🏠 Back to Home
        </button>
      </div>
    </div>
  );
}
