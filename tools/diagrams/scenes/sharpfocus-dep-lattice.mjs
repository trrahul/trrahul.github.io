import { newBag, box, arrow, label, scene } from "../helpers.mjs";

export const name = "sharpfocus-dep-lattice";

// Shows how dependency sets merge at branch join points — the
// information-flow lattice concept used in Parts 1 and 2 of the
// SharpFocus series.
export function build(t) {
  const bag = newBag();
  const opts = {
    bg: t.surface,
    fillStyle: "solid",
    stroke: t.accent,
    textColor: t.text,
  };
  const fOpts = { ...opts, fontSize: 16 }; // slightly smaller for longer text

  const entry = box(bag, 300, 20, 150, 55, "Entry", opts);
  const cond = box(bag, 260, 130, 230, 70, "if condition\n(L1)", opts);
  const thenB = box(bag, 20, 270, 265, 75, "x = 1\ndeps(x) = {L1, L2}", fOpts);
  const elseB = box(bag, 475, 270, 265, 75, "x = 2\ndeps(x) = {L1, L3}", fOpts);
  const joinB = box(
    bag,
    250,
    415,
    260,
    70,
    "Join\ndeps(x) = {L1, L2, L3}",
    fOpts,
  );
  const useX = box(
    bag,
    235,
    550,
    290,
    75,
    "y = x\ndeps(y) = {L1, L2, L3, L4}",
    fOpts,
  );

  arrow(bag, entry, cond, "TD", { stroke: t.text });
  arrow(bag, cond, thenB, "TD", { stroke: t.text });
  arrow(bag, cond, elseB, "TD", { stroke: t.text });
  arrow(bag, thenB, joinB, "TD", { stroke: t.text });
  arrow(bag, elseB, joinB, "TD", { stroke: t.text });
  arrow(bag, joinB, useX, "TD", { stroke: t.text });

  label(bag, 155, 228, "true", { color: t.muted, fontSize: 15 });
  label(bag, 520, 228, "false", { color: t.muted, fontSize: 15 });

  return scene(bag, name);
}
