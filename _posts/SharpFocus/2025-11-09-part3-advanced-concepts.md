---
layout: post
title: "SharpFocus Part 3: Advanced Analysis Techniques"
description: "Following data flow across method and class boundaries."
date: 2025-11-09 12:00:00 +0530
categories: [SharpFocus]
collection_id: sharpfocus
tags: [csharp, roslyn, ide-extension]
---

Part 3 of 3 in the [SharpFocus](https://github.com/trrahul/SharpFocus) series. Read [Part 1: Understanding Code Through Data Flow](/posts/part1-getting-started/) and [Part 2: The Analysis Engine](/posts/part2-core-technology/) first.

Parts 1 and 2 covered what slicing is and how the engine computes it. This last part is about the harder calls: how the transfer function stays accurate, when I had to trade precision for safety, what trips the analysis up in complex code, and where it gives up entirely.

### The transfer function

The transfer function is the rule for how a single operation changes the dependency information. It takes the dependencies as they stand before the operation and produces the dependencies after it.

For an assignment `target = value`, the basic version is:

```
deps_out(target) = {current_location} ∪ deps_in(value)
```

Complex code asks more of it than that. It also has to handle:

- Multiple input places
- Aliases that share dependencies
- Control dependencies from the conditionals around it
- Weak versus strong updates

#### Strong and weak updates

When a place gets a new value, should the old dependencies be thrown away or kept?

A strong update throws them away. You can do this when the assignment definitely overwrites whatever was there:

```csharp
int x = 10;        // L1: deps(x) = {L1}
x = 20;            // L2: deps(x) = {L2}  // Strong update: L1 is removed
```

A weak update merges the new dependencies with the old. You fall back to this when the assignment might not run, or when an alias means you can't be sure you've covered the only copy:

```csharp
int x = 10;        // L1: deps(x) = {L1}
if (condition)
    x = 20;        // L2: deps(x) = {L1, L2}  // Weak update: L1 is retained
```

The difference is what keeps slices tight. A strong update drops dependencies that no longer apply; a weak update keeps everything when the analysis can't be certain, which is safer but noisier.

Three questions decide which one applies:

1. Is only one memory location affected? If the analysis can prove that, it's a strong update. If aliases mean other places might point at the same thing, it's weak.
2. Does the assignment always run on this path? If yes, strong. If it's behind a condition, weak.
3. Does the assignment write the whole place? Assigning a whole object is a strong update; modifying one field of it is weak.

#### The implementation

The full transfer function is in [DataflowTransferFunction.cs (lines 55-130)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Engine/DataflowTransferFunction.cs#L55-L130).

#### Control dependencies in the transfer function

An operation inside a conditional block depends not only on its inputs but on the condition guarding it:

```csharp
if (user.IsAdmin)              // L1
{
    grant = AccessLevel.Full;  // L2: deps(grant) = {L2, L1}
}
```

The assignment at L2 only runs if `user.IsAdmin` is true, so `grant` depends on both the assignment and the condition.

The computation is in [ControlFlowDependencyAnalyzer.cs (lines 50-90)](https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/ControlFlowDependencyAnalyzer.cs#L50-L90). It's what makes a backward slice include the conditions that decide whether a statement runs, not just the statements that compute the value.

### Following data across methods

Everything so far has stayed inside a single method. But data doesn't respect method boundaries:

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

A forward slice from `_currentOrder` in `LoadOrder` ought to reach L2 and L3, even though they live in other methods. Catching them means looking across methods, not just within one.

#### The modular approach

SharpFocus does this in three steps:

1. Analyze each method on its own, computing dependencies within its boundaries.
2. Build a summary for each method, recording which fields it reads and which it writes.
3. Connect the summaries: when a method touches a field, consult the summaries of the other methods that might have written to it.

For the example above:
- `LoadOrder` summary: writes `_currentOrder`
- `ApplyDiscount` summary: reads and writes `_currentOrder`
- `SaveOrder` summary: reads `_currentOrder`

So a forward slice from `_currentOrder` in `LoadOrder`:
1. Finds the initial write at L1
2. Scans the class for other methods that touch `_currentOrder`
3. Pulls in L2 and L3 based on their summaries

#### Method calls

Within a method, a call to another method creates dependencies:

```csharp
int result = ComputeValue(x, y);  // How does 'result' depend on x and y?
```

Without looking inside `ComputeValue`, the analysis has to assume the worst:
- If `x` or `y` are reference types, they might be modified
- The return value depends on every argument

With a summary, it can do better:

```csharp
[Summary: Pure(reads: arg0, arg1)]
int ComputeValue(int a, int b)
{
    return a + b;
}
```

The `[Pure]` attribute says there are no side effects, so the analysis knows `result` depends only on `x` and `y` and that nothing was modified.

SharpFocus leans on Roslyn's semantic model to spot pure methods:
- Methods marked with the `[Pure]` attribute
- Methods on immutable types
- Simple property getters

Everything else gets the conservative treatment.

### Language features that fight back

Complex C# leans on features that make static analysis harder. Here's how SharpFocus copes with the main ones.

#### Async/await

Async methods hide their control flow:

```csharp
public async Task ProcessAsync()
{
    var data = await FetchDataAsync();  // Suspension point
    ProcessData(data);
}
```

The `await` suspends the method, which resumes later. In between, other code can run and change shared state. Roslyn's CFG models this by adding blocks for the state machine, and SharpFocus walks those like any other control flow, but it has to account for:
- Captured variables in the closure
- Possible changes during the suspension
- The task result as a dependency

#### LINQ

LINQ queries desugar into method chains with lambdas:

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

So the analysis has to:
1. Recognize the lambda captures (`o`)
2. Track dependencies inside the lambda body
3. Carry dependencies from the collection through to the result

SharpFocus treats LINQ as method calls that take lambdas. For each lambda it finds the captured variables, analyzes the body as a nested method, and connects the lambda's dependencies back to the surrounding scope.

#### Properties and indexers

A property can have a real getter and setter:

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

SharpFocus analyzes properties like methods: auto-properties act as fields, custom getters are analyzed when computing backward slices, and custom setters are analyzed when detecting mutations. For `var x = order.Total`, the backward slice reaches not just `_items` but each item's `Price`.

#### Generics

Generic types don't change the dependency analysis, because it works on the structure of the code rather than the concrete type:

```csharp
public T Process<T>(T input) where T : IComparable<T>
{
    return input;
}
```

"result depends on input" holds whatever `T` turns out to be. Constraints might decide which methods are available, and Roslyn's semantic model resolves that.

### Soundness versus precision

Static analysis lives with a basic trade-off.

Soundness means never missing a real dependency: if A might affect B, report it. Precision means avoiding false alarms: don't report a dependency that can't actually happen.

SharpFocus chooses soundness. In practice that means:

- When it's unsure whether two places alias, it assumes they might.
- When it's unsure whether a call mutates, it assumes it does.
- When a method has no summary, it assumes the worst-case effects.

The cost is precision:

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

A backward slice from `first` includes `list.Count > 0`, because that condition controls whether the assignment runs. The count doesn't actually affect the value of `first`, only the element at index 0 does, so a perfectly precise analysis would leave it out. SharpFocus keeps it. You occasionally see a few extra highlighted lines; you never miss one that mattered.

### Keeping it fast

Dataflow analysis isn't cheap. A big method with lots of variables and tangled control flow is real work, and the editor can't stall while it runs. A few things keep it responsive.

#### Caching control flow graphs

Building a CFG off Roslyn's semantic model is one of the more expensive steps, so SharpFocus caches them per method:

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

The cache entry is dropped when the method's source changes, using Roslyn's `SyntaxTree` version as the key.

#### Incremental analysis

When code changes, re-running the whole method is wasteful if only a few lines moved. The idea is to detect which blocks changed, restart the fixpoint from those, and stop once the output matches what was there before. I haven't finished this one; it's a direction more than a feature today.

#### Limiting scope

For very large methods (over 500 lines), the analysis time starts to show, so SharpFocus caps it:

- Maximum CFG size: 1000 blocks
- Maximum fixpoint iterations: 100
- Timeout: 5 seconds per analysis

Past those limits it returns a partial result or an error, rather than freezing the editor on pathological code.

### What it can't do yet

SharpFocus handles common C# well, but there are real gaps:

1. No cross-class analysis. Dependencies stop at the class boundary. A field written in class A and read in class B won't be connected.
2. Limited pointer analysis. Unsafe code with pointers isn't supported; the analysis assumes managed-memory semantics.
3. Conservative method summaries. Without full cross-method analysis, calls are treated conservatively, which over-approximates.
4. No dynamic dispatch resolution. A virtual call assumes the worst, that any override might run. Devirtualization could tighten that.
5. Reflection and dynamic code. Anything using `dynamic` or reflection is opaque to static analysis and gets treated as an unknown effect.

### Where it could go

A few things would push it further:

- Full interprocedural analysis. Build a call graph for the whole assembly and propagate dependencies across method boundaries, which would let field-level analysis cross classes.
- Context-sensitive analysis. Today a method is analyzed once and produces one summary. Telling call sites apart would let it produce a different summary per caller.
- Taint tracking. A security-focused variant that follows untrusted input through the program to sensitive sinks like SQL queries and file writes.
- More precise alias analysis. Field-sensitive and flow-sensitive aliasing would cut false positives; right now, if `x` and `y` alias anywhere, they're treated as aliased everywhere.
- Test-coverage integration. Combine static slicing with runtime coverage, and highlight code that both affects a variable and is exercised by your tests.

### What I learned building it

A few things stuck with me from building this:

1. Roslyn is powerful and large. Getting comfortable with `IOperation` trees, CFGs, and semantic models took real time before any of the analysis worked at all.
2. Soundness costs precision. The conservative approximations are what keep it correct, but they also make the output noisier, and balancing the two never really ends.
3. Caching isn't optional. Without it, every cursor move would re-run the analysis. People notice delays past about 200ms, so the caching is what makes the tool usable in the first place.
4. The edge cases are the job. async, LINQ, and generics turn up constantly in real code. Skip them and you've built something that only works on toy examples.
5. Showing the result matters as much as computing it. Accurate dependencies are useless if the UI doesn't make them clear. Focus Mode's fading is what turns a dependency set into something you can actually read.

The code is all on [GitHub](https://github.com/trrahul/SharpFocus) if you want to see how any of this is wired together.

---
