import { useState } from "react";
import StartScreen from "./pages/StartScreen";
import QuizScreen from "./pages/QuizScreen";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";
import { saveToLeaderboard } from "./lib/leaderboard";

type Phase = "start" | "quiz" | "game" | "result";

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [bonusPoints, setBonusPoints] = useState(0);
  const [gameResult, setGameResult] = useState<{ score: number; timeAlive: number }>({ score: 0, timeAlive: 0 });

  function handleStart() {
    setPhase("quiz");
  }

  function handleQuizComplete(bonus: number) {
    setBonusPoints(bonus);
    setPhase("game");
  }

  function handleGameOver(score: number, timeAlive: number) {
    saveToLeaderboard(score, timeAlive);
    setGameResult({ score, timeAlive });
    setPhase("result");
  }

  function handlePlayAgain() {
    setBonusPoints(0);
    setGameResult({ score: 0, timeAlive: 0 });
    setPhase("start");
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", inset: 0 }}>
      {phase === "start" && <StartScreen onStart={handleStart} />}
      {phase === "quiz" && <QuizScreen onComplete={handleQuizComplete} />}
      {phase === "game" && (
        <GameScreen
          key={bonusPoints}
          bonusPoints={bonusPoints}
          onGameOver={handleGameOver}
        />
      )}
      {phase === "result" && (
        <ResultScreen
          score={gameResult.score}
          timeAlive={gameResult.timeAlive}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
