import { pgTable, uuid, text, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const bodyStats = pgTable('body_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  bodyFatPct: numeric('body_fat_pct', { precision: 5, scale: 2 }),
  notes: text('notes'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type BodyStats = typeof bodyStats.$inferSelect
export type NewBodyStats = typeof bodyStats.$inferInsert
