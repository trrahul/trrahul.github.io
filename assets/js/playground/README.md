# Code Playground - JavaScript Architecture# Code Playground - Modular Architecture



> **Quick Links:** [Module Reference](#module-reference) | [Quick Reference](QUICK-REFERENCE.md) | [Design Principles](#design-principles)## 📁 File Structure



## 📁 Project Structure```

assets/js/

```├── playground-main.js           # Main entry point (ES6 module)

assets/js/playground/└── playground/                  # Modular components

├── config.js               # Configuration & constants (52 lines)    ├── config.js               # Configuration & constants

├── state.js                # Centralized state management (27 lines)    ├── state.js                # Application state

├── utils.js                # Utility functions (45 lines)    ├── utils.js                # Utility functions

├── docs-provider.js        # Microsoft docs URL generation (40 lines)    ├── docs-provider.js        # Microsoft docs URL generation

├── monaco-manager.js       # Monaco Editor initialization (120 lines)    ├── monaco-manager.js       # Monaco editor management

├── ui-manager.js           # UI/DOM manipulation (87 lines)    ├── ui-manager.js           # UI/DOM manipulation

├── code-executor.js        # API calls: execute & disassemble (182 lines)    ├── code-executor.js        # Code execution & disassembly

├── syntax-tree-renderer.js # jsTree visualization (234 lines)    ├── syntax-tree-renderer.js # Syntax tree visualization

└── analysis-manager.js     # Diagnostics display & filtering (227 lines)    └── analysis-manager.js     # Code analysis & diagnostics

``````



**Total:** 9 modules, ~1,000 lines (average 111 lines/module)## 🎯 Module Responsibilities



---### **config.js**

- Application configuration (API URLs, Monaco settings, UI constants)

## 🎯 Design Principles- Diagnostic ID regex patterns for category filtering

- Default code samples

### 1. **SOLID Principles**

- ✅ **Single Responsibility:** Each module has one clear purpose### **state.js**

- ✅ **Open/Closed:** Extend via new modules, don't modify existing- Centralized application state

- ✅ **Dependency Inversion:** Depend on abstractions (interfaces), not concrete implementations- Editor instances

- Category filter state

### 2. **Modular Architecture**- Current decorations and analysis results

- **ES6 modules:** Clean import/export, no globals

- **No circular dependencies:** Clear hierarchy### **utils.js**

- **Small files:** Average 111 lines per module- HTML escaping

- Theme detection

### 3. **State Management**- Logging utilities

- **Centralized:** `state.js` is single source of truth- Debounce function

- **Immutable updates:** State changes through defined methods

- **No duplication:** No state stored in multiple places### **docs-provider.js**

- Generate Microsoft docs URLs for diagnostics

### 4. **Clean Code**- Handles CS, CA, and IDE rule types

- **Self-documenting:** Clear naming, JSDoc comments- Special handling for nullable warnings

- **DRY principle:** Utilities in `utils.js`

- **Error handling:** Try-catch with user-friendly messages### **monaco-manager.js**

- **Async/await:** Modern promise handling- Initialize Monaco editors (main, IL, lowered C#)

- Common editor configuration

---- Theme change observer

- Keyboard shortcuts

## 📊 Module Reference

### **ui-manager.js**

### **Core Modules (No Dependencies)**- DOM element management

- Tab switching logic

#### `config.js` - Configuration- Button state management

```javascript- Output display

export const CONFIG = {- Execution time display

  api: { baseUrl },      // API endpoint

  monaco: { cdnPath },   // Monaco CDN### **code-executor.js**

  ui: { highlightDuration }, // UI constants- Execute C# code via API

  defaultCode,           // Sample code- Disassemble code to IL/lowered C#

};- Handle optimization levels

- Error handling and display

export const DIAGNOSTIC_PATTERNS = {

  compiler: /^(CS|IDE)/,### **syntax-tree-renderer.js**

  performance: /^CA18[0-9]{2}$/,- Render syntax tree using jsTree

  // ... category filters- Convert C# tree format to jsTree format

};- Tree navigation (expand/collapse all)

```- Icon mapping for node types



#### `state.js` - Application State### **analysis-manager.js**

```javascript- Display analysis results

export const State = {- Category filtering

  editors: { main, il, lowered }, // Monaco instances- Summary counts (errors/warnings/info)

  currentCategory: 'all',          // Filter state- Highlight code lines on click

  // ... getter/setter methods- Setup filter checkboxes

};- Display diagnostics in Monaco editor

```

### **playground-main.js**

#### `utils.js` - Utilities- Application initialization

```javascript- Module orchestration

export const Utils = {- Event listener setup

  escapeHtml(text),        // XSS prevention- Public API exposure

  getCurrentTheme(),       // Light/dark detection

  log(emoji, ...args),     // Console logging## 🔄 Module Dependencies

  debounce(func, wait),    // Rate limiting

};```

```playground-main.js

├── config.js

#### `docs-provider.js` - Documentation Links├── utils.js

```javascript├── monaco-manager.js

export const DocsProvider = {│   ├── config.js

  getDocsUrl(diagnosticId), // Generate MS docs URLs│   ├── state.js

};│   └── utils.js

```├── ui-manager.js

│   ├── config.js

---│   └── state.js

├── code-executor.js

### **UI Modules**│   ├── config.js

│   ├── state.js

#### `monaco-manager.js` - Editor Management│   ├── utils.js

**Dependencies:** `config.js`, `state.js`, `utils.js`│   ├── ui-manager.js

│   ├── syntax-tree-renderer.js

```javascript│   └── analysis-manager.js

export const MonacoManager = {├── syntax-tree-renderer.js

  initMonaco(),           // Load Monaco CDN│   └── utils.js

  createEditor(id, opts), // Create editor instance└── analysis-manager.js

  setupThemeObserver(),   // Watch dark/light mode    ├── config.js

  setupKeyboardShortcuts(), // Ctrl+Enter to run    ├── state.js

};    ├── utils.js

```    └── docs-provider.js

```

#### `ui-manager.js` - UI Interactions

**Dependencies:** `config.js`, `state.js`## ✅ Benefits



```javascript### **Separation of Concerns**

export const UIManager = {- Each module has a single, well-defined responsibility

  initTabs(),             // Tab switching logic- Easy to locate and modify specific functionality

  showLoading(target),    // Loading states- Reduced cognitive load when working on features

  hideLoading(target),    // Remove loading

  switchToTab(tabId),     // Navigate tabs### **Maintainability**

  highlightButton(btn),   // Visual feedback- Changes to one module don't affect others

};- Clear module boundaries

```- Easy to add new features

- Simple to refactor individual modules

---

### **Testability**

### **Feature Modules**- Modules can be tested independently

- Easy to mock dependencies

#### `code-executor.js` - API Communication- Clear input/output contracts

**Dependencies:** `config`, `state`, `utils`, `ui-manager`, `syntax-tree-renderer`, `analysis-manager`

### **Reusability**

```javascript- Modules can be reused in other projects

export const CodeExecutor = {- Utils and config are framework-agnostic

  executeCode(),          // POST /api/ExecuteCode- Clean APIs for integration

  disassembleCode(),      // POST /api/DisassembleCode

};### **Code Quality**

```- No global namespace pollution

- ES6 module syntax

**Flow:**- Explicit dependencies via imports

```- Easier code review

executeCode()

  → showLoading()### **Performance**

  → fetch API- Browser can cache individual modules

  → update editors- Only load what's needed

  → hideLoading()- Potential for code splitting

  → switchToTab('execution')

```## 🚀 Usage



#### `syntax-tree-renderer.js` - Tree Visualization### **Development**

**Dependencies:** `utils.js`All modules use ES6 `import/export` syntax. The main file is loaded as a module:



```javascript```html

export const SyntaxTreeRenderer = {<script type="module" src="playground-main.js"></script>

  render(syntaxTreeData),  // Render jsTree```

  convertToJsTree(nodes),  // Transform data

};### **Adding New Features**

```1. Create a new module file in `playground/`

2. Export functionality using ES6 exports

#### `analysis-manager.js` - Diagnostics3. Import in dependent modules or `playground-main.js`

**Dependencies:** `state`, `utils`, `docs-provider`4. Document the module's purpose in this README



```javascript### **Modifying Existing Features**

export const AnalysisManager = {1. Locate the relevant module based on feature domain

  displayDiagnostics(data), // Render diagnostics2. Make changes within that module

  filterByCategory(cat),    // Filter logic3. Update dependencies if API changes

  decorateEditor(items),    // Inline markers4. Test the specific module

  getCategoryFromId(id),    // CS/CA/IDE categorization

};## 📝 Coding Standards

```

- **ES6 Modules**: Use `import/export` syntax

---- **JSDoc Comments**: Document all public functions

- **Const over Let**: Prefer `const` for immutable values

## 🔄 Data Flow- **Arrow Functions**: Use for callbacks and short functions

- **Async/Await**: Prefer over promise chains

### Execute Code- **Error Handling**: Always use try-catch for async operations

```- **Naming**: camelCase for functions/variables, PascalCase for module objects

User clicks Run

  → ui-manager: disable button, show loading## 🔧 Configuration

  → code-executor: POST /api/ExecuteCode

  → Response: { output, success }Edit `config.js` to customize:

  → ui-manager: update output, hide loading, switch tab- API endpoints

```- Monaco editor settings

- UI timing constants

### Disassemble Code- Default code samples

```- Diagnostic patterns

User clicks Disassemble

  → ui-manager: show loading## 🎨 Styling

  → code-executor: POST /api/DisassembleCode

  → Response: { il, syntaxTree, loweredCSharp, analysis }CSS remains in `assets/css/playground.css` (not modularized as it's already scoped by class names).

  → Parallel updates:

      ├─ IL editor## 📦 Dependencies

      ├─ syntax-tree-renderer

      ├─ Lowered C# editor- **Monaco Editor**: Code editor component

      └─ analysis-manager- **jsTree**: Syntax tree visualization

  → ui-manager: hide loading, switch to IL tab- **jQuery**: Required by jsTree

```

## 🔒 Browser Compatibility

---

Requires ES6 module support:

## 🎨 SCSS Architecture- Chrome 61+

- Firefox 60+

```- Safari 11+

_sass/playground/- Edge 16+

├── _base.scss           # Container, grid, panes

├── _header.scss         # Pane headers, buttonsFor older browsers, a bundler like Webpack or Rollup would be needed.

├── _monaco.scss         # Monaco overrides

├── _tabs.scss           # Tab navigation## 📈 Future Improvements

├── _analysis-panel.scss # Filters, summary

├── _analysis-items.scss # Diagnostic cards- [ ] Add unit tests for each module

└── _syntax-tree.scss    # jsTree styling- [ ] Bundle with Webpack for production

```- [ ] Add TypeScript type definitions

- [ ] Implement module hot-reloading

**Organized:** Just like JS modules - one file per component  - [ ] Add localStorage for user preferences

**Theme-aware:** Uses CSS variables from Jekyll theme  - [ ] Create a build step for minification

**Responsive:** Mobile-first design

---

## 🛠️ Development

### Adding a New Module

1. **Create file:** `assets/js/playground/my-feature.js`
2. **Export functionality:**
   ```javascript
   export const MyFeature = {
     doSomething() { /* ... */ },
   };
   ```
3. **Import where needed:**
   ```javascript
   import { MyFeature } from './playground/my-feature.js';
   ```

### Module Design Checklist

✅ **DO:**
- Single responsibility per module
- Clear, descriptive names
- JSDoc comments for exports
- Use `Utils.escapeHtml()` for user content
- Handle errors gracefully

❌ **DON'T:**
- Create circular dependencies
- Duplicate code
- Use `innerHTML` with unsanitized data
- Create global variables
- Write functions >50 lines (extract helpers)

---

## 🔒 Security

- **XSS Prevention:** All user content through `Utils.escapeHtml()`
- **API Keys:** Server-side only (not in frontend)
- **CORS:** Backend validates origin
- **CSP:** Content Security Policy headers

---

## ⚡ Performance

- **Lazy loading:** Monaco loaded only when needed (~2MB saved)
- **Debouncing:** Analysis filter updates debounced (200ms)
- **Efficient rendering:** Only update changed DOM elements
- **jsTree:** Handles 1000+ nodes efficiently

---

## 📚 References

- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [jsTree Docs](https://www.jstree.com/)
- [ES6 Modules (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Quick Reference](QUICK-REFERENCE.md) - Common tasks and patterns

---

## 📈 Metrics

- **9 modules** (~111 lines average)
- **Zero circular dependencies**
- **100% ES6 modules** (no globals)
- **Zero inline scripts** (all external)
- **SOLID principles** followed throughout

---

**Last Updated:** 2025-10-09  
**Version:** v1-MODULAR
