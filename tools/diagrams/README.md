# Diagrams app

Programmatic Excalidraw diagrams for blog posts. Authored as Node modules,
rendered to SVG at build time, served as theme-aware images.

## Why

- Excalidraw scenes are versioned source code, diff-friendly.
- One scene → light + dark variants, no manual export.
- Transparent background, swaps with the site theme.

## Layout

```
tools/diagrams/
  helpers.mjs                # box, arrow, label, region, rowLR, scene
  themes.mjs                 # palettes — add a theme here
  scenes/                    # one .mjs per diagram
    audio-editing-pipeline.mjs
    blog-publishing-pipeline.mjs
    http2-connection-topology.mjs
    http2-stream-multiplexing.mjs
    sharpfocus-dependency-join.mjs
    sharpfocus-pipeline.mjs
  index.mjs                  # discovers scenes, builds × themes, renders SVGs
```

Outputs:
- `_diagrams/<name>.<theme>.excalidraw` — JSON sources, openable at excalidraw.com.
- `assets/img/diagrams/<name>.<theme>.svg` — rendered, background-stripped.

## Build

```pwsh
node tools/diagrams/index.mjs
```

Or run the VS Code task **Diagrams: Build**.

## Add a new diagram

1. Create `tools/diagrams/scenes/my-diagram.mjs`:
   ```js
   import { newBag, box, arrow, label, scene } from "../helpers.mjs";

   export const name = "my-diagram";

   export function build(t) {
     const bag = newBag();
     const a = box(bag, 0, 0, 160, 60, "Source", {
       bg: t.surface, fillStyle: "solid", stroke: t.accent,
     });
     const b = box(bag, 240, 0, 160, 60, "Sink", {
       bg: t.surface, fillStyle: "solid", stroke: t.accent,
     });
     arrow(bag, a, b, "LR", { stroke: t.text });
     return scene(bag, name);
   }
   ```
2. `node tools/diagrams/index.mjs`
3. Embed in a post with the include:
   ```liquid
   {% include diagram.html name="my-diagram" alt="What it shows" %}
   ```

## Authoring tips

- Default `fontFamily` is **Virgil** (hand-drawn). Use `fontFamily: 3` for
  Cascadia mono only when a token must read as code on the wire.
- Default `fillStyle` for `box()` is `solid` background — explicit
  `fillStyle: "solid"` keeps `bg` opaque and prevents Excalidraw's hachure
  pattern from leaking in.
- Use `region()` for grouped sub-systems. It draws a dashed-bordered
  rounded rect with a title at top-left.
- Always reference theme tokens (`t.text`, `t.accent`, `t.s1`, …) instead of
  hard-coded hex. Diagrams must look right in both light and dark.
- Background of the scene is transparent. Don't paint a full-canvas rect.

## How theming works

Each scene's `build(t)` is called once per palette in `themes.mjs`. The build
writes one SVG per theme. The `_includes/diagram.html` partial emits both
images and CSS hides the wrong one based on `html[data-mode]` (with a
`prefers-color-scheme` fallback for un-toggled visitors).
