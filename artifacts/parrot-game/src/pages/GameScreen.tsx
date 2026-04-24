import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_SURVIVAL_TIME } from "../data/questions";
import { playCountdownBeep, playHit, playGameStart } from "../lib/sounds";

interface FallingObject {
  id: number;
  x: number;   // px from left of canvas
  y: number;   // px from top of canvas
  speed: number; // px per second
  size: number;
  emoji: string;
  rot: number;
  rotSpeed: number;
}

const EMOJIS = ["💣","🪨","⚡","🌶️","🔥","💥","🌪️","☄️","🎯","🧨","💢","👹"];
const HDR_H  = 60;   // height of header/timer in px
const PARROT_W = 56; // parrot emoji font-size
const MAX_OBJ = 7;
const GRACE   = 3;   // seconds of easy start
const MOVE_SPEED = 380; // px/s — faster, smoother movement
const SPEED_SCALE = 0.6; // global slowdown factor (40% slower)

let uid = 0;

interface Props {
  bonusSeconds: number;
  onGameOver: (t: number) => void;
}

export default function GameScreen({ bonusSeconds, onGameOver }: Props) {
  const totalTime = BASE_SURVIVAL_TIME + bonusSeconds;

  // ── state driving renders ──────────────────────────────────────────────────
  const [timeLeft,   setTimeLeft]   = useState(totalTime);
  const [parrotPx,   setParrotPx]   = useState(0);   // will be set after mount
  const [objects,    setObjects]    = useState<FallingObject[]>([]);
  const [hit,        setHit]        = useState(false);
  const [started,    setStarted]    = useState(false);
  const [countdown,  setCountdown]  = useState(3);
  const [shake,      setShake]      = useState(false);
  const [flash,      setFlash]      = useState(false);
  const [facing,     setFacing]     = useState<"l"|"r">("r");
  const [score,      setScore]      = useState(0);

  // ── refs (no re-render needed) ─────────────────────────────────────────────
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLDivElement>(null);
  const parrotPxRef  = useRef(0);
  const objRef       = useRef<FallingObject[]>([]);
  const deadRef      = useRef(false);
  const rafRef       = useRef(0);
  const lastSpawnRef = useRef(0);
  const startTsRef   = useRef(0);
  const timeRef      = useRef(totalTime);
  const keysRef      = useRef({ l: false, r: false });
  const swipeXRef    = useRef<number|null>(null);

  // ── canvas dimensions (computed once, stable during gameplay) ─────────────
  const canvasW = useRef(0);
  const canvasH = useRef(0);

  const measureCanvas = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    canvasW.current = el.clientWidth;
    canvasH.current = el.clientHeight;
    // centre parrot if first time
    if (parrotPxRef.current === 0) {
      const cx = el.clientWidth / 2;
      parrotPxRef.current = cx;
      setParrotPx(cx);
    }
  }, []);

  useEffect(() => {
    measureCanvas();
    window.addEventListener("resize", measureCanvas);
    return () => window.removeEventListener("resize", measureCanvas);
  }, [measureCanvas]);

  // ── countdown ─────────────────────────────────────────────────────────────
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

  // ── timer + score ─────────────────────────────────────────────────────────
  const scoreRef = useRef(0);
  const lastScoreTick = useRef(0);
  useEffect(() => {
    if (!started) return;
    const iv = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 0.1);
      setTimeLeft(timeRef.current);
      // increment score every full second survived
      const elapsed = totalTime - timeRef.current;
      const newTick = Math.floor(elapsed);
      if (newTick > lastScoreTick.current) {
        lastScoreTick.current = newTick;
        scoreRef.current = newTick;
        setScore(newTick);
      }
      if (timeRef.current <= 0 && !deadRef.current) {
        deadRef.current = true;
        onGameOver(totalTime);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [started, onGameOver, totalTime]);

  // ── spawn helper ───────────────────────────────────────────────────────────
  const spawn = useCallback(() => {
    const w = canvasW.current || 400;
    const px = parrotPxRef.current;
    let x: number;
    let tries = 0;
    do {
      x = Math.random() * (w - 60) + 30;
      tries++;
    } while (Math.abs(x - px) < 60 && tries < 10);

    objRef.current.push({
      id: uid++,
      x,
      y: -40,
      speed: Math.random() * 60 + 50,   // px/s, will be multiplied by speedFactor
      size: Math.random() * 14 + 28,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      rot: 0,
      rotSpeed: (Math.random() - 0.5) * 180,
    });
  }, []);

  // ── main game loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    let prev = performance.now();

    const loop = (now: number) => {
      if (deadRef.current) return;
      const dt   = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const elapsed = (now - startTsRef.current) / 1000;

      // speed ramp: very slow at start, linear increase — scaled 40% slower globally
      const speedFactor =
        (elapsed < GRACE
          ? 0.25 + (elapsed / GRACE) * 0.3
          : 0.55 + (elapsed - GRACE) * 0.028) * SPEED_SCALE;

      // spawn rate: starts at 2200ms, drops 80ms per 5-second phase, floor 700ms
      const phase = Math.floor(elapsed / 5);
      const spawnMs = Math.max(700, 2200 - phase * 80);
      if (now - lastSpawnRef.current > spawnMs && objRef.current.length < MAX_OBJ) {
        spawn();
        lastSpawnRef.current = now;
      }

      // player movement
      const w = canvasW.current || 400;
      const margin = PARROT_W / 2 + 4;
      let px = parrotPxRef.current;
      let moved = false;
      if (keysRef.current.l) { px -= MOVE_SPEED * dt; moved = true; setFacing("l"); }
      if (keysRef.current.r) { px += MOVE_SPEED * dt; moved = true; setFacing("r"); }
      if (moved) {
        px = Math.max(margin, Math.min(w - margin, px));
        parrotPxRef.current = px;
        setParrotPx(px);
      }

      // move objects, cull off-screen
      const h = canvasH.current || 600;
      const playerY = h - PARROT_W - 4;
      const playerR = 22;
      let justHit = false;

      objRef.current = objRef.current
        .map(o => ({ ...o, y: o.y + o.speed * speedFactor * dt, rot: o.rot + o.rotSpeed * dt }))
        .filter(o => o.y < h + 60);

      for (const o of objRef.current) {
        const dx = o.x - px;
        const dy = o.y - playerY;
        if (Math.sqrt(dx * dx + dy * dy) < playerR + o.size * 0.28) {
          justHit = true;
          break;
        }
      }

      setObjects([...objRef.current]);

      if (justHit && !deadRef.current) {
        deadRef.current = true;
        setHit(true);
        playHit();
        setShake(true);  setTimeout(() => setShake(false), 400);
        setFlash(true);  setTimeout(() => setFlash(false), 200);
        const survived = parseFloat(Math.min(totalTime, totalTime - timeRef.current + 0.1).toFixed(1));
        setTimeout(() => onGameOver(survived), 750);
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, spawn, onGameOver, totalTime]);

  // ── keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft"  || e.key === "a") keysRef.current.l = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.r = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft"  || e.key === "a") keysRef.current.l = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.r = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // ── swipe on the game canvas (not the buttons) ────────────────────────────
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    swipeXRef.current = e.touches[0].clientX;
  };
  const onCanvasTouchMove = (e: React.TouchEvent) => {
    if (swipeXRef.current === null) return;
    const dx = e.touches[0].clientX - swipeXRef.current;
    const w  = canvasW.current || 400;
    const margin = PARROT_W / 2 + 4;
    const pct = dx / w;          // fraction of screen width
    let px = parrotPxRef.current + pct * w * 0.9;
    px = Math.max(margin, Math.min(w - margin, px));
    parrotPxRef.current = px;
    setParrotPx(px);
    if (dx < 0) setFacing("l"); else setFacing("r");
    swipeXRef.current = e.touches[0].clientX;
  };
  const onCanvasTouchEnd = () => { swipeXRef.current = null; };

  // ── derived visuals ────────────────────────────────────────────────────────
  const timerPct  = (timeLeft / totalTime) * 100;
  const timerCol  = timerPct > 50 ? "#00ff78" : timerPct > 25 ? "#ffdc00" : "#ff3232";
  const danger    = timerPct < 25;
  const graceLbl  = started && (performance.now() - startTsRef.current) / 1000 < GRACE;

  return (
    <div
      ref={wrapRef}
      className={shake ? "shake-anim" : ""}
      style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        background: danger
          ? "linear-gradient(180deg,#1a0000,#2a0a0a 50%,#1a0000)"
          : "linear-gradient(180deg,#07041a,#0f0630 35%,#1a0a45 65%,#0a0820)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── HEADER / TIMER ────────────────────────────────────────────────── */}
      <div style={{
        height: HDR_H, flexShrink: 0,
        padding: "10px 14px 8px",
        background: "rgba(0,0,0,0.4)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        zIndex: 30,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <span style={{ fontWeight:900, fontSize:"1rem", color:timerCol, textShadow:`0 0 10px ${timerCol}` }}>
            ⏱️ {timeLeft.toFixed(1)}s
          </span>
          {/* Score counter */}
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            background:"rgba(255,220,0,0.12)",
            border:"1px solid rgba(255,220,0,0.3)",
            borderRadius:999,
            padding:"2px 12px",
          }}>
            <span style={{fontSize:"0.95rem"}}>⭐</span>
            <span style={{
              fontWeight:900, fontSize:"1rem",
              color:"#FFD700",
              textShadow:"0 0 10px #FFD70099",
              minWidth:28, textAlign:"center",
            }}>
              {score}
            </span>
          </div>
          <span style={{ fontWeight:700, fontSize:"0.8rem", color: danger ? "#ff6060" : "#ffd700" }}>
            {graceLbl ? "🟢 EASY" : danger ? "⚠️ DANGER!" : "Dodge!"}
          </span>
        </div>
        <div style={{ height:8, borderRadius:999, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:999,
            width:`${timerPct}%`,
            background: timerCol,
            boxShadow:`0 0 ${danger?18:8}px ${timerCol}`,
            transition:"width 0.1s linear, background 0.3s",
          }}/>
        </div>
      </div>

      {/* ── GAME CANVAS ───────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        style={{ flex:1, position:"relative", overflow:"hidden" }}
        onTouchStart={onCanvasTouchStart}
        onTouchMove={onCanvasTouchMove}
        onTouchEnd={onCanvasTouchEnd}
      >
        {/* stars */}
        {Array.from({length:22},(_,i)=>(
          <div key={i} className="star" style={{
            position:"absolute",
            left:`${(i*4.7+3)%100}%`,
            top:`${(i*5.1+2)%85}%`,
            width:`${(i%3)+1}px`,
            height:`${(i%3)+1}px`,
            animationDelay:`${(i*0.3)%3}s`,
            animationDuration:`${1.6+(i%4)*0.5}s`,
          }}/>
        ))}

        {/* horizon glow */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:90, pointerEvents:"none",
          background: danger
            ? "linear-gradient(0deg,rgba(200,0,0,0.2),transparent)"
            : "linear-gradient(0deg,rgba(80,0,200,0.15),transparent)",
        }}/>

        {/* ground line */}
        <div style={{
          position:"absolute", bottom: PARROT_W + 6, left:0, right:0,
          height:1, pointerEvents:"none",
          background: danger
            ? "linear-gradient(90deg,transparent,rgba(255,80,80,0.35),transparent)"
            : "linear-gradient(90deg,transparent,rgba(130,80,255,0.25),transparent)",
        }}/>

        {/* falling objects */}
        {objects.map(o=>(
          <div key={o.id} style={{
            position:"absolute",
            left: o.x,
            top:  o.y,
            fontSize: o.size,
            transform:`translate(-50%,-50%) rotate(${o.rot}deg)`,
            pointerEvents:"none",
            lineHeight:1,
            willChange:"transform,top,left",
          }}>
            {o.emoji}
          </div>
        ))}

        {/* ── PARROT ────────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          left: parrotPx,
          bottom: 4,
          transform: `translateX(-50%) scaleX(${facing==="l"?-1:1})`,
          fontSize: PARROT_W,
          lineHeight: 1,
          zIndex: 20,
          transition: "transform 0.06s ease",
          filter: hit
            ? "drop-shadow(0 0 28px red)"
            : danger
            ? "drop-shadow(0 0 16px rgba(255,120,0,0.95))"
            : "drop-shadow(0 0 14px rgba(255,220,0,0.8))",
          willChange: "left",
          pointerEvents: "none",
        }}>
          {hit ? "💀" : "🦜"}
        </div>

        {/* hit overlay */}
        {hit && (
          <div style={{position:"absolute",inset:0,background:"rgba(220,0,0,0.35)",pointerEvents:"none",zIndex:25}}/>
        )}

        {/* flash overlay */}
        {flash && (
          <div style={{position:"absolute",inset:0,background:"rgba(255,50,50,0.55)",pointerEvents:"none",zIndex:26}}/>
        )}

        {/* countdown overlay */}
        {!started && (
          <div style={{
            position:"absolute",inset:0,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,0.65)",zIndex:50,
          }}>
            <div key={countdown} className="pop-anim" style={{
              fontSize:"9rem", fontWeight:900, lineHeight:1,
              color:"#FFD700", textShadow:"0 0 30px #FFD700, 0 0 80px #FFD70066",
            }}>
              {countdown}
            </div>
            <p style={{color:"rgba(255,255,255,0.6)",fontSize:"1.1rem",marginTop:12}}>
              Get ready to PANIC!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
