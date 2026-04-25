export interface LeaderboardEntry {
  name: string;
  timeAlive: number;
  score: number;
  finalScore: number;
  date: string;
}

const KEY = "parrot-panic-leaderboard";

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Player";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : "Player";
}

function sanitizeEntry(e: unknown): LeaderboardEntry | null {
  if (!e || typeof e !== "object") return null;
  const obj = e as Record<string, unknown>;
  const name = sanitizeName(obj.name);
  const timeAlive = typeof obj.timeAlive === "number" ? obj.timeAlive : 0;
  const score = typeof obj.score === "number" ? obj.score : 0;
  const finalScore = typeof obj.finalScore === "number" ? obj.finalScore : Math.round(timeAlive * 10) + score;
  const date = typeof obj.date === "string" ? obj.date : new Date().toLocaleDateString();
  return { name, timeAlive, score, finalScore, date };
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map(sanitizeEntry)
      .filter((e): e is LeaderboardEntry => e !== null)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveToLeaderboard(name: string, score: number, timeAlive: number): void {
  const playerName = sanitizeName(name);
  const finalScore = Math.round(timeAlive * 10) + score;
  const entries = getLeaderboard();
  const key = playerName.toLowerCase();
  const existingIdx = entries.findIndex(
    e => sanitizeName(e.name).toLowerCase() === key
  );

  if (existingIdx >= 0) {
    if (finalScore > entries[existingIdx].finalScore) {
      entries[existingIdx] = {
        name: playerName,
        timeAlive,
        score,
        finalScore,
        date: new Date().toLocaleDateString(),
      };
    }
  } else {
    entries.push({
      name: playerName,
      timeAlive,
      score,
      finalScore,
      date: new Date().toLocaleDateString(),
    });
  }

  entries.sort((a, b) => b.finalScore - a.finalScore);
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 10)));
}
