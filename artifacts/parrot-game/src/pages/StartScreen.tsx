import StarField from "../components/StarField";
import ParrotEmoji from "../components/ParrotEmoji";
import { BASE_SURVIVAL_TIME, BONUS_SECONDS_PER_CORRECT, QUESTIONS } from "../data/questions";

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div className="quiz-bg relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <StarField count={80} />

      <div className="relative z-10 text-center max-w-sm w-full">
        <div className="float-anim mb-4">
          <ParrotEmoji size={80} className="parrot-shadow" />
        </div>

        <h1 className="text-5xl font-black mb-2 neon-text text-yellow-300 leading-tight">
          PARROT<br />PANIC!
        </h1>

        <p className="text-purple-300 text-sm font-semibold mb-6 uppercase tracking-widest">
          Quiz Your Way to Survival
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <p className="text-yellow-200 font-bold text-sm">Phase 1: Quiz</p>
              <p className="text-gray-300 text-sm">Answer {QUESTIONS.length} questions. Each correct answer earns +{BONUS_SECONDS_PER_CORRECT}s of survival time!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🦜</span>
            <div>
              <p className="text-yellow-200 font-bold text-sm">Phase 2: Survive!</p>
              <p className="text-gray-300 text-sm">Dodge falling objects until your time runs out. Start with {BASE_SURVIVAL_TIME}s base time.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-yellow-200 font-bold text-sm">Get Ranked</p>
              <p className="text-gray-300 text-sm">Earn a legendary rank based on how long you survived!</p>
            </div>
          </div>
        </div>

        <button className="btn-primary w-full text-xl" onClick={onStart}>
          LET'S GO! 🚀
        </button>

        <p className="text-gray-500 text-xs mt-4">Tap or use arrow keys / swipe to move</p>
      </div>
    </div>
  );
}
