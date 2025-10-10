/**
 * C# Code Playground - Main Entry Point
 * @module playground-main
 */

import { CONFIG } from './playground/config.js';
import { Utils } from './playground/utils.js';
import { MonacoManager } from './playground/monaco-manager.js';
import { UIManager } from './playground/ui-manager.js';
import { CodeExecutor } from './playground/code-executor.js';
import { SyntaxTreeRenderer } from './playground/syntax-tree-renderer.js';
import { AnalysisManager } from './playground/analysis-manager.js';

/**
 * Initialize the playground application
 */
async function initializePlayground() {
  Utils.log('🎮', `Playground.js loaded - Version: ${CONFIG.version}`);
  Utils.log('🌐', 'API_BASE_URL:', CONFIG.api.baseUrl);

  // Initialize Monaco editors with callback for Ctrl+Enter
  await MonacoManager.initialize(() => CodeExecutor.run());

  // Initialize UI
  UIManager.init();
  UIManager.setupTabSwitching();

  // Setup category filters
  AnalysisManager.setupCategoryFilters();

  // Setup event listeners
  UIManager.elements.runBtn?.addEventListener('click', () => CodeExecutor.run());
  UIManager.elements.disassembleBtn?.addEventListener('click', () => CodeExecutor.disassemble());

  // Setup tree controls
  document.getElementById('expandAll')?.addEventListener('click', () => SyntaxTreeRenderer.expandAll());
  document.getElementById('collapseAll')?.addEventListener('click', () => SyntaxTreeRenderer.collapseAll());

  // Expose public API for inline event handlers
  window.playground = {
    highlightLine: (line, column) => AnalysisManager.highlightLine(line, column),
  };

  Utils.log('✅', 'Playground initialized');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlayground);
} else {
  initializePlayground();
}
