---
layout: post
title: "SharpFocus Part 2: The Analysis Engine"
description: "How the Roslyn slicer computes dependencies."
date: 2025-11-09 11:00:00 +0530
categories: [SharpFocus]
collection_id: sharpfocus
tags: [csharp, roslyn, ide-extension]
---

Part 2 of 3 in the [SharpFocus](https://github.com/trrahul/SharpFocus) series. Start with [Part 1: Understanding Code Through Data Flow](/posts/part1-getting-started/) if you haven't.

Part 1 was about what a slice is. This part is about how SharpFocus actually computes one: how it represents your program, how dependency sets flow through it, and the judgement calls I made around aliases, mutations, and the places where I chose to over-report rather than risk missing something.

### Two views of the program

Raw source text is the wrong place to start. The analysis needs names resolved to the symbols they refer to, expressions tagged with their types, and branches turned into edges it can walk. SharpFocus gets two things from Roslyn to make that possible:

1. The semantic model answers "what does this name refer to?" and "what type does this expression produce?"
2. The control flow graph (CFG) is a directed graph whose nodes are basic blocks (a run of statements with one entry and one exit) and whose edges are the possible jumps between them.

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

Three things in here matter for the analysis:

1. The early `return 0m` is a second way out of the method. A backward slice from the final return has to leave out the guard's then-branch, even though it sits earlier in the source.
2. The `foreach` adds a back edge, an arrow from the end of the loop body back to the top. `subtotal` carries from one iteration into the next, so the dependency set for a read inside the loop only settles once the analysis has gone around the loop enough times that the set stops growing. Going around until it stops growing is the work the fixpoint does.
3. `pricing.LookupPrice` is a black box. With nothing describing what it does, the analyzer has to assume the call might have changed `pricing` and anything reachable through it. That assumption is the conservatism that bloats dependency sets later on.

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

The edges are where the shape stops being a tree:

- `B0 -> B1` when the guard fires; otherwise `B0 -> B2`.
- `B2 -> B3 -> B4` enters the body. `B3 -> B7` leaves once the enumerator is exhausted.
- Inside the body, `B4 -> B5` on the bulk-discount branch and `B4 -> B6` otherwise. Both rejoin at `B6`.
- `B6 -> B3` is the back edge. It's what separates the CFG from the syntax tree, and it's the reason the algorithm has to iterate.

{% include diagram.html name="sharpfocus-cfg-basic-blocks" alt="Control flow graph for ComputeOrderTotal: eight basic blocks with an early-return guard, a foreach loop with a back edge, and a nested branch in the body" %}

The graph answers questions the bare syntax tree can't. Which statements can reach this read of `subtotal`? Everything on any path from B2 through one or more passes of B6. Which statements does this write reach? B7, and B6 itself on later iterations.

Roslyn's `ControlFlowGraph` API builds these graphs. SharpFocus uses it as-is and layers its own per-block state on top.

### Places

A place is the analysis's name for a memory location you can read or write. In C# that covers locals (`subtotal`, `unit`, `item`), parameters (`order`, `pricing`), fields (`_currentOrder`, `Config.Timeout`), and properties (`order.Status`, `customer.Address.City`).

Internally a place is a base symbol plus an optional access path of nested member accesses. See [Place.cs (lines 6-36)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Models/Place.cs#L6-L36).

The access path is what lets the analysis tell a write to `order.Status` apart from a write to `order.Total`. Both touch `order`, but only one of them invalidates anything that depended on `Total`.

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

Two properties make the algorithm safe to run. The lattice has finite height, meaning the sets can only grow so far, because a method has a finite number of locations to put in them. And the transfer functions are monotonic: they only ever add to a set, never quietly drop something. Put those together and the iteration is guaranteed to stop instead of spinning forever.

### The dataflow algorithm

The core loop is the textbook forward worklist. A worklist is a to-do list of blocks; you take one off, process it, and if its output changed you put the blocks downstream of it back on the list, repeating until the list empties:

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

The implementation is in [DataflowEngine.cs (lines 26-65)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Engine/DataflowEngine.cs#L26-L65). The interesting part is the transfer function, the bit that says how one statement changes the dependency sets.

#### Transfer function for assignments

For an assignment `x = y + z` at location L:

```
deps_out(x) = {L} ∪ deps_in(y) ∪ deps_in(z)
```

`x` depends on the assignment itself, plus everything that flowed into the right-hand side. Worked through a short example:

```csharp
int a = 5;        // L1: deps(a) = {L1}
int b = 10;       // L2: deps(b) = {L2}
int c = a + b;    // L3: deps(c) = {L3, L1, L2}
int d = c * 2;    // L4: deps(d) = {L4, L3, L1, L2}
```

Dependencies carried in from the right-hand side stick around as you go. By L4, `d` carries the whole chain back to L1 and L2.

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

The condition at L1 shows up in both branches, because it decides which assignment runs. That's a control dependency, which comes up below.

{% include diagram.html name="sharpfocus-dep-lattice" alt="Dependency sets merge at branch join: union of both paths propagates to the use site" %}

### Aliases

Two variables can point at the same object, and a write through one is visible through the other:

```csharp
var order = new Order();
var backup = order;                       // backup aliases order
order.Status = OrderStatus.Shipped;
Console.WriteLine(backup.Status);         // prints "Shipped"
```

If the analyzer thinks `backup` is independent of `order`, a forward slice from `order` will miss the read through `backup`, and a backward slice from `backup.Status` will miss the write to `order.Status`. Either way the slice is wrong.

SharpFocus tracks aliases from four sources:

1. Direct assignment: `var y = x`.
2. Argument passing: arguments alias the matching parameters inside the called method's frame.
3. `ref` and `out` parameters: explicit aliases, by language design.
4. Field projection: if `x` and `y` alias, then `x.F` and `y.F` alias too.

The implementation is in [BasicAliasAnalyzer.cs (lines 38-96)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/BasicAliasAnalyzer.cs#L38-L96). The transfer function asks it, on every write, which other places that write also touches, and propagates the dependency to all of them.

It works one method at a time. Aliases that come through shared collection state, like two variables holding the same dictionary entry, aren't tracked precisely. SharpFocus instead assumes any mutation to such a collection might affect every place holding a reference to it. That's soundness bought at the price of precision, a trade I made deliberately and kept making.

### Mutation detection

Assignment isn't the only way to write state. C# also has compound assignment (`x += 5`), increment and decrement, property setters, mutating method calls (`list.Add(item)`), and `ref`/`out` parameters.

Roslyn's CFG lowers most of these to plain assignments. `x++` turns into `x = x + 1`. The detector handles the cases the lowering leaves standing. See [RoslynMutationDetector.cs (lines 68-115)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/RoslynMutationDetector.cs#L68-L115).

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

`Possibly` kicks off the same conservative propagation as an unknown call: the call site lands in the dependency set of every later read of `list`. SharpFocus keeps a small allowlist of provably pure methods from the base class library (`string.ToUpper`, `Math.Abs`, and so on) that skip this. Everything else is assumed to mutate.

### Control dependencies

A statement nested inside a branch depends on the branch's condition, because the condition decides whether the statement runs at all:

```csharp
int result;
if (condition)      // L1
    result = 10;    // L2
else
    result = 20;    // L3

return result;      // L4
```

At L4, `result` depends on L2 and L3 for its value, and on L1 for which of the two was the source.

SharpFocus works these out from the post-dominator tree. The rule is: a block X controls block Y when one branch out of X always reaches Y and another branch can skip it, so X's decision is what determines whether Y runs. The construction copes with loops by feeding the back edges into the dominator computation, which keeps the tree well-defined even when the graph has cycles. Once the controlling blocks are known, the transfer function adds the controlling location to the dependency set of every place written in the block it controls.

### Across method calls

SharpFocus mostly stays inside one method at a time. When it reaches a call like `Foo(x)`, it doesn't dive into `Foo`; it applies three rules:

1. If `x` is passed by `ref` or `out`, treat it as written.
2. If `x` is a mutable reference type and there's no summary for `Foo`, assume its fields might be written.
3. Add the call site to `dep(x)`, so later reads see it.

This over-counts dependencies. A call that reads `x` but never changes it still gets added. The point of erring this way is that a real mutation inside `Foo` can't be silently missed.

When a summary is available, the analysis uses it: it maps the called method's effects back onto the caller's places and stops at the boundary, which keeps the cost bounded.

### The whole pipeline

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

For most methods the worklist settles in two to four passes. Deep nesting and gnarly loops take longer, but it always terminates, for the reasons in the lattice section: the sets can only grow so far, and the transfer functions only ever grow them.

{% include diagram.html name="sharpfocus-pipeline" alt="SharpFocus analysis pipeline: source code through CFG, alias, mutation, fixpoint, and slice extraction to highlighted code" %}

### Things the language makes harder

A few C# features need their own handling:

- async/await. Roslyn's CFG already models the state machine, so the analyzer treats await blocks like any other block. The catch is that captured locals can be observed by other code between suspension and resumption, which is one more reason mutations through reference types are treated conservatively.
- LINQ. Query syntax desugars into `Where`/`Select`/etc. calls with lambdas. The analyzer treats those like any other calls and analyzes the lambda body as a nested scope, carrying captured-variable dependencies back out to the surrounding scope.
- Lambdas and closures. Captures are tracked through the semantic model. A read of a captured local inside a lambda feeds the slice the same way a direct read would.
- Properties. Auto-properties behave like fields. Custom getters and setters are analyzed like methods, so a read of `order.Total` in the running example would pull in the getter's body if SharpFocus had a summary for it.
- Generics. Type parameters don't change the dependency structure. The analysis runs on the shape of the code, not the concrete types, and Roslyn's semantic model handles the constraints.
- Pattern matching and switch expressions. These lower to nested branches with temporary bindings. The temporaries have to be tracked carefully so dependencies flow from the matched expression, through the guards, into the result.

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

Mutation detection records writes to `adjusted`, `rounded`, and `order.ProcessedAmount`, with reads of `order`, `discount`, and the intermediate values. No aliases are created. Blocks B2 through B5 are control-dependent on B0.

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

What it leaves out: L1 (a different control path) and L4 (a write that never flows into the return).

The forward slice from `discount`:

- L2: `adjusted = order.Total * (1 - discount)`
- L3: `rounded = (int)Math.Round(adjusted)`
- L4: `order.ProcessedAmount = rounded`
- L5: `return rounded`

Change `discount` and you change the computed value, the field write, and the return.

Next in this series: [Part 3: Advanced Analysis Techniques](/posts/part3-advanced-concepts/) covers strong-versus-weak updates, summary-based analysis across methods, and where the current implementation gives up.
