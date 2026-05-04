/**
 * Terminal Home - Main Entry Point
 * Bootstrap and initialize the terminal interface
 */

import { CONFIG } from './config.js';
import { StateStore } from './state.js';
import { CategoryHierarchy } from './category-hierarchy.js';
import { NavigationManager } from './navigation-manager.js';
import { ViewRenderer } from './view-renderer.js';
import { SortManager } from './sort-manager.js';
import { SearchController } from './filter-manager.js';
import { EventManager } from './event-manager.js';
import { CommandExecutor } from './command-executor.js';

/**
 * Load category hierarchy data
 */
async function loadHierarchyData() {
  try {
    const response = await fetch('/assets/js/data/category-hierarchy.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    CategoryHierarchy.initialize(data);
    console.log('[Terminal Home] Loaded hierarchy:', data.metadata);
    return true;
  } catch (error) {
    console.error('[Terminal Home] Failed to load hierarchy data:', error);
    return false;
  }
}

/**
 * Load contextual search index data
 */
async function loadSearchIndex() {
  try {
    const url = CategoryHierarchy.getSearchIndexUrl();
    const response = await fetch(url, { cache: 'default' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const postCount = Array.isArray(data.posts) ? data.posts.length : 0;
    const segmentCount =
      typeof data.segment_count === 'number' ? data.segment_count : 'unknown';
    console.log('[Terminal Home] Loaded search index:', {
      posts: postCount,
      segments: segmentCount,
    });
    return data;
  } catch (error) {
    console.warn(
      '[Terminal Home] Search index unavailable, falling back to basic search:',
      error,
    );
    return null;
  }
}

/**
 * Initialize the terminal home interface
 */
async function initialize() {
  try {
    const state = new StateStore();
    state.cacheElements(CONFIG.selectors);

    const hierarchyLoaded = await loadHierarchyData();
    if (!hierarchyLoaded) {
      console.error('[Terminal Home] Cannot initialize without hierarchy data');
      return;
    }

    const sortManager = new SortManager(state);
    const viewRenderer = new ViewRenderer(
      state,
      CategoryHierarchy,
      sortManager,
    );
    const searchController = new SearchController(
      state,
      CategoryHierarchy,
      viewRenderer,
    );
    viewRenderer.attachSearchController(searchController);
    searchController.init(CONFIG.ui.debounceDelay);

    const searchIndex = await loadSearchIndex();
    if (searchIndex) {
      searchController.loadIndex(searchIndex);
    }

    const navigationManager = new NavigationManager(state, CategoryHierarchy);
    const commandExecutor = new CommandExecutor({
      state,
      navigationManager,
      sortManager,
      searchController,
      viewRenderer,
    });
    const eventManager = new EventManager({
      state,
      commandExecutor,
      navigationManager,
      sortManager,
      viewRenderer,
      searchController,
    });

    const initialPath = navigationManager.checkURLParams();
    if (!initialPath) {
      state.setNavigation('', []);
    }

    eventManager.bindAll();
    viewRenderer.collapseAllCategories();

    // Always run a full view update on first paint so header/breadcrumb/status are populated.
    commandExecutor.updateViews();

    sortManager.sortPosts();
    sortManager.updateSortIndicators();

    window.TerminalHome = {
      state,
      navigationManager,
      viewRenderer,
      sortManager,
      commandExecutor,
      searchController,
      eventManager,
    };
  } catch (error) {
    console.error('Failed to initialize terminal home:', error);

    const container = document.getElementById('terminal-command-bar');
    if (container) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText =
        'padding: 1rem; color: #ef4444; text-align: center;';
      errorDiv.textContent =
        'Failed to load terminal interface. Please refresh the page.';
      container.appendChild(errorDiv);
    }
  }
}

/**
 * Auto-initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

/**
 * Ensure debugging namespace
 */
window.TerminalHome = window.TerminalHome || {};
