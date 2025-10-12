/**
 * Terminal Home - Configuration
 * Central configuration for terminal interface
 */

export const CONFIG = {
  // Command definitions
  commands: {
    cd: 'Navigate to category',
    ls: 'List posts',
    grep: 'Search posts',
    clear: 'Clear filters',
    help: 'Show help'
  },

  // Sort types
  sortTypes: {
    time: 'Date modified',
    size: 'Word count',
    name: 'Alphabetical'
  },

  // Default values
  defaults: {
    sort: 'time',
    sortReverse: false,
    category: '',
    searchTerm: '',
    viewDetailed: false
  },

  // UI settings
  ui: {
    animationDuration: 200,
    debounceDelay: 300
  },

  // Detailed view display options
  detailedView: {
    showSummary: true,
    showReadStats: true,
    showTagPills: true
  },

  // Selectors
  selectors: {
    input: '#terminal-input',
    currentDir: '.terminal-current-dir',
    statusLocation: '#current-path',
    visibleCount: '#visible-count',
    categoryDirs: '.category-directory',
    directoryList: '#directory-list',
    flatList: '#flat-post-list',
    helpModal: '#terminal-help-modal',
    directoryView: '.terminal-directory-view',
    rootHeader: '#root-directory-header',
    pathSegment: '#path-segment',
    directoryIcon: '#directory-icon',
    directoryItemCount: '#directory-item-count',
    searchEmptyState: '#search-empty-state',
    searchEmptyMessage: '#search-empty-message'
  },

  debug: {
    navigation: {
      enabled: true,
      includeTimestamp: true,
      groupCollapsed: true,
      showPayload: true
    },
    viewRenderer: {
      enabled: true,
      includeTimestamp: true,
      groupCollapsed: true,
      showPayload: true
    }
  }
};
