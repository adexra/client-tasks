import { supabase } from "./supabase";

export const RITUAL_XP = 5;

export interface WeeklyRitual {
  id: string;
  day_of_week: number; // 0=Monday .. 6=Sunday
  title: string;
  category: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RitualCompletion {
  id: string;
  ritual_id: string;
  completed_date: string;
  completed_by: string | null;
  created_at: string;
}

/** All active weekly rituals, ordered by day then sort order. */
export async function getWeeklyRituals(): Promise<WeeklyRitual[]> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("weekly_rituals")
    .select("*")
    .eq("is_active", true)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as WeeklyRitual[];
}

export async function createRitual(dayOfWeek: number, title: string, category?: string): Promise<WeeklyRitual> {
  // supabase singleton from ./supabase
  const { data: existing } = await supabase
    .from("weekly_rituals")
    .select("sort_order")
    .eq("day_of_week", dayOfWeek)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
  const { data, error } = await supabase
    .from("weekly_rituals")
    .insert({ day_of_week: dayOfWeek, title, category: category ?? null, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyRitual;
}

export async function updateRitual(id: string, fields: Partial<Pick<WeeklyRitual, "title" | "category" | "color" | "is_active" | "sort_order">>): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase
    .from("weekly_rituals")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRitual(id: string): Promise<void> {
  // supabase singleton from ./supabase
  const { error } = await supabase.from("weekly_rituals").delete().eq("id", id);
  if (error) throw error;
}

/** Updates sort_order for all rituals in a given day based on the new order of ids. */
export async function reorderRituals(dayOfWeek: number, orderedIds: string[]): Promise<void> {
  // supabase singleton from ./supabase
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("weekly_rituals").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id)
    )
  );
}

/** Completions for a single date, keyed by ritual_id for quick lookup. */
export async function getRitualCompletions(dateISO: string): Promise<Record<string, RitualCompletion>> {
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("ritual_completions")
    .select("*")
    .eq("completed_date", dateISO);
  if (error) throw error;
  const map: Record<string, RitualCompletion> = {};
  for (const row of data as RitualCompletion[]) map[row.ritual_id] = row;
  return map;
}

/** Completions across multiple dates, keyed as `${ritual_id}:${date}`. */
export async function getRitualCompletionsForDates(dates: string[]): Promise<Record<string, RitualCompletion>> {
  if (dates.length === 0) return {};
  // supabase singleton from ./supabase
  const { data, error } = await supabase
    .from("ritual_completions")
    .select("*")
    .in("completed_date", dates);
  if (error) throw error;
  const map: Record<string, RitualCompletion> = {};
  for (const row of data as RitualCompletion[]) map[`${row.ritual_id}:${row.completed_date}`] = row;
  return map;
}

/** Toggles completion of a ritual for a given date. Returns true if now completed, false if removed. */
export async function toggleRitualCompletion(ritualId: string, dateISO: string, completedBy?: string): Promise<boolean> {
  // supabase singleton from ./supabase
  const { data: existing, error: selErr } = await supabase
    .from("ritual_completions")
    .select("id")
    .eq("ritual_id", ritualId)
    .eq("completed_date", dateISO)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase.from("ritual_completions").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from("ritual_completions")
      .insert({ ritual_id: ritualId, completed_date: dateISO, completed_by: completedBy ?? null });
    if (error) throw error;
    return true;
  }
}
