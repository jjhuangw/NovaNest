-- 以名稱估算過的食物營養素（AI 產生、所有使用者共用）。可重複執行。
-- 同一個名稱與份量再次查詢時直接使用這裡的結果，不再呼叫 AI，也不計入 AI 使用次數。
-- 程式在這張表不存在時仍可正常運作（只是每次都由 AI 估算），先部署或先執行都可以。

CREATE TABLE IF NOT EXISTS "food_estimates" (
  "name_key" text NOT NULL,
  "amount_key" text NOT NULL,
  "locale" text NOT NULL,
  "item" jsonb NOT NULL,
  "model" text NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("name_key", "amount_key", "locale")
);

-- 與其他資料表相同：開啟 RLS 且不設 policy，Supabase 公開 API 無法存取
ALTER TABLE "food_estimates" ENABLE ROW LEVEL SECURITY;
