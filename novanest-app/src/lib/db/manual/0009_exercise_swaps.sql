-- 依手邊器材建議的替代動作（AI 產生、所有使用者共用）。可重複執行。
-- 同一個動作與同一組器材再次查詢時直接使用這裡的結果，不再呼叫 AI，也不計入 AI 使用次數。
-- 程式在這張表不存在時仍可正常運作（只是每次都由 AI 建議），先部署或先執行都可以。

CREATE TABLE IF NOT EXISTS "exercise_swaps" (
  "exercise_key" text NOT NULL,
  "equipment_key" text NOT NULL,
  "exercise_name" text NOT NULL,
  "equipment" jsonb NOT NULL,
  "options" jsonb NOT NULL,
  "model" text NOT NULL,
  "hits" integer DEFAULT 0 NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("exercise_key", "equipment_key")
);

-- 與其他資料表相同：開啟 RLS 且不設 policy，Supabase 公開 API 無法存取
ALTER TABLE "exercise_swaps" ENABLE ROW LEVEL SECURITY;
