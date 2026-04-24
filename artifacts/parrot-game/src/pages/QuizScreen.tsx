import { useState } from "react";
import StarField from "../components/StarField";
import { QUESTIONS, BONUS_POINTS_PER_CORRECT } from "../data/questions";
import { playCorrect, playWrong } from "../lib/sounds";

interface QuizScreenProps {
  onComplete: (bonusPoints: number) => void;
}

export default function QuizScreen({ onComplete }: QuizScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [bonusTotal, setBonusTotal] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [shake, setShake] = useState(false);

  const question = QUESTIONS[currentIndex];
  const progress = (currentIndex / QUESTIONS.length) * 100;

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setShowFeedback(true);

    const isCorrect = idx === question.correctIndex;
    let newBonus = bonusTotal;
    let newCorrect = correctCount;

    if (isCorrect) {
      playCorrect();
      newBonus = bonusTotal + BONUS_POINTS_PER_CORRECT;
      newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      setBonusTotal(newBonus);
    } else {
      playWrong();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }

    setTimeout(() => {
      if (currentIndex + 1 >= QUESTIONS.length) {
        onComplete(newBonus);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        setShowFeedback(false);
      }
    }, 900);
  }

  return (
    <div className="quiz-bg relative min-h-screen flex flex-col p-4 overflow-hidden">
      <StarField count={40} />

      <div
        className={`relative z-10 flex flex-col h-full max-w-md mx-auto w-full ${shake ? "shake-anim" : ""}`}
      >
        <div className="flex items-center justify-between mb-4 pt-2">
          <div className="text-yellow-300 font-black text-lg">
            {currentIndex + 1} / {QUESTIONS.length}
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
            <span className="text-lg">⭐</span>
            <span className="text-yellow-200 font-bold text-sm">+{bonusTotal} pts earned</span>
          </div>
        </div>

        <div className="progress-bar mb-6">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 pop-anim" key={currentIndex}>
          <div className="text-4xl text-center mb-4">{question.emoji}</div>
          <p className="text-white font-bold text-xl text-center leading-snug">
            {question.question}
          </p>
        </div>

        <div className="space-y-3 flex-1">
          {question.options.map((opt, idx) => {
            let cls = "answer-btn";
            if (selected !== null) {
              if (idx === question.correctIndex) cls += " correct";
              else if (idx === selected && selected !== question.correctIndex) cls += " wrong";
            }
            return (
              <button
                key={idx}
                className={cls}
                onClick={() => handleAnswer(idx)}
                disabled={selected !== null}
              >
                <span className="text-gray-400 mr-2 font-bold">
                  {["A", "B", "C", "D"][idx]}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {showFeedback && selected !== null && (
          <div
            className={`mt-4 text-center py-3 rounded-xl font-black text-lg pop-anim ${
              selected === question.correctIndex
                ? "bg-green-500/20 text-green-300 border border-green-500/40"
                : "bg-red-500/20 text-red-300 border border-red-500/40"
            }`}
          >
            {selected === question.correctIndex
              ? `✅ Correct! +${BONUS_POINTS_PER_CORRECT} pts`
              : `❌ Nope! It was "${question.options[question.correctIndex]}"`}
          </div>
        )}

        <div className="text-center mt-4 text-gray-500 text-sm">
          {correctCount} correct so far
        </div>
      </div>
    </div>
  );
}
