import { State } from '../state.js';
import { CONFIG } from '../config.js';

/**
 * Handles DOM drawing and force simulation setup for individual animation frames.
 */
export class FrameRenderer {
  /**
   * @param {{
   *  logger: import('./animation-logger.js').AnimationLogger,
   *  previousNodePositions: Map<string|number, {x:number,y:number,vx:number,vy:number}>,
   *  entryAnimations: Map<string|number, any>,
   *  nodeClusterIndex: Map<string|number, number>,
   *  getTimestamp: () => number
   * }} deps
   */
  constructor({ logger, previousNodePositions, entryAnimations, nodeClusterIndex, getTimestamp }) {
    this.logger = logger;
    this.previousNodePositions = previousNodePositions;
    this.entryAnimations = entryAnimations;
    this.nodeClusterIndex = nodeClusterIndex;
    this.getTimestamp = typeof getTimestamp === 'function' ? getTimestamp : Date.now;
  }

  /**
   * Renders a frame and starts a dedicated simulation.
   * @param {{nodes:Array,links:Array,clusterIndex:number,clusterName:string,nodeIndex:number,focusNodeId:number|null}} frame
   * @param {{
   *  baselinePositions: Map<string|number,{x:number,y:number}>,
   *  clusterCenters: Array<{x:number,y:number}>,
   *  fallbackCenter: {x:number,y:number},
   *  forceSettings: {charge:number,linkDistance:number,linkStrength:number},
   * }} options
   * @returns {{nodeCopies:Array, simulation:d3.Simulation}}
   */
  render(frame, { baselinePositions, clusterCenters, fallbackCenter, forceSettings }) {
    const debugEnabled = this.logger?.isEnabled?.() ?? false;

    const { nodes, links } = frame;
    this.logger?.debug('frame', 'Rendering animation frame', {
      nodes: nodes.length,
      links: links.length,
      clusterIndex: frame.clusterIndex,
      clusterName: frame.clusterName,
      nodeIndex: frame.nodeIndex,
      focusNodeId: frame.focusNodeId,
      nodeIds: nodes.map(n => n.id),
    });

    const nodeCopies = nodes.map(n => ({
      ...n,
      clusterIndex: this.nodeClusterIndex.get(n.id) ?? 0,
    }));
    const linkCopies = links.map(l => ({ ...l }));

    const baseline = baselinePositions || new Map();
    const desiredPositions = new Map();
    const jitterRadius = 45;

    nodeCopies.forEach(node => {
      const previous = this.previousNodePositions.get(node.id);
      const clusterCenter = clusterCenters[node.clusterIndex] || fallbackCenter;
      const baselinePosition = baseline.get(node.id);

      if (previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)) {
        desiredPositions.set(node.id, {
          x: previous.x,
          y: previous.y,
          vx: previous.vx || 0,
          vy: previous.vy || 0,
          reused: true,
        });
      } else if (baselinePosition && Number.isFinite(baselinePosition.x) && Number.isFinite(baselinePosition.y)) {
        desiredPositions.set(node.id, {
          x: baselinePosition.x,
          y: baselinePosition.y,
          vx: 0,
          vy: 0,
          reused: false,
          baseline: true,
        });
      } else {
        desiredPositions.set(node.id, {
          x: clusterCenter.x + (Math.random() - 0.5) * jitterRadius,
          y: clusterCenter.y + (Math.random() - 0.5) * jitterRadius,
          vx: 0,
          vy: 0,
          reused: false,
        });
      }
    });

    if (debugEnabled) {
      this.logger.debug('render', 'Frame canvas snapshot before clear', this.captureSvgSnapshot());
    }

    State.g.selectAll('*').remove();

    if (debugEnabled) {
      this.logger.debug('render', 'Frame canvas snapshot after clear', this.captureSvgSnapshot());
    }

    const linkElements = State.g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linkCopies)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', CONFIG.colors.link.default)
      .attr('stroke-width', CONFIG.visual.linkStrokeWidth)
      .attr('marker-end', State.showArrows ? 'url(#arrowhead)' : null);

    const entryLayer = State.g.append('g')
      .attr('class', 'entry-lines');

    this.entryAnimations.clear();

    nodeCopies.forEach(node => {
      const desired = desiredPositions.get(node.id);
      if (!desired) {
        return;
      }

      if (desired.reused) {
        Object.assign(node, {
          x: desired.x,
          y: desired.y,
          vx: desired.vx,
          vy: desired.vy,
          fx: desired.x,
          fy: desired.y,
        });
        return;
      }

  const anchor = this.getEntryAnchor(node, linkCopies, fallbackCenter, baseline, clusterCenters);

      if (anchor.connected) {
        Object.assign(node, {
          x: anchor.x,
          y: anchor.y,
          vx: 0,
          vy: 0,
          fx: anchor.x,
          fy: anchor.y,
        });

        const line = entryLayer.append('line')
          .attr('class', 'entry-line')
          .attr('stroke', CONFIG.animation.entryLineColor)
          .attr('stroke-width', CONFIG.animation.entryLineWidth)
          .attr('stroke-linecap', 'round')
          .attr('x1', anchor.x)
          .attr('y1', anchor.y)
          .attr('x2', anchor.x)
          .attr('y2', anchor.y);

        this.logger?.debug('entry', `Node ${node.id} entering from linked anchor`, {
          anchorX: anchor.x,
          anchorY: anchor.y,
          targetX: desired.x,
          targetY: desired.y,
          linkedNodeId: anchor.linkedNodeId,
        });

        this.entryAnimations.set(node.id, {
          node,
          anchor,
          target: { x: desired.x, y: desired.y },
          startTime: this.getTimestamp(),
          duration: CONFIG.animation.entryDuration,
          line,
        });
      } else {
        Object.assign(node, {
          x: desired.x,
          y: desired.y,
          vx: 0,
          vy: 0,
          fx: desired.x,
          fy: desired.y,
        });

        this.logger?.debug('entry', `Node ${node.id} placed without entry line`, {
          reason: anchor.reason,
          targetX: desired.x,
          targetY: desired.y,
        });
      }
    });

    const nodeElements = State.g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodeCopies)
      .join('circle')
      .attr('class', 'graph-node')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => {
        const baseRadius = CONFIG.node.baseSize + (d.connections || 0) * CONFIG.node.sizeMultiplier;
        return Math.min(baseRadius, CONFIG.node.maxSize) * (State.nodeSizeMultiplier || 1);
      })
      .attr('fill', CONFIG.colors.node.default)
      .style('cursor', 'pointer');

    const labelElements = State.g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodeCopies)
      .join('text')
      .attr('class', 'node-label')
      .text(d => d.title)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', -12)
      .style('opacity', State.textFadeThreshold || 0.9)
      .style('pointer-events', 'none');

    nodeCopies.forEach(n => {
      this.previousNodePositions.set(n.id, {
        x: n.x,
        y: n.y,
        vx: n.vx || 0,
        vy: n.vy || 0,
      });
    });

    const simulation = d3.forceSimulation(nodeCopies)
      .alpha(0.6)
      .velocityDecay(0.4)
      .force('charge', d3.forceManyBody().strength(forceSettings.charge))
      .force('link', d3.forceLink(linkCopies).id(d => d.id)
        .distance(forceSettings.linkDistance)
        .strength(forceSettings.linkStrength))
      .force('collision', d3.forceCollide().radius(d => {
        const baseRadius = CONFIG.node.baseSize + (d.connections || 0) * CONFIG.node.sizeMultiplier;
        return Math.min(baseRadius, CONFIG.node.maxSize) + CONFIG.simulation.collisionRadius;
      }))
      .force('clusterX', d3.forceX(d => {
        const center = clusterCenters[d.clusterIndex] || fallbackCenter;
        return center.x;
      }).strength(0.25))
      .force('clusterY', d3.forceY(d => {
        const center = clusterCenters[d.clusterIndex] || fallbackCenter;
        return center.y;
      }).strength(0.25));

    simulation.on('tick', () => {
      this.updateEntryAnimations();

      linkElements
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => d.source.y || 0)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => d.target.y || 0);

      nodeElements
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      labelElements
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);

      nodeCopies.forEach(n => {
        this.previousNodePositions.set(n.id, {
          x: Number.isFinite(n.fx) ? n.fx : n.x,
          y: Number.isFinite(n.fy) ? n.fy : n.y,
          vx: n.vx,
          vy: n.vy,
        });
      });
    });

    if (debugEnabled) {
      this.logger.debug('render', 'Frame canvas snapshot after element creation', this.captureSvgSnapshot());

      const positionAudit = [];
      State.g.selectAll('circle').each(function(d) {
        const circle = d3.select(this);
        positionAudit.push({
          id: d.id,
          cx: Number(circle.attr('cx')),
          cy: Number(circle.attr('cy')),
          dataX: Number(d.x),
          dataY: Number(d.y),
        });
      });
      this.logger.debug('frame', 'Initial node positions captured before first tick', positionAudit);
    }

    return { nodeCopies, simulation };
  }

  /**
   * Updates entry animations, easing nodes from anchor to target.
   */
  updateEntryAnimations() {
    if (!this.entryAnimations.size) {
      return;
    }

    const now = this.getTimestamp();
    const toRemove = [];

    this.entryAnimations.forEach((anim, nodeId) => {
      const duration = anim.duration || CONFIG.animation.entryDuration || 800;
      const progress = duration <= 0 ? 1 : Math.min(1, (now - anim.startTime) / duration);
      const eased = d3.easeCubicOut(progress);

      const anchorX = Number.isFinite(anim.anchor?.x) ? anim.anchor.x : anim.target.x;
      const anchorY = Number.isFinite(anim.anchor?.y) ? anim.anchor.y : anim.target.y;

      const nextX = anchorX + (anim.target.x - anchorX) * eased;
      const nextY = anchorY + (anim.target.y - anchorY) * eased;

      anim.node.fx = nextX;
      anim.node.fy = nextY;

      if (anim.line) {
        anim.line
          .attr('x1', anchorX)
          .attr('y1', anchorY)
          .attr('x2', nextX)
          .attr('y2', nextY);
      }

      if (progress >= 1) {
        if (CONFIG.animation.freezeNodesAfterEntry) {
          anim.node.fx = anim.target.x;
          anim.node.fy = anim.target.y;
          this.logger?.debug('entry', 'Node frozen at target', {
            id: anim.node.id,
            x: anim.target.x,
            y: anim.target.y,
          });
        } else {
          anim.node.fx = null;
          anim.node.fy = null;
        }

        if (anim.line) {
          anim.line.remove();
        }

        toRemove.push(nodeId);
      }
    });

    toRemove.forEach(id => this.entryAnimations.delete(id));
  }

  /**
   * Determines an entry anchor for nodes joining the graph.
   */
  getEntryAnchor(node, linkCopies, fallbackCenter, baselinePositions, clusterCenters) {
    const baselineTarget = baselinePositions?.get(node.id) || null;

    const connectedAnchors = [];
    if (Array.isArray(linkCopies)) {
      linkCopies.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (sourceId !== node.id && targetId !== node.id) {
          return;
        }

        const otherId = sourceId === node.id ? targetId : sourceId;
        if (!otherId) {
          return;
        }

        const otherPos = this.previousNodePositions.get(otherId);
        if (otherPos && Number.isFinite(otherPos.x) && Number.isFinite(otherPos.y)) {
          connectedAnchors.push({
            nodeId: otherId,
            x: otherPos.x,
            y: otherPos.y,
          });
        }
      });
    }

    if (connectedAnchors.length > 0) {
      let chosen = connectedAnchors[0];
      if (baselineTarget) {
        let minDistance = Infinity;
        connectedAnchors.forEach(anchor => {
          const distance = Math.hypot(anchor.x - baselineTarget.x, anchor.y - baselineTarget.y);
          if (distance < minDistance) {
            minDistance = distance;
            chosen = anchor;
          }
        });
      }

      this.logger?.debug('anchor', `Node ${node.id} anchoring to linked node ${chosen.nodeId}`, {
        anchorX: chosen.x,
        anchorY: chosen.y,
        clusterIndex: node.clusterIndex,
        linkedNodeId: chosen.nodeId,
      });

      return {
        x: chosen.x,
        y: chosen.y,
        connected: true,
        linkedNodeId: chosen.nodeId,
      };
    }

    if (baselineTarget) {
      const jitter = CONFIG.animation.entryBaselineJitter ?? 0;
      let anchorX = baselineTarget.x;
      let anchorY = baselineTarget.y;
      if (jitter > 0) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * jitter;
        anchorX += Math.cos(angle) * distance;
        anchorY += Math.sin(angle) * distance;
      }

      this.logger?.debug('anchor', `Node ${node.id} anchoring near baseline target`, {
        anchorX,
        anchorY,
        baselineX: baselineTarget.x,
        baselineY: baselineTarget.y,
        clusterIndex: node.clusterIndex,
      });

      return {
        x: anchorX,
        y: anchorY,
        connected: false,
        reason: 'baseline',
      };
    }

    if (clusterCenters[node.clusterIndex]) {
      return {
        x: clusterCenters[node.clusterIndex].x,
        y: clusterCenters[node.clusterIndex].y,
        connected: false,
        reason: 'cluster-center',
      };
    }

    this.logger?.debug('anchor', `Node ${node.id} anchoring to fallback center`, fallbackCenter);
    return {
      ...fallbackCenter,
      connected: false,
      reason: 'fallback-center',
    };
  }

  captureSvgSnapshot() {
    if (!State.svg || !State.g) {
      return {
        svgElementCount: 0,
        groupChildCount: 0,
        svgNodeCount: 0,
        groupNodeCount: 0,
      };
    }

    return {
      svgElementCount: State.svg.selectAll('*').size(),
      groupChildCount: State.g.selectAll('*').size(),
      svgNodeCount: State.svg.selectAll('circle').size(),
      groupNodeCount: State.g.selectAll('circle').size(),
    };
  }
}
