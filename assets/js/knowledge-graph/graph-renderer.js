/**
 * Knowledge Graph - Graph Renderer
 * @module knowledge-graph/graph-renderer
 */

import { CONFIG } from './config.js';
import { State } from './state.js';
import { DataLoader } from './data-loader.js';
import { ForceSimulation } from './force-simulation.js';
import { NodeUtils } from './node-utils.js';
import { TooltipManager } from './tooltip-manager.js';
import { ZoomController } from './zoom-controller.js';

export const GraphRenderer = {
  render(data) {
    const { nodes, links } = DataLoader.createCopy(data);

    State.g.selectAll('*').remove();

    this.addArrowMarkers();

    const link = this.createLinks(links);

    const node = this.createNodes(nodes);

    const label = this.createLabels(nodes);

    const simulation = ForceSimulation.create(nodes, links);

    ForceSimulation.onTick(link, node, label);

    this.setupDrag(node, simulation);

    this.setupClickHandler(node, simulation);

    this.setupHoverEffects(node, link, label);

    ZoomController.fitToGraph();
  },

  addArrowMarkers() {
    let defs = State.svg.select('defs');
    if (defs.empty()) {
      defs = State.svg.append('defs');
    }
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', CONFIG.colors.link.arrow);
  },

  createLinks(links) {
    const linkGroup = State.g.append('g');
    const baseLinks = linkGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link-base')
      .attr('stroke', CONFIG.colors.link.default)
      .attr('stroke-width', CONFIG.visual.linkStrokeWidth)
      .attr('marker-end', 'url(#arrowhead)');
    const highlightLinks = linkGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link-highlight')
      .attr('stroke', CONFIG.colors.link.highlighted)
      .attr('stroke-width', CONFIG.visual.linkStrokeWidth)
      .attr('marker-end', 'url(#arrowhead)')
      .style('opacity', 0);
    State.baseLinks = baseLinks;
    State.highlightLinks = highlightLinks;
    return baseLinks;
  },

  createNodes(nodes) {
    return State.g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('class', 'graph-node')
      .attr('r', d => NodeUtils.getRadius(d))
      .attr('fill', CONFIG.colors.node.default)  // Single color for all nodes
      .attr('stroke', CONFIG.colors.node.stroke)
      .attr('stroke-width', CONFIG.node.strokeWidth)
      .style('cursor', 'move')
      .style('transition', 'fill 0.2s ease, stroke 0.2s ease')  // Smooth animation
      .classed('fixed', d => d.fx !== undefined)
      .on('mouseover', (event, d) => TooltipManager.show(event, d))
      .on('mouseout', () => TooltipManager.hide());
  },

  setupDrag(node, simulation) {
    const drag = d3.drag()
      .on('start', function(event) {
        d3.select(this).classed('fixed', true);
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        simulation.alpha(1).restart();
      });

    node.call(drag);
  },

  setupClickHandler(node, simulation) {
    node.on('click', function(event, d) {
      if (d.fx !== undefined) {
        delete d.fx;
        delete d.fy;
        d3.select(this).classed('fixed', false);
        simulation.alpha(1).restart();
      } else {
        window.location.href = d.url;
      }
    });
  },

  createLabels(nodes) {
    return State.g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => NodeUtils.getRadius(d) + CONFIG.visual.labelOffset)
      .attr('alignment-baseline', 'hanging')  // Align text from top edge
      .style('font-size', CONFIG.visual.labelFontSize)
      .style('font-weight', '400')
      .style('fill', CONFIG.colors.label.default)
      .style('pointer-events', 'none')
      .style('opacity', State.showLabels ? 1 : 0)
      .text(d => d.title);
  },

  setupHoverEffects(node, link, label) {
    const adjacencyMap = new Map();
    link.each(function(l) {
      const sourceId = l.source.id || l.source;
      const targetId = l.target.id || l.target;
      
      if (!adjacencyMap.has(sourceId)) adjacencyMap.set(sourceId, new Set());
      if (!adjacencyMap.has(targetId)) adjacencyMap.set(targetId, new Set());
      
      adjacencyMap.get(sourceId).add(targetId);
      adjacencyMap.get(targetId).add(sourceId);
    });

    node.on('mouseenter', function(event, d) {
      const connectedNodes = adjacencyMap.get(d.id) || new Set();
      
      node
        .style('opacity', n => {
          if (n.id === d.id || connectedNodes.has(n.id)) return 1;
          return 0.15;  // Dim non-connected
        })
        .attr('fill', n => {
          if (n.id === d.id || connectedNodes.has(n.id)) {
            return CONFIG.colors.node.highlighted;  // Brighter color
          }
          return CONFIG.colors.node.default;
        })
        .attr('stroke', n => {
          if (n.id === d.id || connectedNodes.has(n.id)) {
            return CONFIG.colors.node.strokeHighlight;
          }
          return CONFIG.colors.node.stroke;
        });
      
      State.baseLinks.attr('stroke', CONFIG.colors.link.dimmed);  // Dim all base links
      
      State.highlightLinks.each(function(l) {
        const sourceId = l.source.id || l.source;
        const targetId = l.target.id || l.target;
        const isConnected = sourceId === d.id || targetId === d.id;
        
        if (isConnected) {
          const lineLength = this.getTotalLength();
          
          d3.select(this)
            .style('opacity', 1)
            .style('stroke-dasharray', lineLength + ' ' + lineLength)
            .style('stroke-dashoffset', lineLength)  // Start hidden (line at end)
            .transition()
            .duration(500)
            .ease(d3.easeQuadOut)
            .style('stroke-dashoffset', 0);  // Draw to visible (line fills in)
        } else {
          d3.select(this)
            .style('opacity', 0)
            .style('stroke-dasharray', 'none');
        }
      });
      if (State.showLabels) {
        label.style('opacity', n => {
          if (n.id === d.id || connectedNodes.has(n.id)) return 1;
          return 0.2;
        });
      }
    });

    node.on('mouseleave', function() {
      node
        .style('opacity', 1)
        .attr('fill', CONFIG.colors.node.default)
        .attr('stroke', CONFIG.colors.node.stroke);
      State.baseLinks.attr('stroke', CONFIG.colors.link.default);
      State.highlightLinks
        .interrupt()
        .style('opacity', 0)
        .style('stroke-dasharray', 'none')
        .style('stroke-dashoffset', 0);
      
      if (State.showLabels) {
        label.style('opacity', 1);
      }
    });
  },
};
