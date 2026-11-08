# NovaNest

## 後台管理

管理員可從導覽列的「後台」進入 `/admin`，包含：

- **總覽**：使用者數、新註冊、近 7 天活躍、資料量、近 30 天 AI 用量
- **使用者**：搜尋與篩選、查看單一使用者，停用／重新啟用、設為或取消管理員、刪除帳號（含照片檔案）
- **AI 用量**：依功能、模型、使用者、日期統計每次 Anthropic API 呼叫的 token 與估算費用

非管理員造訪 `/admin` 會得到 404。部署新版本後先同步資料表，再指定管理員：

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
