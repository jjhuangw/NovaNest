-- 允許使用者名稱重複（可使用中文）。可重複執行。
-- 請在部署新版程式「之前」於 Supabase SQL Editor 執行。

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
