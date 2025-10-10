/**
 * Knowledge Graph - Data Loader
 * @module knowledge-graph/data-loader
 */

import { CONFIG } from './config.js';
import { State } from './state.js';

export const DataLoader = {
  async load() {
    try {
      const response = await fetch(CONFIG.dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store a deep copy that never gets mutated
      State.allData = JSON.parse(JSON.stringify(data));
      State.currentData = JSON.parse(JSON.stringify(data));
      
      return State.allData;
    } catch (error) {
      console.error('Error loading graph data:', error);
      throw error;
    }
  },
  
  createCopy(data) {
    return {
      nodes: JSON.parse(JSON.stringify(data.nodes)),
      links: JSON.parse(JSON.stringify(data.links)),
    };
  },
};
