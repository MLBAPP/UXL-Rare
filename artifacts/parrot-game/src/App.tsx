import { useState } from "react";
import HomeScreen from "./pages/HomeScreen";
import QuizScreen from "./pages/QuizScreen";
import QuizResultCard from "./pages/QuizResultCard";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";
import { saveToLeaderboard } from "./lib/leaderboard";

type Phase = "home" | "quiz" | "quizResult" | "game" | "gameResult";

function getInitialPhase(): Phase {
  const done = localStorage.getItem("quizCompleted") === "true";
  return done ? "home" : "quiz";
}

export default function App() {
  const [phase,         setPhase]       = useState<Phase>(getInitialPhase);
  const [quizScore,     setQuizScore]   = useState(0);
  const [isRare,        setIsRare]      = useState(false);
  const [gameResult,    setGameResult]  = useState<{ score: number; timeAlive: number }>({ score: 0, timeAlive: 0 });

  function handleQuizComplete(correctCount: number) {
    localStorage.setItem("quizCompleted", "true");
    const rare = correctCount === 8 && Math.random() < 0.05;
    setQuizScore(correctCount);
    setIsRare(rare);
    setPhase("quizResult");
  }

  function handleGameOver(score: number, timeAlive: number) {
    saveToLeaderboard(score, timeAlive);
    setGameResult({ score, timeAlive });
    setPhase("gameResult");
  }

  function handleRetakeQuiz() {
    localStorage.removeItem("quizCompleted");
    setPhase("quiz");
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", inset: 0 }}>
      {phase === "home" && (
        <HomeScreen
          onPlay={() => setPhase("game")}
          onQuiz={() => setPhase("quiz")}
          onRetakeQuiz={handleRetakeQuiz}
        />
      )}
      {phase === "quiz" && (
        <QuizScreen onComplete={handleQuizComplete} />
      )}
      {phase === "quizResult" && (
        <QuizResultCard
          correctCount={quizScore}
          isRare={isRare}
          onGoHome={() => setPhase("home")}
        />
      )}
      {phase === "game" && (
        <GameScreen
          key={Date.now()}
          onGameOver={handleGameOver}
        />
      )}
      {phase === "gameResult" && (
        <ResultScreen
          score={gameResult.score}
          timeAlive={gameResult.timeAlive}
          onGoHome={() => setPhase("home")}
          onPlayAgain={() => setPhase("game")}
        />
      )}
    </div>
  );
}
