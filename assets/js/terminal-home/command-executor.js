/**
 * Terminal Home - Command Executor
 * Orchestrates command parsing and delegates to controllers
 */

import { CommandParser } from './command-parser.js';

export class CommandExecutor {
  constructor({
    state,
    navigationManager,
    sortManager,
    searchController,
    viewRenderer,
  }) {
    this.state = state;
    this.navigationManager = navigationManager;
    this.sortManager = sortManager;
    this.searchController = searchController;
    this.viewRenderer = viewRenderer;
  }

  execute(commandString) {
    const parsed = CommandParser.parse(commandString);

    if (!parsed || !parsed.isValid) {
      this.showError('Unknown command. Type "help" for available commands.');
      return;
    }

    switch (parsed.command) {
      case 'cd':
        this.executeCD(parsed.args);
        break;
      case 'ls':
        this.executeLS(parsed.args);
        break;
      case 'grep':
        this.executeGrep(parsed.args);
        break;
      case 'clear':
        this.executeClear();
        break;
      case 'help':
      case '?':
        this.executeHelp();
        break;
      default:
        this.showError('Command not implemented.');
    }
  }

  executeCD(args) {
    const path = CommandParser.parseCdPath(args);
    this.navigationManager.navigateRelative(path);
    this.updateViews();
  }

  executeLS(args) {
    const flags = CommandParser.parseLsFlags(args);

    this.sortManager.setSortType(flags.sort, flags.reverse);
    this.state.setDetailedView(flags.detailed);
    this.viewRenderer.toggleDetailedView(flags.detailed);

    if (flags.expandAll) {
      this.viewRenderer.expandAllCategories();
    }

    this.updateViews();
  }

  executeGrep(args) {
    let term = args.join(' ').trim();
    // Strip surrounding matching quotes: "foo bar" or 'foo bar'
    if (term.length >= 2) {
      const first = term[0];
      const last = term[term.length - 1];
      if ((first === '"' || first === "'") && first === last) {
        term = term.slice(1, -1);
      }
    }
    this.searchController.applySearch(term);
    this.viewRenderer.updateVisibleCount();
  }

  executeClear() {
    this.state.batch(() => {
      this.state.reset({
        path: '',
        segments: [],
        sort: 'time',
        sortReverse: false,
        searchTerm: '',
        viewDetailed: false,
      });
    });

    this.searchController.clearFilters();
    this.viewRenderer.toggleDetailedView(false);
    this.viewRenderer.collapseAllCategories();
    this.navigationManager.navigateRelative('');
    this.sortManager.setSortType('time', false);

    this.updateViews();
    this.updateControlButtons();

    const input = this.state.getElement('input');
    if (input) {
      input.value = '';
    }
  }

  executeHelp() {
    const modal = this.state.getElement('helpModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  updateViews() {
    const { currentPath } = this.state.navigation;

    this.viewRenderer.updateCurrentDir();
    this.viewRenderer.updateStatusBar();
    this.viewRenderer.updateDirectoryHeader();

    if (currentPath) {
      this.viewRenderer.refreshForPath(currentPath);
    } else {
      this.viewRenderer.showDirectoryView('');
    }

    this.viewRenderer.updateVisibleCount();
  }

  updateControlButtons() {
    document.querySelectorAll('.control-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    const defaultSortBtn = document.querySelector(
      '.control-btn[data-sort="time"]',
    );
    if (defaultSortBtn) {
      defaultSortBtn.classList.add('active');
      defaultSortBtn.dataset.dir = 'desc';
      const arrow = defaultSortBtn.querySelector('.sort-direction');
      if (arrow) {
        arrow.className = 'fas fa-arrow-down sort-direction';
        arrow.style.opacity = '1';
      }
    }

    document.querySelectorAll('.control-btn[data-sort]').forEach((btn) => {
      if (!btn.classList.contains('active')) {
        const arrow = btn.querySelector('.sort-direction');
        if (arrow) {
          arrow.className = 'fas fa-arrow-down sort-direction';
          arrow.style.opacity = '0.3';
        }
      }
    });

    const compactBtn = document.querySelector(
      '.control-btn[data-view="compact"]',
    );
    if (compactBtn) {
      compactBtn.classList.add('active');
    }
  }

  showError(message) {
    console.error('Terminal Error:', message);

    let errorToast = document.getElementById('terminal-error-toast');
    if (!errorToast) {
      errorToast = document.createElement('div');
      errorToast.id = 'terminal-error-toast';
      errorToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.875rem;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(errorToast);
    }

    errorToast.textContent = message;
    errorToast.style.opacity = '1';

    const input = this.state.getElement('input');
    if (input) {
      const originalBorder = input.style.borderColor;
      input.style.borderColor = '#ef4444';
      setTimeout(() => {
        input.style.borderColor = originalBorder;
      }, 1000);
    }

    setTimeout(() => {
      errorToast.style.opacity = '0';
    }, 3000);
  }
}
