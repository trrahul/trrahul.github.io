# Knowledge Graph - Obsidian Features Implementation

**Date:** 2025-10-09  
**Version:** v2.0 - Obsidian-Style Graph View

## 🎯 Overview

This update adds comprehensive Obsidian-style Graph View features to the knowledge graph, providing users with powerful filtering, display customization, and physics simulation controls.

## ✨ New Features

### 1. **Filters Section**
Control what nodes appear in the graph:

- **Search notes**: Text input to filter nodes by title
- **Category filter**: Dropdown to filter by category (existing feature, moved to settings)
- **Tags toggle**: Show/hide tag nodes (placeholder - data structure dependent)
- **Attachments toggle**: Show/hide attachment nodes (placeholder - data structure dependent)
- **Existing files only**: Toggle to show only nodes with actual files
- **Orphans toggle**: Show/hide isolated nodes with no connections

### 2. **Groups Section**
Create color-coded groups to distinguish notes:

- **Add groups**: Click "New Group" to create a new color group
- **Search query**: Define which notes belong to each group (e.g., `tag:#optimization`)
- **Color picker**: Choose a custom color for each group
- **Delete groups**: Remove groups with trash button
- **Query syntax**:
  - `tag:keyword` - Match notes by category
  - `text` - Match notes by title (default)

### 3. **Display Section**
Control visual appearance:

- **Arrows toggle**: Show/hide directional arrows on links
- **Text fade threshold** (0-1): Control label opacity (higher = more visible)
- **Node size** (0.5x-2x): Scale all nodes uniformly
- **Link thickness** (0.5x-3x): Scale link stroke width
- **Animate toggle**: Start time-lapse animation (nodes appear chronologically)

### 4. **Forces Section**
Fine-tune physics simulation:

- **Center force** (0-1): How compact the graph is (higher = more circular)
- **Repel force** (100-800): How much nodes push each other away
- **Link force** (0-1): Pull strength on links (like rubber band tightness)
- **Link distance** (30-200px): Target distance between connected nodes

### 5. **Quick Actions**
Always visible controls at the top:

- **Zoom In/Out/Reset**: Standard zoom controls
- **Labels toggle**: Show/hide node labels
- **Settings button**: Toggle settings panel visibility

### 6. **Restore Defaults**
Reset all settings to original values with one click.

## 🏗️ Architecture

### New Files

#### `settings-manager.js` (575 lines)
**Responsibility:** Manage all Obsidian-style settings

**Key Methods:**
- `init()` - Initialize all settings controls
- `setupFilters()` - Handle filter toggles and search
- `setupDisplay()` - Handle display sliders and toggles
- `setupForces()` - Handle physics simulation controls
- `setupGroups()` - Manage color groups
- `applyFilters()` - Filter nodes/links based on settings
- `applyGroupColors()` - Apply color groups to nodes
- `startTimeLapseAnimation()` - Progressive node reveal
- `updateSimulationForce()` - Dynamically adjust physics
- `restoreDefaults()` - Reset all settings

**Dependencies:**
- `state.js` - Application state
- `config.js` - Default configuration
- `utils.js` - Utility functions (debounce, escapeHtml)

#### `utils.js` (58 lines)
**Responsibility:** Common utility functions

**Functions:**
- `debounce(func, wait)` - Debounce function calls
- `escapeHtml(text)` - Prevent XSS attacks
- `throttle(func, limit)` - Throttle function calls

### Modified Files

#### `graph.md` (Jekyll template)
**Changes:**
- Added comprehensive settings panel UI
- Moved controls to collapsible panel
- Added all Obsidian-style filter/display/force controls
- Added groups section with dynamic rendering

#### `state.js`
**New State Variables:**
```javascript
rawData: null,              // Original unfiltered data
baseLinks: null,            // Base layer links
highlightLinks: null,       // Highlight layer links
searchQuery: '',            // Search filter text
showTags: true,             // Tags filter toggle
showAttachments: true,      // Attachments filter toggle
existingFilesOnly: true,    // Existing files filter
showOrphans: true,          // Orphans filter toggle
showArrows: true,           // Arrows display toggle
textFadeThreshold: 0.9,     // Label opacity
nodeSizeMultiplier: 1.0,    // Node size scale
linkThicknessMultiplier: 1.0, // Link thickness scale
animationInterval: null,    // Time-lapse animation timer
```

#### `knowledge-graph-main.js`
**Changes:**
- Import `SettingsManager`
- Call `SettingsManager.init()` after data load
- Store `rawData` in State for filtering

#### `page-graph.scss`
**New Styles:**
- `.settings-section` - Section container styling
- `.settings-section-title` - Section headers with icons
- `#groups-container` - Scrollable groups list
- Form control customizations (ranges, switches, color picker)
- Toggle button active states

## 🔧 How It Works

### 1. **Filter Flow**

```
User changes filter → Event listener in SettingsManager
                    ↓
              applyFilters()
                    ↓
         Filter rawData.nodes based on:
         - searchQuery (title contains text)
         - showOrphans (connections > 0)
                    ↓
         Filter rawData.links (both nodes exist)
                    ↓
         Call State.onFilterChange(filteredData)
                    ↓
         GraphRenderer.render(filteredData)
```

### 2. **Display Controls Flow**

```
User adjusts slider → Event listener in SettingsManager
                    ↓
              Update State variable
              (e.g., nodeSizeMultiplier)
                    ↓
              Update visualization:
              - updateNodeSizes() → D3 attr('r')
              - updateLinkThickness() → D3 attr('stroke-width')
              - updateLabelOpacity() → D3 style('opacity')
              - updateArrowVisibility() → D3 attr('marker-end')
```

### 3. **Force Simulation Flow**

```
User adjusts force slider → Event listener in SettingsManager
                          ↓
                  updateSimulationForce(type, value)
                          ↓
                  Modify D3 force:
                  - center: d3.forceCenter().strength()
                  - charge: d3.forceManyBody().strength()
                  - link: force('link').strength()
                  - linkDistance: force('link').distance()
                          ↓
                  simulation.alpha(0.3).restart()
                  (re-run simulation with new forces)
```

### 4. **Groups Flow**

```
User adds group → addGroup()
                ↓
          Create group object:
          {id, query, color}
                ↓
          renderGroups() → Update DOM
                ↓
User changes query/color → applyGroupColors()
                          ↓
                  For each node:
                  - Check if matchesQuery(node, group.query)
                  - Apply group.color if match
                  - Else apply CONFIG.colors.node.default
                          ↓
                  D3 select('.graph-node').attr('fill', color)
```

### 5. **Time-Lapse Animation Flow**

```
User enables animate → startTimeLapseAnimation()
                      ↓
                Sort nodes by title (or date if available)
                      ↓
                Every 500ms:
                - Show next node
                - Filter links (both nodes visible)
                - Call onFilterChange(subset)
                      ↓
                When complete → stopTimeLapseAnimation()
```

## 📊 Data Structures

### Group Object
```javascript
{
  id: 1,                    // Unique ID
  query: 'tag:#optimization', // Search query
  color: '#ef4444'          // Hex color
}
```

### Filtered Data
```javascript
{
  nodes: [                  // Filtered nodes array
    {id, title, category, connections, ...}
  ],
  links: [                  // Filtered links array
    {source, target}
  ]
}
```

## 🎨 UI/UX Design

### Settings Panel
- **Toggle:** Click cog icon to show/hide
- **Sections:** Organized into Filters, Display, Forces, Groups
- **Responsive:** Collapses gracefully on mobile
- **Persistent:** Settings remain active until changed
- **Reset:** One-click restore defaults

### Visual Feedback
- **Sliders:** Show current value next to label
- **Toggles:** Bootstrap switches with clear on/off states
- **Groups:** Color picker shows current color
- **Animation:** Progress indicator (could be added)

## 🚀 Usage Examples

### Filter to Compiler Optimization Posts
1. Click "Settings" button
2. In search box, type: `optimization`
3. Graph shows only matching posts

### Create Color Group for C# Posts
1. Click "Settings" → "New Group"
2. In query box, type: `tag:#programming` or `c#`
3. Click color picker, choose blue
4. All matching nodes turn blue

### Adjust Graph Spacing
1. Click "Settings"
2. Increase "Repel force" to 600
3. Increase "Link distance" to 150
4. Graph spreads out with more space

### Time-Lapse Animation
1. Click "Settings"
2. Toggle "Animate" on
3. Watch nodes appear one by one
4. Toggle off to stop

## 🐛 Known Limitations

1. **Tags/Attachments**: Toggles are placeholders (depends on data structure)
2. **Animation sorting**: Currently sorts by title, not creation date (would need date field in data)
3. **Group query syntax**: Basic implementation (could add regex, boolean operators)
4. **Existing files toggle**: No-op if all nodes represent existing files
5. **Performance**: Animation may lag with 100+ nodes (could optimize with canvas)

## 🔄 Future Enhancements

### Advanced Filters
- Boolean operators (AND, OR, NOT)
- Regex support in search
- Date range filters
- Connection count filters

### Enhanced Groups
- Multiple queries per group (union)
- Group templates/presets
- Save/load group configurations
- Group inheritance

### Display Options
- Node shape customization
- Link style variants (dashed, dotted)
- Label font size control
- Minimap for navigation

### Animation
- Configurable animation speed
- Reverse animation
- Pause/resume controls
- Progress bar

### Export/Share
- Export graph as SVG/PNG
- Share specific view state via URL
- Embed in other pages

## 📚 References

- **Obsidian Graph View**: https://help.obsidian.md/Plugins/Graph+view
- **D3 Force Simulation**: https://d3js.org/d3-force
- **Bootstrap Components**: Form controls, switches, color picker

## ✅ Testing Checklist

- [ ] Settings panel toggles visibility
- [ ] Search filter works
- [ ] Category filter works
- [ ] Orphans toggle hides/shows isolated nodes
- [ ] Arrow toggle works
- [ ] All sliders update visualization
- [ ] Groups add/delete/modify correctly
- [ ] Group colors apply to matching nodes
- [ ] Time-lapse animation runs
- [ ] Restore defaults resets all settings
- [ ] Mobile responsive layout

## 📝 Notes for Developers

### Adding New Filters
1. Add state variable to `state.js`
2. Add UI control to `graph.md`
3. Add event listener in `SettingsManager.setupFilters()`
4. Update `applyFilters()` logic
5. Add to `restoreDefaults()`

### Adding New Display Controls
1. Add state variable to `state.js`
2. Add slider/toggle to `graph.md`
3. Add event listener in `SettingsManager.setupDisplay()`
4. Create update function (e.g., `updateNodeSizes()`)
5. Add to `restoreDefaults()`

### Adding New Forces
1. Add slider to `graph.md` "Forces" section
2. Add event listener in `SettingsManager.setupForces()`
3. Update `updateSimulationForce()` switch statement
4. Add default value to `restoreDefaults()`

### Debugging Tips
- Check console for errors
- Verify D3 selections are not empty
- Ensure State.simulation exists before modifying forces
- Test with various data sizes (1 node, 10 nodes, 100+ nodes)
- Check mobile responsiveness

---

**Implementation Status:** ✅ Complete  
**Last Updated:** 2025-10-09  
**Next Steps:** Test with real data, gather user feedback, optimize performance
