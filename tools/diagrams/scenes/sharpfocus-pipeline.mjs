import { newBag, rowLR, scene } from "../helpers.mjs";

export const name = "sharpfocus-pipeline";

export function build(t) {
  const bag = newBag();
  rowLR(
    bag,
    [
      { text: "Source" },
      { text: "CFG" },
      { text: "Alias\nanalysis" },
      { text: "Mutation\nanalysis" },
      { text: "Fixpoint" },
      { text: "Slice" },
      { text: "Highlighted\ncode" },
    ],
    {
      gap: 50,
      h: 80,
      opts: {
        bg: t.surface,
        fillStyle: "solid",
        stroke: t.accent,
        textColor: t.text,
        arrow: { stroke: t.text },
      },
    },
  );
  return scene(bag, name);
}
