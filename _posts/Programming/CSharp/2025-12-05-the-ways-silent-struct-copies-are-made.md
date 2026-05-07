---
layout: post
title: The ways silent struct copies are made
date: 2026-05-01 14:11:31 +05:30
categories: [Programming, CSharp]
tags: [c#, programming]
---

Consider a mutable struct with a single property and a method that increments it:

```csharp
internal struct Mutable
{
    public Mutable(int x) : this() { X = x; }

    public int IncrementX()
    {
        X++;
        return X;
    }

    public int X { get; private set; }
}
```

And a class that holds three copies of it. One as a property, one as a readonly field, and one as a plain field.

```csharp
internal class A
{
    public readonly Mutable ReadonlyMutable;
    public Mutable FieldMutable;
    public Mutable PropertyMutable { get; }

    public A()
    {
        PropertyMutable  = new Mutable(1);
        ReadonlyMutable  = new Mutable(1);
        FieldMutable     = new Mutable(1);
    }
}
```

Now call `IncrementX()` twice through each accessor:

```csharp
A a = new A();

Console.WriteLine(a.PropertyMutable.IncrementX());   // 2
Console.WriteLine(a.PropertyMutable.IncrementX());   // 2  ← not 3

Console.WriteLine(a.ReadonlyMutable.IncrementX());   // 2
Console.WriteLine(a.ReadonlyMutable.IncrementX());   // 2  ← not 3

Console.WriteLine(a.FieldMutable.IncrementX());      // 2
Console.WriteLine(a.FieldMutable.IncrementX());      // 3  ← accumulates
```

The property and readonly field both print `2` twice. The plain field prints `2` then `3`. The mutations in the first two cases vanish.

---

## What a method call on a struct actually needs

When you call an instance method on a struct, the runtime needs a managed pointer to the struct's storage, which is a `this` reference that points somewhere the method can actually write to. The question the compiler has to answer is: *where does that pointer come from?*

The answer depends on the accessor.

---

## The property case

A property getter is a method. It returns the struct **by value**, meaning the struct is pushed onto the evaluation stack as a copy. Look at the IL.

```cil
callvirt  instance valuetype Mutable A::get_PropertyMutable()
stloc.1   // store into local variable V_1
ldloca.s  V_1
call      instance int32 Mutable::IncrementX()
```

The getter runs and returns a copy. That copy is stored in a throwaway local `V_1`. Then `ldloca.s V_1` takes the *address of that local* and hands it to `IncrementX` as `this`. The method mutates `V_1`. The actual backing field inside `a` is never touched.

The second call is identical. The getter runs again, produces a copy from the unchanged backing field, and `IncrementX` increments the copy. That is why you see `2` twice.

---

## The readonly field case

One might expect the compiler to do something different here, since a field access is not a method call. But again look at the IL.

```cil
ldfld    valuetype Mutable A::ReadonlyMutable
stloc.1  // store into local variable V_1
ldloca.s V_1
call     instance int32 Mutable::IncrementX()
```

The instruction `ldfld` (load field value) copies the field's value onto the evaluation stack. The rest of the pattern is the same: store into a local, take the local's address and call the method on the copy.

`ReadonlyMutable` is marked `initonly` in the IL. Handing out a direct pointer to a readonly field would let any method mutate it from the inside, which would silently defeat the `readonly` guarantee without the compiler or the caller knowing. So the compiler makes a defensive copy for every call.

The behavior is the same as the property case. Both calls print `2`.

---

## The plain field case

Now look at the plain field:

```cil
ldflda   valuetype Mutable A::FieldMutable
call     instance int32 Mutable::IncrementX()
```

The instruction is `ldflda` (load field address). No copy. No local. The compiler pushes a managed pointer directly to `FieldMutable`'s storage location inside the heap object `a`, and that pointer becomes `this` in `IncrementX`. The method mutates the actual field.

First call: X goes from 1 to 2, prints `2`. Second call: same field, X goes from 2 to 3, prints `3`. Mutations accumulate because there is no copy between the caller and the field.

---

## The mental model

Whenever you access a struct member through some accessor, ask yourself: does this accessor hand me an address or a copy?

 - A property getter always hands you a copy because it is a method, and methods return by value. 
 - A `readonly` field always hands you a copy. Per the C# language specification, when a readonly member invokes a non-readonly member, the structure referred to by `this` must be copied to produce a writable reference [[ECMA C# Language Spec — Structs](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/structs)].

If you see `ldfld` in the IL, think *copy*, and know that mutations die with the local. `ldfld` pushes the value of a field onto the stack, producing a copy [[ECMA-335, §III.4.10](https://ecma-international.org/publications-and-standards/standards/ecma-335/)]. If you see `ldflda`, think *reference*. It pushes the address of the field and know mutations persist [[ECMA-335, §III.4.11](https://ecma-international.org/publications-and-standards/standards/ecma-335/)].

The safest conclusion is the one the C# documentation has long held: **structs should be immutable**. The Microsoft docs on structure types note that marking a struct `readonly` lets the compiler make use of the modifier for performance optimizations by skipping defensive copies [[Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct)]. The `readonly` keyword reference explains that, value types directly contain their data, a field that is a readonly value type is immutable, and the compiler enforces that immutability by copying the value before any member call that might mutate it [[Microsoft Learn: readonly keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/readonly)].

If a struct has no mutable state, the distinction between a copy and a reference becomes meaningless. A defensive copy of an immutable struct is indistinguishable from the original.

> Make your structs immutable.
{: .prompt-tip }

---

## Extra - The collection case: List vs array


```csharp
var list = new List<Customer> { new Customer(age: 5) };
list[0].IncrementAge();
Console.WriteLine(list[0].Age); // still 5, mutation lost

var array = new Customer[] { new Customer(age: 5) };
array[0].IncrementAge();
Console.WriteLine(array[0].Age); // 6, mutation kept
```

The `List<T>` indexer getter is a method. It returns `T` by value, so accessing `list[0]` is same as the property case. A copy lands in a local, `IncrementAge` mutates the copy, and the list element is untouched.

```il
ldloc.0      // list
ldc.i4.0
callvirt     instance !0 class List`1<Customer>::get_Item(int32)
stloc.2      // V_2
ldloca.s     V_2
call         instance int32 Customer::IncrementAge()
pop
```

`IncrementAge` mutates `V_2`. The element inside the list is never touched. When the "Modified Age" `WriteLine` call then fetches `list[0]` again, it gets yet another fresh copy of the original unchanged element and prints `5`.

For the array case, the compiler emits a different instruction `ldelema`, load element address, which pushes a managed pointer directly into the array's heap storage.
 
```il
ldloc.1      // 'array'
ldc.i4.0
ldelema      Customer
call         instance int32 Customer::IncrementAge()
pop
```

`IncrementAge` receives a direct address into the array buffer as `this`, mutates the element in place, and the subsequent `get_Age` call on the same address reads the updated value. The output is `6`.
