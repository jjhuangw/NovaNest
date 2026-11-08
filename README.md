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

AI 費用依 `src/lib/ai/pricing.ts` 的價目表估算，換模型時記得更新；實際金額以 Anthropic Console 帳單為準。
