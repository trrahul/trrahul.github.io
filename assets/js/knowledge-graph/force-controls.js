/**
 * Knowledge Graph - Force Controls
 * Handles force simulation parameters: center, repel, link force, link distance
 * @module knowledge-graph/force-controls
 */

import { State } from './state.js';
import { CONFIG } from './config.js';

export const ForceControls = {
  init() {
    this.ensureForceSettings();
    this.setupCenterForceSlider();
    this.setupRepelForceSlider();
    this.setupLinkForceSlider();
    this.setupLinkDistanceSlider();
  },

  setupCenterForceSlider() {
    const centerForce = document.getElementById('center-force');
    const centerForceValue = document.getElementById('center-force-value');
    if (!centerForce || !centerForceValue) return;

    centerForce.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      centerForceValue.textContent = value.toFixed(1);
      this.updateSimulationForce('center', value);
    });
  },

  setupRepelForceSlider() {
    const repelForce = document.getElementById('repel-force');
    const repelForceValue = document.getElementById('repel-force-value');
    if (!repelForce || !repelForceValue) return;

    repelForce.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      repelForceValue.textContent = value.toFixed(0);
      this.updateSimulationForce('charge', value);
    });
  },

  setupLinkForceSlider() {
    const linkForce = document.getElementById('link-force');
    const linkForceValue = document.getElementById('link-force-value');
    if (!linkForce || !linkForceValue) return;

    linkForce.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      linkForceValue.textContent = value.toFixed(1);
      this.updateSimulationForce('link', value);
    });
  },

  setupLinkDistanceSlider() {
    const linkDistance = document.getElementById('link-distance');
    const linkDistanceValue = document.getElementById('link-distance-value');
    if (!linkDistance || !linkDistanceValue) return;

    linkDistance.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      linkDistanceValue.textContent = value.toFixed(0);
      this.updateSimulationForce('linkDistance', value);
    });
  },

  /**
   * Update simulation force parameter
   * @param {string} forceType - Type of force to update
   * @param {number} value - New value for the force
   */
  updateSimulationForce(forceType, value) {
    if (!State.simulation) return;

    this.ensureForceSettings();
    this.storeForceSetting(forceType, value);

    switch (forceType) {
      case 'center':
        State.simulation.force('center', d3.forceCenter().strength(value));
        break;
      case 'charge':
        State.simulation.force('charge', d3.forceManyBody().strength(value));
        break;
      case 'link':
        const currentLinkForce = State.simulation.force('link');
        if (currentLinkForce) {
          currentLinkForce.strength(value);
        }
        break;
      case 'linkDistance':
        const linkForce = State.simulation.force('link');
        if (linkForce) {
          linkForce.distance(value);
        }
        break;
    }

    State.simulation.alpha(0.3).restart();
  },

  resetToDefaults() {
    this.setSliderValue('center-force', CONFIG.simulation.centerForce);
    this.setSliderValue('repel-force', CONFIG.simulation.chargeStrength);
    this.setSliderValue('link-force', CONFIG.simulation.linkStrength);
    this.setSliderValue('link-distance', CONFIG.simulation.linkDistance);

    this.ensureForceSettings();
    this.updateSimulationForce('center', CONFIG.simulation.centerForce);
    this.updateSimulationForce('charge', CONFIG.simulation.chargeStrength);
    this.updateSimulationForce('link', CONFIG.simulation.linkStrength);
    this.updateSimulationForce('linkDistance', CONFIG.simulation.linkDistance);
  },

  ensureForceSettings() {
    if (!State.forceSettings) {
      State.forceSettings = {
        charge: CONFIG.simulation.chargeStrength,
        linkDistance: CONFIG.simulation.linkDistance,
        linkStrength: CONFIG.simulation.linkStrength,
        center: CONFIG.simulation.centerForce,
      };
    }
  },

  storeForceSetting(forceType, value) {
    if (!State.forceSettings) {
      this.ensureForceSettings();
    }

    switch (forceType) {
      case 'charge':
        State.forceSettings.charge = value;
        break;
      case 'linkDistance':
        State.forceSettings.linkDistance = value;
        break;
      case 'link':
        State.forceSettings.linkStrength = value;
        break;
      case 'center':
        State.forceSettings.center = value;
        break;
      default:
        break;
    }
  },

  setSliderValue(id, value) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);
    
    if (slider) {
      slider.value = value;
      if (valueDisplay) {
        valueDisplay.textContent = value.toFixed(id.includes('distance') || id.includes('repel') ? 0 : 1);
      }
    }
  }
};
