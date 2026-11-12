# Asciilands renderer and reusable image conversion

Investigated 2026-11-12. Shared engineering revision: `IgorLo/igorlo-llm-hub@641402035e2046d72b19d09143a9dcc1815e1174`. No production renderer or dependency changes were made for this investigation.

## Findings

The game is **Asciilands**, at [asciilands.io](https://asciilands.io/). Its official [credits](https://asciilands.io/credits) identify the rendering technology as derived from **Asciicker**, by **gumix / msokalski**, and explicitly say the game contains substantial changes. The reusable upstream source is [msokalski/asciicker](https://github.com/msokalski/asciicker), a custom C++ game renderer licensed under MIT. It is not a TypeScript image-conversion package.

For a ready browser dependency that fits the desired **glyph shape + independent foreground and cell background**, **`@ascii-fx/core@0.9.1`** is a closer match to this application's photo workflow. Its actual published package was downloaded and run against the local husky fixture. It is unrelated to Asciicker. Its limited-palette support has an important quality limitation: colors are quantized **after** glyph selection, without refitting glyphs against the chosen palette.

## Evidence and exact revisions

| Source                                                                                                                        | Revision inspected                                                                 | What it establishes                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Asciicker](https://github.com/msokalski/asciicker/tree/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635)                             | `8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635`, current `master`, dated 2024-01-08     | Open-source renderer, converter and browser build. Resolved with `git ls-remote`, then verified in a temporary clone.        |
| [Asciilands credits](https://asciilands.io/credits) and [third-party notices](https://asciilands.io/THIRD_PARTY_LICENSES.txt) | Live documents, accessed 2026-11-12                                                | First-party confirmation of Asciicker ancestry and separate game modifications.                                              |
| [Asciilands public game page](https://asciilands.io/play/)                                                                    | Client asset query `v=45cabf86fb9f`                                                | Current font assets, square cell sizing, WASM entry and GPU scripts.                                                         |
| [Current GPU glyph pass](https://asciilands.io/play/browserlands/gpu-glyphs.js?v=45cabf86fb9f)                                | Same asset query; fetched with `Invoke-WebRequest`                                 | Current game still fits land cells from 2×2 samples and material/auto-material tables, with fork-specific extensions.        |
| [ASCII FX](https://github.com/Amir-Abushanab/ascii-fx/tree/86b1157370592ae50443bf2ed7d050382cdaeea8)                          | `86b1157370592ae50443bf2ed7d050382cdaeea8`, current `main`                         | TypeScript source, algorithm specification, APIs and fixture font provenance.                                                |
| [Published core 0.9.1 metadata](https://registry.npmjs.org/@ascii-fx%2fcore/0.9.1)                                            | Tarball SHA-256 `f5059dda461350c8d80ee14fc423ffc47d79327d2ec22962e0b9e5a2b318571e` | Actual exported JavaScript/types/license, zero runtime dependencies, Node >=22. npm search results showing 0.8.0 were stale. |

The fetched Asciilands HTML SHA-256 was `72c67b186925bac7188ec72d0a522c86796ef8f0e51b32d4be0f53625311a17f`; the GPU glyph script SHA-256 was `88fc8aa628aa976cb41d72da6e76b67ea90c5f79ebaacb890ebfece7fe5a45f1`. These are hashes of UTF-8 files saved during inspection, not immutable upstream release identifiers. The asset query is also not a verified Git commit. A complete public, separately licensed source release of the current Asciilands fork was not established.

## What Asciicker actually does

The entry point accepts terrain, world objects, camera, lighting and a target ANSI cell buffer, rather than a photograph. Its rasterizer projects triangles and depth-tests scene samples. The doubled sample buffer has dimensions `2*width+4` by `2*height+4`: four samples per output cell, plus borders. Each output [AnsiCell](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.h#L10) has foreground, background and glyph indices. See [Render and sample allocation](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.cpp#L2661).

There is no single universal glyph search in this renderer:

- **Terrain:** authored `Material.shade[4][16]` tables store a glyph and two RGB colors for elevation/lighting combinations. Terrain colors are combined across samples; height/outline rules can replace the glyph. These tables can be painted in the editor. See [material types](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.h#L17) and [cell resolution](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.cpp#L3294).
- **Colored meshes / auto-materials:** compares horizontal and vertical two-region approximation errors. A clear winner produces an upper or right half-block (`0xDF` / `0xDE`) with separate colors. Similar errors or equal selected colors fall back to an RGB555 lookup table containing background, foreground and glyph. The table uses the small density vocabulary `" ..::%"` and pairs of nearby colors in a six-level RGB cube. See [table construction](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.cpp#L576) and [split selection](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.cpp#L3512).
- **Sprites and overlays:** already have authored glyphs/colors, with their own depth/transparency composition rules. See [sprite composition](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/render.cpp#L1970).

The browser build compiles the C++ engine through Emscripten and uses JavaScript/WebGL to display the cell buffer against a CP437 glyph atlas. It is not implemented entirely in JavaScript. See [build-web.sh](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/build-web.sh#L85) and [glyph display shader](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/game_web.html#L112).

The current [Asciilands GPU glyph script](https://asciilands.io/play/browserlands/gpu-glyphs.js?v=45cabf86fb9f) preserves the material tables, 2×2 samples, horizontal/vertical error comparison and `autoMat` fallback. Its header says it repeats the native land-cell fitting path; water, haze and cells read by sprites still use the CPU. The fork adds detail/forced glyphs and, for some terrain paths, separate truecolor foreground/background textures. Therefore the whole current game cannot accurately be described as either an unchanged CPU renderer or universally limited to 216 colors.

## Existing bitmap converter in the same source

Upstream already contains [png2xp/png2xp.cpp](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp). This is the directly relevant photo/image path, separate from the 3D renderer.

Its [Do function](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L356) consumes each 2×2 source block and considers:

1. A 25% or 50% shade glyph, with a selected foreground/background palette pair.
2. A vertical half-block with independently chosen half colors.
3. A horizontal half-block with independently chosen half colors.

The winning candidate minimizes the sum of weighted RGB absolute errors, `2*abs(dR) + 3*abs(dG) + abs(dB)`. Averages and color mixing use sRGB decode/encode tables to operate in linear light. If both selected colors coincide, it emits a solid block. Its effective glyph vocabulary is CP437 `176,177,219,220,221` — `░▒█▄▌`, rather than an arbitrary font-shape matcher. Sources: [gamma tables](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L103), [active error metric](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L214), [candidate selection](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L458).

The CLI uses a fixed 216-color palette, a precomputed `.plt` table, even input dimensions, and emits `.xp` cells at half the input width/height. Its diffusion code is labeled Atkinson and propagates error to neighboring cells. It does not accept an arbitrary palette as a ready public API. The [native build](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/build.sh) compiles C++ with `rgba8.cpp`, `tinfl.c`, `upng.c`, and pthread support; no browser wrapper or npm package was found in upstream. See [CLI and palette generation](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L533) and [conversion loop/diffusion](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/png2xp/png2xp.cpp#L729).

**Reuse assessment:** a small TypeScript port of this converter's cell fitting would be feasible, or its conversion core could be wrapped as WASM. That is new engineering, not installing the game's renderer. Porting the complete game engine would bring terrain/world/material/game dependencies that this photo application does not need. The upstream [MIT license](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/LICENSE) requires retaining its notice for copied substantial code. Bundled PNG decoder components retain their own notices.

## Cell aspect and mobile support

**Both inspected games use square cells.** Upstream loads `cp437_NxN.png` atlases in [AsciickerBoot](https://github.com/msokalski/asciicker/blob/8ff75d0c5a8d2745a8ad6a8a841dd31a46e81635/game_web.html#L1211). The current [Asciilands shell](https://asciilands.io/play/) loads the same square font family and explicitly sets `ak_cell_width = ak_cell_height` in `Resize`. Tall letters inside a glyph image do not imply tall grid cells.

For rectangular cells, preserve the photograph's aspect using the measured cell dimensions: `rows = round(sourceHeight * columns * cellWidth / (sourceWidth * cellHeight))`. ASCII FX implements this in [deriveGrid](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/core/src/grid.ts). Hascii already has a rectangular aspect factor; the proposed improvement is chiefly fitting two colors per cell and spatial glyph structure.

The current official [Asciilands FAQ](https://asciilands.io/#faq) says computers, phones and tablets are supported, with touch controls. Its [device-access.js](https://asciilands.io/play/browserlands/device-access.js?v=45cabf86fb9f) defaults phones/tablets to touch mode; explicitly disabling it can redirect them to a desktop-information page. Older third-party desktop-only descriptions are stale. No phone performance benchmark was run here.

## Ready TypeScript candidate: @ascii-fx/core 0.9.1

The [actual types/source](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/core/src/types.ts) and published package confirm:

- Raw local RGBA input, typed cell fields, no production runtime dependencies, ESM exports, MIT license.
- `color: 'mono'`: fixed foreground and background; `'foreground'`: fitted foreground with fixed backdrop; `'full'`: fitted foreground **and** background for each cell. The default is `'mono'`, so full-color behavior must be requested.
- `matchFrame` produces an `AsciiFrame`; `getCell(x,y)` exposes the glyph and RGBA colors. `compositeFrame` paints it into a plain RGBA buffer without requiring DOM APIs. HTML, SVG, ANSI and text exports are separate functions, not frame methods.
- `createAsciiProfile({fontFamily, fontWeight, charset, characters})` can rasterize a loaded browser font at runtime. A precompiled profile avoids startup font measurement and makes font matching reproducible. See [runtime profile implementation](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/core/src/runtimeProfile.ts) and [compiler recipe](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/compiler/README.md).

Its structural matcher reduces the source to 8×8 samples per cell. It compares binary glyph masks to a source classification, shortlists **eight** candidates by Hamming distance, fits foreground/background as the means of the candidate's ink/off sample sets, and reranks by RGB squared reconstruction error. Flat regions in full-color mode use a blank glyph with foreground/background both equal to the mean. This is shape-sensitive two-color fitting, but **not exhaustive global glyph optimization**: the README's broad optimality wording exceeds the top-eight search visible in [match.ts](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/core/src/match.ts#L323) and the [algorithm specification](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/ALGORITHM.md).

`quantizeFrame` accepts **1–256 colors**, and `none`, `bayer2`, `bayer4`, or `bayer8` dithering. It preserves glyph IDs and snaps fitted color planes afterward. This is not joint palette-constrained glyph/foreground/background optimization, and it cannot directly cover hascii's full accepted palette size of 1024 colors. Antialiased glyph edges also blend those selected colors in raster output. See [palette implementation](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/core/src/palette.ts).

Optional [`@ascii-fx/gpu`](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/packages/gpu/README.md) adds WebGPU matching and CPU/worker fallback, with WebGL2 or Canvas2D painting. Core alone is sufficient for a still-image proof of concept and does not require WebGPU. No mobile browser validation of this package was performed.

### Runnable bitmap recipe

The ready [default.asciip fixture](https://raw.githubusercontent.com/Amir-Abushanab/ascii-fx/86b1157370592ae50443bf2ed7d050382cdaeea8/fixtures/profiles/default.asciip) is 820,972 bytes, SHA-256 `bfb44f0ee2f79a6b6ca238b345fae60b3f9491e9c576e87b98e80608f37c68d3`. It contains 95 ASCII glyphs, Geist Mono, and cell metrics 30×64. Its [fixture font provenance](https://github.com/Amir-Abushanab/ascii-fx/blob/86b1157370592ae50443bf2ed7d050382cdaeea8/fixtures/fonts/README.md) points to OFL 1.1; preserve the font notice if distributing it.

```ts
import {
  compositeFrame,
  decodeProfile,
  frameToHTML,
  matchFrame,
  quantizeFrame,
} from '@ascii-fx/core';

const profile = decodeProfile(profileBytes); // Uint8Array from local .asciip
const frame = matchFrame(
  { width, height, data: rgbaBytes },
  { profile, columns: 100, color: 'full', alpha: 'ignore' },
);
const neon = quantizeFrame(frame, {
  colors: [
    [12, 6, 27],
    [250, 50, 126],
    [55, 203, 211],
    [209, 249, 252],
  ],
  dither: 'bayer4',
});
const pixels = compositeFrame(neon); // {width, height, data} RGBA
const html = frameToHTML(neon);
const cell = frame.getCell(0, 0); // glyph, foreground, background, flags
```

For a browser font instead of a downloaded profile: `await createAsciiProfile({fontFamily: 'YourLoadedMonospaceFont', charset: 'ascii'})`. `subsetProfile` takes actual glyph strings/arrays, not a built-in charset name; use `resolveCharset('ascii').glyphs` if resolving a named set first.

### Local verification and artifacts

The published tarball was unpacked in temporary storage; no install scripts were run and `package.json`/lockfiles were not edited. The husky test used `static/sample-husky.png`, 100 columns, 59 rows, 95 glyphs. A desktop Node run measured about 75 ms for full-color matching; this is a single local check, not a browser/mobile performance claim. The rendered RGBA image was 3000×3776 because the fixture atlas has large native glyph cells.

Ignored local outputs:

- `work/asciilands-research/ascii-fx-comparison.png`: original photo, ASCII FX full color, ASCII FX Neon ink 4 + Bayer4. Both converted panels are **ASCII FX**, not the existing hascii algorithm and not literal Asciicker output.
- `work/asciilands-research/ascii-fx-full.png`, `ascii-fx-foreground.png`, `ascii-fx-neon.png`: full-size outputs, plus HTML/TXT exports where generated.
- `work/asciilands-research/run-example.mjs`: the executed Node recipe, using the unpacked temporary core package and the repo's already-installed `@napi-rs/canvas`. It retains local absolute paths and requires that temporary directory to remain available.

The full-color result was clearly more legible than the fixed-background foreground-only result. The neon result confirms four distinct colors in the **cell foreground/background planes** and unchanged glyph IDs, but develops hard regions and Bayer checkerboard texture. For hascii's palette-focused output, compare it against a matcher that searches glyphs and allowed color pairs together before adopting it.

## Other viable reference

[`chafa-wasm`](https://github.com/hectorm/chafa-wasm/tree/022706bf06d316d284b36f16ca34e817b587c32f) is a real browser/Node WebAssembly module with TypeScript declarations and high-/low-level libchafa bindings; its documented options include `fontRatio`, symbol selection, truecolor/palette modes and `fgOnly`. It is **LGPL-3.0**, unlike the MIT candidates. It is not what the Asciilands credits identify. It was not executed in this investigation, so no comparative quality/performance claim is made.

## Recommendation

Keep Asciicker as the correctly identified visual/technical reference. For a faithful small block-art path, port the separately isolated `png2xp` cell-fitting algorithm. For a ready general-font photo experiment, evaluate pinned `@ascii-fx/core@0.9.1` behind a pure renderer boundary, using full two-color cells and the actual chosen font profile. Before adopting its palette mode, test joint palette-constrained fitting against its post-quantization output on the same photos and palette sizes. Keep processing browser-local and leave UI state outside the math, following the project contracts.
