import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_SURVIVAL_TIME } from "../data/questions";
import { playCountdownBeep, playHit, playGameStart } from "../lib/sounds";

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

const OBSTACLE_EMOJIS = ["💣", "🪨", "⚡", "🌶️", "🔥", "💥", "🌪️", "☄️", "🎯", "🧨", "🔴", "💢", "👹", "🦠"];
const HIT_RADIUS = 26;

let nextId = 0;

interface GameScreenProps {
  bonusSeconds: number;
  onGameOver: (survivalTime: number) => void;
}

export default function GameScreen({ bonusSeconds, onGameOver }: GameScreenProps) {
  const totalTime = BASE_SURVIVAL_TIME + bonusSeconds;
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [parrotX, setParrotX] = useState(50);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [hit, setHit] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const parrotXRef = useRef(50);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<FallingObject[]>([]);
  const hitRef = useRef(false);
  const aliveRef = useRef(true);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const timeLeftRef = useRef(totalTime);
  const survivalStartRef = useRef<number>(0);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 350);
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 150);
  }, []);

  const spawnObject = useCallback(() => {
    const obj: FallingObject = {
      id: nextId++,
      x: Math.random() * 88 + 6,
      y: -10,
      speed: Math.random() * 18 + 14,
      size: Math.random() * 18 + 28,
      emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)],
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 6,
    };
    return obj;
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => {
      playCountdownBeep(countdown === 1);
      if (countdown === 1) {
        setStarted(true);
        setCountdown(0);
        survivalStartRef.current = performance.now();
        playGameStart();
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

      const globalSpeed = 1 + elapsed / 12;
      const spawnInterval = Math.max(350, 900 - elapsed * 18);

      if (now - lastSpawnRef.current > spawnInterval) {
        const count = elapsed > 15 ? 2 : 1;
        const newObjs = Array.from({ length: count }, () => spawnObject());
        objectsRef.current = [...objectsRef.current, ...newObjs];
        lastSpawnRef.current = now;
      }

      if (keysRef.current.left) {
        parrotXRef.current = Math.max(5, parrotXRef.current - 70 * delta);
        setParrotX(parrotXRef.current);
      }
      if (keysRef.current.right) {
        parrotXRef.current = Math.min(95, parrotXRef.current + 70 * delta);
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
          y: obj.y + obj.speed * globalSpeed * delta * 10,
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
        playHit();
        triggerShake();
        triggerFlash("rgba(255,0,0,0.5)");
        const survived = Math.min(totalTime, totalTime - timeLeftRef.current + 0.1);
        setTimeout(() => {
          onGameOver(parseFloat(survived.toFixed(1)));
        }, 700);
        return;
      }

      setObjects([...objectsRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, spawnObject, onGameOver, totalTime, triggerShake, triggerFlash]);

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
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
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
    parrotXRef.current = Math.max(5, Math.min(95, parrotXRef.current + pctMove * 0.9));
    setParrotX(parrotXRef.current);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    touchStartX.current = null;
  };

  const timerPct = (timeLeft / totalTime) * 100;
  const timerColor =
    timerPct > 50 ? "#00ff78" : timerPct > 25 ? "#ffdc00" : "#ff3232";

  const dangerZone = timerPct < 25;

  return (
    <div
      ref={gameAreaRef}
      className={`game-bg relative w-full h-screen overflow-hidden select-none ${screenShake ? "shake-anim" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: "none",
        background: dangerZone
          ? "linear-gradient(180deg, #1a0000 0%, #2d0000 40%, #1a0000 100%)"
          : undefined,
      }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 37.3) % 100}%`,
              top: `${(i * 51.7) % 60}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              animationDelay: `${(i * 0.3) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3">
        <div className="flex justify-between items-center mb-1.5">
          <span
            className="font-black text-base"
            style={{ color: timerColor, textShadow: `0 0 10px ${timerColor}` }}
          >
            ⏱️ {timeLeft.toFixed(1)}s
          </span>
          <span className="text-yellow-300 font-bold text-sm">
            {dangerZone ? "⚠️ DANGER ZONE!" : "Dodge everything!"}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${timerPct}%`,
              background: timerColor,
              boxShadow: `0 0 ${dangerZone ? 18 : 10}px ${timerColor}`,
            }}
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

      {/* Ground hint */}
      <div className="absolute bottom-16 left-0 right-0 h-px bg-white/10" />

      {/* Parrot */}
      <div
        style={{
          position: "absolute",
          left: `${parrotX}%`,
          bottom: "20px",
          transform: "translateX(-50%)",
          fontSize: 52,
          transition: "none",
          filter: hit
            ? "drop-shadow(0 0 25px red)"
            : dangerZone
            ? "drop-shadow(0 0 16px rgba(255,100,0,0.9))"
            : "drop-shadow(0 0 12px rgba(255,220,0,0.7))",
          zIndex: 20,
        }}
      >
        {hit ? "💀" : "🦜"}
      </div>

      {/* Mobile tap controls */}
      <div
        className="absolute bottom-0 left-0 right-0 flex z-40 pointer-events-none"
        style={{ height: "60px" }}
      >
        <div
          className="flex-1 flex items-center justify-center text-3xl pointer-events-auto"
          style={{ color: "rgba(255,255,255,0.15)" }}
          onTouchStart={() => { keysRef.current.left = true; }}
          onTouchEnd={() => { keysRef.current.left = false; }}
        >
          ◀
        </div>
        <div
          className="flex-1 flex items-center justify-center text-3xl pointer-events-auto"
          style={{ color: "rgba(255,255,255,0.15)" }}
          onTouchStart={() => { keysRef.current.right = true; }}
          onTouchEnd={() => { keysRef.current.right = false; }}
        >
          ▶
        </div>
      </div>

      {/* Flash overlay */}
      {flashColor && (
        <div
          className="absolute inset-0 z-50 pointer-events-none"
          style={{ background: flashColor }}
        />
      )}

      {/* Countdown overlay */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/65">
          <div className="text-center pop-anim" key={countdown}>
            <div
              className="font-black neon-text"
              style={{ fontSize: "8rem", color: "#FFD700" }}
            >
              {countdown}
            </div>
            <p className="text-white/60 text-xl mt-1">Get ready to PANIC!</p>
          </div>
        </div>
      )}

      {/* Hit flash full screen */}
      {hit && (
        <div className="absolute inset-0 bg-red-600/40 z-40 pointer-events-none" />
      )}
    </div>
  );
}
