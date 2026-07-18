// Primitives for authoring Excalidraw scenes programmatically.
// Schema reference: https://docs.excalidraw.com/docs/codebase/json-schema
//
// Usage from a scene module:
//   import { newBag, box, arrow, label, region, scene } from "../helpers.mjs";
//   export const name = "my-diagram";
//   export function build(t) {
//     const bag = newBag();
//     const a = box(bag, 0, 0, 120, 60, "A", { stroke: t.accent });
//     const b = box(bag, 200, 0, 120, 60, "B", { stroke: t.accent });
//     arrow(bag, a, b, "LR", { stroke: t.text });
//     return scene(bag, name);
//   }

const BASE = {
  angle: 0,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  seed: 1,
  version: 1,
  versionNonce: 0,
  isDeleted: false,
  updated: 1,
  link: null,
  locked: false,
  boundElements: [],
};

export function newBag() {
  return { counter: 0, elements: [] };
}

function nid(bag, prefix) {
  return `${prefix}-${++bag.counter}`;
}

// Rectangle with bound centered text.
// opts: bg, stroke, strokeWidth, fillStyle, roughness, groupIds, roundness,
//       textColor, fontSize, fontFamily (1=Virgil hand-drawn, 2=Helvetica, 3=Cascadia mono)
export function box(bag, x, y, w, h, text, opts = {}) {
  const rectId = nid(bag, "r");
  const textId = nid(bag, "t");
  const fontSize = opts.fontSize ?? 18;
  const fontFamily = opts.fontFamily ?? 1;
  const lineHeight = 1.25;
  const lines = text.split("\n");
  const charW = fontSize * (fontFamily === 3 ? 0.62 : 0.55);
  const textWidth = Math.max(...lines.map((l) => l.length)) * charW;
  const textHeight = lines.length * fontSize * lineHeight;
  const rect = {
    ...BASE,
    id: rectId,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: opts.stroke ?? BASE.strokeColor,
    strokeWidth: opts.strokeWidth ?? BASE.strokeWidth,
    backgroundColor: opts.bg ?? "transparent",
    fillStyle: opts.fillStyle ?? BASE.fillStyle,
    roughness: opts.roughness ?? BASE.roughness,
    groupIds: opts.groupIds ?? [],
    roundness: opts.roundness === null ? null : { type: 3 },
    boundElements: [{ type: "text", id: textId }],
  };
  const txt = {
    ...BASE,
    id: textId,
    type: "text",
    x: x + (w - textWidth) / 2,
    y: y + (h - textHeight) / 2,
    width: textWidth,
    height: textHeight,
    strokeColor: opts.textColor ?? opts.stroke ?? BASE.strokeColor,
    strokeWidth: 1,
    roundness: null,
    groupIds: opts.groupIds ?? [],
    fontSize,
    fontFamily,
    text,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: rectId,
    originalText: text,
    lineHeight,
    baseline: Math.round(fontSize * 0.9),
  };
  bag.elements.push(rect, txt);
  return rect;
}

// Bound arrow between two boxes.
// dir: "LR" | "RL" | "TD" | "BU" — controls which edges the arrow connects.
// opts: stroke, strokeWidth, strokeStyle, groupIds, gap, toFrac.
//   toFrac (0..1): place the arrowhead at a fraction along the target's
//   connecting edge instead of its centre — lets several arrows fan into one
//   box at distinct points (e.g. an event-bus hub). Drops the end binding so
//   the explicit endpoint is honoured by the SVG export.
export function arrow(bag, from, to, dir = "LR", opts = {}) {
  const id = nid(bag, "a");
  let sx;
  let sy;
  let ex;
  let ey;
  const fc = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const tc = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const resolved =
    dir === "auto"
      ? Math.abs(tc.x - fc.x) >= Math.abs(tc.y - fc.y)
        ? tc.x >= fc.x
          ? "LR"
          : "RL"
        : tc.y >= fc.y
          ? "TD"
          : "BU"
      : dir;
  switch (resolved) {
    case "LR":
      sx = from.x + from.width;
      sy = fc.y;
      ex = to.x;
      ey = tc.y;
      break;
    case "RL":
      sx = from.x;
      sy = fc.y;
      ex = to.x + to.width;
      ey = tc.y;
      break;
    case "TD":
      sx = fc.x;
      sy = from.y + from.height;
      ex = tc.x;
      ey = to.y;
      break;
    case "BU":
      sx = fc.x;
      sy = from.y;
      ex = tc.x;
      ey = to.y + to.height;
      break;
    default:
      sx = fc.x;
      sy = fc.y;
      ex = tc.x;
      ey = tc.y;
  }
  // Optional: slide the endpoint along the target's connecting edge.
  if (opts.toFrac != null) {
    const f = Math.max(0, Math.min(1, opts.toFrac));
    if (resolved === "LR" || resolved === "RL") {
      ey = to.y + to.height * f;
    } else {
      ex = to.x + to.width * f;
    }
  }
  const bindEnd = opts.toFrac == null;
  const el = {
    ...BASE,
    id,
    type: "arrow",
    x: sx,
    y: sy,
    width: ex - sx,
    height: ey - sy,
    strokeColor: opts.stroke ?? BASE.strokeColor,
    strokeWidth: opts.strokeWidth ?? BASE.strokeWidth,
    strokeStyle: opts.strokeStyle ?? BASE.strokeStyle,
    groupIds: opts.groupIds ?? [],
    roundness: { type: 2 },
    points: [
      [0, 0],
      [ex - sx, ey - sy],
    ],
    lastCommittedPoint: null,
    startBinding: { elementId: from.id, focus: 0, gap: opts.gap ?? 1 },
    endBinding: bindEnd ? { elementId: to.id, focus: 0, gap: opts.gap ?? 1 } : null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  };
  from.boundElements = [...(from.boundElements ?? []), { type: "arrow", id }];
  if (bindEnd) {
    to.boundElements = [...(to.boundElements ?? []), { type: "arrow", id }];
  }
  bag.elements.push(el);
  return el;
}

// Free-floating text label.
export function label(bag, x, y, text, opts = {}) {
  const fontSize = opts.fontSize ?? 16;
  const fontFamily = opts.fontFamily ?? 1;
  const lineHeight = 1.25;
  const charW = fontSize * (fontFamily === 3 ? 0.62 : 0.55);
  const lines = text.split("\n");
  const width = Math.max(...lines.map((l) => l.length)) * charW;
  const height = lines.length * fontSize * lineHeight;
  bag.elements.push({
    ...BASE,
    id: nid(bag, "t"),
    type: "text",
    x,
    y,
    width,
    height,
    strokeColor: opts.color ?? BASE.strokeColor,
    strokeWidth: 1,
    groupIds: opts.groupIds ?? [],
    roundness: null,
    fontSize,
    fontFamily,
    text,
    textAlign: opts.align ?? "left",
    verticalAlign: "top",
    containerId: null,
    originalText: text,
    lineHeight,
    baseline: Math.round(fontSize * 0.9),
  });
}

// Big rounded container with a title at the top-left. Useful for grouping
// related boxes. Returns the rect.
export function region(bag, x, y, w, h, title, opts = {}) {
  const rect = {
    ...BASE,
    id: nid(bag, "r"),
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: opts.stroke ?? "#34343c",
    strokeWidth: opts.strokeWidth ?? 1.5,
    strokeStyle: opts.strokeStyle ?? "dashed",
    backgroundColor: opts.bg ?? "transparent",
    fillStyle: opts.fillStyle ?? "hachure",
    roughness: opts.roughness ?? 1,
    groupIds: opts.groupIds ?? [],
    roundness: { type: 3 },
    boundElements: [],
  };
  bag.elements.push(rect);
  label(bag, x + 14, y + 10, title, {
    fontSize: 16,
    color: opts.titleColor ?? "#2a2a2a",
    groupIds: opts.groupIds ?? [],
  });
  return rect;
}

// Horizontal row of boxes connected with arrows.
export function rowLR(bag, items, layout = {}) {
  const { x = 60, y = 80, gap = 70, h = 70, opts = {} } = layout;
  const boxes = [];
  let cx = x;
  for (const it of items) {
    const w = it.w ?? Math.max(140, (it.text.length + 2) * 11);
    boxes.push(box(bag, cx, y, w, h, it.text, { ...opts, ...(it.opts ?? {}) }));
    cx += w + gap;
  }
  for (let i = 0; i < boxes.length - 1; i++)
    arrow(bag, boxes[i], boxes[i + 1], "LR", opts.arrow ?? {});
  return boxes;
}

// Wrap a populated bag into a renderable scene document.
export function scene(bag, name, opts = {}) {
  return {
    name,
    body: {
      type: "excalidraw",
      version: 2,
      source: "tools/diagrams",
      elements: bag.elements,
      appState: {
        viewBackgroundColor: opts.bg ?? "transparent",
        gridSize: null,
      },
      files: {},
    },
  };
}
