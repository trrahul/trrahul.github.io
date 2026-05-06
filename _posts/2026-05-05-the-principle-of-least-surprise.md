---
layout: post
title: The principle of least surprise
date: 2026-03-05 17:49:51 +05:30
categories: [Design]
tags: []
---

The Principle of Least Surprise (also called the Principle of Least Astonishment) holds that a system should behave the way its users expect it to behave. When something works the way you think it will, you stop noticing it. When it does not, you lose trust in everything around it.

In practice, the principle asks four things of a design: features should be consistent with users' existing mental models; similar operations should produce similar results; state changes should be predictable; and edge cases should be handled logically, not arbitrarily.

## Where it works well

The best examples share one trait. The system honors the user's intent instead of exposing its internal bookkeeping.

**Unix file deletion.** When a process has a file open and another process deletes it, the first process can keep reading and writing. The filename disappears, but the data stays accessible until no one needs it. This matches the user's reasonable expectation: deleting a name should not break a running program.

**Undo in editors.** `Ctrl+Z` or `Cmd+Z` reverses the last change in nearly every editor. Users do not need to relearn it for each product. The command says what it does, and it does what it says.

**Save prompts before discard.** When you close a dirty document, good editors ask whether you want to save. The software understands that closing a window and discarding work are not the same action.

**Browser back navigation.** In a well-behaved browser or web app, the Back button takes you to the page you just left, often close to the same scroll position. It preserves a simple mental model: back means back.

**`mkdir -p`.** In Unix, `mkdir -p logs/2026/may` means make sure this path exists. If some directories already exist, the command still succeeds. The result matches the user's intent, not the system's intermediate steps.

**Arithmetic that stays arithmetic.** In most strongly typed languages, `2 + 2` equals `4`. The operator does not quietly change meaning halfway through the expression.

## Where it breaks down

The bad examples usually fail in the same way. They force the user to care about details the system should have absorbed.

**JavaScript type coercion.** `"2" + 2` equals `"22"`. The `+` operator silently switches from addition to concatenation based on types the developer may not have intended. The behavior is consistent within JavaScript's own rules, but it violates the user's expectation of what `+` means.

**Windows file-in-use deletion errors.** Trying to delete a file can fail because another process still has a handle open. The user asked to remove a filename. The system answers with a resource-locking detail the user did not ask about and often cannot see.

**Silent close without save prompt.** A program that exits without asking whether to save changes assumes the user wanted to discard work. Most users mean close the window, not erase the session.

**Back navigation that destroys drafts.** Many web apps treat the Back button as leave-and-forget. A user writes a long comment, taps Back by mistake, and the draft is gone. The interface turned a navigation gesture into data loss.

**Forced restarts for updates.** Rebooting without explicit user consent means a user can return to the machine and find open work gone. The system prioritized its own maintenance cycle over the user's current task.

**Forms that clear themselves after one error.** A user submits a form with one missing field and gets the page back with every other field emptied out. The software punishes one mistake by erasing ten correct inputs.

## Why it matters in system design

Surprising behavior increases cognitive load. Every time a system does something unexpected, the user has to stop and figure out what happened. This is time they are not spending on their actual task. Accumulated surprises erode trust: if the system has surprised me three times, I will be cautious about everything it does. That caution is friction, and friction compounds.

## The limits of the principle

The principle is real and useful, but it can be taken too far.

Consistency with existing expectations can slow progress. If every new interaction must match what users already know, you cannot introduce genuinely better approaches that require a short learning curve. The principle, applied rigidly, would have prevented every worthwhile interface improvement in the past forty years.

User expectations are not uniform. What one group finds obvious, another finds confusing. Designing for the least surprise of one population may produce the most surprise for another.

And existing expectations can be wrong. If users have an incorrect mental model of how something works, building to match that model reinforces the mistake. Sometimes the right move is to gently correct the model, even at the cost of brief disorientation.

The principle is a heuristic, not a law. Use it to catch avoidable confusion. Do not use it as a reason to avoid change.
