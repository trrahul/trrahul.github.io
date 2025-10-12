/**
 * Terminal Home - Utilities
 * Shared utility functions
 */

export const Utils = {
  /**
   * Get category display name from slug
   * @param {string} slug - Category slug
   * @returns {string} Display name
   */
  getCategoryDisplayName(slug) {
    if (!slug) return '';
    
    // Try to find the category element
    const categoryEl = document.querySelector(`[data-category="${slug}"]`);
    if (categoryEl) {
      const nameEl = categoryEl.querySelector('.folder-name');
      if (nameEl) {
        return nameEl.textContent.replace('/', '');
      }
    }
    
    // Fallback: capitalize and de-slugify
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Safely set text content
   * @param {HTMLElement} element - DOM element
   * @param {string} text - Text to set
   */
  safeSetText(element, text) {
    if (element && typeof element.textContent !== 'undefined') {
      element.textContent = text;
    }
  },

  /**
   * Safely set style
   * @param {HTMLElement} element - DOM element
   * @param {string} property - CSS property
   * @param {string} value - CSS value
   */
  safeSetStyle(element, property, value) {
    if (element && element.style) {
      element.style[property] = value;
    }
  },

  /**
   * Check if element is visible
   * @param {HTMLElement} element - DOM element
   * @returns {boolean} True if visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  },

  /**
   * Sanitize text input
   * @param {string} text - Input text
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/[<>]/g, '');
  },

  /**
   * Escape characters with special meaning in regular expressions
   * @param {string} text - Input text
   * @returns {string} Escaped string safe for RegExp construction
   */
  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
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
  }
};
