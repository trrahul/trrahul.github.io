---
layout: page
title: Nodify.Avalonia — .NET Desktop Node and Graph Editor
nav_title: Nodify.Avalonia
description: Open-source Avalonia controls for building node editors, graph editors, workflow designers, and visual programming tools for cross-platform .NET desktop applications.
permalink: /nodify-avalonia/
order: 6
seo:
  type: WebPage
image:
  path: /assets/img/nodify-avalonia/workflow-designer.png
  alt: Nodify.Avalonia workflow designer running as a .NET desktop application
---

# Node and graph editor controls for .NET desktop applications

Nodify.Avalonia is an open-source Avalonia control library for building node editors, graph
editors, workflow designers, and visual programming tools in .NET desktop applications. It
runs wherever Avalonia runs, including Windows, macOS, and Linux.

The library handles the editor surface, nodes, connectors, connections, selection,
navigation, and input while your view models hold the graph data.

This library is an Avalonia port of [Nodify](https://github.com/miroiu/nodify), created by
Miroiu Emanuel. These guides describe the Avalonia implementation maintained in the
[Nodify.Avalonia repository](https://github.com/trrahul/nodify-avalonia).

## What you can build

- Node-based editors and visual programming tools
- Workflow and data-flow designers
- State-machine editors
- Diagramming and graph editing tools

## Start here

- [Getting started]({{ '/nodify-avalonia/docs/getting-started/' | relative_url }}) — install the package and build a working node editor.
- [Editor]({{ '/nodify-avalonia/docs/editor/' | relative_url }}) — understand layers, viewport movement, selection, and commands.

## Core concepts

- [Item containers]({{ '/nodify-avalonia/docs/item-containers/' | relative_url }}) position and select items on the editor surface.
- [Nodes]({{ '/nodify-avalonia/docs/nodes/' | relative_url }}) display content and arrange input and output connectors.
- [Connectors]({{ '/nodify-avalonia/docs/connectors/' | relative_url }}) expose connection points and report their graph coordinates.
- [Connections]({{ '/nodify-avalonia/docs/connections/' | relative_url }}) render links between connector anchors.

## Controls and interactions

- [Editor gestures]({{ '/nodify-avalonia/docs/editor-gestures/' | relative_url }}) — learn and customize pointer and keyboard input.
- [Cutting connections]({{ '/nodify-avalonia/docs/cutting-connections/' | relative_url }})
- [Minimap]({{ '/nodify-avalonia/docs/minimap/' | relative_url }})
- [Theming]({{ '/nodify-avalonia/docs/theming/' | relative_url }})
- [Frequently asked questions]({{ '/nodify-avalonia/docs/faq/' | relative_url }})

## Examples

The repository includes five runnable applications:

- [Workflow designer](https://github.com/trrahul/nodify-avalonia/tree/main/Examples/Nodify.Avalonia.Workflow)
- [Shapes canvas](https://github.com/trrahul/nodify-avalonia/tree/main/Examples/Nodify.Avalonia.Shapes)
- [Playground](https://github.com/trrahul/nodify-avalonia/tree/main/Examples/Nodify.Avalonia.Playground)
- [State machine](https://github.com/trrahul/nodify-avalonia/tree/main/Examples/Nodify.Avalonia.StateMachine)
- [Calculator](https://github.com/trrahul/nodify-avalonia/tree/main/Examples/Nodify.Avalonia.Calculator)

Start an example from the repository root with:

```powershell
dotnet run --project Examples/Nodify.Avalonia.Playground
```

![Nodify.Avalonia workflow designer example]({{ '/assets/img/nodify-avalonia/workflow-designer.png' | relative_url }})

![Nodify.Avalonia shapes canvas example]({{ '/assets/img/nodify-avalonia/shapes.png' | relative_url }})

![Nodify.Avalonia Playground example]({{ '/assets/img/nodify-avalonia/playground.png' | relative_url }})

![Nodify.Avalonia state machine example]({{ '/assets/img/nodify-avalonia/state-machine.png' | relative_url }})

![Nodify.Avalonia calculator example]({{ '/assets/img/nodify-avalonia/calculator.png' | relative_url }})

## Version requirements

Nodify.Avalonia 2.0 targets **.NET 8** and depends on **Avalonia 12.0.5**. The package has no
runtime dependency other than Avalonia.

[View the project README on GitHub](https://github.com/trrahul/nodify-avalonia/blob/main/README.md)
