const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;

export async function fetchTodayPlayers() {
  try {
    const todayET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const dateStr = todayET.toISOString().split("T")[0];

    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}&hydrate=lineups,probablePitcher,weather,venue,teams`
    );
    const schedData = await schedRes.json();
    let allGames = schedData.dates?.[0]?.games ?? [];

    if (allGames.length === 0) {
      const yesterday = new Date(todayET);
      yesterday.setDate(yesterday.getDate() - 1);
      const yDateStr = yesterday.toISOString().split("T")[0];
      const yRes = await fetch(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${yDateStr}&hydrate=lineups,probablePitcher,weather,venue,teams`
      );
      const yData = await yRes.json();
      allGames = yData.dates?.[0]?.games ?? [];
    }

    if (allGames.length === 0) return [];

    const [oddsMap, statcastMap, pitcherMap] = await Promise.all([
      fetchHROdds(),
      fetchSavantCSV(),
      fetchPitcherStats(),
    ]);

    const allPlayers = [];

    for (const game of allGames) {
      const gameId = game.gamePk;
      const status = game.status?.abstractGameState ?? "Final";
      const isLive = status === "Live";
      const isFinal = status === "Final" || game.status?.detailedState === "Postponed";

      const awayTeam = game.teams?.away?.team;
      const homeTeam = game.teams?.home?.team;

      // Get abbreviations from team names
      const awayAbbr = getTeamAbbr(awayTeam?.id, awayTeam?.name);
      const homeAbbr = getTeamAbbr(homeTeam?.id, homeTeam?.name);

      const venueName = game.venue?.name ?? "Unknown Venue";
      const venueId = game.venue?.id ?? 1;
      const parkFactor = getParkFactor(venueId);
      const gameLabel = `${awayAbbr} @ ${homeAbbr}`;

      const weather = game.weather ?? {};
      const windSpeed = parseInt(weather.wind?.split(" ")?.[0] ?? "0") || 0;
      const windDir = weather.wind ?? "N/A";
      const temp = parseInt(weather.temp ?? "72") || 72;
      const weatherBonus = getWeatherBonus(windSpeed, windDir, temp);
      const envScore = getEnvironmentScore(parkFactor, windSpeed, windDir, temp);

      // Use lineups from schedule response directly
      const homePlayers = game.lineups?.homePlayers ?? [];
      const awayPlayers = game.lineups?.awayPlayers ?? [];

      // Get probable pitchers
      const awayPitcherId = game.teams?.away?.probablePitcher?.id;
      const homePitcherId = game.teams?.home?.probablePitcher?.id;
      const awayPitcher = pitcherMap[awayPitcherId] ?? null;
      const homePitcher = pitcherMap[homePitcherId] ?? null;

      // Bullpen ratings — use pitcher ERA as proxy since we don't have live feed
      const awayBullpen = awayPitcher ? getBullpenFromERA(awayPitcher.era) : "Average";
      const homeBullpen = homePitcher ? getBullpenFromERA(homePitcher.era) : "Average";

      // Live score
      let liveScore = null;
      if (isLive) {
        try {
          const lsRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gameId}/linescore`);
          const lsData = await lsRes.json();
          liveScore = {
            inning: lsData.currentInning ?? "?",
            inningHalf: lsData.inningHalf ?? "",
            awayScore: lsData.teams?.away?.runs ?? 0,
            homeScore: lsData.teams?.home?.runs ?? 0,
            awayTeam: awayAbbr,
            homeTeam: homeAbbr,
          };
        } catch (e) { }
      }

      for (const side of ["away", "home"]) {
        const lineup = side === "away" ? awayPlayers : homePlayers;
        const teamAbbr = side === "away" ? awayAbbr : homeAbbr;
        const opponent = side === "away" ? homeAbbr : awayAbbr;
        const opposingBullpen = side === "away" ? homeBullpen : awayBullpen;
        const opposingPitcher = side === "away" ? homePitcher : awayPitcher;
        const opposingPitcherId = side === "away" ? homePitcherId : awayPitcherId;

        lineup.forEach((player, index) => {
          const playerId = player.id;
          const name = player.fullName ?? "Unknown";

          const sc = statcastMap[playerId] ?? {};
          const barrelRate = sc.barrel ?? 8;
          const hardHitRate = sc.hardHit ?? 38;
          const exitVelo = sc.exitVelo ?? null;
          const xwoba = sc.xwoba ?? null;
          const launchAngle = sc.launchAngle ?? null;
          const flyBallRate = sc.flyBallRate ?? null;
          const pullRate = sc.pullRate ?? null;

          // Platoon edge from batting side vs pitcher hand
          const batSide = player.batSide?.code ?? "R";
          const pitcherHand = getPitcherHand(opposingPitcherId, pitcherMap);
          const platoonEdge = batSide !== pitcherHand;

          const playerOdds = !isFinal ? findOdds(name, oddsMap) : null;

          const archetypes = detectArchetypes({
            barrelRate, hardHitRate, exitVelo, launchAngle,
            flyBallRate, pullRate, platoonEdge,
            lineupSpot: index + 1, hr: 0, ab: 1,
          });

          const elimReasons = getEliminationReasons({
            hrOdds: playerOdds,
            hardHitRate,
            lineupSpot: index + 1,
            barrelRate,
            envScore,
            bullpen: opposingBullpen,
          });

          let score = 0;
          score += Math.min(30, barrelRate * 1.5);
          score += Math.min(20, hardHitRate * 0.3);
          if (parkFactor >= 1.05) score += 10;
          else if (parkFactor >= 1.02) score += 6;
          else if (parkFactor >= 1.0) score += 3;
          else if (parkFactor <= 0.95) score -= 5;
          if (index + 1 <= 2) score += 12;
          else if (index + 1 <= 4) score += 8;
          else if (index + 1 <= 6) score += 4;
          if (opposingBullpen === "Weak") score += 10;
          else if (opposingBullpen === "Average") score += 4;
          if (platoonEdge) score += 8;
          score += Math.min(8, Math.max(-6, weatherBonus));
          if (launchAngle >= 10 && launchAngle <= 30) score += 6;
          if (flyBallRate >= 35) score += 5;
          if (exitVelo >= 92) score += 6;
          else if (exitVelo >= 88) score += 3;
          if (opposingPitcher?.hrPer9 >= 1.2) score += 8;
          if (opposingPitcher?.barrelAllowed >= 8) score += 5;
          score = Math.min(99, Math.round(score));

          const hrScore = Math.min(99, Math.round(
            barrelRate * 2.5 +
            (exitVelo ? (exitVelo - 85) * 1.2 : 0) +
            (launchAngle >= 10 && launchAngle <= 30 ? 10 : 0) +
            (flyBallRate ? flyBallRate * 0.3 : 0) +
            (parkFactor >= 1.05 ? 10 : parkFactor >= 1.02 ? 6 : 0) +
            (platoonEdge ? 8 : 0) +
            (opposingBullpen === "Weak" ? 6 : 0) +
            (opposingPitcher?.hrPer9 >= 1.2 ? 8 : 0)
          ));

          const tbScore = Math.min(99, Math.round(
            hardHitRate * 0.8 + barrelRate * 0.5 + (parkFactor >= 1.05 ? 6 : 0)
          ));

          const rbiScore = Math.min(99, Math.round(
            (6 - Math.min(index + 1, 6)) * 6 +
            hardHitRate * 0.3 +
            (opposingBullpen === "Weak" ? 5 : 0)
          ));

          const hitsScore = Math.min(99, Math.round(
            hardHitRate * 0.6 + (index + 1 <= 3 ? 10 : 5)
          ));

          allPlayers.push({
            id: playerId, name, team: teamAbbr, opponent, gameLabel, venueName,
            lineupSpot: index + 1, barrel: barrelRate, hardHit: hardHitRate,
            exitVelo, xwoba, launchAngle, flyBallRate, pullRate, parkFactor,
            bullpen: opposingBullpen, platoonEdge, hrOdds: playerOdds,
            isLive, isFinal, liveScore, avg: 0, slg: 0, obp: 0, hr: 0, ab: 1,
            windSpeed, windDir, temp, weatherBonus, envScore,
            archetypes, elimReasons, eliminated: elimReasons.length > 0,
            ulxScore: score, hrScore, tbScore, rbiScore, hitsScore,
            opposingPitcher, gameId, status, slateDate: dateStr,
          });
        });
      }
    }

    return allPlayers.sort((a, b) => {
      if (a.hrOdds && !b.hrOdds) return -1;
      if (!a.hrOdds && b.hrOdds) return 1;
      return b.ulxScore - a.ulxScore;
    });

  } catch (err) {
    console.error("MLB API error:", err);
    return [];
  }
}

async function fetchSavantCSV() {
  try {
    const season = new Date().getFullYear();
    const url = `https://baseballsavant.mlb.com/leaderboard/custom?year=${season}&type=batter&filter=&min=50&selections=player_id,barrel_batted_rate,hard_hit_percent,exit_velocity_avg,xwoba,launch_angle_avg,fly_ball_rate,pull_percent&csv=true`;
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const idx = (name) => headers.indexOf(name);
    const map = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
      const id = parseInt(cols[idx("player_id")]);
      if (!id) continue;
      map[id] = {
        barrel: parseFloat(cols[idx("barrel_batted_rate")]) || null,
        hardHit: parseFloat(cols[idx("hard_hit_percent")]) || null,
        exitVelo: parseFloat(cols[idx("exit_velocity_avg")]) || null,
        xwoba: parseFloat(cols[idx("xwoba")]) || null,
        launchAngle: parseFloat(cols[idx("launch_angle_avg")]) || null,
        flyBallRate: parseFloat(cols[idx("fly_ball_rate")]) || null,
        pullRate: parseFloat(cols[idx("pull_percent")]) || null,
      };
    }
    return map;
  } catch (err) {
    console.error("Savant error:", err);
    return {};
  }
}

async function fetchPitcherStats() {
  try {
    const season = new Date().getFullYear();
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&gameType=R&season=${season}&limit=500`
    );
    const data = await res.json();
    const map = {};
    for (const entry of data.stats?.[0]?.splits ?? []) {
      const id = entry.player?.id;
      const s = entry.stat ?? {};
      if (!id) continue;
      const ip = parseFloat(s.inningsPitched) || 1;
      const hr = parseInt(s.homeRuns) || 0;
      map[id] = {
        hrPer9: Math.round((hr / ip) * 9 * 10) / 10,
        era: parseFloat(s.era) || 4.00,
        barrelAllowed: parseFloat(s.barrelBatted) || 0,
        hardHitAllowed: parseFloat(s.hardHit) || 0,
        pitchHand: s.pitchHand?.code ?? "R",
      };
    }
    return map;
  } catch (err) {
    console.error("Pitcher stats error:", err);
    return {};
  }
}

async function fetchHROdds() {
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=batter_home_runs&oddsFormat=american`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return {};

    const map = {};
    for (const game of data) {
      for (const bookmaker of game.bookmakers ?? []) {
        for (const market of bookmaker.markets ?? []) {
          if (market.key !== "batter_home_runs") continue;
          for (const outcome of market.outcomes ?? []) {
            const name = outcome.name?.trim();
            const price = outcome.price;
            if (!name) continue;
            if (!map[name] || Math.abs(price) < Math.abs(map[name])) {
              map[name] = price;
            }
          }
        }
      }
    }

    console.log("Players with odds:", Object.keys(map).length);
    return map;
  } catch (err) {
    console.error("Odds API error:", err);
    return {};
  }
}

function findOdds(fullName, oddsMap) {
  if (!fullName) return null;
  if (oddsMap[fullName] !== undefined) return oddsMap[fullName];
  const nameParts = fullName.trim().split(" ");
  const lastName = nameParts.slice(1).join(" ").toLowerCase();
  const firstInitial = nameParts[0]?.[0]?.toLowerCase();
  for (const key of Object.keys(oddsMap)) {
    const keyParts = key.trim().split(" ");
    const keyLast = keyParts.slice(1).join(" ").toLowerCase();
    const keyFirst = keyParts[0]?.toLowerCase();
    if (keyLast === lastName && (keyFirst === nameParts[0].toLowerCase() || keyFirst[0] === firstInitial)) {
      return oddsMap[key];
    }
  }
  return null;
}

function getPitcherHand(pitcherId, pitcherMap) {
  return pitcherMap[pitcherId]?.pitchHand ?? "R";
}

function getBullpenFromERA(era) {
  if (era >= 4.5) return "Weak";
  if (era <= 3.5) return "Strong";
  return "Average";
}

function detectArchetypes({ barrelRate, hardHitRate, exitVelo, launchAngle, flyBallRate, pullRate, platoonEdge, lineupSpot }) {
  const archetypes = [];
  if (barrelRate >= 10 && hardHitRate >= 45) archetypes.push({ name: "Barrel Guy", color: "#f97316", icon: "🛢️" });
  if (platoonEdge) archetypes.push({ name: "Smasher", color: "#a855f7", icon: "💥" });
  if (exitVelo >= 92 && pullRate >= 40) archetypes.push({ name: "Fast Twitch", color: "#3b82f6", icon: "⚡" });
  if (flyBallRate >= 35 && launchAngle >= 10 && launchAngle <= 30) archetypes.push({ name: "Air Attack", color: "#06b6d4", icon: "🚀" });
  if (lineupSpot >= 6 && barrelRate >= 8) archetypes.push({ name: "Sleeper", color: "#84cc16", icon: "😴" });
  return archetypes;
}

function getEliminationReasons({ hrOdds, hardHitRate, lineupSpot, barrelRate, envScore }) {
  const reasons = [];
  if (hardHitRate !== null && hardHitRate < 30) reasons.push("Weak hard hit%");
  if (lineupSpot > 7) reasons.push("Too low in lineup");
  if (barrelRate !== null && barrelRate < 4) reasons.push("Weak power profile");
  if (envScore <= -2) reasons.push("Bad environment");
  return reasons;
}

function getEnvironmentScore(parkFactor, windSpeed, windDir, temp) {
  let score = 0;
  const dir = (windDir ?? "").toLowerCase();
  if (parkFactor >= 1.05) score += 1;
  else if (parkFactor <= 0.95) score -= 1;
  if (windSpeed >= 10 && (dir.includes("out") || dir.includes("center"))) score += 1;
  else if (dir.includes("in")) score -= 1;
  if (temp >= 60 && temp <= 85) score += 1;
  else if (temp < 50 || temp > 95) score -= 1;
  return Math.max(-2, Math.min(2, score));
}

function getWeatherBonus(windSpeed, windDir, temp) {
  let bonus = 0;
  const dir = (windDir ?? "").toLowerCase();
  if (dir.includes("out") || dir.includes("center") || dir.includes("right") || dir.includes("left")) {
    bonus += Math.min(10, windSpeed * 0.6);
  } else if (dir.includes("in")) {
    bonus -= Math.min(8, windSpeed * 0.5);
  }
  if (temp >= 60 && temp <= 85) bonus += 3;
  else if (temp > 85) bonus += 5;
  else if (temp < 50) bonus -= 5;
  return Math.round(bonus);
}

function getTeamAbbr(teamId, teamName) {
  const abbrs = {
    108: "LAA", 109: "ARI", 110: "BAL", 111: "BOS", 112: "CHC",
    113: "CIN", 114: "CLE", 115: "COL", 116: "DET", 117: "HOU",
    118: "KC",  119: "LAD", 120: "WSH", 121: "NYM", 133: "ATH",
    134: "PIT", 135: "SD",  136: "SEA", 137: "SF",  138: "STL",
    139: "TB",  140: "TEX", 141: "TOR", 142: "MIN", 143: "PHI",
    144: "ATL", 145: "CWS", 146: "MIA", 147: "NYY", 158: "MIL",
  };
  return abbrs[teamId] ?? teamName?.split(" ").pop() ?? "???";
}

function getParkFactor(venueId) {
  const factors = {
    15: 1.12, 4: 1.08, 3289: 1.08, 680: 1.06,
    2392: 1.05, 2681: 1.03, 239: 1.00, 3313: 1.00,
    22: 0.98, 2602: 0.97, 2889: 0.95, 14: 0.94,
  };
  return factors[venueId] ?? 1.00;
}