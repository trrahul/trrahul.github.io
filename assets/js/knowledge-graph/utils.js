/**
 * Knowledge Graph - Utility Functions
 * @module knowledge-graph/utils
 */

export const Utils = {
  /**
   * Debounce function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Escape HTML entities to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Throttle function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Resolve a CSS custom property, trimming whitespace and falling back when absent.
   * @param {string} name - CSS variable name (e.g. `--graph-node-color`).
   * @param {HTMLElement | null} element - Element to read the variable from.
   * @param {string} fallback - Fallback value when the variable is undefined.
   * @returns {string}
   */
  getCssVar(name, element = null, fallback = '') {
    const target = element instanceof HTMLElement ? element : document.documentElement;
    const value = getComputedStyle(target).getPropertyValue(name);
    return value ? value.trim() : fallback;
  },

  /**
   * Resolve the graph palette (node/link/label colors) from CSS variables with sensible fallbacks.
   * @param {HTMLElement | null} container - Graph container used as the CSS scope.
   * @returns {{
   *   nodeDefault: string,
   *   nodeDimmed: string,
   *   nodeHighlight: string,
   *   nodeStroke: string,
   *   nodeStrokeHighlight: string,
   *   linkDefault: string,
   *   linkDimmed: string,
   *   linkHighlight: string,
   *   linkArrow: string,
   *   labelDefault: string,
   *   labelDimmed: string,
   *   labelHighlight: string,
   *   entryLine: string
   * }}
   */
  resolveGraphPalette(container = null) {
    const scope = container instanceof HTMLElement ? container : document.documentElement;
    return {
      nodeDefault: this.getCssVar('--graph-node-color', scope, '#6b7280'),
      nodeDimmed: this.getCssVar('--graph-node-color-dimmed', scope, 'rgba(107, 114, 128, 0.2)'),
      nodeHighlight: this.getCssVar('--graph-node-highlight', scope, '#8b5cf6'),
      nodeStroke: this.getCssVar('--graph-node-stroke', scope, 'rgba(107, 114, 128, 0.4)'),
      nodeStrokeHighlight: this.getCssVar('--graph-node-stroke-highlight', scope, '#8b5cf6'),
      linkDefault: this.getCssVar('--graph-link-color', scope, 'rgba(107, 114, 128, 0.15)'),
      linkDimmed: this.getCssVar('--graph-link-color-dimmed', scope, 'rgba(107, 114, 128, 0.03)'),
      linkHighlight: this.getCssVar('--graph-link-highlight', scope, 'rgba(139, 92, 246, 0.5)'),
      linkArrow: this.getCssVar('--graph-link-arrow', scope, 'rgba(107, 114, 128, 0.25)'),
      labelDefault: this.getCssVar('--graph-label-color', scope, 'rgba(75, 85, 99, 0.8)'),
      labelDimmed: this.getCssVar('--graph-label-dimmed', scope, 'rgba(75, 85, 99, 0.2)'),
      labelHighlight: this.getCssVar('--graph-label-highlight', scope, 'rgba(55, 65, 81, 1)'),
      entryLine: this.getCssVar('--graph-entry-line-color', scope, '#8b5cf6'),
    };
  }
};
