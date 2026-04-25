import { useEffect, useState } from "react";
import StarField from "../components/StarField";
import { initAudio } from "../lib/sounds";

interface Props {
  onPlay: () => void;
  onLeaderboard: () => void;
  onQuiz: () => void;
}

export default function HomeScreen({ onPlay, onLeaderboard, onQuiz }: Props) {
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    setQuizDone(localStorage.getItem("quizCompleted") === "true");
  }, []);

  return (
    <div
      className="quiz-bg relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#07041a,#0f0630 40%,#1a0a45)" }}
    >
      <StarField count={90} />

      <div className="relative z-10 text-center max-w-sm w-full">

        {/* Logo */}
        <div className="float-anim mb-4" style={{ fontSize: "5rem" }}>🦜</div>
        <h1 className="text-5xl font-black mb-1 neon-text text-yellow-300 leading-tight">
          PARROT<br />PANIC!
        </h1>
        <p className="text-purple-300 text-xs font-semibold mb-8 uppercase tracking-widest">
          The 10K Squad Experience
        </p>

        {/* Main Menu Buttons */}
        <div className="space-y-3 mb-6">

          {/* Play */}
          <button
            className="btn-primary w-full text-xl"
            onClick={() => { initAudio(); onPlay(); }}
            style={{ fontSize: "1.2rem", padding: "1rem" }}
          >
            🎮 Play
          </button>

          {/* Leaderboard */}
          <button
            className="w-full rounded-2xl font-black text-lg transition-all"
            style={{
              background: "rgba(167,139,250,0.12)",
              border: "2px solid rgba(167,139,250,0.45)",
              color: "#a78bfa",
              boxShadow: "0 0 20px rgba(167,139,250,0.15)",
              fontSize: "1.1rem",
              padding: "0.9rem",
              cursor: "pointer",
            }}
            onClick={() => { initAudio(); onLeaderboard(); }}
          >
            🏆 Leaderboard
          </button>

          {/* Quiz */}
          <button
            className="w-full rounded-2xl font-black text-lg transition-all"
            style={{
              background: "rgba(255,215,0,0.10)",
              border: "2px solid rgba(255,215,0,0.40)",
              color: "#FFD700",
              boxShadow: "0 0 20px rgba(255,215,0,0.12)",
              fontSize: "1.1rem",
              padding: "0.9rem",
              cursor: "pointer",
            }}
            onClick={() => { initAudio(); onQuiz(); }}
          >
            🧠 Quiz
            {!quizDone && (
              <span style={{
                display: "block",
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "rgba(255,215,0,0.55)",
                marginTop: 2,
              }}>
                Discover your parrot type
              </span>
            )}
          </button>
        </div>

        {/* How to play blurb */}
        <div
          className="text-left rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">How to play</p>
          <div className="flex items-start gap-2">
            <span>🍎</span>
            <p className="text-gray-300 text-sm">Catch fruits for points</p>
          </div>
          <div className="flex items-start gap-2">
            <span>💣</span>
            <p className="text-gray-300 text-sm">Dodge bombs — one hit ends the run</p>
          </div>
          <div className="flex items-start gap-2">
            <span>📱</span>
            <p className="text-gray-300 text-sm">Drag anywhere to move freely</p>
          </div>
        </div>

        <p className="text-gray-600 text-xs mt-5">Ranked by (Time × 10) + Fruit Pts</p>
      </div>
    </div>
  );
}
