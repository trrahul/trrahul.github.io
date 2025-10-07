---
title: "Style Tests"
date: 2025-10-06 10:00:00 +0530
categories: [Testing, Design]
tags: [test, styling, markdown, design-system]
---

# Style Test Post

This post tests all the styling elements to ensure the design system works correctly.

## Typography Tests

### Heading Level 3
This is a paragraph under H3. Let's test **bold text**, *italic text*, and ***bold italic text***. We should also test `inline code` and regular text flow.

#### Heading Level 4
Smaller heading to test hierarchy.

##### Heading Level 5
Even smaller for complete testing.

###### Heading Level 6
The smallest heading level.

## Link Tests

Here's a [regular link to Google](https://google.com) and another [link to the homepage](/). Links should have proper hover states and underlines in content.

External link: [GitHub](https://github.com)
Internal link: [About page](/about/)
Anchor link: [Jump to Code](#code-blocks)

## List Tests

### Unordered Lists

- First item in the list
- Second item with some longer text to see how wrapping works
  - Nested item 1
  - Nested item 2
    - Double nested item
- Third item
- Fourth item with **bold** and *italic* text

### Ordered Lists

1. First numbered item
2. Second numbered item
   1. Nested ordered item
   2. Another nested item
3. Third numbered item
4. Fourth item with a [link](https://example.com)

### Mixed Lists

1. Ordered item
   - Unordered nested
   - Another unordered
2. Back to ordered
   - Mixed nesting works

## Blockquote Tests

> This is a simple blockquote. It should have a left border and distinctive styling.

> This is a longer blockquote with multiple sentences. It tests how the blockquote handles longer content and whether line breaks work properly within the quote.
> 
> This is a second paragraph in the same blockquote.

> **Note:** Blockquotes can also contain **bold** and *italic* text, as well as `inline code`.

## Code Blocks

### Inline Code

Use `npm install` to install packages. Variables like `const name = "test"` should be clearly visible.

### Code Block Tests {#code-blocks}

#### JavaScript

```javascript
// Function to test syntax highlighting
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

#### Python

```python
# Python code block test
def calculate_sum(numbers):
    """Calculate sum of numbers in a list."""
    total = 0
    for num in numbers:
        total += num
    return total

numbers = [1, 2, 3, 4, 5]
print(f"Sum: {calculate_sum(numbers)}")
```

#### Bash

```bash
#!/bin/bash
# Shell script test

echo "Testing Jekyll site"
bundle exec jekyll serve --livereload

# Install dependencies
npm install
npm run build
```

#### JSON

```json
{
  "name": "test-project",
  "version": "1.0.0",
  "description": "Testing code blocks",
  "dependencies": {
    "react": "^18.0.0",
    "next": "^13.0.0"
  }
}
```

## Table Tests

### Simple Table

| Name | Role | Location |
|------|------|----------|
| Alice | Developer | USA |
| Bob | Designer | UK |
| Charlie | Manager | Canada |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Text | Text | Text |
| More text | Centered | 123 |
| Even more | Content | 456 |

### Complex Table

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Authentication | ✅ Complete | High | OAuth2 implemented |
| Database | 🚧 In Progress | High | PostgreSQL setup |
| API | ✅ Complete | Medium | REST + GraphQL |
| Frontend | ⏳ Planned | Low | React/Next.js |

## Horizontal Rules

Testing horizontal rules for section breaks:

---

Content after first HR.

***

Content after second HR.

## Image Tests

![Sample Image](https://via.placeholder.com/800x400/0066cc/ffffff?text=Sample+Image)

*Caption: This is a test image with caption*

## Special Characters & Formatting

### Keyboard Shortcuts

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.
Use <kbd>Cmd</kbd> + <kbd>V</kbd> to paste.

### Abbreviations

The HTML specification is maintained by the W3C.

### Strikethrough

~~This text is crossed out~~

### Task Lists

- [x] Completed task
- [x] Another completed task
- [ ] Incomplete task
- [ ] Another incomplete task

## Nested Content Tests

Here's a complex nested example:

1. First level ordered
   - Nested unordered
     > A blockquote inside a list
     
     ```javascript
     // Code inside a list
     const nested = true;
     ```
   
   - Back to list
2. Second ordered item

## Definition Lists

Term 1
: Definition for term 1

Term 2
: Definition for term 2
: Another definition for term 2

## Emoji Test

😀 😃 😄 😁 🚀 ✨ 💻 📱 🎯 🎨

## Long Content Test

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## Mixed Formatting Paragraph

This paragraph contains **bold text**, *italic text*, ***bold and italic***, `inline code`, [a link](https://example.com), ~~strikethrough~~, and regular text all in one line to test how they work together.

## Footnotes Test

Here's a sentence with a footnote[^1]. And another with a different footnote[^2].

[^1]: This is the first footnote.
[^2]: This is the second footnote with more content.

## Details/Summary (Collapsible)

<details>
<summary>Click to expand</summary>

This is hidden content that appears when you click the summary.

- Can contain lists
- Can contain **formatting**
- Can contain `code`

</details>

## Alert Boxes (If Supported)

> **Warning:** This is a warning message. Pay attention to this important information.

> **Note:** This is just a note for your information.

> **Tip:** Here's a helpful tip for better results.

## Final Content Test

This is the final paragraph to test spacing at the end of posts. It should have proper margins and not be too close to the footer.

---

**End of Style Test** - If everything looks good, the design system is working correctly! 🎉
