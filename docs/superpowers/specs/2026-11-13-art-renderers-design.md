# Halftone, blue noise and Pixelated Image Abstraction

User intent: extend the local image-art playground with the selected techniques and enough controls to explore their appearance. The user has authorized implementation and delegated routine integration choices. Shared engineering revision: `641402035e2046d72b19d09143a9dcc1815e1174`.

## Integration choices

Add two renderer modes, `halftone` and `pixel-art`, alongside the existing modes. Put two-ink printing inside Halftone rather than adding another top-level mode. Add `blue-noise` to the existing dither selector. Keep the incumbent UI kit, theme and mobile drawer; the fourth control group adapts to the active renderer. Separate top-level modes for every ink combination would duplicate controls; an all-purpose filter stack would add complexity outside the request.

## Halftone

Clustered-dot screens with round, diamond and line spots; adjustable period and angle. Modes: monochrome, color CMYK approximation, and two custom overlapping inks. Expose paper and ink colors, second-screen angle, ink balance and horizontal/vertical misregistration. Defaults: period 12 px, first angle 45 degrees, round spots, monochrome dark ink on light paper; two-ink defaults blue/pink with zero offset. Compute a calibrated clustered threshold screen so coverage progresses from clean paper to full ink, including deep shadows. CMYK/Multiply and two-ink separation are visual approximations, not physical print proofs. Existing palette/dither controls do not apply to this renderer and must say so.

## Blue noise

Use a small precomputed, tileable CC0 void-and-cluster threshold mask from Christoph Peters' author distribution. Bundle it locally; no runtime requests or image uploads. Deterministic output, strength zero equivalent to no dither, exact existing palette entries after quantization. Keep all old algorithms intact.

## Pixel Art

Independent TypeScript implementation based on Gerstner et al. 2012: spatial/color superpixels coupled with automatic palette optimization, not just resizing plus quantization. Do not copy restricted academic prototype source. Dedicated controls: logical columns (default 64, range 8–128), automatic color count (default 8, range 2–32), bounded refinement quality. Preserve aspect ratio, return a nearest-neighbor enlargement at the working image size for PNG export. Auto palette is internal to this method; disable external palettes/dithering with an explanation. Mark as experimental and document practical bounds/deviations from the publication. Use bounded local sampling and iterations so switching modes remains usable.

## Contracts and acceptance

- All image processing remains browser-local in pure renderer modules and Worker. Server still handles palette identifiers only.
- Existing modes, imports, PNG export, presets and mobile controls remain usable.
- Controls show only relevant renderer parameters, with accessible names and existing Svelte ASCII UI public components.
- Renderer tests exercise tone endpoints, approximate coverage, two-ink overlap/offset, bounded PIA palette and grids, structured detail, determinism and degenerate images.
- Browser acceptance covers new modes/settings and PNG export on desktop Chromium and narrow touch WebKit. Check for horizontal overflow and runtime errors.
- Run installed Svelte analysis, type/lint checks, Vitest and relevant production E2E journeys. No dependency upgrades or publication.

## Open empirical questions

PIA quality and runtime depend on input and grid size; evaluate the actual implementation on the bundled photo and small synthetic features. Default parameter choices are implementation decisions and remain adjustable. No additional artistic families are included.
