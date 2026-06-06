import { useEffect, useMemo, useState } from "react";
import { fetchTodayPlayers } from "./utils/mlbApi";
import { getTier } from "./utils/tiers";
import { buildStacks } from "./utils/stacks";
import { getBestMarket, getConfidence, getTopReasons } from "./ulxHelpers";

const COLORS = {
  gold: "#facc15",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#06b6d4",
  lime: "#84cc16",
  bg: "#090909",
  card: "#18181b",
  cardInner: "#27272a",
  border: "#3f3f46",
  text: "#f4f4f5",
  muted: "#71717a",
};

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color,
      border: `1px solid ${color}55`,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: 1,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function StatBox({ label, value, color = COLORS.text }) {
  return (
    <div style={{ background: COLORS.cardInner, borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 2, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function getGrade(ulxScore) {
  if (ulxScore >= 80) return { grade: "A", color: COLORS.green };
  if (ulxScore >= 65) return { grade: "B", color: COLORS.blue };
  if (ulxScore >= 50) return { grade: "C", color: COLORS.gold };
  if (ulxScore >= 35) return { grade: "D", color: COLORS.red };
  return { grade: "F", color: COLORS.muted };
}

function getOutcome(prediction, result) {
  if (!result) return null;
  const market = prediction.bestMarket?.toLowerCase() ?? "";
  if (market.includes("hr") && result.hr >= 1) return "SUCCESS";
  if (market.includes("hit") && result.hits >= 1) return "SUCCESS";
  if (market.includes("rbi") && result.rbi >= 1) return "SUCCESS";
  if (market.includes("tb") && result.tb >= 2) return "SUCCESS";
  return "MISS";
}

function getLockStatus() {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hour = et.getHours();
  const min = et.getMinutes();
  const total = hour * 60 + min;
  const open = 9 * 60;
  const close = 12 * 60;
  if (total >= open && total < close) return { status: "open" };
  if (total < open) {
    const left = open - total;
    return { status: "pending", countdown: `${Math.floor(left / 60)}h ${left % 60}m` };
  }
  return { status: "closed" };
}

function getYesterdayLabel() {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  et.setDate(et.getDate() - 1);
  return et.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const ITEMS_PER_PAGE = 20;

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [rawPlayers, setRawPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [tierPage, setTierPage] = useState(0);
  const [researchPage, setResearchPage] = useState(0);
  const [oddsFilter, setOddsFilter] = useState({ SAFE: true, VALUE: true, NUKE: true, NONE: true });
  const [showEliminated, setShowEliminated] = useState(false);
  const [lockStatus, setLockStatus] = useState(getLockStatus());

  const [pool, setPool] = useState(() => {
    const saved = localStorage.getItem("ulxPool");
    return saved ? JSON.parse(saved) : [];
  });

  const [snapshots, setSnapshots] = useState(() => {
    const saved = localStorage.getItem("ulxSnapshots");
    return saved ? JSON.parse(saved) : [];
  });

  const [resultInput, setResultInput] = useState({});
  const [activeSnapshot, setActiveSnapshot] = useState(null);

  useEffect(() => { localStorage.setItem("ulxPool", JSON.stringify(pool)); }, [pool]);
  useEffect(() => { localStorage.setItem("ulxSnapshots", JSON.stringify(snapshots)); }, [snapshots]);

  useEffect(() => {
    const tick = () => setLockStatus(getLockStatus());
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  function loadPlayers() {
    setLoading(true);
    setRawPlayers([]);
    setPage(0);
    fetchTodayPlayers()
      .then((data) => setRawPlayers(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPlayers(); }, []);

  const scoredPlayers = useMemo(() => {
    return rawPlayers.sort((a, b) => {
      if (b.ulxScore !== a.ulxScore) return b.ulxScore - a.ulxScore;
      if (b.barrel !== a.barrel) return b.barrel - a.barrel;
      if (b.hardHit !== a.hardHit) return b.hardHit - a.hardHit;
      if (a.lineupSpot !== b.lineupSpot) return a.lineupSpot - b.lineupSpot;
      const aOdds = a.hrOdds ?? 9999;
      const bOdds = b.hrOdds ?? 9999;
      return Math.abs(aOdds) - Math.abs(bOdds);
    });
  }, [rawPlayers]);

  const filteredByOdds = useMemo(() => {
    return scoredPlayers.filter((p) => {
      const tier = getTier(p.hrOdds);
      return oddsFilter[tier.name] !== false;
    });
  }, [scoredPlayers, oddsFilter]);

  const activeList = useMemo(() => {
    return showEliminated
      ? filteredByOdds
      : filteredByOdds.filter((p) => !p.eliminated);
  }, [filteredByOdds, showEliminated]);

  const searchList = useMemo(() => {
    return scoredPlayers.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [scoredPlayers, search]);

  const safePlayers = filteredByOdds.filter((p) => getTier(p.hrOdds).name === "SAFE");
  const valuePlayers = filteredByOdds.filter((p) => getTier(p.hrOdds).name === "VALUE");
  const nukePlayers = filteredByOdds.filter((p) => getTier(p.hrOdds).name === "NUKE");
  const sortedPool = [...pool].sort((a, b) => b.ulxScore - a.ulxScore);
  const stacks = useMemo(() => buildStacks(pool), [pool]);

  const pagedList = activeList.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);

  const pagedSearch = searchList.slice(researchPage * ITEMS_PER_PAGE, (researchPage + 1) * ITEMS_PER_PAGE);
  const totalSearchPages = Math.ceil(searchList.length / ITEMS_PER_PAGE);

  function addToPool(player) {
    if (pool.some((p) => p.id === player.id)) return;
    setPool([...pool, player]);
  }

  function removeFromPool(id) {
    setPool(pool.filter((p) => p.id !== id));
  }

  function lockSlate() {
    const dateLabel = getYesterdayLabel();
    if (snapshots.some((s) => s.date === dateLabel)) {
      alert(`${dateLabel} already locked.`);
      return;
    }
    const allRanked = scoredPlayers.map((p, i) => {
      const bm = getBestMarket(p);
      const { grade } = getGrade(p.ulxScore);
      return {
        id: p.id, rank: i + 1, name: p.name, team: p.team,
        gameLabel: p.gameLabel ?? "", ulxScore: p.ulxScore,
        bestMarket: bm.name, grade, result: null,
      };
    });
    setSnapshots([{ date: dateLabel, players: allRanked }, ...snapshots]);
    alert(`✅ ${dateLabel} locked — ${allRanked.length} players saved!`);
  }

  function saveResult(date, playerId, result) {
    setSnapshots(snapshots.map((s) => {
      if (s.date !== date) return s;
      return { ...s, players: s.players.map((p) => p.id !== playerId ? p : { ...p, result }) };
    }));
    setResultInput((prev) => { const n = { ...prev }; delete n[`${date}-${playerId}`]; return n; });
  }

  const perfStats = useMemo(() => {
    const all = snapshots.flatMap((s) => s.players);
    const withResults = all.filter((p) => p.result);
    if (withResults.length === 0) return null;
    const avgScore = Math.round(all.reduce((s, p) => s + p.ulxScore, 0) / all.length * 10) / 10;
    const marketSuccess = {};
    const rankSuccess = {};
    for (const p of withResults) {
      const m = p.bestMarket;
      if (!marketSuccess[m]) marketSuccess[m] = { success: 0, total: 0 };
      marketSuccess[m].total++;
      if (getOutcome(p, p.result) === "SUCCESS") marketSuccess[m].success++;
      const r = p.rank;
      if (!rankSuccess[r]) rankSuccess[r] = { success: 0, total: 0 };
      rankSuccess[r].total++;
      if (getOutcome(p, p.result) === "SUCCESS") rankSuccess[r].success++;
    }
    return { avgScore, marketSuccess, rankSuccess, total: withResults.length };
  }, [snapshots]);

  function renderEnvScore(score) {
    const labels = { 2: "🟢 All Green", 1: "🟡 Mostly Good", 0: "⚪ Neutral", "-1": "🟠 Mostly Bad", "-2": "🔴 All Red" };
    const colors = { 2: COLORS.green, 1: COLORS.gold, 0: COLORS.muted, "-1": COLORS.orange, "-2": COLORS.red };
    return { label: labels[score] ?? "⚪ Neutral", color: colors[score] ?? COLORS.muted };
  }

  function renderPlayerCard(player, rank) {
    const tier = getTier(player.hrOdds);
    const bestMarket = getBestMarket(player);
    const confidence = getConfidence(player.ulxScore);
    const reasons = getTopReasons(player);
    const inPool = pool.some((p) => p.id === player.id);
    const isExpanded = expanded === player.id;
    const tierColor = tier.name === "NUKE" ? COLORS.red : tier.name === "VALUE" ? COLORS.gold : tier.name === "SAFE" ? COLORS.green : COLORS.muted;
    const env = renderEnvScore(player.envScore ?? 0);

    const ls = player.liveScore;
    const liveLabel = ls
      ? `${ls.inningHalf === "Top" ? "▲" : "▼"}${ls.inning} · ${ls.awayTeam} ${ls.awayScore}-${ls.homeScore} ${ls.homeTeam}`
      : null;

    return (
      <div key={player.id} style={{
        background: COLORS.card, borderRadius: 16, marginBottom: 12,
        border: `1.5px solid ${player.eliminated ? COLORS.red + "66" : tierColor + "44"}`,
        overflow: "hidden", opacity: player.eliminated ? 0.75 : 1,
      }}>
        <div style={{ height: 3, background: player.eliminated ? COLORS.red : tierColor }} />
        <div style={{ padding: 16 }}>

          {/* Eliminated banner */}
          {player.eliminated && (
            <div style={{
              background: COLORS.red + "22", border: `1px solid ${COLORS.red}44`,
              borderRadius: 8, padding: "6px 10px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <span style={{ color: COLORS.red, fontWeight: 700, fontSize: 12 }}>❌ ELIMINATED</span>
              {player.elimReasons?.map((r) => (
                <span key={r} style={{ color: COLORS.red, fontSize: 11 }}>· {r}</span>
              ))}
            </div>
          )}

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {rank && <span style={{ color: COLORS.muted, fontSize: 13, fontWeight: 700 }}>#{rank}</span>}
                <span style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>{player.name}</span>
                <Badge color={tierColor}>{tier.name}</Badge>
                {player.isLive && <Badge color={COLORS.red}>🔴 LIVE</Badge>}
                {player.isFinal && <Badge color={COLORS.muted}>FINAL</Badge>}
              </div>
              <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ color: COLORS.gold, fontSize: 12, fontWeight: 700 }}>{player.team}</div>
                {player.gameLabel && <div style={{ color: COLORS.muted, fontSize: 11 }}>{player.gameLabel}</div>}
                {player.venueName && <div style={{ color: COLORS.muted, fontSize: 11 }}>📍 {player.venueName}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.green }}>{player.ulxScore}</div>
              <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1 }}>ULX SCORE</div>
            </div>
          </div>

          {/* Archetypes */}
          {player.archetypes?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {player.archetypes.map((a) => (
                <Badge key={a.name} color={a.color}>{a.icon} {a.name}</Badge>
              ))}
            </div>
          )}

          {/* Stat boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 14 }}>
            <StatBox label="HR" value={player.hrScore} color={COLORS.red} />
            <StatBox label="TB" value={player.tbScore} color={COLORS.gold} />
            <StatBox label="RBI" value={player.rbiScore} color={COLORS.blue} />
            <StatBox label="HITS" value={player.hitsScore} color={COLORS.purple} />
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Badge color={COLORS.gold}>🎯 {bestMarket.name}</Badge>
            <Badge color={COLORS.green}>⚡ {confidence}</Badge>
            {!player.isLive && player.hrOdds && (
              <Badge color={COLORS.muted}>HR {player.hrOdds > 0 ? `+${player.hrOdds}` : player.hrOdds}</Badge>
            )}
            {player.isLive && liveLabel && <Badge color={COLORS.red}>{liveLabel}</Badge>}
            <Badge color={env.color}>{env.label}</Badge>
            {player.windDir && player.windDir !== "N/A" && (
              <Badge color={player.weatherBonus > 0 ? COLORS.green : player.weatherBonus < 0 ? COLORS.red : COLORS.muted}>
                🌬️ {player.windDir} · {player.temp}°F
              </Badge>
            )}
          </div>

          {/* Pitcher info */}
          {player.opposingPitcher && (
            <div style={{ marginTop: 8, fontSize: 11, color: COLORS.muted }}>
              Opp Pitcher: ERA {player.opposingPitcher.era}
              {player.opposingPitcher.hrPer9 >= 1.2 && <span style={{ color: COLORS.green }}> · 🎯 HR/9 {player.opposingPitcher.hrPer9}</span>}
            </div>
          )}

          {/* Reasons */}
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {reasons.map((r) => (
              <span key={r} style={{ fontSize: 11, color: COLORS.green }}>✓ {r}</span>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              onClick={() => inPool ? removeFromPool(player.id) : addToPool(player)}
              style={{
                background: inPool ? COLORS.cardInner : COLORS.gold,
                color: inPool ? COLORS.muted : "#000",
                border: inPool ? `1px solid ${COLORS.border}` : "none",
                borderRadius: 8, padding: "8px 16px", fontWeight: 700,
                fontSize: 12, cursor: "pointer", flex: 1,
              }}
            >
              {inPool ? "✓ In Pool" : "+ Add to Pool"}
            </button>
            <button
              onClick={() => setExpanded(isExpanded ? null : player.id)}
              style={{
                background: COLORS.cardInner, color: COLORS.text,
                border: `1px solid ${COLORS.border}`, borderRadius: 8,
                padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >
              {isExpanded ? "▲ Less" : "▼ Analysis"}
            </button>
          </div>

          {/* Expanded */}
          {isExpanded && (
            <div style={{
              background: COLORS.cardInner, borderRadius: 12, padding: 14,
              marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            }}>
              {[
                ["Barrel Rate", `${player.barrel}%`, player.barrel >= 10 ? "🟢 Elite" : player.barrel >= 6 ? "🟡 Good" : "⚪ Below Avg"],
                ["Hard Hit%", `${player.hardHit}%`, player.hardHit >= 50 ? "🟢 Elite" : player.hardHit >= 39 ? "🟡 Above Avg" : "⚪ Below Avg"],
                ["Exit Velo", player.exitVelo ? `${player.exitVelo} mph` : "N/A", player.exitVelo >= 92 ? "🟢 Elite" : player.exitVelo >= 88 ? "🟡 Good" : "⚪ Below Avg"],
                ["Launch Angle", player.launchAngle ? `${player.launchAngle}°` : "N/A", player.launchAngle >= 10 && player.launchAngle <= 30 ? "🟢 HR Zone" : "⚪ Outside Range"],
                ["Fly Ball%", player.flyBallRate ? `${player.flyBallRate}%` : "N/A", player.flyBallRate >= 35 ? "🟢 High" : "⚪ Low"],
                ["Pull%", player.pullRate ? `${player.pullRate}%` : "N/A", player.pullRate >= 40 ? "🟢 Pull Power" : "⚪ Neutral"],
                ["xwOBA", player.xwoba ? player.xwoba.toFixed(3) : "N/A", player.xwoba >= 0.370 ? "🟢 Elite" : player.xwoba >= 0.320 ? "🟡 Above Avg" : "⚪ Below Avg"],
                ["Park Factor", player.parkFactor ? player.parkFactor.toFixed(2) : "N/A", player.parkFactor >= 1.05 ? "🟢 Friendly" : player.parkFactor <= 0.95 ? "🔴 Fade" : "⚪ Neutral"],
                ["Lineup Spot", `#${player.lineupSpot}`, player.lineupSpot <= 2 ? "🟢 Top Order" : player.lineupSpot <= 4 ? "🟡 Middle" : "⚪ Lower"],
                ["Bullpen", player.bullpen, player.bullpen === "Weak" ? "🟢 Favorable" : player.bullpen === "Average" ? "🟡 Average" : "🔴 Strong"],
                ["Platoon", player.platoonEdge ? "Advantage" : "None", player.platoonEdge ? "🟢 Edge" : "⚪ Neutral"],
                ["Opp ERA", player.opposingPitcher?.era ?? "N/A", player.opposingPitcher?.era >= 4.5 ? "🟢 Weak SP" : "⚪ Average"],
                ["Opp HR/9", player.opposingPitcher?.hrPer9 ?? "N/A", player.opposingPitcher?.hrPer9 >= 1.2 ? "🟢 HR Prone" : "⚪ Average"],
                ["AVG", player.avg ? player.avg.toFixed(3) : "N/A", "Season"],
                ["SLG", player.slg ? player.slg.toFixed(3) : "N/A", "Season"],
                ["HR", player.hr ?? "N/A", "Season Total"],
                ["Temp", player.temp ? `${player.temp}°F` : "N/A", player.temp >= 60 && player.temp <= 85 ? "🟢 Ideal" : player.temp < 50 ? "🔴 Cold" : "⚪ Hot"],
              ].map(([label, val, note]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{val}</div>
                  <div style={{ fontSize: 10, color: COLORS.muted }}>{note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPagination(currentPage, total, onPage) {
    if (total <= 1) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <button
          onClick={() => { onPage(0); window.scrollTo(0, 0); }}
          disabled={currentPage === 0}
          style={{ background: COLORS.card, color: currentPage === 0 ? COLORS.muted : COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", cursor: currentPage === 0 ? "default" : "pointer", fontWeight: 700 }}
        >«</button>
        <button
          onClick={() => { onPage(currentPage - 1); window.scrollTo(0, 0); }}
          disabled={currentPage === 0}
          style={{ background: COLORS.card, color: currentPage === 0 ? COLORS.muted : COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", cursor: currentPage === 0 ? "default" : "pointer", fontWeight: 700 }}
        >‹ Prev</button>
        <div style={{ background: COLORS.cardInner, borderRadius: 8, padding: "8px 14px", color: COLORS.gold, fontWeight: 700 }}>
          {currentPage + 1} / {total}
        </div>
        <button
          onClick={() => { onPage(currentPage + 1); window.scrollTo(0, 0); }}
          disabled={currentPage >= total - 1}
          style={{ background: COLORS.card, color: currentPage >= total - 1 ? COLORS.muted : COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", cursor: currentPage >= total - 1 ? "default" : "pointer", fontWeight: 700 }}
        >Next ›</button>
        <button
          onClick={() => { onPage(total - 1); window.scrollTo(0, 0); }}
          disabled={currentPage >= total - 1}
          style={{ background: COLORS.card, color: currentPage >= total - 1 ? COLORS.muted : COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", cursor: currentPage >= total - 1 ? "default" : "pointer", fontWeight: 700 }}
        >»</button>
      </div>
    );
  }

  function renderLockButton() {
    const dateLabel = getYesterdayLabel();
    const alreadyLocked = snapshots.some((s) => s.date === dateLabel);
    if (alreadyLocked) return (
      <div style={{ background: COLORS.cardInner, borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "center", color: COLORS.green, fontWeight: 700 }}>
        ✅ {dateLabel} Locked
      </div>
    );
    if (lockStatus.status === "open") return (
      <button onClick={lockSlate} style={{ background: COLORS.green, color: "#000", border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 800, fontSize: 14, cursor: "pointer", width: "100%", marginBottom: 16, letterSpacing: 1 }}>
        🔒 Lock {dateLabel}'s Slate
      </button>
    );
    if (lockStatus.status === "pending") return (
      <div style={{ background: COLORS.cardInner, borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: COLORS.muted, fontSize: 12 }}>Slate lock opens at 9am ET</div>
        <div style={{ color: COLORS.gold, fontWeight: 700, fontSize: 16, marginTop: 4 }}>⏳ {lockStatus.countdown}</div>
      </div>
    );
    return (
      <div style={{ background: COLORS.cardInner, borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "center", color: COLORS.muted, fontSize: 13 }}>
        🔒 Window closed — opens 9am ET
      </div>
    );
  }

  function renderResultsTab() {
    if (snapshots.length === 0) return (
      <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div>No slates locked yet.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Lock a slate between 9am–12pm ET on the Dashboard.</div>
      </div>
    );

    const snap = snapshots.find((s) => s.date === activeSnapshot) ?? snapshots[0];
    const top10 = snap.players.slice(0, 10);

    return (
      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {snapshots.map((s) => (
            <button key={s.date} onClick={() => setActiveSnapshot(s.date)} style={{
              background: (activeSnapshot ?? snapshots[0].date) === s.date ? COLORS.gold : COLORS.card,
              color: (activeSnapshot ?? snapshots[0].date) === s.date ? "#000" : COLORS.muted,
              border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>{s.date}</button>
          ))}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 16 }}>Top 10 from {snap.date}</div>
        {top10.map((p) => {
          const outcome = getOutcome(p, p.result);
          const { grade, color: gradeColor } = getGrade(p.ulxScore);
          const inputKey = `${snap.date}-${p.id}`;
          const inp = resultInput[inputKey] ?? {};
          return (
            <div key={p.id} style={{
              background: COLORS.card, borderRadius: 16, marginBottom: 12,
              border: `1.5px solid ${outcome === "SUCCESS" ? COLORS.green : outcome === "MISS" ? COLORS.red : COLORS.border}44`,
              overflow: "hidden",
            }}>
              <div style={{ height: 3, background: outcome === "SUCCESS" ? COLORS.green : outcome === "MISS" ? COLORS.red : COLORS.border }} />
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: COLORS.muted, fontSize: 13, fontWeight: 700 }}>#{p.rank}</span>
                      <span style={{ fontSize: 17, fontWeight: 800, color: COLORS.text }}>{p.name}</span>
                      <Badge color={gradeColor}>Grade: {grade}</Badge>
                    </div>
                    <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>{p.team} · {p.gameLabel}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.green }}>{p.ulxScore}</div>
                    <div style={{ fontSize: 10, color: COLORS.muted }}>ULX</div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}><Badge color={COLORS.gold}>🎯 {p.bestMarket}</Badge></div>
                {p.result ? (
                  <div style={{ marginTop: 14, background: COLORS.cardInner, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8, letterSpacing: 1 }}>RESULTS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                      <StatBox label="H-AB" value={`${p.result.hits}-${p.result.ab}`} />
                      <StatBox label="HR" value={p.result.hr} color={COLORS.red} />
                      <StatBox label="RBI" value={p.result.rbi} color={COLORS.blue} />
                      <StatBox label="TB" value={p.result.tb} color={COLORS.gold} />
                    </div>
                    <div style={{ textAlign: "center", fontWeight: 900, fontSize: 16, letterSpacing: 2, color: outcome === "SUCCESS" ? COLORS.green : COLORS.red }}>
                      {outcome === "SUCCESS" ? "✅ SUCCESS" : "❌ MISS"}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8, letterSpacing: 1 }}>ENTER RESULTS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 10 }}>
                      {["hits", "ab", "hr", "rbi", "tb"].map((field) => (
                        <input key={field} type="number" placeholder={field.toUpperCase()}
                          value={inp[field] ?? ""}
                          onChange={(e) => setResultInput((prev) => ({ ...prev, [inputKey]: { ...prev[inputKey], [field]: parseInt(e.target.value) || 0 } }))}
                          style={{ background: COLORS.cardInner, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: "8px 4px", textAlign: "center", fontSize: 13, fontWeight: 700, width: "100%", boxSizing: "border-box" }}
                        />
                      ))}
                    </div>
                    <button onClick={() => saveResult(snap.date, p.id, inp)} style={{ background: COLORS.gold, color: "#000", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>
                      Save Result
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  function renderPerformanceTab() {
    if (!perfStats) return (
      <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div>No results logged yet.</div>
      </div>
    );
    const { avgScore, marketSuccess, rankSuccess, total } = perfStats;
    return (
      <>
        <h2 style={{ color: COLORS.gold, margin: "0 0 20px" }}>📈 ULX SYSTEM PERFORMANCE</h2>
        <div style={{ background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>OVERVIEW</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatBox label="Results Logged" value={total} color={COLORS.green} />
            <StatBox label="Avg ULX Score" value={avgScore} color={COLORS.gold} />
          </div>
        </div>
        <div style={{ background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>TOP RANKED PLAYERS</div>
          {[1,2,3,4,5,6,7,8,9,10].map((rank) => {
            const rs = rankSuccess[rank];
            if (!rs) return null;
            const pct = Math.round((rs.success / rs.total) * 100);
            return (
              <div key={rank} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: COLORS.text, fontWeight: 700 }}>#{rank} Ranked</span>
                  <span style={{ color: pct >= 50 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ background: COLORS.cardInner, borderRadius: 20, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct >= 50 ? COLORS.green : COLORS.red, borderRadius: 20 }} />
                </div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{rs.success}/{rs.total} success</div>
              </div>
            );
          })}
        </div>
        <div style={{ background: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>BEST MARKET ACCURACY</div>
          {Object.entries(marketSuccess).sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total)).map(([market, ms]) => {
            const pct = Math.round((ms.success / ms.total) * 100);
            return (
              <div key={market} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: COLORS.text, fontWeight: 700 }}>{market}</span>
                  <span style={{ color: pct >= 50 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ background: COLORS.cardInner, borderRadius: 20, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct >= 50 ? COLORS.green : COLORS.red, borderRadius: 20 }} />
                </div>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{ms.success}/{ms.total} success</div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const tabs = [
    { id: "dashboard", label: "📊 Board" },
    { id: "research", label: "🔍 Search" },
    { id: "tiers", label: "🎯 Tiers" },
    { id: "pool", label: "💼 Pool" },
    { id: "stacks", label: "🔗 Stacks" },
    { id: "results", label: "📋 Results" },
    { id: "performance", label: "📈 Stats" },
  ];

  return (
            <div style={{ 
      background: COLORS.bg, 
      minHeight: "100vh", 
      color: COLORS.text, 
      fontFamily: "'Arial', sans-serif",
      overflowY: "auto",
      overflowX: "hidden",
      height: "100vh",
      maxHeight: "100vh",
      position: "relative"
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", padding: "20px 16px 0" }}>
        <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginBottom: 4 }}>UNDERGROUND LINE EXCHANGE</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: COLORS.gold, letterSpacing: 2 }}>ULX RARE</h1>
        <div style={{ color: COLORS.green, fontSize: 12, letterSpacing: 2, marginTop: 4 }}>FIND THE OVERLOOKED. CASH CONSISTENTLY.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap", paddingBottom: 16 }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "4px 16px", fontSize: 12, color: COLORS.gold }}>
            {rawPlayers.length} players · {[...new Set(rawPlayers.map(p => p.gameId))].length} games
          </div>
          <button onClick={loadPlayers} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "4px 16px", fontSize: 12, color: COLORS.text, cursor: "pointer" }}>
            <button onClick={loadPlayers} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "4px 16px", fontSize: 12, color: COLORS.text, cursor: "pointer" }}>
            🔄 Refresh
          </button>
          <div style={{background:COLORS.card, borderRadius:20, padding:"4px 16px", fontSize:11, color:COLORS.muted}}>
            Key: {import.meta.env.VITE_ODDS_API_KEY ? "✅ " + import.meta.env.VITE_ODDS_API_KEY.slice(0,4) : "❌ Missing"}
          </div>
        </div>
      </div>

      {/* Sticky tabs */}
            <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`,
        padding: "10px 16px", overflowX: "auto", whiteSpace: "nowrap",
        display: "flex", gap: 6,
        flexShrink: 0,
      }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? COLORS.gold : COLORS.card,
            color: tab === t.id ? "#000" : COLORS.muted,
            border: "none", borderRadius: 10, padding: "8px 14px",
            fontWeight: 700, fontSize: 12, cursor: "pointer",
            flexShrink: 0, whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
            <div style={{ 
        padding: "16px 16px 40px", 
        maxWidth: 600, 
        margin: "0 auto",
        overflowY: "visible",
        minHeight: "calc(100vh - 120px)"
      }}>

        {loading && <div style={{ color: COLORS.gold, textAlign: "center", padding: 40 }}>⏳ Loading players...</div>}
        {!loading && rawPlayers.length === 0 && (
          <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚾</div>
            <div style={{ color: COLORS.text, fontWeight: 700 }}>No players available</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Lineups post 4–6 hours before first pitch</div>
          </div>
        )}

        {!loading && rawPlayers.length > 0 && (
          <>
            {tab === "dashboard" && (
              <>
                {renderLockButton()}

                {/* Odds filter toggles */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { key: "SAFE", label: "🛡️ +200–500", color: COLORS.green },
                    { key: "VALUE", label: "💰 +500–1500", color: COLORS.gold },
                    { key: "NUKE", label: "💣 +1500+", color: COLORS.red },
                    { key: "NONE", label: "❓ No Odds", color: COLORS.muted },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      onClick={() => { setOddsFilter((prev) => ({ ...prev, [key]: !prev[key] })); setPage(0); }}
                      style={{
                        background: oddsFilter[key] ? color + "33" : COLORS.card,
                        color: oddsFilter[key] ? color : COLORS.muted,
                        border: `1px solid ${oddsFilter[key] ? color : COLORS.border}`,
                        borderRadius: 20, padding: "6px 14px",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                      }}
                    >{label}</button>
                  ))}
                </div>

                {/* Show eliminated toggle */}
                <button
                  onClick={() => setShowEliminated(!showEliminated)}
                  style={{
                    background: showEliminated ? COLORS.red + "33" : COLORS.card,
                    color: showEliminated ? COLORS.red : COLORS.muted,
                    border: `1px solid ${showEliminated ? COLORS.red : COLORS.border}`,
                    borderRadius: 20, padding: "6px 14px",
                    fontWeight: 700, fontSize: 12, cursor: "pointer", marginBottom: 16,
                  }}
                >
                  {showEliminated ? "❌ Hiding Eliminated" : "👁️ Show Eliminated"}
                </button>

                <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 12 }}>
                  Showing {activeList.length} players · Page {page + 1} of {totalPages}
                </div>

                {pagedList.map((p, i) => renderPlayerCard(p, page * ITEMS_PER_PAGE + i + 1))}
                {renderPagination(page, totalPages, setPage)}
              </>
            )}

            {tab === "research" && (
              <>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setResearchPage(0); }}
                  placeholder="Search any player..."
                  style={{
                    width: "100%", padding: "12px 16px", background: COLORS.card,
                    border: `1px solid ${COLORS.border}`, borderRadius: 12, color: COLORS.text,
                    fontSize: 14, marginBottom: 16, boxSizing: "border-box",
                  }}
                />
                {pagedSearch.map((p) => renderPlayerCard(p))}
                {renderPagination(researchPage, totalSearchPages, setResearchPage)}
              </>
            )}

            {tab === "tiers" && (
              <>
                {/* Tier dropdown */}
                <select
                  value={tierPage === 0 ? "ALL" : tierPage === 1 ? "SAFE" : tierPage === 2 ? "VALUE" : "NUKE"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTierPage(v === "ALL" ? 0 : v === "SAFE" ? 1 : v === "VALUE" ? 2 : 3);
                  }}
                  style={{
                    width: "100%", padding: "12px 16px", background: COLORS.card,
                    border: `1px solid ${COLORS.border}`, borderRadius: 12,
                    color: COLORS.text, fontSize: 14, cursor: "pointer",
                    marginBottom: 20, outline: "none",
                  }}
                >
                  <option value="ALL">🎯 All Tiers ({scoredPlayers.length})</option>
                  <option value="SAFE">🛡️ Safe Plays +200–500 ({safePlayers.length})</option>
                  <option value="VALUE">💰 Value Plays +500–1500 ({valuePlayers.length})</option>
                  <option value="NUKE">💣 Nuke Plays +1500+ ({nukePlayers.length})</option>
                </select>

                {(tierPage === 0 ? scoredPlayers : tierPage === 1 ? safePlayers : tierPage === 2 ? valuePlayers : nukePlayers)
                  .map((p, i) => renderPlayerCard(p, i + 1))}
              </>
            )}

            {tab === "pool" && (
              sortedPool.length === 0 ? (
                <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
                  <div>No players in pool yet.</div>
                </div>
              ) : sortedPool.map((p) => renderPlayerCard(p))
            )}

            {tab === "stacks" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ margin: 0, color: COLORS.gold }}>🔗 TEAM STACKS</h2>
                  <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>Add 2+ players from the same team to your pool.</div>
                </div>
                {stacks.length === 0 ? (
                  <div style={{ textAlign: "center", color: COLORS.muted, padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
                    <div>No stacks yet.</div>
                  </div>
                ) : stacks.map((stack, i) => {
                  const score = stack.correlationScore;
                  const scoreColor = score >= 75 ? COLORS.green : score >= 55 ? COLORS.gold : COLORS.red;
                  return (
                    <div key={stack.team} style={{ background: COLORS.card, borderRadius: 16, marginBottom: 14, border: `1.5px solid ${scoreColor}44`, overflow: "hidden" }}>
                      <div style={{ height: 3, background: scoreColor }} />
                      <div style={{ padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ color: COLORS.muted, fontSize: 13, marginRight: 6 }}>#{i + 1}</span>
                            <strong style={{ fontSize: 18, color: COLORS.text }}>{stack.team}</strong>
                            <span style={{ color: COLORS.muted, fontSize: 12, marginLeft: 8 }}>{stack.players.length}-man stack</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor }}>{score}</div>
                            <div style={{ fontSize: 10, color: COLORS.muted }}>CORR. SCORE</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 14 }}>
                          <StatBox label="AVG ULX" value={stack.avgULX} color={COLORS.green} />
                          <StatBox label="PARK" value={`+${stack.parkBonus}`} color={COLORS.blue} />
                          <StatBox label="BULLPEN" value={`+${stack.bullpenBonus}`} color={COLORS.red} />
                          <StatBox label="PLATOON" value={`+${stack.platoonBonus}`} color={COLORS.purple} />
                        </div>
                        <div style={{ marginTop: 14 }}>
                          {stack.players.map((p) => (
                            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                              <span style={{ fontWeight: 700 }}>{p.name}</span>
                              <div style={{ display: "flex", gap: 8 }}>
                                <Badge color={COLORS.muted}>#{p.lineupSpot}</Badge>
                                <Badge color={COLORS.green}>{p.ulxScore}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab === "results" && renderResultsTab()}
            {tab === "performance" && renderPerformanceTab()}
          </>
        )}
      </div>
    </div>
  );
}