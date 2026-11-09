-- Free／Pro 方案。可重複執行。
-- ⚠️ 新版程式登入時會讀取 plan 欄位，請在部署新版程式「之前」執行。舊版程式不受這些欄位影響。

DO $$ BEGIN
  -- 第一次加入 plan 欄位時，把現有的試用者全部設為 Pro（不到期）；之後新註冊的人預設為 Free。
  -- 欄位已存在時（重複執行）不做任何更新，不會把之後註冊的人改成 Pro。
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;
    UPDATE "users" SET "plan" = 'pro';
  END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pro_until" timestamp;
