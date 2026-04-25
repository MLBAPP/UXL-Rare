import { useState } from "react";
import HomeScreen        from "./pages/HomeScreen";
import QuizScreen        from "./pages/QuizScreen";
import QuizResultCard    from "./pages/QuizResultCard";
import GameScreen        from "./pages/GameScreen";
import NameInputScreen   from "./pages/NameInputScreen";
import ResultScreen      from "./pages/ResultScreen";
import LeaderboardScreen from "./pages/LeaderboardScreen";
import { saveToLeaderboard } from "./lib/leaderboard";

type Phase = "home" | "quiz" | "quizResult" | "game" | "nameInput" | "gameResult" | "leaderboard";

function getInitialPhase(): Phase {
  return localStorage.getItem("quizCompleted") === "true" ? "home" : "quiz";
}

export default function App() {
  const [phase,      setPhase]      = useState<Phase>(getInitialPhase);
  const [quizScore,  setQuizScore]  = useState(0);
  const [isRare,     setIsRare]     = useState(false);
  const [rawResult,  setRawResult]  = useState<{ score: number; timeAlive: number }>({ score: 0, timeAlive: 0 });
  const [playerName, setPlayerName] = useState("Player");

  function handleQuizComplete(correctCount: number) {
    localStorage.setItem("quizCompleted", "true");
    setQuizScore(correctCount);
    setIsRare(correctCount === 8 && Math.random() < 0.05);
    setPhase("quizResult");
  }

  function handleGameOver(score: number, timeAlive: number) {
    setRawResult({ score, timeAlive });
    setPhase("nameInput");
  }

  function handleNameSubmit(name: string) {
    const finalName = (name ?? "").trim() || "Player";
    setPlayerName(finalName);
    saveToLeaderboard(finalName, rawResult.score, rawResult.timeAlive);
    setPhase("gameResult");
  }

  function handleQuiz() {
    localStorage.removeItem("quizCompleted");
    setPhase("quiz");
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "fixed", inset: 0 }}>
      {phase === "home" && (
        <HomeScreen
          onPlay={() => setPhase("game")}
          onLeaderboard={() => setPhase("leaderboard")}
          onQuiz={handleQuiz}
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
        <GameScreen key={Date.now()} onGameOver={handleGameOver} />
      )}
      {phase === "nameInput" && (
        <NameInputScreen
          score={rawResult.score}
          timeAlive={rawResult.timeAlive}
          onSubmit={handleNameSubmit}
        />
      )}
      {phase === "gameResult" && (
        <ResultScreen
          score={rawResult.score}
          timeAlive={rawResult.timeAlive}
          playerName={playerName}
          onGoHome={() => setPhase("home")}
          onPlayAgain={() => setPhase("game")}
        />
      )}
      {phase === "leaderboard" && (
        <LeaderboardScreen onGoHome={() => setPhase("home")} />
      )}
    </div>
  );
}
