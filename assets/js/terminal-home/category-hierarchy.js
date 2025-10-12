/**
 * Terminal Home - Category Hierarchy Manager
 * Manages hierarchical category structure and navigation
 */

export const CategoryHierarchy = {
  // Category tree structure (loaded from Jekyll data)
  _hierarchy: null,
  _categories: null,
  
  /**
   * Initialize with hierarchy data from Jekyll
   * @param {Object} hierarchyData - Category hierarchy from site.data
   */
  initialize(hierarchyData) {
    this._hierarchy = hierarchyData;
    this._categories = hierarchyData.categories || {};
    
  },
  
  /**
   * Get posts index (all posts keyed by id)
   * @returns {Object}
   */
  getPostsIndex() {
    return (this._hierarchy && this._hierarchy.posts) || {};
  },

  /**
   * Get hierarchy metadata (generation info, search index URL, etc.)
   * @returns {Object}
   */
  getMetadata() {
    return (this._hierarchy && this._hierarchy.metadata) || {};
  },

  /**
   * Resolve search index URL from metadata
   * @returns {string}
   */
  getSearchIndexUrl() {
    const metadata = this.getMetadata();
    return metadata.search_index_url || '/assets/js/data/search-index.json';
  },

  /**
   * Get root-level categories (no parent)
   * @returns {Array} Array of category paths
   */
  getRootCategories() {
    if (!this._hierarchy) return [];
    return this._hierarchy.root_children || [];
  },
  
  /**
   * Get category data by path
   * @param {string} path - Category path (e.g., "programming/compiler-optimization")
   * @returns {Object|null} Category data or null
   */
  getCategory(path) {
    if (!path || !this._categories) return null;
    return this._categories[path] || null;
  },
  
  /**
   * Get children of a category
   * @param {string} path - Parent category path
   * @returns {Array} Array of child category paths
   */
  getChildren(path) {
    const category = this.getCategory(path);
    return category ? category.children || [] : [];
  },
  
  /**
   * Get posts in a category (only posts directly in this category, not children)
   * @param {string} path - Category path
   * @returns {Array} Array of posts
   */
  getPosts(path) {
    const category = this.getCategory(path);
    if (!category || !category.post_ids) return [];
    
    // Look up full post objects from post_ids
    const posts = this._hierarchy.posts || {};
    return category.post_ids.map(postId => posts[postId]).filter(Boolean);
  },
  
  /**
   * Get all posts in a category and its children (recursive)
   * @param {string} path - Category path
   * @returns {Array} Array of all posts in subtree
   */
  getAllPosts(path) {
    const category = this.getCategory(path);
    if (!category) return [];
    
    const posts = this._hierarchy.posts || {};
    
    // Use all_post_ids if available, otherwise recursively gather
    if (category.all_post_ids) {
      return category.all_post_ids.map(postId => posts[postId]).filter(Boolean);
    }
    
    let allPosts = this.getPosts(path);
    
    // Recursively get posts from children
    (category.children || []).forEach(childPath => {
      allPosts = allPosts.concat(this.getAllPosts(childPath));
    });
    
    return allPosts;
  },
  
  /**
   * Get parent path of a category
   * @param {string} path - Category path
   * @returns {string|null} Parent path or null if root
   */
  getParent(path) {
    const category = this.getCategory(path);
    return category ? category.parent_path || null : null;
  },
  
  /**
   * Check if a category exists
   * @param {string} path - Category path
   * @returns {boolean}
   */
  exists(path) {
    return Boolean(this.getCategory(path));
  },
  
  /**
   * Check if a category is a leaf (has no children)
   * @param {string} path - Category path
   * @returns {boolean}
   */
  isLeaf(path) {
    const category = this.getCategory(path);
    const childrenLength = category ? (category.children || []).length : 0;
    return category ? childrenLength === 0 : false;
  },
  
  /**
   * Check if a category has children
   * @param {string} path - Category path
   * @returns {boolean}
   */
  hasChildren(path) {
    return !this.isLeaf(path);
  },

  /**
   * Check if a category has direct posts (files in this directory)
   * @param {string} path - Category path
   * @returns {boolean}
   */
  hasDirectPosts(path) {
    const category = this.getCategory(path);
    const directCount = category ? (category.post_ids || []).length : 0;
    return directCount > 0;
  },

  /**
   * Get count of direct posts in a category
   * @param {string} path - Category path
   * @returns {number}
   */
  getDirectPostCount(path) {
    const category = this.getCategory(path);
    return category ? (category.post_ids || []).length : 0;
  },
  
  /**
   * Get depth of a category (0 = root level)
   * @param {string} path - Category path
   * @returns {number}
   */
  getDepth(path) {
    const category = this.getCategory(path);
    return category ? category.depth || 0 : 0;
  },
  
  /**
   * Get display name for a category
   * @param {string} path - Category path
   * @returns {string}
   */
  getDisplayName(path) {
    const category = this.getCategory(path);
    return category ? category.name : path;
  },
  
  /**
   * Parse a category path into segments
   * @param {string} path - Category path
   * @returns {Array} Array of path segments
   */
  parsePathSegments(path) {
    if (!path) return [];
    return path.split('/').filter(s => s.length > 0);
  },
  
  /**
   * Build breadcrumb trail for a path
   * @param {string} path - Category path
   * @returns {Array} Array of {path, name} objects
   */
  getBreadcrumbs(path) {
    if (!path) return [];
    
    const segments = this.parsePathSegments(path);
    const breadcrumbs = [];
    
    for (let i = 0; i < segments.length; i++) {
      const currentPath = segments.slice(0, i + 1).join('/');
      const category = this.getCategory(currentPath);
      
      breadcrumbs.push({
        path: currentPath,
        name: category ? category.name : segments[i],
        slug: segments[i]
      });
    }
    
    return breadcrumbs;
  },
  
  /**
   * Get category count (total categories in hierarchy)
   * @returns {number}
   */
  getCategoryCount() {
    return this._categories ? Object.keys(this._categories).length : 0;
  },
  
  /**
   * Search categories by name
   * @param {string} query - Search query
   * @returns {Array} Matching category paths
   */
  searchCategories(query) {
    if (!query || !this._categories) return [];
    
    const lowerQuery = query.toLowerCase();
    const matches = [];
    
    Object.entries(this._categories).forEach(([path, data]) => {
      if (data.name.toLowerCase().includes(lowerQuery) || 
          data.slug.toLowerCase().includes(lowerQuery)) {
        matches.push(path);
      }
    });
    
    return matches;
  },
  
  /**
   * Get category statistics
   * @param {string} path - Category path (optional, null for overall stats)
   * @returns {Object} Statistics object
   */
  getStats(path = null) {
    if (path) {
      const category = this.getCategory(path);
      if (!category) return null;
      
      return {
        name: category.name,
        path: category.path,
        depth: category.depth,
        directPosts: category.post_ids?.length || 0,
        totalPosts: category.all_post_ids?.length || this.getAllPosts(path).length,
        children: category.children?.length || 0,
        isLeaf: this.isLeaf(path)
      };
    }
    
    // Overall statistics
    return {
      totalCategories: this.getCategoryCount(),
      rootCategories: this.getRootCategories().length,
      maxDepth: Math.max(...Object.values(this._categories).map(c => c.depth || 0), 0)
    };
  }
};
