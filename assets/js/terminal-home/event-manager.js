/**
 * Terminal Home - Event Manager
 * Encapsulates event binding with explicit teardown
 */

export class EventManager {
  constructor({
    state,
    commandExecutor,
    navigationManager,
    sortManager,
    viewRenderer,
    searchController,
  }) {
    this.state = state;
    this.commandExecutor = commandExecutor;
    this.navigationManager = navigationManager;
    this.sortManager = sortManager;
    this.viewRenderer = viewRenderer;
    this.searchController = searchController;
    this.handlers = {};
  }

  bindAll() {
    this.bindCommandInput();
    this.bindControlButtons();
    this.bindFolderClicks();
    this.bindRootHeader();
    this.bindHelpModal();
    this.bindKeyboardShortcuts();
    this.bindHistory();
  }

  bindCommandInput() {
    const input = this.state.getElement('input');
    if (!input) return;

    this.handlers.commandInput = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const command = input.value.trim();
        if (command) {
          this.commandExecutor.execute(command);
        }
      }
    };

    input.addEventListener('keydown', this.handlers.commandInput);

    // Live search: when the user types text that doesn't look like a command,
    // treat it as an incremental grep query.
    if (this.searchController) {
      this.handlers.commandLiveInput = () => {
        const value = input.value;
        const trimmed = value.trim();
        if (!trimmed) {
          this.searchController.applySearch('');
          return;
        }
        const first = trimmed.split(/\s+/)[0].toLowerCase();
        const looksLikeCommand = [
          'cd',
          'ls',
          'grep',
          'clear',
          'help',
          '?',
        ].includes(first);
        if (looksLikeCommand) {
          // Wait for Enter to execute commands; don't run live.
          return;
        }
        if (this.searchController.applySearchDebounced) {
          this.searchController.applySearchDebounced(trimmed);
        } else {
          this.searchController.applySearch(trimmed);
        }
      };
      input.addEventListener('input', this.handlers.commandLiveInput);
    }
  }

  bindControlButtons() {
    const sortButtons = document.querySelectorAll('.control-btn[data-sort]');
    sortButtons.forEach((btn) => {
      const handler = () => {
        const sort = btn.dataset.sort;
        const currentDir = btn.dataset.dir;
        const isActive = btn.classList.contains('active');
        let reverse = currentDir === 'asc';

        if (isActive) {
          reverse = !reverse;
          btn.dataset.dir = reverse ? 'asc' : 'desc';
        } else {
          btn.dataset.dir = 'desc';
          reverse = false;
        }

        this.sortManager.setSortType(sort, reverse);
      };

      btn.addEventListener('click', handler);
    });

    const viewButtons = document.querySelectorAll('.control-btn[data-view]');
    viewButtons.forEach((btn) => {
      const handler = () => {
        const detailed = btn.dataset.view === 'detailed';
        this.state.setDetailedView(detailed);
        this.viewRenderer.toggleDetailedView(detailed);

        viewButtons.forEach((button) => button.classList.remove('active'));
        btn.classList.add('active');
      };

      btn.addEventListener('click', handler);
    });

    const resetBtn = document.querySelector(
      '.control-btn[data-command="clear"]',
    );
    if (resetBtn) {
      this.handlers.resetBtn = () => {
        this.commandExecutor.executeClear();
      };
      resetBtn.addEventListener('click', this.handlers.resetBtn);
    }
  }

  bindFolderClicks() {
    const directoryView = this.state.getElement('directoryView');
    if (!directoryView) return;

    this.handlers.directoryClick = (event) => {
      // Handle "show more posts" click
      const moreButton = event.target.closest('.directory-more');
      if (moreButton) {
        event.stopPropagation();
        this.viewRenderer.showAllPostsInCategory(moreButton);
        return;
      }

      const folder = event.target.closest('.directory-folder');
      if (!folder || !directoryView.contains(folder)) {
        return;
      }

      if (event.target.closest('.directory-expand')) {
        event.stopPropagation();
        this.viewRenderer.toggleCategoryExpansion(folder);
        return;
      }

      const categoryDir = folder.closest('.category-directory');
      if (!categoryDir) {
        return;
      }

      const categoryPath =
        categoryDir.dataset.categoryPath || categoryDir.dataset.category;
      if (!categoryPath) {
        return;
      }

      this.navigationManager.navigateRelative(categoryPath);
      this.commandExecutor.updateViews();
    };

    // Keyboard support for "show more" button
    this.handlers.directoryKeydown = (event) => {
      const moreButton = event.target.closest('.directory-more');
      if (moreButton && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
        this.viewRenderer.showAllPostsInCategory(moreButton);
      }
    };

    directoryView.addEventListener('click', this.handlers.directoryClick);
    directoryView.addEventListener('keydown', this.handlers.directoryKeydown);
  }

  bindRootHeader() {
    const rootHeader = this.state.getElement('rootHeader');
    if (!rootHeader) return;

    this.handlers.rootHeader = () => {
      this.navigationManager.goBack();
      this.commandExecutor.updateViews();
    };

    rootHeader.addEventListener('click', this.handlers.rootHeader);
  }

  bindHelpModal() {
    const helpBtn = document.querySelector('.terminal-help-btn');
    if (helpBtn) {
      this.handlers.helpBtn = () => {
        this.commandExecutor.executeHelp();
      };
      helpBtn.addEventListener('click', this.handlers.helpBtn);
    }

    const closeBtn = document.querySelector('.terminal-modal-close');
    if (closeBtn) {
      this.handlers.closeBtn = () => {
        this.hideHelp();
      };
      closeBtn.addEventListener('click', this.handlers.closeBtn);
    }

    const helpModal = this.state.getElement('helpModal');
    if (helpModal) {
      this.handlers.modalOutsideClick = (event) => {
        if (event.target === helpModal) {
          this.hideHelp();
        }
      };
      helpModal.addEventListener('click', this.handlers.modalOutsideClick);
    }
  }

  bindKeyboardShortcuts() {
    this.handlers.keyboard = (event) => {
      const input = this.state.getElement('input');
      const helpModal = this.state.getElement('helpModal');
      const helpOpen = helpModal && helpModal.style.display === 'flex';
      const inputFocused = input && input.matches(':focus');

      // Ctrl/Cmd+K -> focus the terminal input
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (input) {
          event.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      if (event.key === '?' && !inputFocused) {
        const target = event.target;
        const isEditable =
          target &&
          (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
        if (isEditable) return;
        event.preventDefault();
        this.commandExecutor.executeHelp();
        return;
      }

      if (event.key === 'Escape') {
        if (helpOpen) {
          this.hideHelp();
          return;
        }
        if (inputFocused && input.value) {
          // Clear the prompt before navigating up.
          input.value = '';
          this.searchController?.applySearch('');
          return;
        }
        if (inputFocused) {
          input.blur();
          return;
        }
        if (this.state.navigation.currentPath) {
          this.navigationManager.goBack();
          this.commandExecutor.updateViews();
        }
      }
    };

    document.addEventListener('keydown', this.handlers.keyboard);
  }

  bindHistory() {
    this.handlers.popstate = () => {
      const params = new URLSearchParams(window.location.search);
      const dir = params.get('dir') || '';
      const applied = this.navigationManager.applyPathFromHistory(dir);
      if (applied) {
        this.commandExecutor.updateViews();
      }
    };
    window.addEventListener('popstate', this.handlers.popstate);
  }

  hideHelp() {
    const helpModal = this.state.getElement('helpModal');
    if (helpModal) {
      helpModal.style.display = 'none';
    }
  }

  destroy() {
    const input = this.state.getElement('input');
    if (this.handlers.commandInput && input) {
      input.removeEventListener('keydown', this.handlers.commandInput);
    }
    if (this.handlers.commandLiveInput && input) {
      input.removeEventListener('input', this.handlers.commandLiveInput);
    }

    const resetBtn = document.querySelector(
      '.control-btn[data-command="clear"]',
    );
    if (this.handlers.resetBtn && resetBtn) {
      resetBtn.removeEventListener('click', this.handlers.resetBtn);
    }

    const rootHeader = this.state.getElement('rootHeader');
    if (this.handlers.rootHeader && rootHeader) {
      rootHeader.removeEventListener('click', this.handlers.rootHeader);
    }

    const helpBtn = document.querySelector('.terminal-help-btn');
    if (this.handlers.helpBtn && helpBtn) {
      helpBtn.removeEventListener('click', this.handlers.helpBtn);
    }

    const closeBtn = document.querySelector('.terminal-modal-close');
    if (this.handlers.closeBtn && closeBtn) {
      closeBtn.removeEventListener('click', this.handlers.closeBtn);
    }

    const helpModal = this.state.getElement('helpModal');
    if (this.handlers.modalOutsideClick && helpModal) {
      helpModal.removeEventListener('click', this.handlers.modalOutsideClick);
    }

    const directoryView = this.state.getElement('directoryView');
    if (this.handlers.directoryClick && directoryView) {
      directoryView.removeEventListener('click', this.handlers.directoryClick);
    }
    if (this.handlers.directoryKeydown && directoryView) {
      directoryView.removeEventListener(
        'keydown',
        this.handlers.directoryKeydown,
      );
    }

    if (this.handlers.keyboard) {
      document.removeEventListener('keydown', this.handlers.keyboard);
    }

    if (this.handlers.popstate) {
      window.removeEventListener('popstate', this.handlers.popstate);
    }

    this.handlers = {};
  }
}
