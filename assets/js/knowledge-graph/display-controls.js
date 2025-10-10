/**
 * Knowledge Graph - Display Controls
 * Handles display related settings using explicit dependency injection.
 * @module knowledge-graph/display-controls
 */

/**
 * @param {{ state: import('./state.js').State | typeof import('./state.js').State, config: typeof import('./config.js').CONFIG, d3: any, documentRef?: Document }} deps
 */
export function createDisplayControls({ state, config, d3, documentRef = document }) {
  if (!state) {
    throw new Error('DisplayControls requires a state instance.');
  }
  if (!config) {
    throw new Error('DisplayControls requires a config object.');
  }
  if (!d3) {
    throw new Error('DisplayControls requires a d3 dependency.');
  }

  const dom = documentRef;

  const setSliderValue = (id, value) => {
    const slider = dom.getElementById(id);
    const valueDisplay = dom.getElementById(`${id}-value`);

    if (slider) {
      slider.value = value;
      if (valueDisplay) {
        const suffix = id.includes('size') || id.includes('thickness') ? 'x' : '';
        valueDisplay.textContent = value.toFixed(1) + suffix;
      }
    }
  };

  const updateArrowVisibility = () => {
    const arrowDisplay = state.display.showArrows ? 'inline' : 'none';
    d3.selectAll('marker').style('display', arrowDisplay);

    if (state.render.baseLinks) {
      state.render.baseLinks.attr('marker-end', state.display.showArrows ? 'url(#arrowhead)' : null);
    }
    if (state.render.highlightLinks) {
      state.render.highlightLinks.attr('marker-end', state.display.showArrows ? 'url(#arrowhead)' : null);
    }
  };

  const updateLabelOpacity = () => {
    d3.selectAll('.node-label')
      .style('opacity', state.display.textFadeThreshold);
  };

  const updateNodeSizes = () => {
    d3.selectAll('.graph-node')
      .attr('r', (node) => {
        const baseRadius = config.node.baseSize + (node.connections || 0) * config.node.sizeMultiplier;
        return Math.min(baseRadius, config.node.maxSize) * state.display.nodeSizeMultiplier;
      });
  };

  const updateLinkThickness = () => {
    const baseWidth = config.visual.linkStrokeWidth;

    if (state.render.baseLinks) {
      state.render.baseLinks.attr('stroke-width', baseWidth * state.display.linkThicknessMultiplier);
    }
    if (state.render.highlightLinks) {
      state.render.highlightLinks.attr('stroke-width', baseWidth * state.display.linkThicknessMultiplier);
    }
  };

  const setupArrowsToggle = () => {
    const showArrows = dom.getElementById('show-arrows');
    if (!showArrows) return;

    showArrows.addEventListener('change', (event) => {
      state.display.showArrows = event.target.checked;
      updateArrowVisibility();
    });
  };

  const setupTextFadeSlider = () => {
    const textFade = dom.getElementById('text-fade');
    const textFadeValue = dom.getElementById('text-fade-value');
    if (!textFade || !textFadeValue) return;

    textFade.addEventListener('input', (event) => {
      const value = Number.parseFloat(event.target.value);
      textFadeValue.textContent = value.toFixed(1);
      state.display.textFadeThreshold = value;
      updateLabelOpacity();
    });
  };

  const setupNodeSizeSlider = () => {
    const nodeSize = dom.getElementById('node-size');
    const nodeSizeValue = dom.getElementById('node-size-value');
    if (!nodeSize || !nodeSizeValue) return;

    nodeSize.addEventListener('input', (event) => {
      const value = Number.parseFloat(event.target.value);
      nodeSizeValue.textContent = `${value.toFixed(1)}x`;
      state.display.nodeSizeMultiplier = value;
      updateNodeSizes();
    });
  };

  const setupLinkThicknessSlider = () => {
    const linkThickness = dom.getElementById('link-thickness');
    const linkThicknessValue = dom.getElementById('link-thickness-value');
    if (!linkThickness || !linkThicknessValue) return;

    linkThickness.addEventListener('input', (event) => {
      const value = Number.parseFloat(event.target.value);
      linkThicknessValue.textContent = `${value.toFixed(1)}x`;
      state.display.linkThicknessMultiplier = value;
      updateLinkThickness();
    });
  };

  return {
    init() {
      setupArrowsToggle();
      setupTextFadeSlider();
      setupNodeSizeSlider();
      setupLinkThicknessSlider();
    },

    updateArrowVisibility,
    updateLabelOpacity,
    updateNodeSizes,
    updateLinkThickness,

    resetToDefaults() {
      setSliderValue('text-fade', 0.9);
      setSliderValue('node-size', 1.0);
      setSliderValue('link-thickness', 1.0);

      const showArrows = dom.getElementById('show-arrows');
      if (showArrows) {
        showArrows.checked = true;
      }

      state.display.showArrows = true;
      state.display.textFadeThreshold = 0.9;
      state.display.nodeSizeMultiplier = 1.0;
      state.display.linkThicknessMultiplier = 1.0;

      updateArrowVisibility();
      updateLabelOpacity();
      updateNodeSizes();
      updateLinkThickness();
    },
  };
}
