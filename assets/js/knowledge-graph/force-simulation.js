/**
 * Knowledge Graph - Force Simulation
 * @module knowledge-graph/force-simulation
 */

import { CONFIG } from './config.js';
import { State } from './state.js';
import { NodeUtils } from './node-utils.js';

export const ForceSimulation = {
  create(nodes, links) {
    if (State.simulation) {
      State.simulation.stop();
    }

    State.simulation = d3.forceSimulation()
      .nodes(nodes)
      .force('charge', d3.forceManyBody().strength(CONFIG.simulation.chargeStrength))
      .force('center', d3.forceCenter(State.width / 2, State.height / 2))
      .force('link', d3.forceLink(links).id(d => d.id).distance(CONFIG.simulation.linkDistance))
      .force('collision', d3.forceCollide().radius(d => NodeUtils.getRadius(d) + CONFIG.simulation.collisionRadius));

    State.forceSettings = {
      charge: CONFIG.simulation.chargeStrength,
      linkDistance: CONFIG.simulation.linkDistance,
      linkStrength: CONFIG.simulation.linkStrength,
      center: CONFIG.simulation.centerForce,
    };
    
    return State.simulation;
  },
  
  onTick(link, node, label) {
    State.simulation.on('tick', () => {
      const updateLinks = (linkSelection) => {
        linkSelection.each(function(d) {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const targetRadius = NodeUtils.getRadius(d.target);
          const ratio = (distance - targetRadius - 3) / distance;
          const targetX = d.source.x + dx * ratio;
          const targetY = d.source.y + dy * ratio;
          
          d3.select(this)
            .attr('x1', d.source.x)
            .attr('y1', d.source.y)
            .attr('x2', targetX)
            .attr('y2', targetY);
        });
      };
      
      updateLinks(link);
      if (State.highlightLinks) {
        updateLinks(State.highlightLinks);
      }

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
  },
};
