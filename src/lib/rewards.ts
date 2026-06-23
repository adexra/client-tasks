import { supabase } from "./supabase";

// ── XP Formula ───────────────────────────────────────────────────────────────

/** Base XP by effort in minutes */
export const EFFORT_XP: Record<number, number> = {
  5: 5, 15: 10, 30: 20, 60: 40, 120: 70, 240: 120, 480: 220,
};

export const EFFORT_OPTIONS = [
  { value: 5,   label: "5 min" },
  { value: 15,  label: "15 min" },
  { value: 30,  label: "30 min" },
  { value: 60,  label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 480, label: "8 horas" },
];

/** Value multiplier by project revenue contribution (USD) */
export function getValueMultiplier(valueUsd: number): number {
  if (valueUsd <= 0)    return 1.0;
  if (valueUsd < 100)   return 1.2;
  if (valueUsd < 300)   return 1.5;
  if (valueUsd < 700)   return 2.0;
  if (valueUsd < 1500)  return 3.0;
  if (valueUsd < 3000)  return 4.0;
  return 5.0;
}

/** Priority multiplier */
export function getPriorityMultiplier(prioridade: number): number {
  if (prioridade >= 3) return 1.7; // critical = P3 in our 1-3 scale
  if (prioridade === 2) return 1.3;
  return 0.8;
}

/** Complexity multiplier */
export function getComplexityMultiplier(complexity: string): number {
  if (complexity === "expert") return 2.0;
  if (complexity === "hard")   return 1.5;
  if (complexity === "medium") return 1.2;
  return 1.0;
}

export const COMPLEXITY_OPTIONS = [
  { value: "easy",   label: "Fácil ×1.0" },
  { value: "medium", label: "Médio ×1.2" },
  { value: "hard",   label: "Difícil ×1.5" },
  { value: "expert", label: "Expert ×2.0" },
];

/** Full XP calculation for a task */
export function calcXp(t: {
  effort_minutes?: number | null;
  value_usd?: number | null;
  prioridade?: number | null;
  complexity?: string | null;
}): number {
  const base = EFFORT_XP[t.effort_minutes ?? 30] ?? 20;
  const value = getValueMultiplier(t.value_usd ?? 0);
  const priority = getPriorityMultiplier(t.prioridade ?? 2);
  const complexity = getComplexityMultiplier(t.complexity ?? "medium");
  return Math.round(base * value * priority * complexity);
}

/** Convert XP to Coins */
export function xpToCoins(xp: number): number {
  return Math.floor(xp * 0.15);
}

// ── Types ────────────────────────────────────────────────────────────────────

export type RewardCategory = "consumable" | "asset" | "life" | "home" | "skill";

export interface Reward {
  id: string;
  name: string;
  emoji: string;
  category: RewardCategory;
  tier: 1 | 2 | 3 | 4;
  coin_cost: number;
  budget_required: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  reward_id: string | null;
  reward_name: string;
  coins_spent: number;
  budget_spent: number;
  redeemed_at: string;
  notes: string | null;
}

export interface Freebie {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  dropped_at: string;
  redeemed_at: string | null;
}

export interface RewardBudgetEntry {
  id: string;
  amount: number;
  source: "profit_8pct" | "manual" | "redemption";
  description: string | null;
  created_at: string;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards").select("*").eq("is_active", true).order("tier").order("coin_cost");
  if (error) throw error;
  return data as Reward[];
}

export async function getRedemptions(): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from("reward_redemptions").select("*").order("redeemed_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data as RewardRedemption[];
}

export async function redeemReward(reward: Reward, notes?: string): Promise<void> {
  const { error } = await supabase.from("reward_redemptions").insert({
    reward_id: reward.id,
    reward_name: reward.name,
    coins_spent: reward.coin_cost,
    budget_spent: reward.budget_required,
    notes: notes ?? null,
  });
  if (error) throw error;
}

export async function getFreebies(): Promise<Freebie[]> {
  const { data, error } = await supabase
    .from("freebies").select("*").order("dropped_at", { ascending: false });
  if (error) throw error;
  return data as Freebie[];
}

export async function claimFreebie(id: string): Promise<void> {
  const { error } = await supabase
    .from("freebies").update({ redeemed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function getRewardBudget(): Promise<number> {
  const { data, error } = await supabase.from("reward_budget_log").select("amount");
  if (error) throw error;
  return (data as { amount: number }[]).reduce((sum, r) => sum + r.amount, 0);
}

export async function fundRewardBudget(netProfit: number, description: string, referenceId?: string): Promise<void> {
  const amount = Math.round(netProfit * 0.08 * 100) / 100;
  if (amount <= 0) return;
  const { error } = await supabase.from("reward_budget_log").insert({
    amount, source: "profit_8pct", description, reference_id: referenceId ?? null,
  });
  if (error) throw error;
}

/** Drop a random freebie after a task completion milestone */
export async function maybeDropFreebie(completedCount: number): Promise<Freebie | null> {
  const FREEBIES = [
    { name: "Café grátis", emoji: "☕", description: "Uma pausa merecida" },
    { name: "30 min de jogo", emoji: "🎮", description: "Jogou direito hoje" },
    { name: "Soneca extra", emoji: "😴", description: "Você ganhou" },
    { name: "Snack livre", emoji: "🍿", description: "Come sem culpa" },
    { name: "YouTube sem culpa", emoji: "📺", description: "15 min de descanso" },
  ];
  // Drop on every 5th completion
  if (completedCount % 5 !== 0) return null;
  const pick = FREEBIES[Math.floor(Math.random() * FREEBIES.length)];
  const { data, error } = await supabase.from("freebies").insert(pick).select().single();
  if (error) return null;
  return data as Freebie;
}
