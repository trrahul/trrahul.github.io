---
layout: post
title: "SharpFocus Part 2: The Analysis Engine"
date: 2025-11-09 11:00:00 +0530
categories: [SharpFocus]
tags: [csharp, roslyn, static-analysis, control-flow, dataflow-analysis]
---

Part 2 of 3 in the [SharpFocus](https://github.com/trrahul/SharpFocus) series. Read [Part 1: Understanding Code Through Data Flow](/posts/part1-getting-started/) first if you haven't already.

Part 1 described what slicing does. This part describes how SharpFocus computes it: the program representation, the lattice, the worklist, the heuristics around aliases and mutations, and the places where soundness wins over precision.

### Two representations

Source text is the wrong starting point for the analysis. Identifiers need to resolve to symbols, expressions to types, and branches to edges. SharpFocus reads two structures off Roslyn:

1. The **semantic model** answers "what does this name refer to" and "what type does this expression produce".
2. The **control flow graph (CFG)** is a directed graph whose nodes are basic blocks (single entry, single exit) and whose edges are the possible transfers between them.

The CFG is what the dataflow algorithm walks. The semantic model is what makes each step accurate.

#### Basic blocks and control flow

For example:

```csharp
decimal ComputeOrderTotal(Order order, IPricingService pricing)
{
    if (order.Items.Count == 0)
        return 0m;

    decimal subtotal = 0m;
    foreach (var item in order.Items)
    {
        decimal unit = pricing.LookupPrice(item.Sku);
        if (item.Quantity >= 10)
            unit *= 0.9m;
        subtotal += unit * item.Quantity;
    }

    return order.IsTaxExempt ? subtotal : subtotal * 1.08m;
}
```

1. The early `return 0m` creates a second exit. A backward slice from the final return must exclude the guard's then-branch even though it appears earlier in the source.
2. The `foreach` introduces a back edge. `subtotal` flows from one iteration into the next, and the dependency set of any read inside the loop only stabilizes after the worklist has been around the loop enough times for the set to stop growing. That is the work the fixpoint does.
3. `pricing.LookupPrice` is opaque. Without a summary, the analyzer has to assume `pricing` and anything reachable from it might have been mutated by the call. That is the conservatism that pollutes dependency sets later.

Roslyn lowers the method to eight basic blocks:

```
B0  guard            evaluate: order.Items.Count == 0
B1  early return     return 0m
B2  loop init        subtotal = 0m;  acquire enumerator
B3  loop test        MoveNext() ?
B4  body fetch       unit = pricing.LookupPrice(item.Sku);
                     evaluate: item.Quantity >= 10
B5  bulk discount    unit *= 0.9m
B6  accumulate       subtotal += unit * item.Quantity
B7  exit             return order.IsTaxExempt ? subtotal : subtotal * 1.08m
```

The edges are where the topology stops being a tree:

- `B0 -> B1` when the guard fires; otherwise `B0 -> B2`.
- `B2 -> B3 -> B4` enters the body. `B3 -> B7` leaves once the enumerator is exhausted.
- Inside the body, `B4 -> B5` on the bulk-discount branch and `B4 -> B6` otherwise. Both rejoin at `B6`.
- `B6 -> B3` is the back edge. It is what distinguishes the CFG from the syntax tree, and it is the reason the algorithm needs to iterate.

{% include diagram.html name="sharpfocus-cfg-basic-blocks" alt="Control flow graph for ComputeOrderTotal: eight basic blocks with an early-return guard, a foreach loop with a back edge, and a nested branch in the body" %}

The graph supports questions the AST cannot answer. Which statements can reach this read of `subtotal`? Everything along any path from B2 through one or more passes of B6. Which statements are reachable from this write? B7, plus B6 itself on later iterations.

Roslyn's `ControlFlowGraph` API builds these graphs. SharpFocus uses it as-is and layers its own per-block state on top.

### Places

A **place** names a memory location that can be read or written. In C# that includes locals (`subtotal`, `unit`, `item`), parameters (`order`, `pricing`), fields (`_currentOrder`, `Config.Timeout`), and properties (`order.Status`, `customer.Address.City`).

Internally a place is a base symbol plus an optional access path of nested member accesses. See [Place.cs (lines 6-36)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Models/Place.cs#L6-L36).

The access path is what lets the analysis distinguish a write to `order.Status` from a write to `order.Total`. Both touch `order`, but only one invalidates dependencies on `Total`.

```
Place { Symbol = "x",        AccessPath = [] }
Place { Symbol = "order",    AccessPath = ["Status"] }
Place { Symbol = "customer", AccessPath = ["Address", "City"] }
```

### The dependency lattice

The per-block state is a map from places to dependency sets. Each entry says "here is the set of program locations whose values flow into this place". See [FlowDomain.cs (lines 6-50)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Models/FlowDomain.cs#L6-L50). A `Location` is a (basic block, statement index) pair.

`FlowDomain` is a lattice:

- Join is set union.
- Order is the subset relation.
- Bottom is the empty domain.

Two properties matter for the algorithm. The lattice has finite height because the set of program locations in a method is finite, and the transfer functions are monotonic. Together they guarantee that the worklist iteration terminates.

### The dataflow algorithm

The algorithm is the textbook forward worklist:

```
1. Initialize: empty FlowDomain for each block
2. Worklist <- all blocks in CFG
3. While worklist is not empty:
     a. Remove block B from worklist
     b. Compute input state by joining predecessor states
     c. Apply transfer function to get output state
     d. If output state changed:
          - Update stored state for B
          - Add all successor blocks to worklist
4. Return final states
```

The implementation is in [DataflowEngine.cs (lines 26-65)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Engine/DataflowEngine.cs#L26-L65). The interesting part is the transfer function.

#### Transfer function for assignments

For an assignment `x = y + z` at location L:

```
deps_out(x) = {L} ∪ deps_in(y) ∪ deps_in(z)
```

`x` depends on the assignment itself plus everything that flowed into the right-hand side. Worked through a short example:

```csharp
int a = 5;        // L1: deps(a) = {L1}
int b = 10;       // L2: deps(b) = {L2}
int c = a + b;    // L3: deps(c) = {L3, L1, L2}
int d = c * 2;    // L4: deps(d) = {L4, L3, L1, L2}
```

Dependencies inherited from the RHS persist transitively. By L4, `d` carries the full chain back to L1 and L2.

#### Joining at branches

When two paths reach the same block, the input state is the union of their output states:

```csharp
int x;
if (condition)     // L1
    x = 1;         // L2: deps(x) = {L1, L2}
else
    x = 2;         // L3: deps(x) = {L1, L3}

int y = x;         // L4: deps(x) = {L1, L2, L3}
                   //      deps(y) = {L1, L2, L3, L4}
```

The condition at L1 appears in both branches because it controls which assignment runs. That is a control dependency, covered below.

{% include diagram.html name="sharpfocus-dep-lattice" alt="Dependency sets merge at branch join: union of both paths propagates to the use site" %}

### Aliases

Two variables can refer to the same object. A write through one is visible through the other:

```csharp
var order = new Order();
var backup = order;                       // backup aliases order
order.Status = OrderStatus.Shipped;
Console.WriteLine(backup.Status);         // prints "Shipped"
```

If the analyzer treats `backup` as independent of `order`, a forward slice from `order` will miss the read through `backup` and a backward slice from `backup.Status` will miss the write to `order.Status`.

SharpFocus tracks aliases from four sources:

1. Direct assignment: `var y = x`.
2. Argument passing: arguments alias the corresponding parameters inside the callee's frame.
3. `ref` and `out` parameters: explicit aliases by language design.
4. Field projection: if `x` and `y` alias, then `x.F` and `y.F` alias.

The implementation is in [BasicAliasAnalyzer.cs (lines 38-96)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/BasicAliasAnalyzer.cs#L38-L96). The transfer function consults it on every write to propagate the dependency to every aliased place.

The analysis is intraprocedural. Aliases that emerge through shared collection state, like two variables holding the same dictionary entry, are not tracked precisely. SharpFocus assumes any mutation to such a collection might affect every place that holds a reference to it. Soundness over precision.

### Mutation detection

Assignment is not the only way to write state. C# also has compound assignment (`x += 5`), increment and decrement, property setters, mutating method calls (`list.Add(item)`), and `ref`/`out` parameters.

Roslyn's CFG lowers most of these to plain assignments. `x++` becomes `x = x + 1`. The detector handles the cases the lowering leaves intact. See [RoslynMutationDetector.cs (lines 68-115)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/RoslynMutationDetector.cs#L68-L115).

For `x += y`:

```
target: x
inputs: {x, y}     // result depends on the old value of x and on y
status: Definitely
```

For `list.Add(item)` where `list` is mutable:

```
target: list
inputs: {item, list}
status: Possibly
```

`Possibly` triggers the same conservative propagation as an unknown call: the call site enters the dependency set of every later read of `list`. SharpFocus has a small allowlist of provably pure BCL methods (`string.ToUpper`, `Math.Abs`, etc.) that bypass this. Everything else is assumed to mutate.

### Control dependencies

A statement nested inside a branch depends on the branch condition because the condition decides whether the statement runs at all:

```csharp
int result;
if (condition)      // L1
    result = 10;    // L2
else
    result = 20;    // L3

return result;      // L4
```

At L4, `result` depends on L2 and L3 for its value and on L1 for whether L2 or L3 was the source.

SharpFocus computes control dependencies from the post-dominator tree. A block X is a control dependency of Y if some successor of X reaches Y and another does not. The construction handles loops by adding back edges to the dominator computation, which keeps the post-dominator tree well-defined for cyclic CFGs. Once control dependencies are known, the transfer function adds the controlling location to the dependency set of every place written in the controlled block.

### Intraprocedural and interprocedural analysis

SharpFocus is primarily intraprocedural. A call `Foo(x)` is handled with three rules:

1. If `x` is passed by `ref` or `out`, treat it as written.
2. If `x` is a mutable reference type and no summary is available, assume its fields might be written.
3. Add the call site to `dep(x)` so later reads see it.

This overestimates dependencies. A call that reads `x` but never mutates it still gets added. The trade-off is that a real mutation inside `Foo` cannot be silently missed.

When summaries are available, the analysis uses them: it maps the callee's effects back to the caller's places and stops at the boundary to keep cost bounded.

### The pipeline end to end

Given a method `M` and a cursor position `P`:

```
1. Resolve P to a place using the semantic model.
2. Build the CFG for M.
3. Initialize the flow domain (every place starts with empty deps).
4. Run the worklist:
     For each block:
       a. Detect mutations.
       b. Query the alias analyzer for affected places.
       c. Read deps of input places.
       d. Update deps of output places.
       e. Add control dependencies.
       f. Push successors.
5. Read the fixpoint state for the place at P.
6. Map locations back to source ranges.
7. Hand the ranges to the editor for highlighting.
```

In practice the worklist converges in two to four passes for most methods. Deep nesting and complex loops take longer, but termination is guaranteed by the lattice height and monotonicity of the transfer functions.

{% include diagram.html name="sharpfocus-pipeline" alt="SharpFocus analysis pipeline: source code through CFG, alias, mutation, fixpoint, and slice extraction to highlighted code" %}

### Things the language makes harder

A few C# features need special handling:

- **async/await.** Roslyn's CFG already models the state machine, so the analyzer treats await blocks like any other. The interesting consequence is that captured locals can be observed by other code between suspension and resumption, which is one more reason mutations through reference types are treated conservatively.
- **LINQ.** Query syntax desugars to `Where`/`Select`/etc. with lambdas. The analyzer treats those calls like any other and analyzes the lambda body as a nested scope, propagating captured-variable dependencies to the outer scope.
- **Lambdas and closures.** Captures are tracked through the semantic model. A read of a captured local inside a lambda contributes to the slice the same way a direct read would.
- **Properties.** Auto-properties act like fields. Custom getters and setters are analyzed like methods, which means a read of `order.Total` in the running example would pull in the body of the getter if SharpFocus had a summary for it.
- **Generics.** Type parameters do not change the dependency structure. The analysis runs on shapes, not types, and Roslyn's semantic model handles constraint resolution.
- **Pattern matching and switch expressions.** These lower to nested branches with temporary bindings. The temporaries need to be tracked carefully so that dependencies flow from the matched expression through the guards into the result.

### Putting it together

A worked example, with the cursor on the final `return rounded`:

```csharp
public int ProcessOrder(Order order, decimal discount)
{
    if (order.Total < 100)
        return 0;

    decimal adjusted = order.Total * (1 - discount);
    int rounded = (int)Math.Round(adjusted);

    order.ProcessedAmount = rounded;
    return rounded;
}
```

The CFG has six blocks:

```
B0: if (order.Total < 100)
B1: return 0
B2: adjusted = order.Total * (1 - discount)
B3: rounded = (int)Math.Round(adjusted)
B4: order.ProcessedAmount = rounded
B5: return rounded
```

Mutation detection records writes to `adjusted`, `rounded`, and `order.ProcessedAmount`, with reads of `order`, `discount`, and intermediate values. No aliases are created. Blocks B2 through B5 are control-dependent on B0.

After the fixpoint:

```
B0: deps(order.Total)         = {L0}
B2: deps(adjusted)            = {L2, L0, discount}
B3: deps(rounded)             = {L3, L2, L0, discount}
B4: deps(order.ProcessedAmount) = {L4, L3, L2, L0, discount}
B5: deps(return value)        = {L5, L3, L2, L0, discount}
```

The backward slice from `return rounded`:

- L5: `return rounded`
- L3: `rounded = (int)Math.Round(adjusted)`
- L2: `adjusted = order.Total * (1 - discount)`
- L0: `if (order.Total < 100)` (control dependency)
- the parameter `discount`

What it leaves out: L1 (a different control path) and L4 (a write that doesn't flow into the return).

The forward slice from `discount`:

- L2: `adjusted = order.Total * (1 - discount)`
- L3: `rounded = (int)Math.Round(adjusted)`
- L4: `order.ProcessedAmount = rounded`
- L5: `return rounded`

Changing `discount` would change the computed value, the field write, and the return.

Next: [Part 3: Advanced Analysis Techniques](/posts/part3-advanced-concepts/) covers strong-vs-weak updates, summary-based interprocedural analysis, and where the current implementation gives up.
