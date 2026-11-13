# Palette picker and editor defaults

User request: make the existing editor defaults useful immediately and let users compare palette colors before choosing. Engineering rules pinned at `IgorLo/igorlo-llm-hub@641402035e2046d72b19d09143a9dcc1815e1174`.

The requested design is concrete; implementation proceeds in the existing feature branch without another approval round. Keep the current editor identity and installed `svelte-ascii-ui@0.2.0`.

## Design

- Keep monochrome Halftone. Start in Pixels as before; reorder buttons to Pixel Art, Pixels, Halftone, Background + ASCII, ASCII, ASCII FX, png2xp.
- Initial palette PICO-8, Atkinson strength 0.1, flat-region fill 0, overlay cell opacity 0.8. Shared controls retain user edits when switching modes. Named presets keep their deliberate visual recipes.
- Bundle the six exact Lospec palettes with author and source URL. No runtime fetch needed to use built-ins.
- Native Select and DropdownMenu accept text-only items in the installed kit. Compose the public Popover and Button snippets for this specialist palette picker; no dependency patches or internal CSS overrides. Each large choice shows its name, color count and equal-area color grid. Use 1–3 rows in a fixed-height preview, including all colors of imported palettes up to 1024. Show the same preview on the closed trigger.
- The kit owns overlay positioning, dismissal and return focus. App-owned choice buttons expose selection with aria-pressed; Tab/Enter and arrow/Home/End navigation work. Keep imported palette persistence and source links.

## Plan and public verification boundaries

- [x] Browser defaults journey: observe mode order, PICO-8, Atkinson 0.1, monochrome, ASCII fill 0 and overlay 0.8. Observe failure, update settings and order, rerun.
- [x] Browser palette journey: choose all six palettes, inspect rendered color cells/count, confirm result/export; keyboard activation and Escape restore focus. Cover a 1024-color imported palette and reload persistence. Observe failure, implement picker and data, rerun.
- [x] Update existing browser tests to operate the public picker, run Svelte analysis, formatting/lint/typecheck/unit tests and production desktop/mobile journeys. Inspect desktop and iPhone screenshots; refresh the local preview.

Review focus: long names, large imported palettes, popup inside mobile Drawer, focus return on Escape/selection, named presets after shared-default changes. Browser tests use existing Playwright seams; renderer mathematics is unchanged.

## Completion evidence

- Red: defaults journey failed on the old mode order; palette journey failed because the visual picker did not exist. Both passed after implementation.
- Node 24: npm run verify passed, 75 unit tests and 43 browser scenarios; 2 desktop-only scenarios skipped on mobile. Svelte analysis, formatting, lint and typecheck clean.
- Visual review: desktop Chromium and iPhone WebKit, open picker and selected 39-color Waldgeist preview; no horizontal overflow. Screenshots in ignored work/palette-preview.
- Focused independent review: no material findings. Local production preview refreshed on port 4175.
