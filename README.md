# NovaNest

## 後台管理

管理員可從導覽列的「後台」進入 `/admin`，包含：

- **總覽**：使用者數、新註冊、近 7 天活躍、資料量、近 30 天 AI 用量
- **使用者**：搜尋與篩選、查看單一使用者，停用／重新啟用、設為或取消管理員、刪除帳號（含照片檔案）
- **AI 用量**：依功能、模型、使用者、日期統計每次 Anthropic API 呼叫的 token 與估算費用

非管理員造訪 `/admin` 會得到 404。AI 使用上限（每人每天各功能的次數、短時間上限、全站每天上限）可在後台「AI 用量」頁直接調整，存在 `app_settings` 資料表（`0004_app_settings.sql`）。部署新版本後先同步資料表，再指定管理員：

```bash
cd novanest-app
npm run db:push
npm run admin:set-role -- you@example.com admin   # 取消管理員：最後改成 user
```

資料表變更的 SQL 放在 `novanest-app/src/lib/db/manual/`，部署新版前請依序在 Supabase SQL Editor 執行尚未執行過的檔案（皆可重複執行）。

AI 費用依 `src/lib/ai/pricing.ts` 的價目表估算，換模型時記得更新；實際金額以 Anthropic Console 帳單為準。

## 打卡分享（IG 限時動態、Threads）

訓練紀錄頁儲存當天紀錄後，會出現「打卡分享」按鈕，開啟打卡圖編輯器（1080×1920）：

- 修改標題、選擇要顯示的項目（完成率、組數與訓練量、動作清單、使用者名稱）
- 背景：深色、淺色、品牌紅，或用自己的照片（只在裝置上合成，不會上傳）
- 加上文字與 emoji，可拖曳、調整大小與顏色（手機上可兩指縮放）

發佈方式：

- 手機（iOS Safari、Android Chrome）：點「分享到 Instagram 限時動態」，在分享選單選 Instagram → 限時動態
- 電腦：Instagram 只能從手機 App 發佈限時動態，所以電腦版只提供下載，並顯示 QR code；用手機掃描會直接在手機上開啟同一張打卡圖的編輯器
- 在 LINE、IG 等 App 的內建瀏覽器中可能無法分享檔案，請改用 Safari 或 Chrome 開啟

Threads：

- 手機「分享圖片到 Threads」：系統分享選單附上圖片與貼文文字，文字同時複製到剪貼簿（部分 App 收到圖片時會忽略文字）
- 「用文字＋連結發到 Threads」：開啟 Threads 的發文畫面（`threads.com/intent/post`），帶入今天的成果與產品介紹頁 `/about` 的連結，電腦也能用，但不含圖片
- 連結帶有 `utm_source=threads`，可在流量分析中區分從 Threads 來的訪客

## 產品介紹頁

未登入的訪客開啟首頁 `/` 會看到產品介紹（已登入者直接進入主頁）；`/about` 不論是否登入都顯示介紹頁，適合拿來分享。

## 版本與新功能通知

- 版本紀錄在 `novanest-app/src/lib/changelog.ts`，第一筆就是目前版本；設定頁「關於」會顯示版本（部署在 Vercel 時另外顯示 commit），`/changelog` 列出所有版本
- 只有重要的新功能或修正才需要記錄：在 `changelog.ts` 最前面新增一筆（版本、日期、`announce: true`、中英文項目），並把 `package.json` 的 `version` 改成相同版本；小調整、後台或內部的修改不必每次部署都記錄
- `announce: true` 的版本，使用者更新後第一次進入 App 會在導覽列下方看到新功能通知，按「知道了」後該裝置不再顯示；`announce: false` 只列在更新紀錄頁

## 訓練趨勢

- `/training/trends`（訓練紀錄頁有連結）：近 4／12／26 週的每週總訓練量、每週達成率，以及單一動作的最佳一組重量與推估 1RM（Epley 公式）；圖表為手寫 SVG，系列色 `--chart-1`／`--chart-2` 定義在 `globals.css`

## Free／Pro 方案

- 使用者有 `plan`（`free`／`pro`）與 `pro_until`（Pro 到期日，空白表示不到期），見 `src/lib/user/plan.ts`；`0005_user_plans.sql` 會把加入方案前已註冊的帳號設為 Pro，之後新註冊的人預設 Free。**要在部署新版程式前執行**
- 管理員在後台「使用者」→ 使用者頁面的「方案」開通 Pro，可設到期日（到期後自動變回 Free）；使用者列表可以篩選 Pro
- 各方案的 AI 次數（每天或每 30 天）與體態照片上限在後台「AI 用量」調整；預設 Free：照片／標示分析每天 3 次、名稱估算每天 10 次、課表每 30 天 1 次、照片 12 張；Pro：照片／標示分析每 30 天 300 次、課表每 30 天 10 次、照片 500 張
- 打卡圖用自己的照片當背景是 Pro 功能；Free 使用者碰到上限時會看到「Pro 方案有更多次數，請聯絡 NovaNest 開通」
- 使用者在「設定 → 方案」可以看到目前方案與剩餘次數

## 動作圖解與說明

- 課表上每個動作都有示範圖（起始／結束，人與器材），以及「怎麼做・怎麼發力」說明：器材設定、動作步驟、發力與感受、常見錯誤
- 圖片取自 [free-exercise-db](https://github.com/yuhonas/free-exercise-db)（Unlicense），挑選 172 個常見動作轉成 WebP 放在 `public/exercises/`；目錄與中英文名稱、別名在 `src/lib/training/exercise-catalog.ts`，課表上的動作名稱以正規化後的名稱或別名對應
- 說明由 AI 在第一次有人打開該動作時產生（中英文一起），存在 `exercise_guides` 資料表讓所有人共用；對不到圖片的動作由 AI 從目錄挑選。需要執行 `0006_exercise_guides.sql`（部署前後皆可；沒有資料表時仍會顯示圖片，只是說明不會保存）
- 產生說明計入 AI 次數「動作說明」（預設 Free 每天 20 次、Pro 每 30 天 1000 次），已經有人產生過的動作不會再計次
