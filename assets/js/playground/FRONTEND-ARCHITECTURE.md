## Architecture overview

Lightweight ES modules with clear separation: each file owns one concern, and modules communicate through thin helpers (`StateHelpers`, `ApiClient`) instead of frameworks.

### Key patterns

- **State isolation:** Direct mutations are prohibited. Modules call `StateHelpers.getEditor()`, `setAnalysisResults()`, etc., ensuring safe concurrent access.
- **Network normalization:** Every API call routes through `ApiClient.post()`, returning `{ ok, data, error }` so callers handle success/failure uniformly.
- **Editor lifecycle:** `monaco-manager.js` creates all three editors at boot, registers them via `StateHelpers`, then delegates control. Other modules retrieve editors without knowing initialization order.
- **Analysis re-filtering:** `analysis-manager.js` caches raw results in state, rebuilds the filtered view on-demand when category toggles change, avoiding redundant network calls.

### Integration points

1. **Bootstrap:** `monaco-manager.initialize(onRun)` loads Monaco CDN, wires Ctrl+Enter shortcut, and stores editor references.
2. **Execution flow:** `code-executor.run()` → `ApiClient.post('ExecuteCode', ...)` → `UIManager.setOutput()` + tab switch.
3. **Disassembly flow:** `code-executor.disassemble()` → `ApiClient.post('DisassembleCode', ...)` → updates IL/ASM editors + `SyntaxTreeRenderer.display()` + `AnalysisManager.display()`.
4. **Theme sync:** `monaco-manager.setupThemeObserver()` watches `data-mode` attribute changes and updates Monaco globally.
5. **Line highlighting:** User clicks diagnostic → `AnalysisManager.highlightLine()` → decorations stored via `StateHelpers` → auto-cleared after 2 seconds.

### Non-obvious design decisions

- **Why `StateHelpers` wraps direct access:** Prevents `State.editors.main` from being accidentally reassigned (e.g., `State.editors = {}`). Helpers validate keys and coerce types.
- **Why `api-client.js` doesn't retry:** Fast fail keeps UX predictable. Retries would complicate loading state and confuse users seeing stale spinners.
- **Why `syntax-tree-renderer.js` ignores shared state:** Trees are read-only visualizations. Coupling them to state would force unnecessary re-renders when unrelated analysis filters change.
- **Why category filters live in state, not localStorage:** Filters reset on page load to avoid confusion when backend analyzer rules change between sessions.

## Contributor guidance

- Keep modules under ~200 lines; split into focused helpers when responsibilities diverge.
- Add new API routes through `ApiClient.post()` and handle `{ ok, data, error }` uniformly.
- Document non-obvious integration points here (e.g., "why filtering happens client-side") to help future maintainers understand tradeoffs.


