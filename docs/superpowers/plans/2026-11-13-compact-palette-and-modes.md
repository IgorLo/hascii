# Compact palettes and mobile modes

Engineering rules pinned at `641402035e2046d72b19d09143a9dcc1815e1174`. User authorized the specific layout and defaults; continue directly on the current feature branch.

- [x] Fetch remote: hascii main `adb5e5f` already contains UI Kit 0.3.0 and app-owned themed scrolling. Fast-forward with autostash, preserve renderer work, resolve Controls conflict by retaining the new palette picker and the kit's public props. Keep recovery stash and ignored binary patch.
- [x] Repair the existing lockfile peer resolution, clean-install pinned kit 0.3.0. No unrelated upgrades.
- [x] Browser regression: fresh session selects Pixel Art; palette rows show `name · count` with a short preview at the right, under 48px tall; native list scrollbar uses kit styling. Observe failure, implement with S controls and app-owned scroll list, rerun.
- [x] Mobile mode strip: native horizontal scrolling in one row, public kit scrollbar and previous/next buttons whose visibility follows available content. Resize observer updates bounds; keep desktop wrapping. Verify edge buttons, late mode selection and return to Pixel Art.
- [x] Update existing journeys to select Pixels when testing palette/dither controls. Preserve named presets as Pixels recipes despite the new initial mode. Run Svelte analysis and Node 24 verification, inspect desktop/iPhone views, refresh detached preview.

Kit 0.3.0 matches tag v0.3.0 at `f96743ab7ce36cdba4d16453bdbc498a324189dc`. The public `aui-scrollbar` class is opt-in per scroll owner; do not patch kit internals. Latest UI-kit develop has additional work, but npm latest remains 0.3.0, published 2026-11-12. Use the released package.

## Verified outcome

- Node 24.22.3: npm ci succeeded after restoring missing optional TypeScript peers for Steiger; application TypeScript remains 6.0.3.
- npm run verify passed: 75 unit tests, 49 browser scenarios, 5 device-inapplicable scenarios skipped. Chromium desktop/mobile and iPhone WebKit covered. Svelte check: 0 errors/warnings; autofixer: no issues (DOM-only effect and existing canvas bindings retained).
- Default, compact row and mobile strip regressions observed failing before fixes, then passing. Follow-up review count truncation reproduced and fixed with a separate nonshrinking count; existing persistence journeys now explicitly select their intended modes after reload.
- Visual checks confirmed the compact list, all themed scroll owners and strip direction states. Screenshots in ignored work/palette-preview. Detached production preview refreshed at 127.0.0.1:4175; HTTP 200 and browser image processing checked.
- Current base adb5e5f includes the owner's existing scrollbar migration. Working changes preserved; autostash retained for recovery, no new commit or publication.

## Follow-up: overlay mode arrows

The user reported a 44px content jump when arrows appeared or disappeared. Reproduced with a browser geometry regression, then replaced arrow grid columns with absolute overlays over a full-width strip. S-sized kit controls remain; no animation. Android Chromium and iPhone WebKit now keep strip width, origin and content positions stable within each scroll sequence. Existing palette/default/export journeys passed on desktop and mobile; lint and Svelte check clean. Detached preview refreshed and screenshots checked at both ends.
