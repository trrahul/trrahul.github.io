/**
 * Terminal Home - Search Controller
 * Provides scoped full-text search and tag filtering helpers
 */

import { Utils } from './utils.js';

const MAX_SNIPPETS_PER_POST = 3;
const SNIPPET_CONTEXT_CHARS = 70;
const SEGMENT_WEIGHTS = {
  title: 6,
  summary: 4,
  heading: 3.5,
  paragraph: 2.5,
  list_item: 2,
  blockquote: 1.8,
  table: 1.6,
  code: 1.2
};

export class SearchController {
  constructor(stateStore, categoryHierarchy, viewRenderer) {
    this.state = stateStore;
    this.categoryHierarchy = categoryHierarchy;
    this.viewRenderer = viewRenderer;
    this.applySearchDebounced = null;

    this.searchIndex = null;
    this.searchDocuments = [];
    this.postElementsByUrl = new Map();
    this.postElements = [];
    this.lastRawSearchTerm = '';
    this.lastNavigationPath = stateStore?.navigation?.currentPath || '';

    this.handleStateChange = this.handleStateChange.bind(this);
    this.state.subscribe(this.handleStateChange);
  }

  init(debounceMs = 300) {
    this.applySearchDebounced = Utils.debounce(this.applySearch.bind(this), debounceMs);
    this.ensurePostElementIndex();
  }

  loadIndex(indexData) {
    if (!indexData || !Array.isArray(indexData.posts)) {
      console.warn('[SearchController] Invalid search index payload received');
      return;
    }

    this.searchIndex = indexData;
    this.searchDocuments = indexData.posts.map(post => ({
      ...post,
      normalizedUrl: this.normalizeUrl(post.url)
    }));

    this.ensurePostElementIndex();
  }

  applySearch(term) {
    const sanitized = Utils.sanitizeText(term);
    this.state.setSearchTerm(sanitized);
    this.lastRawSearchTerm = sanitized;

    const searchTerm = sanitized.toLowerCase();
    const currentPath = this.state.navigation.currentPath;

    if (!searchTerm) {
      this.clearSnippets();
      this.toggleEmptyState(false);
      if (currentPath) {
        this.applyCategoryFilter(currentPath);
        this.viewRenderer.refreshForPath(currentPath);
      } else {
        this.clearFilters();
      }
      return;
    }

    if (!this.searchIndex || this.searchDocuments.length === 0) {
      this.runFallbackSearch(searchTerm, currentPath);
      return;
    }

    const matches = this.findMatches(searchTerm, currentPath);
    const formatted = matches.map(match => ({
      url: match.rawUrl,
      normalizedUrl: match.normalizedUrl,
      snippets: match.snippets,
      score: match.score
    }));

    this.showSearchResults(formatted, {
      showSnippets: true,
      context: 'search',
      path: currentPath
    });
  }

  runFallbackSearch(searchTerm, currentPath) {
    const postsIndex = this.categoryHierarchy.getPostsIndex();
    const scope = currentPath
      ? this.categoryHierarchy.getAllPosts(currentPath)
      : Object.values(postsIndex);

    const matchingUrls = scope
      .filter(post => this.matchesFallback(post, searchTerm))
      .map(post => post.url);

    this.showSearchResults(
      matchingUrls.map(url => ({ url })),
      {
        showSnippets: false,
        context: 'search',
        path: currentPath
      }
    );
  }

  matchesFallback(post, searchTerm) {
    if (!post) return false;
    const haystacks = [post.title, post.description, post.excerpt, post.summary]
      .filter(Boolean)
      .map(value => value.toLowerCase());

    return haystacks.some(text => text.includes(searchTerm));
  }

  findMatches(searchTerm, currentPath) {
    const tokens = this.tokenize(searchTerm);
    if (tokens.length === 0) return [];

    const scopeSet = currentPath ? this.buildScopeSet(currentPath) : null;
    const matches = [];

    this.searchDocuments.forEach(doc => {
      if (scopeSet && !this.urlInScope(doc, scopeSet)) {
        return;
      }

      const evaluation = this.evaluateDocument(doc, tokens);
      if (evaluation) {
        matches.push(evaluation);
      }
    });

    return matches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.title.localeCompare(b.title);
    });
  }

  evaluateDocument(doc, tokens) {
    const snippets = [];
    let score = 0;

    if (this.containsAnyToken(doc.title, tokens)) {
      const snippet = this.createSnippet('title', doc.title, [], tokens);
      if (snippet) {
        snippets.push(snippet);
        score += SEGMENT_WEIGHTS.title;
      }
    }

    if (doc.summary && this.containsAnyToken(doc.summary, tokens)) {
      const snippet = this.createSnippet('summary', doc.summary, [], tokens);
      if (snippet) {
        snippets.push(snippet);
        score += SEGMENT_WEIGHTS.summary;
      }
    }

    const segmentSnippets = [];
    if (Array.isArray(doc.segments)) {
      doc.segments.forEach(segment => {
        if (!segment || !this.containsAnyToken(segment.text, tokens)) {
          return;
        }

        const snippet = this.createSnippet(segment.type, segment.text, segment.heading || [], tokens);
        if (!snippet) {
          return;
        }

        segmentSnippets.push({
          ...snippet,
          weight: this.getSegmentWeight(segment.type)
        });
      });
    }

    segmentSnippets
      .sort((a, b) => b.weight - a.weight)
      .forEach(snippet => {
        snippets.push(snippet);
        score += snippet.weight;
      });

    const deduped = [];
    const seen = new Set();
    snippets.forEach(snippet => {
      if (!snippet || !snippet.html) return;
      const key = `${snippet.headingLabel}|${snippet.html}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(snippet);
    });

    if (deduped.length === 0) {
      return null;
    }

    return {
      rawUrl: doc.url,
      normalizedUrl: doc.normalizedUrl,
      title: doc.title,
      score,
      snippets: deduped.slice(0, MAX_SNIPPETS_PER_POST)
    };
  }

  showSearchResults(matches, { showSnippets = false, context = 'search', path = '' } = {}) {
    this.ensurePostElementIndex();

    const flatList = this.state.getElement('flatList');
    const allowEmptyState = context === 'search' && Boolean(this.lastRawSearchTerm);
    const scopedSet = path ? this.buildScopeSet(path) : null;

    const filteredMatches = Array.isArray(matches)
      ? matches.filter(match => {
          if (!scopedSet) return true;
          const targetUrl = this.normalizeUrl(match.normalizedUrl || match.url);
          return scopedSet.has(targetUrl);
        })
      : [];

    this.viewRenderer.updateDirectoryVisibility([], { showEmptyMessage: false });

    if (flatList) {
      flatList.style.display = 'block';
    }

    const unique = new Set();
    this.postElements.forEach(post => {
      if (unique.has(post)) return;
      unique.add(post);
      post.style.display = 'none';
      post.dataset.visible = 'false';
      post.dataset.searchRank = '';
      this.removeSnippet(post);
    });

    const appended = new Set();
    let visibleCount = 0;
    filteredMatches.forEach((match, index) => {
      const targetUrl = this.normalizeUrl(match.normalizedUrl || match.url);
      if (!targetUrl) return;

      const postElement = this.postElementsByUrl.get(targetUrl);
      if (!postElement || appended.has(postElement)) {
        return;
      }

      appended.add(postElement);
      postElement.style.display = 'flex';
      postElement.dataset.visible = 'true';
      postElement.dataset.searchRank = String(index);
      visibleCount += 1;

      if (showSnippets && Array.isArray(match.snippets) && match.snippets.length > 0) {
        this.renderSnippets(postElement, match.snippets);
      }

      if (flatList) {
        flatList.appendChild(postElement);
      }
    });

    if (allowEmptyState) {
      this.toggleEmptyState(visibleCount === 0, this.lastRawSearchTerm);
    } else {
      this.toggleEmptyState(false);
    }

    this.viewRenderer.updateVisibleCount();
  }

  applyCategoryFilter(path) {
    if (!path) {
      this.clearFilters();
      return;
    }

    const category = this.categoryHierarchy.getCategory(path);
    if (!category) {
      console.warn('[SearchController] Category not found:', path);
      return;
    }

    this.clearSnippets();
    this.toggleEmptyState(false);

    const flatList = this.state.getElement('flatList');
    if (!flatList) return;

    const directPosts = this.categoryHierarchy.getPosts(path);
    const allowedUrls = new Set(directPosts.map(post => post.url));
    const posts = flatList.querySelectorAll('.directory-file');

    posts.forEach(post => {
      const postUrl = post.querySelector('a')?.getAttribute('href');
      const shouldShow = allowedUrls.has(postUrl);
      post.dataset.visible = shouldShow ? 'true' : 'false';
      post.style.display = shouldShow ? 'flex' : 'none';
      if (!shouldShow) {
        this.removeSnippet(post);
      }
    });
  }

  applyTagFilter(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return;
    }

    const hierarchy = this.categoryHierarchy._hierarchy || {};
    const tagIndex = hierarchy.tags || {};
    const allPosts = hierarchy.posts || {};

    let matchingPostIds = null;

    tags.forEach(tag => {
      const tagSlug = tag.toLowerCase().replace(/\s+/g, '-');
      const postsWithTag = tagIndex[tagSlug] || [];

      if (matchingPostIds === null) {
        matchingPostIds = new Set(postsWithTag);
      } else {
        matchingPostIds = new Set(
          [...matchingPostIds].filter(id => postsWithTag.includes(id))
        );
      }
    });

    const matchingUrls = [...(matchingPostIds || [])]
      .map(id => allPosts[id]?.url)
      .filter(Boolean);

    this.showSearchResults(
      matchingUrls.map(url => ({ url })),
      {
        showSnippets: false,
        context: 'tag',
        path: this.state.navigation.currentPath
      }
    );
  }

  clearFilters() {
    this.state.setSearchTerm('');
    this.lastRawSearchTerm = '';
    this.clearSnippets();
    this.toggleEmptyState(false);

    const flatList = this.state.getElement('flatList');
    if (flatList) {
      const posts = flatList.querySelectorAll('.directory-file');
      posts.forEach(post => {
        post.style.display = 'none';
        post.dataset.visible = 'false';
        post.dataset.searchRank = '';
        this.removeSnippet(post);
      });
      flatList.style.display = 'none';
    }

    this.viewRenderer.showDirectoryView();
    this.viewRenderer.updateVisibleCount();
  }

  getVisibleCount() {
    const flatList = this.state.getElement('flatList');
    if (!flatList) return 0;
    return flatList.querySelectorAll('.directory-file[data-visible="true"]').length;
  }

  getVisiblePosts() {
    const flatList = this.state.getElement('flatList');
    if (!flatList) return [];
    return Array.from(flatList.querySelectorAll('.directory-file[data-visible="true"]'));
  }

  ensurePostElementIndex() {
    if (this.postElements.length > 0) {
      return;
    }

    const flatList = this.state.getElement('flatList');
    if (!flatList) return;

    const posts = flatList.querySelectorAll('.directory-file');
    posts.forEach(post => {
      const link = post.querySelector('a.file-link');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;

      const normalized = this.normalizeUrl(href);
      if (!normalized) return;

      this.postElements.push(post);
      this.postElementsByUrl.set(normalized, post);

      const alternate = this.addAlternateUrlKey(normalized);
      if (alternate) {
        this.postElementsByUrl.set(alternate, post);
      }
    });
  }

  addAlternateUrlKey(url) {
    if (!url || url === '/') return null;
    if (url.endsWith('/')) {
      return url.slice(0, -1);
    }
    return `${url}/`;
  }

  buildScopeSet(path) {
    const posts = this.categoryHierarchy.getAllPosts(path);
    const scope = new Set();

    posts.forEach(post => {
      if (!post || !post.url) return;
      const normalized = this.normalizeUrl(post.url);
      if (normalized) {
        scope.add(normalized);
        const alt = this.addAlternateUrlKey(normalized);
        if (alt) scope.add(alt);
      }
    });

    return scope;
  }

  urlInScope(doc, scopeSet) {
    if (!scopeSet) return true;
    if (doc.normalizedUrl && scopeSet.has(doc.normalizedUrl)) return true;
    if (doc.url) {
      const normalized = this.normalizeUrl(doc.url);
      if (scopeSet.has(normalized)) return true;
    }
    return false;
  }

  renderSnippets(postElement, snippets) {
    const info = postElement.querySelector('.file-info');
    if (!info) return;

    let container = postElement.querySelector('.search-preview');
    if (!container) {
      container = document.createElement('div');
      container.className = 'search-preview';
      info.appendChild(container);
    }

    container.innerHTML = '';

    snippets.slice(0, MAX_SNIPPETS_PER_POST).forEach(snippet => {
      if (!snippet || !snippet.html) return;

      const snippetEl = document.createElement('div');
      snippetEl.className = 'search-snippet';

      if (snippet.type) {
        snippetEl.dataset.snippetType = snippet.type;
      }

      if (snippet.headingLabel) {
        const headingEl = document.createElement('div');
        headingEl.className = 'search-snippet-heading';
        headingEl.textContent = snippet.headingLabel;
        snippetEl.appendChild(headingEl);
      }

      const textEl = document.createElement('div');
      textEl.className = 'search-snippet-text';
      textEl.innerHTML = snippet.html;
      snippetEl.appendChild(textEl);

      container.appendChild(snippetEl);
    });
  }

  removeSnippet(postElement) {
    if (!postElement) return;
    const preview = postElement.querySelector('.search-preview');
    if (preview) {
      preview.remove();
    }
  }

  clearSnippets() {
    if (this.postElements.length === 0) {
      this.ensurePostElementIndex();
    }

    this.postElements.forEach(post => this.removeSnippet(post));
  }

  toggleEmptyState(show, term = '') {
    const emptyState = this.state.getElement('searchEmptyState');
    const messageEl = this.state.getElement('searchEmptyMessage');

    if (!emptyState) return;

    if (show) {
      if (messageEl) {
        const displayTerm = term ? term.trim() : '';
        const message = displayTerm
          ? `No results for "${displayTerm}"`
          : 'No results found';
        messageEl.textContent = message;
      }

      emptyState.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
    }
  }

  handleStateChange(snapshot) {
    if (!snapshot) return;

    const newPath = snapshot.path || '';
    if (newPath === this.lastNavigationPath) {
      return;
    }

    this.lastNavigationPath = newPath;

    if (this.lastRawSearchTerm) {
      this.clearFilters();
    } else {
      this.clearSnippets();
      this.toggleEmptyState(false);
      const flatList = this.state.getElement('flatList');
      if (flatList) {
        flatList.querySelectorAll('.directory-file').forEach(post => {
          if (post.dataset.searchRank) {
            post.dataset.searchRank = '';
          }
        });
      }
    }
  }

  tokenize(term) {
    return term
      .split(/\s+/)
      .map(token => token.trim().toLowerCase())
      .filter(token => token.length > 0);
  }

  containsAnyToken(text, tokens) {
    if (!text || tokens.length === 0) return false;
    const lower = text.toLowerCase();
    return tokens.some(token => lower.includes(token));
  }

  createSnippet(type, text, heading, tokens) {
    if (!text) return null;
    const clipped = this.clipSnippet(text, tokens);
    if (!clipped) return null;

    const headingLabel = Array.isArray(heading)
      ? heading.filter(Boolean).join(' > ')
      : '';

    return {
      type,
      headingLabel,
      html: this.highlightText(clipped, tokens)
    };
  }

  clipSnippet(text, tokens) {
    const value = text.toString().trim();
    if (!value) return '';

    const lower = value.toLowerCase();
    let matchIndex = -1;
    let matchLength = 0;

    tokens.forEach(token => {
      const idx = lower.indexOf(token);
      if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
        matchIndex = idx;
        matchLength = token.length;
      }
    });

    if (matchIndex === -1 && value.length <= SNIPPET_CONTEXT_CHARS * 2) {
      return value;
    }

    const start = matchIndex === -1
      ? 0
      : Math.max(0, matchIndex - SNIPPET_CONTEXT_CHARS);
    const end = matchIndex === -1
      ? Math.min(value.length, SNIPPET_CONTEXT_CHARS * 2)
      : Math.min(value.length, matchIndex + matchLength + SNIPPET_CONTEXT_CHARS);

    let snippet = value.slice(start, end).trim();
    if (!snippet) return '';

    if (start > 0) {
      snippet = `... ${snippet}`;
    }

    if (end < value.length) {
      snippet = `${snippet} ...`;
    }

    return snippet;
  }

  highlightText(text, tokens) {
    if (!text) return '';
    const escaped = this.escapeHtml(text);
    if (!tokens || tokens.length === 0) return escaped;

    const pattern = tokens
      .map(token => Utils.escapeRegExp(token))
      .join('|');

    if (!pattern) return escaped;

    const regex = new RegExp(`(${pattern})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getSegmentWeight(type) {
    return SEGMENT_WEIGHTS[type] || 1;
  }

  normalizeUrl(url) {
    if (!url) return '';
    let clean = url.split('#')[0].split('?')[0].trim();
    if (!clean) return '';

    try {
      const parsed = new URL(clean, window.location.origin);
      clean = parsed.pathname || clean;
    } catch (error) {
      // Keep relative path when URL constructor fails.
    }

    if (!clean.startsWith('/')) {
      clean = `/${clean}`;
    }

    clean = clean.replace(/\/{2,}/g, '/');
    return clean;
  }
}
