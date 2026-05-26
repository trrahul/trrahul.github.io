---
layout: post
title: The ways silent struct copies are made
description: "Where C# copies structs."
date: 2026-05-01 14:11:31 +05:30
categories: [Programming, CSharp]
tags: [csharp, programming]
---

In C#, a struct is a value type: assign it somewhere, pass it to a method, or return it from a property, and you're holding a copy, not the original. Most of the time that's fine. But put a mutable struct behind the wrong kind of accessor and you get a bug that looks impossible. You call a method that plainly increments a field, twice, and the value just doesn't change.

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

And a class that holds three copies of it: one as a property, one as a readonly field, one as a plain field.

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

Now call `IncrementX()` twice through each one:

```csharp
A a = new A();

Console.WriteLine(a.PropertyMutable.IncrementX());   // 2
Console.WriteLine(a.PropertyMutable.IncrementX());   // 2  ← not 3

Console.WriteLine(a.ReadonlyMutable.IncrementX());   // 2
Console.WriteLine(a.ReadonlyMutable.IncrementX());   // 2  ← not 3

Console.WriteLine(a.FieldMutable.IncrementX());      // 2
Console.WriteLine(a.FieldMutable.IncrementX());      // 3  ← accumulates
```

The property and the readonly field both print `2` twice. The plain field prints `2`, then `3`. In the first two cases the mutations vanish, and the IL shows exactly where they go.

---

## What a method call on a struct actually needs

To run an instance method on a struct, the runtime needs a pointer to where that struct actually lives, so that `this` inside the method points at storage it can write to. Every case below comes down to one question the compiler has to answer for each call: where does that pointer come from? When it points at the real field, your mutation sticks. When it points at a throwaway copy, your mutation dies with the copy.

The answer depends on the accessor, and the three cases compile to different IL. (IL is the stack-based intermediate language the C# compiler emits before anything becomes machine code; reading it is the clearest way to see what's really happening.) The whole difference between a vanished mutation and a real one is a single instruction.

---

## The property case

A property getter is just a method, and a method hands back a struct by value: it pushes a copy onto the stack, not a reference to the original. Here's the IL for `a.PropertyMutable.IncrementX()`:

```cil
callvirt  instance valuetype Mutable A::get_PropertyMutable()
stloc.1   // store into local variable V_1
ldloca.s  V_1
call      instance int32 Mutable::IncrementX()
```

Read it top to bottom. The getter runs and returns a copy. That copy goes into a throwaway local the compiler calls `V_1`. Then `ldloca.s V_1` takes the address of that local and passes it to `IncrementX` as `this`. So the method faithfully increments `V_1`, and the backing field inside `a` is never touched.

The second call is identical. The getter runs again, produces a fresh copy from the unchanged backing field, and `IncrementX` increments that copy. That's why you see `2` twice.

---

## The readonly field case

You might expect a field to behave differently, since reading a field isn't a method call. It doesn't. Here's the IL:

```cil
ldfld    valuetype Mutable A::ReadonlyMutable
stloc.1  // store into local variable V_1
ldloca.s V_1
call     instance int32 Mutable::IncrementX()
```

The instruction `ldfld` (load field value) copies the field's value onto the stack. From there the pattern is the same as before: store into a local, take the local's address, call the method on the copy.

The reason is the `readonly`. In the IL the field is marked `initonly`. If the compiler handed `IncrementX` a direct pointer to it, the method could quietly mutate a field you promised wouldn't change, defeating `readonly` from the inside without the compiler or the caller knowing. So it makes what's called a defensive copy before every call, which lands you right back in the property case for a different reason. Both calls print `2`.

---

## The plain field case

Now the plain field:

```cil
ldflda   valuetype Mutable A::FieldMutable
call     instance int32 Mutable::IncrementX()
```

One instruction, `ldflda` (load field address), and that's the whole difference. No copy, no local. It pushes a pointer straight to `FieldMutable`'s storage inside the heap object `a`, and that pointer becomes `this`. So `IncrementX` mutates the real field.

First call: X goes 1 to 2, prints `2`. Second call: same field, X goes 2 to 3, prints `3`. The mutations accumulate because nothing sits between the caller and the field.

---

## The mental model

Whenever you reach a struct member through an accessor, ask one thing: does this hand me an address or a copy?

 - A property getter always hands you a copy, because it's a method and methods return by value.
 - A `readonly` field always hands you a copy. Per the C# language specification, when a readonly member invokes a non-readonly member, the struct that `this` refers to must be copied to produce a writable reference [[ECMA C# Language Spec: Structs](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/structs)].

If you see `ldfld` in the IL, think copy, and know the mutation dies with the local. `ldfld` pushes the value of a field onto the stack, producing a copy [[ECMA-335, §III.4.10](https://ecma-international.org/publications-and-standards/standards/ecma-335/)]. If you see `ldflda`, think reference: it pushes the address of the field, so the mutation persists [[ECMA-335, §III.4.11](https://ecma-international.org/publications-and-standards/standards/ecma-335/)].

The safest conclusion is the one the C# docs have held all along: make your structs immutable. The docs on structure types note that marking a struct `readonly` lets the compiler optimize by skipping defensive copies [[Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct)]. The `readonly` keyword reference explains that because value types contain their data directly, a field that is a readonly value type is immutable, and the compiler enforces that by copying the value before any member call that might mutate it [[Microsoft Learn: readonly keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/readonly)].

If a struct has no mutable state, the difference between a copy and a reference stops mattering. A defensive copy of an immutable struct is indistinguishable from the original.

> Make your structs immutable.
{: .prompt-tip }

---

## Extra: the List vs array case

```csharp
var list = new List<Customer> { new Customer(age: 5) };
list[0].IncrementAge();
Console.WriteLine(list[0].Age); // still 5, mutation lost

var array = new Customer[] { new Customer(age: 5) };
array[0].IncrementAge();
Console.WriteLine(array[0].Age); // 6, mutation kept
```

A `List<T>` indexer (`list[0]`) is a method too, `get_Item`, and it returns the element by value. So `list[0]` is the property case all over again: a copy lands in a local, `IncrementAge` mutates the copy, and the element inside the list never moves.

```il
ldloc.0      // list
ldc.i4.0
callvirt     instance !0 class List`1<Customer>::get_Item(int32)
stloc.2      // V_2
ldloca.s     V_2
call         instance int32 Customer::IncrementAge()
pop
```

`IncrementAge` mutates `V_2`, and the element in the list is never touched. When the next `WriteLine` fetches `list[0]` again, it gets yet another fresh copy of the unchanged element, and prints `5`.

An array is different. Indexing it emits `ldelema` (load element address), which pushes a pointer straight into the array's heap storage.

```il
ldloc.1      // 'array'
ldc.i4.0
ldelema      Customer
call         instance int32 Customer::IncrementAge()
pop
```

`IncrementAge` gets a direct address into the array's buffer as `this`, mutates the element in place, and reading `array[0].Age` afterward sees the update. Output: `6`. Same code shape, opposite result, because the array hands out an address and the list hands out a copy.
