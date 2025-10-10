# Knowledge Graph Frontend Architecture

## Technical Overview (Current State)

### Entry Point and Bootstrap
- `knowledge-graph-main.js` waits for DOM readiness, wiring up shared SVG references and tooltip nodes via `State.elements`.
- `DataLoader.load()` fetches the knowledge graph JSON, seeds `State.data` (all/current/raw), and clones responses so D3 mutations never touch the source payload.
- A filter hook (`State.callbacks.onFilterChange`) keeps `StatisticsManager` and `GraphRenderer` in sync whenever category filters change.
- `ZoomController.initialize()` attaches the zoom/pan behavior to the primary SVG while `SettingsManager.init()` enables the settings side panel (display, force, animation controls).
- Initial render is executed through `GraphRenderer.render()` followed by a statistics refresh.

### Rendering and Simulation Flow
- `GraphRenderer` creates fresh node/link copies for each render, clears the SVG layer, and registers arrow markers.
- The module delegates force layout construction to `ForceSimulation.create()`, which stops any previous simulation, applies the configured forces, and stores the running simulation in `State.render.simulation` and `State.physics.forceSettings`.
- Drag, click, and hover behaviors are composed from dedicated helpers:
	- Dragging uses D3’s drag API while marking nodes as fixed.
	- Clicking releases fixed nodes or navigates to the note URL.
	- Hovering uses adjacency maps to dim unrelated nodes, animate highlight links, and adjust label opacity.
- `TooltipManager` updates the floating tooltip using `State.elements.tooltip`, and `ZoomController.fitToGraph()` offers an optional viewport reset after every render.

### User Interaction Surface
- `FilterManager` builds the category dropdown and label toggle, mutating `State.filters.activeCategories` and `State.display.showLabels` before invoking the filter callback.
- `SettingsManager` composes all control modules. It instantiates `createDisplayControls` with explicit dependencies (`State`, `CONFIG`, `d3`) and initializes `ForceControls` plus `AnimationManager`.
- `ForceControls` adjusts simulation parameters in real time, persisting them to `State.physics.forceSettings` and restarting the active simulation when sliders move.
- `createDisplayControls` updates arrow visibility, label opacity, node sizing, and link thickness, routing values through `State.display` while touching D3 selections directly when necessary.
- `AnimationManager` remains the façade for the SOLID-oriented animation helpers described below.

### Supporting Services
- `StatisticsManager` recalculates dashboard metrics (totals, averages, top posts) and writes them into the DOM each time data changes.
- `NodeUtils` centralizes node sizing (and provides an optional drag factory used by other consumers).
- `State` partitions cross-cutting data into `elements`, `data`, `render`, `filters`, `display`, `animation`, `physics`, `callbacks`, and `dimensions`. Legacy property accessors remain to keep older modules functional while the codebase migrates to the new shape.
- Shared configuration values (data URL, force strengths, visual constants) live in `CONFIG` and are reused across modules.

## Animation System

The animation subsystem has been refactored to follow SOLID principles. The orchestration layer now lives in `assets/js/knowledge-graph/animation/orchestrator.js` and composes several focused helpers:

| Module | Responsibility |
| --- | --- |
| `animation/animation-logger.js` | Config-driven debug logging with elapsed time support |
| `animation/baseline-service.js` | Captures baseline node positions and computes cluster centers |
| `animation/dataset-builder.js` | Applies active filters, clusters nodes, and builds sequential frames |
| `animation/frame-renderer.js` | Draws SVG layers, manages entry animations, and starts the local simulation |
| `animation/focus-controller.js` | Handles viewport focus retries while the simulation settles |

`animation-manager.js` re-exports the orchestrator for backwards compatibility (`settings-manager` still imports the same entry point). Each helper is independent and depends only on explicit abstractions, allowing targeted enhancements without reopening the orchestrator.

## Key Flows

1. **Initialization** – `AnimationManager.init()` bootstraps helper instances and binds the UI toggle.
2. **Start** – Collects filtered data via `DatasetBuilder`, captures baseline coordinates, prepares frames, and clears the canvas.
3. **Frame Rendering** – `FrameRenderer.render` draws the current frame, starts an isolated force simulation, and schedules viewport focus via `FocusController`.
4. **Stop** – Captures final positions, restores the saved state, and reseeds the main simulation to maintain continuity.

The animation services are stateless where possible, share only the minimal state required (`previousNodePositions`, `entryAnimations`, `nodeClusterIndex`), and rely on dependency injection to support future extension.

## Shared State Segmentation

The global `State` module groups concerns into dedicated sections instead of exposing a flat object. The high-level partitions are:

| Section | Purpose |
| --- | --- |
| `elements` | References to the SVG root, graph layer, container, and tooltip selection |
| `data` | The full dataset, filtered dataset, and raw dataset copy for animations |
| `render` | Force simulation, zoom handler, color scale, and link selections |
| `filters` | Active category filters, search query, and visibility toggles |
| `display` | User-adjustable presentation controls (arrows, label fade, sizing) |
| `animation` | Runtime animation handles, such as the active interval and dataset |
| `physics` | Force settings shared between the main simulation and animations |
| `callbacks` | Delegates such as the filter change handler |
| `dimensions` | Cached width and height for the SVG viewport |

Legacy property names remain available through accessors for compatibility, but new code should target the dedicated sections to keep responsibilities clear.

## Display Controls

`display-controls.js` exports a `createDisplayControls` factory that depends on explicit inputs (`state`, `config`, and `d3`). The settings manager instantiates it and manages the lifecycle, so the module relies on globals and does not mutates shared state indirectly. The public API returns `init`, `resetToDefaults`, and the individual update helpers, enabling future reuse or testing without DOM coupling. All DOM queries are routed through the injected `document` instance to simplify sandboxing.
