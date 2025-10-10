/**
 * UI Management
 * @module playground/ui-manager
 */

import { CONFIG } from './config.js';
import { StateHelpers } from './state.js';

export const UIManager = {
  elements: {
    runBtn: null,
    disassembleBtn: null,
    outputPane: null,
  },

  /**
   * Initialize UI element references
   */
  init() {
    this.elements.runBtn = document.getElementById('runBtn');
    this.elements.disassembleBtn = document.getElementById('disassembleBtn');
    this.elements.outputPane = document.getElementById('outputPane');
  },

  /**
   * Set output pane content
   */
  setOutput(text, isError = false) {
    this.elements.outputPane.textContent = text;
  },

  /**
   * Switch to a specific tab
   */
  switchToTab(tabName) {
    document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const tabElement = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabElement) {
      tabElement.classList.add('active');
    }

    const contentId = `${tabName}Tab`;
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      contentElement.classList.add('active');
    }

    // Layout Monaco editors when they become visible
    if (tabName === 'il') {
      const ilEditor = StateHelpers.getEditor('il');
      if (ilEditor) {
        setTimeout(() => ilEditor.layout(), CONFIG.ui.editorLayoutDelay);
      }
    } else if (tabName === 'asm') {
      const asmEditor = StateHelpers.getEditor('asm');
      if (asmEditor) {
        setTimeout(() => asmEditor.layout(), CONFIG.ui.editorLayoutDelay);
      }
    }
  },

  /**
   * Get currently active tab
   */
  getCurrentTab() {
    const activeTab = document.querySelector('.output-tab.active');
    return activeTab ? activeTab.getAttribute('data-tab') : null;
  },

  /**
   * Setup tab switching event listeners
   */
  setupTabSwitching() {
    document.querySelectorAll('.output-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchToTab(tabName);
      });
    });
  },

  /**
   * Set button state (enabled/disabled with text)
   */
  setButtonState(button, disabled, text) {
    if (button) {
      button.disabled = disabled;
      button.textContent = text;
    }
  },
};
