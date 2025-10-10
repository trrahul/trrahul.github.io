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
   */
  getCurrentTheme() {
    const isDarkMode = document.documentElement.getAttribute('data-mode') === 'dark';
    return isDarkMode ? 'vs-dark' : 'vs';
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
