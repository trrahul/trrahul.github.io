import { State } from '../state.js';

/**
 * Responsible for capturing baseline positions from the current graph and computing cluster centers.
 * Keeps logic isolated from the animation orchestrator to satisfy SRP.
 */
export class BaselineService {
  /**
   * @param {import('./animation-logger.js').AnimationLogger} logger
   */
  constructor(logger) {
    this.logger = logger;
    this.bounds = null;
    this.center = null;
  }

  /**
   * Captures baseline positions from the active SVG, simulation, or saved graph state.
   * @param {{ currentData?: import('../state.js').GraphData, simulation?: d3.Simulation }} savedGraphState
   * @returns {Map<string|number, {x:number,y:number}>}
   */
  captureBaselinePositions(savedGraphState) {
    const positions = new Map();
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    const updateBounds = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    };

    const recordPosition = (id, x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }
      positions.set(id, { x, y });
      updateBounds(x, y);
    };

    const recordFromSvg = () => {
      if (!State.g || typeof State.g.selectAll !== 'function') {
        return;
      }

      const circleSelection = State.g.selectAll('circle');
      if (circleSelection.empty()) {
        return;
      }

      circleSelection.each(function(d) {
        const datum = d ?? null;
        let nodeId = datum?.id;

        if (nodeId === undefined || nodeId === null) {
          const attrId = this.getAttribute('data-node-id');
          if (attrId && attrId.trim() !== '') {
            nodeId = Number.isNaN(Number(attrId)) ? attrId : Number(attrId);
          }
        }

        if (nodeId === undefined || nodeId === null) {
          return;
        }

        const circle = typeof d3 !== 'undefined' ? d3.select(this) : null;
        const attrX = circle ? circle.attr('cx') : this.getAttribute('cx');
        const attrY = circle ? circle.attr('cy') : this.getAttribute('cy');
        const x = Number.isFinite(datum?.x) ? datum.x : Number.parseFloat(attrX);
        const y = Number.isFinite(datum?.y) ? datum.y : Number.parseFloat(attrY);

        const normalizedId = (typeof nodeId === 'string' && nodeId.trim() !== '' && !Number.isNaN(Number(nodeId)))
          ? Number(nodeId)
          : nodeId;

        recordPosition(normalizedId, x, y);
      });
    };

    const recordFromSimulation = (simulation) => {
      if (!positions.size && simulation && typeof simulation.nodes === 'function') {
        simulation.nodes().forEach(node => {
          if (!node || node.id === undefined) {
            return;
          }
          recordPosition(node.id, node.x, node.y);
        });
      }
    };

    const recordFromSavedData = (currentData) => {
      if (!positions.size && currentData?.nodes) {
        currentData.nodes.forEach(node => {
          if (!node || node.id === undefined) {
            return;
          }
          recordPosition(node.id, node.x, node.y);
        });
      }
    };

    recordFromSvg();
    recordFromSimulation(savedGraphState?.simulation ?? State.simulation);
    recordFromSavedData(savedGraphState?.currentData ?? State.currentData);

    if (positions.size && Number.isFinite(bounds.minX)) {
      this.bounds = { ...bounds };
      this.center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };
    } else {
      this.bounds = null;
      this.center = null;
    }

    this.logger?.debug('baseline', 'Captured baseline node positions', {
      positionCount: positions.size,
      bounds: this.bounds,
    });

    return positions;
  }

  /**
   * Computes cluster centers, preferring baseline averages when available.
   * @param {Array<{nodes:Array, category:string}>} clusters
   * @param {Map<string|number, {x:number,y:number}>} baselinePositions
   * @returns {Array<{x:number,y:number}>}
   */
  computeClusterCenters(clusters, baselinePositions) {
    if (!Array.isArray(clusters) || !clusters.length) {
      return [];
    }

    if (baselinePositions && baselinePositions.size) {
      return clusters.map(cluster => {
        const coords = cluster.nodes
          .map(node => baselinePositions.get(node.id))
          .filter(Boolean);

        if (!coords.length) {
          return { ...this.getDefaultCenter() };
        }

        const avg = coords.reduce((acc, pos) => {
          acc.x += pos.x;
          acc.y += pos.y;
          return acc;
        }, { x: 0, y: 0 });

        return {
          x: avg.x / coords.length,
          y: avg.y / coords.length,
        };
      });
    }

    const clusterCount = clusters.length;
    const width = State.width || 800;
    const height = State.height || 600;
    const radius = Math.min(width, height) / 3;
    const centerX = width / 2;
    const centerY = height / 2;

    if (clusterCount === 1) {
      return [{ x: centerX, y: centerY }];
    }

    const centers = [];
    for (let i = 0; i < clusterCount; i += 1) {
      const angle = (2 * Math.PI * i) / clusterCount;
      centers.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    return centers;
  }

  /**
   * Gets default center coordinate when no baseline captured.
   * @returns {{x:number,y:number}}
   */
  getDefaultCenter() {
    if (this.center) {
      return { ...this.center };
    }
    return {
      x: (State.width || 800) / 2,
      y: (State.height || 600) / 2,
    };
  }
}
