/**
 * Knowledge Graph - Application State
 * @module knowledge-graph/state
 */

import { CONFIG } from './config.js';

/**
 * @typedef {object} GraphData
 * @property {Array} nodes
 * @property {Array} links
 */

/**
 * Centralized application state partitioned by responsibility.
 * Keeps modules small and explicit about the data they mutate.
 */
export const State = {
  /** @type {{ svg: any, graphRoot: any, container: HTMLElement | null, tooltip: any }} */
  elements: {
    svg: null,
    graphRoot: null,
    container: null,
    tooltip: null,
  },

  /** @type {{ all: GraphData | null, current: GraphData | null, raw: GraphData | null }} */
  data: {
    all: null,
    current: null,
    raw: null,
  },

  /** @type {{ simulation: any, zoom: any, categoryColors: any, baseLinks: any, highlightLinks: any, palette: Record<string, string> | null }} */
  render: {
    simulation: null,
    zoom: null,
    categoryColors: null,
    baseLinks: null,
    highlightLinks: null,
    palette: null,
  },

  /** @type {{ activeCategories: Set<string>, showLabels: boolean, searchQuery: string, showTags: boolean, showAttachments: boolean, existingFilesOnly: boolean, showOrphans: boolean }} */
  filters: {
    activeCategories: new Set(),
    showLabels: true,
    searchQuery: '',
    showTags: true,
    showAttachments: true,
    existingFilesOnly: true,
    showOrphans: true,
  },

  /** @type {{ showArrows: boolean, textFadeThreshold: number, nodeSizeMultiplier: number, linkThicknessMultiplier: number }} */
  display: {
    showArrows: true,
    textFadeThreshold: 0.9,
    nodeSizeMultiplier: 1.0,
    linkThicknessMultiplier: 1.0,
  },

  /** @type {{ interval: number | null, dataset: unknown }} */
  animation: {
    interval: null,
    dataset: null,
  },

  /** @type {{ forceSettings: { charge: number, linkDistance: number, linkStrength: number, center: number } }} */
  physics: {
    forceSettings: {
      charge: CONFIG.simulation.chargeStrength,
      linkDistance: CONFIG.simulation.linkDistance,
      linkStrength: CONFIG.simulation.linkStrength,
      center: CONFIG.simulation.centerForce,
    },
  },

  /** @type {{ onFilterChange: ((data: GraphData) => void) | null }} */
  callbacks: {
    onFilterChange: null,
  },

  /** @type {{ width: number, height: number }} */
  dimensions: {
    width: 0,
    height: 0,
  },
};

const legacyPropertyMap = {
  svg: ['elements', 'svg'],
  g: ['elements', 'graphRoot'],
  container: ['elements', 'container'],
  tooltip: ['elements', 'tooltip'],
  allData: ['data', 'all'],
  currentData: ['data', 'current'],
  rawData: ['data', 'raw'],
  simulation: ['render', 'simulation'],
  zoom: ['render', 'zoom'],
  categoryColors: ['render', 'categoryColors'],
  baseLinks: ['render', 'baseLinks'],
  highlightLinks: ['render', 'highlightLinks'],
  activeCategories: ['filters', 'activeCategories'],
  showLabels: ['filters', 'showLabels'],
  searchQuery: ['filters', 'searchQuery'],
  showTags: ['filters', 'showTags'],
  showAttachments: ['filters', 'showAttachments'],
  existingFilesOnly: ['filters', 'existingFilesOnly'],
  showOrphans: ['filters', 'showOrphans'],
  showArrows: ['display', 'showArrows'],
  textFadeThreshold: ['display', 'textFadeThreshold'],
  nodeSizeMultiplier: ['display', 'nodeSizeMultiplier'],
  linkThicknessMultiplier: ['display', 'linkThicknessMultiplier'],
  animationInterval: ['animation', 'interval'],
  animationData: ['animation', 'dataset'],
  forceSettings: ['physics', 'forceSettings'],
  onFilterChange: ['callbacks', 'onFilterChange'],
  width: ['dimensions', 'width'],
  height: ['dimensions', 'height'],
};

Object.entries(legacyPropertyMap).forEach(([legacyKey, [section, prop]]) => {
  Object.defineProperty(State, legacyKey, {
    enumerable: true,
    configurable: true,
    get() {
      return State[section][prop];
    },
    set(value) {
      State[section][prop] = value;
    },
  });
});
