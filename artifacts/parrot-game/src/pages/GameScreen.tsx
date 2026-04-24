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

const OBSTACLE_EMOJIS = [
  "💣", "🪨", "⚡", "🌶️", "🔥", "💥", "🌪️", "☄️", "🎯", "🧨",
  "🔴", "💢", "👹", "🦠",
];

const MAX_OBJECTS = 10;
const GRACE_PERIOD = 3;
const HIT_RADIUS = 24;

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
  const [parrotAnim, setParrotAnim] = useState<"idle" | "left" | "right">("idle");

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
  const lastDirRef = useRef<"idle" | "left" | "right">("idle");
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 350);
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 180);
  }, []);

  const setParrotDir = useCallback((dir: "left" | "right" | "idle") => {
    if (dir === lastDirRef.current) return;
    lastDirRef.current = dir;
    setParrotAnim(dir);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    if (dir !== "idle") {
      animTimeoutRef.current = setTimeout(() => {
        lastDirRef.current = "idle";
        setParrotAnim("idle");
      }, 150);
    }
  }, []);

  const spawnObject = useCallback((playerX: number) => {
    let x: number;
    let attempts = 0;
    do {
      x = Math.random() * 84 + 8;
      attempts++;
    } while (Math.abs(x - playerX) < 18 && attempts < 8);

    return {
      id: nextId++,
      x,
      y: -8,
      speed: Math.random() * 6 + 5,
      size: Math.random() * 14 + 28,
      emoji: OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)],
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 4,
    } satisfies FallingObject;
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

      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = (now - survivalStartRef.current) / 1000;

      // Smooth speed ramp: very slow first 3s, then gradually increases
      const speedFactor =
        elapsed < GRACE_PERIOD
          ? 0.25 + (elapsed / GRACE_PERIOD) * 0.35
          : 0.6 + ((elapsed - GRACE_PERIOD) / 25);

      // Spawn rate: starts slow, ramps every 5 seconds
      const phase = Math.floor(elapsed / 5);
      const spawnInterval = Math.max(500, 1400 - phase * 120);

      const canSpawn =
        now - lastSpawnRef.current > spawnInterval &&
        objectsRef.current.length < MAX_OBJECTS;

      if (canSpawn) {
        const newObj = spawnObject(parrotXRef.current);
        objectsRef.current = [...objectsRef.current, newObj];
        lastSpawnRef.current = now;
      }

      // Movement
      let moved = false;
      if (keysRef.current.left) {
        parrotXRef.current = Math.max(5, parrotXRef.current - 65 * delta);
        setParrotX(parrotXRef.current);
        setParrotDir("left");
        moved = true;
      }
      if (keysRef.current.right) {
        parrotXRef.current = Math.min(95, parrotXRef.current + 65 * delta);
        setParrotX(parrotXRef.current);
        setParrotDir("right");
        moved = true;
      }
      if (!moved) setParrotDir("idle");

      const gameArea = gameAreaRef.current;
      const areaHeight = gameArea?.clientHeight ?? 600;
      const areaWidth = gameArea?.clientWidth ?? 400;
      const parrotPx = (parrotXRef.current / 100) * areaWidth;
      const parrotPy = areaHeight - 72;

      objectsRef.current = objectsRef.current
        .map((obj) => ({
          ...obj,
          y: obj.y + obj.speed * speedFactor * delta * 10,
          rotation: obj.rotation + obj.rotSpeed,
        }))
        .filter((obj) => obj.y < 112);

      // Collision check
      let justHit = false;
      for (const obj of objectsRef.current) {
        const objPx = (obj.x / 100) * areaWidth;
        const objPy = (obj.y / 100) * areaHeight;
        const dx = parrotPx - objPx;
        const dy = parrotPy - objPy;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS + obj.size / 3.5) {
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
        triggerFlash("rgba(255,0,0,0.55)");
        const survived = parseFloat(
          Math.min(totalTime, totalTime - timeLeftRef.current + 0.1).toFixed(1)
        );
        setTimeout(() => onGameOver(survived), 700);
        return;
      }

      setObjects([...objectsRef.current]);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, spawnObject, onGameOver, totalTime, triggerShake, triggerFlash, setParrotDir]);

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
    if (Math.abs(pctMove) > 0.5) {
      parrotXRef.current = Math.max(5, Math.min(95, parrotXRef.current + pctMove * 0.85));
      setParrotX(parrotXRef.current);
      setParrotDir(pctMove < 0 ? "left" : "right");
    }
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    touchStartX.current = null;
    setParrotDir("idle");
  };

  const timerPct = (timeLeft / totalTime) * 100;
  const timerColor = timerPct > 50 ? "#00ff78" : timerPct > 25 ? "#ffdc00" : "#ff3232";
  const dangerZone = timerPct < 25;
  const gracePeriodActive = started && (performance.now() - survivalStartRef.current) / 1000 < GRACE_PERIOD;

  const parrotScale = parrotAnim !== "idle" ? 0.88 : 1;
  const parrotSkew = parrotAnim === "left" ? -10 : parrotAnim === "right" ? 10 : 0;

  return (
    <div
      ref={gameAreaRef}
      className={`relative w-full h-screen overflow-hidden select-none ${screenShake ? "shake-anim" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: "none",
        background: dangerZone
          ? "linear-gradient(180deg, #1a0000 0%, #2a0a0a 50%, #1a0000 100%)"
          : "linear-gradient(180deg, #07041a 0%, #0f0630 35%, #1a0a45 65%, #0a0820 100%)",
      }}
    >
      {/* Background stars (static for perf) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 4.3 + 2) % 100}%`,
              top: `${(i * 3.9 + 5) % 70}%`,
              width: `${(i % 3) + 1}px`,
              height: `${(i % 3) + 1}px`,
              animationDelay: `${(i * 0.27) % 3}s`,
              animationDuration: `${1.5 + (i % 4) * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Horizon glow */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "120px",
          background: dangerZone
            ? "linear-gradient(0deg, rgba(180,0,0,0.25) 0%, transparent 100%)"
            : "linear-gradient(0deg, rgba(80,0,180,0.2) 0%, transparent 100%)",
        }}
      />

      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3">
        <div className="flex justify-between items-center mb-1.5">
          <span
            className="font-black text-base"
            style={{ color: timerColor, textShadow: `0 0 10px ${timerColor}` }}
          >
            ⏱️ {timeLeft.toFixed(1)}s
          </span>
          <span className="font-bold text-sm" style={{ color: dangerZone ? "#ff6060" : "#ffd700" }}>
            {gracePeriodActive ? "🟢 EASY START" : dangerZone ? "⚠️ DANGER!" : "Dodge!"}
          </span>
        </div>
        <div className="progress-bar">
          <div
            style={{
              height: "100%",
              borderRadius: "9999px",
              width: `${timerPct}%`,
              background: timerColor,
              boxShadow: `0 0 ${dangerZone ? 20 : 10}px ${timerColor}`,
              transition: "width 0.1s linear, background 0.3s",
            }}
          />
        </div>
      </div>

      {/* Falling objects */}
      {objects.map((obj) => (
        <div
          key={obj.id}
          style={{
            position: "absolute",
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            fontSize: obj.size,
            transform: `translate(-50%, -50%) rotate(${obj.rotation}deg)`,
            pointerEvents: "none",
            willChange: "transform, top",
          }}
        >
          {obj.emoji}
        </div>
      ))}

      {/* Ground line */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: "80px",
          height: "2px",
          background: dangerZone
            ? "linear-gradient(90deg, transparent, rgba(255,80,80,0.4), transparent)"
            : "linear-gradient(90deg, transparent, rgba(120,80,255,0.3), transparent)",
        }}
      />

      {/* Parrot character */}
      <div
        style={{
          position: "absolute",
          left: `${parrotX}%`,
          bottom: "24px",
          transform: `translateX(-50%) scaleX(${parrotAnim === "left" ? -1 : 1}) scaleY(${parrotScale}) skewX(${parrotSkew}deg)`,
          fontSize: 52,
          transition: "transform 0.08s ease",
          filter: hit
            ? "drop-shadow(0 0 30px red)"
            : dangerZone
            ? "drop-shadow(0 0 18px rgba(255,120,0,0.9))"
            : "drop-shadow(0 0 14px rgba(255,220,0,0.75))",
          zIndex: 20,
          willChange: "transform, left",
          lineHeight: 1,
        }}
      >
        {hit ? "💀" : "🦜"}
      </div>

      {/* Mobile control buttons */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "72px",
          display: "flex",
          zIndex: 40,
        }}
      >
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderRight: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "1.75rem",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
          }}
          onTouchStart={(e) => { e.preventDefault(); keysRef.current.left = true; }}
          onTouchEnd={(e) => { e.preventDefault(); keysRef.current.left = false; }}
          onMouseDown={() => keysRef.current.left = true}
          onMouseUp={() => keysRef.current.left = false}
          onMouseLeave={() => keysRef.current.left = false}
        >
          ◀
        </button>
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "1.75rem",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
          }}
          onTouchStart={(e) => { e.preventDefault(); keysRef.current.right = true; }}
          onTouchEnd={(e) => { e.preventDefault(); keysRef.current.right = false; }}
          onMouseDown={() => keysRef.current.right = true}
          onMouseUp={() => keysRef.current.right = false}
          onMouseLeave={() => keysRef.current.right = false}
        >
          ▶
        </button>
      </div>

      {/* Flash overlay */}
      {flashColor && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: flashColor,
            zIndex: 50,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Countdown overlay */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/65">
          <div className="text-center pop-anim" key={countdown}>
            <div
              className="font-black neon-text"
              style={{ fontSize: "9rem", color: "#FFD700", lineHeight: 1 }}
            >
              {countdown}
            </div>
            <p className="text-white/60 text-xl mt-2">Get ready!</p>
          </div>
        </div>
      )}

      {/* Hit overlay */}
      {hit && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(200,0,0,0.35)",
            zIndex: 40,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
