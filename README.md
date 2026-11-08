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

## 打卡到 IG 限時動態

訓練紀錄頁儲存當天紀錄後，會出現「打卡到 IG」按鈕。它會在瀏覽器產生 1080×1920 的打卡圖：

- 手機（iOS Safari、Android Chrome）：點「分享到 Instagram」，在分享選單選 Instagram → 限時動態
- 不支援分享檔案的瀏覽器（多數電腦版）：下載圖片後自行上傳

Instagram 沒有開放網站直接發佈限時動態的 API，所以只能透過系統分享選單或下載圖片。
