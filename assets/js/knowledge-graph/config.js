/**
 * Knowledge Graph - Configuration & Constants
 * @module knowledge-graph/config
 */

export const CONFIG = {
  version: '2025-10-10-v1',
  
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
  
  // Obsidian-style colors (purple accent, gray base)
  colors: {
    node: {
      default: '#6b7280',                       // Gray (like Obsidian)
      dimmed: 'rgba(107, 114, 128, 0.2)',       // Very dimmed
      highlighted: '#8b5cf6',                   // Purple accent (Obsidian's color)
      stroke: 'rgba(107, 114, 128, 0.4)',       // Subtle border
      strokeHighlight: '#8b5cf6',               // Purple on hover
    },
    link: {
      default: 'rgba(107, 114, 128, 0.15)',     // Very subtle gray
      dimmed: 'rgba(107, 114, 128, 0.03)',      // Almost invisible
      highlighted: 'rgba(139, 92, 246, 0.5)',   // Purple on hover
      arrow: 'rgba(107, 114, 128, 0.25)',       // Subtle arrow
    },
    label: {
      default: 'rgba(75, 85, 99, 0.8)',         // Readable gray
      dimmed: 'rgba(75, 85, 99, 0.2)',          // Dimmed
      highlighted: 'rgba(55, 65, 81, 1)',       // Darker on hover
    },
  },
  
  // Visual settings
  visual: {
    linkStrokeWidth: 0.5,    // Ultra-thin lines
    labelFontSize: '9px',    // Smaller text
    labelOffset: 12,         // Closer to nodes
  },

  animation: {
    entryDuration: 800,
    entryLineWidth: 1.5,
    entryLineColor: '#8b5cf6',
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
  },
  
  // Data source
  dataUrl: '/assets/js/data/graph.json',
};
