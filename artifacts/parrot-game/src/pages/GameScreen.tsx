import { useCallback, useEffect, useRef, useState } from "react";
import { FRUIT_POINTS } from "../data/questions";
import { playCountdownBeep, playHit, playGameStart, playCollect } from "../lib/sounds";
import { getRandomCharacter, Character } from "../lib/character";

interface FallingObject {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  emoji: string;
  rot: number;
  rotSpeed: number;
  type: "bomb" | "fruit";
  points: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

const HDR_H      = 58;
const PARROT_W   = 56;
const MAX_OBJ    = 9;
const GRACE      = 3;
const MOVE_SPEED = 420;
const SPEED_SCALE = 0.70;

let uid = 0;

interface Props {
  onGameOver: (score: number, timeAlive: number) => void;
}

export default function GameScreen({ onGameOver }: Props) {
  const [character] = useState<Character>(() => getRandomCharacter());

  const [parrotPx,      setParrotPx]      = useState(0);
  const [parrotPy,      setParrotPy]      = useState(-1);
  const [objects,       setObjects]       = useState<FallingObject[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [hit,           setHit]           = useState(false);
  const [started,       setStarted]       = useState(false);
  const [countdown,     setCountdown]     = useState(3);
  const [shake,         setShake]         = useState(false);
  const [flash,         setFlash]         = useState(false);
  const [facing,        setFacing]        = useState<"l" | "r">("r");
  const [score,         setScore]         = useState(0);
  const [timeAlive,     setTimeAlive]     = useState(0);

  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLDivElement>(null);
  const parrotPxRef  = useRef(0);
  const parrotPyRef  = useRef(-1);
  const objRef       = useRef<FallingObject[]>([]);
  const deadRef      = useRef(false);
  const rafRef       = useRef(0);
  const lastSpawnRef = useRef(0);
  const startTsRef   = useRef(0);
  const keysRef      = useRef({ l: false, r: false, u: false, d: false });
  const touchRef     = useRef<{ x: number; y: number } | null>(null);
  const scoreRef     = useRef(0);

  const canvasW = useRef(0);
  const canvasH = useRef(0);

  const measureCanvas = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    canvasW.current = el.clientWidth;
    canvasH.current = el.clientHeight;
    if (parrotPxRef.current === 0) {
      const cx = el.clientWidth / 2;
      parrotPxRef.current = cx;
      setParrotPx(cx);
    }
    if (parrotPyRef.current < 0) {
      const iy = el.clientHeight - PARROT_W - 4;
      parrotPyRef.current = iy;
      setParrotPy(iy);
    }
  }, []);

  useEffect(() => {
    measureCanvas();
    window.addEventListener("resize", measureCanvas);
    return () => window.removeEventListener("resize", measureCanvas);
  }, [measureCanvas]);

  // ── countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => {
      playCountdownBeep(countdown === 1);
      if (countdown === 1) {
        setStarted(true);
        setCountdown(0);
        startTsRef.current = performance.now();
        playGameStart();
      } else {
        setCountdown(c => c - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── count-up timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      if (deadRef.current) return;
      const elapsed = (performance.now() - startTsRef.current) / 1000;
      setTimeAlive(parseFloat(elapsed.toFixed(1)));
    }, 100);
    return () => clearInterval(iv);
  }, [started]);

  // ── spawn ────────────────────────────────────────────────────────────────
  const spawn = useCallback(() => {
    const w  = canvasW.current || 400;
    const px = parrotPxRef.current;
    let x: number;
    let tries = 0;
    do {
      x = Math.random() * (w - 60) + 30;
      tries++;
    } while (Math.abs(x - px) < 60 && tries < 10);

    const isBomb = Math.random() < 0.42;

    let emoji  = "💣";
    let points = 0;
    if (!isBomb) {
      const pick = FRUIT_POINTS[Math.floor(Math.random() * FRUIT_POINTS.length)];
      emoji  = pick.emoji;
      points = pick.points;
    }

    const baseSize = isBomb ? Math.random() * 10 + 30 : Math.random() * 12 + 26;

    objRef.current.push({
      id: uid++,
      x,
      y: -40,
      speed: Math.random() * 60 + 50,
      size: baseSize,
      emoji,
      rot: 0,
      rotSpeed: isBomb ? (Math.random() - 0.5) * 220 : (Math.random() - 0.5) * 140,
      type: isBomb ? "bomb" : "fruit",
      points,
    });
  }, []);

  // ── main game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    let prev = performance.now();

    const loop = (now: number) => {
      if (deadRef.current) return;
      const dt      = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const elapsed = (now - startTsRef.current) / 1000;

      const speedFactor =
        (elapsed < GRACE
          ? 0.25 + (elapsed / GRACE) * 0.3
          : 0.55 + (elapsed - GRACE) * 0.028) * SPEED_SCALE;

      const phase   = Math.floor(elapsed / 5);
      const spawnMs = Math.max(700, 2200 - phase * 80);
      if (now - lastSpawnRef.current > spawnMs && objRef.current.length < MAX_OBJ) {
        spawn();
        lastSpawnRef.current = now;
      }

      const w      = canvasW.current || 400;
      const h      = canvasH.current || 600;
      const margin = PARROT_W / 2 + 4;
      let px       = parrotPxRef.current;
      let py       = parrotPyRef.current < 0 ? h - PARROT_W - 4 : parrotPyRef.current;
      let moved    = false;

      if (keysRef.current.l) { px -= MOVE_SPEED * dt; moved = true; setFacing("l"); }
      if (keysRef.current.r) { px += MOVE_SPEED * dt; moved = true; setFacing("r"); }
      if (keysRef.current.u) { py -= MOVE_SPEED * dt; moved = true; }
      if (keysRef.current.d) { py += MOVE_SPEED * dt; moved = true; }

      if (moved) {
        px = Math.max(margin, Math.min(w - margin, px));
        py = Math.max(margin, Math.min(h - margin, py));
        parrotPxRef.current = px;
        parrotPyRef.current = py;
        setParrotPx(px);
        setParrotPy(py);
      }

      const playerR = 22;

      const collected: FallingObject[] = [];
      let   bombHit = false;

      objRef.current = objRef.current
        .map(o => ({ ...o, y: o.y + o.speed * speedFactor * dt, rot: o.rot + o.rotSpeed * dt }))
        .filter(o => {
          if (o.y >= h + 60) return false;
          const dx     = o.x - px;
          const dy     = o.y - py;
          const dist   = Math.sqrt(dx * dx + dy * dy);
          const overlaps = dist < playerR + o.size * 0.3;
          if (overlaps) {
            if (o.type === "bomb")  { bombHit = true; return true; }
            if (o.type === "fruit") { collected.push(o); return false; }
          }
          return true;
        });

      if (collected.length > 0) {
        let addedPoints = 0;
        const newFloaters: FloatingText[] = [];
        for (const o of collected) {
          addedPoints += o.points;
          const floatId = uid++;
          newFloaters.push({ id: floatId, x: o.x, y: o.y, text: `+${o.points}` });
          setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== floatId)), 900);
        }
        scoreRef.current += addedPoints;
        setScore(scoreRef.current);
        playCollect();
        setFloatingTexts(prev => [...prev, ...newFloaters]);
      }

      setObjects([...objRef.current]);

      if (bombHit && !deadRef.current) {
        deadRef.current = true;
        setHit(true);
        playHit();
        setShake(true);  setTimeout(() => setShake(false), 400);
        setFlash(true);  setTimeout(() => setFlash(false), 200);
        const survived = parseFloat(((performance.now() - startTsRef.current) / 1000).toFixed(1));
        setTimeout(() => onGameOver(scoreRef.current, survived), 750);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, spawn, onGameOver]);

  // ── keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft"  || e.key === "a") keysRef.current.l = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.r = true;
      if (e.key === "ArrowUp"    || e.key === "w") keysRef.current.u = true;
      if (e.key === "ArrowDown"  || e.key === "s") keysRef.current.d = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft"  || e.key === "a") keysRef.current.l = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.r = false;
      if (e.key === "ArrowUp"    || e.key === "w") keysRef.current.u = false;
      if (e.key === "ArrowDown"  || e.key === "s") keysRef.current.d = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // ── touch drag (free movement) ────────────────────────────────────────────
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onCanvasTouchMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.x;
    const dy = e.touches[0].clientY - touchRef.current.y;
    const w  = canvasW.current || 400;
    const h  = canvasH.current || 600;
    const margin = PARROT_W / 2 + 4;

    let px = parrotPxRef.current + dx * 1.1;
    let py = parrotPyRef.current + dy * 1.1;

    px = Math.max(margin, Math.min(w - margin, px));
    py = Math.max(margin, Math.min(h - margin, py));

    parrotPxRef.current = px;
    parrotPyRef.current = py;
    setParrotPx(px);
    setParrotPy(py);

    if (dx < 0) setFacing("l"); else if (dx > 0) setFacing("r");
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onCanvasTouchEnd = () => { touchRef.current = null; };

  const graceLbl = started && (performance.now() - startTsRef.current) / 1000 < GRACE;
  const parrotEmoji = hit ? "💀" : character.emoji;

  return (
    <div
      ref={wrapRef}
      className={shake ? "shake-anim" : ""}
      style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg,#07041a,#0f0630 35%,#1a0a45 65%,#0a0820)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        height: HDR_H, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        background: "rgba(0,0,0,0.45)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        zIndex: 30,
        gap: 10,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,220,0,0.13)",
          border: "1.5px solid rgba(255,220,0,0.35)",
          borderRadius: 999,
          padding: "4px 16px 4px 12px",
          flex: "0 0 auto",
        }}>
          <span style={{ fontSize: "1.1rem" }}>⭐</span>
          <span style={{
            fontWeight: 900, fontSize: "1.25rem",
            color: "#FFD700",
            textShadow: "0 0 12px #FFD70099",
            minWidth: 36, textAlign: "center",
            letterSpacing: "-0.5px",
          }}>
            {score}
          </span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,215,0,0.55)", fontWeight: 700, marginLeft: 2 }}>PTS</span>
        </div>

        <span style={{
          fontWeight: 700, fontSize: "0.78rem",
          color: graceLbl ? "#80ff80" : "rgba(255,255,255,0.35)",
          flex: 1, textAlign: "center",
        }}>
          {graceLbl ? "🟢 EASY START" : "Dodge 💣  Catch fruits!"}
        </span>

        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          padding: "4px 12px",
          flex: "0 0 auto",
        }}>
          <span style={{ fontSize: "0.85rem" }}>⏱️</span>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", minWidth: 36 }}>
            {timeAlive.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* ── GAME CANVAS ─────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onTouchStart={onCanvasTouchStart}
        onTouchMove={onCanvasTouchMove}
        onTouchEnd={onCanvasTouchEnd}
      >
        {/* stars */}
        {Array.from({ length: 22 }, (_, i) => (
          <div key={i} className="star" style={{
            position: "absolute",
            left: `${(i * 4.7 + 3) % 100}%`,
            top: `${(i * 5.1 + 2) % 85}%`,
            width: `${(i % 3) + 1}px`,
            height: `${(i % 3) + 1}px`,
            animationDelay: `${(i * 0.3) % 3}s`,
            animationDuration: `${1.6 + (i % 4) * 0.5}s`,
          }} />
        ))}

        {/* horizon glow */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 90, pointerEvents: "none",
          background: "linear-gradient(0deg,rgba(80,0,200,0.15),transparent)",
        }} />

        {/* falling objects */}
        {objects.map(o => (
          <div key={o.id} style={{
            position: "absolute",
            left: o.x,
            top: o.y,
            fontSize: o.size,
            transform: `translate(-50%,-50%) rotate(${o.rot}deg)`,
            pointerEvents: "none",
            lineHeight: 1,
            willChange: "transform,top",
            filter: o.type === "bomb"
              ? "drop-shadow(0 0 6px rgba(255,60,60,0.7))"
              : "drop-shadow(0 0 4px rgba(255,220,80,0.5))",
          }}>
            {o.emoji}
          </div>
        ))}

        {/* floating +pts text */}
        {floatingTexts.map(f => (
          <div key={f.id} style={{
            position: "absolute",
            left: f.x,
            top: f.y,
            transform: "translate(-50%, -50%)",
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "#FFD700",
            textShadow: "0 0 10px #FFD700",
            pointerEvents: "none",
            zIndex: 40,
            animation: "floatUp 0.9s ease-out forwards",
          }}>
            {f.text}
          </div>
        ))}

        {/* parrot — free position */}
        {parrotPy >= 0 && (
          <div style={{
            position: "absolute",
            left: parrotPx,
            top: parrotPy,
            transform: `translate(-50%, -50%) scaleX(${facing === "l" ? -1 : 1})`,
            fontSize: PARROT_W,
            lineHeight: 1,
            zIndex: 20,
            transition: "transform 0.06s ease",
            filter: hit
              ? "drop-shadow(0 0 28px red)"
              : "drop-shadow(0 0 14px rgba(255,220,0,0.8))",
            willChange: "left,top",
            pointerEvents: "none",
          }}>
            {parrotEmoji}
          </div>
        )}

        {/* hit overlay */}
        {hit && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(220,0,0,0.35)", pointerEvents: "none", zIndex: 25 }} />
        )}

        {/* flash overlay */}
        {flash && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,50,50,0.55)", pointerEvents: "none", zIndex: 26 }} />
        )}

        {/* countdown overlay */}
        {!started && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)", zIndex: 50,
          }}>
            <div key={countdown} className="pop-anim" style={{
              fontSize: "9rem", fontWeight: 900, lineHeight: 1,
              color: "#FFD700", textShadow: "0 0 30px #FFD700, 0 0 80px #FFD70066",
            }}>
              {countdown}
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem", marginTop: 12 }}>
              Catch 🍎 fruits — dodge 💣 bombs!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
