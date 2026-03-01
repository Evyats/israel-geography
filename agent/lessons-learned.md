# Lessons Learned

- 2026-03-01: Preserve UTF-8 when editing Hebrew UI files (`Set-Content -Encoding utf8`), otherwise labels can become corrupted/question marks.
- 2026-03-01: For segmented difficulty sliders, confirm orientation explicitly (left=easy/right=hard) and keep mapping unchanged unless user asks.
- 2026-03-01: Segment count labels in UI must reflect the active filtered pool (`currentPool.length`), not static catalog targets.
- 2026-03-01: When territory filtering removes cities from early segments, backfill from next ranked cities so minimum playable round size (10) remains available.
- 2026-03-01: Difficulty map transitions should animate only changed features; unchanged features should remain stable to avoid visual noise.
- 2026-03-01: Keep `App.tsx` lean by extracting document/theme effects, map/list side-effects, and debug bridge wiring into dedicated hooks; centralize repeated UI cleanup handlers to avoid regression-prone duplication.
