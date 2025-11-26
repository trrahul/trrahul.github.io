/**
 * Monaco Editor Management
 * @module playground/monaco-manager
 */

import { CONFIG } from './config.js';
import { StateHelpers } from './state.js';
import { Utils } from './utils.js';

export const MonacoManager = {
  /**
   * Get common editor options
   */
  getCommonOptions(overrides = {}) {
    return {
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: CONFIG.monaco.fontSize,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      quickSuggestions: false,
      parameterHints: { enabled: false },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: false,
      contextmenu: false,
      ...overrides,
    };
  },

  /**
   * Initialize main code editor
   */
  createMainEditor(containerId, onRun) {
    const editor = monaco.editor.create(document.getElementById(containerId), {
      value: CONFIG.defaultCode,
      language: 'csharp',
      theme: Utils.getCurrentTheme(),
      wordWrap: 'on',
      folding: true,
      roundedSelection: true,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      snippetSuggestions: 'none',
      suggest: { enabled: false },
      ...this.getCommonOptions(),
    });

    // Setup keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);

    return editor;
  },

  /**
   * Initialize read-only output editor
   */
  createOutputEditor(containerId, placeholder, wordWrap = 'off') {
    return monaco.editor.create(document.getElementById(containerId), {
      value: placeholder,
      language: 'csharp',
      theme: Utils.getCurrentTheme(),
      readOnly: true,
      wordWrap,
      folding: wordWrap === 'on',
      renderWhitespace: 'none',
      links: false,
      occurrencesHighlight: false,
      selectionHighlight: false,
      ...this.getCommonOptions(),
    });
  },

  /**
   * Setup theme change observer
   * Watches both data-mode attribute and system preference changes
   */
  setupThemeObserver() {
    // Watch for data-mode attribute changes (user toggles theme on site)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-mode') {
          monaco.editor.setTheme(Utils.getCurrentTheme());
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode'],
    });

    // Watch for system preference changes (iOS/Android dark mode toggle)
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        // Only apply if data-mode is not explicitly set
        const dataMode = document.documentElement.getAttribute('data-mode');
        if (!dataMode || dataMode === '') {
          monaco.editor.setTheme(Utils.getCurrentTheme());
        }
      };

      // Use addEventListener for modern browsers, addListener for older Safari
      if (darkModeQuery.addEventListener) {
        darkModeQuery.addEventListener('change', handleSystemThemeChange);
      } else if (darkModeQuery.addListener) {
        darkModeQuery.addListener(handleSystemThemeChange);
      }
    }
  },

  /**
   * Initialize all Monaco editors
   */
  async initialize(onRun) {
    if (StateHelpers.isMonacoInitialized() || typeof require === 'undefined') {
      return;
    }

    StateHelpers.setMonacoInitialized(true);

    return new Promise((resolve) => {
      require.config({ paths: { vs: CONFIG.monaco.cdnPath } });

      require(['vs/editor/editor.main'], () => {
        // Create editors
        StateHelpers.setEditor('main', this.createMainEditor('editor', onRun));
        StateHelpers.setEditor(
          'il',
          this.createOutputEditor(
            'ilCode',
            'Click "Disassemble" to see IL code...'
          )
        );
        StateHelpers.setEditor(
          'asm',
          this.createOutputEditor(
            'asmCode',
            'Click "Disassemble" to see lowered C# code...',
            'on'
          )
        );

        // Setup theme observer
        this.setupThemeObserver();

        Utils.log('✅', 'Editors initialized (main, IL, lowered C#)');
        resolve();
      });
    });
  },
};
