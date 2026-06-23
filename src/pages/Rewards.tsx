import { useEffect, useState, useMemo } from "react";
import { Trophy, Coins, RefreshCw, Lock, CheckCircle2, Gift, Sparkles, ChevronDown } from "lucide-react";
import { getRewards, getRedemptions, getFreebies, getRewardBudget, redeemReward, claimFreebie } from "../lib/rewards";
import type { Reward, RewardRedemption, Freebie, RewardCategory } from "../lib/rewards";
import { getTasks } from "../lib/tasks";
import { calcXp, xpToCoins } from "../lib/rewards";

const cc = {
  panel: "rounded-2xl border border-white/[0.08] bg-[#0B1324]/80 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl",
  card: "relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101A2E] to-[#070D18]",
};
const mono = { className: "font-mono" };

const TIER_META = {
  1: { label: "Tier 1",  range: "10–50 Coins",   color: "text-emerald-400",  border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  2: { label: "Tier 2",  range: "50–150 Coins",  color: "text-[#09a1e5]",    border: "border-[#09a1e5]/20",  bg: "bg-[#09a1e5]/5"  },
  3: { label: "Tier 3",  range: "150–500 Coins", color: "text-violet-400",   border: "border-violet-500/20", bg: "bg-violet-500/5" },
  4: { label: "Tier 4",  range: "500+ Coins",    color: "text-amber-400",    border: "border-amber-500/20",  bg: "bg-amber-500/5"  },
};

const CAT_LABELS: Record<RewardCategory, string> = {
  consumable: "Consumível", asset: "Asset", life: "Vida", home: "Casa", skill: "Skill",
};

export default function RewardsPage() {
  const [rewards, setRewards]       = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [freebies, setFreebies]     = useState<Freebie[]>([]);
  const [budget, setBudget]         = useState(0);
  const [coins, setCoins]           = useState(0);
  const [xpTotal, setXpTotal]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [redeeming, setRedeeming]   = useState<string | null>(null);
  const [filter, setFilter]         = useState<"all" | RewardCategory>("all");
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rw, rd, fb, bg, tasks] = await Promise.all([
      getRewards().catch(() => []),
      getRedemptions().catch(() => []),
      getFreebies().catch(() => []),
      getRewardBudget().catch(() => 0),
      getTasks().catch(() => []),
    ]);
    setRewards(rw);
    setRedemptions(rd);
    setFreebies(fb);
    setBudget(bg);
    const xp = tasks.filter(t => t.execution_status === "done").reduce((sum, t) => sum + calcXp(t), 0);
    setXpTotal(xp);
    const spent = rd.reduce((sum, r) => sum + r.coins_spent, 0);
    setCoins(Math.max(0, xpToCoins(xp) - spent));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unclaimedFreebies = freebies.filter(f => !f.redeemed_at);
  const lifetimeCoins = xpToCoins(xpTotal);
  const spentCoins = redemptions.reduce((sum, r) => sum + r.coins_spent, 0);

  const grouped = useMemo(() => {
    const filtered = filter === "all" ? rewards : rewards.filter(r => r.category === filter);
    const map = new Map<number, Reward[]>();
    for (const r of filtered) {
      if (!map.has(r.tier)) map.set(r.tier, []);
      map.get(r.tier)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [rewards, filter]);

  const canRedeem = (r: Reward) => coins >= r.coin_cost && budget >= r.budget_required;

  const handleRedeem = async (r: Reward) => {
    if (!canRedeem(r)) return;
    if (!confirm(`Resgatar "${r.name}" por ${r.coin_cost} Coins${r.budget_required > 0 ? ` + R$${r.budget_required} do orçamento` : ""}?`)) return;
    setRedeeming(r.id);
    try {
      await redeemReward(r);
      await load();
    } finally {
      setRedeeming(null);
    }
  };

  const handleClaimFreebie = async (id: string) => {
    await claimFreebie(id);
    setFreebies(prev => prev.map(f => f.id === id ? { ...f, redeemed_at: new Date().toISOString() } : f));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" /> Rewards
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Ganha XP completando tarefas. Converte em Coins. Compra treats.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.08] bg-white/[0.04] transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* Balance strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${cc.panel} p-4`}>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">XP Total</p>
          <p className={`${mono.className} text-2xl font-black text-amber-400`}>{xpTotal.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-slate-500 mt-1">Não pode ser gasto — só sobe</p>
        </div>
        <div className={`${cc.panel} p-4`}>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Coins</p>
          <p className={`${mono.className} text-2xl font-black text-[#09a1e5]`}>{coins.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-slate-500 mt-1">{lifetimeCoins.toLocaleString()} ganhos · {spentCoins.toLocaleString()} gastos</p>
        </div>
        <div className={`${cc.panel} p-4`}>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Orçamento de Reward</p>
          <p className={`${mono.className} text-2xl font-black text-emerald-400`}>R${budget.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-slate-500 mt-1">8% do lucro líquido</p>
        </div>
      </div>

      {/* Unclaimed freebies */}
      {unclaimedFreebies.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
            <Gift size={15} /> {unclaimedFreebies.length} freebie{unclaimedFreebies.length !== 1 ? "s" : ""} disponível{unclaimedFreebies.length !== 1 ? "is" : ""}!
          </p>
          <div className="flex flex-wrap gap-2">
            {unclaimedFreebies.map(f => (
              <button key={f.id} onClick={() => handleClaimFreebie(f.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all">
                <span>{f.emoji}</span>
                <span className="text-xs font-semibold text-amber-200">{f.name}</span>
                <CheckCircle2 size={12} className="text-amber-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "consumable", "asset", "life", "home"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f ? "bg-[#09a1e5]/15 border-[#09a1e5]/40 text-[#09a1e5]" : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"}`}>
            {f === "all" ? "Todos" : CAT_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Reward tiers */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Carregando…</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([tier, items]) => {
            const meta = TIER_META[tier as keyof typeof TIER_META];
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                  <span className="text-[10px] text-slate-500">{meta.range}</span>
                  {tier >= 3 && <span className="text-[9px] text-slate-600 border border-slate-800 rounded-full px-1.5 py-0.5">Requer orçamento</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map(r => {
                    const can = canRedeem(r);
                    const isRedeeming = redeeming === r.id;
                    return (
                      <div key={r.id} className={`${cc.card} p-3 flex flex-col gap-2 ${!can ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xl">{r.emoji}</span>
                          {!can && <Lock size={11} className="text-slate-600 shrink-0 mt-1" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-100">{r.name}</p>
                          {r.description && <p className="text-[10px] text-slate-500 mt-0.5">{r.description}</p>}
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                            <span className={`${mono.className} text-[11px] font-bold ${meta.color}`}>{r.coin_cost} Coins</span>
                            {r.budget_required > 0 && (
                              <span className={`${mono.className} text-[10px] text-slate-500`}>+ R${r.budget_required}</span>
                            )}
                          </div>
                          <button onClick={() => handleRedeem(r)} disabled={!can || !!isRedeeming}
                            className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all ${can ? "bg-[#09a1e5] hover:bg-[#0891d5] text-white" : "bg-slate-900/60 text-slate-600 cursor-not-allowed border border-slate-800"}`}>
                            {isRedeeming ? "…" : can ? "Resgatar" : "Bloqueado"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redemption history */}
      {redemptions.length > 0 && (
        <div className={cc.panel}>
          <button onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left">
            <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Sparkles size={13} className="text-violet-400" /> Histórico de resgates
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </button>
          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {redemptions.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-white/[0.04]">
                  <p className="text-xs text-slate-300">{r.reward_name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`${mono.className} text-[10px] text-[#09a1e5]`}>{r.coins_spent} Coins</span>
                    <span className="text-[10px] text-slate-500">{new Date(r.redeemed_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
