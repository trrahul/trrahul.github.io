import { newBag, box, arrow, label, scene } from "../helpers.mjs";

export const name = "sharpfocus-cfg-basic-blocks";

// Control-flow graph for the ComputeOrderTotal example from Part 2.
// Demonstrates the topology that actually matters for static analysis:
// an early-return guard, a loop with a back edge, a nested branch
// inside the body, and a post-loop tax adjustment.
export function build(t) {
  const bag = newBag();
  const opts = {
    bg: t.surface,
    fillStyle: "solid",
    stroke: t.accent,
    textColor: t.text,
  };
  const fOpts = { ...opts, fontSize: 16 };

  const b0 = box(
    bag,
    310,
    20,
    380,
    65,
    "B0: guard\norder.Items.Count == 0?",
    fOpts,
  );
  const b1 = box(bag, 750, 20, 240, 65, "B1: return 0m", opts);
  const b2 = box(bag, 310, 130, 380, 55, "B2: subtotal = 0m", fOpts);
  const b3 = box(bag, 310, 220, 380, 55, "B3: loop test\nmore items?", fOpts);
  const b7 = box(
    bag,
    20,
    215,
    260,
    90,
    "B7: return\norder.IsTaxExempt\n? subtotal\n: subtotal * 1.08m",
    { ...opts, fontSize: 15 },
  );
  const b4 = box(
    bag,
    310,
    320,
    380,
    80,
    "B4: unit = pricing.LookupPrice(item.Sku)\nif (item.Quantity >= 10)",
    fOpts,
  );
  const b5 = box(bag, 750, 335, 240, 60, "B5: unit *= 0.9m", fOpts);
  const b6 = box(
    bag,
    310,
    440,
    380,
    55,
    "B6: subtotal += unit * Quantity",
    fOpts,
  );

  arrow(bag, b0, b1, "LR", { stroke: t.text });
  arrow(bag, b0, b2, "TD", { stroke: t.text });
  arrow(bag, b2, b3, "TD", { stroke: t.text });
  arrow(bag, b3, b7, "RL", { stroke: t.text });
  arrow(bag, b3, b4, "TD", { stroke: t.text });
  arrow(bag, b4, b5, "LR", { stroke: t.text });
  arrow(bag, b4, b6, "TD", { stroke: t.text });
  arrow(bag, b5, b6, "TD", { stroke: t.text });

  // Loop back edge: B6 -> B3, routed around the right side so it does
  // not visually cross through B4 or B5. Drawn as a dashed multi-segment
  // arrow to make its role obvious.
  const sx = b6.x + b6.width;
  const sy = b6.y + b6.height / 2;
  const corridorX = 1040;
  const ey = b3.y + b3.height / 2;
  const ex = b3.x + b3.width;
  const backId = `a-back-${++bag.counter}`;
  const back = {
    angle: 0,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "dashed",
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
    id: backId,
    type: "arrow",
    x: sx,
    y: sy,
    width: corridorX - sx,
    height: ey - sy,
    strokeColor: t.muted ?? t.text,
    roundness: { type: 2 },
    points: [
      [0, 0],
      [corridorX - sx, 0],
      [corridorX - sx, ey - sy],
      [ex - sx, ey - sy],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
    boundElements: [],
  };
  bag.elements.push(back);

  // Edge labels.
  label(bag, 695, 32, "Count==0", { color: t.muted, fontSize: 14 });
  label(bag, 615, 192, "else", { color: t.muted, fontSize: 14 });
  label(bag, 285, 235, "no", {
    color: t.muted,
    fontSize: 14,
    align: "right",
  });
  label(bag, 615, 287, "yes", { color: t.muted, fontSize: 14 });
  label(bag, 695, 332, "Qty>=10", { color: t.muted, fontSize: 14 });
  label(bag, 615, 412, "else", { color: t.muted, fontSize: 14 });
  label(bag, 1050, 350, "back edge", { color: t.muted, fontSize: 14 });

  return scene(bag, name);
}
