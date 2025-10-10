import { State } from '../state.js';
import { CONFIG } from '../config.js';

/**
 * Handles viewport focus transitions during animation.
 */
export class FocusController {
  /**
   * @param {{
   *  logger: import('./animation-logger.js').AnimationLogger,
   *  getSimulation: () => d3.Simulation | null,
   * }} deps
   */
  constructor({ logger, getSimulation }) {
    this.logger = logger;
    this.getSimulation = typeof getSimulation === 'function' ? getSimulation : () => null;
    this.focusTimer = null;
  }

  clearTimer() {
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
      this.focusTimer = null;
    }
  }

  /**
   * Schedules focus on the target node with retries while simulation settles.
   * @param {Array} nodeCopies
   * @param {string|number} focusNodeId
   * @param {number} attempt
   */
  scheduleFocus(nodeCopies, focusNodeId, attempt = 0) {
    const targetNode = nodeCopies.find(n => n.id === focusNodeId);
    if (!targetNode) {
      return;
    }

    if (Number.isFinite(targetNode.x) && Number.isFinite(targetNode.y)) {
      this.focusOnNode(targetNode);
      return;
    }

    const maxAttempts = CONFIG.animation.focusRetryAttempts ?? 20;
    if (attempt >= maxAttempts) {
      this.logger?.warn('focus', 'Focus retry limit reached for node', {
        focusNodeId,
        attempts: attempt,
      });
      return;
    }

    this.clearTimer();
    const simulation = this.getSimulation();
    const dynamicDelay = CONFIG.animation.focusRetryDelay ?? Math.max(200, Math.min(600, Math.round((simulation?.alpha?.() ?? 0.3) * 1000)));
    this.focusTimer = setTimeout(() => {
      this.scheduleFocus(nodeCopies, focusNodeId, attempt + 1);
    }, dynamicDelay);
  }

  /**
   * Performs the actual zoom transform to center on a node.
   * @param {{id:string|number,title:string,x:number,y:number}} node
   */
  focusOnNode(node) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      return;
    }

    const svgElement = State.svg?.node();
    if (!svgElement || !State.zoom) {
      return;
    }

    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;
    const scale = 1.5;
    const translateX = -node.x * scale + width / 2;
    const translateY = -node.y * scale + height / 2;

    const transform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    State.svg.transition()
      .duration(800)
      .call(State.zoom.transform, transform);

    this.logger?.debug('focus', 'Focused viewport on node', {
      id: node.id,
      title: node.title,
      x: node.x,
      y: node.y,
    });
  }
}
