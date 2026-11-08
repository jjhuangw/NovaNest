## Agent skills

### Issue tracker

Issues live in GitHub Issues on `jjhuangw/NovaNest`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Releases

When a change adds or changes something users can see, add an entry at the top of `novanest-app/src/lib/changelog.ts` (new version, date, items in both zh-TW and en) and set the same version in `novanest-app/package.json`. Users get a one-time "what's new" notice for the newest entry.
