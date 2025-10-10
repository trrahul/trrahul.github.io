/**
 * Knowledge Graph - Tooltip Manager
 * @module knowledge-graph/tooltip-manager
 */

import { State } from './state.js';

export const TooltipManager = {
  show(event, node) {
    const html = `
      <div class="graph-tooltip-content">
        <strong>${node.title}</strong>
        <div class="text-muted small mt-1">
          <div><i class="fas fa-folder fa-xs"></i> ${node.category}</div>
          <div class="mt-1">
            <i class="fas fa-arrow-left fa-xs"></i> ${node.backlinks} incoming
            <span class="mx-1">•</span>
            <i class="fas fa-arrow-right fa-xs"></i> ${node.outgoing} outgoing
          </div>
          ${node.excerpt ? `<div class="mt-1">${node.excerpt}...</div>` : ''}
        </div>
      </div>
    `;

    State.tooltip
      .html(html)
      .style('opacity', 1)
      .style('left', (event.clientX + 15) + 'px')
      .style('top', (event.clientY + 15) + 'px');
  },
  
  hide() {
    State.tooltip.style('opacity', 0);
  },
};
