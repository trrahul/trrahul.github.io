/**
 * Mermaid diagram zoom / pan / fullscreen.
 *
 * Chirpy renders ```mermaid fences into inline <svg> inside `.mermaid`
 * containers. This script wraps each rendered diagram in a pannable viewport
 * with a toolbar (zoom out / reset-fit / zoom in / fullscreen):
 *   - wheel zooms toward the cursor
 *   - drag pans; two-finger pinch zooms (touch)
 *   - large diagrams are fit-to-view inside a height cap, so they no longer
 *     dominate the page; fullscreen gives the full canvas.
 *
 * A MutationObserver picks up diagrams rendered after load and re-wraps them
 * when Chirpy re-renders on a theme toggle. Dependency-free; if it fails the
 * diagrams still display as plain SVG.
 */
(function () {
  'use strict';

  var MAX_VH = 0.75; // diagram viewport height cap (fraction of window height)

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function iconBtn(label, icon, act) {
    return (
      '<button type="button" class="mz-btn" data-act="' +
      act +
      '" aria-label="' +
      label +
      '" title="' +
      label +
      '"><i class="fas ' +
      icon +
      '" aria-hidden="true"></i></button>'
    );
  }

  function build(host) {
    var svg = host.querySelector('svg');
    if (!svg) return;
    if (host.__mz && host.__mz.svg === svg) return; // already wrapped this svg

    // Tear down a stale wrapper (theme re-render replaces the svg).
    var staleVp = host.querySelector('.mz-viewport');
    if (staleVp) {
      host.insertBefore(svg, staleVp);
      staleVp.remove();
    }
    var staleTb = host.querySelector('.mz-toolbar');
    if (staleTb) staleTb.remove();

    host.classList.add('mz-ready');

    var viewport = document.createElement('div');
    viewport.className = 'mz-viewport';
    host.insertBefore(viewport, svg);
    viewport.appendChild(svg);

    // Give the svg a definite intrinsic size from its viewBox so transforms
    // and fit math are deterministic.
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var vbW = vb && vb.width ? vb.width : svg.getBoundingClientRect().width || 800;
    var vbH = vb && vb.height ? vb.height : svg.getBoundingClientRect().height || 400;
    svg.style.width = vbW + 'px';
    svg.style.height = vbH + 'px';
    svg.style.maxWidth = 'none';
    svg.style.transformOrigin = '0 0';

    var toolbar = document.createElement('div');
    toolbar.className = 'mz-toolbar';
    toolbar.innerHTML =
      iconBtn('Zoom out', 'fa-minus', 'out') +
      iconBtn('Reset', 'fa-arrows-rotate', 'reset') +
      iconBtn('Zoom in', 'fa-plus', 'in') +
      iconBtn('Fullscreen', 'fa-expand', 'full');
    host.appendChild(toolbar);

    var state = { s: 1, tx: 0, ty: 0 };
    host.__mz = { svg: svg };

    function apply() {
      svg.style.transform =
        'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.s + ')';
    }

    var backdrop = null;
    function setFull(on) {
      if (on) {
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'mz-backdrop';
          backdrop.addEventListener('click', function () {
            setFull(false);
          });
        }
        document.body.appendChild(backdrop);
      } else if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      host.classList.toggle('mz-full', on);
      document.documentElement.classList.toggle('mz-full-open', on);
      var icon = host.querySelector('.mz-btn[data-act="full"] i');
      if (icon) icon.className = 'fas ' + (on ? 'fa-xmark' : 'fa-expand');
      fit();
    }

    function toggleFull() {
      var open = !host.classList.contains('mz-full');
      if (open) {
        // Only one overlay at a time.
        document.querySelectorAll('.mermaid.mz-full').forEach(function (o) {
          if (o !== host && o.__mz && o.__mz.setFull) o.__mz.setFull(false);
        });
      }
      setFull(open);
    }

    function fit() {
      if (host.classList.contains('mz-full')) {
        // Fullscreen: let CSS size the modal viewport (100% of the panel) and
        // fit to *width* — up to the diagram's original size — so it shows as
        // close to native width as the browser allows. Tall diagrams overflow
        // vertically and pan; short ones are centred.
        viewport.style.height = '';
        var fw = viewport.clientWidth || 1;
        var fh = viewport.clientHeight || 1;
        var sf = Math.min(fw / vbW, 1);
        state.s = sf;
        state.tx = (fw - vbW * sf) / 2;
        state.ty = vbH * sf <= fh ? (fh - vbH * sf) / 2 : 0;
        apply();
        return;
      }
      // Inline: fit the whole diagram inside the height cap.
      var vpW = viewport.clientWidth || host.clientWidth || 1;
      var fitW = vpW / vbW;
      var heightAtFitW = vbH * Math.min(fitW, 1);
      var maxH = Math.round(window.innerHeight * MAX_VH);
      var vpH = clamp(heightAtFitW, 120, maxH);
      viewport.style.height = vpH + 'px';
      var scale = Math.min(vpW / vbW, vpH / vbH, 1);
      state.s = scale;
      state.tx = (vpW - vbW * scale) / 2;
      state.ty = (vpH - vbH * scale) / 2;
      apply();
    }
    host.__mz.fit = fit;
    host.__mz.setFull = setFull;

    function zoomAt(cx, cy, factor) {
      var ns = clamp(state.s * factor, 0.1, 12);
      factor = ns / state.s;
      state.tx = cx - (cx - state.tx) * factor;
      state.ty = cy - (cy - state.ty) * factor;
      state.s = ns;
      apply();
    }

    viewport.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        var r = viewport.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      },
      { passive: false }
    );

    // Pointer pan + two-pointer pinch.
    var pointers = new Map();
    var pinchDist = 0;
    viewport.addEventListener('pointerdown', function (e) {
      e.preventDefault(); // don't start a text selection while panning
      viewport.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      viewport.classList.add('mz-grabbing');
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      var prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        state.tx += e.clientX - prev.x;
        state.ty += e.clientY - prev.y;
        apply();
      } else if (pointers.size === 2) {
        var p = Array.from(pointers.values());
        var dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDist) {
          var r = viewport.getBoundingClientRect();
          zoomAt(
            (p[0].x + p[1].x) / 2 - r.left,
            (p[0].y + p[1].y) / 2 - r.top,
            dist / pinchDist
          );
        }
        pinchDist = dist;
      }
    });
    function release(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) viewport.classList.remove('mz-grabbing');
    }
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);

    toolbar.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var cx = viewport.clientWidth / 2;
      var cy = viewport.clientHeight / 2;
      switch (b.dataset.act) {
        case 'in':
          zoomAt(cx, cy, 1.25);
          break;
        case 'out':
          zoomAt(cx, cy, 1 / 1.25);
          break;
        case 'reset':
          fit();
          break;
        case 'full':
          toggleFull();
          break;
      }
    });

    fit();
  }

  function scan() {
    document.querySelectorAll('.mermaid').forEach(function (host) {
      if (host.querySelector('svg')) build(host);
    });
  }

  function closeAllFull() {
    document.querySelectorAll('.mermaid.mz-full').forEach(function (h) {
      if (h.__mz && h.__mz.setFull) h.__mz.setFull(false);
    });
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll('.mermaid.mz-ready').forEach(function (h) {
        if (h.__mz && h.__mz.fit) h.__mz.fit();
      });
    }, 150);
  }

  function init() {
    scan();
    var pending = false;
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllFull();
    });
    window.addEventListener('resize', onResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
