# trrahul.github.io

Source for [rahultr.dev](https://www.rahultr.dev). Built with Jekyll on the [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme.

Posts cover programming, engineering, technical writing, and some fiction.

## Divergence from Chirpy

Started from the Chirpy starter. The theme is still the dependency, but the site overrides enough of it that in-place theme upgrades are no longer viable.

### Custom plugins

- **backlinks-generator** -- scans all posts for internal links, attaches `backlinks` and `outgoing_links` data to each document. Posts can render "what links here" panels from this data.
- **knowledge-graph-generator** -- runs after backlinks, produces `graph/data.json` (nodes = posts, edges = links). Consumed by the `/graph/` page.
- **category-hierarchy-generator** -- builds a nested category tree from post front matter, available in Liquid templates as `site.data.category_hierarchy` and served as JSON for client-side category filtering on the home page.
- **search-index-generator** -- produces a structured search index that segments posts by markdown heading, rather than treating the full post as one document.
- **cil_lexer** -- Rouge lexer for CIL/MSIL/ILAsm (`.il` files). Enables syntax highlighting for .NET IL code in posts.
- **github_code_embed** -- Liquid tag `{% github_code <url> <lines> %}` that fetches a file from GitHub at build time and renders it with syntax highlighting.
- **posts-lastmod-hook** -- uses `git log` to set `last_modified_at` on any post that has been committed more than once.


### SCSS

All additions live in `_sass/addon/` so they don't conflict with Chirpy's layer:

- Sidebar rewrite (`_sidebar.scss`, `_sidebar-colors.scss`) -- the sidebar is visually distinct from Chirpy's default.
- Topbar overrides (`_topbar-overrides.scss`)
- Typography and code block overrides
- Page-specific styles: home (post cards, quick-jump, mode-switch, terminal bar, responsive), categories, graph, tags, backlinks panel
- Diagram styles (`diagram.scss`) -- hides the light or dark SVG variant depending on the active theme
- Component styles: link previews, Mermaid diagrams, abbreviation tooltips, GitHub code embeds, W40K posts
- Font alternatives (`font-alternatives.scss`)

### Diagram toolchain

`tools/diagrams/` is a Node.js build step separate from Jekyll.

Diagrams are authored as JavaScript modules using a small helper API (box, arrow, label, region). Running `node tools/diagrams/index.mjs` discovers all scenes, renders each in light and dark variants, and writes:

- `_diagrams/<name>.<theme>.excalidraw` -- the JSON source, diffable and openable at excalidraw.com
- `assets/img/diagrams/<name>.<theme>.svg` -- background-stripped SVG for the site

Posts embed diagrams with `{% include diagram.html name="..." alt="..." %}`. The include renders both variants; CSS shows only the one matching the active theme.

### Includes and composition

Several includes override or replace Chirpy's equivalents:

- `sidebar.html` -- fully rewritten, terminal-aesthetic sidebar
- `topbar.html` -- overrides Chirpy's topbar
- `diagram.html` -- theme-aware diagram include (described above)
- `backlinks.html`, `panel-backlinks.html` -- backlinks panel, used in post and page layouts
- `toc.html` -- custom table of contents
- `terminal/` -- component tree for terminal-style pages: breadcrumb, prompt, input line, controls, help modal, debug log

---

## Local setup

Requires Ruby, Bundler, and Node.js (for diagrams).

```sh
bundle install
bundle exec jekyll serve --livereload
```

The site runs at `http://localhost:4000`.

To rebuild diagrams:

```sh
node tools/diagrams/index.mjs
```

## New post

```sh
.\new-post.ps1
```

Prompts for a title, creates a dated file in `_posts/`, and opens it in VS Code.

## License

[MIT](LICENSE)
