export interface LeaderboardEntry {
  name: string;
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

export function saveToLeaderboard(name: string, score: number, timeAlive: number): void {
  const playerName  = name.trim() || "Player";
  const finalScore  = Math.round(timeAlive * 10) + score;
  const entries     = getLeaderboard();
  const existingIdx = entries.findIndex(
    e => e.name.trim().toLowerCase() === playerName.toLowerCase()
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
