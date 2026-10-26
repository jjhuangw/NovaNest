import { and, asc, between, eq, min, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { setLogs, workoutLogs } from '@/lib/db/schema'
import type { LoggedDay } from './completion'
import type { SetCounts } from './muscles'

export interface LoggedSet {
  exerciseIndex: number
  exerciseName: string
  setNumber: number
  weightKg: number | null
  reps: number
}

export async function getWorkoutLog(userId: string, date: string) {
  const log = await db.query.workoutLogs.findFirst({
    where: and(eq(workoutLogs.userId, userId), eq(workoutLogs.date, date)),
  })
  if (!log) return null

  const sets = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.workoutLogId, log.id))
    .orderBy(asc(setLogs.exerciseIndex), asc(setLogs.setNumber))

  return {
    ...log,
    sets: sets.map(
      (s): LoggedSet => ({
        exerciseIndex: s.exerciseIndex,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        weightKg: s.weightKg === null ? null : Number(s.weightKg),
        reps: s.reps,
      }),
    ),
  }
}

export async function getLoggedDays(userId: string, from: string, to: string): Promise<Map<string, LoggedDay>> {
  const rows = await db
    .select({
      date: workoutLogs.date,
      plannedSets: workoutLogs.plannedSets,
      completedSets: sql<number>`count(${setLogs.id})::int`,
    })
    .from(workoutLogs)
    .leftJoin(setLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(and(eq(workoutLogs.userId, userId), between(workoutLogs.date, from, to)))
    .groupBy(workoutLogs.id)

  return new Map(rows.map((r) => [r.date, { plannedSets: r.plannedSets, completedSets: r.completedSets }]))
}

export async function getSetCounts(userId: string, from: string, to: string): Promise<SetCounts> {
  const rows = await db
    .select({
      date: workoutLogs.date,
      exerciseName: setLogs.exerciseName,
      sets: sql<number>`count(*)::int`,
    })
    .from(setLogs)
    .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
    .where(and(eq(workoutLogs.userId, userId), between(workoutLogs.date, from, to)))
    .groupBy(workoutLogs.date, setLogs.exerciseName)

  const counts: SetCounts = new Map()
  for (const r of rows) {
    if (!counts.has(r.date)) counts.set(r.date, new Map())
    counts.get(r.date)!.set(r.exerciseName, r.sets)
  }
  return counts
}

export async function getFirstLogDate(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ first: min(workoutLogs.date) })
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
  return row?.first ?? null
}

export async function saveWorkoutLog(input: {
  userId: string
  date: string
  planDay: string
  plannedSets: number
  notes: string | null
  sets: LoggedSet[]
}) {
  await db.transaction(async (tx) => {
    const [log] = await tx
      .insert(workoutLogs)
      .values({
        userId: input.userId,
        date: input.date,
        planDay: input.planDay,
        plannedSets: input.plannedSets,
        notes: input.notes,
      })
      .onConflictDoUpdate({
        target: [workoutLogs.userId, workoutLogs.date],
        set: { planDay: input.planDay, plannedSets: input.plannedSets, notes: input.notes, updatedAt: new Date() },
      })
      .returning({ id: workoutLogs.id })

    await tx.delete(setLogs).where(eq(setLogs.workoutLogId, log.id))
    if (input.sets.length > 0) {
      await tx.insert(setLogs).values(
        input.sets.map((s) => ({
          workoutLogId: log.id,
          exerciseIndex: s.exerciseIndex,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          weightKg: s.weightKg === null ? null : String(s.weightKg),
          reps: s.reps,
        })),
      )
    }
  })
}
