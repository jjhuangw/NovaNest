-- 後台管理（admin console）所需的資料表變更。可重複執行。
-- 在 Supabase SQL Editor 執行，或在本機以正式環境的 DATABASE_URL 執行 npm run db:push（結果相同）。

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_at" timestamp;

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "feature" text NOT NULL,
  "model" text NOT NULL,
  "input_tokens" integer NOT NULL,
  "output_tokens" integer NOT NULL,
  "cache_read_tokens" integer DEFAULT 0 NOT NULL,
  "cache_write_tokens" integer DEFAULT 0 NOT NULL,
  "success" boolean NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id");

-- 指定管理員（把 Email 換成你的帳號）：
-- UPDATE "users" SET "role" = 'admin' WHERE lower("email") = lower('you@example.com');
