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
import { Utils } from './utils.js';

export const GraphRenderer = {
  render(data) {
    const { nodes, links } = DataLoader.createCopy(data);

    const palette = Utils.resolveGraphPalette(State.container);
    State.render.palette = palette;

    State.g.selectAll('*').remove();

    this.addArrowMarkers(palette);

    const link = this.createLinks(links, palette);

    const node = this.createNodes(nodes, palette);

    const label = this.createLabels(nodes, palette);

    const simulation = ForceSimulation.create(nodes, links);

    ForceSimulation.onTick(link, node, label);

    this.setupDrag(node, simulation);

    this.setupClickHandler(node, simulation);

    this.setupHoverEffects(node, link, label, palette);

    ZoomController.fitToGraph();
  },

  addArrowMarkers(palette) {
    let defs = State.svg.select('defs');
    if (defs.empty()) {
      defs = State.svg.append('defs');
    }
    defs.selectAll('#arrowhead').remove();
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
      .attr('fill', palette.linkArrow);
  },

  createLinks(links, palette) {
    const linkGroup = State.g.append('g');
    const baseLinks = linkGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link-base')
      .attr('stroke', palette.linkDefault)
      .attr('stroke-width', CONFIG.visual.linkStrokeWidth)
      .attr('marker-end', 'url(#arrowhead)');
    baseLinks
      .style('opacity', 0)
      .transition()
      .duration(CONFIG.visual.linkFadeDuration)
      .style('opacity', 1);
    const highlightLinks = linkGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'graph-link-highlight')
      .attr('stroke', palette.linkHighlight)
      .attr('stroke-width', CONFIG.visual.linkStrokeWidth)
      .attr('marker-end', 'url(#arrowhead)')
      .style('opacity', 0);
    State.baseLinks = baseLinks;
    State.highlightLinks = highlightLinks;
    return baseLinks;
  },

  createNodes(nodes, palette) {
    const sizeMultiplier = State.nodeSizeMultiplier || 1;
    const getBaseRadius = d => NodeUtils.getRadius(d) * sizeMultiplier;

    const nodeSelection = State.g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('class', 'graph-node')
      .attr('r', getBaseRadius)
      .attr('fill', palette.nodeDefault)
      .attr('stroke', palette.nodeStroke)
      .attr('stroke-width', CONFIG.node.strokeWidth)
      .style('cursor', 'move')
      .style('transition', 'fill 0.2s ease, stroke 0.2s ease')  // Smooth animation
      .classed('fixed', d => d.fx !== undefined)
      .on('mouseover', (event, d) => TooltipManager.show(event, d))
      .on('mouseout', () => TooltipManager.hide());

    nodeSelection
      .style('opacity', 0)
      .transition()
      .duration(CONFIG.visual.nodeFadeDuration)
      .style('opacity', 1);

    return nodeSelection;
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

  createLabels(nodes, palette) {
    const sizeMultiplier = State.nodeSizeMultiplier || 1;
    const labelSelection = State.g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => NodeUtils.getRadius(d) * sizeMultiplier + CONFIG.visual.labelOffset)
      .attr('alignment-baseline', 'hanging')  // Align text from top edge
      .style('font-size', CONFIG.visual.labelFontSize)
      .style('font-weight', '400')
      .style('fill', palette.labelDefault)
      .style('pointer-events', 'none')
      .style('opacity', State.showLabels ? 1 : 0)
      .text(d => d.title);

    if (State.showLabels) {
      labelSelection
        .style('opacity', 0)
        .transition()
        .duration(CONFIG.visual.nodeFadeDuration)
        .style('opacity', 1);
    }

    return labelSelection;
  },

  setupHoverEffects(node, link, label, palette) {
    const sizeMultiplier = State.nodeSizeMultiplier || 1;
    const getBaseRadius = d => NodeUtils.getRadius(d) * sizeMultiplier;
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
            return palette.nodeHighlight;
          }
          return palette.nodeDefault;
        })
        .attr('stroke', n => {
          if (n.id === d.id || connectedNodes.has(n.id)) {
            return palette.nodeStrokeHighlight;
          }
          return palette.nodeStroke;
        })
        .attr('r', n => {
          const scale = n.id === d.id
            ? CONFIG.visual.nodeHoverScale
            : connectedNodes.has(n.id)
              ? (1 + (CONFIG.visual.nodeHoverScale - 1) / 2)
              : 1;
          const scaled = getBaseRadius(n) * scale;
          return Math.min(scaled, CONFIG.node.maxSize * sizeMultiplier * CONFIG.visual.nodeHoverScale);
        })
        .attr('stroke-width', n => (n.id === d.id || connectedNodes.has(n.id)
          ? CONFIG.visual.nodeHighlightStrokeWidth
          : CONFIG.node.strokeWidth));

      State.baseLinks
        .attr('stroke', palette.linkDimmed)
        .style('opacity', 0.45);
      
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
        label
          .style('opacity', n => (n.id === d.id || connectedNodes.has(n.id) ? 1 : 0.2))
          .style('fill', n => (n.id === d.id || connectedNodes.has(n.id)
            ? palette.labelHighlight
            : palette.labelDimmed));
      }
    });

    node.on('mouseleave', function() {
      node
        .style('opacity', 1)
        .attr('fill', palette.nodeDefault)
        .attr('stroke', palette.nodeStroke)
        .attr('stroke-width', CONFIG.node.strokeWidth)
        .attr('r', n => getBaseRadius(n));
      State.baseLinks
        .attr('stroke', palette.linkDefault)
        .style('opacity', 1);
      State.highlightLinks
        .interrupt()
        .style('opacity', 0)
        .style('stroke-dasharray', 'none')
        .style('stroke-dashoffset', 0);
      
      if (State.showLabels) {
        label
          .style('opacity', 1)
          .style('fill', palette.labelDefault);
      }
    });
  },
};
