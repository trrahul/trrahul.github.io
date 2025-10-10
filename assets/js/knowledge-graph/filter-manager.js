/**
 * Knowledge Graph - Filter Manager
 * @module knowledge-graph/filter-manager
 */

import { State } from './state.js';

export const FilterManager = {
  buildCategoryFilters(data) {
    const categories = [...new Set(data.nodes.map(n => n.category))].sort();
    const selectElement = document.getElementById('category-select');
    
    if (!selectElement) return;
    
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat.replace(/-/g, ' ');
      selectElement.appendChild(option);
    });
    selectElement.addEventListener('change', (e) => {
      if (e.target.value === 'all') {
        State.activeCategories.clear();
      } else {
        State.activeCategories.clear();
        State.activeCategories.add(e.target.value);
      }
      this.applyFilter();
    });
  },
  
  setupLabelToggle() {
    const showLabelsCheckbox = document.getElementById('show-labels');
    if (!showLabelsCheckbox) return;
    
    showLabelsCheckbox.addEventListener('change', (e) => {
      State.showLabels = e.target.checked;
      d3.selectAll('.node-label')
        .style('opacity', State.showLabels ? 0.9 : 0);
    });
  },
  
  /**
   * Note: Calls State.onFilterChange callback which is set by graph-main.
   */
  applyFilter() {
    if (!State.allData) return;
    
    let filteredData;
    
    if (State.activeCategories.size === 0) {
      filteredData = State.allData;
    } else {
      const filteredNodes = State.allData.nodes.filter(n => 
        State.activeCategories.has(n.category)
      );
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = State.allData.links.filter(l => 
        nodeIds.has(l.source) && nodeIds.has(l.target)
      );
      
      filteredData = { nodes: filteredNodes, links: filteredLinks };
    }
    
    State.currentData = filteredData;
    
    if (State.onFilterChange) {
      State.onFilterChange(filteredData);
    }
  },
};
