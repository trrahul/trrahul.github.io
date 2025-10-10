/**
 * Knowledge Graph - Settings Manager
 * Orchestrates all settings components for the knowledge graph
 * 
 * Responsibilities:
 * - Toggle settings panel visibility
 * - Initialize and coordinate sub-modules (display, forces, animation)
 * - Restore default settings across all modules
 */

import { State } from './state.js';
import { CONFIG } from './config.js';
import { createDisplayControls } from './display-controls.js';
import { ForceControls } from './force-controls.js';
import { AnimationManager } from './animation-manager.js';

export const SettingsManager = {
  displayControls: null,
  init({ d3 = window.d3 } = {}) {
    this.displayControls = createDisplayControls({
      state: State,
      config: CONFIG,
      d3,
    });

    this.setupToggle();
    this.displayControls.init();
    ForceControls.init();
    AnimationManager.init();
    
    this.setupRestoreDefaults();
  },

  setupToggle() {
    const toggleBtn = document.getElementById('toggle-settings');
    const panel = document.getElementById('graph-settings-panel');
    
    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener('click', () => {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      toggleBtn.querySelector('i').classList.toggle('fa-cog');
      toggleBtn.querySelector('i').classList.toggle('fa-times');
    });
  },

  setupRestoreDefaults() {
    const restoreBtn = document.getElementById('restore-defaults');
    if (!restoreBtn) return;

    restoreBtn.addEventListener('click', () => {
      AnimationManager.reset();

      if (this.displayControls) {
        this.displayControls.resetToDefaults();
      }
      ForceControls.resetToDefaults();

      console.log('Settings restored to defaults');
    });
  }
};
