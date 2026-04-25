import { useState } from "react";
import StarField from "../components/StarField";

interface Props {
  score: number;
  timeAlive: number;
  onSubmit: (name: string) => void;
}

export default function NameInputScreen({ score, timeAlive, onSubmit }: Props) {
  const [name, setName] = useState("");
  const finalScore = Math.round(timeAlive * 10) + score;

  function submit(nameOverride?: string) {
    onSubmit((nameOverride ?? name).trim() || "Player");
  }

  return (
    <div
      className="quiz-bg relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#07041a,#0f0630 40%,#1a0a45)" }}
    >
      <StarField count={60} />

      <div className="relative z-10 text-center max-w-sm w-full">

        {/* Title */}
        <div className="float-anim text-6xl mb-4">💀</div>
        <h2 className="text-3xl font-black text-white mb-1">Game Over</h2>
        <p className="text-gray-400 text-sm mb-6">Your run has ended. Claim your spot on the board.</p>

        {/* Stats summary */}
        <div
          className="flex gap-3 mb-8 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex-1 text-center">
            <p className="text-gray-500 text-xs mb-1">TIME</p>
            <p className="font-black text-xl text-white">{timeAlive.toFixed(1)}s</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
          <div className="flex-1 text-center">
            <p className="text-gray-500 text-xs mb-1">FRUIT PTS</p>
            <p className="font-black text-xl" style={{ color: "#FFD700" }}>🍎 {score}</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
          <div className="flex-1 text-center">
            <p className="text-gray-500 text-xs mb-1">FINAL</p>
            <p className="font-black text-xl" style={{ color: "#a78bfa" }}>⭐ {finalScore}</p>
          </div>
        </div>

        {/* Name input */}
        <div className="mb-4 text-left">
          <label
            htmlFor="player-name"
            className="block text-sm font-bold text-gray-300 mb-2"
          >
            Enter your name
          </label>
          <input
            id="player-name"
            type="text"
            placeholder="Player"
            value={name}
            maxLength={20}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: 700,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => (e.target.style.border = "1.5px solid rgba(167,139,250,0.7)")}
            onBlur={e  => (e.target.style.border = "1.5px solid rgba(255,255,255,0.18)")}
          />
        </div>

        {/* Submit */}
        <button
          className="btn-primary w-full text-xl mb-3"
          onClick={() => submit()}
          style={{ padding: "14px" }}
        >
          🏅 Save to Leaderboard
        </button>

        {/* Skip */}
        <button
          onClick={() => submit("Player")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          Skip (save as "Player")
        </button>
      </div>
    </div>
  );
}
