import { pgTable, uuid, text, timestamp, numeric, pgEnum, date, integer, uniqueIndex, index, jsonb, boolean, primaryKey } from 'drizzle-orm/pg-core'

// 所有資料表都開啟 RLS 且不設 policy：App 以 postgres 角色連線（會略過 RLS），
// 而 Supabase 公開 API（anon key）則完全無法存取。不要移除 enableRLS()，
// 否則 db:push 會把 RLS 關掉。
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // 顯示用的名字，可重複、可用中文；規則見 lib/user/username.ts
  username: text('username').notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  // 'male' | 'female'；未設定時為 null，顯示時預設男性
  gender: text('gender'),
  // 用來估算基礎代謝率；未設定時為 null
  birthYear: integer('birth_year'),
  // 'user' | 'admin'；管理員可進入 /admin 後台，以 scripts/set-role.mjs 指定
  role: text('role').default('user').notNull(),
  // 停用時間；非 null 時無法登入，既有登入也會失效
  disabledAt: timestamp('disabled_at'),
  // 方案：'free' | 'pro'，見 lib/user/plan.ts。pro_until 為 Pro 的到期時間，null 表示不到期
  plan: text('plan').default('free').notNull(),
  proUntil: timestamp('pro_until'),
  // 最近一次登入或使用 App 的時間（每小時最多更新一次，見 lib/auth/session.ts）；null 表示加入此欄位後尚未上線
  lastSeenAt: timestamp('last_seen_at'),
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

// 建立課表的問卷答案，每位使用者一筆，重新填寫時覆蓋。
// 格式見 lib/training/questionnaire.ts，讀出時以 questionnaireSchema 驗證。
export const planQuestionnaires = pgTable('plan_questionnaires', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}).enableRLS()

// AI 教練產生的課表，保留每次產生的版本，最新一筆即目前使用的課表。
// plan 為 TrainingPlan（lib/training/plan.ts），讀出時以 trainingPlanSchema 驗證。
export const trainingPlans = pgTable(
  'training_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    plan: jsonb('plan').notNull(),
    // 課表文字使用的語言
    locale: text('locale').notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('training_plans_user_created_idx').on(t.userId, t.createdAt)],
).enableRLS()

// 每次呼叫 Anthropic API 的用量，供後台估算費用。使用者刪除後保留紀錄（user_id 設為 null）。
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    // 'plan' | 'plan_translate' | 'food_photo' | 'food_label' | 'food_name'，見 lib/ai/usage.ts
    feature: text('feature').notNull(),
    // 實際回應的模型（可能是 fallback 後的模型）
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens').default(0).notNull(),
    cacheWriteTokens: integer('cache_write_tokens').default(0).notNull(),
    // 是否得到可用的結果（例如課表驗證失敗即為 false，但 token 仍會計費）
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('ai_usage_created_idx').on(t.createdAt), index('ai_usage_user_idx').on(t.userId)],
).enableRLS()

// AI 課表的其他語言版本（只有顯示文字）。課表本身仍以原文計算，
// 已記錄的動作名稱（set_logs.exercise_name）才能對得上。內容格式見 lib/training/plan-copy.ts 的 PlanText。
export const planTranslations = pgTable(
  'plan_translations',
  {
    planId: uuid('plan_id')
      .references(() => trainingPlans.id, { onDelete: 'cascade' })
      .notNull(),
    locale: text('locale').notNull(),
    text: jsonb('text').notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.locale] })],
).enableRLS()

// 後台可調整的設定（例如 AI 使用上限）。value 的格式由各功能自己驗證，讀不到或格式不符時使用程式內的預設值。
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}).enableRLS()

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type BodyStats = typeof bodyStats.$inferSelect
export type NewBodyStats = typeof bodyStats.$inferInsert
export type WorkoutLog = typeof workoutLogs.$inferSelect
export type SetLog = typeof setLogs.$inferSelect
export type BodyPhoto = typeof bodyPhotos.$inferSelect
export type FoodEntry = typeof foodEntries.$inferSelect
