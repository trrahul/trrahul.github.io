/**
 * Knowledge Graph - Node Utilities
 * @module knowledge-graph/node-utils
 */

import { CONFIG } from './config.js';

export const NodeUtils = {
  /**
   * Calculate node radius based on connections
   */
  getRadius(node) {
    const connections = node.connections || 0;
    return Math.min(
      CONFIG.node.baseSize + connections * CONFIG.node.sizeMultiplier,
      CONFIG.node.maxSize
    );
  },
  
  /**
   * Create drag behavior for nodes (Sticky layout: drag fixes, click releases)
   */
  createDragBehavior(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      // Mark as fixed visually
      d3.select(this).classed('fixed', true);
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // Keep node fixed (sticky behavior)
      // Will be released by click handler
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  },
};
