---
layout: post
title: Communicating Sequential Processes
date: 2026-05-07 15:48:02 +05:30
categories: [Programming]
tags: []
---
Tony Hoare formalized CSP in a [1978 paper](https://dl.acm.org/doi/10.1145/359576.359585) published in Communications of the ACM. The model shows up in Go's goroutines and channels, in C#'s `System.Threading.Channels`, and in Kotlin's coroutines. Go's concurrency design traces directly to it, through a lineage of Bell Labs languages (Newsqueak, Alef, Limbo) that Russ Cox traces in [Bell Labs and CSP Threads](https://swtch.com/~rsc/thread/). The premise: build concurrent programs from isolated sequential processes that communicate through channels, not shared state.

## Shared memory

When threads communicate through shared variables, you need to protect them. Locks work, but they introduce problems that careful programming doesn't fully solve.

Lock ordering is a global invariant. Two modules that each acquire locks in a locally consistent order can deadlock when composed, because the combined ordering may not be consistent. You can't verify this by reading either module in isolation.

Lock granularity is its own tradeoff. Coarser locks are easier to reason about but serialize operations that could run concurrently. Finer locks improve throughput but multiply the ordering constraints you have to track across the codebase.

Neither approach scales well as a reasoning problem. With N threads and M shared variables, the number of valid execution interleavings grows fast enough that test coverage provides limited guarantees. Some orderings only surface under specific production load patterns.

## Message passing

CSP sidesteps shared state entirely. Each process runs sequential code against private data. Processes communicate by passing messages through channels: typed, thread-safe pipes.

When Process A sends a value into a channel, ownership transfers. A stops touching it. B pulls it out and takes over. Because only one process holds any given piece of data at a time, there is nothing to protect.

Rob Pike's [Go Proverbs](https://go-proverbs.github.io/) distills this: "Do not communicate by sharing memory; instead, share memory by communicating."

```go
ch := make(chan int)

go func() {
    ch <- compute()
}()

result := <-ch
```

C# with `System.Threading.Channels`:

```csharp
var channel = Channel.CreateUnbounded<WorkItem>();

_ = Task.Run(async () => {
    await channel.Writer.WriteAsync(new WorkItem(payload));
    channel.Writer.Complete();
});

await foreach (var item in channel.Reader.ReadAllAsync())
{
    await ProcessAsync(item);
}
```

## Synchronous and buffered channels

Hoare's original model was strictly synchronous. A send blocks until a receiver is ready; a receive blocks until a sender sends. Both parties rendezvous before either continues.

Buffered channels relax this. The sender can write ahead of the receiver, blocking only when the internal queue is full. The [Go spec](https://go.dev/ref/spec#Channel_types) defines the capacity as the number of elements a channel can hold without a corresponding receiver being ready.

```go
ch := make(chan int)      // sender blocks until receiver is ready
ch := make(chan int, 100) // sender can push up to 100 items before blocking
```

A buffer absorbs burst production without stalling the producer. When production consistently outpaces consumption, the queue fills and the sender blocks. That's the correct behavior: backpressure at the source rather than unbounded queue growth.

## Multiplexing

`select` blocks on multiple channels simultaneously and proceeds on whichever becomes ready first:

```go
select {
case msg := <-jobCh:
    process(msg)
case <-done:
    return
}
```

C# handles the same with a `CancellationToken` threaded through the reader, or `Task.WhenAny` for more complex fan-in cases.

## CSP vs. the Actor model

Erlang and Akka use the Actor model. The distinction from CSP is in what gets named.

In the Actor model, actors are the named entities. You send a message to Actor B's mailbox; the sender holds a reference to the target.

In CSP, channels are the named entities. Process A writes to Channel X without knowing what's on the other end: a single consumer, a worker pool, or a fan-out to multiple downstream stages. All look identical to the producer.

That decoupling matters for pipelines. You can scale consumers, reroute channels, or swap implementations without touching the producer. In the Actor model, that requires updating references.

Actors fit when the identity of the communicating party matters: per-connection state, stateful agents, supervision hierarchies. Channels fit for pipelines where the producer has no business knowing its downstream topology.

## Pipeline composition

Because processes are anonymous and channels are the interfaces, stages compose without coupling to each other:

```go
func parse(raw <-chan []byte) <-chan Record {
    out := make(chan Record)
    go func() {
        for data := range raw {
            out <- parseRecord(data)
        }
        close(out)
    }()
    return out
}

func validate(records <-chan Record) <-chan Record {
    out := make(chan Record)
    go func() {
        for r := range records {
            if r.Valid() {
                out <- r
            }
        }
        close(out)
    }()
    return out
}

raw    := ingest(source)
parsed := parse(raw)
valid  := validate(parsed)
```

Each stage is independently testable. The wiring is explicit; each stage knows nothing about its neighbors. The structure is the same as Unix pipes.

## Where this breaks down

Channel cycles cause deadlocks the same way lock cycles do. The model makes this structurally less common, but not impossible.

For genuinely shared mutable state, a channel-per-access often just wraps mutex semantics with additional scheduling overhead. A `sync.Mutex` or `sync.Map` is simpler and faster for plain read/write access patterns where producer/consumer structure doesn't apply.

At high message volume, channel overhead matters. Each blocking operation goes through the Go runtime scheduler. Batching messages trades latency for throughput; worth measuring before assuming it's a non-issue.

## Ownership as the model

The practical value of CSP is that it makes ownership explicit. Lock ordering, lock granularity, and the combinatorial state space of thread interleavings stop being things you reason about. The tradeoffs shift: channel overhead, deadlock through cycles, and thinking carefully about where ownership transfers.

When data moves through the system rather than sitting in shared memory, the concurrent behaviour of a system is something you can trace. That's something worth paying attention to.
