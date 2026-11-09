# hascii Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Move the working image playground to SvelteKit and Svelte ASCII UI with functional parity and local Git history.
**Architecture:** Pure rendering engine and module Worker under shared/lib/renderer; editor orchestration and controls under widgets/editor; thin page and SvelteKit routes. Node server route proxies Lospec only.
**Tech Stack:** Svelte 5, Kit, Node adapter, TypeScript, Vite, Tailwind, ASCII UI 0.2.0, ESLint, Prettier, Steiger, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-11-09-hascii-migration-design.md

## Global Constraints

- Local Git only; user will connect a public remote later. Work in current directory, baseline commit first.
- No feature loss, image upload to server, deployment or standalone editor package.
- Preserve burgundy terminal theme and existing controls. Public UI kit API only.
- Node 24, npm; saved old browser data need not migrate.

## Review Focus

- Rapid changes and image replacement must never display stale results or export them.
- Invalid files and palette responses must recover without losing working controls.
- Empty character sets and flat regions must follow existing fill semantics.
- Worker initialization/destruction must not leak timers or fail under SSR.
- Long palettes and narrow screens must retain keyboard-accessible controls.

## Task 1: Baseline and foundation

- [ ] Commit existing outputs/ascii-lab source, original dist assets and lockfile; exclude disposable artifacts.
- [ ] Create root package/config, src/app.html, routes, static/sample.png, tooling and CI adapted from Dogs.
- [ ] Verify npm installation and SvelteKit sync; commit foundation.

## Task 2: Rendering and palette API

Files: src/shared/lib/renderer/{engine,types,worker,index}.ts; src/shared/lib/palettes/{index,index.test}.ts; src/routes/api/palette/[slug]/+server.ts.
Interface: preserve render(job: Job): Result and Settings, Palette, RGB, Job, Result types from prototype. Export palette validation and slug parsing for route/UI.

- [ ] Write Vitest regression tests for size preservation, palette bounds, opacity independence and flat fill, invalid slug/data. Run against missing target modules to establish failure.
- [ ] Move existing algorithm without semantic rewrite and module Worker; implement validated fixed-upstream Lospec route with timeout.
- [ ] Run tests; compare deterministic baseline outputs; commit.

## Task 3: Svelte editor

Files: src/widgets/editor/{index,model/_,ui/_}; src/pages/playground/{index,ui/*}; src/routes/{+layout,+page}.svelte; src/app/styles/app.css.
Consumes renderer types and module Worker; produces Editor component with all prototype controls and previews.

- [ ] Port defaults, presets and sets; implement lifecycle-safe browser controller, latest-render scheduling and persistence.
- [ ] Use kit Theme, Panel, Button, Field, Slider, Checkbox, Select, Textarea, FileInput; app-owned drop zone and canvas previews.
- [ ] Add Playwright scenarios for modes/settings/upload/export, failures and narrow layout; verify failure before completed UI where feasible.
- [ ] Run Svelte autofixer, check and UI tests; commit.

## Task 4: Release verification

- [ ] Add README, AGENTS kit pointer and migration evidence; remove tracked prototype after parity verification (history retains it).
- [ ] Run format/lint/types/unit/E2E/build, test actual Node build palette route, inspect browser desktop and narrow layout.
- [ ] Independent whole-change review; fix significant findings with regression tests.
- [ ] Commit final changes, leave working app open and report local commits, checks and remaining limitations.
