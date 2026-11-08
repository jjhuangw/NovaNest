## Agent skills

### Issue tracker

Issues live in GitHub Issues on `jjhuangw/NovaNest`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Releases

Only important new features or fixes get a release note: add an entry at the top of `novanest-app/src/lib/changelog.ts` (new version, date, `announce: true`, items in both zh-TW and en) and set the same version in `novanest-app/package.json`. Users get a one-time "what's new" notice for the newest announced entry. Small tweaks, internal or admin-only changes do not need an entry or a version bump; use `announce: false` for an entry that should appear in the changelog without a notice.
