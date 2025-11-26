---
layout: page
title: C# Playground
icon: fas fa-code
order: 5
---

<!-- VS Code Codicons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css">
<!-- jQuery (required for jsTree) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<!-- jsTree (requires theme CSS) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.16/themes/default/style.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.16/jstree.min.js"></script>
<!-- Monaco Editor -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.css">
<!-- Playground CSS (overrides jsTree default theme) -->
<link rel="stylesheet" href="{{ '/assets/css/playground.css' | relative_url }}">
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>

<div class="code-playground-container">
  <!-- Code Editor Pane -->
  <div class="playground-pane">
    <div class="pane-header">
      <span>Code</span>
      <div class="header-actions">
        <select id="optimizationLevel" class="optimization-select">
          <option value="Debug">Debug</option>
          <option value="Release">Release</option>
        </select>
        <button id="runBtn" class="run-btn">▶ Run</button>
        <button id="disassembleBtn" class="disassemble-btn">🔍 Disassemble</button>
      </div>
    </div>
    <div class="pane-content">
      <div id="editor"></div>
    </div>
  </div>

  <!-- Output Pane -->
  <div class="playground-pane">
    <div class="output-tabs">
      <button class="output-tab active" data-tab="execution">Output</button>
      <button class="output-tab" data-tab="il">IL</button>
      <button class="output-tab" data-tab="asm">Lowered C#</button>
      <button class="output-tab" data-tab="syntaxTree">Syntax Tree</button>
      <button class="output-tab" data-tab="analysis">Analysis</button>
    </div>
    <div class="pane-content">
      <div id="executionTab" class="tab-content active">
        <div id="outputPane">Click "Run" to execute your C# code...</div>
      </div>
      <div id="ilTab" class="tab-content">
        <div id="ilCode"></div>
      </div>
      <div id="asmTab" class="tab-content">
        <div id="asmCode"></div>
      </div>
      <div id="syntaxTreeTab" class="tab-content">
        <div class="tree-controls-header">
          <button class="analyzer-btn" id="expandAll">Expand All</button>
          <button class="analyzer-btn" id="collapseAll">Collapse All</button>
        </div>
        <div id="syntaxTreeContainer"></div>
      </div>
      <div id="analysisTab" class="tab-content">
        <div id="analysisPane">
          <div class="analyzer-controls">
            <div class="analyzer-header">
              <button id="analyzerSelectAll" class="analyzer-btn">Select All</button>
              <button id="analyzerDeselectAll" class="analyzer-btn">Deselect All</button>
            </div>
            <div class="analyzer-categories">
              <label class="analyzer-category"><input type="checkbox" id="analyzerCompiler" checked> <span class="category-name">Compiler</span> <span class="category-badge">CS</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerDesign" checked> <span class="category-name">Design</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerPerformance" checked> <span class="category-name">Performance</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerSecurity" checked> <span class="category-name">Security</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerReliability" checked> <span class="category-name">Reliability</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerMaintainability" checked> <span class="category-name">Maintainability</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerUsage" checked> <span class="category-name">Usage</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerNaming" checked> <span class="category-name">Naming</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerInteroperability" checked> <span class="category-name">Interoperability</span> <span class="category-badge">CA</span></label>
              <label class="analyzer-category"><input type="checkbox" id="analyzerGlobalization" checked> <span class="category-name">Globalization</span> <span class="category-badge">CA</span></label>
            </div>
          </div>
          <div class="analysis-summary" id="analysisSummary" style="display: none;">
            <span id="analysisSummaryText"></span>
          </div>
          <div class="analysis-results"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script type="module" src="{{ '/assets/js/playground-main.js' | relative_url }}?v=2025-10-09"></script>
