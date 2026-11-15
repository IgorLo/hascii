# Mobile tools implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Запустить настоящее мобильное редактирование с гибридными ползунками и нормальным возвратом к превью.

**Architecture:** Editor владеет навигацией, canvas и layout. MobileTools компонует короткие группы и выбранный числовой параметр длинной группы; Controls остается полной формой. Общая горизонтальная лента используется ModePicker и числовым выбором.

**Tech Stack:** Svelte 5.57.3, SvelteKit 2.70.3, svelte-ascii-ui 0.3.0, TypeScript, Vitest, Playwright; Node 24.22.1.

**Spec:** `docs/superpowers/specs/2026-11-15-mobile-tools-design.md`.

## Global constraints

- Семь режимов, 43 поля, defaults, четыре пресета без отмены, диапазоны, PNG/HEIC/Lospec сохраняются.
- Обработка изображений только browser-local; renderer mathematics и зависимости не меняются.
- Только публичный UI-kit 0.3.0, без внутренних overrides и копий.
- Реальное превью на локальной ветке; публикация, push и merge не запрошены.

## Review focus

- Повторное быстрое закрытие и native-close после browser Back не должны сделать второй Back за пределы редактора.
- Переключение режима/checkbox меняет доступные параметры без потери скрытых значений или пустого выбранного ползунка.
- Открытые подробности/палитра/Фото должны одинаково закрываться по Escape, кнопке и history traversal, возвращая фокус.
- Короткий экран/landscape/desktop breakpoint не перекрывают Slider, навигацию и ошибки.
- Длинная импортированная палитра, пустой алфавит и обработка HEIC сохраняют прежние пути восстановления.

## Task 1: числовые группы и общая лента

Files: `model/mode-presentation.ts`, `model/mode-presentation.test.ts`, `ui/ControlStrip.svelte`, `ui/ModePicker.svelte`.

Interfaces: `mobileStyleRanges(settings: Settings): (keyof typeof ranges)[]`; общая лента принимает items/value/onchange/label и тип data-атрибута mode или parameter.

- [x] Добавить unit-сценарии Pixel Art, pixels off, ASCII tone/shape/allowEmpty, Halftone mono/duotone, FX/png2xp.
- [x] Выполнить тесты и наблюдать ожидаемую ошибку отсутствующего поведения.
- [x] Реализовать доступность числовых полей; извлечь app-owned ModePicker strip без изменения клавиатуры/стрелок/подсказок прокрутки.
- [x] `npm test` — все unit-тесты проходят.

## Task 2: живая панель, полные формы, навигация и превью

Files: `ui/MobileTools.svelte`, `ui/Editor.svelte`, `ui/Controls.svelte`, `ui/PalettePicker.svelte`, `ui/PaletteImport.svelte`, `model/editor.svelte.ts`, `src/app.d.ts`, `tests/mobile-tools.spec.ts`.

Interfaces: MobileTools получает editor, open, section, detail и callbacks openDetails/back/close; section/detail принадлежат `page.state.hasciiEditor`. Controls получает callback импорта и управляемость палитры только для мобильной композиции; существующее desktop поведение по умолчанию сохраняется.

- [x] Написать browser-сценарии трех живых ползунков, длинной ленты и двух уровней Back; наблюдать RED на прежнем интерфейсе.
- [x] Реализовать панель: ≤3 Style ranges вместе, длинные — лента + один Slider, Tone всегда три при включенной коррекции, Color — действующие контролы.
- [x] Переиспользовать Controls для полной формы стиля и Фото, отдельный PaletteImport для импорта. Согласовать Popover open с shallow state; не создавать history на значения.
- [x] Переставить сравнение/статус, убрать номера/лишний Panel, показать время готового результата внизу.
- [x] `npm run check` и целевые browser-сценарии — без ошибок; новые Svelte-компоненты проверены autofixer.

## Task 3: регрессии, осмотр и запуск

Files: существующие `tests/helpers/editor.ts`, mobile/editor/palette E2E; документы проверки и локальные артефакты в `work/`.

- [x] Обновить старые acceptance helpers на полные формы и новые ползунки; убрать проверки намеренно замененного отдельного экрана параметра.
- [x] `npm run verify` на Node 24 — lint/check/unit/all E2E проходят.
- [x] Осмотреть production UI в Chromium/WebKit на 320×640, 393×852, landscape, desktop, включая scroll/focus/error/длинные настройки; исправить подтвержденные дефекты.
- [x] Получить независимое whole-change review; существенные находки исправить и проверить соответствующий сценарий и suite.
- [x] Запустить устойчивый локальный production preview, в следующем вызове проверить readiness и первичный путь на узком/широком экране; открыть пользователю и передать URL.

## Ledger

- База: origin/main после fetch = HEAD eb9f0bb; branch codex/mobile-tools-preview. Исходные два UX-отчета оставлены без потери.
- Выбор исполнения: inline, пользователь уже поручил собрать и запустить реальное приложение; дополнительные этапы согласования не требуются. Новая worktree не создается, изменения изолированы веткой текущего checkout для запрошенного локального запуска.

## Result and evidence

- Shared conventions pinned for this task: igorlo-llm-hub main `ff148a1644f71a31cb599cab46a1e0752d2dbc64`; read AGENTS, git/testing profiles and relevant catalog at this revision. Application base `eb9f0bb1dc2e8dda305f7f0b93b7277f13b5fe3d`.
- RED: missing mobileStyleRanges behavior; initial browser cases failed against the old one-parameter screen. GREEN: 101 unit tests after implementation.
- Browser regression evidence found and fixed: duplicate Back after native dialog close, full-style disclosure/scroll restoration, insufficient actual image height on 320×640, and test-helper synchronization with asynchronous native-close/history traversal.
- One independent final review: no Critical findings; all four Important findings reproduced with failing browser cases, then fixed: unavailable Forward palette detail, a lost tool tap during outside palette dismissal, Color disclosure/scroll loss across Import, and missing visible processing status inside Photo. Minor keyboard focus finding also reproduced and fixed: explicit parameter editing focuses its Slider; ordinary Back restores the launcher.
- After fixes: targeted mobile Chromium + iPhone WebKit run **28 passed**. Final `npm run verify` on Node **24.22.1**: lint passed; Svelte check **0 errors / 0 warnings**; **101 unit tests passed**; E2E **78 passed, 18 device-specific skips**, no failures. `git diff --check` passed.
- Official Svelte autofixer: no issues in all 11 changed components/modules. Generic suggestions about DOM effects, bind:this and optional class syntax were inspected; DOM focus/scroll/history effects remain necessary side effects, and canvas ownership remains stable.
- Production visual inspection: 320×640, 393×852, 852×393 landscape and 1440×1000 desktop. No horizontal document overflow. Actual painted Tone image at 320×640: **151.1 × 188.8 px**, all three Sliders remain visible; at 393×852: **320.7 × 400.8 px**. ASCII uses the compact horizontal strip and one Slider; symbols/full style use the full-screen public Drawer.
- Production primary path: changed Pixel Art width **64 → 80** via the live Slider; rendered recipe changed to 80 columns; browser Back closed tools and kept the app URL. PNG, HEIC, damaged input recovery, Lospec, large palettes and all seven modes passed in the complete suite.
- Background production server started with bundled Node 24, hidden window, `scripts/start.mjs`; **HTTP 200** verified in a later command with the machine proxy bypassed. Local URL: `http://127.0.0.1:4173/`; PID/logs/screenshots in ignored `work/mobile-tools-2026-11-15/`.
- Actual browser history traversal is covered in Chromium/WebKit. The physical edge gesture in the specific host WebView still needs an on-device check; no custom swipe interception was added.
- Delivery stays on local branch `codex/mobile-tools-preview`, uncommitted; no push, merge or publication requested or performed. Renderer mathematics, browser-local processing and dependencies are unchanged. No UI-kit internal overrides or package exceptions used.

## Follow-up: stable bottom navigation

User-approved refinement: visibly mark the open tool, keep the bottom bar at its compact size in every state, close an active tool on a second press, and slightly separate the bar surface from the page. Application composition/history own these changes; UIKit 0.3.0 Button uses its public primary/default variants.

- This follow-up pins Hub `5b9994322e17a411203de27a1cc21cd71c81cc3e`; AGENTS and git/testing/catalog read at that revision. Fresh fetch confirms HEAD and origin/main remain equal at `eb9f0bb1dc2e8dda305f7f0b93b7277f13b5fe3d`; existing local work remains on `codex/mobile-tools-preview`.
- Scope: Editor.svelte and MobileNavigation; regression cases at the existing browser seam. Default and adjusting navigation share 4px vertical padding plus the bottom safe-area inset; the bar surface mixes 4% of the semantic text color into the semantic background. Selected tool uses the existing primary Button treatment and aria-pressed.
- RED → GREEN observed separately: navigation changed from 69px to 57px on opening; selected and unselected text were the same color; the second keyboard press left Tone open. All three demonstrated failures now pass. Repeat press also closes the open palette and its parent Color section; pending history traversal retains the requested action.
- Final Node 24 checks: `npm run lint` passed; `npm run check` reported 0 errors and 0 warnings; mobile tools/regressions/parameter editor suites in mobile Chromium and iPhone WebKit: **34 passed**, no failures. Official Svelte autofixer returned no issues in both changed files; existing advisory DOM-effect suggestions remain unchanged. Incremental source diff reviewed against saved pre-follow-up files; `git diff --check` passed.
- Production Playwright CLI journeys: fresh iPhone 13/WebKit and desktop Chrome sessions both changed Pixel Art width to 80 columns, observed the rendered result and downloaded `husky-hascii.png`; no page errors. Mobile keyboard toggle, Forward retaining brightness 20 and active state also passed. At 393×852 the closed and open bar both measured **x=0, y=795, width=393, height=57**.
- Screenshots inspected together for closed/active Style, Tone at 320×640 and landscape 852×393. Text contrast against the subtly lighter bar: **12.24:1** default and **7.12:1** accent. UI checklist retrieved 2026-11-15; no actionable findings in the follow-up scope. No kit internals modified or overridden.
- Updated persistent production preview: `http://127.0.0.1:4173/`, PID 20636. Subsequent HTTP readiness **200**; logs and screenshots under ignored `work/mobile-nav-polish-2026-11-15/`. No commit, push, merge or publication performed.
