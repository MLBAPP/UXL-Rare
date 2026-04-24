import StarField from "../components/StarField";

interface Props {
  correctCount: number;
  isRare: boolean;
  onGoHome: () => void;
}

interface QuizRank {
  name: string;
  codeName: string;
  emoji: string;
  color: string;
  glowColor: string;
  description: string;
  minCorrect: number;
  maxCorrect: number;
}

const RANKS: QuizRank[] = [
  {
    name: "Atmospheric Bird Entity",
    codeName: "Beak Beyond Physics",
    emoji: "🐦⚡",
    color: "#FFD700",
    glowColor: "#FFD700",
    description: "You are no longer solving questions. You are rewriting them.",
    minCorrect: 8,
    maxCorrect: 8,
  },
  {
    name: "Storm-Ready Parrot",
    codeName: "Aerial Execution Unit engaged",
    emoji: "🌪️🐦",
    color: "#00CFFF",
    glowColor: "#00CFFF",
    description: "High precision. Minor chaos remains.",
    minCorrect: 7,
    maxCorrect: 7,
  },
  {
    name: "Stable-ish Bird Mind",
    codeName: "Feathered Processor active",
    emoji: "🪶",
    color: "#80FF80",
    glowColor: "#00cc44",
    description: "You are starting to understand the flock.",
    minCorrect: 5,
    maxCorrect: 6,
  },
  {
    name: "Partially Functional Parrot",
    codeName: "Binary Squawk Form detected",
    emoji: "🐦",
    color: "#FF9F40",
    glowColor: "#FF6B00",
    description: "Some logic is forming… but chaos still dominates.",
    minCorrect: 3,
    maxCorrect: 4,
  },
  {
    name: "Eggbrain Prototype",
    codeName: "Starter Beak OS",
    emoji: "🥚",
    color: "#FF69B4",
    glowColor: "#FF1493",
    description: "You are mostly guessing. The bird is not online yet.",
    minCorrect: 0,
    maxCorrect: 2,
  },
];

const RARE_RANK = {
  name: "Squawk Singularity",
  codeName: "System collapse: too much beak energy",
  emoji: "☠️🐦",
  color: "#FF4444",
  glowColor: "#FF0000",
  description: "Reality instability detected. The flock is no longer contained.",
};

function getQuizRank(correctCount: number, isRare: boolean): typeof RANKS[0] | typeof RARE_RANK {
  if (isRare) return RARE_RANK;
  for (const r of RANKS) {
    if (correctCount >= r.minCorrect && correctCount <= r.maxCorrect) return r;
  }
  return RANKS[RANKS.length - 1];
}

export default function QuizResultCard({ correctCount, isRare, onGoHome }: Props) {
  const rank = getQuizRank(correctCount, isRare);
  const isTop = correctCount === 8 && !isRare;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "https://parrotpanic.app";
  const shareText = `I got "${rank.name}" in Parrot Panic! ${correctCount}/8 correct 🦜🔥 @the10kSquad ${shareUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div
      className="quiz-bg relative min-h-screen flex flex-col items-center justify-start p-5 overflow-y-auto overflow-x-hidden"
      style={{ background: "linear-gradient(180deg,#07041a,#0f0630 40%,#1a0a45)" }}
    >
      <StarField count={isTop || isRare ? 130 : 70} />

      {/* sparkle confetti for rare/perfect */}
      {(isTop || isRare) && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${(i * 7.3) % 100}%`,
                top: `${(i * 6.9) % 100}%`,
                fontSize: "1.5rem",
                animation: `twinkle ${1 + (i % 3) * 0.6}s ease-in-out infinite`,
                animationDelay: `${(i * 0.18) % 2}s`,
              }}
            >
              {isRare ? "💀" : "✨"}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-center max-w-sm w-full pt-6 pb-10">

        {/* Quiz score pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 999,
          padding: "4px 16px",
          marginBottom: 20,
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.6)",
          fontWeight: 700,
        }}>
          🎯 {correctCount} / 8 correct
        </div>

        {/* Rank emoji */}
        <div
          className={isTop ? "wiggle-anim" : "float-anim"}
          style={{ fontSize: "6rem", lineHeight: 1, marginBottom: 12 }}
        >
          {rank.emoji}
        </div>

        {/* Rank title */}
        <h1
          className="font-black mb-1 pop-anim"
          style={{
            fontSize: "1.9rem",
            color: rank.color,
            textShadow: `0 0 20px ${rank.glowColor}99, 0 0 60px ${rank.glowColor}44`,
            lineHeight: 1.15,
          }}
        >
          {rank.name}
        </h1>

        {/* Code name */}
        <div style={{
          display: "inline-block",
          background: `${rank.color}18`,
          border: `1.5px solid ${rank.color}50`,
          borderRadius: 999,
          padding: "3px 14px",
          fontSize: "0.72rem",
          fontWeight: 800,
          color: rank.color,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginTop: 6,
          marginBottom: 14,
        }}>
          {rank.codeName}
        </div>

        {/* Description */}
        <p style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: "1rem",
          fontStyle: "italic",
          marginBottom: 28,
          lineHeight: 1.5,
          padding: "0 8px",
        }}>
          "{rank.description}"
        </p>

        {/* Result card box (screenshot-friendly) */}
        <div style={{
          background: `linear-gradient(135deg, ${rank.color}0a, rgba(255,255,255,0.03))`,
          border: `1.5px solid ${rank.color}30`,
          borderRadius: 20,
          padding: "20px 16px",
          marginBottom: 20,
          boxShadow: `0 0 40px ${rank.glowColor}18`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 700 }}>PARROT PANIC!</span>
            <span style={{ color: rank.color, fontSize: "0.75rem", fontWeight: 700 }}>@the10kSquad</span>
          </div>
          <div style={{
            fontSize: "2rem",
            fontWeight: 900,
            color: rank.color,
            textShadow: `0 0 18px ${rank.glowColor}88`,
            marginBottom: 4,
          }}>
            {rank.emoji} {rank.name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
            Quiz Score: {correctCount}/8
          </div>
        </div>

        {/* Share on X */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "#000",
            border: "1.5px solid rgba(255,255,255,0.25)",
            color: "#fff",
            fontWeight: 900,
            fontSize: "1rem",
            textDecoration: "none",
            marginBottom: 12,
            textAlign: "center",
            boxShadow: "0 0 20px rgba(0,0,0,0.4)",
          }}
        >
          𝕏 Share on X
        </a>

        {/* Back to Home */}
        <button
          onClick={onGoHome}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          🏠 Back to Home
        </button>
      </div>
    </div>
  );
}
