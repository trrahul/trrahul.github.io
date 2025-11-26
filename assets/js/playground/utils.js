/**
 * Utility Functions
 * @module playground/utils
 */

export const Utils = {
  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Get current theme (light/dark)
   * Checks data-mode attribute first, then falls back to system preference
   */
  getCurrentTheme() {
    const dataMode = document.documentElement.getAttribute('data-mode');
    
    // If data-mode is explicitly set, use it
    if (dataMode === 'dark') {
      return 'vs-dark';
    }
    if (dataMode === 'light') {
      return 'vs';
    }
    
    // Fall back to system preference (important for iOS/mobile)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'vs-dark';
    }
    
    return 'vs';
  },

  /**
   * Log with emoji prefix
   */
  log(emoji, ...args) {
    console.log(`${emoji}`, ...args);
  },

  /**
   * Debounce function execution
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
};
