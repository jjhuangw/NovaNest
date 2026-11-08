-- 後台可調整的設定（AI 使用上限等）。可重複執行。
-- 新版程式在這張表不存在時會使用預設上限，只是後台無法儲存修改，所以部署前後執行都可以。

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" uuid,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
