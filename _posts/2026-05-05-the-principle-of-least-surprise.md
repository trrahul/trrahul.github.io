---
layout: post
title: The principle of least surprise
description: "Why a system should behave the way its users already expect."
date: 2026-03-05 17:49:51 +05:30
categories: [Design]
tags: []
---

When a tool behaves the way you expect, you stop noticing it. You reach for the thing, it does the thing, and your attention stays on the work. When it doesn't, the opposite happens: you stop trusting it, and you start second-guessing everything else it might do. That is the whole idea behind the Principle of Least Surprise, sometimes called the Principle of Least Astonishment. A system should behave the way the people using it already expect it to.

In practice it asks four things of a design: that it match the mental model people already carry, that similar actions give similar results, that changes in state stay predictable, and that edge cases get handled by some logic rather than by whatever the implementation happened to do.

## Where it works well

The good examples all share one move: the system serves what you meant, and hides its own bookkeeping while doing it.

On Unix, if one program has a file open and another program deletes it, the first program keeps reading and writing without a hitch. The name vanishes from the directory, but the actual data sticks around until nobody is using it anymore. That works because Unix treats the filename as a label pointing at the data, not the data itself, so deleting the label doesn't pull the floor out from under a running program.

`Ctrl+Z` (or `Cmd+Z`) undoes your last change in just about every editor there is. You never have to relearn it for each app. It does one obvious thing, the same way, everywhere.

Close a document with unsaved changes and a well-behaved editor stops to ask whether you want to save first. It knows that closing a window and throwing away your work are two different things, even when one can lead to the other.

In a browser or web app that behaves, the Back button takes you to the page you just came from, usually near the same spot on it. It keeps one simple promise: back means back.

`mkdir -p logs/2026/may` reads as "make sure this whole path exists." The `-p` tells it to create any missing folders along the way and not to complain about the ones that already exist. You said what end state you wanted, and you got it, without having to walk the system through every step.

In most strongly typed languages, `2 + 2` is `4`, and `+` means the same thing every time you use it. The operator doesn't quietly change its mind partway through an expression.

## Where it breaks down

The bad examples fail the same way: they make you care about a detail the system should have swallowed on your behalf.

In JavaScript, `"2" + 2` is `"22"`. The `+` quietly switches from adding numbers to gluing strings together, based on types you may not have meant to mix. It's perfectly consistent with JavaScript's own rules; it just isn't consistent with what anyone expects `+` to do.

On Windows, deleting a file can fail because some other program still has it open. You asked to get rid of a file. The system answers with a locking detail you never asked about and usually can't even see, and now the file is your problem to chase down. This is the same situation Unix quietly absorbs.

A program that quits without asking about unsaved changes has decided, on your behalf, that you wanted to throw the work away. Almost nobody means that. Close the window, yes; erase the session, no.

Plenty of web apps treat Back as leave-and-forget. You type out a long comment, brush the Back gesture by accident, and the draft is gone. A move that was supposed to be navigation turned into data loss.

An update that reboots the machine without really asking means you can walk back to your desk and find everything you had open gone. The system put its own maintenance schedule ahead of whatever you were in the middle of.

You submit a form with one field missing and get the whole page back with every other field wiped clean. One small mistake, and the software punishes you by erasing the ten things you got right.

## Why it matters in system design

Surprising behavior increases cognitive load. When a system does something you didn't expect, you have to stop, work out what just happened, and decide whether to trust the result, and none of that is the work you sat down to do. Worse, surprises add up. Once a tool has caught me out three times, I get wary of everything it does and start double-checking things I should be able to take for granted. That wariness is friction, and friction compounds: a little of it on every action adds up to a tool nobody quite trusts.

