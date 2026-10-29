import { pgTable, uuid, text, timestamp, numeric, pgEnum, date, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

// 所有資料表都開啟 RLS 且不設 policy：App 以 postgres 角色連線（會略過 RLS），
// 而 Supabase 公開 API（anon key）則完全無法存取。不要移除 enableRLS()，
// 否則 db:push 會把 RLS 關掉。
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  // 'male' | 'female'；未設定時為 null，顯示時預設男性
  gender: text('gender'),
  // 用來估算基礎代謝率；未設定時為 null
  birthYear: integer('birth_year'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}).enableRLS()

export const bodyStats = pgTable('body_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  bodyFatPct: numeric('body_fat_pct', { precision: 5, scale: 2 }),
  notes: text('notes'),
}).enableRLS()

// 每位使用者每天一筆訓練紀錄；planned_sets 是儲存當下課表的總組數快照，
// 之後課表變動也不會影響過去的達成率。
export const workoutLogs = pgTable(
  'workout_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    planDay: text('plan_day').notNull(),
    plannedSets: integer('planned_sets').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('workout_logs_user_date_idx').on(t.userId, t.date)],
).enableRLS()

// 只儲存有填次數的組，一列即一組完成的組。
export const setLogs = pgTable('set_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutLogId: uuid('workout_log_id').references(() => workoutLogs.id, { onDelete: 'cascade' }).notNull(),
  exerciseIndex: integer('exercise_index').notNull(),
  exerciseName: text('exercise_name').notNull(),
  setNumber: integer('set_number').notNull(),
  weightKg: numeric('weight_kg', { precision: 6, scale: 2 }),
  reps: integer('reps').notNull(),
}).enableRLS()

// 體態照片：檔案存在 Supabase Storage 的私有 bucket，這裡只記錄路徑與資訊。
export const bodyPhotos = pgTable(
  'body_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    takenOn: date('taken_on', { mode: 'string' }).notNull(),
    pose: text('pose').notNull(),
    storagePath: text('storage_path').notNull(),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('body_photos_user_taken_idx').on(t.userId, t.takenOn)],
).enableRLS()

// 飲食紀錄：一列即一項食物，營養素一律存「實際吃下的總量」（已乘上份數）。
// 照片只用來分析，不會儲存。
export const foodEntries = pgTable(
  'food_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    meal: text('meal').notNull(),
    // 'manual' | 'photo' | 'label'
    source: text('source').notNull(),
    name: text('name').notNull(),
    amount: text('amount'),
    kcal: numeric('kcal', { precision: 7, scale: 1 }).notNull(),
    proteinG: numeric('protein_g', { precision: 6, scale: 1 }).notNull(),
    carbsG: numeric('carbs_g', { precision: 6, scale: 1 }).notNull(),
    fatG: numeric('fat_g', { precision: 6, scale: 1 }).notNull(),
    fiberG: numeric('fiber_g', { precision: 6, scale: 1 }),
    sugarG: numeric('sugar_g', { precision: 6, scale: 1 }),
    sodiumMg: numeric('sodium_mg', { precision: 7, scale: 0 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('food_entries_user_date_idx').on(t.userId, t.date)],
).enableRLS()

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type BodyStats = typeof bodyStats.$inferSelect
export type NewBodyStats = typeof bodyStats.$inferInsert
export type WorkoutLog = typeof workoutLogs.$inferSelect
export type SetLog = typeof setLogs.$inferSelect
export type BodyPhoto = typeof bodyPhotos.$inferSelect
export type FoodEntry = typeof foodEntries.$inferSelect
