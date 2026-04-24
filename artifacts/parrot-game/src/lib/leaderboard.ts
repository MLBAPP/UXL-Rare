export interface LeaderboardEntry {
  score: number;
  timeAlive: number;
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
  const entries = getLeaderboard();
  entries.push({ score, timeAlive, date: new Date().toLocaleDateString() });
  entries.sort((a, b) => b.score - a.score);
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 10)));
}
