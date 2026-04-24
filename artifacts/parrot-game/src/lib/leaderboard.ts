export interface LeaderboardEntry {
  timeAlive: number;
  score: number;
  finalScore: number;
  date: string;
}

const KEY = "parrot-panic-leaderboard";

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveToLeaderboard(score: number, timeAlive: number) {
  const finalScore = Math.round(timeAlive * 10) + score;
  const entries = getLeaderboard();
  entries.push({ timeAlive, score, finalScore, date: new Date().toLocaleDateString() });
  entries.sort((a, b) => b.finalScore - a.finalScore);
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 10)));
}
