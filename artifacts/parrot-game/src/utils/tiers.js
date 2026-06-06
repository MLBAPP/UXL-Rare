export function getTier(hrOdds) {
  if (!hrOdds) return { name: "NO ODDS", color: "#71717a", desc: "Odds not available" };
  const odds = Math.abs(hrOdds);
  if (odds <= 500) return { name: "SAFE", color: "#22c55e", desc: "Lower odds · Steady win" };
  if (odds <= 1500) return { name: "VALUE", color: "#eab308", desc: "Mid odds · Good upside" };
  return { name: "NUKE", color: "#ef4444", desc: "High odds · Big payout" };
}