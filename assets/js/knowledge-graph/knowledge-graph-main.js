/**
 * Knowledge Graph - Main Entry Point
 * @module knowledge-graph/graph-main
 */

import { CONFIG } from './config.js';
import { State } from './state.js';
import { DataLoader } from './data-loader.js';
import { StatisticsManager } from './statistics-manager.js';
import { ZoomController } from './zoom-controller.js';
import { FilterManager } from './filter-manager.js';
import { SettingsManager } from './settings-manager.js';
import { GraphRenderer } from './graph-renderer.js';

async function initialize() {
  try {
    initializeDOMElements();

    const data = await DataLoader.load();
    State.allData = data;
    State.currentData = data;
    State.rawData = data;  // Keep original data for filtering
    State.onFilterChange = (filteredData) => {
      StatisticsManager.update(filteredData);
      GraphRenderer.render(filteredData);
    };

    ZoomController.initialize();
    ZoomController.setupControls();

    SettingsManager.init();

    FilterManager.buildCategoryFilters(data);
    FilterManager.setupLabelToggle();

    GraphRenderer.render(data);

    StatisticsManager.update(data);

  } catch (error) {
    console.error('Failed to load knowledge graph:', error);
    const container = document.getElementById('knowledge-graph-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <p style="color: var(--text-color);">Failed to load knowledge graph. Please try refreshing the page.</p>
          <p style="color: var(--text-muted-color); font-size: 0.9em;">${error.message}</p>
        </div>
      `;
    }
  }
}

function initializeDOMElements() {
  State.container = document.getElementById('knowledge-graph-container');
  State.svg = d3.select('#knowledge-graph');
  State.g = State.svg.append('g');
  State.tooltip = d3.select('#graph-tooltip');
  State.width = CONFIG.dimensions.width;
  State.height = CONFIG.dimensions.height;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
