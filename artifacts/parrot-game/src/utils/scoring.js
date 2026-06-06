export function calculateScores(player) {
  let score = 50;

  score += player.barrel * 1.2;

  score += player.hardHit * 0.3;

  if (player.parkFactor > 110)
    score += 10;

  if (player.lineupSpot <= 3)
    score += 10;

  if (player.bullpen === "Weak")
    score += 8;

  if (player.platoonEdge)
    score += 10;

  score = Math.min(
    99,
    Math.round(score)
  );

  return {
    ulxScore: score,

    hrScore: Math.min(
      99,
      Math.round(
        score + player.barrel * 0.8
      )
    ),

    tbScore: Math.min(
      99,
      Math.round(
        score +
          player.hardHit * 0.15
      )
    ),

    rbiScore: Math.min(
      99,
      Math.round(
        score +
          (5 - player.lineupSpot) * 3
      )
    ),

    hitsScore: Math.min(
      99,
      Math.round(
        score +
          player.hardHit * 0.1
      )
    ),
  };
}