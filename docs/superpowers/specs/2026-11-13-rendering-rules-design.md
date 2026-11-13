# Rendering rules deepening

Base: `3b28fa1`. Engineering revision: `641402035e2046d72b19d09143a9dcc1815e1174`. The user selected both architecture candidates and authorized research followed by implementation. Routine interface decisions are delegated; this is a behavior-preserving refactor on `codex/rendering-rules`.

## Goal and constraints

One pure module owns shared dithering policy; one pure projection owns mode-specific renderer inputs. Keep all current pixels, labels, visible/disabled controls, defaults, named presets, focus and mobile scrolling behavior. Keep image processing local, math independent of Svelte, flat editable Settings and structured-cloneable jobs. No new algorithms, controls, validation rules, plugins or dependencies.

## Alternatives considered

Three independent designs explored minimal entry points, flexible traversal adapters and the common caller. Exporting only kernels/bias leaves duplicated diffusion mechanism. A complete traversal module introduces storage protocols, rounding policies and per-cell allocations. Selected: a palette-agnostic policy factory with two synchronous storage adapters, one for RGB pixels and one for four quarter-cell samples.

A passive mode metadata catalog leaves whole-Settings dependencies. A generic registered mode program adds unnecessary configuration. Selected: a closed discriminated settings projection for seven modes, narrow renderer options and a page-local presentation adapter. UI labels remain outside math. Visible controls and active mathematical inputs are separate concepts.

## Dithering interface

`createDither({algorithm: string, strength: number, width: number, height: number, addError: (x,y,r,g,b) => void})` returns `biasAt(x,y)` and `diffuse(x,y,target: RGB,chosen: RGB)`.

The implementation hides threshold selection, kernels, clipping and weighting. Keep row-major order, kernel order, `(target[k]-chosen[k])*weight*strength` arithmetic order and individual Float32 writes. Do not normalize edge weights or Atkinson's six eighths. Quantize keeps continuous clamp and direct empty-palette bias; png2xp keeps rounded quadrant samples, linear-light cell residuals and empty-palette suppression. Block shading retains its separate Bayer rank pattern. Unknown quantize algorithms retain the existing no-dither behavior.

## Mode interface

Renderer public entry exports canonical `modeOrder`, derived `RenderMode`, and `selectMode(settings): ActiveMode`. Each discriminated branch has its mode id, domain family and narrow options. Halftone HEX conversion and flattened-name translation move into the projection. ASCII FX/png2xp/glyph-profile stop depending on the whole Settings. Legacy Pixels/ASCII keep their algorithms and normalization locations.

The page-local `modeChoices`, `modePresentation` and `formatRecipe` own labels, mode choices and section grouping. Controls, Editor, ModePicker and EditorModel use this adapter. UI derives current projections reactively. The editable settings object is not replaced on mode changes.

## Verification

Capture current quantize/png2xp bytes at their public renderer interfaces, including fractional inputs, every method/strength, empty palettes, odd dimensions, non-square cells and shading. Capture browser canvas digests for all modes and presets before replacement. Test the new policy through resulting buffer values, and projection invariants through its public interface. Keep existing regressions, production desktop/mobile journeys and complete `npm run verify`. No ADR is needed for these reversible local decisions.
