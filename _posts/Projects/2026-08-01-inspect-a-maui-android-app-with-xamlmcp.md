---
layout: post
title: "Connect an AI coding assistant to a .NET MAUI Android app with XamlMcp"
description: "Connect XamlMcp to a debuggable .NET MAUI Android app through ADB and inspect its live logical UI from an AI coding assistant."
date: 2026-08-01 13:00:00 +05:30
categories: [Projects, Programming]
collection_id: xamlmcp
tags: [XamlMcp, XAML, MCP, MAUI, Android, dotnet]
toc: true
---

Desktop XAML applications and their development tools run on the same machine. Android is different: the application runs inside a device or emulator, while the MCP server and AI client run on the development machine.

XamlMcp bridges that boundary through ADB without opening the application to the network. This post covers the Android-specific setup and the parts that differ from the [WPF walkthrough](/posts/getting-started-with-xamlmcp/).

## What you need

The current preview expects:

- .NET MAUI 10.0.80;
- the .NET 10 SDK and Android workload;
- Android SDK platform tools, including `adb`;
- a debuggable Android application targeting API 24 or later; and
- an emulator or authorized physical device.

Screenshots require API 26 or later. iOS and Mac Catalyst are not supported.

## Add the MAUI agent

Add the package to the MAUI project:

```powershell
dotnet add package XamlMcp.Maui --version 1.0.0-preview.2
```

Set the Android platform floor in the project file if it is lower than API 24:

```xml
<SupportedOSPlatformVersion
    Condition="$([MSBuild]::GetTargetPlatformIdentifier('$(TargetFramework)')) == 'android'">
  24.0
</SupportedOSPlatformVersion>
```

Attach XamlMcp while building the application. Keep the diagnostic gate in the application rather than relying on the package to infer the build configuration:

```csharp
using XamlMcp.Maui;

public static MauiApp CreateMauiApp()
{
    var builder = MauiApp.CreateBuilder()
        .UseMauiApp<App>();

#if DEBUG
    builder.UseXamlMcp();
#endif

    return builder.Build();
}
```

You will also need the application's Android package name. In a single-project MAUI app, this is normally the `ApplicationId` in the project file:

```xml
<ApplicationId>com.example.myapp</ApplicationId>
```

## Start an emulator or connect a device

Check what ADB can see:

```powershell
adb devices
```

A usable target appears with the state `device`. If a physical device says `unauthorized`, unlock it and accept the debugging prompt. If more than one target is online, note the serial you want, such as `emulator-5554`.

Build and launch the Debug application from its project directory:

```powershell
dotnet build -t:Run -f net10.0-android -c Debug
```

Leave the application running. The agent writes its discovery descriptor only after application startup.

## Configure the MCP client

The server needs the Android application ID so it knows where to look for the private discovery descriptor. For Claude Code:

```powershell
claude mcp add --scope user xamlmcp-android -- dnx XamlMcp.Server@1.0.0-preview.2 --android-package com.example.myapp
```

For Codex:

```powershell
codex mcp add xamlmcp-android -- dnx XamlMcp.Server@1.0.0-preview.2 --android-package com.example.myapp
```

Replace `com.example.myapp` with the application's actual ID. When ADB reports more than one authorized device, append the selected serial to either command:

```powershell
--android-device emulator-5554
```

Start a new AI client session after registering the server.

## Verify the connection

With the Android application open, ask:

> Use XamlMcp to find my running Android app, attach to it, and show its logical UI tree.

The client calls `list-apps`, attaches to the Android instance, and requests a logical tree. You can then ask questions about the live page:

> Find the text entry, show its bindable properties, enter a new value, and tell me what changed.

> Take a screenshot and compare the visible screen with the logical tree.

> Find the button's command, check whether it can execute, and invoke it if the node supports that action.

## What happens over ADB

The Android agent listens on device loopback, not on a network-facing interface. It writes a per-launch descriptor containing its connection information and token into the application's private storage.

`XamlMcp.Server` reads that descriptor with Android's `run-as` command. This only works for a debuggable application. The server then creates an ADB port forward for the connection it owns, authenticates with the per-launch token, and removes that forward when the connection ends.

Private paths, ports, tokens, and raw ADB output are not returned through MCP. A Release build that is not debuggable cannot expose its private descriptor through `run-as`, which is intentional.

## Android capabilities and limits

The MAUI agent exposes logical MAUI elements. It does not return native Android `View` objects behind MAUI handlers. This keeps the tool model consistent between MAUI Windows and Android, but it also means a native handler that is not represented in the MAUI logical tree will not appear.

On Android, XamlMcp can inspect the logical tree, search by type, name, text, or style class, read bindable properties and resources, capture screenshots, inspect packaged `MauiAsset` items, observe changes, and use supported commands or accessibility actions.

Some results are deliberately limited:

- property enumeration covers public static `BindableProperty` fields and is not complete;
- styles report MAUI visual states as degraded style information rather than XAML pseudo-classes;
- input is dispatched through the Android activity and view stack, not raw OS injection;
- action support depends on the node and its verifiable Android accessibility behavior; and
- screenshots use PixelCopy on API 26 or later, with a Canvas fallback for ordinary views where available.

Read the capability map returned by `attach` before assuming a particular action is supported.

## Common connection failures

If the app does not appear, check these in order:

1. Confirm the application is running from a Debug build containing `UseXamlMcp()`.
2. Confirm `--android-package` exactly matches the installed `ApplicationId`.
3. Run `adb devices` and verify that the target is online and authorized.
4. If several devices are online, pass `--android-device` with the intended serial.
5. Confirm the Android SDK platform tools are available to the process starting the MCP server.

A `run-as` failure usually means the installed application is not debuggable or the package ID is wrong. A missing screenshot on API 24 or 25 is an API-level limitation, not a connection failure. If a native control is absent from `tree`, check whether it has a corresponding MAUI logical element.

The [XamlMcp documentation](/xamlmcp/) contains the shared client configuration and other framework setups. The [framework feature matrix](https://github.com/trrahul/XamlMcp/blob/master/docs/framework-feature-matrix.md) is the detailed reference for Android and MAUI behavior.
