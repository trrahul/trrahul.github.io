/**
 * Terminal Home - View Renderer
 * Responsible purely for DOM presentation and layout toggles
 */

import { Utils } from './utils.js';
import { CONFIG } from './config.js';

const DEBUG = CONFIG.debug?.viewRenderer || {};

const debugLog = (label, payload) => {
  if (!DEBUG.enabled) return;

  const timestamp = DEBUG.includeTimestamp
    ? `[${new Date().toISOString()}] `
    : '';
  const message = `${timestamp}TerminalHome/ViewRenderer :: ${label}`;

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

export class ViewRenderer {
  constructor(stateStore, categoryHierarchy, sortManager) {
    this.state = stateStore;
    this.categoryHierarchy = categoryHierarchy;
    this.sortManager = sortManager;
    this.searchController = null;
    this.directoryBlueprints = new Map();
    this.directoryListElement = null;
    this.emptyDirectoryMessage = '';

    this.initializeDirectoryBlueprints();
  }

  attachSearchController(searchController) {
    this.searchController = searchController;
  }

  initializeDirectoryBlueprints() {
    this.directoryListElement = this.state.getElement('directoryList');

    if (!this.directoryListElement) {
      debugLog('initializeDirectoryBlueprints:missingList');
      return;
    }

    const emptyMessageNode = this.directoryListElement.querySelector(
      '[data-directory-empty]',
    );
    if (emptyMessageNode) {
      this.emptyDirectoryMessage = emptyMessageNode.outerHTML;
    }

    const directoryNodes = Array.from(
      this.directoryListElement.querySelectorAll('.category-directory'),
    );
    directoryNodes.forEach((node) => {
      const categoryPath = node.dataset.categoryPath;
      if (!categoryPath) {
        debugLog('initializeDirectoryBlueprints:missingPath', { node });
        return;
      }

      if (!this.directoryBlueprints.has(categoryPath)) {
        this.directoryBlueprints.set(categoryPath, node.cloneNode(true));
      }
    });

    debugLog('initializeDirectoryBlueprints:complete', {
      blueprintCount: this.directoryBlueprints.size,
    });

    this.directoryListElement.innerHTML = '';
    this.state.elements.categoryDirs =
      this.directoryListElement.querySelectorAll('.category-directory');
  }

  refreshForPath(path) {
    const targetPath = path ?? this.state.navigation.currentPath;
    debugLog('refreshForPath:start', { targetPath });
    if (!targetPath) {
      this.showDirectoryView('');
      return;
    }

    const hasChildren = this.categoryHierarchy.hasChildren(targetPath);
    const hasDirectPosts = this.categoryHierarchy.hasDirectPosts(targetPath);
    debugLog('refreshForPath:state', { hasChildren, hasDirectPosts });

    if (hasChildren && hasDirectPosts) {
      this.showMixedView(targetPath);
    } else if (hasChildren) {
      this.showDirectoryView(targetPath);
    } else if (hasDirectPosts) {
      this.showFlatList(targetPath);
    } else {
      this.showDirectoryView('');
    }
  }

  showDirectoryView(path = this.state.navigation.currentPath) {
    debugLog('showDirectoryView', { path });
    const categoriesToShow = this.getCategoriesForPath(path);
    debugLog('showDirectoryView:categories', { categoriesToShow });
    this.updateDirectoryVisibility(categoriesToShow, {
      showEmptyMessage: true,
    });

    const flatList = this.state.getElement('flatList');
    if (flatList) {
      flatList.style.display = 'none';
      this.markAllPostsHidden();
    }

    this.sortManager.updateSortButtonsState(true);

    this.updateVisibleCount();
  }

  showFlatList(path) {
    debugLog('showFlatList', { path });
    const flatList = this.state.getElement('flatList');

    this.updateDirectoryVisibility([], { showEmptyMessage: false });

    if (flatList) {
      flatList.style.display = 'block';
      this.renderPostsForPath(path, { scope: 'direct' });
    }

    this.sortManager.updateSortButtonsState(true);
    this.updateVisibleCount();
  }

  showMixedView(path) {
    debugLog('showMixedView', { path });
    const flatList = this.state.getElement('flatList');
    const categoriesToShow = this.getCategoriesForPath(path);
    this.updateDirectoryVisibility(categoriesToShow, {
      showEmptyMessage: true,
    });

    if (flatList) {
      flatList.style.display = 'block';
      this.renderPostsForPath(path, { scope: 'direct' });
    }

    this.sortManager.updateSortButtonsState(true);
    this.updateVisibleCount();
  }

  getCategoriesForPath(path) {
    debugLog('getCategoriesForPath', { path });
    if (!path) {
      return this.categoryHierarchy.getRootCategories();
    }
    return this.categoryHierarchy.getChildren(path);
  }

  updateDirectoryVisibility(categoriesToShow = [], options = {}) {
    const { showEmptyMessage = false } = options;

    if (!this.directoryListElement) {
      debugLog('updateDirectoryVisibility:noList');
      return;
    }

    const currentPath = this.state.navigation.currentPath || '';
    debugLog('updateDirectoryVisibility:start', {
      currentPath,
      categoriesToShow,
      showEmptyMessage,
    });

    this.directoryListElement.innerHTML = '';

    if (!categoriesToShow || categoriesToShow.length === 0) {
      if (showEmptyMessage && this.emptyDirectoryMessage) {
        this.directoryListElement.innerHTML = this.emptyDirectoryMessage;
      }
      this.state.elements.categoryDirs =
        this.directoryListElement.querySelectorAll('.category-directory');
      return;
    }

    const fragment = document.createDocumentFragment();
    categoriesToShow.forEach((categoryPath) => {
      const blueprint = this.directoryBlueprints.get(categoryPath);
      if (!blueprint) {
        debugLog('updateDirectoryVisibility:missingBlueprint', {
          categoryPath,
        });
        return;
      }

      const node = blueprint.cloneNode(true);
      this.prepareDirectoryNode(node, currentPath);
      fragment.appendChild(node);
    });

    this.directoryListElement.appendChild(fragment);
    this.state.elements.categoryDirs =
      this.directoryListElement.querySelectorAll('.category-directory');
    this.sortManager.sortCategoryDirectories(
      this.state.sorting.type,
      this.state.sorting.reverse,
    );
  }

  prepareDirectoryNode(node, currentPath) {
    const parentPath = node.dataset.parentPath || '';
    const folder = node.querySelector('.directory-folder');
    const contents = node.querySelector('.directory-contents');

    if (folder) {
      folder.classList.remove('expanded');
    }

    if (contents) {
      contents.style.display = 'none';
    }

    const isRootLevel = !parentPath;
    const isDirectChild = parentPath && parentPath === currentPath;
    const shouldAppearAsRoot = (!currentPath && isRootLevel) || isDirectChild;

    if (shouldAppearAsRoot) {
      node.classList.remove('category-directory--nested');
      node.dataset.renderDepth = '0';
    } else if (parentPath && parentPath !== currentPath) {
      node.classList.add('category-directory--nested');
    }
  }

  renderPostsForPath(path, options = {}) {
    debugLog('renderPostsForPath', { path, options });
    const flatList = this.state.getElement('flatList');
    if (!flatList) return 0;

    const { scope = 'direct' } = options;
    const hierarchyPosts =
      scope === 'all'
        ? this.categoryHierarchy.getAllPosts(path)
        : this.categoryHierarchy.getPosts(path);

    const postUrls = new Set(hierarchyPosts.map((p) => p.url));
    const posts = flatList.querySelectorAll('.directory-file');
    let visibleCount = 0;

    posts.forEach((post) => {
      const link = post.querySelector('a.file-link');
      if (!link) return;

      const postUrl = link.getAttribute('href');
      const shouldShow = postUrls.has(postUrl);
      post.style.display = shouldShow ? 'flex' : 'none';
      post.dataset.visible = shouldShow ? 'true' : 'false';
      if (shouldShow) visibleCount += 1;
    });

    return visibleCount;
  }

  markAllPostsHidden() {
    debugLog('markAllPostsHidden');
    const flatList = this.state.getElement('flatList');
    if (!flatList) return;
    flatList.querySelectorAll('.directory-file').forEach((post) => {
      post.style.display = 'none';
      post.dataset.visible = 'false';
    });
  }

  toggleDetailedView(show) {
    debugLog('toggleDetailedView', { show });
    document.querySelectorAll('.file-details').forEach((detail) => {
      detail.style.display = show ? 'flex' : 'none';
    });

    this.applyDetailedViewOptions(show);
    this.toggleWordCount(show);
  }

  updateCurrentDir() {
    debugLog('updateCurrentDir', {
      currentPath: this.state.navigation.currentPath,
    });
    const currentDir = this.state.getElement('currentDir');
    const { currentPath } = this.state.navigation;

    if (!currentDir) return;
    if (currentPath) {
      const breadcrumbs = this.categoryHierarchy.getBreadcrumbs(currentPath);
      const displayPath = breadcrumbs.map((b) => b.name).join(' / ');
      Utils.safeSetText(currentDir, displayPath);
    } else {
      Utils.safeSetText(currentDir, '');
    }
  }

  updateStatusBar() {
    debugLog('updateStatusBar', {
      currentPath: this.state.navigation.currentPath,
    });
    const statusLocation = this.state.getElement('statusLocation');
    const { currentPath } = this.state.navigation;

    if (!statusLocation) return;
    if (currentPath) {
      const breadcrumbs = this.categoryHierarchy.getBreadcrumbs(currentPath);
      const displayPath = `${breadcrumbs.map((b) => b.slug).join('/')}/`;
      Utils.safeSetText(statusLocation, displayPath);
    } else {
      Utils.safeSetText(statusLocation, '~');
    }
  }

  updateDirectoryHeader() {
    debugLog('updateDirectoryHeader', {
      currentPath: this.state.navigation.currentPath,
    });
    const pathSegment = this.state.getElement('pathSegment');
    const directoryIcon = this.state.getElement('directoryIcon');
    const { currentPath } = this.state.navigation;

    if (!pathSegment) return;

    if (currentPath) {
      Utils.safeSetText(pathSegment, '../');
      if (directoryIcon) directoryIcon.className = 'fas fa-level-up-alt';
    } else {
      Utils.safeSetText(pathSegment, './');
      if (directoryIcon) directoryIcon.className = 'fas fa-folder-open';
    }
  }

  updateVisibleCount() {
    debugLog('updateVisibleCount');
    const visibleCount = this.state.getElement('visibleCount');
    const directoryItemCount = this.state.getElement('directoryItemCount');

    const count = this.searchController
      ? this.searchController.getVisibleCount()
      : 0;
    if (visibleCount) {
      Utils.safeSetText(visibleCount, count.toString());
    }

    if (directoryItemCount) {
      const categoryDirs = this.state.getElement('categoryDirs');
      const flatList = this.state.getElement('flatList');
      const flatListVisible =
        flatList && getComputedStyle(flatList).display === 'block';
      const visibleDirectories = categoryDirs
        ? Array.from(categoryDirs).filter(
            (dir) => getComputedStyle(dir).display !== 'none',
          )
        : [];

      const total = flatListVisible
        ? count + visibleDirectories.length
        : visibleDirectories.length;

      Utils.safeSetText(directoryItemCount, total.toString());
    }
  }

  expandAllCategories() {
    debugLog('expandAllCategories');
    document.querySelectorAll('.directory-contents').forEach((contents) => {
      contents.style.display = 'block';
    });

    document.querySelectorAll('.directory-folder').forEach((folder) => {
      folder.classList.add('expanded');
    });

    this.sortManager.updateSortButtonsState(true);
    this.updateVisibleCount();
  }

  collapseAllCategories() {
    debugLog('collapseAllCategories');
    document.querySelectorAll('.directory-contents').forEach((contents) => {
      contents.style.display = 'none';
    });

    document.querySelectorAll('.directory-folder').forEach((folder) => {
      folder.classList.remove('expanded');
    });

    this.sortManager.updateSortButtonsState(true);
    this.updateVisibleCount();
  }

  toggleCategoryExpansion(folder) {
    debugLog('toggleCategoryExpansion', {
      path: folder.closest('.category-directory')?.dataset?.categoryPath,
    });
    const categoryDir = folder.closest('.category-directory');
    if (!categoryDir) return;

    const contents = categoryDir.querySelector('.directory-contents');
    if (!contents) return;

    const isExpanding = contents.style.display === 'none';

    if (isExpanding) {
      contents.style.display = 'block';
      folder.classList.add('expanded');

      // Disable nested directory expansion
      this.disableNestedDirectories(categoryDir);
    } else {
      contents.style.display = 'none';
      folder.classList.remove('expanded');

      // Re-enable nested directories
      this.enableNestedDirectories(categoryDir);
    }

    this.sortManager.updateSortButtonsState(true);
    this.updateVisibleCount();
  }

  disableNestedDirectories(parentCategoryDir) {
    const nestedDirs = parentCategoryDir.querySelectorAll(
      '.category-directory--nested',
    );
    nestedDirs.forEach((nestedDir) => {
      const folder = nestedDir.querySelector('.directory-folder');
      const expandButton = nestedDir.querySelector('.directory-expand');
      const contents = nestedDir.querySelector('.directory-contents');

      if (folder) {
        folder.classList.add('disabled');
        folder.style.pointerEvents = 'none';
        folder.style.opacity = '0.5';
        folder.classList.remove('expanded');
      }

      if (expandButton) {
        expandButton.style.display = 'none';
      }

      if (contents) {
        contents.style.display = 'none';
      }
    });
  }

  enableNestedDirectories(parentCategoryDir) {
    const nestedDirs = parentCategoryDir.querySelectorAll(
      '.category-directory--nested',
    );
    nestedDirs.forEach((nestedDir) => {
      const folder = nestedDir.querySelector('.directory-folder');
      const expandButton = nestedDir.querySelector('.directory-expand');
      const contents = nestedDir.querySelector('.directory-contents');

      if (folder) {
        folder.classList.remove('disabled');
        folder.style.pointerEvents = '';
        folder.style.opacity = '';
      }

      if (expandButton) {
        expandButton.style.display = '';
      }

      if (contents) {
        contents.style.display = 'none';
      }
    });
  }

  showAllPostsInCategory(moreButton) {
    debugLog('showAllPostsInCategory');
    const contents = moreButton.closest('.directory-contents');
    if (!contents) return;

    const categoryDir = moreButton.closest('.category-directory');
    if (!categoryDir) return;

    moreButton.remove();

    // Chirpy generates one page per category at /categories/<leaf-slug>/, so
    // navigate by leaf slug. (Slug collisions across nested categories are a
    // theme-level limitation and would need a category-page renaming fix.)
    const categoryDataset = categoryDir.dataset;
    const slug =
      categoryDataset.category ||
      (categoryDataset.categoryPath || '').split('/').pop();
    if (slug) {
      window.location.href = `/categories/${slug}/`;
    }
  }

  getCategoryDisplayName(slug) {
    return Utils.getCategoryDisplayName(slug);
  }

  applyDetailedViewOptions(show) {
    const options = CONFIG.detailedView || {};

    this.toggleDetailSection(
      '[data-read-stats]',
      show && options.showReadStats,
      'flex',
    );
    this.toggleDetailSection(
      '[data-summary]',
      show && options.showSummary,
      'block',
    );
    this.toggleDetailSection(
      '[data-tags]',
      show && options.showTagPills,
      'flex',
    );
  }

  toggleDetailSection(selector, shouldShow, displayValue) {
    debugLog('toggleDetailSection', { selector, shouldShow, displayValue });
    document.querySelectorAll(selector).forEach((el) => {
      el.style.display = shouldShow ? displayValue : 'none';
    });
  }

  toggleWordCount(showDetailed) {
    document.querySelectorAll('.file-size').forEach((node) => {
      node.style.display = showDetailed ? 'none' : '';

      const stats = node.closest('.file-stats');
      if (stats) {
        stats.style.display = showDetailed ? 'none' : '';
      }
    });
  }
}
