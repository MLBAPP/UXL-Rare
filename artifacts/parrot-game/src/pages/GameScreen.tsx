import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_SURVIVAL_TIME } from "../data/questions";

interface FallingObject {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  emoji: string;
  rotation: number;
  rotSpeed: number;
}

const OBSTACLE_EMOJIS = ["💣", "🪨", "⚡", "🌶️", "🔥", "💥", "🌪️", "☄️", "🎯", "🧨"];
const GAME_WIDTH = 100; // percent
const PARROT_SIZE = 52;
const HIT_RADIUS = 28;

let nextId = 0;

interface GameScreenProps {
  bonusSeconds: number;
  onGameOver: (survivalTime: number) => void;
}

export default function GameScreen({ bonusSeconds, onGameOver }: GameScreenProps) {
  const totalTime = BASE_SURVIVAL_TIME + bonusSeconds;
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [parrotX, setParrotX] = useState(50); // percent
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [hit, setHit] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const parrotXRef = useRef(50);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<FallingObject[]>([]);
  const hitRef = useRef(false);
  const aliveRef = useRef(true);
  const survivalStartRef = useRef<number>(0);
  const survivalTimeRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(1200);
  const lastFrameRef = useRef<number>(0);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const timeLeftRef = useRef(totalTime);

  const spawnObject = useCallback(() => {
    const obj: FallingObject = {
      id: nextId++,
      x: Math.random() * 90 + 5,
      y: -10,
      speed: Math.random() * 12 + 8,
      size: Math.random() * 20 + 30,
      emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)],
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 4,
    };
    return obj;
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => {
      if (countdown === 1) {
        setStarted(true);
        setCountdown(0);
        survivalStartRef.current = performance.now();
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (!started) return;

    const timerInterval = setInterval(() => {
      timeLeftRef.current -= 0.1;
      const clamped = Math.max(0, timeLeftRef.current);
      setTimeLeft(clamped);
      if (clamped <= 0 && aliveRef.current) {
        aliveRef.current = false;
        survivalTimeRef.current = totalTime;
        onGameOver(totalTime);
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [started, onGameOver, totalTime]);

  useEffect(() => {
    if (!started) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      if (!aliveRef.current) return;

      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const elapsed = (now - survivalStartRef.current) / 1000;

      const speed = Math.min(2.5, 1 + elapsed / 20);
      spawnIntervalRef.current = Math.max(400, 1200 - elapsed * 20);

      if (now - lastSpawnRef.current > spawnIntervalRef.current) {
        const newObj = spawnObject();
        objectsRef.current = [...objectsRef.current, newObj];
        lastSpawnRef.current = now;
      }

      if (keysRef.current.left) {
        parrotXRef.current = Math.max(5, parrotXRef.current - 60 * delta);
        setParrotX(parrotXRef.current);
      }
      if (keysRef.current.right) {
        parrotXRef.current = Math.min(95, parrotXRef.current + 60 * delta);
        setParrotX(parrotXRef.current);
      }

      const gameArea = gameAreaRef.current;
      const areaHeight = gameArea?.clientHeight ?? 600;
      const areaWidth = gameArea?.clientWidth ?? 400;
      const parrotPx = (parrotXRef.current / 100) * areaWidth;
      const parrotPy = areaHeight - 70;

      objectsRef.current = objectsRef.current
        .map((obj) => ({
          ...obj,
          y: obj.y + obj.speed * speed * delta * 10,
          rotation: obj.rotation + obj.rotSpeed,
        }))
        .filter((obj) => obj.y < 115);

      let justHit = false;
      for (const obj of objectsRef.current) {
        const objPx = (obj.x / 100) * areaWidth;
        const objPy = (obj.y / 100) * areaHeight;
        const dx = parrotPx - objPx;
        const dy = parrotPy - objPy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HIT_RADIUS + obj.size / 3) {
          justHit = true;
          break;
        }
      }

      if (justHit && !hitRef.current) {
        hitRef.current = true;
        setHit(true);
        aliveRef.current = false;
        const survived = Math.min(totalTime, totalTime - timeLeftRef.current + 0.1);
        survivalTimeRef.current = survived;
        setTimeout(() => {
          onGameOver(parseFloat(survived.toFixed(1)));
        }, 600);
        return;
      }

      setObjects([...objectsRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, spawnObject, onGameOver, totalTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const areaWidth = gameAreaRef.current?.clientWidth ?? 400;
    const pctMove = (dx / areaWidth) * 100;
    parrotXRef.current = Math.max(5, Math.min(95, parrotXRef.current + pctMove * 0.8));
    setParrotX(parrotXRef.current);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    touchStartX.current = null;
  };

  const timerPct = (timeLeft / totalTime) * 100;
  const timerColor = timerPct > 50 ? "#00ff78" : timerPct > 25 ? "#ffdc00" : "#ff3232";

  return (
    <div
      ref={gameAreaRef}
      className="game-bg relative w-full h-screen overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: "none" }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-white font-black text-base">⏱️ {timeLeft.toFixed(1)}s</span>
          <span className="text-yellow-300 font-bold text-sm">Dodge everything!</span>
        </div>
        <div className="progress-bar">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${timerPct}%`, background: timerColor, boxShadow: `0 0 10px ${timerColor}` }}
          />
        </div>
      </div>

      {/* Falling objects */}
      {objects.map((obj) => (
        <div
          key={obj.id}
          className="falling-obj"
          style={{
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            fontSize: obj.size,
            transform: `translate(-50%, -50%) rotate(${obj.rotation}deg)`,
          }}
        >
          {obj.emoji}
        </div>
      ))}

      {/* Ground line */}
      <div className="absolute bottom-16 left-0 right-0 h-px bg-white/10" />

      {/* Parrot */}
      <div
        className={hit ? "shake-anim" : ""}
        style={{
          position: "absolute",
          left: `${parrotX}%`,
          bottom: "20px",
          transform: "translateX(-50%)",
          fontSize: PARROT_SIZE,
          transition: "none",
          filter: hit ? "drop-shadow(0 0 20px red)" : "drop-shadow(0 0 12px rgba(255,220,0,0.6))",
          zIndex: 20,
        }}
      >
        🦜
      </div>

      {/* Mobile controls */}
      <div className="absolute bottom-0 left-0 right-0 flex z-40 pointer-events-none" style={{ height: "60px" }}>
        <div
          className="flex-1 flex items-center justify-center text-2xl text-white/20 pointer-events-auto"
          onTouchStart={() => { keysRef.current.left = true; }}
          onTouchEnd={() => { keysRef.current.left = false; }}
          style={{ cursor: "pointer" }}
        >
          ◀
        </div>
        <div
          className="flex-1 flex items-center justify-center text-2xl text-white/20 pointer-events-auto"
          onTouchStart={() => { keysRef.current.right = true; }}
          onTouchEnd={() => { keysRef.current.right = false; }}
          style={{ cursor: "pointer" }}
        >
          ▶
        </div>
      </div>

      {/* Countdown overlay */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="text-center pop-anim">
            <div className="text-9xl font-black text-yellow-300 neon-text">{countdown}</div>
            <p className="text-white/70 text-xl mt-2">Get ready!</p>
          </div>
        </div>
      )}

      {/* Hit flash */}
      {hit && (
        <div className="absolute inset-0 bg-red-500/30 z-40 pointer-events-none" />
      )}
    </div>
  );
}
