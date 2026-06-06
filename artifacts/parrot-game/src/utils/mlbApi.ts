const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;

export async function fetchTodayPlayers() {
  try {
    const todayET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hour = todayET.getHours();

    const useDate = hour < 10
      ? new Date(new Date(todayET).setDate(todayET.getDate() - 1))
      : todayET;

    const dateStr = useDate.toISOString().split("T")[0];
    console.log("Fetching slate for:", dateStr);

    const schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dateStr}&hydrate=lineups,probablePitcher,weather,venue,teams`
    );
    const schedData = await schedRes.json();
    const allGames = schedData.dates?.[0]?.games ?? [];

    if (allGames.length === 0) return [];

    const [oddsMap, statcastMap, pitcherMap] = await Promise.all([
      fetchHROdds(),
      fetchSavantCSV(),
      fetchPitcherStats(),
    ]);

    const scoresMap = await fetchLiveScores(allGames);
    const allPlayers = [];

    for (const game of allGames) {
      const gameId = game.gamePk;
      const status = game.status?.abstractGameState ?? "Final";
      const isLive = status === "Live";
      const isFinal = status === "Final";

      const awayObj = game.teams?.away?.team ?? {};
      const homeObj = game.teams?.home?.team ?? {};

      const lineupRes = await fetch(
        `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`
      );
      const lineupData = await lineupRes.json();

      const finalAway =
        lineupData.gameData?.teams?.away?.abbreviation ||
        lineupData.gameData?.teams?.away?.teamCode ||
        awayObj.abbreviation ||
        awayObj.name?.split(" ").pop() ||
        "AWAY";

      const finalHome =
        lineupData.gameData?.teams?.home?.abbreviation ||
        lineupData.gameData?.teams?.home?.teamCode ||
        homeObj.abbreviation ||
        homeObj.name?.split(" ").pop() ||
        "HOME";

      const venueName = game.venue?.name ?? "Unknown Venue";
      const venueId = game.venue?.id ?? 1;
      const parkFactor = getParkFactor(venueId);
      const gameLabel = `${finalAway} @ ${finalHome}`;

      const weather = game.weather ?? {};
      const windSpeed = parseInt(weather.wind?.split(" ")?.[0] ?? "0") || 0;
      const windDir = weather.wind ?? "N/A";
      const temp = parseInt(weather.temp ?? "72") || 72;
      const weatherBonus = getWeatherBonus(windSpeed, windDir, temp);
      const envScore = getEnvironmentScore(parkFactor, windSpeed, windDir, temp);

      const awayBullpen = getBullpenRating(lineupData, "away");
      const homeBullpen = getBullpenRating(lineupData, "home");
      const liveScore = scoresMap[gameId] ?? null;

      const awayPitcherId = lineupData.gameData?.probablePitchers?.away?.id;
      const homePitcherId = lineupData.gameData?.probablePitchers?.home?.id;

      for (const side of ["away", "home"]) {
        const teamAbbr = side === "away" ? finalAway : finalHome;
        const opponent = side === "away" ? finalHome : finalAway;
        const opposingBullpen = side === "away" ? homeBullpen : awayBullpen;
        const opposingPitcherId = side === "away" ? homePitcherId : awayPitcherId;
        const opposingPitcher = pitcherMap[opposingPitcherId] ?? null;

        const lineup = lineupData.liveData?.boxscore?.teams?.[side]?.battingOrder ?? [];
        const roster = lineupData.liveData?.boxscore?.teams?.[side]?.players ?? {};

        lineup.forEach((playerId, index) => {
          const p = roster[`ID${playerId}`];
          if (!p) return;

          const name = p.person?.fullName ?? "Unknown";
          const hitting = p.seasonStats?.batting ?? {};

          const avg = parseFloat(hitting.avg) || 0.230;
          const slg = parseFloat(hitting.slg) || 0.380;
          const obp = parseFloat(hitting.obp) || 0.310;
          const hr = parseInt(hitting.homeRuns) || 0;
          const ab = parseInt(hitting.atBats) || 1;

          const sc = statcastMap[playerId] ?? {};
          const barrelRate = sc.barrel ?? Math.min(20, Math.round((hr / ab) * 170));
          const hardHitRate = sc.hardHit ?? Math.min(58, Math.round(slg * 65 + obp * 8));
          const exitVelo = sc.exitVelo ?? null;
          const xwoba = sc.xwoba ?? null;
          const launchAngle = sc.launchAngle ?? null;
          const flyBallRate = sc.flyBallRate ?? null;
          const pullRate = sc.pullRate ?? null;

          const platoonEdge = getPlatoonEdge(p, lineupData, side);
          const playerOdds = !isFinal ? findOdds(name, oddsMap) : null;

          const archetypes = detectArchetypes({
            barrelRate, hardHitRate, exitVelo, launchAngle,
            flyBallRate, pullRate, platoonEdge,
            lineupSpot: index + 1, hr, ab,
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
            id: playerId,
            name,
            team: teamAbbr,
            opponent,
            gameLabel,
            venueName,
            lineupSpot: index + 1,
            barrel: barrelRate,
            hardHit: hardHitRate,
            exitVelo,
            xwoba,
            launchAngle,
            flyBallRate,
            pullRate,
            parkFactor,
            bullpen: opposingBullpen,
            platoonEdge,
            hrOdds: playerOdds,
            isLive,
            isFinal,
            liveScore,
            avg,
            slg,
            obp,
            hr,
            ab,
            windSpeed,
            windDir,
            temp,
            weatherBonus,
            envScore,
            archetypes,
            elimReasons,
            eliminated: elimReasons.length > 0,
            ulxScore: score,
            hrScore,
            tbScore,
            rbiScore,
            hitsScore,
            opposingPitcher,
            gameId,
            status,
            slateDate: dateStr,
          });
        });
      }
    }

    // Sort: players with odds first, then by ULX score
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
    console.log("Statcast loaded:", Object.keys(map).length);
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

    if (!Array.isArray(data)) {
      console.log("Odds API response:", JSON.stringify(data).slice(0, 300));
      return {};
    }

    console.log("Games with odds data:", data.length);

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
    if (
      keyLast === lastName &&
      (keyFirst === nameParts[0].toLowerCase() || keyFirst[0] === firstInitial)
    ) {
      return oddsMap[key];
    }
  }
  return null;
}

async function fetchLiveScores(games) {
  const map = {};
  for (const game of games) {
    if (game.status?.abstractGameState !== "Live") continue;
    try {
      const res = await fetch(
        `https://statsapi.mlb.com/api/v1/game/${game.gamePk}/linescore`
      );
      const data = await res.json();
      map[game.gamePk] = {
        inning: data.currentInning ?? "?",
        inningHalf: data.inningHalf ?? "",
        awayScore: data.teams?.away?.runs ?? 0,
        homeScore: data.teams?.home?.runs ?? 0,
        awayTeam: game.teams.away.team.abbreviation || "AWAY",
        homeTeam: game.teams.home.team.abbreviation || "HOME",
      };
    } catch (e) { /* skip */ }
  }
  return map;
}

function detectArchetypes({ barrelRate, hardHitRate, exitVelo, launchAngle, flyBallRate, pullRate, platoonEdge, lineupSpot, hr, ab }) {
  const archetypes = [];
  if (barrelRate >= 10 && hardHitRate >= 45) archetypes.push({ name: "Barrel Guy", color: "#f97316", icon: "🛢️" });
  if (platoonEdge) archetypes.push({ name: "Smasher", color: "#a855f7", icon: "💥" });
  if (exitVelo >= 92 && pullRate >= 40) archetypes.push({ name: "Fast Twitch", color: "#3b82f6", icon: "⚡" });
  if (flyBallRate >= 35 && launchAngle >= 10 && launchAngle <= 30) archetypes.push({ name: "Air Attack", color: "#06b6d4", icon: "🚀" });
  if (lineupSpot >= 6 && barrelRate >= 8) archetypes.push({ name: "Sleeper", color: "#84cc16", icon: "😴" });
  return archetypes;
}

function getEliminationReasons({ hrOdds, hardHitRate, lineupSpot, barrelRate, envScore, bullpen }) {
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

function getBullpenRating(lineupData, side) {
  const pitchers = lineupData.liveData?.boxscore?.teams?.[side]?.bullpen ?? [];
  if (pitchers.length === 0) return "Average";
  const eras = pitchers.map((id) => {
    const p = lineupData.liveData?.boxscore?.teams?.[side]?.players?.[`ID${id}`];
    return parseFloat(p?.seasonStats?.pitching?.era ?? "4.00");
  }).filter((e) => !isNaN(e));
  if (eras.length === 0) return "Average";
  const avg = eras.reduce((a, b) => a + b, 0) / eras.length;
  if (avg >= 4.5) return "Weak";
  if (avg <= 3.5) return "Strong";
  return "Average";
}

function getPlatoonEdge(player, lineupData, side) {
  const batSide = player.person?.batSide?.code ?? "R";
  const oppSide = side === "away" ? "home" : "away";
  const probPitcherId = lineupData.gameData?.probablePitchers?.[oppSide]?.id;
  if (!probPitcherId) return false;
  const pitcher = lineupData.liveData?.boxscore?.teams?.[oppSide]?.players?.[`ID${probPitcherId}`];
  const pitchHand = pitcher?.person?.pitchHand?.code ?? "R";
  return batSide !== pitchHand;
}

function getParkFactor(venueId) {
  const factors = {
    15: 1.12, 4: 1.08, 3289: 1.08, 680: 1.06,
    2392: 1.05, 2681: 1.03, 239: 1.00, 22: 0.98,
    2602: 0.97, 2889: 0.95, 14: 0.94,
  };
  return factors[venueId] ?? 1.00;
}