/**
 * Analysis Management
 * @module playground/analysis-manager
 */

import { CONFIG } from './config.js';
import { StateHelpers } from './state.js';
import { DIAGNOSTIC_PATTERNS } from './config.js';
import { Utils } from './utils.js';
import { DocsProvider } from './docs-provider.js';

export const AnalysisManager = {
  /**
   * Display analysis results in Analysis tab
   */
  display(analysisResults) {
    const resultsContainer = document.querySelector('.analysis-results');
    if (!resultsContainer) return;

    const normalizedResults = Array.isArray(analysisResults) ? analysisResults : [];

    // Store for re-filtering
    StateHelpers.setAnalysisResults(normalizedResults);

    if (normalizedResults.length === 0) {
      resultsContainer.innerHTML = '<div class="analysis-empty"><p>Your code looks great.</p></div>';
      this.updateSummary(0, 0, 0);
      return;
    }

    const filteredResults = this.filterByCategory(normalizedResults);

    if (filteredResults.length === 0) {
      resultsContainer.innerHTML = '<div class="analysis-empty"><p>No issues match the selected filters.</p></div>';
      this.updateSummary(0, 0, 0);
      return;
    }

    let html = '';
    filteredResults.forEach((item) => {
      const severityClass = item.severity.toLowerCase();
      const diagId = item.diagnosticId || '';
      const docsUrl = DocsProvider.getDocsUrl(diagId);

      html += `
        <div class="analysis-item severity-${severityClass}" data-line="${item.line}" data-column="${item.column}" onclick="window.playground.highlightLine(${item.line}, ${item.column})" style="cursor: pointer;">
          <div class="analysis-header">
            <span class="analysis-severity">${item.severity}</span>
            ${diagId ? `
              <span class="analysis-diagnostic-id">
                ${diagId}
                ${docsUrl ? `<a href="${docsUrl}" target="_blank" class="docs-link" onclick="event.stopPropagation();" title="View Microsoft docs">📖</a>` : ''}
              </span>
            ` : ''}
          </div>
          <div class="analysis-content">
            <div class="analysis-message" title="${Utils.escapeHtml(item.message)}">${Utils.escapeHtml(item.message)}</div>
            <div class="analysis-location">Line ${item.line}:${item.column}</div>
          </div>
          <span class="analysis-category">${item.category}</span>
        </div>
      `;
    });

    resultsContainer.innerHTML = html;

    // Update summary
    const errors = filteredResults.filter(r => r.severity === 'Error').length;
    const warnings = filteredResults.filter(r => r.severity === 'Warning').length;
    const info = filteredResults.filter(r => r.severity === 'Info').length;
    this.updateSummary(errors, warnings, info);
  },

  /**
   * Update analysis summary counts
   */
  updateSummary(errors, warnings, info) {
    const errorCount = document.getElementById('errorCount');
    const warningCount = document.getElementById('warningCount');
    const infoCount = document.getElementById('infoCount');

    if (errorCount) errorCount.textContent = errors;
    if (warningCount) warningCount.textContent = warnings;
    if (infoCount) infoCount.textContent = info;
  },

  /**
   * Filter analysis results by selected categories
   */
  filterByCategory(results) {
    const activeFilters = StateHelpers.getCategoryFilters();

    return results.filter(item => {
      const category = (item.category || '').toLowerCase();
      const diagId = (item.diagnosticId || '').toUpperCase();

      // Check each active category filter
      for (const [filterName, isActive] of Object.entries(activeFilters)) {
        if (!isActive) continue;

        // Match by category name
        if (category === filterName) return true;

        // Match by diagnostic ID pattern
        const pattern = DIAGNOSTIC_PATTERNS[filterName];
        if (pattern && pattern.test(diagId)) return true;
      }

      return false;
    });
  },

  /**
   * Display diagnostics in the main editor
   */
  displayInEditor(analysisResults, result) {
    const mainEditor = StateHelpers.getEditor('main');
    if (!mainEditor || !mainEditor.getModel()) return;

    const markers = analysisResults.map(item => ({
      severity: monaco.MarkerSeverity[item.severity] || monaco.MarkerSeverity.Info,
      startLineNumber: item.line,
      startColumn: item.column,
      endLineNumber: item.line,
      endColumn: item.column + 1,
      message: item.message,
      source: 'C# Analysis',
    }));

    monaco.editor.setModelMarkers(mainEditor.getModel(), 'csharp', markers);
  },

  /**
   * Highlight a specific line in the editor
   */
  highlightLine(line, column) {
    const mainEditor = StateHelpers.getEditor('main');
    if (!mainEditor) return;

    try {
      // Reveal the line
      mainEditor.revealLineInCenter(line);

      // Set cursor position
      mainEditor.setPosition({ lineNumber: line, column: column || 1 });
      mainEditor.focus();

      // Add yellow highlight decoration
      const decorations = mainEditor.deltaDecorations(StateHelpers.getDecorations(), [
        {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
          },
        },
      ]);

      StateHelpers.setDecorations(decorations);

      // Remove highlight after duration
      setTimeout(() => {
        mainEditor.deltaDecorations(decorations, []);
        StateHelpers.setDecorations([]);
      }, CONFIG.ui.highlightDuration);

      Utils.log('✅', `Highlighted line ${line}, column ${column}`);
    } catch (err) {
      console.error('❌ Error highlighting line:', err);
    }
  },

  /**
   * Setup category filter checkboxes
   */
  setupCategoryFilters() {
    // Map of checkbox IDs to category names
    const categoryMap = {
      analyzerCompiler: 'compiler',
      analyzerDesign: 'design',
      analyzerPerformance: 'performance',
      analyzerSecurity: 'security',
      analyzerReliability: 'reliability',
      analyzerMaintainability: 'maintainability',
      analyzerUsage: 'usage',
      analyzerNaming: 'naming',
      analyzerInteroperability: 'interoperability',
      analyzerGlobalization: 'globalization',
    };

    // Setup individual checkbox listeners
    Object.entries(categoryMap).forEach(([checkboxId, category]) => {
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          StateHelpers.setCategoryFilter(category, e.target.checked);
          // Re-filter and display current analysis results
          this.display(StateHelpers.getAnalysisResults());
        });
      }
    });

    // Setup Select All button
    const selectAllBtn = document.getElementById('analyzerSelectAll');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        StateHelpers.setAllCategories(true);
        Object.entries(categoryMap).forEach(([checkboxId, category]) => {
          const checkbox = document.getElementById(checkboxId);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
        this.display(StateHelpers.getAnalysisResults());
      });
    }

    // Setup Deselect All button
    const deselectAllBtn = document.getElementById('analyzerDeselectAll');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        StateHelpers.setAllCategories(false);
        Object.entries(categoryMap).forEach(([checkboxId, category]) => {
          const checkbox = document.getElementById(checkboxId);
          if (checkbox) {
            checkbox.checked = false;
          }
        });
        this.display(StateHelpers.getAnalysisResults());
      });
    }
  },
};
