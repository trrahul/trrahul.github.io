/**
 * Knowledge Graph - Focus Manager
 * Handles viewport focus logic for large graph clusters.
 * @module knowledge-graph/focus-manager
 */

import { CONFIG } from './config.js';
import { State } from './state.js';
import { AnimationManager } from './animation-manager.js';

const DEFAULT_MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY = 200;
const RETRY_STEP_DELAY = 120;
const DEFAULT_DELAY_MS = 240;
const MIN_DELAY_MS = 0;
const MAX_DELAY_MS = 600;
const DEFAULT_ZOOM_OUT_STEPS = 2;

export const FocusManager = {
  scheduleLargestClusterFocus({ nodes, links, simulation, maxAttempts = DEFAULT_MAX_ATTEMPTS, delayMs }) {
    if (!Array.isArray(nodes) || !nodes.length) {
      return;
    }

    if (this.isAnimationRunning()) {
      return;
    }

    const focusState = this.getFocusState();
    this.clearPendingFocus();
    focusState.applied = false;
    focusState.lastCluster = null;

    const attemptFocus = (attempt = 0) => {
      if (focusState.applied || this.isAnimationRunning()) {
        return;
      }

      const result = this.focusLargestCluster({ nodes, links, animate: true });
      if (!result.success && attempt < maxAttempts) {
        focusState.pendingTimer = setTimeout(
          () => attemptFocus(attempt + 1),
          RETRY_BASE_DELAY + attempt * RETRY_STEP_DELAY
        );
      }
    };

    const effectiveDelay = this.normalizeDelay(delayMs);
    if (simulation && typeof simulation.on === 'function') {
      focusState.simulationRef = simulation;
      simulation.on('end.focusCluster', () => attemptFocus(maxAttempts));
    }

    if (effectiveDelay <= 0) {
      attemptFocus(0);
    } else {
      focusState.pendingTimer = setTimeout(() => attemptFocus(0), effectiveDelay);
    }
  },

  focusLargestCluster({ nodes, links = [], animate = true }) {
    const focusState = this.getFocusState();

    if (!State.svg || !State.zoom) {
      return { success: false };
    }

    if (this.isAnimationRunning()) {
      return { success: false };
    }

    const positionedNodes = Array.isArray(nodes)
      ? nodes.filter(node => Number.isFinite(node?.x) && Number.isFinite(node?.y))
      : [];

    if (!positionedNodes.length) {
      return { success: false };
    }

    const { nodesByKey, adjacency } = this.buildAdjacency(positionedNodes, links);
    if (!nodesByKey.size) {
      return { success: false };
    }

    const clusters = this.computeClusters(nodesByKey, adjacency);
    if (!clusters.length) {
      return { success: false };
    }

    const targetCluster = this.pickLargestCluster(clusters);
    if (!targetCluster) {
      return { success: false };
    }

    const bounds = this.computeBounds(targetCluster.nodes);
    if (!bounds) {
      return { success: false };
    }

    const containerWidth = this.getContainerWidth();
    const containerHeight = this.getContainerHeight();

    const paddedWidth = Math.max(bounds.width, 1) * (CONFIG.zoom.fitPadding ?? 1.2);
    const paddedHeight = Math.max(bounds.height, 1) * (CONFIG.zoom.fitPadding ?? 1.2);

    const scaleExtent = Array.isArray(CONFIG.zoom.scaleExtent) ? CONFIG.zoom.scaleExtent : [0.1, 4];
    let scale = Math.min(containerWidth / paddedWidth, containerHeight / paddedHeight);
    if (!Number.isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    scale *= this.getFocusZoomAdjustment();
    scale = Math.min(Math.max(scale, scaleExtent[0]), scaleExtent[1]);

    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;

    const translateX = containerWidth / 2 - centerX * scale;
    const translateY = containerHeight / 2 - centerY * scale;

    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    const selection = animate
      ? State.svg.transition().duration(CONFIG.zoom.fitDuration ?? 750)
      : State.svg;

    selection.call(State.zoom.transform, transform);

    this.clearPendingFocus();
    focusState.applied = true;
    focusState.lastCluster = {
      size: targetCluster.nodes.length,
      ids: targetCluster.nodes.map(n => String(n.id)),
      centroid: { x: centerX, y: centerY },
    };

    return { success: true, cluster: targetCluster, transform };
  },

  clearPendingFocus() {
    const focusState = this.getFocusState();
    if (focusState.pendingTimer) {
      clearTimeout(focusState.pendingTimer);
      focusState.pendingTimer = null;
    }
    if (focusState.simulationRef && typeof focusState.simulationRef.on === 'function') {
      focusState.simulationRef.on('end.focusCluster', null);
    }
    focusState.simulationRef = null;
  },

  getFocusState() {
    if (!State.render.focus) {
      State.render.focus = {
        pendingTimer: null,
        applied: false,
        lastCluster: null,
        simulationRef: null,
      };
    } else if (!Object.prototype.hasOwnProperty.call(State.render.focus, 'simulationRef')) {
      State.render.focus.simulationRef = null;
    }
    return State.render.focus;
  },

  normalizeDelay(delayMs) {
    if (typeof delayMs === 'number' && Number.isFinite(delayMs)) {
      return Math.min(Math.max(delayMs, MIN_DELAY_MS), MAX_DELAY_MS);
    }

    const configuredDelay = typeof CONFIG.zoom?.focusDelay === 'number'
      ? CONFIG.zoom.focusDelay
      : null;
    if (Number.isFinite(configuredDelay)) {
      return Math.min(Math.max(configuredDelay, MIN_DELAY_MS), MAX_DELAY_MS);
    }

    return DEFAULT_DELAY_MS;
  },

  getFocusZoomAdjustment() {
    const zoomOutStep = CONFIG.zoom?.scaleByOut;
    if (typeof zoomOutStep === 'number' && zoomOutStep > 0 && zoomOutStep < 1) {
      return Math.pow(zoomOutStep, DEFAULT_ZOOM_OUT_STEPS);
    }

    const zoomInStep = CONFIG.zoom?.scaleByIn;
    if (typeof zoomInStep === 'number' && zoomInStep > 1) {
      return 1 / Math.pow(zoomInStep, DEFAULT_ZOOM_OUT_STEPS);
    }

    return 1;
  },

  isAnimationRunning() {
    return Boolean(AnimationManager?.isAnimating);
  },

  buildAdjacency(nodes, links) {
    const nodesByKey = new Map();
    const adjacency = new Map();

    nodes.forEach(node => {
      const key = this.toKey(node.id);
      if (!key) return;
      nodesByKey.set(key, node);
      adjacency.set(key, new Set());
    });

    if (Array.isArray(links)) {
      links.forEach(link => {
        const sourceKey = this.toKey(link?.source);
        const targetKey = this.toKey(link?.target);
        if (!sourceKey || !targetKey) return;
        if (!adjacency.has(sourceKey) || !adjacency.has(targetKey)) return;
        adjacency.get(sourceKey).add(targetKey);
        adjacency.get(targetKey).add(sourceKey);
      });
    }

    return { nodesByKey, adjacency };
  },

  computeClusters(nodesByKey, adjacency) {
    const visited = new Set();
    const clusters = [];

    for (const [key, node] of nodesByKey.entries()) {
      if (visited.has(key)) {
        continue;
      }

      const queue = [key];
      const clusterNodes = [];
      let totalConnections = 0;

      while (queue.length) {
        const currentKey = queue.pop();
        if (!currentKey || visited.has(currentKey)) {
          continue;
        }
        visited.add(currentKey);

        const currentNode = nodesByKey.get(currentKey);
        if (!currentNode) {
          continue;
        }

        clusterNodes.push(currentNode);
        totalConnections += Number(currentNode.connections) || 0;

        const neighbors = adjacency.get(currentKey);
        if (!neighbors) {
          continue;
        }

        neighbors.forEach(neighborKey => {
          if (!visited.has(neighborKey)) {
            queue.push(neighborKey);
          }
        });
      }

      clusters.push({
        nodes: clusterNodes,
        totalConnections,
      });
    }

    return clusters;
  },

  pickLargestCluster(clusters) {
    return clusters.reduce((best, cluster) => {
      if (!best) return cluster;
      if (cluster.nodes.length > best.nodes.length) return cluster;
      if (cluster.nodes.length < best.nodes.length) return best;

      if (cluster.totalConnections > best.totalConnections) return cluster;
      if (cluster.totalConnections < best.totalConnections) return best;

      const clusterFirst = cluster.nodes[0]?.title || '';
      const bestFirst = best.nodes[0]?.title || '';
      return clusterFirst.localeCompare(bestFirst) < 0 ? cluster : best;
    }, null);
  },

  computeBounds(nodes) {
    const finiteNodes = nodes.filter(node => Number.isFinite(node?.x) && Number.isFinite(node?.y));
    if (!finiteNodes.length) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    finiteNodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
    };
  },

  getContainerWidth() {
    if (State.container instanceof HTMLElement) {
      const rect = State.container.getBoundingClientRect();
      if (rect.width) {
        return rect.width;
      }
      if (State.container.clientWidth) {
        return State.container.clientWidth;
      }
    }

  const svgNode = State.svg && typeof State.svg.node === 'function' ? State.svg.node() : null;
    if (svgNode && svgNode.clientWidth) {
      return svgNode.clientWidth;
    }

    return State.width || CONFIG.dimensions.width || 1200;
  },

  getContainerHeight() {
    if (State.container instanceof HTMLElement) {
      const rect = State.container.getBoundingClientRect();
      if (rect.height) {
        return rect.height;
      }
      if (State.container.clientHeight) {
        return State.container.clientHeight;
      }
    }

  const svgNode = State.svg && typeof State.svg.node === 'function' ? State.svg.node() : null;
    if (svgNode && svgNode.clientHeight) {
      return svgNode.clientHeight;
    }

    return State.height || CONFIG.dimensions.height || 600;
  },

  toKey(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      if (Object.prototype.hasOwnProperty.call(value, 'id')) {
        return String(value.id);
      }
      if (Object.prototype.hasOwnProperty.call(value, 'data') && value.data && Object.prototype.hasOwnProperty.call(value.data, 'id')) {
        return String(value.data.id);
      }
      if (Object.prototype.hasOwnProperty.call(value, 'index')) {
        return String(value.index);
      }
    }
    return String(value);
  },
};
