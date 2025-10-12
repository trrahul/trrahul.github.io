/**
 * Knowledge Graph - Data Loader
 * @module knowledge-graph/data-loader
 */

import { CONFIG } from './config.js';
import { State } from './state.js';

const DEBUG = CONFIG.debug?.dataLoader || {};

const debugLog = (label, payload) => {
  if (!DEBUG.enabled) {
    return;
  }

  const timestampPrefix = DEBUG.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
  const message = `${timestampPrefix}KnowledgeGraph/DataLoader :: ${label}`;

  if (DEBUG.groupCollapsed && payload !== undefined) {
    console.groupCollapsed(message);
    if (DEBUG.showPayload) {
      console.log(payload);
    }
    console.groupEnd();
  } else if (payload !== undefined && DEBUG.showPayload) {
    console.log(message, payload);
  } else {
    console.log(message);
  }
};

export const DataLoader = {
  async load() {
    try {
      debugLog('fetch:start', { url: CONFIG.dataUrl });

      const response = await fetch(CONFIG.dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      debugLog('fetch:success', { status: response.status, statusText: response.statusText });
      
      const data = await response.json();

      debugLog('parse:complete', {
        nodes: Array.isArray(data?.nodes) ? data.nodes.length : null,
        links: Array.isArray(data?.links) ? data.links.length : null,
      });
      
      // Store a deep copy that never gets mutated
      State.allData = JSON.parse(JSON.stringify(data));
      State.currentData = JSON.parse(JSON.stringify(data));

      debugLog('state:updated', {
        allDataKeys: Object.keys(State.allData || {}),
      });
      
      return State.allData;
    } catch (error) {
      debugLog('fetch:error', { message: error.message });
      console.error('Error loading graph data:', error);
      throw error;
    }
  },
  
  createCopy(data) {
    debugLog('clone:start');
    const clone = {
      nodes: JSON.parse(JSON.stringify(data.nodes)),
      links: JSON.parse(JSON.stringify(data.links)),
    };
    debugLog('clone:complete', {
      nodes: Array.isArray(clone.nodes) ? clone.nodes.length : null,
      links: Array.isArray(clone.links) ? clone.links.length : null,
    });
    return clone;
  },
};
