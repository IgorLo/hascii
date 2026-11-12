# Two-color renderers implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks inline. The user requested implementation in the current editor; retain the existing local changes and workspace.

**Goal:** Add ASCII FX and png2xp modes, compare all five modes on PICO-8, and restore framed surfaces around desktop disclosures.

**Architecture:** Keep the synchronous public `render(Job): Result` boundary and browser-local worker. New pure cell-fitting modules return glyph masks and two colors; a Canvas adapter constructs public ASCII FX profiles from the user's actual font and cell geometry. Application-owned compositions use only public kit components.

**Tech stack:** Existing Svelte 5 / SvelteKit / Canvas / Vitest / Playwright; pinned `@ascii-fx/core@0.9.1`; TypeScript adaptation of MIT Asciicker png2xp at `8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635`.

**Spec:** User requests in this chat, plus `docs/research/2026-11-12-asciilands-renderer.md` for researched algorithms.

## Global constraints

- Preserve pixels, ASCII and overlay behavior and phone photo import.
- No image uploads, server changes, UI-kit patches or new remote assets.
- New modes: `ascii-fx` and `png2xp`, with shared square/tall cell dimensions and independent foreground/background opacity.
- ASCII FX supports the current font and custom character set; png2xp has fixed procedural block/shade masks.
- Reuse existing tone correction, palette library, dithering strength/algorithms and PNG dimensions. Palette fitting for ASCII FX is explicitly post-selection.
- PICO-8 for every generated comparison; keep user's ordinary default palette unchanged.
- UI sections must group their header and content in the existing Panel surface; presets must look subordinate to the disclosure heading.

## Review focus

- Tiny and odd image dimensions retain size and contain no undefined edge samples.
- Arbitrary palettes, including one color and more than 256 colors, remain usable.
- Empty or unsupported alphabets recover; renderer profile cache stays bounded while editing characters.
- Switching modes does not use stale worker output or expose irrelevant settings as active.
- Narrow touch and desktop paths support switching, editing, export and keyboard disclosure controls.

### Task 1: Restore section grouping

- [x] Use public Panel + Accordion for each desktop group; keep mobile Panel.
- [x] Preserve independent open state and existing keyboard test; inspect wide and narrow screenshots.

### Task 2: Add ASCII FX cell renderer

- [x] Add a failing public render test for independent foreground/background colors on a sharp two-color edge.
- [x] Install pinned core and add a bounded Canvas-to-AsciiProfile adapter using actual cell dimensions/font/characters.
- [x] Fit with `matchFrame(color: 'full')`, use existing palette quantization for both planes, paint at original output resolution.
- [x] Test flat cells, custom/empty characters, one-color and large palettes, opacity, deterministic dimensions.

### Task 3: Add png2xp adaptation

- [x] Add failing render cases for horizontal and vertical two-color halves and a flat field.
- [x] Implement linear-light averages, weighted RGB error and shade/half-block candidates, with local palette pair lookup and configurable existing error diffusion.
- [x] Paint procedural block masks so output remains crisp and does not depend on installed fonts.
- [x] Add retained MIT notices, source revision and explicit differences from original fixed-palette CLI.

### Task 4: Editor integration and comparison

- [x] Expose both modes and mode-specific controls (cell size/aspect, shade toggle; font/alphabet for ASCII FX).
- [x] Add meaningful browser scenarios covering both modes, PICO-8 selection, parameter changes, errors and PNG export on desktop and mobile.
- [x] Generate original plus six output images (classic ASCII has two matchers) using the same husky, resolution, PICO-8 and documented settings.
- [x] Run Svelte analysis, `npm run verify`, inspect generated comparison and UI, then fresh-context code review.

## Execution record

- Baseline: previous `npm run verify` green (32 unit, 28 browser); current changes are prior accordion and research work.
- Decision: execute in place to preserve the user's open local preview and requested current-session editor workflow.
- Task 1: framed public kit composition, no dependency patches or outstanding kit issue. Existing keyboard browser scenario passes; wide/narrow screenshots inspected.
- Task 2: public one-cell two-color test RED (old 4×2 grid), then GREEN. Bounded profile cache and post-selection quantization retain the app's 1–1024 palette contract.
- Task 3: horizontal/vertical boundary tests RED, then GREEN. Shade coverage, all dither zero-strength equivalence and palette-only raster checks added.
- Fresh-context review: three important findings fixed with failing reproduction tests where behavioral; partial-edge padding, native-pixel shade coverage and precomputed palette pair mixtures. Removed unused fitted-cell retention. Distinct 1024th-color fixture replaces duplicate-color coverage. No deferred findings.
- Review's independent visual/export checks delegated to this session: actual desktop/mobile screenshots and PNG outputs inspected, with browser acceptance on all three configured projects.
- Final verification after fixes: `npm run verify` passed, 51 unit tests and 31 browser tests (2 desktop-only cases skipped on mobile projects). Svelte analysis: no issues. PICO-8 artifacts regenerated from the final production build served locally on Node 24.
