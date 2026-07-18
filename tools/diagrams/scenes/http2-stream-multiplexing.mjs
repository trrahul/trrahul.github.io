import { newBag, box, arrow, label, region, scene } from "../helpers.mjs";

export const name = "http2-stream-multiplexing";

export function build(t) {
  const bag = newBag();

  label(bag, 60, 24, "HTTP/2 stream multiplexing", {
    fontSize: 24,
    color: t.heading,
  });
  label(
    bag,
    60,
    56,
    "Three logical requests, one TCP byte stream, frames interleaved by stream id",
    { fontSize: 14, color: t.muted },
  );

  // ---- Client side ----
  region(bag, 40, 100, 280, 360, "Client (logical streams)", {
    bg: t.surfaceMuted,
    titleColor: t.text,
    stroke: t.muted,
  });
  const req1 = box(bag, 70, 150, 220, 80, "Stream 1\nGET /basket", {
    bg: t.s1Soft,
    fillStyle: "solid",
    stroke: t.s1,
    fontSize: 18,
  });
  const req2 = box(bag, 70, 250, 220, 80, "Stream 3\nPUT /items", {
    bg: t.s2Soft,
    fillStyle: "solid",
    stroke: t.s2,
    fontSize: 18,
  });
  const req3 = box(bag, 70, 350, 220, 80, "Stream 5\nPOST /checkout", {
    bg: t.s3Soft,
    fillStyle: "solid",
    stroke: t.s3,
    fontSize: 18,
  });

  // ---- Framing layer ----
  region(bag, 360, 100, 280, 360, "HTTP/2 framing layer", {
    bg: t.accentSoft,
    titleColor: t.accent,
    stroke: t.accent,
  });
  const framer = box(
    bag,
    390,
    180,
    220,
    220,
    "split into frames\n\nattach stream id\n\nschedule onto\nthe wire",
    {
      bg: t.surface,
      fillStyle: "solid",
      stroke: t.accent,
      fontSize: 17,
    },
  );
  arrow(bag, req1, framer, "LR", { stroke: t.s1, strokeWidth: 2 });
  arrow(bag, req2, framer, "LR", { stroke: t.s2, strokeWidth: 2 });
  arrow(bag, req3, framer, "LR", { stroke: t.s3, strokeWidth: 2 });

  // ---- The wire ----
  region(
    bag,
    40,
    510,
    1000,
    200,
    "Single TCP connection (one ordered byte stream)",
    {
      bg: t.surface,
      titleColor: t.text,
      stroke: t.muted,
      fillStyle: "hachure",
    },
  );

  const frameSeq = [
    { t: "HEADERS\nstream 1", c: t.s1, bg: t.s1Soft },
    { t: "HEADERS\nstream 3", c: t.s2, bg: t.s2Soft },
    { t: "DATA\nstream 1", c: t.s1, bg: t.s1Soft },
    { t: "HEADERS\nstream 5", c: t.s3, bg: t.s3Soft },
    { t: "DATA\nstream 3", c: t.s2, bg: t.s2Soft },
    { t: "DATA\nstream 1", c: t.s1, bg: t.s1Soft },
    { t: "DATA\nstream 5", c: t.s3, bg: t.s3Soft },
    { t: "DATA\nstream 3", c: t.s2, bg: t.s2Soft },
  ];
  let fx = 60;
  const fy = 570;
  const fw = 110;
  const fh = 80;
  const fgap = 12;
  const frames = [];
  for (const f of frameSeq) {
    frames.push(
      box(bag, fx, fy, fw, fh, f.t, {
        bg: f.bg,
        fillStyle: "solid",
        stroke: f.c,
        fontSize: 13,
        roughness: 1.2,
      }),
    );
    fx += fw + fgap;
  }
  label(bag, 60, 670, "\u2192  bytes flow on the TCP socket  \u2192", {
    fontSize: 13,
    color: t.muted,
  });

  const midFrame = frames[Math.floor(frames.length / 2)];
  arrow(bag, framer, midFrame, "TD", { stroke: t.accent, strokeWidth: 2 });

  // ---- Server side ----
  region(bag, 680, 100, 320, 360, "Server (reassembled by stream id)", {
    bg: t.surfaceMuted,
    titleColor: t.text,
    stroke: t.muted,
  });
  const sv1 = box(bag, 710, 150, 260, 80, "Stream 1\nGET /basket  handler", {
    bg: t.s1Soft,
    fillStyle: "solid",
    stroke: t.s1,
    fontSize: 17,
  });
  const sv2 = box(bag, 710, 250, 260, 80, "Stream 3\nPUT /items  handler", {
    bg: t.s2Soft,
    fillStyle: "solid",
    stroke: t.s2,
    fontSize: 17,
  });
  const sv3 = box(bag, 710, 350, 260, 80, "Stream 5\nPOST /checkout  handler", {
    bg: t.s3Soft,
    fillStyle: "solid",
    stroke: t.s3,
    fontSize: 17,
  });
  arrow(bag, framer, sv1, "LR", { stroke: t.s1, strokeStyle: "dashed" });
  arrow(bag, framer, sv2, "LR", { stroke: t.s2, strokeStyle: "dashed" });
  arrow(bag, framer, sv3, "LR", { stroke: t.s3, strokeStyle: "dashed" });

  label(
    bag,
    60,
    740,
    "No HTTP-layer head-of-line blocking: a slow stream 3 frame does not stall stream 1 or 5.",
    { fontSize: 14, color: t.text },
  );
  label(
    bag,
    60,
    765,
    "TCP still sees one ordered byte stream, so a lost packet pauses every stream until retransmit.",
    { fontSize: 14, color: t.muted },
  );

  return scene(bag, name);
}
