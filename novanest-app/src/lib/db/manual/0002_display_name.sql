-- 顯示名稱（display name）。可重複執行。
-- 請在部署新版程式「之前」於 Supabase SQL Editor 執行。

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text;
