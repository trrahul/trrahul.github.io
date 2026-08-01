---
layout: post
title: "Getting started with XamlMcp: inspect a running XAML app with AI"
description: "Add XamlMcp to a WPF app, connect Claude Code or Codex, and inspect the running UI through MCP."
date: 2026-07-30 12:00:00 +05:30
categories: [Projects, Programming]
collection_id: xamlmcp
tags: [XamlMcp, XAML, MCP, WPF, dotnet]
toc: true
---

AI coding assistants are good at reading XAML. The gap appears after the application starts: the assistant cannot see which controls actually exist, which style supplied a value, whether a command is enabled, or what appeared after a click.

I built [XamlMcp](https://github.com/trrahul/XamlMcp) to close that gap. It connects an MCP client to an instrumented Avalonia, WPF, WinUI 3, or .NET MAUI application. The client can inspect the UI tree, read and change properties, examine styles and resources, take screenshots, send input, and invoke supported automation actions.

This guide uses WPF and `1.0.0-preview.2` for the shortest complete setup. The [XamlMcp documentation](/xamlmcp/) has the corresponding setup for Avalonia, WinUI 3, and .NET MAUI.

## The missing runtime context

Source code tells an assistant how the UI ought to be built. A running application tells it what actually happened.

A property may come from a style, binding, inherited value, or local override. A control may exist only after navigation or data-template expansion. A command may be present but disabled because `CanExecute` returned false. None of that is reliably visible from the XAML file alone.

XamlMcp gives the assistant a way to ask the application directly. It can inspect the current tree, follow a node to its ancestors, read property value sources, examine styles and resources, and observe the result of an interaction.

## How it fits together

XamlMcp has two parts:

- A small framework package runs inside the application and exposes framework-specific inspection and interaction.
- `XamlMcp.Server` runs as a local MCP server and translates client tool calls into the authenticated protocol used by the application.

Claude Code, Codex, or another MCP client starts the server when it needs it. There is no persistent XamlMcp service to run. The application remains a process you launch and control.

Discovery and transport are local. Desktop applications use a current-user named pipe. MAUI Android uses an ADB-forwarded device-loopback connection to a debuggable application. Each application launch has its own credentials.

## Prerequisites

You need:

- a modern .NET WPF application targeting .NET 8 or later;
- the .NET 10 SDK for the XamlMcp server; and
- an MCP client such as Claude Code or Codex.

The application and the MCP server run locally. XamlMcp does not send the application's UI state to a hosted XamlMcp service.

## Add the WPF agent

Add the framework package to the application project:

```powershell
dotnet add package XamlMcp.Wpf --version 1.0.0-preview.2
```

Then attach the agent from `Application.OnStartup`:

```csharp
using System.Windows;
using XamlMcp.Wpf;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        this.AttachXamlMcp();
        base.OnStartup(e);
    }
}
```

The WPF attachment method is conditional on `DEBUG`, so the call site disappears from the application's Release build. The agent uses the `Application.Dispatcher` that performs the attachment; windows owned by secondary WPF UI threads are outside the current session.

## Connect an AI client

XamlMcp.Server is a .NET tool that speaks MCP over standard input and output. The AI client starts it when needed, so there is no separate server process to launch or keep running.

For Claude Code, register it for your user account:

```powershell
claude mcp add --scope user xamlmcp -- dnx XamlMcp.Server@1.0.0-preview.2
```

For Codex, run:

```powershell
codex mcp add xamlmcp -- dnx XamlMcp.Server@1.0.0-preview.2
```

Both commands use `dnx`, included with the .NET 10 SDK, to run the published tool without installing it globally. Start a new client session after registering the server.

## Why the Windows Driver exists

The framework agent can inspect UI owned by WPF, but not every window shown by a WPF application belongs to the WPF tree. A native file picker or message box is a separate Win32 window. It will not appear in `tree`, and ordinary XamlMcp input cannot address it.

The optional Windows Driver covers that boundary. It runs inside `XamlMcp.Server` and adds four tools:

- `dialog-wait` waits for a native dialog opened by the attached application;
- `dialog-act` selects a button, sets a file name, accepts, or cancels the dialog;
- `window-list` returns the application's top-level windows; and
- `window-act` activates, moves, resizes, or closes one of those windows.

The Driver is disabled by default because it works at the operating-system window level rather than inside the framework agent. Enable it by adding `--enable-driver` to the server command used by the MCP client:

```powershell
dnx XamlMcp.Server@1.0.0-preview.2 --enable-driver
```

It only matches windows owned by the attached application's process. Dialogs must appear after the last mutating XamlMcp call, file paths are restricted to configured roots, and elevated applications and non-interactive sessions are rejected. The Driver is Windows-only and works with Windows applications using any of the supported XAML frameworks.

## Launch the application

Start the application in the Debug configuration:

```powershell
dotnet run --configuration Debug
```

Leave the application running. XamlMcp discovers instrumented applications; it does not start the application for you.

## Verify the setup

Open Claude Code or Codex in the application repository and ask:

> Use XamlMcp to list the running applications, attach to my app, and show its UI tree.

The client should call `list-apps`, attach to the returned application instance, and then call `tree`. If it returns the live UI hierarchy, the framework agent, local transport, MCP server, and client configuration are all connected.

These are MCP tool calls made by the AI client. They are not commands to type into PowerShell.

## Try a real inspection task

Once attached, ask questions about the UI instead of manually choosing tool names. For example:

> Find the Save button, tell me whether it is enabled, and show the properties and command information that explain its current state.

Or:

> Take a screenshot, inspect the selected control's styles and resources, and explain why its background has that value.

The client can combine tree navigation, property inspection, screenshots, styles, resources, input, and automation actions. Exact support depends on the framework and control. The capability map returned by `attach` is authoritative for the running process.

## What is available

At a task level, XamlMcp can:

- navigate and search the live visual or logical UI tree;
- read properties, value sources, styles, resources, automation patterns, and command bindings;
- set supported properties or clear local values;
- capture windows and controls as MCP images;
- send input or invoke supported automation actions and commands;
- enumerate and open packaged application assets; and
- optionally work with app-owned native windows and dialogs on Windows.

Mutating operations can return an observed digest. This lets the assistant see what changed after an action instead of assuming it worked.

## Other XAML frameworks

The overall flow is the same for every supported framework:

1. add the matching agent package;
2. attach the agent during application startup;
3. launch the instrumented application; and
4. let the MCP client discover and attach to it.

The startup code and platform limits differ. Use the [getting-started documentation](/xamlmcp/#configure) for Avalonia, WinUI 3, and .NET MAUI, and consult the [framework feature matrix](https://github.com/trrahul/XamlMcp/blob/master/docs/framework-feature-matrix.md) for the supported operations.

## Framework differences

Avalonia currently exposes the broadest surface, including class and pseudo-class operations. WPF reports its own style, trigger, routed-input, and rendering model. WinUI works with its visual tree and known dependency-property catalog. MAUI exposes logical MAUI elements on Windows and Android rather than native handler views.

Screenshots and input follow the platform. WPF input is routed rather than physical raw input. WinUI uses guarded raw input. MAUI uses guarded raw input on Windows and activity/view-stack input on Android. The capability map returned by `attach` describes what is available for the running application.

XamlMcp is [available on NuGet](https://www.nuget.org/packages/XamlMcp.Server), listed in the public MCP Registry as `io.github.trrahul/xamlmcp`, and developed on [GitHub](https://github.com/trrahul/XamlMcp).
