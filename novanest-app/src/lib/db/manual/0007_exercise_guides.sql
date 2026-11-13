-- 動作說明（AI 產生、所有使用者共用）。可重複執行。
-- 程式在這張表不存在時仍可正常運作（只是無法產生說明），先部署或先執行都可以。

CREATE TABLE IF NOT EXISTS "exercise_guides" (
  "name_key" text PRIMARY KEY,
  "name" text NOT NULL,
  "catalog_id" text,
  "content" jsonb NOT NULL,
  "model" text NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 與其他資料表相同：開啟 RLS 且不設 policy，Supabase 公開 API 無法存取
ALTER TABLE "exercise_guides" ENABLE ROW LEVEL SECURITY;
