---
layout: post
title: "SharpFocus Part 1: Understanding Code Through Data Flow"
date: 2025-11-09 10:00:00 +0530
categories: [SharpFocus]
tags: [csharp, roslyn, static-analysis, program-slicing, dataflow]
---

### The Dependency Problem

Consider this C# code:

```csharp
public class OrderProcessor
{
    private Order? _currentOrder;
    private readonly IOrderRepository _repository;
    private readonly IOrderCache _cache;

    public OrderProcessor(IOrderRepository repository, IOrderCache cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task InitializeAsync(int orderId, bool preferCache)
    {
        if (preferCache)
        {
            _currentOrder = await _cache.GetAsync(orderId);
            if (_currentOrder == null)
            {
                _currentOrder = await _repository.FetchAsync(orderId);
                await _cache.PutAsync(orderId, _currentOrder);
            }
        }
        else
        {
            _currentOrder = await _repository.FetchAsync(orderId);
        }
    }

    public void ResetIfExpired(DateTime snapshotUtc)
    {
        if (_currentOrder != null && _currentOrder.LastUpdated < snapshotUtc)
        {
            _currentOrder = null;
        }
    }

    public void ApplyManualOverride(Order? manualOrder)
    {
        if (manualOrder?.IsValid ?? false)
        {
            _currentOrder = manualOrder;
        }
    }

    public bool Validate()
    {
        if (_currentOrder == null)
        {
            return false;
        }

        if (_currentOrder.Total > 1000)
        {
            _currentOrder.RequiresApproval = true;
            return false;
        }

        return true;
    }

    public async Task ProcessAsync()
    {
        if (!Validate())
        {
            return;
        }

        await SendToQueueAsync(_currentOrder!);
        _currentOrder.Status = OrderStatus.Completed;
    }
}
```

A bug appears: `_currentOrder` is null when `ProcessAsync` runs in production. Was it never loaded because both the cache and repository returned null? Did the scheduled freshness check call `ResetIfExpired` moments before? Did a manual override provide a null object? The stack trace tells us where the crash happened but not which of these execution paths actually produced the null. In our deployment, a coordinator awaits `InitializeAsync` before invoking the synchronous guard and processor methods, so every branch in this class can legitimately run before the failure.

Finding the answer requires tracing data dependencies backward through the code. Traditional tools provide only partial solutions:

- **Find All References** lists every mention of `_currentOrder` but cannot distinguish reads from writes, sources from sinks.
- **Debugging** shows runtime values but requires reproducing the exact failure conditions and stepping through each instruction.
- **Manual inspection** demands mental tracking of all possible data flows, which becomes impractical in large methods.

The fundamental question is: **What statements could have influenced the value of this variable?** This is the dependency problem, and solving it requires understanding data flow.

### Program Slicing: Isolating Relevant Code

Program slicing, introduced by Mark Weiser in 1981, provides a formal answer to the dependency question. A slice is a subset of a program that preserves behavior for a specific variable at a specific location—the "slicing criterion."

Unlike text search, which finds syntactic occurrences, slicing finds semantic dependencies. It understands the difference between `x = y` (data flows from `y` to `x`) and `print(x)` (data flows from `x` to the console).

Two types of slices exist:

**Backward Slicing**: Given a variable at a program point, find all statements that could have influenced its current value. This answers "where did this come from?"

**Forward Slicing**: Given a variable at a program point, find all statements that could be affected by its value. This answers "what depends on this?"

<!--
Image Placeholder: A side-by-side comparison showing:
Left: Source code with all lines visible
Middle: Same code with backward slice highlighted (showing sources)
Right: Same code with forward slice highlighted (showing sinks)
Caption: Program slicing reveals semantic dependencies that text search cannot find.
-->

#### Backward Slice Example

Return to the `OrderProcessor`. Place the cursor on `_currentOrder` in the guard `if (_currentOrder == null)` inside `Validate` and compute a backward slice. The slice includes:

1. `_currentOrder = await _cache.GetAsync(orderId);` — the cache hit assignment
2. `_currentOrder = await _repository.FetchAsync(orderId);` — both the direct load and the cache-miss fallback
3. `_currentOrder = manualOrder;` in `ApplyManualOverride` — a different entry point that can replace the value
4. `_currentOrder = null;` in `ResetIfExpired` — a mutation that can wipe the state
5. The guard itself — the target location where the null is observed

The slice excludes calls such as `SendToQueueAsync` because they happen after the target and cannot influence whether `_currentOrder` is null at that point. It also ignores unrelated fields that never flow into `_currentOrder`.

This isolation reveals the data's history. The null could come from a cache miss, a manual override, or an expiry reset. Without the slice, you'd have to inspect each path manually and reason about their interleaving.

**In practice, the payoff is readability.** Slicing collapses dozens of scattered statements into one coherent story you can read top to bottom. Instead of jumping between cache code, override handlers, and lifecycle hooks, you see only the handful of lines that actually matter for the failure you are diagnosing. The trade-off is that you now depend on the tool's analysis being up to date with the exact build you are running; stale caches or partial projects can produce slices that hide a relevant path, so you still need a quick gut-check review before fully trusting the result. SharpFocus surfaces stale-analysis warnings, but it is still worth rerunning the analysis after large merges or dependency updates to keep the highlights trustworthy.

#### Forward Slice Example

Place the cursor on the assignments that load `_currentOrder` in `InitializeAsync` and compute a forward slice. The slice includes:

1. The loading statements themselves — both the cache hit and the repository fetch
2. The guard `if (_currentOrder == null)` inside `Validate` — control flow that depends on the value
3. `_currentOrder.RequiresApproval = true;` — a mutation based on the loaded data
4. `await SendToQueueAsync(_currentOrder!);` — the value flowing into an external system
5. `_currentOrder.Status = OrderStatus.Completed;` — a later mutation applied to the same object
6. `_currentOrder = null;` in `ResetIfExpired` — the point where the assignment's influence stops

The forward slice shows each statement whose behavior would change if `_currentOrder` were loaded differently. That precision is essential for impact analysis during refactoring or when evaluating a fix.

Just as importantly, it keeps the investigation readable. The slice is still code—not an abstract graph—but it is pared down to the minimal set of statements you need to understand. You stay in the source file, maintain context, and avoid the cognitive load of filtering noise manually. The cost is additional context switching when the slice jumps across files or generated code; the highlights guide you, but you may still need to open those sites to verify assumptions, so the experience works best when paired with strong navigation support in the editor and a deliberate habit of stepping through each highlighted dependency that lands outside the current view.

### The Information Flow Lattice

Slicing algorithms operate on a mathematical structure called a lattice. For SharpFocus, the relevant lattice is the **dependency set lattice**.

Each variable at each program point has a dependency set: the collection of program locations that could influence its value. The lattice structure defines how these sets combine:

- **Bottom (⊥)**: The empty set—no dependencies yet established
- **Join (∪)**: Set union—merging dependencies from multiple execution paths
- **Ordering (⊆)**: Subset relation—one set of dependencies is more precise than another if it contains fewer elements

Consider this code:

```csharp
int x;
if (condition)
    x = 1;  // Location L1
else
    x = 2;  // Location L2

int y = x;  // Location L3
```

At location L3, the dependency set for `x` is `{L1, L2}` because both assignments could influence the value depending on runtime conditions. The lattice join operation merged dependencies from both branches.

This lattice-based approach enables the analysis to handle complex control flow systematically. SharpFocus computes dependency sets by iterating to a fixpoint where no new dependencies emerge.

<!--
Image Placeholder: A diagram showing:
- A control flow graph with an if-else statement
- Dependency sets propagating through the graph
- The join operation merging sets at the confluence point
Caption: Dependency sets propagate through control flow and merge at join points.
-->

### SharpFocus: Making Dependencies Visible

[SharpFocus](https://github.com/trrahul/SharpFocus) implements these concepts as a Visual Studio Code extension. The tool performs static analysis on C# code using the Roslyn compiler platform, which provides semantic understanding of code structure, types, and symbols.

The analysis works in three stages:

1. **Control Flow Graph Construction**: The code is represented as a directed graph where nodes are basic blocks (straight-line sequences of statements) and edges represent possible execution paths (branches, loops).

2. **Dataflow Analysis**: A fixpoint algorithm propagates dependency information through the graph. For each variable at each program point, the algorithm computes which locations could influence that variable.

3. **Slice Extraction**: Given a cursor position, the tool extracts the relevant dependency set and maps program locations back to source code ranges for highlighting.

The result is interactive: click on any variable, and SharpFocus highlights its complete dependency chain.

### Solving Real Problems

The value of program slicing becomes clear when applied to actual development tasks.

#### Debugging: Finding the Source of Bad Data

A service returns incorrect results. The bug is subtle—a calculation uses stale cached data instead of fresh values. Debugging confirms the symptom but tracing through five method calls to find where the cache was populated is tedious.

With SharpFocus, place the cursor on the variable holding the incorrect result and trigger a backward slice. The slice highlights the entire dependency chain: the cache read, the cache write, the database query that populated it, and the configuration flag that controls cache behavior. The bug becomes obvious—the cache invalidation logic has a flaw.

The slice eliminated irrelevant code from consideration. Instead of reading hundreds of lines, the developer examines only the dozen statements in the dependency chain.

#### Refactoring: Assessing Impact

A method signature needs to change—a parameter type must be generalized from `string` to `IFormattable`. How many call sites need updates? Find All References lists 47 locations. But which of those actually use the parameter's string-specific methods? Which can accept the more general type without modification?

Forward slicing from the parameter declaration reveals the answer. The slice shows exactly which statements depend on string-specific behavior. In one migration we ran, only 8 of the 47 references actually called string-only APIs; the remaining 39 simply passed the parameter along or relied on members exposed by `IFormattable`.

This precision reduces refactoring time and risk. The developer knows exactly what to test.

#### Code Review: Understanding Changes

A pull request modifies a critical business rule. The diff shows three changed lines in a 300-line class. What's the actual impact?

Applying Focus Mode to the changed variables reveals the complete picture. The tool highlights every statement that feeds data into the change (backward dependencies) and every statement affected by the change (forward dependencies). The reviewer sees that the modification impacts two validation checks and one logging call. The review focuses on those specific interactions rather than the entire class.


### The Slice Boundary Problem

Not all dependencies are simple assignments. Consider:

```csharp
void UpdateStatus(Order order)
{
    if (order.Total > 1000)  // Control dependency
    {
        order.Status = OrderStatus.RequiresApproval;
    }
}
```

The assignment `order.Status = OrderStatus.RequiresApproval` depends on the condition `order.Total > 1000`. Even though `order.Total` doesn't directly appear in the assignment, its value controls whether the assignment executes. This is a **control dependency**.

SharpFocus identifies control dependencies and includes them in slices. A backward slice from `order.Status` includes both the assignment and the condition that guards it.

Another complexity arises with aliasing. When multiple variables reference the same object, modifications through one variable affect the value visible through another:

```csharp
var order1 = GetOrder(123);
var order2 = order1;  // Alias created
order2.Status = OrderStatus.Shipped;
ProcessOrder(order1);  // Uses the modified status
```

The modification `order2.Status = OrderStatus.Shipped` affects `order1` because both variables reference the same object. A forward slice from `order2` must include uses of `order1`.

Handling aliasing correctly is essential for accurate slicing. SharpFocus analyzes reference relationships to track these dependencies.

### Summary

Program slicing solves the dependency problem by computing semantic relationships between code statements. It answers questions that text search and debugging cannot: What caused this value? What will this change affect?

SharpFocus brings this capability to C# development through Visual Studio Code integration. The tool builds on established research in static analysis, implementing algorithms for control flow analysis, dependency tracking, and alias reasoning.

**Next in this series:** [Part 2: The Analysis Engine](/posts/part2-core-technology/) examines the technical implementation: how control flow graphs are constructed, how dependency information propagates, and how the analysis handles complex language features.

---
