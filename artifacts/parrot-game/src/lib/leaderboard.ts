export interface LeaderboardEntry {
  playerId: string;
  name: string;
  timeAlive: number;
  score: number;
  finalScore: number;
  date: string;
}

const KEY         = "parrot-panic-leaderboard";
const ID_KEY      = "parrot-panic-player-id";
const RESET_FLAG  = "resetLeaderboardOnce";

// ── One-time leaderboard reset (testing only) ─────────────────────────────
export function runOnceReset(): void {
  if (localStorage.getItem(RESET_FLAG) === "true") {
    localStorage.removeItem(KEY);
    localStorage.removeItem(RESET_FLAG);
  }
}

// ── Persistent player identity ─────────────────────────────────────────────
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getPlayerId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id || id.trim().length === 0) {
    id = generateId();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

// ── Sanitization ──────────────────────────────────────────────────────────
function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Player";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : "Player";
}

function sanitizeEntry(e: unknown): LeaderboardEntry | null {
  if (!e || typeof e !== "object") return null;
  const obj = e as Record<string, unknown>;
  const name = sanitizeName(obj.name);
  const playerId =
    typeof obj.playerId === "string" && obj.playerId.trim().length > 0
      ? obj.playerId.trim()
      : null;
  if (!playerId) return null; // drop legacy entries without a real ID
  const timeAlive  = typeof obj.timeAlive  === "number" ? obj.timeAlive  : 0;
  const score      = typeof obj.score      === "number" ? obj.score      : 0;
  const finalScore = typeof obj.finalScore === "number" ? obj.finalScore
    : Math.round(timeAlive * 10) + score;
  const date = typeof obj.date === "string" ? obj.date : new Date().toLocaleDateString();
  return { playerId, name, timeAlive, score, finalScore, date };
}

// ── Dedup: one entry per playerId, keep highest score ─────────────────────
function deduplicateByPlayerId(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const existing = map.get(entry.playerId);
    if (!existing || entry.finalScore > existing.finalScore) {
      map.set(entry.playerId, entry);
    }
  }
  return Array.from(map.values());
}

// ── Public API ────────────────────────────────────────────────────────────
export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return deduplicateByPlayerId(
      raw.map(sanitizeEntry).filter((e): e is LeaderboardEntry => e !== null)
    )
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveToLeaderboard(name: string, score: number, timeAlive: number): void {
  const playerId   = getPlayerId();
  const playerName = sanitizeName(name);
  const finalScore = Math.round(timeAlive * 10) + score;

  let allEntries: LeaderboardEntry[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    allEntries = Array.isArray(raw)
      ? raw.map(sanitizeEntry).filter((e): e is LeaderboardEntry => e !== null)
      : [];
  } catch { /* start fresh */ }

  const existingIdx = allEntries.findIndex(e => e.playerId === playerId);

  if (existingIdx >= 0) {
    const existing = allEntries[existingIdx];
    if (finalScore > existing.finalScore) {
      allEntries[existingIdx] = {
        playerId, name: playerName, timeAlive, score, finalScore,
        date: new Date().toLocaleDateString(),
      };
    } else {
      // same player, lower score — just refresh the display name
      allEntries[existingIdx] = { ...existing, name: playerName };
    }
  } else {
    allEntries.push({
      playerId, name: playerName, timeAlive, score, finalScore,
      date: new Date().toLocaleDateString(),
    });
  }

  const final = deduplicateByPlayerId(allEntries)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 10);

  localStorage.setItem(KEY, JSON.stringify(final));
}
