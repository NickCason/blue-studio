# Desk Cat Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sticky footer to studio-marginalia containing 6 cat beds. Each bed has a Pet Cat (1–6) idling at home. Click any bed to release that cat to wander the page; click again (or click the cat) to send it home. State persists via localStorage, survives Astro view transitions, and on reload the saved cat arrives from the opposite side of the screen. Theme toggle makes the out-cat stretch. Subtle theme-aware glow and shadow on cats and beds.

**Architecture:** Single self-contained Astro component (`DeskFooter.astro`) mounted in `Base.astro` at body level with `transition:persist`. Inline `<script>` (no React, no extra deps) ports the validated FSM and sprite engine from `~/DevSpace/Personal/cat-sandbox/behavior.html`. Cat sprites and one extracted bed sprite live in `public/sprites/`. Theme integration uses the existing `data-theme` attribute on `<html>` and the existing site CSS variables.

**Tech Stack:** Astro 5 + TypeScript inside `<script>`, vanilla DOM, CSS custom properties, `localStorage`, `requestAnimationFrame`, `MutationObserver`.

**Reference:** The validated source-of-truth for FSM, sprite engine, walking, and theme reaction logic lives in `~/DevSpace/Personal/cat-sandbox/behavior.html`. Port logic from there — don't redesign.

**Spec:** `docs/superpowers/specs/2026-05-06-deskcat-footer-design.md`

---

## Task 1: Extract and copy assets

**Files:**
- Create: `public/sprites/cats/Pet Cats Pack/Cat-1/Cat-1-Idle.png` (and 71 more — 12 anims × 6 cats)
- Create: `public/sprites/furniture/cat-beds.png`
- Create (temp): `/tmp/extract-beds.py`

The validated cat sandbox at `~/DevSpace/Personal/cat-sandbox/Pet Cats Pack/` has 6 cat folders (`Cat-1/` through `Cat-6/`), each with 12 PNG animation strips at 50×50 frame size. Folder also contains `Meow-VFX/` which is unused.

The Mochi furniture sheet at `~/DevSpace/Personal/cat-sandbox/CatPackFree/Furnitures.png` is 512×512 with 4 cat beds visible. Tile size 80×80. Approximate bed cell positions in source (top-left of 80×80 cell):
- Blue bed:  `(160, 128)`
- Grey bed:  `(240, 128)`
- Pink bed:  `(160, 224)`
- Green bed: `(240, 224)`

Refine these coords by inspection if needed — the goal is a clean 320×80 horizontal strip of 4 distinct bed sprites.

- [ ] **Step 1: Copy cat sprite folders into public/**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
mkdir -p "public/sprites/cats/Pet Cats Pack"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-1" "public/sprites/cats/Pet Cats Pack/"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-2" "public/sprites/cats/Pet Cats Pack/"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-3" "public/sprites/cats/Pet Cats Pack/"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-4" "public/sprites/cats/Pet Cats Pack/"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-5" "public/sprites/cats/Pet Cats Pack/"
cp -R "/Users/nickcason/DevSpace/Personal/cat-sandbox/Pet Cats Pack/Cat-6" "public/sprites/cats/Pet Cats Pack/"
ls "public/sprites/cats/Pet Cats Pack/" | wc -l
```

Expected: `6` (six cat folders).

- [ ] **Step 2: Verify cat asset count**

```bash
find "public/sprites/cats/Pet Cats Pack" -name "*.png" | wc -l
```

Expected: `71` (Cat-3 is missing `Itch.png`; all others have 12 each → 5×12 + 11 = 71).

- [ ] **Step 3: Write bed extraction script**

Create `/tmp/extract-beds.py`:

```python
#!/usr/bin/env python3
"""Extract 4 cat bed tiles from Mochi Furnitures.png into a single 320x80 horizontal strip."""
from PIL import Image
import os

src = Image.open("/Users/nickcason/DevSpace/Personal/cat-sandbox/CatPackFree/Furnitures.png")
print(f"Source: {src.size}")

# Bed cell top-left coords (refine if visual inspection shows offset)
beds = [
    (160, 128),  # blue
    (240, 128),  # grey
    (160, 224),  # pink
    (240, 224),  # green
]
TILE = 80

out = Image.new("RGBA", (TILE * 4, TILE), (0, 0, 0, 0))
for i, (x, y) in enumerate(beds):
    cell = src.crop((x, y, x + TILE, y + TILE))
    out.paste(cell, (i * TILE, 0))

out_path = "/Users/nickcason/DevSpace/Personal/studio-marginalia/public/sprites/furniture/cat-beds.png"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
out.save(out_path)
print(f"Saved: {out_path} ({out.size})")
```

- [ ] **Step 4: Run extraction**

```bash
/tmp/cat-debug-venv/bin/python3 /tmp/extract-beds.py
```

If `/tmp/cat-debug-venv/` no longer exists, recreate it:

```bash
python3 -m venv /tmp/cat-debug-venv && /tmp/cat-debug-venv/bin/pip install -q Pillow
```

Expected output: `Saved: ... (320, 80)`.

- [ ] **Step 5: Eyeball verification**

```bash
sips -g pixelWidth -g pixelHeight /Users/nickcason/DevSpace/Personal/studio-marginalia/public/sprites/furniture/cat-beds.png
```

Expected: `pixelWidth: 320`, `pixelHeight: 80`. Open the PNG to confirm 4 distinct beds are visible. If a bed appears clipped, adjust the coords in `/tmp/extract-beds.py` and re-run.

- [ ] **Step 6: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add "public/sprites/cats/Pet Cats Pack" "public/sprites/furniture/cat-beds.png"
git commit -m "$(cat <<'EOF'
feat(deskcat): import Pet Cats Pack sprites and extract Mochi cat beds

Copies the 6-cat × 12-anim Pet Cats Pack sprite set into public/ for
runtime serving, and extracts the 4 cat bed tiles from the Mochi
furniture sheet into a single 320x80 horizontal strip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create DeskFooter component skeleton + mount in Base

**Files:**
- Create: `src/components/atmosphere/DeskFooter.astro`
- Modify: `src/layouts/Base.astro` (add import + mount with `transition:persist`)

Build the static visual shell first — footer, ground line, 6 bed slots in a row, body padding-bottom — without any cat behavior. Verify it renders correctly before adding logic.

- [ ] **Step 1: Write DeskFooter.astro skeleton**

Create `src/components/atmosphere/DeskFooter.astro`:

```astro
---
// DeskFooter — sticky footer with 6 cat beds + persistent desk-companion cat.
// Spec: docs/superpowers/specs/2026-05-06-deskcat-footer-design.md
---

<aside id="deskcat-footer" class="deskcat-footer" aria-hidden="true">
  <div class="deskcat-ground"></div>
  <div class="deskcat-row">
    {[1, 2, 3, 4, 5, 6].map((n) => (
      <div class="deskcat-slot" data-cat-id={n}>
        <div class="deskcat-bed" data-bed-variant={n}></div>
        <div class="deskcat-home-sprite" data-cat-id={n}></div>
      </div>
    ))}
  </div>
  <div class="deskcat-out-host" id="deskcat-out-host" aria-hidden="true">
    <div class="deskcat-out-sprite" id="deskcat-out-sprite"></div>
  </div>
</aside>

<style is:global>
  body { padding-bottom: 140px; }
</style>

<style>
  .deskcat-footer {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    height: 120px;
    z-index: 50;
    pointer-events: none;          /* enable per-element below */
    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.20) 100%);
    border-top: 1px solid var(--border-soft, rgba(255,255,255,0.08));
    backdrop-filter: blur(2px);
  }
  .deskcat-ground {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 12px;
    background: linear-gradient(180deg, rgba(214,163,92,0.10) 0%, rgba(214,163,92,0.02) 100%);
    border-top: 1px solid rgba(214,163,92,0.18);
    pointer-events: none;
  }
  .deskcat-row {
    position: relative;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: end;
    gap: 16px;
    padding: 0 24px 12px;
  }
  .deskcat-slot {
    position: relative;
    width: 80px;
    height: 80px;
    pointer-events: auto;
    cursor: pointer;
  }
  .deskcat-bed {
    position: absolute;
    inset: 0;
    background-image: url('/sprites/furniture/cat-beds.png');
    background-repeat: no-repeat;
    background-size: 320px 80px;
    image-rendering: pixelated;
  }
  .deskcat-bed[data-bed-variant="1"] { background-position:    0px 0; }
  .deskcat-bed[data-bed-variant="2"] { background-position:  -80px 0; }
  .deskcat-bed[data-bed-variant="3"] { background-position: -160px 0; }
  .deskcat-bed[data-bed-variant="4"] { background-position: -240px 0; }
  .deskcat-bed[data-bed-variant="5"] { background-position:    0px 0; filter: hue-rotate(45deg) saturate(0.95); }
  .deskcat-bed[data-bed-variant="6"] { background-position:  -80px 0; filter: hue-rotate(-45deg) saturate(0.95); }
  .deskcat-home-sprite {
    position: absolute;
    left: 50%; bottom: 18px;
    width: 100px; height: 100px;
    transform: translateX(-50%);
    image-rendering: pixelated;
    background-repeat: no-repeat;
  }
  .deskcat-out-host {
    position: fixed;
    bottom: 12px;
    z-index: 51;
    pointer-events: auto;
    cursor: pointer;
    display: none;
    will-change: left;
  }
  .deskcat-out-sprite {
    width: 150px; height: 150px;
    image-rendering: pixelated;
    background-repeat: no-repeat;
    transform-origin: center bottom;
  }
  .deskcat-out-sprite.flipped { transform: scaleX(-1); }
</style>
```

- [ ] **Step 2: Read existing Base.astro layout to confirm mount position**

Run: `cat /Users/nickcason/DevSpace/Personal/studio-marginalia/src/layouts/Base.astro | head -30`

Confirm `PhotoLightbox transition:persist` is present at body level — that's the pattern to copy.

- [ ] **Step 3: Mount DeskFooter in Base.astro**

In `src/layouts/Base.astro`, add the import alongside the other component imports:

```astro
import DeskFooter from '~/components/atmosphere/DeskFooter.astro';
```

Then add the mount inside `<body>`, immediately after `<PhotoLightbox transition:persist />`:

```astro
<DeskFooter transition:persist />
```

- [ ] **Step 4: Verify in browser**

Dev server is already running on http://localhost:4321/ (started at the parent session). Open it; the home page should now show:
- A sticky footer at the bottom with a faint top border + ground line
- 6 cat beds in a centered row (4 distinct colors + 2 hue-rotated variants of bed 1 and 2)
- No cats on the beds yet (sprite rendering comes next task)
- Body content has 140px bottom padding (no overlap)

If beds render incorrectly (wrong color, missing, clipped), the issue is in `cat-beds.png` extraction (Task 1) — verify the PNG visually first.

- [ ] **Step 5: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add src/components/atmosphere/DeskFooter.astro src/layouts/Base.astro
git commit -m "$(cat <<'EOF'
feat(deskcat): add DeskFooter skeleton with 6 bed row

Footer is fixed-positioned at viewport bottom with a ground-line
treatment matching the sandbox aesthetic. Beds 1-4 render the 4
distinct Mochi tiles directly; beds 5-6 hue-rotate beds 1-2.
Mounted in Base.astro with transition:persist so it survives
view transitions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Bed cats — sprite player + at-home FSM

**Files:**
- Modify: `src/components/atmosphere/DeskFooter.astro` (add `<script>` block)

Port the sprite player from the sandbox, then implement a reduced "at-home" FSM that ticks each of the 6 bed cats independently.

Reference: `~/DevSpace/Personal/cat-sandbox/behavior.html` lines ~340–400 (`playAnim`), ~450–510 (`enterState`/`advance`), ~310–320 (TRANSITIONS). The at-home FSM is a SUBSET (no walk).

- [ ] **Step 1: Add script with sprite player and home FSM**

Append this `<script>` block to the end of `DeskFooter.astro` (before any closing tags — Astro components can have one `<script>`):

```astro
<script>
  // ============================================================
  // Pet Cats Pack — animation catalog
  // ============================================================
  const FRAME = 50;
  const HOME_SCALE = 2;
  const OUT_SCALE = 3;

  type AnimName = 'Sitting' | 'Idle' | 'Licking 1' | 'Licking 2' | 'Stretching'
                | 'Walk' | 'Laying' | 'Sleeping1' | 'Sleeping2' | 'Meow';

  const ANIMS: Record<AnimName, { frames: number; fps: number }> = {
    'Sitting':    { frames: 1,  fps: 1  },
    'Idle':       { frames: 10, fps: 8  },
    'Licking 1':  { frames: 5,  fps: 8  },
    'Licking 2':  { frames: 5,  fps: 8  },
    'Stretching': { frames: 13, fps: 12 },
    'Walk':       { frames: 8,  fps: 10 },
    'Laying':     { frames: 8,  fps: 8  },
    'Sleeping1':  { frames: 1,  fps: 1  },
    'Sleeping2':  { frames: 1,  fps: 1  },
    'Meow':       { frames: 4,  fps: 6  },
  };

  function animPath(catN: number, anim: AnimName): string {
    return `/sprites/cats/Pet%20Cats%20Pack/Cat-${catN}/Cat-${catN}-${encodeURIComponent(anim)}.png`;
  }

  function rand(min: number, max: number): number { return min + Math.random() * (max - min); }
  function randInt(min: number, max: number): number { return Math.floor(rand(min, max + 1)); }

  function pickWeighted<K extends string>(table: Record<K, number>): K {
    const entries = Object.entries(table) as [K, number][];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [name, w] of entries) {
      r -= w;
      if (r <= 0) return name;
    }
    return entries[0][0];
  }

  // ============================================================
  // Sprite player — paints one anim at a given scale into a div
  // ============================================================
  type StepDef = { loops?: number; holdMs?: number };

  function makeSpritePlayer(el: HTMLElement, scale: number) {
    el.style.width = `${FRAME * scale}px`;
    el.style.height = `${FRAME * scale}px`;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSrc: string | null = null;

    function cancel() { if (timer) { clearTimeout(timer); timer = null; } }

    function play(catN: number, anim: AnimName, opts: StepDef, onDone?: () => void) {
      cancel();
      const meta = ANIMS[anim];
      const src = animPath(catN, anim);
      if (src !== lastSrc) {
        el.style.backgroundImage = `url("${src}")`;
        el.style.backgroundSize = `${meta.frames * FRAME * scale}px ${FRAME * scale}px`;
        lastSrc = src;
      }
      const fps = meta.fps;

      if (meta.frames === 1) {
        el.style.backgroundPosition = `0 0`;
        if (opts.holdMs && onDone) timer = setTimeout(onDone, opts.holdMs);
        else if (onDone) onDone();
        return;
      }

      const total = meta.frames * (opts.loops || 1);
      let frame = 0;
      function tick() {
        const col = frame % meta.frames;
        el.style.backgroundPosition = `${-col * FRAME * scale}px 0px`;
        frame++;
        if (frame >= total) { if (onDone) onDone(); return; }
        timer = setTimeout(tick, 1000 / fps);
      }
      tick();
    }

    return { play, cancel };
  }

  // ============================================================
  // At-home FSM — reduced (no walking)
  // ============================================================
  type HomeState = 'sit' | 'idle' | 'groom1' | 'groom2' | 'lay' | 'sleep1' | 'sleep2' | 'stretch';

  const HOME_STATES: Record<HomeState, { anim: AnimName; hold?: [number, number]; loops?: [number, number] | number }> = {
    sit:     { anim: 'Sitting',    hold: [2000, 6000] },
    idle:    { anim: 'Idle',       loops: [2, 4] },
    groom1:  { anim: 'Licking 1',  loops: [2, 4] },
    groom2:  { anim: 'Licking 2',  loops: [1, 3] },
    lay:     { anim: 'Laying',     loops: [2, 4] },
    sleep1:  { anim: 'Sleeping1',  hold: [4000, 10000] },
    sleep2:  { anim: 'Sleeping2',  hold: [3000, 8000] },
    stretch: { anim: 'Stretching', loops: 1 },
  };

  const HOME_TRANSITIONS: Record<HomeState, Partial<Record<HomeState, number>>> = {
    sit:     { idle: 4, groom1: 2, groom2: 2, lay: 2, stretch: 1 },
    idle:    { sit: 2, idle: 1, groom1: 2, groom2: 1, lay: 1 },
    groom1:  { idle: 3, groom2: 2, sit: 1 },
    groom2:  { idle: 3, groom1: 1, sit: 1 },
    lay:     { sleep1: 5, lay: 1, sit: 1 },
    sleep1:  { sleep2: 4, lay: 2, sit: 1 },
    sleep2:  { sleep1: 3, stretch: 2 },
    stretch: { sit: 3, idle: 2, lay: 1 },
  };

  function startHomeCat(catN: number, hostEl: HTMLElement) {
    const player = makeSpritePlayer(hostEl, HOME_SCALE);
    let state: HomeState = 'sit';

    function enter(name: HomeState) {
      state = name;
      const def = HOME_STATES[name];
      if (def.hold) {
        const ms = rand(def.hold[0], def.hold[1]);
        player.play(catN, def.anim, { holdMs: ms }, advance);
      } else if (def.loops) {
        const loops = Array.isArray(def.loops) ? randInt(def.loops[0], def.loops[1]) : def.loops;
        player.play(catN, def.anim, { loops }, advance);
      }
    }
    function advance() {
      const next = pickWeighted(HOME_TRANSITIONS[state] as Record<HomeState, number>);
      enter(next);
    }
    enter('sit');
    return { stopAndPark: () => { player.cancel(); player.play(catN, 'Sitting', {}); } };
  }

  // ============================================================
  // Init — spin up the 6 home cats
  // ============================================================
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const homeCats: Record<number, ReturnType<typeof startHomeCat>> = {};
  for (let n = 1; n <= 6; n++) {
    const hostEl = document.querySelector<HTMLElement>(`.deskcat-home-sprite[data-cat-id="${n}"]`);
    if (!hostEl) continue;
    if (reducedMotion) {
      // Just paint Sitting — no FSM
      const player = makeSpritePlayer(hostEl, HOME_SCALE);
      player.play(n, 'Sitting', {});
    } else {
      homeCats[n] = startHomeCat(n, hostEl);
    }
  }
</script>
```

- [ ] **Step 2: Verify in browser**

Reload http://localhost:4321/. Each of the 6 beds should now have a Pet Cat (1–6) doing different at-home anims independently. Some sit, some lay, some sleep, etc. Cats stay in their beds — none walk out.

If sprites don't load:
- Open browser devtools Network tab; check that requests to `/sprites/cats/Pet%20Cats%20Pack/Cat-1/Cat-1-Idle.png` succeed (200).
- If 404, the Astro public path is wrong — verify files exist at `public/sprites/cats/Pet Cats Pack/Cat-1/Cat-1-Idle.png`.

- [ ] **Step 3: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add src/components/atmosphere/DeskFooter.astro
git commit -m "$(cat <<'EOF'
feat(deskcat): bed cats animate via reduced at-home FSM

Each of the 6 bed cats independently cycles sit/idle/groom/lay/sleep
with weighted transitions. Sprite player ports from cat-sandbox/
behavior.html. Reduced-motion users get static sitting cats.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Out-cat — full FSM, walking, click interactions

**Files:**
- Modify: `src/components/atmosphere/DeskFooter.astro` (extend the `<script>` block)

Port the full out-cat FSM, walking engine (sprite + RAF translation in parallel), and click handlers. Active cat tracked in `localStorage` under `sm-deskcat-active`.

Reference: `~/DevSpace/Personal/cat-sandbox/behavior.html` for `walkTo`, `cancelMotion`/`cancelSpriteTimer`, full `STATES`/`TRANSITIONS` for the out-cat, and `pickWalkTarget`.

- [ ] **Step 1: Append out-cat infrastructure to the script**

After the existing init loop in the `<script>` block, add:

```astro
<script>
  // ============================================================
  // (continued — append below the home-cats init)
  // ============================================================

  const STORAGE_KEY = 'sm-deskcat-active';
  function getActiveCat(): number | null {
    try { const v = localStorage.getItem(STORAGE_KEY); const n = v ? parseInt(v, 10) : NaN; return (n >= 1 && n <= 6) ? n : null; }
    catch (e) { return null; }
  }
  function setActiveCat(n: number | null) {
    try { if (n == null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, String(n)); }
    catch (e) {}
  }

  // ============================================================
  // Out-cat — full FSM + walk engine
  // ============================================================
  type OutState = 'sit' | 'idle' | 'groom1' | 'groom2' | 'stretch' | 'walk' | 'lay' | 'sleep1' | 'sleep2' | 'meow';

  const OUT_STATES: Record<OutState, {
    anim: AnimName;
    hold?: [number, number];
    loops?: [number, number] | number;
    motion?: { distance: [number, number]; speedPxPerSec: number };
  }> = {
    sit:     { anim: 'Sitting',    hold: [1500, 4000] },
    idle:    { anim: 'Idle',       loops: [3, 6] },
    groom1:  { anim: 'Licking 1',  loops: [3, 5] },
    groom2:  { anim: 'Licking 2',  loops: [2, 4] },
    stretch: { anim: 'Stretching', loops: 1 },
    walk:    { anim: 'Walk',       motion: { distance: [80, 220], speedPxPerSec: 60 } },
    lay:     { anim: 'Laying',     loops: [2, 4] },
    sleep1:  { anim: 'Sleeping1',  hold: [4000, 12000] },
    sleep2:  { anim: 'Sleeping2',  hold: [3000, 8000] },
    meow:    { anim: 'Meow',       loops: 1 },
  };

  const OUT_TRANSITIONS: Record<OutState, Partial<Record<OutState, number>>> = {
    sit:     { idle: 6, groom1: 2, groom2: 2, stretch: 1, walk: 2, lay: 1, meow: 1 },
    idle:    { sit: 1, idle: 2, groom1: 2, groom2: 1, walk: 2, lay: 1, stretch: 1 },
    groom1:  { idle: 4, groom2: 2, sit: 1 },
    groom2:  { idle: 4, groom1: 1, sit: 1 },
    stretch: { idle: 3, walk: 2, lay: 1, sit: 1 },
    walk:    { idle: 4, sit: 2, groom1: 1, walk: 1 },
    lay:     { sleep1: 5, lay: 1, sit: 1 },
    sleep1:  { sleep2: 4, lay: 2, sit: 1 },
    sleep2:  { sleep1: 3, stretch: 2 },
    meow:    { idle: 5, sit: 1 },
  };

  const STAGE_PADDING_X = 40;
  const outHost = document.getElementById('deskcat-out-host')!;
  const outSprite = document.getElementById('deskcat-out-sprite')! as HTMLElement;
  const outPlayer = makeSpritePlayer(outSprite, OUT_SCALE);

  let outCatN: number | null = null;
  let outState: OutState = 'sit';
  let outMotionRAF: number | null = null;
  let outScheduling = false;
  let outFacing: 1 | -1 = 1;

  function getStageWidth(): number { return window.innerWidth; }
  function getCatWidth(): number { return FRAME * OUT_SCALE; }

  function setOutFacing(dir: 1 | -1) {
    outFacing = dir;
    outSprite.classList.toggle('flipped', dir === -1);
  }
  function cancelOutMotion() { if (outMotionRAF != null) { cancelAnimationFrame(outMotionRAF); outMotionRAF = null; } }
  function showOut(visible: boolean) { outHost.style.display = visible ? 'block' : 'none'; }

  function walkTo(targetX: number, speedPxPerSec: number, onDone?: () => void) {
    cancelOutMotion();
    const startX = parseFloat(outHost.style.left) || 0;
    const distance = Math.abs(targetX - startX);
    const direction: 1 | -1 = targetX > startX ? 1 : -1;
    setOutFacing(direction);
    const durationMs = (distance / speedPxPerSec) * 1000;
    const startTime = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      outHost.style.left = `${startX + (targetX - startX) * t}px`;
      if (t < 1) outMotionRAF = requestAnimationFrame(step);
      else { outMotionRAF = null; if (onDone) onDone(); }
    }
    outMotionRAF = requestAnimationFrame(step);
  }

  function pickWalkTarget(currentX: number, distRange: [number, number]): number {
    const stageW = getStageWidth();
    const catW = getCatWidth();
    const minX = STAGE_PADDING_X;
    const maxX = stageW - catW - STAGE_PADDING_X;
    for (let i = 0; i < 8; i++) {
      const dist = rand(distRange[0], distRange[1]);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const t = currentX + dir * dist;
      if (t >= minX && t <= maxX) return t;
    }
    return Math.max(minX, Math.min(maxX, currentX < (minX + maxX) / 2 ? maxX - 50 : minX + 50));
  }

  function setOutState(name: OutState) {
    outState = name;
    enterOutState(name);
  }
  function enterOutState(name: OutState) {
    if (outCatN == null) return;
    const def = OUT_STATES[name];
    if (def.motion) {
      const currentX = parseFloat(outHost.style.left) || 0;
      const target = pickWalkTarget(currentX, def.motion.distance);
      const distance = Math.abs(target - currentX);
      const meta = ANIMS[def.anim];
      const cycleMs = (meta.frames / meta.fps) * 1000;
      const durationMs = (distance / def.motion.speedPxPerSec) * 1000;
      const loops = Math.max(1, Math.round(durationMs / cycleMs));
      walkTo(target, def.motion.speedPxPerSec, () => { if (outScheduling) advanceOut(); });
      outPlayer.play(outCatN, def.anim, { loops });
      return;
    }
    if (def.hold) {
      const ms = rand(def.hold[0], def.hold[1]);
      outPlayer.play(outCatN, def.anim, { holdMs: ms }, () => { if (outScheduling) advanceOut(); });
      return;
    }
    if (def.loops) {
      const loops = Array.isArray(def.loops) ? randInt(def.loops[0], def.loops[1]) : def.loops;
      outPlayer.play(outCatN, def.anim, { loops }, () => { if (outScheduling) advanceOut(); });
      return;
    }
  }
  function advanceOut() {
    const next = pickWeighted(OUT_TRANSITIONS[outState] as Record<OutState, number>);
    setOutState(next);
  }

  // ============================================================
  // Release / send-home — orchestrates the visible state changes
  // ============================================================
  function getBedCenterX(catN: number): number {
    const slot = document.querySelector<HTMLElement>(`.deskcat-slot[data-cat-id="${catN}"]`);
    if (!slot) return getStageWidth() / 2;
    const rect = slot.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function sendCurrentHome(onArrived?: () => void) {
    if (outCatN == null) { if (onArrived) onArrived(); return; }
    const catN = outCatN;
    const targetCenter = getBedCenterX(catN);
    const targetLeft = targetCenter - getCatWidth() / 2;
    outScheduling = false;
    cancelOutMotion();
    outPlayer.play(catN, 'Walk', { loops: 99 });
    walkTo(targetLeft, 80, () => {
      // arrived — hide out cat, restart its home FSM
      showOut(false);
      outCatN = null;
      // Resume that cat's home FSM if reduced-motion is OFF
      if (!reducedMotion) {
        const hostEl = document.querySelector<HTMLElement>(`.deskcat-home-sprite[data-cat-id="${catN}"]`);
        if (hostEl) homeCats[catN] = startHomeCat(catN, hostEl);
      }
      if (onArrived) onArrived();
    });
  }

  function releaseCat(catN: number) {
    // Stop that cat's home FSM and park it
    if (homeCats[catN]) { homeCats[catN].stopAndPark(); delete homeCats[catN]; }

    // Position out-cat at the bed (center of slot, slightly raised), face right by default
    const bedX = getBedCenterX(catN) - getCatWidth() / 2;
    outHost.style.left = `${bedX}px`;
    setOutFacing(Math.random() < 0.5 ? -1 : 1);
    outCatN = catN;
    showOut(true);

    // Stretch then begin FSM
    outScheduling = true;
    outPlayer.play(catN, 'Stretching', { loops: 1 }, () => {
      if (outCatN !== catN) return;  // user clicked elsewhere mid-stretch
      setOutState('idle');
    });
    setActiveCat(catN);
  }

  function handleBedClick(catN: number) {
    if (outCatN === catN) {
      // Click own bed → go home
      sendCurrentHome();
      setActiveCat(null);
      return;
    }
    if (outCatN != null) {
      // Switch cats — current goes home in parallel with new release
      sendCurrentHome();
      releaseCat(catN);
      return;
    }
    releaseCat(catN);
  }

  document.querySelectorAll<HTMLElement>('.deskcat-slot').forEach((slot) => {
    const id = parseInt(slot.dataset.catId || '0', 10);
    if (!id) return;
    slot.addEventListener('click', () => handleBedClick(id));
  });
  outHost.addEventListener('click', () => {
    if (outCatN != null) { sendCurrentHome(); setActiveCat(null); }
  });
</script>
```

⚠️ **Important:** Astro `<script>` blocks default to one per file. If the script from Task 3 and this addition end up in the same file, **merge them into a single `<script>` block** rather than having two separate ones — the second one would shadow the first. The simplest approach: append all the code from this step **inside** the existing `<script>` block from Task 3, immediately before its closing `</script>`.

- [ ] **Step 2: Verify in browser**

Reload http://localhost:4321/.

- Click any bed → that bed's cat should stretch, then start wandering left/right at the bottom of the viewport. The bed it came from is now empty.
- Click a different bed while a cat is out → first cat walks back to its bed (in parallel), new cat releases.
- Click the wandering out-cat (anywhere on it) → walks back home.
- Click the same bed again while its cat is out → walks home.
- Open devtools → Application → Local Storage → confirm `sm-deskcat-active` updates with the active cat number (or is removed when no cat is out).

If the out-cat appears at wrong position when released: check `getBedCenterX` — slot rect uses viewport coords, out-cat uses fixed positioning so they should align directly.

- [ ] **Step 3: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add src/components/atmosphere/DeskFooter.astro
git commit -m "$(cat <<'EOF'
feat(deskcat): out-cat FSM, walking, and bed-click interactions

Click a bed to release the corresponding cat to wander. Click the
out-cat or its bed to send it home. Switching active cats happens
in parallel — old cat walks home, new cat releases. State persists
to localStorage under sm-deskcat-active. Full FSM and walking logic
ported from cat-sandbox/behavior.html.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Restore on load + arrival animation from opposite side

**Files:**
- Modify: `src/components/atmosphere/DeskFooter.astro` (extend the `<script>` block)

On component mount, if `localStorage` has a saved active cat, that cat arrives from the side of the screen opposite its home, walks to a position on that opposite side, then begins its FSM.

- [ ] **Step 1: Append restore logic**

Add at the very end of the existing `<script>` block (after the click handlers from Task 4):

```astro
<script>
  // ============================================================
  // (continued — append below click handlers)
  // ============================================================

  function arriveCat(catN: number) {
    if (homeCats[catN]) { homeCats[catN].stopAndPark(); delete homeCats[catN]; }

    const homeCenter = getBedCenterX(catN);
    const stageW = getStageWidth();
    const catW = getCatWidth();
    const homeOnLeft = homeCenter < stageW / 2;
    // Start off-screen on the side OPPOSITE home
    const startX = homeOnLeft ? stageW + 20 : -catW - 20;
    // Walk to a wandering position on the side opposite home
    const targetX = homeOnLeft ? Math.round(stageW * 0.65) - catW / 2 : Math.round(stageW * 0.35) - catW / 2;

    outHost.style.left = `${startX}px`;
    setOutFacing(homeOnLeft ? -1 : 1);  // face inward
    outCatN = catN;
    showOut(true);
    outScheduling = false;

    walkTo(targetX, 70, () => {
      if (outCatN !== catN) return;
      outScheduling = true;
      setOutState('idle');
    });
    outPlayer.play(catN, 'Walk', { loops: 99 });
  }

  // Run restore once on init
  const savedCat = getActiveCat();
  if (savedCat != null && !reducedMotion) {
    // Defer one frame so layout is settled (slot rects valid)
    requestAnimationFrame(() => arriveCat(savedCat));
  }
</script>
```

- [ ] **Step 2: Verify in browser**

1. Reload http://localhost:4321/.
2. Click bed 1 to release Cat 1.
3. Reload (Cmd-R). Cat 1's bed slot is empty. Out-cat should walk in from the **right edge** (since bed 1 is on the left side of the row).
4. Click bed 6, reload — out-cat walks in from the **left edge**.
5. Click the out-cat to send home, reload — no arrival, all cats home.
6. Switch active cat by clicking a different bed; reload; verify the new cat arrives from the opposite side of *its* home.

- [ ] **Step 3: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add src/components/atmosphere/DeskFooter.astro
git commit -m "$(cat <<'EOF'
feat(deskcat): restore active cat on load with opposite-side arrival

On component mount, read sm-deskcat-active from localStorage. If
present, place the cat off-screen on the side opposite its home
bed and walk it across to a position on that side. Then begin
the FSM. No arrival when no cat is saved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Theme reaction + glow/shadow filter

**Files:**
- Modify: `src/components/atmosphere/DeskFooter.astro` (CSS + script extension)

Add the theme-aware drop-shadow/glow filter on cats and beds. Wire a `MutationObserver` to detect `data-theme` changes on `<html>` and trigger a Stretching reaction on the out-cat (home cats ignore).

- [ ] **Step 1: Add filter CSS**

In the `<style>` block of `DeskFooter.astro`, add the following rules. Place them at the end of the existing scoped style block:

```css
:root {
  --deskcat-glow: rgba(214, 163, 92, 0.32);
  --deskcat-shadow: rgba(0, 0, 0, 0.45);
  --deskbed-glow: rgba(214, 163, 92, 0.22);
  --deskbed-shadow: rgba(0, 0, 0, 0.35);
}
:root[data-theme="light"] {
  --deskcat-glow: rgba(255, 245, 220, 0.55);
  --deskcat-shadow: rgba(40, 30, 20, 0.18);
  --deskbed-glow: rgba(255, 245, 220, 0.35);
  --deskbed-shadow: rgba(40, 30, 20, 0.14);
}
.deskcat-home-sprite, .deskcat-out-sprite {
  filter: drop-shadow(0 0 6px var(--deskcat-glow))
          drop-shadow(0 2px 3px var(--deskcat-shadow));
}
.deskcat-bed {
  filter: drop-shadow(0 0 3px var(--deskbed-glow))
          drop-shadow(0 1px 2px var(--deskbed-shadow));
}
```

⚠️ The `drop-shadow` on `.deskcat-bed` will *also* re-evaluate after the existing `hue-rotate` filter for beds 5/6. The current rules use `filter: hue-rotate(...) saturate(...)` which would overwrite the drop-shadow. Update beds 5/6 to *append* both filters in one declaration — modify the existing rules to:

```css
.deskcat-bed[data-bed-variant="5"] {
  background-position: 0px 0;
  filter: hue-rotate(45deg) saturate(0.95)
          drop-shadow(0 0 3px var(--deskbed-glow))
          drop-shadow(0 1px 2px var(--deskbed-shadow));
}
.deskcat-bed[data-bed-variant="6"] {
  background-position: -80px 0;
  filter: hue-rotate(-45deg) saturate(0.95)
          drop-shadow(0 0 3px var(--deskbed-glow))
          drop-shadow(0 1px 2px var(--deskbed-shadow));
}
```

(Beds 1–4 use the base `.deskcat-bed` rule's filter — no override needed.)

- [ ] **Step 2: Add theme reaction script**

Append to the end of the existing `<script>` block:

```astro
<script>
  // ============================================================
  // (continued — append after restore-on-load)
  // ============================================================

  function triggerThemeReaction() {
    if (outCatN == null) return;          // no out-cat — home cats ignore
    if (reducedMotion) return;
    const catN = outCatN;
    outScheduling = false;
    cancelOutMotion();
    outPlayer.play(catN, 'Stretching', { loops: 1 }, () => {
      if (outCatN !== catN) return;
      outScheduling = true;
      setOutState('idle');
    });
  }

  // Watch for data-theme changes on <html>
  const themeObserver = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes' && r.attributeName === 'data-theme') {
        triggerThemeReaction();
        return;
      }
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
</script>
```

- [ ] **Step 3: Verify in browser**

1. Reload. With no cat out, click the theme toggle in the nav. Page colors swap; no cat reacts.
2. Release a cat by clicking its bed. While the cat is wandering, click the theme toggle. Out-cat should immediately stretch, then resume FSM.
3. Confirm cats and beds visually have a soft glow + grounding shadow in both themes. In dark theme the glow should be a warm amber; in light theme it should be a soft warm rim.

If the glow looks too strong / too weak, tune the `--deskcat-glow` and `--deskbed-glow` opacity values in the CSS vars.

- [ ] **Step 4: Test prefers-reduced-motion**

In Safari devtools: open the Web Inspector → click Develop → Experimental Features → confirm "Emulate Inspector Sketch" if needed; or use macOS System Settings → Accessibility → Display → Reduce motion (toggle ON).

Reload the page. All home cats should freeze on their `Sitting` frame, no FSM ticking. If a cat was previously released, it should NOT auto-arrive. Bed-click should do nothing visible (release path skipped). Theme toggle should not trigger reactions.

Toggle Reduce Motion off again and reload to restore normal behavior.

- [ ] **Step 5: Commit**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
git add src/components/atmosphere/DeskFooter.astro
git commit -m "$(cat <<'EOF'
feat(deskcat): theme-aware glow/shadow + theme-toggle stretch reaction

Cats and beds get a subtle drop-shadow filter combining a warm/cool
halo (theme-connected) and a grounding shadow. MutationObserver on
<html data-theme> triggers a Stretching reaction on the out-cat
(home cats ignore).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Final smoke test + production build verification

**Files:** none modified.

- [ ] **Step 1: Verify dev server still runs cleanly**

The dev server should already be running on http://localhost:4321/ from the parent session. Confirm no console errors in the dev output.

If you need to restart it:

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
pnpm dev:astro
```

Wait for `astro v5.x.x ready in ...ms` line.

- [ ] **Step 2: Run production build**

```bash
cd /Users/nickcason/DevSpace/Personal/studio-marginalia
pnpm build:astro
```

Expected: build completes without TypeScript errors. If the inline `<script>` types fail, Astro's type-checker may complain — fix any reported errors. The dist output should include the public sprites.

- [ ] **Step 3: Run end-to-end manual smoke test against the spec acceptance criteria**

Open http://localhost:4321/ in Safari and verify:

1. ✅ Sticky footer with 6 cat beds visible at the bottom of the viewport.
2. ✅ Each bed has a Pet Cat doing different at-home anims independently.
3. ✅ Click any bed → cat stretches, walks out, wanders left/right.
4. ✅ Click out-cat or its bed → walks home, resumes home anims.
5. ✅ Click a different bed while one is out → old goes home (parallel), new releases.
6. ✅ Reload → previously-active cat arrives from opposite side; no save → all home.
7. ✅ Theme toggle → out-cat stretches; home cats ignore.
8. ✅ Reduce motion (System Settings) → all cats sit, no FSM, no walk.
9. ✅ Soft-navigate to /work or /about → cat continues uninterrupted (transition:persist).
10. ✅ Cats and beds have subtle glow + grounding shadow visible in both themes.

If any criterion fails, identify which task should be revisited. Common issues:
- Sprites 404 → asset path wrong (Task 1)
- Cats invisible / black squares → sprite size mismatch (Task 3)
- Cat never moves on walk → motion-RAF cancellation bug (re-check Task 4 step 1 split between `cancelMotion` and `cancelSpriteTimer`)
- Cat snaps back to home position on Astro view nav → DeskFooter missing `transition:persist` in Base.astro (Task 2 step 3)

- [ ] **Step 4: Commit smoke test note (if any)**

If the smoke test finds an issue you fixed, commit the fix. Otherwise no commit needed.

- [ ] **Step 5: Done — ready for user review**

The branch `desk-cat` should now have:
- 6 commits (one per task that touched code)
- A working DeskFooter visible at http://localhost:4321/
- All spec acceptance criteria met

Push or merge per user direction. Do not push without explicit instruction.
