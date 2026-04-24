import { useEffect, useState } from "react";
import StarField from "../components/StarField";
import { initAudio } from "../lib/sounds";

interface Props {
  onPlay: () => void;
  onQuiz: () => void;
  onRetakeQuiz: () => void;
}

export default function HomeScreen({ onPlay, onQuiz, onRetakeQuiz }: Props) {
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

        {/* CTA Buttons */}
        <div className="space-y-3 mb-6">

          {/* Play Game — primary CTA */}
          <button
            className="btn-primary w-full text-xl py-4"
            onClick={() => { initAudio(); onPlay(); }}
            style={{ fontSize: "1.2rem", padding: "1rem" }}
          >
            🎮 Play Game
          </button>

          {/* Take / Retake Quiz */}
          {!quizDone ? (
            <button
              className="w-full rounded-2xl font-black text-lg py-4 transition-all"
              style={{
                background: "rgba(255,215,0,0.12)",
                border: "2px solid rgba(255,215,0,0.5)",
                color: "#FFD700",
                boxShadow: "0 0 20px rgba(255,215,0,0.2)",
                fontSize: "1.1rem",
                padding: "0.9rem",
              }}
              onClick={() => { initAudio(); onQuiz(); }}
            >
              🧠 Take the Quiz
              <span style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "rgba(255,215,0,0.65)",
                marginTop: 2,
              }}>
                Discover your parrot type
              </span>
            </button>
          ) : (
            <button
              className="w-full rounded-2xl font-bold text-base py-3 transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
                fontSize: "1rem",
                padding: "0.8rem",
              }}
              onClick={() => { initAudio(); onRetakeQuiz(); }}
            >
              🔁 Retake Quiz
            </button>
          )}
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
            <p className="text-gray-300 text-sm">Swipe left / right to move</p>
          </div>
        </div>

        <p className="text-gray-600 text-xs mt-5">Leaderboard ranked by (Time × 10) + Fruit Pts</p>
      </div>
    </div>
  );
}
