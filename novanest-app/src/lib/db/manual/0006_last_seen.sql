-- 後台「最近上線」：記錄使用者最近一次登入或使用 App 的時間。可重複執行。
-- ⚠️ 新版程式每次驗證登入都會讀取 last_seen_at，請在部署新版程式「之前」執行。舊版程式不受這個欄位影響。
-- 既有使用者一開始為 null（後台顯示「—」），下次登入或打開 App 時才會寫入。

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;
