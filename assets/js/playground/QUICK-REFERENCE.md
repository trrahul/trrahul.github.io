# Playground Quick Reference

## 🎯 Common Tasks

### Add a New Feature

**Example: Add syntax highlighting for a new language**

1. **Update Config**
```javascript
// playground/config.js
export const CONFIG = {
  // ... existing config
  supportedLanguages: ['csharp', 'fsharp', 'vb'], // Add new language
};
```

2. **Create/Update Module**
```javascript
// playground/language-manager.js (new file)
import { CONFIG } from './config.js';

export const LanguageManager = {
  setLanguage(editor, language) {
    if (CONFIG.supportedLanguages.includes(language)) {
      monaco.editor.setModelLanguage(editor.getModel(), language);
    }
  },
};
```

3. **Import in Main**
```javascript
// playground-main.js
import { LanguageManager } from './playground/language-manager.js';
```

### Modify Existing Behavior

**Example: Change highlight duration**

```javascript
// playground/config.js
export const CONFIG = {
  ui: {
    highlightDuration: 3000, // Changed from 2000 to 3000ms
  },
};
```

**Example: Add new diagnostic category**

```javascript
// playground/config.js
export const DIAGNOSTIC_PATTERNS = {
  // ... existing patterns
  myNewCategory: /^MY[0-9]{4}$/,
};

// playground/state.js
export const State = {
  categoryFilters: {
    // ... existing filters
    myNewCategory: true,
  },
};
```

### Debug a Module

**Check state:**
```javascript
// Browser console
console.log(window.playground); // Public API
// Access state directly in module code:
import { State } from './state.js';
console.log(State.editors.main.getValue());
```

**Add logging:**
```javascript
import { Utils } from './utils.js';
Utils.log('🐛', 'Debug info:', someValue);
```

### Test a Function

**In browser console:**
```javascript
// Access via window.playground
window.playground.highlightLine(10, 5);
```

**In module (for private functions):**
```javascript
// Add temporary export
export { privateFunction }; // Remove after testing
```

## 📋 Module API Reference

### Config
```javascript
CONFIG.version                    // String
CONFIG.api.baseUrl               // String
CONFIG.monaco.cdnPath            // String
CONFIG.monaco.fontSize           // Number
CONFIG.ui.highlightDuration      // Number (ms)
CONFIG.defaultCode               // String
DIAGNOSTIC_PATTERNS.compiler     // RegExp
```

### State
```javascript
State.editors.main               // Monaco Editor instance
State.editors.il                 // Monaco Editor instance
State.editors.asm                // Monaco Editor instance
State.monacoInitialized          // Boolean
State.categoryFilters            // Object
State.currentDecorations         // Array
State.currentAnalysisResults     // Array
```

### Utils
```javascript
Utils.escapeHtml(text)           // String → String
Utils.getCurrentTheme()          // void → String
Utils.log(emoji, ...args)        // void
Utils.debounce(func, wait)       // Function
```

### DocsProvider
```javascript
DocsProvider.getDocsUrl(diagId)  // String → String | null
```

### MonacoManager
```javascript
MonacoManager.initialize(onRun)  // Promise<void>
MonacoManager.getCommonOptions() // Object
MonacoManager.setupThemeObserver() // void
```

### UIManager
```javascript
UIManager.init()                                    // void
UIManager.setOutput(text, isError)                  // void
UIManager.setExecutionTime(ms, level)               // void
UIManager.switchToTab(tabName)                      // void
UIManager.getCurrentTab()                           // String
UIManager.setupTabSwitching()                       // void
UIManager.setButtonState(btn, disabled, text)       // void
```

### CodeExecutor
```javascript
CodeExecutor.run()               // Promise<void>
CodeExecutor.disassemble()       // Promise<void>
```

### SyntaxTreeRenderer
```javascript
SyntaxTreeRenderer.display(json, err)    // void
SyntaxTreeRenderer.expandAll()           // void
SyntaxTreeRenderer.collapseAll()         // void
```

### AnalysisManager
```javascript
AnalysisManager.display(results)              // void
AnalysisManager.updateSummary(e, w, i)        // void
AnalysisManager.filterByCategory(results)     // Array
AnalysisManager.displayInEditor(results)      // void
AnalysisManager.highlightLine(line, column)   // void
AnalysisManager.setupCategoryFilters()        // void
```

## 🔍 Troubleshooting

### Module Not Loading
**Symptom:** Console error "Failed to load module"
**Solution:**
- Check file path in import statement
- Ensure file extension is `.js`
- Verify `type="module"` in script tag
- Check browser developer tools Network tab

### State Not Updating
**Symptom:** Changes don't reflect in UI
**Solution:**
- Check if State is imported correctly
- Verify mutation is happening
- Check if UI update function is called
- Add logging to track state changes

### Editor Not Initializing
**Symptom:** Monaco editor is blank or undefined
**Solution:**
- Check if Monaco CDN is loaded
- Verify `require` is defined
- Check browser console for errors
- Ensure container element exists

### API Calls Failing
**Symptom:** "Failed to fetch" error
**Solution:**
- Verify API URL in `config.js`
- Check if Azure Function is running
- Look at Network tab for error details
- Verify CORS settings

## 📦 Build for Production

### Option 1: No Build (Current)
Serve modules directly. Modern browsers support ES6 modules natively.

**Pros:** Simple, no build step
**Cons:** Many HTTP requests, no minification

### Option 2: Webpack Bundle
```bash
npm install webpack webpack-cli --save-dev

# webpack.config.js
module.exports = {
  entry: './assets/js/playground-main.js',
  output: {
    filename: 'playground.bundle.js',
    path: __dirname + '/assets/js/dist'
  },
  mode: 'production'
};

# Build
npx webpack
```

**Pros:** Single file, minified, tree-shaking
**Cons:** Requires build step

### Option 3: Rollup Bundle
```bash
npm install rollup --save-dev

# rollup.config.js
export default {
  input: 'assets/js/playground-main.js',
  output: {
    file: 'assets/js/dist/playground.bundle.js',
    format: 'iife'
  }
};

# Build
npx rollup -c
```

**Pros:** Smaller bundle than Webpack
**Cons:** Requires build step

## 🧪 Testing Strategy

### Unit Tests (Recommended)
```javascript
// tests/utils.test.js
import { Utils } from '../playground/utils.js';

test('escapeHtml escapes < and >', () => {
  expect(Utils.escapeHtml('<script>')).toBe('&lt;script&gt;');
});
```

### Integration Tests
Test module interactions:
```javascript
// tests/code-executor.test.js
import { CodeExecutor } from '../playground/code-executor.js';
import { State } from '../playground/state.js';

test('run() updates state', async () => {
  await CodeExecutor.run();
  expect(State.currentAnalysisResults).toBeDefined();
});
```

### E2E Tests (Playwright/Cypress)
```javascript
test('execute code shows output', async ({ page }) => {
  await page.goto('/playground');
  await page.click('#runBtn');
  await expect(page.locator('#outputPane')).toContainText('Hello');
});
```

## 📊 Performance Tips

1. **Lazy Load Modules**: Only import when needed
2. **Code Splitting**: Use dynamic `import()`
3. **Debounce Events**: Use `Utils.debounce()` for frequent events
4. **Memoize Results**: Cache expensive computations
5. **Web Workers**: Move heavy processing off main thread

## 🎓 Learning Resources

- **ES6 Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **jsTree**: https://www.jstree.com/
- **Async/Await**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
