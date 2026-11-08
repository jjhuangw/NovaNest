-- AI 課表的翻譯（切換語言時顯示）。可重複執行。
-- 新版程式在這張表不存在時仍可運作（只是無法翻譯），所以部署前後執行都可以。

CREATE TABLE IF NOT EXISTS "plan_translations" (
  "plan_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "text" jsonb NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plan_translations_plan_id_locale_pk" PRIMARY KEY("plan_id","locale")
);
ALTER TABLE "plan_translations" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  ALTER TABLE "plan_translations" ADD CONSTRAINT "plan_translations_plan_id_training_plans_id_fk"
    FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
