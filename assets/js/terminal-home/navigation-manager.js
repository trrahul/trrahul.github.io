/**
 * Terminal Home - Navigation Manager
 * Handles hierarchical navigation, state updates, and URL sync
 */

import { CONFIG } from './config.js';

const DEBUG = CONFIG.debug?.navigation || {};

const debugLog = (label, payload) => {
  if (!DEBUG.enabled) return;

  const timestamp = DEBUG.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
  const message = `${timestamp}TerminalHome/Navigation :: ${label}`;

  if (payload !== undefined && DEBUG.showPayload) {
    if (DEBUG.groupCollapsed) {
      console.groupCollapsed(message);
      console.log(payload);
      console.groupEnd();
    } else {
      console.log(message, payload);
    }
  } else {
    console.log(message);
  }
};

export class NavigationManager {
  constructor(stateStore, categoryHierarchy) {
    this.state = stateStore;
    this.categoryHierarchy = categoryHierarchy;
  }

  navigateToPath(path) {
    const normalized = path || '';
    debugLog('navigateToPath', { path, normalized });
    const segments = this.categoryHierarchy.parsePathSegments(normalized);
    this.state.setNavigation(normalized, segments);
    this.updateURL(normalized);
  }

  goBack(levels = 1) {
    const currentPath = this.state.navigation.currentPath;
    debugLog('goBack', { levels, currentPath });
    if (!currentPath) {
      return;
    }

    const segments = this.categoryHierarchy.parsePathSegments(currentPath);
    if (levels >= segments.length) {
      this.navigateToPath('');
    } else {
      const nextSegments = segments.slice(0, segments.length - levels);
      const nextPath = nextSegments.join('/');
      debugLog('goBack:resolved', { nextPath });
      this.navigateToPath(nextPath);
    }
  }

  navigateRelative(relativePath) {
    debugLog('navigateRelative', { relativePath, currentPath: this.state.navigation.currentPath });
    if (!relativePath) {
      this.navigateToPath('');
      return true;
    }

    if (relativePath === '~' || relativePath === './') {
      this.navigateToPath('');
      return true;
    }

    if (relativePath.startsWith('..')) {
      const levels = (relativePath.match(/\.\./g) || []).length;
      this.goBack(levels);
      return true;
    }

    if (this.categoryHierarchy.exists(relativePath)) {
      this.navigateToPath(relativePath);
      return true;
    }

    const currentPath = this.state.navigation.currentPath;
    if (currentPath) {
      const absolute = `${currentPath}/${relativePath}`;
      if (this.categoryHierarchy.exists(absolute)) {
        this.navigateToPath(absolute);
        return true;
      }
    }

    console.warn(`[Navigation] Path not found: ${relativePath}`);
    return false;
  }

  updateURL(path) {
    debugLog('updateURL', { path });
    const url = new URL(window.location.href);
    if (path) {
      url.searchParams.set('dir', path);
    } else {
      url.searchParams.delete('dir');
    }
    window.history.pushState({}, '', url);
  }

  checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const dir = params.get('dir');
    debugLog('checkURLParams', { dir });
    if (dir && this.categoryHierarchy.exists(dir)) {
      const segments = this.categoryHierarchy.parsePathSegments(dir);
      this.state.setNavigation(dir, segments);
      return dir;
    }
    return null;
  }

  getCurrentDisplayName() {
    const path = this.state.navigation.currentPath;
    return path ? this.categoryHierarchy.getDisplayName(path) : 'posts';
  }

  getBreadcrumbs() {
    return this.categoryHierarchy.getBreadcrumbs(this.state.navigation.currentPath);
  }

  hasChildren() {
    const path = this.state.navigation.currentPath;
    if (!path) {
      return this.categoryHierarchy.getRootCategories().length > 0;
    }
    return this.categoryHierarchy.hasChildren(path);
  }

  isLeaf() {
    const path = this.state.navigation.currentPath;
    if (!path) return false;
    return this.categoryHierarchy.isLeaf(path);
  }
}
