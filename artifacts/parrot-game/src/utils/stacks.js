export function buildStacks(pool) {
  const teams = {};

  for (const player of pool) {
    if (!teams[player.team]) teams[player.team] = [];
    teams[player.team].push(player);
  }

  const stacks = Object.entries(teams)
    .filter(([_, players]) => players.length >= 2)
    .map(([team, players]) => {
      const spots = players.map((p) => p.lineupSpot).sort((a, b) => a - b);
      const proximity = spots.length > 1 ? 10 - (spots[spots.length - 1] - spots[0]) : 0;
      const avgULX = Math.round(players.reduce((sum, p) => sum + p.ulxScore, 0) / players.length);
      const parkBonus = players[0].parkFactor >= 1.05 ? 10 : players[0].parkFactor >= 1.02 ? 5 : 0;
      const bullpenBonus = players.some((p) => p.bullpen === "Weak") ? 8 : 0;
      const platoonBonus = players.filter((p) => p.platoonEdge).length * 5;
      const topOrderCount = players.filter((p) => p.lineupSpot <= 4).length;
      const topOrderBonus = topOrderCount * 6;

      const correlationScore = Math.min(99, Math.round(
        proximity + avgULX * 0.4 + parkBonus + bullpenBonus + platoonBonus + topOrderBonus
      ));

      return { team, players, correlationScore, avgULX, parkBonus, bullpenBonus, platoonBonus, topOrderBonus, proximity };
    })
    .sort((a, b) => b.correlationScore - a.correlationScore);

  return stacks;
}