import { useState } from "react";
import StartScreen from "./pages/StartScreen";
import QuizScreen from "./pages/QuizScreen";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";

type Phase = "start" | "quiz" | "game" | "result";

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [bonusSeconds, setBonusSeconds] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);

  function handleStart() {
    setPhase("quiz");
  }

  function handleQuizComplete(bonus: number) {
    setBonusSeconds(bonus);
    setPhase("game");
  }

  function handleGameOver(time: number) {
    setSurvivalTime(time);
    setPhase("result");
  }

  function handlePlayAgain() {
    setBonusSeconds(0);
    setSurvivalTime(0);
    setPhase("start");
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", inset: 0 }}>
      {phase === "start" && <StartScreen onStart={handleStart} />}
      {phase === "quiz" && <QuizScreen onComplete={handleQuizComplete} />}
      {phase === "game" && (
        <GameScreen
          key={bonusSeconds}
          bonusSeconds={bonusSeconds}
          onGameOver={handleGameOver}
        />
      )}
      {phase === "result" && (
        <ResultScreen
          survivalTime={survivalTime}
          bonusSeconds={bonusSeconds}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
