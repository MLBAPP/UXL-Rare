import StarField from "../components/StarField";
import { BASE_SURVIVAL_TIME, BONUS_SECONDS_PER_CORRECT, QUESTIONS } from "../data/questions";

interface ResultScreenProps {
  survivalTime: number;
  bonusSeconds: number;
  onPlayAgain: () => void;
}

interface Rank {
  label: string;
  emoji: string;
  color: string;
  description: string;
  minSeconds: number;
}

const RANKS: Rank[] = [
  {
    label: "G10K LEGEND",
    emoji: "🏆",
    color: "#FFD700",
    description: "ABSOLUTE UNIT. The parrot gods tremble before you.",
    minSeconds: 36,
  },
  {
    label: "Chaos Parrot",
    emoji: "🔥",
    color: "#FF6B00",
    description: "Born for mayhem. The chaos flows through you.",
    minSeconds: 21,
  },
  {
    label: "Street Bird",
    emoji: "🐦",
    color: "#00CFFF",
    description: "You've seen things. Not enough things, but things.",
    minSeconds: 11,
  },
  {
    label: "Baby Parrot",
    emoji: "🐣",
    color: "#FF69B4",
    description: "Freshly hatched. The world is big and scary and you proved it.",
    minSeconds: 0,
  },
];

function getRank(survivalTime: number): Rank {
  for (const rank of RANKS) {
    if (survivalTime >= rank.minSeconds) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export default function ResultScreen({ survivalTime, bonusSeconds, onPlayAgain }: ResultScreenProps) {
  const totalTime = BASE_SURVIVAL_TIME + bonusSeconds;
  const rank = getRank(survivalTime);
  const correctAnswers = bonusSeconds / BONUS_SECONDS_PER_CORRECT;
  const pct = Math.min(100, Math.round((survivalTime / totalTime) * 100));

  const isLegend = survivalTime >= 36;

  return (
    <div className="quiz-bg relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <StarField count={isLegend ? 120 : 80} />

      {isLegend && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="absolute text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center max-w-sm w-full">
        {/* Rank badge */}
        <div
          className="inline-block px-6 py-2 rounded-full font-black text-sm mb-4 pop-anim"
          style={{
            background: `${rank.color}22`,
            border: `2px solid ${rank.color}`,
            color: rank.color,
            boxShadow: `0 0 25px ${rank.color}60`,
          }}
        >
          {rank.label}
        </div>

        {/* Big emoji */}
        <div className={`${isLegend ? "wiggle-anim" : "float-anim"} text-8xl mb-3`}>
          {rank.emoji}
        </div>

        {/* Title */}
        <h1
          className="text-4xl font-black mb-1 neon-text"
          style={{ color: rank.color }}
        >
          {survivalTime.toFixed(1)}s
        </h1>
        <p className="text-gray-300 text-sm mb-6 italic px-4">{rank.description}</p>

        {/* Stats card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-4">
          {/* Rank thresholds */}
          <div className="space-y-2">
            {RANKS.slice().reverse().map((r) => {
              const isActive = rank.label === r.label;
              return (
                <div
                  key={r.label}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all"
                  style={{
                    background: isActive ? `${r.color}15` : "transparent",
                    border: isActive ? `1px solid ${r.color}40` : "1px solid transparent",
                  }}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <div className="flex-1">
                    <span
                      className="font-bold text-sm"
                      style={{ color: isActive ? r.color : "#888" }}
                    >
                      {r.label}
                    </span>
                    <span className="text-gray-500 text-xs ml-2">
                      {r.minSeconds === 0 ? "0–10s" :
                       r.minSeconds === 11 ? "11–20s" :
                       r.minSeconds === 21 ? "21–35s" : "36s+"}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-xs font-black" style={{ color: r.color }}>YOU</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-3 flex justify-between">
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Quiz</p>
              <p className="text-accent font-black text-xl">{correctAnswers}/{QUESTIONS.length}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Bonus</p>
              <p className="text-accent font-black text-xl">+{bonusSeconds}s</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Survived</p>
              <p className="text-accent font-black text-xl">{pct}%</p>
            </div>
          </div>
        </div>

        <button className="btn-primary w-full text-xl" onClick={onPlayAgain}>
          🔄 Play Again
        </button>

        <p className="text-gray-600 text-xs mt-4">
          {isLegend ? "🔥 Certified G10K Legend. Screenshot this." :
           survivalTime >= 21 ? "The chaos is strong with you." :
           survivalTime >= 11 ? "Keep going. The streets need you." :
           "The egg is calling you back. Try again."}
        </p>
      </div>
    </div>
  );
}
