# hascii migration evidence

The baseline is commit `ad0984c`. All old source and authored dist assets can be restored from that commit. Current application source is at repository root; outputs and work are ignored.

## Behavior preserved

The original controls, ranges, defaults, four presets and three preview layouts were mapped to Svelte components. Renderer mathematics and its Job/Result protocol were preserved; 24 combinations of rendering mode, dithering algorithm and tone/shape matching produced byte-identical output against the prototype on a deterministic test image.

Unit tests exercise palette validation, server failures, flat cell colors, independent opacity, image dimensions, glyph errors and the latest-job queue. Browser tests exercise mode/preset changes, settings, empty-alphabet recovery, persistence, import errors, file decoding, PNG signature/dimensions and viewport overflow on desktop and mobile.

## UI library

The installed contract is `svelte-ascii-ui@0.2.0`. Theme, Panel, Button, Field, Slider, Select, Checkbox, FileInput, Input, Textarea and Link replace bespoke controls. Canvas previews, drag-and-drop and palette swatches remain application compositions. Burgundy colors use public Theme settings. No internal selectors, copied kit components, patches or approved exceptions are used.

## Architecture decisions

- One editor page contains UI and browser orchestration. A redundant page-to-widget wrapper was removed rather than disabling Steiger's insignificant-slice rule.
- Pure math and module Worker live under shared/lib/renderer. No standalone editor package yet.
- adapter-node preserves the Lospec server route; image data remains in the browser.
- New storage keys intentionally do not import old GLYPH/LAB saved state, per user decision.
- Build verification uses Node 24.22.1. E2E uses a separate localhost port and bypasses machine proxies for readiness checks.
- Review by a separate agent found no actionable high-priority issues. Svelte autofixer reported no issues; optional bind:this refactoring was declined because canvas and Worker share an onMount lifecycle.

## Dependency audit

Final `npm run verify` exited successfully: formatting, ESLint, Steiger, types, 31 unit tests, production build and 10 E2E tests. The live built `/api/palette/sweetie-16` returned HTTP 200 with 16 colors. `npm audit --omit=dev` reported zero vulnerabilities.

Installation audit reported 22 advisories (6 low, 12 moderate, 4 high), including the reference stack's Vite and Steiger/transitive Zod dependencies. npm reported no automatic fix for Vite/Steiger at the selected versions. These are build/development tooling; this migration does not publish a dev server. Recheck available upstream releases before internet deployment. The project is local-only and no remote was connected.
