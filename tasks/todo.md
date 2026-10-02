# Todo

Plan: `.claude/plans/2026-10-02-harness-qa-fahrrad.md`

## A — Workflow- und QA-Grundlage (`chore/qa-harness`)
- [x] Notion-Projektseite nach „🎯 Projekte & Tasks“ verschoben, Properties gesetzt
- [x] Baseline der alten Tests in `tests/out/baseline-*.txt`
- [x] Schritt-Modus `window.__MANUAL` (`p4e_main.js`)
- [x] `tests/lib/harness.py`, `tests/run.py`, `npm test`
- [x] `test_all.py` migriert
- [ ] `test_ven/hbf/rh/ft/egg/nods/new5.py` migriert, alte Skripte gelöscht
- [x] manuelle Skripte nach `tests/manual/`
- [x] globaler Agent `web-tester` (Harness-Repo, Branch `feat/web-tester`, PR offen)
- [x] CLAUDE.md: Testen, Roadmap & Notion, Ablauf je Paket
- [ ] Gegenprobe (absichtlicher Fehler → Exit 1), Determinismus (2 Läufe)
- [ ] PR + Review

## B — Fahrräder + Fahrradführerschein (`feat/fahrrad`)
- [ ] Notion → In Arbeit
- [ ] Umsetzung laut Plan
- [ ] `test_rad.py` (web-tester), Screenshots, Handy-Budget
- [ ] PR + Review, Release nach Rückfrage, Notion → Fertig
