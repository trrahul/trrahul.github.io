/**
 * Syntax Tree Rendering - Custom Implementation
 * @module playground/syntax-tree-renderer
 * No external dependencies - pure vanilla JS
 */

import { Utils } from './utils.js';

export const SyntaxTreeRenderer = {
  expandedNodes: new Set(), // Track expanded state

  /**
   * Display syntax tree with custom rendering
   */
  display(syntaxTreeJson, errorMsg = null) {
    const container = document.getElementById('syntaxTreeContainer');
    if (!container) return;

    container.innerHTML = '';

    if (errorMsg) {
      container.innerHTML = `<div class="tree-error">${Utils.escapeHtml(errorMsg)}</div>`;
      return;
    }

    if (!syntaxTreeJson) {
      container.innerHTML = '<div class="tree-empty">Click "Disassemble" to see the syntax tree...</div>';
      return;
    }

    try {
      const treeHtml = this.renderNode(syntaxTreeJson, 0);
      container.innerHTML = `<ul class="custom-tree">${treeHtml}</ul>`;
      this.attachEventListeners(container);
    } catch (error) {
      container.innerHTML = `<div class="tree-error">Error rendering tree: ${Utils.escapeHtml(error.message)}</div>`;
    }
  },

  /**
   * Get Codicon class for node type (VS Code official icons)
   */
  getNodeIcon(nodeType) {
    // Using official VS Code Codicons
    const iconMap = {
      // Declarations
      'CompilationUnit': 'codicon-file-code',
      'NamespaceDeclaration': 'codicon-package',
      'ClassDeclaration': 'codicon-symbol-class',
      'StructDeclaration': 'codicon-symbol-struct',
      'InterfaceDeclaration': 'codicon-symbol-interface',
      'EnumDeclaration': 'codicon-symbol-enum',
      'RecordDeclaration': 'codicon-symbol-structure',
      
      // Members
      'MethodDeclaration': 'codicon-symbol-method',
      'PropertyDeclaration': 'codicon-symbol-property',
      'FieldDeclaration': 'codicon-symbol-field',
      'ConstructorDeclaration': 'codicon-symbol-constructor',
      'EventDeclaration': 'codicon-symbol-event',
      'DelegateDeclaration': 'codicon-symbol-method',
      
      // Statements & Blocks
      'Block': 'codicon-symbol-namespace',
      'IfStatement': 'codicon-question',
      'ForStatement': 'codicon-sync',
      'WhileStatement': 'codicon-refresh',
      'ReturnStatement': 'codicon-arrow-left',
      'ThrowStatement': 'codicon-error',
      'TryStatement': 'codicon-shield',
      'CatchClause': 'codicon-debug-alt',
      
      // Expressions
      'InvocationExpression': 'codicon-symbol-method',
      'ObjectCreationExpression': 'codicon-add',
      'IdentifierName': 'codicon-symbol-variable',
      'LiteralExpression': 'codicon-symbol-constant',
      'BinaryExpression': 'codicon-symbol-operator',
      'AssignmentExpression': 'codicon-symbol-operator',
      
      // Other
      'UsingDirective': 'codicon-symbol-namespace',
      'Attribute': 'codicon-tag',
      'Parameter': 'codicon-symbol-parameter',
      'Argument': 'codicon-symbol-variable',
    };

    return iconMap[nodeType] || 'codicon-circle-outline';
  },

  /**
   * Get color class for icon (minimal, subtle)
   */
  getIconColor(nodeType) {
    if (nodeType.includes('Declaration')) return 'declaration';
    if (nodeType.includes('Statement')) return 'statement';
    if (nodeType.includes('Expression')) return 'expression';
    if (nodeType.includes('Directive')) return 'directive';
    return 'default';
  },

  /**
   * Recursively render a node and its children
   */
  renderNode(node, level, nodeId = '0') {
    if (!node) return '';

    const nodeType = node.Kind || node.Type || 'Unknown';
    const nodeValue = node.Value ? `: "${Utils.escapeHtml(node.Value)}"` : '';
    const hasChildren = node.Children && node.Children.length > 0;
    
    // Auto-expand first 2 levels
    const isExpanded = level < 2 || this.expandedNodes.has(nodeId);
    const nodeIconClass = this.getNodeIcon(nodeType);
    const iconColor = this.getIconColor(nodeType);
    
    let html = `<li class="tree-node" data-level="${level}" data-node-id="${nodeId}">`;
    
    // Node content - entire row is clickable
    html += `<div class="tree-content" data-has-children="${hasChildren}">`;
    
    // Expand toggle (chevron, only for nodes with children)
    if (hasChildren) {
      html += `<span class="tree-chevron codicon codicon-chevron-right ${isExpanded ? 'expanded' : ''}"></span>`;
    } else {
      html += `<span class="tree-chevron tree-chevron-leaf"></span>`;
    }
    
    // Node icon with color coding
    html += `<i class="tree-icon codicon ${nodeIconClass} icon-${iconColor}"></i>`;
    
    // Type and value
    html += `<span class="tree-label">${Utils.escapeHtml(nodeType)}`;
    if (nodeValue) {
      html += `<span class="tree-value">${nodeValue}</span>`;
    }
    html += `</span>`;
    html += `</div>`;
    
    // Children
    if (hasChildren) {
      html += `<ul class="tree-children" ${isExpanded ? '' : 'style="display: none"'}>`;
      node.Children.forEach((child, index) => {
        const childId = `${nodeId}-${index}`;
        html += this.renderNode(child, level + 1, childId);
      });
      html += `</ul>`;
    }
    
    html += `</li>`;
    return html;
  },

  /**
   * Attach click handlers for expand/collapse
   * Entire node content is clickable, with selection tracking
   */
  attachEventListeners(container) {
    container.addEventListener('click', (e) => {
      const content = e.target.closest('.tree-content');
      if (!content) return;

      // Remove previous selection
      container.querySelectorAll('.tree-content.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Mark this node as selected
      content.classList.add('selected');

      // Don't expand if it's a leaf node
      const hasChildren = content.dataset.hasChildren === 'true';
      if (!hasChildren) return;

      const node = content.closest('.tree-node');
      const children = node.querySelector(':scope > .tree-children');
      const chevron = content.querySelector('.tree-chevron');
      const nodeId = node.dataset.nodeId;

      if (children && chevron) {
        const isExpanded = chevron.classList.contains('expanded');
        
        // Toggle visibility
        if (isExpanded) {
          children.style.display = 'none';
          chevron.classList.remove('expanded');
          this.expandedNodes.delete(nodeId);
        } else {
          children.style.display = 'block';
          chevron.classList.add('expanded');
          this.expandedNodes.add(nodeId);
        }
      }
    });
  },

  /**
   * Expand all tree nodes
   */
  expandAll() {
    const container = document.getElementById('syntaxTreeContainer');
    if (!container) return;

    container.querySelectorAll('.tree-children').forEach(children => {
      children.style.display = 'block';
    });
    container.querySelectorAll('.tree-chevron:not(.tree-chevron-leaf)').forEach(chevron => {
      chevron.classList.add('expanded');
    });
    
    // Track all as expanded
    container.querySelectorAll('.tree-node').forEach(node => {
      this.expandedNodes.add(node.dataset.nodeId);
    });
  },

  /**
   * Collapse all tree nodes
   */
  collapseAll() {
    const container = document.getElementById('syntaxTreeContainer');
    if (!container) return;

    container.querySelectorAll('.tree-children').forEach(children => {
      children.style.display = 'none';
    });
    container.querySelectorAll('.tree-chevron:not(.tree-chevron-leaf)').forEach(chevron => {
      chevron.classList.remove('expanded');
    });
    
    // Clear expanded state
    this.expandedNodes.clear();
  },
};
