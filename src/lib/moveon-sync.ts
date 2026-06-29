// Pushes MoveOn-tagged tasks and their sprint objectives to the MoveOn admin dashboard.
// Auth: INTERNAL_API_KEY shared secret (Bearer token).
// Called fire-and-forget from createTask / updateTask / deleteTask in tasks.ts.
//
// Tasks are filtered by projeto containing "moveon" (case-insensitive).
// Only non-archived tasks are pushed; deletions are pushed as DELETE requests.

import { supabase } from "./supabase";
import type { Task } from "./tasks";

const MOVEON_API_URL = import.meta.env.VITE_MOVEON_API_URL as string | undefined;
const MOVEON_API_KEY = import.meta.env.VITE_MOVEON_INTERNAL_KEY as string | undefined;

function isConfigured(): boolean {
  return !!(MOVEON_API_URL && MOVEON_API_KEY);
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${MOVEON_API_KEY}`,
  };
}

/** Returns true if this task belongs to a MoveOn-linked project. */
export function isMoveOnTask(task: Pick<Task, "projeto">): boolean {
  return /moveon/i.test(task.projeto ?? "");
}

/**
 * Push a single task (upsert) to MoveOn.
 * Fire-and-forget — never throws, logs errors to console.
 */
export async function pushTaskToMoveOn(task: Task): Promise<void> {
  if (!isConfigured() || !isMoveOnTask(task)) return;

  try {
    const res = await fetch(`${MOVEON_API_URL}/api/admin/sync-tasks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ tasks: [task] }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[moveon-sync] push failed (${res.status}):`, body);
    }
  } catch (err) {
    console.warn("[moveon-sync] push error:", err);
  }
}

/**
 * Push a task deletion to MoveOn.
 * Fire-and-forget — never throws.
 */
export async function deleteTaskOnMoveOn(taskId: string): Promise<void> {
  if (!isConfigured()) return;

  try {
    const res = await fetch(
      `${MOVEON_API_URL}/api/admin/sync-tasks?id=${encodeURIComponent(taskId)}`,
      { method: "DELETE", headers: headers() }
    );
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[moveon-sync] delete failed (${res.status}):`, body);
    }
  } catch (err) {
    console.warn("[moveon-sync] delete error:", err);
  }
}

/**
 * Full re-sync: fetches ALL MoveOn-tagged tasks + their sprint objectives
 * from Supabase and pushes them to MoveOn in one batch.
 * Use this for the manual "force sync" button or on first setup.
 */
export async function fullSyncToMoveOn(): Promise<{ tasks: number; objectives: number; errors: string[] }> {
  if (!isConfigured()) {
    return { tasks: 0, objectives: 0, errors: ["VITE_MOVEON_API_URL or VITE_MOVEON_INTERNAL_KEY not set"] };
  }

  // Fetch tasks where projeto contains "moveon" (case-insensitive ilike)
  const { data: tasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("*")
    .ilike("projeto", "%moveon%")
    .neq("execution_status", "archived");

  if (tasksErr) {
    return { tasks: 0, objectives: 0, errors: [`fetch tasks: ${tasksErr.message}`] };
  }

  // Collect unique sprint keys from the task set
  const sprintKeys = [...new Set((tasks ?? []).map((t) => t.projeto).filter(Boolean))] as string[];

  // Fetch objectives for those sprints
  const { data: objectives } = sprintKeys.length
    ? await supabase
        .from("roadmap_objectives")
        .select("*")
        .in("key", sprintKeys)
    : { data: [] };

  try {
    const res = await fetch(`${MOVEON_API_URL}/api/admin/sync-tasks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ tasks: tasks ?? [], objectives: objectives ?? [] }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { tasks: 0, objectives: 0, errors: [`MoveOn API error (${res.status}): ${body}`] };
    }

    const result = await res.json();
    return {
      tasks: result.tasks_upserted ?? 0,
      objectives: result.objectives_upserted ?? 0,
      errors: result.errors ?? [],
    };
  } catch (err) {
    return { tasks: 0, objectives: 0, errors: [String(err)] };
  }
}
