import { State } from '../state.js';
import { CONFIG } from '../config.js';
import { AnimationLogger } from './animation-logger.js';
import { BaselineService } from './baseline-service.js';
import { DatasetBuilder } from './dataset-builder.js';
import { FrameRenderer } from './frame-renderer.js';
import { FocusController } from './focus-controller.js';

/**
 * Coordinates the animation workflow while delegating focused responsibilities to helper services.
 */
export const AnimationManager = {
  isAnimating: false,
  animationTimer: null,
  stopScheduled: false,
  currentClusterIndex: 0,
  currentFrameIndex: 0,

  clusters: [],
  frames: [],
  baselinePositions: new Map(),
  clusterCenters: [],

  previousNodePositions: new Map(),
  nodeClusterIndex: new Map(),
  entryAnimations: new Map(),

  savedGraphState: null,
  animationSimulation: null,
  animationStartTime: 0,
  blockingFilterHandler: null,

  logger: null,
  baselineService: null,
  datasetBuilder: null,
  frameRenderer: null,
  focusController: null,

  init() {
    if (!this.logger) {
      this.logger = new AnimationLogger(() => this.getTimestamp());
      this.baselineService = new BaselineService(this.logger);
      this.datasetBuilder = new DatasetBuilder(this.logger);
      this.frameRenderer = new FrameRenderer({
        logger: this.logger,
        previousNodePositions: this.previousNodePositions,
        entryAnimations: this.entryAnimations,
        nodeClusterIndex: this.nodeClusterIndex,
        getTimestamp: () => this.getTimestamp(),
      });
      this.focusController = new FocusController({
        logger: this.logger,
        getSimulation: () => this.animationSimulation,
      });
    }

    this.setupAnimationToggle();
  },

  setupAnimationToggle() {
    const animateGraph = document.getElementById('animate-graph');
    if (!animateGraph) {
      return;
    }

    animateGraph.addEventListener('change', (event) => {
      if (event.target.checked) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    });
  },

  startAnimation() {
    this.logger?.debug('lifecycle', 'Animation start requested');

    if (this.isAnimating) {
      this.logger?.debug('lifecycle', 'Animation already running - aborting duplicate start');
      return;
    }

    if (!State.rawData) {
      this.logger?.debug('lifecycle', 'Animation aborted - no raw data available');
      return;
    }

    this.animationStartTime = this.getTimestamp();
    this.logger?.setStartTime(this.animationStartTime);
    this.isAnimating = true;
    this.stopScheduled = false;
    this.currentClusterIndex = 0;
    this.currentFrameIndex = 0;
    this.previousNodePositions.clear();
    this.nodeClusterIndex.clear();
    this.entryAnimations.clear();
    this.baselinePositions = new Map();
    this.clusterCenters = [];
    this.clusters = [];
    this.frames = [];

    const originalOnFilterChange = State.onFilterChange;
    this.savedGraphState = {
      currentData: State.currentData,
      simulation: State.simulation,
      onFilterChange: originalOnFilterChange,
    };
    this.logger?.debug('state', 'Saved graph state snapshot', {
      nodes: this.savedGraphState.currentData?.nodes?.length ?? 0,
      links: this.savedGraphState.currentData?.links?.length ?? 0,
      hasSimulation: Boolean(this.savedGraphState.simulation),
    });

    this.blockingFilterHandler = (data) => {
      if (this.isAnimating) {
        this.logger?.debug('state', 'Blocked render during animation', {
          requestedNodes: data?.nodes?.length ?? 0,
          requestedLinks: data?.links?.length ?? 0,
        });
        return;
      }
      if (typeof originalOnFilterChange === 'function') {
        originalOnFilterChange(data);
      }
    };
    State.onFilterChange = this.blockingFilterHandler;

    const { nodes: filteredNodes, links: filteredLinks } = this.datasetBuilder.getFilteredDataset();

    if (!filteredNodes.length) {
      this.logger?.debug('lifecycle', 'Animation aborted - no filtered nodes available');
      this.stopAnimation();
      return;
    }

    this.clusters = this.datasetBuilder.groupNodesByCluster(filteredNodes);
    this.baselinePositions = this.baselineService.captureBaselinePositions(this.savedGraphState);
    this.clusterCenters = this.baselineService.computeClusterCenters(this.clusters, this.baselinePositions);
    this.frames = this.datasetBuilder.buildAnimationFrames(this.clusters, filteredLinks, this.nodeClusterIndex);

    this.logger?.debug('prepare', 'Prepared animation dataset', {
      clusters: this.clusters.length,
      frames: this.frames.length,
      filteredNodes: filteredNodes.length,
      filteredLinks: filteredLinks.length,
      baselinePositions: this.baselinePositions.size,
      categories: this.clusters.map(c => ({ name: c.category, nodes: c.nodes.length })),
    });

    if (!this.frames.length) {
      this.stopAnimation();
      return;
    }

    if (this.logger?.isEnabled?.()) {
      this.logger.debug('render', 'Canvas snapshot before clear', this.frameRenderer.captureSvgSnapshot());
    }
    State.g.selectAll('*').remove();
    if (this.logger?.isEnabled?.()) {
      this.logger.debug('render', 'Canvas snapshot after clear', this.frameRenderer.captureSvgSnapshot());
    }

    this.animateNextFrame();
  },

  animateNextFrame() {
    if (!this.isAnimating && !this.stopScheduled && !this.savedGraphState) {
      return;
    }

    if (this.currentFrameIndex >= this.frames.length) {
      this.logger?.debug('sequence', 'Animation complete - scheduling stop', {
        totalFrames: this.frames.length,
        elapsed: this.animationStartTime ? this.getTimestamp() - this.animationStartTime : null,
      });
      if (!this.stopScheduled) {
        this.stopScheduled = true;
        setTimeout(() => {
          if (this.stopScheduled) {
            this.stopScheduled = false;
            this.stopAnimation();
          }
        }, 800);
      }
      return;
    }

    const frame = this.frames[this.currentFrameIndex];
    const isNewCluster = frame.nodeIndex === 0;

    if (isNewCluster) {
      this.currentClusterIndex = frame.clusterIndex;
      this.logger?.debug('sequence', 'Advancing to next cluster', {
        clusterIndex: frame.clusterIndex,
        clusterName: frame.clusterName,
        clusterNumber: frame.clusterIndex + 1,
        clusterCount: this.clusters.length,
      });
    }

    this.logger?.debug('sequence', 'Rendering frame summary', {
      frameNumber: this.currentFrameIndex + 1,
      frameCount: this.frames.length,
      nodeCount: frame.nodes.length,
      linkCount: frame.links.length,
      clusterIndex: frame.clusterIndex,
      isNewCluster,
    });

    if (this.animationSimulation) {
      this.animationSimulation.stop();
      this.animationSimulation = null;
    }

    const { nodeCopies, simulation } = this.frameRenderer.render(frame, {
      baselinePositions: this.baselinePositions,
      clusterCenters: this.clusterCenters,
      fallbackCenter: this.baselineService.getDefaultCenter(),
      forceSettings: this.getActiveForceSettings(),
    });

    this.animationSimulation = simulation;

    if (frame.focusNodeId) {
      this.focusController.clearTimer();
      this.focusController.scheduleFocus(nodeCopies, frame.focusNodeId);
    }

    this.currentFrameIndex += 1;
    this.scheduleNextFrame();
  },

  scheduleNextFrame() {
    this.clearAnimationTimer();
    this.logger?.debug('sequence', 'Scheduling next animation frame', {
      nextFrameIndex: this.currentFrameIndex,
      delayMs: 2500,
    });
    this.animationTimer = setTimeout(() => this.animateNextFrame(), 2500);
  },

  stopAnimation() {
    this.logger?.debug('lifecycle', 'Animation stop requested');

    if (!this.isAnimating && !this.stopScheduled && !this.savedGraphState) {
      this.logger?.debug('lifecycle', 'Stop aborted - animation already restored');
      return;
    }

    this.stopScheduled = false;

    this.clearAnimationTimer();
    this.focusController?.clearTimer();

    const finalPositions = new Map();
    if (this.animationSimulation && this.animationSimulation.nodes()) {
      this.animationSimulation.nodes().forEach(node => {
        if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
          finalPositions.set(node.id, {
            x: node.x,
            y: node.y,
            vx: node.vx || 0,
            vy: node.vy || 0,
          });
        }
      });
    }
    this.logger?.debug('restore', 'Captured final animation positions', {
      nodeCount: finalPositions.size,
    });

    const stateToRestore = this.savedGraphState;
    this.savedGraphState = null;

    if (State.onFilterChange === this.blockingFilterHandler) {
      State.onFilterChange = stateToRestore ? stateToRestore.onFilterChange ?? null : null;
    }
    this.blockingFilterHandler = null;

    if (this.animationSimulation) {
      this.animationSimulation.stop();
      this.animationSimulation = null;
    }

    this.isAnimating = false;
    this.currentClusterIndex = 0;
    this.currentFrameIndex = 0;
    this.clusters = [];
    this.frames = [];
    this.clusterCenters = [];
    this.previousNodePositions.clear();
    this.nodeClusterIndex.clear();
    this.entryAnimations.clear();

    const animateGraph = document.getElementById('animate-graph');
    if (animateGraph) {
      animateGraph.checked = false;
    }

    State.svg.transition()
      .duration(800)
      .call(State.zoom.transform, d3.zoomIdentity)
      .on('end', () => {
        if (stateToRestore) {
          this.logger?.debug('restore', 'Restoring original graph state');

          State.simulation = stateToRestore.simulation;
          State.currentData = stateToRestore.currentData;

          if (State.simulation && finalPositions.size > 0) {
            const nodes = State.simulation.nodes();
            if (nodes) {
              const seededNodes = [];
              nodes.forEach(node => {
                const finalPos = finalPositions.get(node.id);
                if (finalPos && Number.isFinite(finalPos.x) && Number.isFinite(finalPos.y)) {
                  node.x = finalPos.x;
                  node.y = finalPos.y;
                  node.vx = finalPos.vx;
                  node.vy = finalPos.vy;
                  seededNodes.push({
                    id: node.id,
                    x: finalPos.x,
                    y: finalPos.y,
                    vx: finalPos.vx,
                    vy: finalPos.vy,
                  });
                }
              });
              if (seededNodes.length) {
                this.logger?.debug('restore', 'Seeded nodes with animation positions', seededNodes);
              }
              State.simulation.alpha(0.3).restart();
            }
          }

          if (typeof stateToRestore.onFilterChange === 'function') {
            stateToRestore.onFilterChange(stateToRestore.currentData);
          }
          this.logger?.debug('restore', 'Original graph state restored');
        }
      });

    this.logger?.debug('lifecycle', 'Animation stop completed');
  },

  reset() {
    this.logger?.debug('lifecycle', 'Reset requested', {
      wasAnimating: this.isAnimating,
    });
    if (this.isAnimating) {
      this.stopAnimation();
    }
    this.entryAnimations.clear();
    this.focusController?.clearTimer();
  },

  clearAnimationTimer() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
  },

  getTimestamp() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  },

  getActiveForceSettings() {
    const defaults = {
      charge: CONFIG.simulation.chargeStrength,
      linkDistance: CONFIG.simulation.linkDistance,
      linkStrength: CONFIG.simulation.linkStrength,
    };

    if (!State.forceSettings) {
      return defaults;
    }

    const sanitize = (value, fallback) => (
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback
    );

    return {
      charge: sanitize(State.forceSettings.charge, defaults.charge),
      linkDistance: sanitize(State.forceSettings.linkDistance, defaults.linkDistance),
      linkStrength: sanitize(State.forceSettings.linkStrength, defaults.linkStrength),
    };
  },
};
