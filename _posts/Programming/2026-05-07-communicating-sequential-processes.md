---
layout: post
title: Communicating Sequential Processes
description: "How CSP models concurrency as processes talking over channels."
date: 2026-05-07 15:48:02 +05:30
categories: [Programming]
tags: [csharp, go]
---
Writing code that does several things at once is hard, and most of the difficulty comes from one place: the moment two threads can touch the same data, you have to make sure they don't trip over each other. CSP, short for Communicating Sequential Processes, is an old answer to that problem. Instead of letting threads share data and guarding it with locks, you keep each thread's data to itself and have the threads talk by sending messages down a pipe.

Tony Hoare wrote the idea up in a [1978 paper](https://dl.acm.org/doi/10.1145/359576.359585) in Communications of the ACM. If you've written any Go, you've already used it: goroutines and channels are CSP. It also turns up in C#'s `System.Threading.Channels` and in Kotlin's coroutines. Go inherited it through a line of Bell Labs languages, Newsqueak, Alef, and Limbo, which Russ Cox walks through in [Bell Labs and CSP Threads](https://swtch.com/~rsc/thread/).

## The trouble with shared memory

The usual way to share data between threads is to put it in a variable both can reach, then wrap a lock around it so only one thread uses it at a time. A lock is a flag a thread has to claim before touching the data and release when it's done; anyone else who wants it has to wait. This works, but it brings a set of problems you can't fully discipline your way out of.

The first is lock ordering. If a thread needs two locks, it has to take them in a consistent order, or you get a deadlock: thread 1 holds lock A and waits for B, thread 2 holds B and waits for A, and now both wait forever. The trouble is that "consistent order" is a property of the whole program, not of any single piece of it. Two modules can each take their locks in a perfectly sensible order on their own and still deadlock when you run them together, because the two orders don't line up. You can't catch that by reading either module by itself.

The second is granularity, and it's a real bind. One big lock around everything is easy to think about, but it forces operations to run one at a time even when they'd never have collided. Lots of small locks let more run in parallel, but now there are far more orderings to keep straight, spread across the codebase. No setting is both easy to reason about and fast.

Underneath both is the deeper issue: the number of ways your threads can interleave grows explosively as you add threads and shared variables. Your tests only ever exercise a handful of those orderings. The one that breaks tends to show up only under some production load you never reproduced, which is why concurrency bugs are famous for never repro-ing on your own machine.

## Message passing

CSP avoids all of this by not sharing the data in the first place. Each process (a goroutine, in Go) runs ordinary top-to-bottom code over its own private data. When two processes need to coordinate, they don't reach into each other's memory; they send a message through a channel, which is a typed pipe that's safe for two threads to use at once.

The mental model is ownership. When process A sends a value into a channel, it hands that value off and stops using it. Process B receives it and takes over. At any moment exactly one process owns a given piece of data, so there's nothing for a lock to protect. The whole category of problem from the last section just doesn't come up.

Rob Pike sums it up in the [Go Proverbs](https://go-proverbs.github.io/): "Do not communicate by sharing memory; instead, share memory by communicating."

Here it is in Go. The `go` keyword starts a goroutine, `ch <- x` sends a value, and `<-ch` receives one, blocking until something arrives:

```go
ch := make(chan int)

go func() {
    ch <- compute()
}()

result := <-ch
```

The same thing in C#, using `System.Threading.Channels`:

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

In Hoare's original model, a channel is a handoff with no slack. A send waits until someone is ready to receive, and a receive waits until someone sends. The two sides meet at the same instant before either moves on. Go calls this an unbuffered channel.

A buffered channel loosens that. You give the channel room to hold a few values, and the sender can keep dropping values in without waiting, right up until the buffer is full; only then does it block. The [Go spec](https://go.dev/ref/spec#Channel_types) defines the capacity as how many values the channel can hold while no receiver is waiting.

```go
ch := make(chan int)      // sender blocks until receiver is ready
ch := make(chan int, 100) // sender can push up to 100 items before blocking
```

A buffer is handy for soaking up bursts, so a fast producer doesn't stall on a consumer that's briefly busy. But watch what happens when the producer is simply faster than the consumer for a sustained stretch: the buffer fills, and the sender blocks. That blocking is exactly what you want. It's backpressure, the producer being held to the rate the consumer can keep up with, instead of a queue that grows without limit until you run out of memory.

## Waiting on more than one channel

Often a process has to wait on more than one channel at a time: the next job to do, say, or a signal to shut down. Go's `select` waits on several channels together and runs whichever one is ready first:

```go
select {
case msg := <-jobCh:
    process(msg)
case <-done:
    return
}
```

C# has no direct equivalent. You usually thread a `CancellationToken` through the reader to handle the shutdown case, and reach for `Task.WhenAny` when you genuinely need to wait on several sources at once.

## CSP vs. the Actor model

CSP isn't the only message-passing model. Erlang and Akka are built on the Actor model, which looks similar at a glance but differs in one specific way: what has a name and an address.

With actors, the actors themselves are the addressable thing. Each actor has a mailbox, and to send it a message you need a reference to that particular actor. The sender always knows exactly who it's talking to.

In CSP it's the channels that are named, not the processes. Process A writes to a channel and has no idea what's reading from the other end. It might be one consumer, a pool of workers sharing the load, or a fan-out to several downstream stages. From the producer's side they all look the same: it just writes to the channel.

That difference matters for building pipelines. Because the producer never names its consumer, you can add more consumers, point the channel somewhere else, or swap in a different implementation without changing a line of the producer. In the Actor model the sender holds a reference, so the same change means updating who points at whom.

So the two suit different jobs. Actors fit when the identity of the other party is the point: a stateful agent you keep talking to, one actor per connection, a supervision tree where a parent restarts its children. Channels fit pipelines, where the producer has no business knowing what the downstream looks like.

## Pipeline composition

Because the processes are anonymous and the channels are the interface between them, you can snap stages together like building blocks, and no stage is tied to its neighbors:

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

Each stage takes a channel in and returns a channel out, so you can test it on its own by feeding it a channel and reading what comes back. The wiring at the bottom is right there in plain sight, and no stage knows anything about the ones around it. If this looks familiar, it's the same shape as Unix pipes, `ingest | parse | validate`, each program reading from the one before and writing to the next.

## Where this breaks down

CSP isn't magic, and it has its own failure modes. Channels can still deadlock: if A is waiting to receive from B while B is waiting to receive from A, you're stuck, exactly like a lock cycle. The model makes this rarer and easier to spot, but it doesn't rule it out.

It's also the wrong tool sometimes. If what you really have is one piece of state that many things read and write at random, forcing every access through a channel just rebuilds a lock with extra steps and scheduling overhead piled on top. A plain `sync.Mutex` or `sync.Map` is simpler and faster when there's no real producer-and-consumer shape to the access.

And channels aren't free. Every send or receive that blocks goes through the Go scheduler, and at high message rates that adds up. Sending messages in batches instead of one at a time trades a little latency for a lot of throughput, but measure it before you assume the channel is your bottleneck.

## Ownership as the model

What you get from CSP is that ownership of data becomes something you can see in the code. The questions that made shared memory hard, what order to take locks in, how coarse to make them, how many interleavings you'd have to test, simply stop coming up. You trade them for a smaller and more visible set: channel overhead, the occasional cycle, and being deliberate about where ownership changes hands.
