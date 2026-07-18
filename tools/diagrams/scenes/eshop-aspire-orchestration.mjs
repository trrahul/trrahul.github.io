import { newBag, box, arrow, label, region, scene } from "../helpers.mjs";

export const name = "eshop-aspire-orchestration";

// The .NET Aspire AppHost (src/eShop.AppHost/Program.cs) wires every app and
// service to its infrastructure. Three roomy channels keep arrows off the
// boxes: RabbitMQ is a tall hub on the left (every service publishes to it),
// services run down the centre, and the per-service databases sit inside one
// PostgreSQL region on the right. Solid = WithReference, dashed = WaitFor.
export function build(t) {
  const bag = newBag();

  // ---- box presets ----
  const svc = { bg: t.surface, fillStyle: "solid", stroke: t.accent, textColor: t.text, fontSize: 17 };
  const infra = { bg: t.warnSoft, fillStyle: "solid", stroke: t.warn, textColor: t.text, fontSize: 17 };
  const dbx = { bg: t.accentSoft, fillStyle: "solid", stroke: t.accent, textColor: t.text, fontSize: 17 };
  const appx = { bg: t.okSoft, fillStyle: "solid", stroke: t.ok, textColor: t.text, fontSize: 18 };

  // ---- arrow presets ----
  const ref = { stroke: t.muted, strokeWidth: 2 };               // WithReference -> shared infra
  const refDb = { stroke: t.accent, strokeWidth: 1.5 };          // WithReference -> own database
  const appRef = { stroke: t.ok, strokeWidth: 2 };               // WebApp -> service
  const wait = { stroke: t.warn, strokeWidth: 2, strokeStyle: "dashed" }; // WaitFor

  // ---- regions ----
  region(bag, 40, 210, 210, 594, "Infrastructure", { stroke: t.muted, titleColor: t.text });
  region(bag, 420, 120, 290, 684, "Services", { stroke: t.muted, titleColor: t.text });
  region(bag, 880, 120, 320, 684, "PostgreSQL", { stroke: t.muted, titleColor: t.text });

  // ---- left: app entry + shared infrastructure ----
  const webapp = box(bag, 70, 88, 170, 82, "WebApp\n(Blazor)", appx);
  const rabbit = box(bag, 70, 262, 170, 430, "RabbitMQ\n(eventbus)", infra);
  const redis = box(bag, 70, 706, 170, 64, "Redis", infra);

  // ---- centre: services (pitch 92) ----
  const identity = box(bag, 450, 170, 240, 62, "Identity API", svc);
  const basket = box(bag, 450, 262, 240, 62, "Basket API", svc);
  const catalog = box(bag, 450, 354, 240, 62, "Catalog API", svc);
  const ordering = box(bag, 450, 446, 240, 62, "Ordering API", svc);
  const orderProc = box(bag, 450, 538, 240, 62, "OrderProcessor", svc);
  const payment = box(bag, 450, 630, 240, 62, "PaymentProcessor", svc);
  const webhooks = box(bag, 450, 722, 240, 62, "Webhooks API", svc);

  // ---- right: per-service databases (all hosted by the one PostgreSQL region) ----
  const identitydb = box(bag, 950, 170, 180, 62, "identitydb", dbx);
  const catalogdb = box(bag, 950, 354, 180, 62, "catalogdb", dbx);
  const orderingdb = box(bag, 950, 492, 180, 62, "orderingdb", dbx);
  const webhooksdb = box(bag, 950, 722, 180, 62, "webhooksdb", dbx);

  // ---- WebApp -> services (WithReference) ----
  arrow(bag, webapp, basket, "auto", appRef);
  arrow(bag, webapp, catalog, "auto", appRef);
  arrow(bag, webapp, ordering, "auto", appRef);
  arrow(bag, webapp, rabbit, "TD", ref);

  // ---- WaitFor (dashed) ----
  arrow(bag, webapp, identity, "auto", wait);
  arrow(bag, orderProc, ordering, "BU", wait);

  // ---- services -> event bus (fan into distinct points down the hub edge) ----
  arrow(bag, basket, rabbit, "RL", { ...ref, toFrac: 0.07 });
  arrow(bag, catalog, rabbit, "RL", { ...ref, toFrac: 0.29 });
  arrow(bag, ordering, rabbit, "RL", { ...ref, toFrac: 0.5 });
  arrow(bag, orderProc, rabbit, "RL", { ...ref, toFrac: 0.71 });
  arrow(bag, payment, rabbit, "RL", { ...ref, toFrac: 0.9 });
  arrow(bag, webhooks, rabbit, "RL", { ...ref, toFrac: 0.99 });
  arrow(bag, basket, redis, "RL", ref);

  // ---- services -> their own database (near-horizontal, aligned heights) ----
  arrow(bag, identity, identitydb, "LR", refDb);
  arrow(bag, catalog, catalogdb, "LR", refDb);
  arrow(bag, ordering, orderingdb, "LR", refDb);
  arrow(bag, orderProc, orderingdb, "LR", refDb);
  arrow(bag, webhooks, webhooksdb, "LR", refDb);

  return scene(bag, name);
}
