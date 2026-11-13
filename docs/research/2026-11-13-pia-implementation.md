# Pixelated Image Abstraction: bounded browser adaptation

This is an independent TypeScript implementation informed by the complete primary paper:
[Gerstner et al., Pixelated Image Abstraction (2012)](https://gfx.cs.princeton.edu/pubs/Gerstner_2012_PIA/),
[official small PDF](https://gfx.cs.princeton.edu/pubs/Gerstner_2012_PIA/Gerstner_2012_PIA_small.pdf).
The paper was read on 2026-11-13. No code from the authors' academic prototype was copied.
Shared engineering instructions were pinned by the task controller at
`641402035e2046d72b19d09143a9dcc1815e1174`.

## Retained algorithm structure

Each logical output pixel owns a deformable superpixel in the source. Source colors
are represented in CIELAB (D65). Each refinement pass:

1. Assigns source samples to nearby superpixels using spatial distance and distance
   to the superpixel's **currently assigned palette color**, not its mean color.
2. Updates superpixel means and centers, then applies 40% Laplacian center smoothing
   over the four neighbors in the fixed output-grid topology.
3. Bilaterally filters superpixel means on that output grid to avoid smoothing across
   strong color boundaries.
4. Updates the automatic palette using mass-weighted soft color assignments with a
   decreasing temperature; assigns updated palette colors back to the superpixels.

Consequently the next geometry pass depends on the refined palette, and the next
palette depends on the refined geometry. This is not downsampling followed by a
separate color quantizer. The result is a logical raster enlarged with nearest-neighbor
sampling to the input dimensions. No image processing or color data leaves the browser.

## Deliberate differences from the publication

This is **experimental and paper-inspired**, not a faithful reproduction of the authors'
full converged MCDA implementation or a claim of matching their results.

- The source is deterministically point-sampled at cell-relative positions, using up to
  four samples per logical axis and at most 65,536 processing samples. This avoids an
  initial blur but can miss sub-sample details and alias dense textures.
- Requested columns are clamped to 8–128, colors to 2–32, and iterations to 1–24
  (nonfinite inputs use defaults 64/8/12). Logical dimensions never exceed the source.
  The cell budget is 16,384: effective columns are reduced for large portrait grids,
  and the returned dimensions report that reduction. Rows follow the source aspect
  with integer rounding. Extremely thin images are supported down to one column or
  row; beyond 16,384:1, the cell budget necessarily limits aspect fidelity.
- Initialization uses regular-grid superpixel means and deterministic farthest-point
  palette seeds, starting at the global mean. It does not implement MCDA's paired
  subclusters, principal-component perturbation, critical-temperature splitting, or
  convergence-triggered palette expansion.
- Refinement uses squared Lab/spatial distances with spatial coefficient 25 squared
  in logical-cell coordinates, rather than the paper's sum of Euclidean distances
  and compactness 45. Search is restricted to a 3×3 neighborhood in output topology;
  centers stay within 0.75 cells of their original center to limit folding.
- Palette updates use squared-distance Gibbs weights, learned color masses, a fixed
  cooling schedule `max(1, 64 * 0.5^pass)`, and one update per geometry pass. Final
  labels use nearest palette color. This is a bounded annealing-style adaptation,
  not the paper's full mass-constrained deterministic annealing convergence scheme.
- Bilateral smoothing uses a 3×3 neighborhood, Lab sigma 10 and spatial sigma 1.
  Empty superpixels retain their previous mean and position.
- The paper's optional 1.1 chroma saturation and user importance maps are omitted.
  The incoming image already has application tone correction. Output is opaque;
  the existing image pipeline handles compositing before this renderer.

## Evidence

`pixel-art.test.ts` exercises the public renderer: source-sized nearest-neighbor
output, palette bound, exact constant colors, deterministic output, unchanged input,
1×1 and narrow inputs, aspect metadata, normalized controls, and a dark stripe crossing
cell boundaries. The 3px stripe on a 64px image averages to at least 191 under ordinary
8-column box sampling. The refined result has a dark pixel below 80 while the distant
background stays above 245. A mutation removing palette-color distance from the
geometry step fails that test (darkest output 185); restoring the coupled step passes.
Initial tests were observed failing against the placeholder renderer before implementation.

Measured with the local Node 22.19.0 and `@napi-rs/canvas` on the bundled husky photo at 720×900 (the project's target runtime is Node 24 and is verified separately):

| Request                               | Effective grid | Time (single local run) |
| ------------------------------------- | -------------- | ----------------------- |
| 64 columns, 8 colors, 12 iterations   | 64×80          | 192 ms                  |
| 128 columns, 32 colors, 24 iterations | 114×143        | 614 ms                  |

These are local synchronous math timings, not a cross-device performance guarantee.
The default output was visually inspected for coherent silhouette, eye and flat regions.
Local inspection images and the repeatable benchmark are under ignored `work/pia/`.
