---
layout: post
title: "SharpFocus Part 3: Advanced Analysis Techniques"
date: 2025-11-09 12:00:00 +0530
categories: [SharpFocus]
tags: [csharp, roslyn, static-analysis, transfer-functions, interprocedural]
---

**Part 3 of 3** in the [SharpFocus](https://github.com/trrahul/SharpFocus) series. Read [Part 1: Understanding Code Through Data Flow](/posts/part1-getting-started/) and [Part 2: The Analysis Engine](/posts/part2-core-technology/) first.

The previous articles introduced program slicing and examined the core analysis techniques. This final article explores advanced topics: how transfer functions propagate dependencies accurately, when precision must be traded for soundness, and what challenges arise in analyzing real codebases.

### The Transfer Function: Heart of the Analysis

The transfer function determines how each operation affects dependency information. It takes an input state (dependencies before the operation) and produces an output state (dependencies after the operation).

For an assignment `target = value`, the basic transfer function:

```
deps_out(target) = {current_location} ∪ deps_in(value)
```

But real code is more complex. The transfer function must handle:
- Multiple input places
- Aliases that share dependencies
- Control dependencies from surrounding conditionals
- Weak vs. strong updates

#### Strong Updates vs. Weak Updates

When a place is assigned a new value, should the old dependencies be discarded or retained?

**Strong Update**: Replace all dependencies. Used when the assignment definitely overwrites the previous value:

```csharp
int x = 10;        // L1: deps(x) = {L1}
x = 20;            // L2: deps(x) = {L2}  // Strong update: L1 is removed
```

**Weak Update**: Merge with existing dependencies. Used when the assignment might not happen or when aliases exist:

```csharp
int x = 10;        // L1: deps(x) = {L1}
if (condition)
    x = 20;        // L2: deps(x) = {L1, L2}  // Weak update: L1 is retained
```

The distinction matters for precision. Strong updates eliminate irrelevant dependencies. Weak updates maintain soundness when certainty is impossible.

The decision criteria:

1. **Unique Place**: Can the analysis prove only one memory location is affected? If yes, strong update. If aliases exist, weak update.

2. **Definite Execution**: Does the assignment always execute along this path? If yes, strong update. If conditional, weak update.

3. **Complete Coverage**: Does the assignment write all components of a structured place? If yes (e.g., assigning a whole object), strong update. If partial (e.g., modifying one field), weak update.

#### Implementing the Transfer Function

**See:** [DataflowTransferFunction.cs (lines 55-130)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Engine/DataflowTransferFunction.cs#L55-L130) for the complete transfer function implementation.

#### Control Dependencies in the Transfer Function

Operations inside conditional blocks depend not only on their inputs but also on the condition that guards them:

```csharp
if (user.IsAdmin)              // L1
{
    grant = AccessLevel.Full;  // L2: deps(grant) = {L2, L1}
}
```

The assignment at L2 only executes if `user.IsAdmin` is true. Therefore, `grant` depends on both the assignment itself and the condition.

**See:** [ControlFlowDependencyAnalyzer.cs (lines 50-90)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/ControlFlowDependencyAnalyzer.cs#L50-L90) for control dependency computation.

This ensures that backward slices include the conditions that determine whether a statement executes.

### Interprocedural Analysis

Most analysis so far has been intraprocedural, confined to a single method. But dependencies often cross method boundaries:

```csharp
public class OrderService
{
    private Order _currentOrder;
    
    public void LoadOrder(int id)
    {
        _currentOrder = FetchFromDatabase(id);  // L1
    }
    
    public void ApplyDiscount()
    {
        _currentOrder.Total *= 0.9m;             // L2
    }
    
    public void SaveOrder()
    {
        WriteToDatabse(_currentOrder);           // L3
    }
}
```

A forward slice from `_currentOrder` in `LoadOrder` should include both L2 and L3, which occur in different methods. This requires interprocedural analysis.

#### The Modular Strategy

SharpFocus adopts a modular approach:

1. **Analyze each method independently**: Compute dependencies within method boundaries.

2. **Build summaries**: For each method, record which fields it reads and writes.

3. **Connect summaries**: When analyzing a method that accesses a field, consult the summaries of other methods that might have written to that field.

For the example above:
- `LoadOrder` summary: writes `_currentOrder`
- `ApplyDiscount` summary: reads and writes `_currentOrder`
- `SaveOrder` summary: reads `_currentOrder`

When computing a forward slice from `_currentOrder` in `LoadOrder`, the analysis:
1. Finds the initial write at L1
2. Scans the class for other methods accessing `_currentOrder`
3. Includes L2 and L3 based on the summaries

#### Handling Method Calls

Within a method, calls to other methods create dependencies:

```csharp
int result = ComputeValue(x, y);  // How does 'result' depend on x and y?
```

Without inspecting `ComputeValue`, the analysis must conservatively assume:
- If `x` or `y` are reference types, they might be modified
- The return value depends on all arguments

With summary information, the analysis can be precise:

```csharp
[Summary: Pure(reads: arg0, arg1)]
int ComputeValue(int a, int b)
{
    return a + b;
}
```

The `[Pure]` attribute indicates no side effects. The analysis knows `result` depends only on `x` and `y`, with no modifications.

SharpFocus uses Roslyn's semantic model to identify pure methods:
- Methods marked `[Pure]` attribute
- Methods on immutable types
- Simple property getters

For other methods, the analysis applies conservative assumptions.

### Handling Complex Language Features

Real C# code uses features that challenge static analysis.

#### Async/Await

Async methods introduce hidden control flow:

```csharp
public async Task ProcessAsync()
{
    var data = await FetchDataAsync();  // Suspension point
    ProcessData(data);
}
```

The `await` expression suspends execution, and the method resumes later. Between suspension and resumption, other code might execute, potentially modifying shared state.

Roslyn's CFG models async control flow by creating additional blocks for the state machine. SharpFocus processes these blocks like normal control flow, but must account for:
- Captured variables in the closure
- Potential modifications during suspension
- Task results as dependencies

#### LINQ Query Expressions

LINQ queries desugar to method chains with lambdas:

```csharp
var result = orders
    .Where(o => o.Total > 100)
    .Select(o => o.CustomerId);
```

Desugars to:

```csharp
var result = orders
    .Where(new Func<Order, bool>(o => o.Total > 100))
    .Select(new Func<Order, int>(o => o.CustomerId));
```

The analysis must:
1. Recognize the lambda captures (`o`)
2. Track dependencies within the lambda body
3. Propagate dependencies from the collection to the result

SharpFocus treats LINQ as method calls with lambda parameters. The lambda analysis:
- Identifies captured variables
- Analyzes the lambda body as a nested method
- Connects lambda dependencies to the outer scope

#### Properties and Indexers

Properties can have complex getter and setter bodies:

```csharp
public int Total
{
    get => _items.Sum(i => i.Price);
    set
    {
        if (value < 0)
            throw new ArgumentException();
        _total = value;
    }
}
```

SharpFocus analyzes properties like methods:
- Auto-properties are treated as fields
- Custom getters are analyzed when computing backward slices
- Custom setters are analyzed when detecting mutations

For `var x = order.Total`, the backward slice includes not just `_items` but also each item's `Price` property.

#### Generics and Type Parameters

Generic types don't directly affect dependency analysis because the analysis operates on structure, not concrete types:

```csharp
public T Process<T>(T input) where T : IComparable<T>
{
    return input;
}
```

The dependency `result depends on input` holds regardless of what `T` is. Type constraints might affect which methods are available, but Roslyn's semantic model resolves that.

### The Precision vs. Soundness Trade-off

Static analysis faces a fundamental trade-off:

**Soundness**: Never miss a real dependency. If A might affect B, report it.

**Precision**: Avoid false positives. Don't report dependencies that cannot occur.

SharpFocus prioritizes soundness. This means:

- When uncertain about aliasing, assume places might alias
- When uncertain about mutations, assume they might occur
- When methods lack summaries, assume worst-case effects

The cost is reduced precision:

```csharp
void Example(List<int> list)
{
    if (list.Count > 0)
    {
        var first = list[0];
        Console.WriteLine(first);
    }
}
```

A backward slice from `first` includes `list.Count > 0` because it controls whether the assignment executes. But the count itself doesn't affect the value of `first`, only the element at index 0 matters. A perfectly precise analysis would exclude the count. SharpFocus includes it for soundness.

This conservative approach ensures developers don't miss important dependencies, at the cost of occasionally highlighting extra code.

### Performance Optimization

Dataflow analysis can be expensive. Large methods with many variables and complex control flow require significant computation. SharpFocus employs several optimizations.

#### Caching Control Flow Graphs

Building a CFG from Roslyn's semantic model is costly. SharpFocus caches CFGs per method:

```csharp
public class CFGCache
{
    private Dictionary<IMethodSymbol, ControlFlowGraph> cache;
    
    public ControlFlowGraph GetOrBuild(IMethodSymbol method)
    {
        if (cache.TryGetValue(method, out var cached))
            return cached;
        
        var cfg = BuildCFG(method);
        cache[method] = cfg;
        return cfg;
    }
}
```

Cache invalidation occurs when the method's source changes. Roslyn's `SyntaxTree` version acts as a cache key.

#### Incremental Analysis

When code changes, reanalyzing the entire method is wasteful if only a small portion changed. SharpFocus explores incremental analysis:

1. Detect which blocks in the CFG changed
2. Re-run fixpoint iteration starting from those blocks
3. Stop when the output state matches the previous state

This optimization isn't fully implemented but represents a future direction.

#### Limiting Analysis Scope

For very large methods (>500 lines), analysis time becomes noticeable. SharpFocus applies limits:

- Maximum CFG size: 1000 blocks
- Maximum fixpoint iterations: 100
- Timeout: 5 seconds per analysis

When limits are exceeded, the analysis returns a partial result or an error. This prevents the editor from freezing on pathological code.

### Current Limitations

SharpFocus handles common C# patterns well but has limitations:

1. **No cross-class analysis**: Dependencies stop at class boundaries. A field written in class A and read in class B won't be connected.

2. **Limited pointer analysis**: Unsafe code with pointers is not supported. The analysis assumes managed memory semantics.

3. **Conservative method summaries**: Without interprocedural analysis, method calls are treated conservatively, leading to over-approximation.

4. **No dynamic dispatch resolution**: Virtual method calls assume worst-case: any override might be invoked. Devirtualization could improve precision.

5. **Reflection and dynamic code**: Code using `dynamic` keyword or reflection is opaque to static analysis. These are treated as unknown effects.

### Future Directions

Several enhancements would improve SharpFocus:

**Full Interprocedural Analysis**: Build a call graph for the entire assembly and propagate dependencies across method boundaries. This enables field-level analysis across classes.

**Context-Sensitive Analysis**: Distinguish different call sites. Currently, a method analyzed once produces one summary. Context sensitivity would produce different summaries depending on the caller.

**Taint Tracking**: Specialized analysis for security. Track how untrusted input flows through the program to sensitive sinks (SQL queries, file operations).

**More Precise Alias Analysis**: Field-sensitive and flow-sensitive aliasing would reduce false positives. Currently, if `x` and `y` alias at any point, they're treated as aliases throughout.

**Integration with Test Coverage**: Combine static slicing with dynamic test coverage. Highlight code that affects a variable *and* is exercised by tests.

### Lessons from Implementation

Building SharpFocus revealed insights about static analysis:

1. **Roslyn is powerful but complex**: The API surface is large. Understanding `IOperation` trees, CFGs, and semantic models requires significant investment.

2. **Soundness costs precision**: Conservative approximations are necessary for correctness but produce noisier results. Balancing the two is an ongoing challenge.

3. **Caching is essential**: Without caching, every cursor movement would trigger reanalysis. Users notice delays above 200ms.

4. **Edge cases matter**: Rare language features (async, LINQ, generics) appear frequently in real code. Ignoring them creates a tool that works only on toy examples.

5. **Visualization is as important as analysis**: Accurate dependency computation is useless if the UI doesn't communicate results clearly. Focus Mode's fading strategy makes slices understandable.


---
