/**
 * Terminal Home - Event Manager
 * Encapsulates event binding with explicit teardown
 */

export class EventManager {
  constructor({ state, commandExecutor, navigationManager, sortManager, viewRenderer }) {
    this.state = state;
    this.commandExecutor = commandExecutor;
    this.navigationManager = navigationManager;
    this.sortManager = sortManager;
    this.viewRenderer = viewRenderer;
    this.handlers = {};
  }

  bindAll() {
    this.bindCommandInput();
    this.bindControlButtons();
    this.bindFolderClicks();
    this.bindRootHeader();
    this.bindHelpModal();
    this.bindKeyboardShortcuts();
  }

  bindCommandInput() {
    const input = this.state.getElement('input');
    if (!input) return;

    this.handlers.commandInput = (event) => {
      if (event.key === 'Enter') {
        const command = input.value.trim();
        if (command) {
          this.commandExecutor.execute(command);
        }
      }
    };

    input.addEventListener('keypress', this.handlers.commandInput);
  }

  bindControlButtons() {
    const sortButtons = document.querySelectorAll('.control-btn[data-sort]');
    sortButtons.forEach(btn => {
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
    viewButtons.forEach(btn => {
      const handler = () => {
        const detailed = btn.dataset.view === 'detailed';
        this.state.setDetailedView(detailed);
        this.viewRenderer.toggleDetailedView(detailed);

        viewButtons.forEach(button => button.classList.remove('active'));
        btn.classList.add('active');
      };

      btn.addEventListener('click', handler);
    });

    const resetBtn = document.querySelector('.control-btn[data-command="clear"]');
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

      const categoryPath = categoryDir.dataset.categoryPath || categoryDir.dataset.category;
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
      if (!input) return;

      if (event.key === '?' && !input.matches(':focus')) {
        event.preventDefault();
        this.commandExecutor.executeHelp();
      }

      if (event.key === 'Escape') {
        const helpModal = this.state.getElement('helpModal');
        if (helpModal && helpModal.style.display !== 'none') {
          this.hideHelp();
        } else if (this.state.navigation.currentPath) {
          this.navigationManager.goBack();
          this.commandExecutor.updateViews();
        }
      }
    };

    document.addEventListener('keydown', this.handlers.keyboard);
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
      input.removeEventListener('keypress', this.handlers.commandInput);
    }

    const resetBtn = document.querySelector('.control-btn[data-command="clear"]');
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
      directoryView.removeEventListener('keydown', this.handlers.directoryKeydown);
    }

    if (this.handlers.keyboard) {
      document.removeEventListener('keydown', this.handlers.keyboard);
    }

    this.handlers = {};
  }
}
