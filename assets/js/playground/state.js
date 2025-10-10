/**
 * Application State
 * @module playground/state
 */

export const State = {
  editors: {
    main: null,
    il: null,
    asm: null,
  },
  monacoInitialized: false,
  categoryFilters: {
    compiler: true,
    design: true,
    performance: true,
    security: true,
    reliability: true,
    maintainability: true,
    usage: true,
    naming: true,
    interoperability: true,
    globalization: true,
  },
  currentDecorations: [],
  currentAnalysisResults: [],
};

const getCategoryKeys = () => Object.keys(State.categoryFilters);

export const StateHelpers = {
  /**
   * Save editor instance by key (main, il, asm)
   */
  setEditor(name, editorInstance) {
    if (name in State.editors) {
      State.editors[name] = editorInstance;
    }
  },

  /**
   * Retrieve editor instance by key
   */
  getEditor(name) {
    return State.editors[name] || null;
  },

  /**
   * Update Monaco initialization flag
   */
  setMonacoInitialized(value) {
    State.monacoInitialized = Boolean(value);
  },

  /**
   * Check Monaco initialization flag
   */
  isMonacoInitialized() {
    return State.monacoInitialized;
  },

  /**
   * Store current decorations handles
   */
  setDecorations(handles) {
    State.currentDecorations = Array.isArray(handles) ? handles : [];
  },

  /**
   * Get current decorations handles
   */
  getDecorations() {
    return State.currentDecorations;
  },

  /**
   * Store analysis results for re-use
   */
  setAnalysisResults(results) {
    State.currentAnalysisResults = Array.isArray(results) ? results : [];
  },

  /**
   * Retrieve cached analysis results
   */
  getAnalysisResults() {
    return State.currentAnalysisResults;
  },

  /**
   * Set category flag by name
   */
  setCategoryFilter(name, isActive) {
    if (name in State.categoryFilters) {
      State.categoryFilters[name] = Boolean(isActive);
    }
  },

  /**
   * Apply one value to every category flag
   */
  setAllCategories(isActive) {
    const value = Boolean(isActive);
    getCategoryKeys().forEach((key) => {
      State.categoryFilters[key] = value;
    });
  },

  /**
   * Return a copy of category flags
   */
  getCategoryFilters() {
    return { ...State.categoryFilters };
  },
};
