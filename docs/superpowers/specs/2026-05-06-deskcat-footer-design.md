# Desk Cat Footer — Design Spec

**Date:** 2026-05-06
**Branch:** `desk-cat`
**Status:** Approved for implementation
**Source x-factor spec:** `docs/Master Review/xfactor-desk-companion.md`

## Goal

Add a persistent desk-cat companion to studio-marginalia. A sticky footer holds **6 cat beds**, each with a Pet Cat (1–6) idling at home. Clicking a bed releases that cat to wander the page; clicking the released cat or its bed sends it home. One cat out at a time. State persists across page loads via `localStorage`. Survives Astro view transitions.

## Why

The desk-companion is one of two flagship x-factors for the site (the other is marginalia mode). The validated sandbox at `~/DevSpace/Personal/cat-sandbox/behavior.html` proves the FSM, walking, and theme-toggle reaction feel right. This spec is the contract for moving that work into the real Astro codebase.

## Source artifacts (already validated)

- **Sprite pack:** Pet Cats Pack (LuizMelo, CC0). 6 cats × 12 anims, 50×50 frames, per-anim horizontal strips.
  - Source: `~/DevSpace/Personal/cat-sandbox/Pet Cats Pack/`
- **Furniture:** Mochi pack (ToffeeCraft, free sample). `Furnitures.png` 512×512 contains 4 distinct cat beds (blue, grey, pink, green).
  - Source: `~/DevSpace/Personal/cat-sandbox/CatPackFree/Furnitures.png`
- **Reference behavior playground:** `~/DevSpace/Personal/cat-sandbox/behavior.html` — copy FSM logic, walking engine, sprite player, theme reaction.

## Architecture

### Component
- **`src/components/atmosphere/DeskFooter.astro`** — single self-contained Astro component. Inline `<script>`, no React, no external deps. Lives in `atmosphere/` alongside `Sparkles`, `GlowStage`.
- Mounted in `src/layouts/Base.astro` at body level, alongside `<PhotoLightbox transition:persist />`. Uses `transition:persist` so cats survive Astro View Transitions soft-navigations.

### Asset placement
- **Cat sprites** copied to `public/sprites/cats/Pet Cats Pack/` preserving the `Cat-N/Cat-N-<anim>.png` structure.
- **Bed sprite** extracted from Mochi `Furnitures.png` to `public/sprites/furniture/cat-beds.png` — the 4 bed tiles cropped and packed into a single horizontal strip (4 frames, ~80px each). Use Pillow (already installed at `/tmp/cat-debug-venv/`) to crop. Bed cell positions in source: blue ~(160, 128), grey ~(240, 128), pink ~(160, 224), green ~(240, 224); pixel coords approximate, refine when extracting. Final extracted PNG should be exactly `(80*4) × 80` = 320×80, rendered at 1× scale in DOM.
- **Two additional bed colorways** for beds 5 and 6 achieved via `filter: hue-rotate(45deg) saturate(0.95)` on bed-1 and `filter: hue-rotate(-45deg) saturate(0.95)` on bed-2. Tune the degree values during build until they read as visually distinct from the originals.

### State

Single in-memory module-level state, persisted to `localStorage` under key `sm-deskcat-active`:

```ts
type ActiveCatId = 1 | 2 | 3 | 4 | 5 | 6 | null;
```

- `null` = no cat out, all 6 at home.
- `1..6` = that cat is currently out and wandering.

On Astro view transitions, the persisted DOM survives (`transition:persist`), so in-memory state continues. On hard reload, state restored from `localStorage`.

## Layout

### Footer

- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;`
- Height: ~120px.
- Top border: 1px soft (existing `--border-soft` style); subtle gradient ground line above border.
- Background: faint `--bg` with backdrop-filter blur (matches Nav style).
- Body gets `padding-bottom: 140px` (added inside DeskFooter component as a global style, scoped via attribute).

### Bed row

- Centered horizontal flex row of **6 beds**, each ~80px wide, gap 16px.
- Beds 1–4 use the four Mochi bed colors directly.
- Beds 5 and 6 use bed sprites 1 and 2 with `filter: hue-rotate(<deg>) saturate(0.9)` to produce two additional unique colorways.
- Each bed has its corresponding cat sprite (Pet Cat N) overlaid, displayed at scale 2× (100×100), z-index above bed.

### Out-cat

- Sprite at scale 3× (150×150), `position: fixed; bottom: 12px; z-index: 51;` (above footer beds at z 50, below modals).
- Walks along the full window width, padded 40px from edges.
- Out-cat shares the bottom strip with the footer beds. Z-index ordering means a wandering cat can visually pass *in front of* its (and other) beds. This is intentional — the cat is "on the desk" while beds sit *behind* it.

## Behavior

### At-home FSM (per bed-cat)

Reduced state machine. No walking. Each cat plays an independent randomized cycle:

| State    | Anim file       | Duration                  |
|----------|-----------------|---------------------------|
| `sit`    | Sitting (1f)    | hold 2–6s                 |
| `idle`   | Idle (10f)      | 2–4 loops @ 8fps          |
| `groom1` | Licking 1 (5f)  | 2–4 loops @ 8fps          |
| `groom2` | Licking 2 (5f)  | 1–3 loops @ 8fps          |
| `lay`    | Laying (8f)     | 2–4 loops @ 8fps          |
| `sleep1` | Sleeping1 (1f)  | hold 4–10s                |
| `sleep2` | Sleeping2 (1f)  | hold 3–8s                 |
| `stretch`| Stretching (13f)| 1 loop @ 12fps            |

Transitions favor calm states (sleep persists; stretch wakes). Each cat ticks independently. To reduce CPU, all 6 home cats share a single rAF driver but advance their own state machines.

### Out-cat FSM

Full FSM from validated sandbox (`cat-sandbox/behavior.html`):

| State    | Notes                                          |
|----------|------------------------------------------------|
| `sit`    | hold 1.5–4s                                    |
| `idle`   | 3–6 loops                                      |
| `groom1` | 3–5 loops                                      |
| `groom2` | 2–4 loops                                      |
| `stretch`| 1 loop                                         |
| `walk`   | x-translation 80–220 px @ 60 px/s, sprite cycles in parallel, sprite flips for direction |
| `lay`    | 2–4 loops                                      |
| `sleep1` | hold 4–12s                                     |
| `sleep2` | hold 3–8s                                      |
| `meow`   | 1 loop                                         |

Transitions and weights identical to validated sandbox. Active behaviors prefer `idle` (gentle motion) over pure-static `sit`.

### Interactions

| User action                          | Result                                                                                  |
|--------------------------------------|-----------------------------------------------------------------------------------------|
| Click bed N (no cat out)             | Cat N stretches in bed → walks out → becomes the out-cat. `localStorage` set to N.       |
| Click bed N (cat M ≠ N is out)       | Cat M starts walking back to its bed (parallel). Cat N stretches → walks out. localStorage set to N. |
| Click bed N (cat N is the out-cat)   | Cat N walks back to its bed. localStorage set to `null`.                                |
| Click anywhere on the out-cat        | Same as clicking its bed (sends it home). localStorage set to `null`.                   |
| Theme toggle (candle on/off)         | Out-cat plays `Stretching` reaction (1 loop), then returns to FSM. Home cats ignore.     |

### Restore on load

- Read `sm-deskcat-active` from `localStorage`.
- If `null`: all cats home. No arrival.
- If `N` (1..6):
  - Determine N's bed home position (its center x in viewport).
  - **Arrive from opposite side of screen** — start out-cat off-screen on the side opposite N's home (home in left half → start at `window.innerWidth + catWidth`; home in right half → start at `-catWidth`).
  - Walk to a position roughly center of the side opposite home (e.g. if home is left, end position is `window.innerWidth * 0.65`). Sprite faces direction of travel.
  - On arrival → FSM begins normally.

### Reduced motion

- `prefers-reduced-motion: reduce` → all cats sit in their beds (no anim cycling, no walking, no out-cat). Beds still visible. Click does nothing.

### View Transitions

- Footer is `transition:persist` so the entire DeskFooter survives soft-navigations. In-memory state continues.
- On `astro:before-swap`, no-op (component instance persists).
- On `astro:after-swap`, no-op.

## Visual treatment

### Glow + shadow

Both cats and beds get a tunable theme-aware drop-shadow filter:

```css
.deskcat-sprite, .deskbed {
  filter: drop-shadow(0 0 6px var(--cat-glow))
          drop-shadow(0 2px 3px var(--cat-shadow));
}
```

Theme variables (define in component scoped style, derive from existing site theme tokens where possible):

```css
:root[data-theme="dark"] {
  --cat-glow: rgba(214, 163, 92, 0.32);   /* warm candlelight halo */
  --cat-shadow: rgba(0, 0, 0, 0.45);
}
:root[data-theme="light"] {
  --cat-glow: rgba(255, 245, 220, 0.55);  /* soft sunlit rim */
  --cat-shadow: rgba(40, 30, 20, 0.18);
}
```

Beds use a tighter blur radius (`0 0 3px`) — they're objects, not creatures. Tunable from these vars.

### Footer ground line

Same treatment as sandbox: subtle gradient strip above the top border, themed (warm in dark, cool/neutral in light).

## Out of scope (v1)

- Tina-driven Adopt-a-Cat page (deferred — Tina integration not yet wired).
- Per-page disable hook (`<DeskCat enabled={false}/>`) — all pages get the cat.
- Cat name customization.
- Multiple cats out simultaneously.
- Hover-heading look-at, scroll-milestone peek (intentionally stripped per user direction).
- Laser-pointer / cursor-follow mode (nixed; no compatible anims in Pet Cats Pack).
- `aria-hidden` polish, alt text, full a11y audit beyond `prefers-reduced-motion`.

## Acceptance criteria

A successful build means:

1. Branch `desk-cat` of studio-marginalia builds cleanly with `pnpm dev:astro`.
2. Visiting `http://localhost:4321/` shows the sticky footer with 6 cat beds, each with a Pet Cat playing home anims independently.
3. Clicking any bed releases that cat to wander the page; the cat walks the full viewport width along the bottom edge.
4. Clicking the released cat or its bed sends it back home.
5. Switching active cat by clicking a different bed: out-cat walks home in parallel with new cat releasing.
6. Reloading the page restores the previously-active cat via the opposite-side arrival animation.
7. Toggling the theme (candle) makes the out-cat stretch; home cats ignore.
8. `prefers-reduced-motion: reduce` → all cats sit, no animation.
9. Soft-navigating between site pages does not reset the cat — it continues uninterrupted.
10. Cats and beds have a subtle theme-aware glow/shadow that is visible on both light and dark backgrounds.

## File manifest

Files created:
- `src/components/atmosphere/DeskFooter.astro`
- `public/sprites/cats/Pet Cats Pack/Cat-1/Cat-1-Idle.png` (and 11 more anims × 6 cats = 72 files)
- `public/sprites/furniture/cat-beds.png`
- `docs/superpowers/specs/2026-05-06-deskcat-footer-design.md` (this file)

Files modified:
- `src/layouts/Base.astro` — import + mount `<DeskFooter />` at body level with `transition:persist`.

No other files touched.
