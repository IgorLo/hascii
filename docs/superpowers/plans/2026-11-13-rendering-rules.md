# Rendering Rules Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Concentrate dithering policy and mode-specific settings without changing output or UI.

**Architecture:** Pure dithering policy with two real storage adapters; closed mode projection with narrow renderer inputs; page-local presentation adapter.

**Tech Stack:** Existing Svelte 5 / TypeScript / Vitest / Playwright / Node 24.

**Spec:** `docs/superpowers/specs/2026-11-13-rendering-rules-design.md`.

## Global constraints

- Preserve byte-level arithmetic, algorithms and all current presentation behavior.
- No network image processing, dependency changes, plugin registry or settings migration.
- Cross-slice imports use public entry points; new terms follow GLOSSARY.md.
- Commit each verified refactor separately; retain the baseline branch.

## Review focus

- Quantize biases empty palettes when called directly; png2xp suppresses it.
- Continuous versus integer sample preparation; Float32 mutation order.
- Cell shading independent of input dithering and strength.
- Visible legacy controls differ from active mathematical parameters.
- Presets, inactive settings retention and mobile overlay arrows.

## Tasks

- [x] Capture baseline numeric characterization tests and all-mode/preset browser digests at `3b28fa1`; verify unchanged source passes.
- [x] Add public policy tests (bias and resulting buffer), observe missing policy failure, implement `renderer/dither.ts`; adapt `color.ts` and `png2xp.ts` without moving fitting or sampling. Verify characterization and neighboring renderer tests; commit.
- [x] Add mode projection tests with explicit inactive-parameter conflicts, observe failure; implement canonical mode ids/projection/narrow option types in renderer. Route existing renderers through projection; narrow ASCII FX/png2xp/glyph profile inputs. Verify numeric and browser digests.
- [x] Add page presentation adapter for mode choices, section text and recipes. Replace repeated grouping in Controls/Editor/ModePicker/EditorModel; preserve exact markup and settings behavior. Run official Svelte analysis.
- [x] Complete Node 24 verify, compare all baseline digests, review full diff independently, resolve material findings, refresh local preview and commit remaining work.

## Dithering completion

The pre-refactor matrix contains five SHA256 byte snapshots across RGB quantization and png2xp (three palette cases, four strengths, narrow/odd dimensions and shading on/off). The new policy tests first failed on missing dither module, then passed. All 84 tests and typecheck pass. Production browser canvas+recipe digests match all 7 modes and all 4 presets from 3b28fa1. Existing caller-specific arithmetic and Bayer block shading are retained.

## Mode rules completion

Projection and presentation tests first failed on their missing modules, then passed with narrow renderer options and page-owned copy/grouping. The browser regression also switches between configured art modes and checks that inactive settings survive. Official Svelte analysis found no issues in the four changed Svelte files.

Final Node 24 `npm run verify` passed formatting, lint, slice boundaries, typecheck, 99 unit tests and 49 production browser scenarios (5 device-inapplicable scenarios skipped). All 11 browser canvas+recipe digests still match the baseline: seven modes and four presets. Independent review of the complete diff against `3b28fa1` found no material issues. The local production preview was refreshed on port 4175; desktop and mobile palette/mode-bar screenshots were checked.
