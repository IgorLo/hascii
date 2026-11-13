# Art renderers implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the four selected techniques as two new modes and a dither option.

**Architecture:** Pure local raster modules plug into the current renderer. Existing controls adapt to new settings; no server or UI kit changes.

**Tech Stack:** TypeScript, Svelte 5.57.3, Canvas/Worker, Vitest, Playwright, svelte-ascii-ui 0.2.0.

**Spec:** `docs/superpowers/specs/2026-11-13-art-renderers-design.md`.

## Global constraints

Browser-local images; pure renderer math; public cross-slice entries; no dependency upgrades; preserve existing modes; retain CC0 provenance; document PIA approximation honestly. Work branch: `codex/art-renderers`. User has authorized proceeding; routine UI placement uses the existing editor.

## Review focus

White/black endpoints and tiny images; highly saturated two-ink inputs; long narrow PIA images; switches during a render; hidden or misleading controls on mobile. Tests below cover these at renderer or browser boundaries.

### Task 1: Pixel Art renderer

Files: new `src/shared/lib/renderer/pixel-art.ts` and `pixel-art.test.ts`.

Interface: `renderPixelArt(source: ImageData, options: { columns: number; colorCount: number; iterations: number }): { image: ImageData; columns: number; rows: number; glyphs: number }`. Source already tone-corrected; output dimensions equal source, logical square pixels preserve aspect. Internal automatic palette; no external palette parameter.

- [x] Read primary paper and clarify its algorithm; write independent code and record bounded adaptations.
- [x] Add public-boundary failing tests for palette bound, determinism, grid/aspect, constant/tiny/skinny images, and structured detail; observe failure before implementation.
- [x] Implement spatial/color superpixel and palette refinement with bounded work; run tests and record runtime on bundled photo.

### Task 2: Halftone and blue noise

Files: new `halftone.ts`, `halftone.test.ts`, `blue-noise.ts`; modify `color.ts` and add color tests; bundled CC0 mask and notice.

- [x] Write failing tests: pure black/white tone endpoints, midtone coverage, changed period/angle/shape, two inks and offsets, deterministic blue-noise palette output and zero strength.
- [x] Implement ranked clustered threshold spots and paper/ink compositing; integrate the authored CC0 mask in quantize.
- [x] Verify tests and preserve original dither behavior.

### Task 3: Editor integration and verification

Files: renderer `types.ts`, `engine.ts`; playground `settings.ts`, `editor.svelte.ts`, `Controls.svelte`, `Editor.svelte`; browser tests; README.

- [x] Extend Settings/defaults/ranges, add mode routing and truthful recipe text.
- [x] Add new mode buttons and relevant parameter sections; preserve ASCII behavior and mobile drawer contracts.
- [x] Write/run browser acceptance for both modes, blue-noise and PNG downloads on desktop and mobile; check no overflow or error.
- [x] Run Svelte autofixer, formatting/lint, check, tests and production E2E; inspect rendered desktop/mobile results.
- [x] Fresh review against spec and code, address material findings, update README with limitations and provenance.

## Progress

- Setup: primary rules pinned; existing research notes preserved; isolated feature branch created. Application changes implemented and independently reviewed.

- Verification: Node 24.22.3, npm run verify passed: 75 Vitest tests; 37 browser scenarios passed and 2 desktop-only scenarios skipped on mobile. Desktop Chromium, mobile Chromium and iPhone WebKit covered.
- Review: CMYK screen correlation, two-pixel spot ties, white-margin ink bias and png2xp blue-noise dispatch reproduced and fixed with regressions. Independent re-review passed.
- Visual checks: desktop mono/CMYK/two-ink and PIA; iPhone WebKit PIA and settings drawer; no horizontal overflow. Screenshots under ignored work/art-preview.
- PIA remains a documented bounded experimental adaptation. Changes remain in codex/art-renderers; no merge or publication.
