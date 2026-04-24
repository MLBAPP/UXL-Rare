import StarField from "../components/StarField";
import ParrotEmoji from "../components/ParrotEmoji";
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
  minPct: number;
}

const RANKS: Rank[] = [
  { label: "LEGENDARY PARROT", emoji: "👑", color: "#FFD700", description: "You absolute legend. The parrot gods bow before you.", minPct: 0.9 },
  { label: "ULTRA PARROT", emoji: "🌟", color: "#FF69B4", description: "Incredible dodging skills. You were built for chaos.", minPct: 0.75 },
  { label: "SUPER PARROT", emoji: "⚡", color: "#00FFFF", description: "Impressively feathered and even more impressively skilled.", minPct: 0.6 },
  { label: "DECENT PARROT", emoji: "🦜", color: "#00FF78", description: "Not bad! The parrot community respects your hustle.", minPct: 0.4 },
  { label: "ROOKIE BIRD", emoji: "🐦", color: "#FFA500", description: "You tried. The universe acknowledges your effort.", minPct: 0.2 },
  { label: "FEATHERED MESS", emoji: "💀", color: "#FF4444", description: "Did you even try? The parrot is disappointed in you.", minPct: 0 },
];

function getRank(survivalTime: number, totalTime: number): Rank {
  const pct = survivalTime / totalTime;
  for (const rank of RANKS) {
    if (pct >= rank.minPct) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export default function ResultScreen({ survivalTime, bonusSeconds, onPlayAgain }: ResultScreenProps) {
  const totalTime = BASE_SURVIVAL_TIME + bonusSeconds;
  const rank = getRank(survivalTime, totalTime);
  const correctAnswers = bonusSeconds / BONUS_SECONDS_PER_CORRECT;
  const pct = Math.min(100, Math.round((survivalTime / totalTime) * 100));

  return (
    <div className="quiz-bg relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <StarField count={80} />

      <div className="relative z-10 text-center max-w-sm w-full">
        {/* Rank badge */}
        <div
          className="inline-block px-6 py-2 rounded-full font-black text-sm mb-4 pop-anim"
          style={{
            background: `${rank.color}20`,
            border: `2px solid ${rank.color}`,
            color: rank.color,
            boxShadow: `0 0 20px ${rank.color}40`,
          }}
        >
          {rank.label}
        </div>

        {/* Big emoji */}
        <div className="float-anim text-7xl mb-3">{rank.emoji}</div>

        {/* Title */}
        <h1 className="text-3xl font-black text-white mb-1 neon-text" style={{ color: rank.color }}>
          GAME OVER
        </h1>
        <p className="text-gray-300 text-sm mb-6 italic">{rank.description}</p>

        {/* Stats card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Survival Time</p>
              <p className="text-yellow-300 font-black text-3xl">{survivalTime.toFixed(1)}s</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Total Budget</p>
              <p className="text-white font-bold text-xl">{totalTime}s</p>
            </div>
          </div>

          {/* Survival bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Survived</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${rank.color}, ${rank.color}88)`,
                  boxShadow: `0 0 10px ${rank.color}60`,
                  transition: "width 1s ease",
                }}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Quiz Score</p>
              <p className="text-accent font-black text-xl">{correctAnswers}/{QUESTIONS.length}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Bonus Time</p>
              <p className="text-accent font-black text-xl">+{bonusSeconds}s</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-gray-400 text-xs">Base Time</p>
              <p className="text-accent font-black text-xl">{BASE_SURVIVAL_TIME}s</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button className="btn-primary w-full" onClick={onPlayAgain}>
            🔄 Play Again
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-5">
          {pct >= 90 ? "🔥 Top score! Share with friends!" :
           pct >= 60 ? "Not bad! Can you do better?" :
           "Practice makes perfect, right? ...right?"}
        </p>
      </div>
    </div>
  );
}
