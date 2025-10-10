/**
 * Knowledge Graph - Zoom Controller
 * @module knowledge-graph/zoom-controller
 */

import { CONFIG } from './config.js';
import { State } from './state.js';

export const ZoomController = {
  initialize() {
    State.zoom = d3.zoom()
      .scaleExtent(CONFIG.zoom.scaleExtent)
      .on('zoom', (event) => {
        State.g.attr('transform', event.transform);
      });
    
    State.svg.call(State.zoom);
  },
  
  setupControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');
    
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }
    
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomOut());
    }
    
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => this.reset());
    }
  },
  
  zoomIn() {
    State.svg.call(State.zoom.scaleBy, CONFIG.zoom.scaleByIn);
  },
  
  zoomOut() {
    State.svg.call(State.zoom.scaleBy, CONFIG.zoom.scaleByOut);
  },
  
  reset() {
    State.svg.call(State.zoom.transform, d3.zoomIdentity);
  },
  
  /**
   * Zoom to fit the graph (no animation)
   */
  fitToGraph() {
    // Don't auto-fit - let the force layout handle positioning
    // Users can manually zoom/pan if needed
  },
};
