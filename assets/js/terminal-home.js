/**
 * Terminal-style Home Page Controller
 * Handles command bar input, category navigation, and directory-style post listing
 */

(function() {
  'use strict';

  const TerminalHome = {
    currentCategory: '',
    currentSort: 'time',
    currentSortReverse: false,
    searchTerm: '',
    
    elements: {
      input: null,
      currentDir: null,
      categoryChips: null,
      statusLocation: null,
      statusSort: null,
      visibleCount: null,
      categoryDirs: null,
      flatList: null,
      helpModal: null
    },
    
    init() {
      this.cacheElements();
      this.bindEvents();
      this.setupKeyboardShortcuts();
      this.collapseAllCategories();
      this.checkUrlParams();
    },
    
    cacheElements() {
      this.elements.input = document.getElementById('terminal-input');
      this.elements.currentDir = document.querySelector('.terminal-current-dir');
      this.elements.statusLocation = document.querySelector('.current-location strong');
      this.elements.statusSort = document.querySelector('.sort-indicator strong');
      this.elements.visibleCount = document.getElementById('visible-count');
      this.elements.categoryDirs = document.querySelectorAll('.category-directory');
      this.elements.flatList = document.getElementById('flat-post-list');
      this.elements.helpModal = document.getElementById('terminal-help-modal');
      this.elements.directoryView = document.querySelector('.terminal-directory-view');
      this.elements.rootHeader = document.getElementById('root-directory-header');
      this.elements.pathSegment = document.querySelector('.path-segment');
      this.elements.totalPosts = document.querySelector('.total-posts');
      this.elements.categoryCount = document.querySelector('.category-count');
      this.elements.directoryIcon = document.querySelector('.directory-path i');
    },
    
    bindEvents() {
      // Terminal input
      if (this.elements.input) {
        this.elements.input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.executeCommand(e.target.value.trim());
            e.target.value = '';
          } else if (e.key === 'Tab') {
            e.preventDefault();
            this.autocomplete(e.target);
          }
        });
      }
      
      // Control buttons for sorting
      document.querySelectorAll('.control-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', () => {
          const command = btn.dataset.command;
          
          // Handle reset separately
          if (command === 'clear') {
            this.resetAllSettings();
            return;
          }
          
          // Update input and execute
          if (this.elements.input) {
            this.elements.input.value = command;
          }
          this.executeCommand(command);
          
          // Update active state for sort buttons
          if (btn.dataset.sort) {
            document.querySelectorAll('.control-btn[data-sort]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          }
        });
      });
      
      // View mode buttons
      document.querySelectorAll('.control-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.dataset.view;
          const isDetailed = view === 'detailed';
          
          this.toggleDetailedView(isDetailed);
          
          // Update active state
          document.querySelectorAll('.control-btn[data-view]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Update command input
          if (this.elements.input) {
            if (isDetailed) {
              this.elements.input.value = 'ls -la';
            } else {
              this.elements.input.value = 'ls';
            }
          }
        });
      });
      
      // Directory folder expansion
      document.querySelectorAll('.directory-folder').forEach(folder => {
        folder.addEventListener('click', (e) => {
          // If clicking expand button, toggle expansion
          if (e.target.closest('.directory-expand')) {
            e.stopPropagation();
            this.toggleCategoryExpansion(folder);
          } else {
            // Otherwise, navigate to category
            const categoryDir = folder.closest('.category-directory');
            if (categoryDir) {
              const category = categoryDir.dataset.category;
              console.log('Navigating to category:', category);
              this.navigateToCategory(category);
            }
          }
        });
        
        // Make folder clickable with pointer cursor
        folder.style.cursor = 'pointer';
      });
      
      // Root directory header click (go back to all categories)
      const rootHeader = document.getElementById('root-directory-header');
      if (rootHeader) {
        rootHeader.addEventListener('click', () => {
          this.navigateToCategory('');
        });
      }
      
      // Help button
      const helpBtn = document.querySelector('.terminal-help-btn');
      if (helpBtn) {
        helpBtn.addEventListener('click', () => this.showHelp());
      }
      
      // Help modal close
      const closeBtn = document.querySelector('.terminal-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideHelp());
      }
      
      // Close modal on outside click
      if (this.elements.helpModal) {
        this.elements.helpModal.addEventListener('click', (e) => {
          if (e.target === this.elements.helpModal) {
            this.hideHelp();
          }
        });
      }
    },
    
    bindSettingsOptions() {
      // Sort direction buttons
      document.querySelectorAll('.sort-dir-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const command = btn.dataset.command;
          const sortType = btn.dataset.sort;
          const sortDir = btn.dataset.dir;
          
          // Update radio button
          const radio = document.querySelector(`input[name="sort-type"][value="${sortType}"]`);
          if (radio) radio.checked = true;
          
          // Highlight active button
          document.querySelectorAll('.sort-dir-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          this.executeCommandFromSettings(command);
        });
      });
    },
    
    toggleDetailedView(show) {
      const fileDetails = document.querySelectorAll('.file-details');
      fileDetails.forEach(detail => {
        detail.style.display = show ? 'block' : 'none';
      });
    },
    
    resetAllSettings() {
      // Reset to defaults
      this.currentCategory = '';
      this.currentSort = 'time';
      this.currentSortReverse = false;
      this.searchTerm = '';
      
      // Reset UI
      this.toggleDetailedView(false);
      this.collapseAllCategories();
      this.navigateToCategory('');
      
      // Reset control buttons
      document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
      const defaultSortBtn = document.querySelector('.control-btn[data-sort="time"][data-dir="desc"]');
      if (defaultSortBtn) defaultSortBtn.classList.add('active');
      
      const compactBtn = document.querySelector('.control-btn[data-view="compact"]');
      if (compactBtn) compactBtn.classList.add('active');
      
      // Update command input
      if (this.elements.input) {
        this.elements.input.value = 'ls ./';
      }
      
      // Show feedback
      const resetBtn = document.querySelector('.control-btn[data-command="clear"]');
      if (resetBtn) {
        const originalHTML = resetBtn.innerHTML;
        resetBtn.innerHTML = '<i class="fas fa-check"></i> reset';
        resetBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        
        setTimeout(() => {
          resetBtn.innerHTML = originalHTML;
          resetBtn.style.background = '';
        }, 1500);
      }
    },
    
    executeCommandFromSettings(command) {
      // Update input field to show command
      if (this.elements.input) {
        this.elements.input.value = command;
      }
      
      // Execute the command
      this.executeCommand(command);
      
      // Visual feedback - briefly highlight the input
      if (this.elements.input) {
        this.elements.input.style.background = 'rgba(var(--link-color-rgb, 0, 86, 178), 0.1)';
        setTimeout(() => {
          this.elements.input.style.background = '';
        }, 500);
      }
    },
    
    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus terminal
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.elements.input?.focus();
        }
        
        // ? to show help
        if (e.key === '?' && !this.elements.input.matches(':focus')) {
          e.preventDefault();
          this.showHelp();
        }
        
        // Escape to clear/go back
        if (e.key === 'Escape') {
          if (this.elements.helpModal.style.display !== 'none') {
            this.hideHelp();
          } else if (this.currentCategory) {
            this.navigateToCategory('');
          }
        }
      });
    },
    
    executeCommand(command) {
      if (!command) return;
      
      const parts = command.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      switch (cmd) {
        case 'cd':
          this.handleCd(args[0]);
          break;
        case 'ls':
          this.handleLs(args);
          break;
        case 'grep':
          this.handleGrep(args.join(' '));
          break;
        case 'clear':
          this.handleClear();
          break;
        case 'help':
        case '?':
          this.showHelp();
          break;
        default:
          this.showError(`Command not found: ${cmd}. Type 'help' for available commands.`);
      }
    },
    
    handleCd(path) {
      if (!path || path === '~' || path === '..') {
        this.navigateToCategory('');
      } else {
        // Find matching category
        const category = this.findCategory(path);
        if (category) {
          this.navigateToCategory(category);
        } else {
          this.showError(`Category not found: ${path}`);
        }
      }
    },
    
    handleLs(args) {
      let sortType = 'time';
      let reverse = false;
      let detailedView = false;
      let expandFolders = false;
      
      args.forEach(arg => {
        if (arg.includes('t')) sortType = 'time';
        if (arg.includes('S')) sortType = 'size';
        if (arg.includes('n')) sortType = 'name';
        if (arg.includes('r')) reverse = true;
        if (arg.includes('a')) {
          expandFolders = true;
          detailedView = true;
        }
        if (arg.includes('l')) detailedView = true;
      });
      
      this.currentSort = sortType;
      this.currentSortReverse = reverse;
      
      // Toggle detailed view for files
      this.toggleDetailedView(detailedView);
      
      // Expand folders if -a flag
      if (expandFolders) {
        this.expandAllCategories();
      }
      
      this.updateSortIndicator();
      this.sortPosts();
    },
    
    handleGrep(term) {
      if (!term) {
        this.showError('Usage: grep <search term>');
        return;
      }
      
      this.searchTerm = term.toLowerCase();
      this.filterPosts();
    },
    
    handleClear() {
      this.searchTerm = '';
      this.navigateToCategory('');
    },
    
    navigateToCategory(category) {
      this.currentCategory = category;
      
      // Update URL with category parameter
      const url = new URL(window.location);
      if (category) {
        url.searchParams.set('dir', category);
      } else {
        url.searchParams.delete('dir');
      }
      window.history.pushState({}, '', url);
      
      // Update UI
      this.updateStatusBar();
      this.updateCurrentDir();
      this.updateDirectoryHeader();
      
      if (category) {
        // Show flat list for specific category
        this.showFlatList(category);
      } else {
        // Show directory view for all categories
        this.showDirectoryView();
      }
      
      this.updateVisibleCount();
    },
    
    checkUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const dir = params.get('dir');
      
      if (dir) {
        // Navigate to the category from URL parameter
        this.navigateToCategory(dir);
      }
    },
    
    updateCurrentDir() {
      if (this.elements.currentDir) {
        if (this.currentCategory) {
          this.elements.currentDir.textContent = this.getCategoryName(this.currentCategory);
        } else {
          this.elements.currentDir.textContent = '';
        }
      }
    },
    
    updateStatusBar() {
      if (this.elements.statusLocation) {
        if (this.currentCategory) {
          const categoryName = this.getCategoryName(this.currentCategory);
          this.elements.statusLocation.textContent = categoryName + '/';
        } else {
          this.elements.statusLocation.textContent = '~';
        }
      }
    },
    
    updateDirectoryHeader() {
      if (!this.elements.pathSegment) return;
      
      if (this.currentCategory) {
        // When in a category, show parent directory indicator
        this.elements.pathSegment.textContent = '../';
        
        // Update icon to show we're in a subdirectory
        if (this.elements.directoryIcon) {
          this.elements.directoryIcon.className = 'fas fa-level-up-alt';
        }
        
        // Update header title
        if (this.elements.rootHeader) {
          this.elements.rootHeader.title = 'Click to go back to parent directory';
        }
        
        // Update statistics to show current category info
        const categoryDir = document.querySelector(`.category-directory[data-category="${this.currentCategory}"]`);
        if (categoryDir) {
          const posts = this.elements.flatList.querySelectorAll('.directory-file');
          let visibleCount = 0;
          posts.forEach(post => {
            const categories = post.dataset.categories.split(',');
            if (categories.includes(this.currentCategory)) {
              visibleCount++;
            }
          });
          
          const categoryName = this.getCategoryName(this.currentCategory);
          
          if (this.elements.totalPosts) {
            this.elements.totalPosts.textContent = `${visibleCount} posts`;
          }
          if (this.elements.categoryCount) {
            this.elements.categoryCount.textContent = `in ${categoryName}`;
          }
        }
      } else {
        // When at root, show current directory indicator
        this.elements.pathSegment.textContent = './';
        
        // Update icon back to folder
        if (this.elements.directoryIcon) {
          this.elements.directoryIcon.className = 'fas fa-folder-open';
        }
        
        // Update header title
        if (this.elements.rootHeader) {
          this.elements.rootHeader.title = 'Click to return to root';
        }
        
        // Reset statistics to show all posts
        const allPosts = document.querySelectorAll('.category-directory');
        const categoryCount = allPosts.length;
        
        // Count all posts in flat list
        const totalPosts = this.elements.flatList.querySelectorAll('.directory-file').length;
        
        if (this.elements.totalPosts) {
          this.elements.totalPosts.textContent = `${totalPosts} posts`;
        }
        if (this.elements.categoryCount) {
          this.elements.categoryCount.textContent = `${categoryCount} categories`;
        }
      }
    },
    
    updateSortIndicator() {
      if (this.elements.statusSort) {
        const sortMap = {
          'time': '-t',
          'size': '-S',
          'name': '-n'
        };
        let indicator = sortMap[this.currentSort] || '-t';
        if (this.currentSortReverse) indicator += 'r';
        
        this.elements.statusSort.textContent = indicator;
      }
    },
    
    showFlatList(category) {
      // Hide directory view
      this.elements.categoryDirs.forEach(dir => {
        dir.style.display = 'none';
      });
      
      // Show flat list
      if (this.elements.flatList) {
        this.elements.flatList.style.display = 'block';
        
        // Filter posts by category
        const posts = this.elements.flatList.querySelectorAll('.directory-file');
        posts.forEach(post => {
          const categories = post.dataset.categories.split(',');
          if (categories.includes(category)) {
            post.style.display = 'flex';
          } else {
            post.style.display = 'none';
          }
        });
      }
    },
    
    showDirectoryView() {
      // Hide flat list
      if (this.elements.flatList) {
        this.elements.flatList.style.display = 'none';
      }
      
      // Show directory view
      this.elements.categoryDirs.forEach(dir => {
        dir.style.display = 'block';
      });
    },
    
    toggleCategoryExpansion(folder) {
      const categoryDir = folder.closest('.category-directory');
      const contents = categoryDir.querySelector('.directory-contents');
      
      if (contents.style.display === 'none') {
        contents.style.display = 'block';
        folder.classList.add('expanded');
      } else {
        contents.style.display = 'none';
        folder.classList.remove('expanded');
      }
    },
    
    collapseAllCategories() {
      document.querySelectorAll('.directory-folder').forEach(folder => {
        const categoryDir = folder.closest('.category-directory');
        const contents = categoryDir.querySelector('.directory-contents');
        contents.style.display = 'none';
        folder.classList.remove('expanded');
      });
    },
    
    expandAllCategories() {
      document.querySelectorAll('.directory-folder').forEach(folder => {
        const categoryDir = folder.closest('.category-directory');
        const contents = categoryDir.querySelector('.directory-contents');
        contents.style.display = 'block';
        folder.classList.add('expanded');
      });
    },
    
    sortPosts() {
      const container = this.currentCategory ? this.elements.flatList : null;
      if (!container) return;
      
      const posts = Array.from(container.querySelectorAll('.directory-file'));
      
      posts.sort((a, b) => {
        let aVal, bVal;
        
        switch (this.currentSort) {
          case 'time':
            aVal = parseInt(a.dataset.date);
            bVal = parseInt(b.dataset.date);
            break;
          case 'size':
            aVal = parseInt(a.dataset.size);
            bVal = parseInt(b.dataset.size);
            break;
          case 'name':
            aVal = a.querySelector('.file-name').textContent;
            bVal = b.querySelector('.file-name').textContent;
            break;
        }
        
        let result = aVal > bVal ? 1 : -1;
        return this.currentSortReverse ? -result : result;
      });
      
      posts.forEach(post => container.appendChild(post));
    },
    
    filterPosts() {
      const posts = document.querySelectorAll('.directory-file');
      let visibleCount = 0;
      
      posts.forEach(post => {
        const title = post.querySelector('.file-name').textContent.toLowerCase();
        const desc = post.querySelector('.file-description')?.textContent.toLowerCase() || '';
        
        if (title.includes(this.searchTerm) || desc.includes(this.searchTerm)) {
          post.style.display = 'flex';
          visibleCount++;
        } else {
          post.style.display = 'none';
        }
      });
      
      this.updateVisibleCount(visibleCount);
    },
    
    updateVisibleCount(count) {
      if (this.elements.visibleCount) {
        if (count !== undefined) {
          this.elements.visibleCount.textContent = count;
        } else {
          // Count visible posts
          const visible = document.querySelectorAll('.directory-file[style*="display: flex"], .directory-file:not([style*="display"])').length;
          this.elements.visibleCount.textContent = visible;
        }
      }
    },
    
    findCategory(input) {
      // Find category by slug or name from directory elements
      const categoryDirs = document.querySelectorAll('.category-directory');
      const inputLower = input.toLowerCase();
      
      for (const dir of categoryDirs) {
        const slug = dir.dataset.category;
        const folderName = dir.querySelector('.folder-name');
        const name = folderName ? folderName.textContent.replace('/', '').trim().toLowerCase() : '';
        
        if (slug === inputLower || name === inputLower || slug.includes(inputLower)) {
          return slug;
        }
      }
      
      return null;
    },
    
    getCategoryName(slug) {
      // Get category name from directory element
      const categoryDir = document.querySelector(`.category-directory[data-category="${slug}"]`);
      if (categoryDir) {
        const folderName = categoryDir.querySelector('.folder-name');
        return folderName ? folderName.textContent.replace('/', '').trim() : slug;
      }
      return slug;
    },
    
    autocomplete(input) {
      const value = input.value.trim();
      const parts = value.split(/\s+/);
      const cmd = parts[0];
      
      if (cmd === 'cd' && parts.length === 2) {
        const partial = parts[1].toLowerCase();
        const categoryDirs = document.querySelectorAll('.category-directory');
        const categories = Array.from(categoryDirs).map(dir => dir.dataset.category);
        const matches = categories.filter(cat => cat.startsWith(partial));
        
        if (matches.length === 1) {
          input.value = `cd ${matches[0]}`;
        }
      }
    },
    
    showHelp() {
      if (this.elements.helpModal) {
        this.elements.helpModal.style.display = 'flex';
      }
    },
    
    hideHelp() {
      if (this.elements.helpModal) {
        this.elements.helpModal.style.display = 'none';
      }
    },
    
    showError(message) {
      // Could implement a toast notification system here
      console.error(message);
      
      // For now, flash the input border
      if (this.elements.input) {
        this.elements.input.style.borderColor = '#ef4444';
        setTimeout(() => {
          this.elements.input.style.borderColor = '';
        }, 1000);
      }
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TerminalHome.init());
  } else {
    TerminalHome.init();
  }
  
  // Expose for debugging
  window.TerminalHome = TerminalHome;
})();
