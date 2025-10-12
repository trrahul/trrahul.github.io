/**
 * Terminal Home - State Store
 * Centralized mutable state with explicit change notifications
 */

export class StateStore {
  constructor() {
    this.navigation = {
      currentPath: '',
      previousPath: '',
      pathSegments: []
    };

    this.sorting = {
      type: 'time',
      reverse: false
    };

    this.filtering = {
      searchTerm: ''
    };

    this.display = {
      viewDetailed: false
    };

    this.elements = {};
    this.callbacks = new Set();
  }

  /**
   * Cache DOM references used throughout the UI
   * @param {Record<string, string>} selectors
   */
  cacheElements(selectors) {
    this.elements = {
      input: document.querySelector(selectors.input),
      currentDir: document.querySelector(selectors.currentDir),
      statusLocation: document.querySelector(selectors.statusLocation),
      visibleCount: document.querySelector(selectors.visibleCount),
      categoryDirs: document.querySelectorAll(selectors.categoryDirs),
  directoryList: document.querySelector(selectors.directoryList),
      flatList: document.querySelector(selectors.flatList),
      helpModal: document.querySelector(selectors.helpModal),
      directoryView: document.querySelector(selectors.directoryView),
      rootHeader: document.querySelector(selectors.rootHeader),
      pathSegment: document.querySelector(selectors.pathSegment),
      directoryIcon: document.querySelector(selectors.directoryIcon),
      directoryItemCount: document.querySelector(selectors.directoryItemCount),
      searchEmptyState: document.querySelector(selectors.searchEmptyState),
      searchEmptyMessage: document.querySelector(selectors.searchEmptyMessage)
    };

    const missing = [];
    if (!this.elements.input) missing.push('input');
  if (!this.elements.categoryDirs) missing.push('categoryDirs');
  if (!this.elements.directoryList) missing.push('directoryList');
    if (!this.elements.directoryItemCount) missing.push('directoryItemCount');

    if (missing.length > 0) {
      console.warn('Terminal Home: missing elements ->', missing.join(', '));
    }
  }

  /**
   * Subscribe to state updates
   * @param {Function} listener
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.callbacks.add(listener);
    }
  }

  /**
   * Unsubscribe listener
   * @param {Function} listener
   */
  unsubscribe(listener) {
    if (listener && this.callbacks.has(listener)) {
      this.callbacks.delete(listener);
    }
  }

  /**
   * Convenience accessor for cached elements
   * @param {string} key
   * @returns {Element|NodeListOf<Element>|null}
   */
  getElement(key) {
    return this.elements[key] || null;
  }

  /**
   * Update navigation path and derived segments
   * @param {string} path
   * @param {Array<string>} segments
   */
  setNavigation(path, segments = []) {
    this.navigation.previousPath = this.navigation.currentPath;
    this.navigation.currentPath = path || '';
    this.navigation.pathSegments = Array.isArray(segments) ? segments : [];
    this.notify();
  }

  /**
   * Update sorting preferences
   * @param {string} type
   * @param {boolean} reverse
   */
  setSorting(type, reverse = false) {
    this.sorting.type = type;
    this.sorting.reverse = Boolean(reverse);
    this.notify();
  }

  /**
   * Update active search term
   * @param {string} term
   */
  setSearchTerm(term) {
    this.filtering.searchTerm = term ? term.toLowerCase() : '';
    this.notify();
  }

  /**
   * Toggle detailed view flag
   * @param {boolean} isDetailed
   */
  setDetailedView(isDetailed) {
    this.display.viewDetailed = Boolean(isDetailed);
    this.notify();
  }

  /**
   * Reset state to provided defaults
   * @param {Object} defaults
   */
  reset(defaults = {}) {
    this.navigation.currentPath = defaults.path || '';
    this.navigation.previousPath = '';
    this.navigation.pathSegments = defaults.segments || [];
    this.sorting.type = defaults.sort || 'time';
    this.sorting.reverse = Boolean(defaults.sortReverse);
    this.filtering.searchTerm = defaults.searchTerm || '';
    this.display.viewDetailed = Boolean(defaults.viewDetailed);
    this.notify();
  }

  /**
   * Snapshot current state
   * @returns {Object}
   */
  getSnapshot() {
    return {
      path: this.navigation.currentPath,
      segments: [...this.navigation.pathSegments],
      sort: this.sorting.type,
      reverse: this.sorting.reverse,
      search: this.filtering.searchTerm,
      detailed: this.display.viewDetailed
    };
  }

  notify() {
    this.callbacks.forEach(listener => {
      try {
        listener(this.getSnapshot());
      } catch (error) {
        console.error('Terminal Home: state listener failed', error);
      }
    });
  }
}
