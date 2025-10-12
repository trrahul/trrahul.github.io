/**
 * Knowledge Graph - Configuration & Constants
 * @module knowledge-graph/config
 */

export const CONFIG = {
  version: '2025-10-10-v2',
  
  // Graph dimensions
  dimensions: {
    height: 600,
    get width() {
      const container = document.getElementById('knowledge-graph-container');
      return container ? container.clientWidth : 1200;
    },
  },
  
  // Force simulation parameters
  simulation: {
    linkDistance: 100,       // More spacing between nodes
    chargeStrength: -400,    // Strong repulsion for clear separation
    collisionRadius: 15,     // Prevent overlap
    linkStrength: 1,         // Default link force strength
    centerForce: 0.1,        // Gentle pull towards center
  },
  
  // Node sizing (small and uniform like Obsidian)
  node: {
    baseSize: 3,             // Very small base
    maxSize: 6,              // Even max size is small
    sizeMultiplier: 1.2,     // Minimal variation
    strokeWidth: 1,          // Thin border
  },
  
  // Zoom settings
  zoom: {
    scaleExtent: [0.1, 4],
    scaleByIn: 1.3,
    scaleByOut: 0.7,
    fitPadding: 1.2,
    fitDuration: 750,
    fitDelay: 1500,
  },
  
  // Theme-aware palette sourced from CSS variables (light/dark supported)
  colors: {
    node: {
      default: 'var(--graph-node-color)',
      dimmed: 'var(--graph-node-color-dimmed)',
      highlighted: 'var(--graph-node-highlight)',
      stroke: 'var(--graph-node-stroke)',
      strokeHighlight: 'var(--graph-node-stroke-highlight)',
    },
    link: {
      default: 'var(--graph-link-color)',
      dimmed: 'var(--graph-link-color-dimmed)',
      highlighted: 'var(--graph-link-highlight)',
      arrow: 'var(--graph-link-arrow)',
    },
    label: {
      default: 'var(--graph-label-color)',
      dimmed: 'var(--graph-label-dimmed)',
      highlighted: 'var(--graph-label-highlight)',
    },
  },
  
  // Visual settings
  visual: {
    linkStrokeWidth: 0.5,    // Ultra-thin lines
    labelFontSize: '9px',    // Smaller text
    labelOffset: 12,         // Closer to nodes
    nodeFadeDuration: 350,
    linkFadeDuration: 400,
    nodeHoverScale: 1.08,
    nodeHighlightStrokeWidth: 1.8,
  },

  animation: {
    entryDuration: 800,
    entryLineWidth: 1.5,
    entryLineColor: 'var(--graph-entry-line-color)',
    freezeNodesAfterEntry: true,    // Lock nodes in place after animation
    entryBaselineJitter: 30,        // When baseline exists, start lines close to final position
  },

  debug: {
    animation: {
      enabled: true,
      includeTimestamp: true,
      groupCollapsed: true,
      showPayload: true,
    },
    dataLoader: {
      enabled: true,
      includeTimestamp: true,
      groupCollapsed: true,
      showPayload: true,
    },
  },
  
  // Data source
  dataUrl: '/assets/js/data/graph.json',
};
