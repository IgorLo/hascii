# Implementation plan for mobile parameter editing

Spec: docs/superpowers/specs/2026-11-14-mobile-editor-design.md. Approved scope: first four review items; preset undo explicitly excluded. Hub641402035e2046d72b19d09143a9dcc1815e1174. Execute inline on codex/mobile-parameter-editor with a Svelte component helper and final fresh review. Preserve the user's uncommitted review document. No dependency/renderer changes, commits or publication required.

## Task 1 Task-oriented presentation

- Update the public modePresentation tests to assert four stable sections and pixels control kind; observe RED.
- Change only presentation sections/kind; retain mode order and formatRecipe; observe GREEN.
- Files: model/mode-presentation.ts and its tests. API ToolSection=photo|style|color|tone; presentation.controls=pixels|symbols|cells|art.

## Task 2 Contextual controls and phone parameter mode

- Add a browser test: Style → edit artColumns → visible large result and single slider → change result → Back/Escape returns row focus/value; observe RED before implementation.
- Svelte helper owns Controls.svelte, ArtControls.svelte and new ParameterRange.svelte; root owns Editor.svelte and all model files.
- ParameterRange props: editor, setting:keyof typeof ranges, compact?:boolean, onedit?:(key:keyof typeof ranges)=>void, label?:string, disabled?:boolean. compact+onedit renders button id=edit-KEY, data-edit=KEY, accessible name Изменить: LABEL and current value. Otherwise Field+Slider with id=KEY.
- Controls props: editor, section=all, mobile=false, onedit?, upload?:Snippet, showModePicker=true. Root passes upload and mobile/onedit; mobile list contains compact rows. Style renders existing ModePicker only when showModePicker, presets and applicable controls. Advanced native details have data-details=style/dither/import; keep summaries discoverable. Photo renders upload snippet and resolution. Color renders ArtControls section=color for art; Style renders ArtControls section=style.
- ArtControls props: editor, section:style|color, mobile=false,onedit?. Shared ParameterRange; dependent Halftone color fields retained.
- Editor keeps canvases mounted. State selected parameter and return section; native Drawer for list. Close Drawer then tick/focus range; Back opens same list then tick/focus edit row. aria region Редактирование параметра and Назад к настройкам. Escape equivalent. Mobile parameter view uses flex/grid available height, no backdrop. Native mobile tools remain44px+, controls keep kit geometry. Resize to desktop clears transient state.
- root owns Editor/viewport CSS and uses public Panel style for flex sizing, not internal selectors.
- Observe GREEN focused test, add browser cases for contextual colors, hidden settings preservation and mobile/desktop flow.

## Task 3 Preserve acceptance coverage and polish

- Adapt existing browser helpers to sections/style, compact ranges and details; retain PNG bytes/dimensions, HEIC, palette persistence, keyboard and mode order assertions.
- Add public tests for advanced disclosure, mode applicability, Halftone colors and Pixel Art color count.
- Run Svelte autofixer for changed components; prettier/eslint/check; all Vitest; production Playwright desktop/mobile/WebKit. Run npm run verify once integration is coherent.
- Inspect actual screenshots at393/320 and short landscape; no horizontal overflow, no occlusion, large editable preview. Run Impeccable detector once on changed UI after implementation.
- Fresh final reviewer checks user scope and regressions; fix important findings and rerun affected checks. Update review/README to state actual implemented first-four scope, no preset undo. Return short result with tests and preview evidence.

Review focus: Drawer/slider focus race; resize while adjusting; active children in collapsed details; hidden state retained across mode changes; one input ID and ModePicker; no bitmap/math changes; low-height landscape.

## Completion evidence

Tasks 1–3 completed. Final `npm run verify`: lint/check clean, 99 unit tests and 60 E2E passed, 9 profile-specific skips. Real phone viewport rotation remains in parameter mode; scroll restoration and numeric accessible descriptions covered. Fresh reviewer: no unresolved findings. Five changed Svelte components: official analyzer 0 issues; Impeccable detector 0 findings. Chromium/WebKit screenshots inspected at320×640,393×852,852×393 and1440×1000. No physical device check, renderer/dependency changes, preset undo, commits or publication. Local evidence: work/mobile-editor-2026-11-14/.
