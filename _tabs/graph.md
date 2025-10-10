---
layout: page
icon: fas fa-project-diagram
order: 2
---

<div id="knowledge-graph-container">
  <!-- Top Controls: Quick Actions + Settings Toggle -->
  <div class="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
    <!-- Category Filter -->
    <div class="flex-shrink-0" style="min-width: 200px; max-width: 300px;">
      <select class="form-select form-select-sm" id="category-select">
        <option value="all">All Categories</option>
        <!-- Categories will be dynamically added here -->
      </select>
    </div>
    
    <!-- Quick Actions -->
    <div class="btn-toolbar" role="toolbar">
      <div class="btn-group btn-group-sm me-2" role="group">
        <button type="button" class="btn btn-sm" id="zoom-in" title="Zoom In">
          <i class="fas fa-search-plus"></i>
        </button>
        <button type="button" class="btn btn-sm" id="zoom-out" title="Zoom Out">
          <i class="fas fa-search-minus"></i>
        </button>
        <button type="button" class="btn btn-sm" id="reset-zoom" title="Reset Zoom">
          <i class="fas fa-redo"></i>
        </button>
      </div>
      <div class="btn-group btn-group-sm" role="group">
        <input type="checkbox" class="btn-check" id="show-labels" checked>
        <label class="btn btn-sm" for="show-labels" title="Toggle Labels">
          <i class="fas fa-tags"></i> Labels
        </label>
      </div>
    </div>

    <!-- Settings Toggle -->
    <button type="button" class="btn btn-sm" id="toggle-settings" title="Graph Settings">
      <i class="fas fa-cog"></i> Settings
    </button>
  </div>

  <!-- Settings Panel (Collapsible) -->
  <div id="graph-settings-panel" class="mb-3" style="display: none;">
    <div class="card-body py-2 px-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0 small">Graph Settings</h6>
        <button type="button" class="btn btn-sm btn-link text-muted p-0" id="restore-defaults" title="Restore default settings">
          <i class="fas fa-undo fa-xs"></i> Reset
        </button>
      </div>

      <div class="row g-2">
        <!-- Display Section -->
        <div class="col-md-6">
          <div class="settings-section">
            <h6 class="settings-section-title">
              <i class="fas fa-eye"></i> Display
            </h6>

            <!-- Arrows Toggle -->
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="show-arrows" checked>
              <label class="form-check-label small" for="show-arrows">Arrows</label>
            </div>

            <!-- Text Fade Threshold -->
            <div class="mb-2">
              <label for="text-fade" class="form-label small d-flex justify-content-between mb-1">
                <span>Text fade</span>
                <span class="text-muted" id="text-fade-value">0.9</span>
              </label>
              <input type="range" class="form-range" id="text-fade" min="0" max="1" step="0.1" value="0.9">
            </div>

            <!-- Node Size -->
            <div class="mb-2">
              <label for="node-size" class="form-label small d-flex justify-content-between mb-1">
                <span>Node size</span>
                <span class="text-muted" id="node-size-value">1.0x</span>
              </label>
              <input type="range" class="form-range" id="node-size" min="0.5" max="2" step="0.1" value="1">
            </div>

            <!-- Link Thickness -->
            <div class="mb-2">
              <label for="link-thickness" class="form-label small d-flex justify-content-between mb-1">
                <span>Link thickness</span>
                <span class="text-muted" id="link-thickness-value">1.0x</span>
              </label>
              <input type="range" class="form-range" id="link-thickness" min="0.5" max="3" step="0.1" value="1">
            </div>

            <!-- Animate -->
            <div class="form-check form-switch mb-1">
              <input class="form-check-input" type="checkbox" id="animate-graph">
              <label class="form-check-label small" for="animate-graph">Animate (time-lapse)</label>
            </div>
          </div>
        </div>

        <!-- Forces Section -->
        <div class="col-md-6">
          <div class="settings-section">
            <h6 class="settings-section-title">
              <i class="fas fa-magnet"></i> Forces
            </h6>

            <!-- Center Force -->
            <div class="mb-2">
              <label for="center-force" class="form-label small d-flex justify-content-between mb-1">
                <span>Center force</span>
                <span class="text-muted" id="center-force-value">0.3</span>
              </label>
              <input type="range" class="form-range" id="center-force" min="0" max="1" step="0.1" value="0.3">
            </div>

            <!-- Repel Force -->
            <div class="mb-2">
              <label for="repel-force" class="form-label small d-flex justify-content-between mb-1">
                <span>Repel force</span>
                <span class="text-muted" id="repel-force-value">400</span>
              </label>
              <input type="range" class="form-range" id="repel-force" min="100" max="800" step="50" value="400">
            </div>

            <!-- Link Force -->
            <div class="mb-2">
              <label for="link-force" class="form-label small d-flex justify-content-between mb-1">
                <span>Link force</span>
                <span class="text-muted" id="link-force-value">0.5</span>
              </label>
              <input type="range" class="form-range" id="link-force" min="0" max="1" step="0.1" value="0.5">
            </div>

            <!-- Link Distance -->
            <div class="mb-2">
              <label for="link-distance" class="form-label small d-flex justify-content-between mb-1">
                <span>Link distance</span>
                <span class="text-muted" id="link-distance-value">100</span>
              </label>
              <input type="range" class="form-range" id="link-distance" min="30" max="200" step="10" value="100">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Knowledge Graph SVG -->
  <div id="graph-wrapper">
    <svg id="knowledge-graph" width="100%" height="600"></svg>
    <div id="graph-tooltip" class="graph-tooltip"></div>
  </div>

  <!-- Statistics Panel (Below Graph) -->
  <div id="graph-stats" class="mt-4">
    <div class="row g-3">
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-value" id="stat-total-nodes">-</div>
          <div class="stat-label">Total Posts</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-value" id="stat-total-links">-</div>
          <div class="stat-label">Connections</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-value" id="stat-avg-connections">-</div>
          <div class="stat-label">Avg per Post</div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="stat-card">
          <div class="stat-value" id="stat-isolated">-</div>
          <div class="stat-label">Isolated</div>
        </div>
      </div>
    </div>

    <!-- Most Connected Posts - Collapsible -->
    <details class="mt-3" id="top-connected-details">
      <summary class="stat-section-title">
        Most Connected Posts
      </summary>
      <ul id="top-connected-list" class="list-unstyled mt-2"></ul>
    </details>
  </div>
</div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script type="module" src="{{ '/assets/js/knowledge-graph/knowledge-graph-main.js' | relative_url }}"></script>
