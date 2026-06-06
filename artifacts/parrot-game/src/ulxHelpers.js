export function getConfidence(score) {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C";
  return "D";
}

export function getTopReasons(player) {
  const reasons = [];

  if (player.barrel >= 15)
    reasons.push(
      `Elite Barrel Rate (${player.barrel}%)`
    );

  if (player.hardHit >= 45)
    reasons.push(
      `Strong Hard Hit (${player.hardHit}%)`
    );

  if (player.parkFactor > 110)
    reasons.push(
      `Hitter Friendly Park (${player.parkFactor})`
    );

  if (player.platoonEdge)
    reasons.push("Platoon Advantage");

  if (player.bullpen === "Weak")
    reasons.push("Weak Opposing Bullpen");

  if (player.lineupSpot <= 3)
    reasons.push(
      `Premium Lineup Spot (#${player.lineupSpot})`
    );

  return reasons.slice(0, 4);
}

export function getBestMarket(player) {
  const scores = [
    {
      name: "Home Run",
      score: player.hrScore,
    },
    {
      name: "Total Bases",
      score: player.tbScore,
    },
    {
      name: "RBI",
      score: player.rbiScore,
    },
    {
      name: "Hits",
      score: player.hitsScore,
    },
  ];

  scores.sort(
    (a, b) => b.score - a.score
  );

  return scores[0];
}