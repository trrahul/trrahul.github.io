/**
 * Code Execution
 * @module playground/code-executor
 */

import { CONFIG } from './config.js';
import { StateHelpers } from './state.js';
import { Utils } from './utils.js';
import { UIManager } from './ui-manager.js';
import { SyntaxTreeRenderer } from './syntax-tree-renderer.js';
import { AnalysisManager } from './analysis-manager.js';
import { ApiClient } from './api-client.js';

export const CodeExecutor = {
  /**
   * Execute C# code
   */
  async run() {
    Utils.log('🚀', 'runCode() called');

    const mainEditor = StateHelpers.getEditor('main');

    if (!mainEditor) {
      console.error('Editor not initialized');
      return;
    }

    // Clear previous diagnostics
    if (monaco && mainEditor.getModel()) {
      monaco.editor.setModelMarkers(mainEditor.getModel(), 'csharp', []);
    }

    const code = mainEditor.getValue().trim();

    if (!code) {
      UIManager.setOutput('Error: Please enter some code to execute.');
      return;
    }

    // Disable button and show running status
    UIManager.setButtonState(UIManager.elements.runBtn, true, '⏳ Running...');
    UIManager.setOutput('Running your code...');

    Utils.log('📤', 'Sending execution request to:', `${CONFIG.api.baseUrl}/ExecuteCode`);

    try {
      const { ok, data, error } = await ApiClient.post('ExecuteCode', { code });

      if (!ok) {
        throw new Error(error || 'Unknown error while executing code');
      }

      const result = data;

      if (result.success) {
        UIManager.setOutput(result.output || '(No output)');

        // Auto-switch to execution tab
        UIManager.switchToTab('execution');
      } else {
        const errorText = Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors.join('\n')
          : result.error || 'Unknown error';
        
        UIManager.setOutput(`Compilation Errors:\n\n${errorText}`, true);
      }
    } catch (error) {
      UIManager.setOutput(`Error calling API:\n${error.message}`, true);
    } finally {
      UIManager.setButtonState(UIManager.elements.runBtn, false, '▶ Run');
    }
  },

  /**
   * Disassemble C# code to IL and lowered C#
   */
  async disassemble() {
    Utils.log('🔍', 'disassembleCode() called');

    const mainEditor = StateHelpers.getEditor('main');
    const ilEditor = StateHelpers.getEditor('il');
    const asmEditor = StateHelpers.getEditor('asm');

    if (!mainEditor || !ilEditor || !asmEditor) {
      console.error('Editors not initialized');
      if (ilEditor) ilEditor.setValue('Error: Editors not fully initialized yet.');
      if (asmEditor) asmEditor.setValue('Error: Editors not fully initialized yet.');
      return;
    }

    // Clear previous diagnostics
    if (monaco && mainEditor.getModel()) {
      monaco.editor.setModelMarkers(mainEditor.getModel(), 'csharp', []);
    }

    const code = mainEditor.getValue().trim();

    if (!code) {
      ilEditor.setValue('Error: Please enter some code to disassemble.');
      asmEditor.setValue('Error: Please enter some code to disassemble.');
      return;
    }

    // Get optimization level
    const optimizationLevel = document.getElementById('optimizationLevel').value;

    // Disable button and show running status
    UIManager.setButtonState(UIManager.elements.disassembleBtn, true, '⏳ Disassembling...');
    ilEditor.setValue('Disassembling code...');
    asmEditor.setValue('Disassembling code...');

    Utils.log('📤', 'Sending disassembly request:', optimizationLevel);

    try {
      const { ok, data, error } = await ApiClient.post('DisassembleCode', { code, optimizationLevel });

      if (!ok) {
        throw new Error(error || 'Unknown error while disassembling code');
      }

      const result = data;

      if (result.success) {
        // Display IL code and lowered C#
        ilEditor.setValue(result.ilCode || '(No IL code generated)');
        asmEditor.setValue(result.loweredCSharp || '(No lowered C# generated)');

        // Parse syntax tree if it's a string
        let syntaxTree = result.syntaxTree;
        if (typeof syntaxTree === 'string') {
          try {
            syntaxTree = JSON.parse(syntaxTree);
          } catch (e) {
            console.error('Failed to parse syntax tree JSON:', e);
            syntaxTree = null;
          }
        }

        // Display syntax tree and analysis
        SyntaxTreeRenderer.display(syntaxTree || null, null);
        AnalysisManager.display(result.analysis || []);
        AnalysisManager.displayInEditor(result.analysis || [], result);

        // Auto-switch to IL tab only if currently on Output tab
        if (UIManager.getCurrentTab() === 'execution') {
          UIManager.switchToTab('il');
        }
      } else {
        const errorText = Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors.join('\n')
          : result.error || 'Unknown error';

        const errorMsg = `Disassembly Errors:\n\n${errorText}`;
        ilEditor.setValue(errorMsg);
        asmEditor.setValue(errorMsg);
        SyntaxTreeRenderer.display(null, errorMsg);
      }
    } catch (error) {
      const errorMsg = `Error calling API:\n${error.message}`;
      ilEditor.setValue(errorMsg);
      asmEditor.setValue(errorMsg);
      SyntaxTreeRenderer.display(null, errorMsg);
    } finally {
      UIManager.setButtonState(UIManager.elements.disassembleBtn, false, '🔍 Disassemble');
    }
  },
};
