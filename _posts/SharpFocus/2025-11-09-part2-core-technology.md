---
layout: post
title: "SharpFocus Part 2: The Analysis Engine"
date: 2025-11-09 11:00:00 +0530
categories: [SharpFocus]
tags: [csharp, roslyn, static-analysis, control-flow, dataflow-analysis]
---

**Part 2 of 3** in the [SharpFocus](https://github.com/trrahul/SharpFocus) series. Read [Part 1: Understanding Code Through Data Flow](/posts/part1-getting-started/) first if you haven't already.

The first article introduced program slicing and demonstrated its applications. This article examines the analysis engine that makes slicing possible: how code is represented internally, how dependencies are computed, and how the analysis handles the complexities of real programming languages.

### Representing Code Structure

Before analyzing code, the tool must represent it in a form suitable for computation. Text is insufficient—the analyzer needs semantic information about declarations, types, control flow, and data dependencies.

SharpFocus uses two representations:

1. **The Semantic Model**: Provided by Roslyn, this structure resolves identifiers to symbols, types to their definitions, and expressions to their computed types. It answers questions like "What variable does this name refer to?" and "What type does this expression produce?"

2. **The Control Flow Graph**: A directed graph where nodes represent basic blocks (sequences of statements with a single entry and single exit) and edges represent possible execution paths.

#### Basic Blocks and Control Flow

Consider this method:

```csharp
int ComputeDiscount(int total, bool isVIP)
{
    int discount = 0;
    
    if (isVIP)
        discount = total * 15 / 100;
    else
        discount = total * 5 / 100;
    
    return discount;
}
```

The control flow graph for this method contains five basic blocks:

```
Block 0 (Entry):
    discount = 0

Block 1 (Condition):
    evaluate: isVIP

Block 2 (Then branch):
    discount = total * 15 / 100

Block 3 (Else branch):
    discount = total * 5 / 100

Block 4 (Exit):
    return discount
```

Edges connect the blocks:
- Block 0 → Block 1
- Block 1 → Block 2 (if isVIP is true)
- Block 1 → Block 3 (if isVIP is false)
- Block 2 → Block 4
- Block 3 → Block 4

<!--
Image Placeholder: A control flow graph diagram showing:
- Five blocks arranged vertically with entry at top
- Conditional branching at Block 1 splitting into two paths
- Both paths merging back at Block 4
- Arrows labeled with conditions
Caption: A control flow graph represents all possible execution paths through a method.
-->

This graph makes control flow explicit. The analyzer can traverse the graph to determine which statements might execute before or after any given point.

Roslyn provides a `ControlFlowGraph` API that constructs these graphs automatically. SharpFocus uses this API but must also track additional information for dependency analysis.

### Places: Representing Memory Locations

A **place** is a symbolic name for a memory location that can be read or written. In C#, places include:

- Local variables: `x`, `result`, `discount`
- Parameters: `total`, `isVIP`
- Fields: `_currentOrder`, `Config.Timeout`
- Properties: `order.Status`, `customer.Address.City`

The analysis operates on a representation called a **Place**—a memory location that can be read or written. A place consists of a base symbol (variable, parameter, field) and an optional access path representing nested field accesses.

{% github_code https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Models/Place.cs 6-36 csharp %}

This representation allows tracking dependencies at fine granularity. When `order.Status` is modified, the analysis knows this affects `order` but not `order.Total`.

Examples:
- Simple variable: `Place { Symbol = "x", AccessPath = [] }`
- Field access: `Place { Symbol = "order", AccessPath = ["Status"] }`
- Nested access: `Place { Symbol = "customer", AccessPath = ["Address", "City"] }`

### The Dependency Lattice

The core data structure is a mapping from places to dependency sets:

{% github_code https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Models/FlowDomain.cs 6-50 csharp %}

A `Location` identifies a specific point in the control flow graph—typically a basic block and statement index.

The `FlowDomain` forms a lattice where:
- The join operation (⊔) is set union
- The ordering (⊑) is the subset relation
- The bottom element (⊥) is the empty domain

This lattice structure enables fixpoint computation, explained in the next section.

### The Dataflow Algorithm

Computing dependencies requires propagating information through the control flow graph until reaching a stable state—a fixpoint where no new dependencies emerge.

{% github_code https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Engine/DataflowEngine.cs 26-65 csharp %}

The algorithm follows this structure:

```
1. Initialize: Create empty FlowDomain for each block
2. Worklist ← all blocks in CFG
3. While worklist is not empty:
     a. Remove block B from worklist
     b. Compute input state by joining predecessor states
     c. Apply transfer function to get output state
     d. If output state changed:
          - Update stored state for B
          - Add all successor blocks to worklist
4. Return final states
```

The transfer function determines how a block's operations affect the dependency information. This is where the actual analysis logic resides.

#### Transfer Function for Assignments

For a simple assignment `x = y + z`, the transfer function:

1. Creates a new location L for this statement
2. Retrieves dependencies of `y` and `z` from the input state
3. Computes dependencies of `x` as {L} ∪ deps(y) ∪ deps(z)
4. Updates the output state with this information

Symbolically:

```
deps_out(x) = {current_location} ∪ deps_in(y) ∪ deps_in(z)
```

For example:

```csharp
int a = 5;        // L1: deps(a) = {L1}
int b = 10;       // L2: deps(b) = {L2}
int c = a + b;    // L3: deps(c) = {L3, L1, L2}
int d = c * 2;    // L4: deps(d) = {L4, L3, L1, L2}
```

At location L4, the dependencies of `d` include L4 itself plus all dependencies inherited from `c`.

#### Handling Branches

At merge points where multiple control flow paths converge, the analysis joins the dependency sets:

```csharp
int x;
if (condition)     // L1
    x = 1;         // L2: deps(x) = {L2, L1}
else
    x = 2;         // L3: deps(x) = {L3, L1}
                   
int y = x;         // L4: deps(x) = {L2, L3, L1} (union of both branches)
                   //      deps(y) = {L4, L2, L3, L1}
```

The condition itself creates a dependency because it controls which assignment executes. This is a control dependency, discussed later.

<!--
Image Placeholder: A flowchart showing:
- State propagation through a conditional branch
- Dependency sets at each program point
- The join operation merging sets after the branch
Caption: Dependency information flows through control structures and merges at join points.
-->

### Alias Analysis

When two variables reference the same object, modifications through one affect the value visible through the other:

```csharp
var order = new Order();
var backup = order;      // 'backup' is an alias for 'order'
order.Status = OrderStatus.Shipped;
Console.WriteLine(backup.Status);  // Prints "Shipped"
```

Accurate dependency tracking requires identifying these aliases. When `order.Status` is modified, a forward slice from `order` must include uses of `backup` because both refer to the same object.

SharpFocus implements a basic alias analysis that tracks:

1. **Direct assignments**: `var y = x` creates an alias relationship
2. **Parameter passing**: Arguments passed to methods create aliases with parameters
3. **Reference parameters**: `ref` and `out` parameters create explicit aliases
4. **Field projection**: If `x` and `y` alias, then `x.Field` and `y.Field` also alias

{% github_code https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/BasicAliasAnalyzer.cs 38-96 csharp %}

When analyzing an assignment `x = y`, the transfer function queries the alias analyzer to propagate dependencies through all aliases.

This conservative approach ensures mutations propagate to all potentially affected places. However, it remains intraprocedural and does not track aliases that emerge through shared collection references—for example, two variables pointing to the same element in a dictionary. In those cases, SharpFocus conservatively assumes any mutation to the collection might affect all places that reference it, preserving soundness at the expense of precision.

### Mutation Detection

Not all operations are simple assignments. C# provides numerous ways to modify state:

- Direct assignment: `x = 5`
- Compound assignment: `x += 5`
- Increment/decrement: `x++`, `--x`
- Method calls on mutable objects: `list.Add(item)`
- Property setters: `order.Status = ...`
- `ref` and `out` parameters: `int.TryParse(input, out result)`

Roslyn's control flow graph lowers many of these to simple assignments. For instance, `x++` becomes `x = x + 1` in the CFG. This simplifies analysis at the cost of losing information about the original syntax.

{% github_code https://github.com/trrahul/SharpFocus/blob/main/src/SharpFocus.Core/Analyzers/RoslynMutationDetector.cs 68-115 csharp %}

For a compound assignment `x += y`, the detector records:
- Target: `x`
- Inputs: `{x, y}` (the result depends on both the old value of `x` and `y`)
- Status: `Definitely`

For a method call `list.Add(item)` where `list` is mutable:
- Target: `list`
- Inputs: `{item}` (and potentially `list` itself)
- Status: `Possibly` (without interprocedural analysis, the exact effects are unknown)

SharpFocus applies heuristics to recognize common pure methods in the Base Class Library—such as `string.ToUpper()` or `Math.Abs()`—and marks them as non-mutating. This prevents pollution of dependency sets by calls that provably produce no side effects. For user-defined methods or lesser-known APIs, the analysis remains conservative and assumes possible mutation unless proven otherwise.

### Control Dependencies

Data dependencies arise from assignments. Control dependencies arise from branching:

```csharp
int result;
if (condition)      // L1
    result = 10;    // L2
else
    result = 20;    // L3

return result;      // L4
```

At location L4, `result` depends not only on locations L2 and L3 (where values are assigned) but also on L1 (which determines which branch executes). This is a control dependency.

SharpFocus computes control dependencies using dominance analysis. A block X controls block Y if every path from the entry to Y passes through X. The algorithm:

1. Compute post-dominators for each block
2. For each branch, identify blocks that are not post-dominated
3. Those blocks are control-dependent on the branch condition

This extends to loops: blocks inside a loop body are control-dependent on the loop condition, and back edges receive special handling to ensure the post-dominator tree correctly captures cyclic control flow. When a block is control-dependent on a condition, the transfer function adds the condition's location to the dependency set of all variables written in that block.

### Intraprocedural vs. Interprocedural Analysis

The analysis must decide its scope. Two strategies exist:

**Intraprocedural**: Analyze one method at a time. Method calls are treated as black boxes that might modify anything reachable through their parameters.

**Interprocedural**: Analyze across method boundaries, potentially inlining or summarizing callees.

SharpFocus uses primarily intraprocedural analysis for performance. When a method call `Foo(x)` appears:

1. If `x` is passed by reference (`ref` or `out`), assume `x` is modified
2. If `x` is a mutable reference type, conservatively assume fields might be modified
3. Add the call site to `x`'s dependency set

This conservative approach may overestimate dependencies but ensures correctness. A mutation might occur inside `Foo` that affects `x`, and the analysis won't miss it.

For critical scenarios, SharpFocus can optionally perform limited interprocedural analysis by:
- Examining the callee's summary (if available)
- Mapping callee effects back to caller places
- Stopping at method boundaries to prevent exponential blowup

### The Complete Pipeline

Combining these components, the analysis pipeline is:

```
Input: Method M, cursor position P

1. Extract place at P using semantic model
2. Build control flow graph for M
3. Initialize flow domain (all places start with empty deps)
4. Run fixpoint iteration:
     For each block in CFG:
       a. Detect mutations in block
       b. Query alias analyzer for affected places
       c. Retrieve dependencies of input places
       d. Update dependencies of output places
       e. Add control dependencies
       f. Propagate to successors
5. Extract fixpoint state for place at P
6. Map locations back to source ranges
7. Return highlighted ranges to editor

Output: Backward slice, forward slice, or focus mode
```

The fixpoint iteration typically converges quickly—within a few passes through the CFG—because C# methods are usually small and dependency chains are short. In practice, most methods stabilize within 2–4 iterations. For methods with deep nesting or complex loops, convergence can take longer, but the algorithm is guaranteed to terminate because the dependency lattice has finite height and the transfer functions are monotonic.

<!--
Image Placeholder: A pipeline diagram showing:
Input (Source Code) → CFG Construction → Alias Analysis → Mutation Detection → Fixpoint Iteration → Slice Extraction → Output (Highlighted Code)
Caption: The analysis pipeline transforms source code into dependency information.
-->

### Handling Language Complexity

Real C# code includes features that complicate analysis:

**Async/Await**: Async methods produce state machines that drastically alter control flow. SharpFocus relies on Roslyn's CFG, which models async control flow correctly, but dependency tracking must account for the fact that `await` expressions introduce suspension points.

**LINQ**: Query expressions desugar to method calls. SharpFocus treats them as method calls, conservatively assuming they might modify captured variables.

**Lambdas and Closures**: Captured variables create aliases between the outer scope and the lambda's scope. SharpFocus tracks these captures through Roslyn's semantic model.

**Properties**: Auto-properties are treated like fields. Custom property getters and setters are analyzed like methods.

**Generics**: Type parameters don't affect dependency analysis—the analysis operates on the structure of code, not on concrete types.

**Pattern Matching and Switch Expressions**: These constructs produce complex lowered CFG shapes with nested branches and temporary variables. Roslyn exposes these structures explicitly, but SharpFocus must carefully track dependencies through the temporaries that represent matched values and guards. Switch expressions in particular introduce multiple decision points that merge into a single output, requiring precise join operations to avoid losing dependencies.

### Example: Complete Analysis

Consider this method:

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

Cursor position: `return rounded` statement.

**CFG Construction**:
```
Block 0: if (order.Total < 100)
Block 1: return 0
Block 2: adjusted = order.Total * (1 - discount)
Block 3: rounded = (int)Math.Round(adjusted)
Block 4: order.ProcessedAmount = rounded
Block 5: return rounded
```

**Mutation Detection**:
- L2: Writes to `adjusted`, reads `order`, `discount`
- L3: Writes to `rounded`, reads `adjusted`
- L4: Writes to `order.ProcessedAmount`, reads `rounded`

**Alias Analysis**:
- No aliases created in this method

**Control Dependencies**:
- Blocks 2-5 are control-dependent on Block 0 (the condition)

**Dependency Computation** (simplified):
```
Block 0: deps(order.Total) = {L0}
Block 2: deps(adjusted) = {L2, L0} (depends on order.Total)
         deps(adjusted) += {discount} (depends on discount parameter)
Block 3: deps(rounded) = {L3, L2, L0, discount}
Block 4: deps(order.ProcessedAmount) = {L4, L3, L2, L0, discount}
Block 5: deps(return value) = {L5, L3, L2, L0, discount}
```

**Backward Slice from `return rounded`**:
- L5: `return rounded`
- L3: `rounded = (int)Math.Round(adjusted)`
- L2: `adjusted = order.Total * (1 - discount)`
- L0: `if (order.Total < 100)` (control dependency)
- Parameter: `discount`

The slice excludes:
- L1: `return 0` (in alternate control path)
- L4: `order.ProcessedAmount = rounded` (doesn't affect return value)

**Forward Slice from `discount`**:
- L2: `adjusted = order.Total * (1 - discount)`
- L3: `rounded = (int)Math.Round(adjusted)`
- L4: `order.ProcessedAmount = rounded`
- L5: `return rounded`

The forward slice shows that modifying `discount` affects the computed result, the field assignment, and the return value.

### Summary

This article examined the core analysis techniques: control flow graphs for representing execution paths, places for representing memory locations, dependency lattices for tracking information flow, and algorithms for computing aliases, mutations, and control dependencies.

**Next in this series:** [Part 3: Advanced Analysis Techniques](/posts/part3-advanced-concepts/) explores advanced topics: how transfer functions handle complex updates, what strategies optimize performance, and what challenges remain in scaling the analysis to large codebases.

---
