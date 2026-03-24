---
name: app-screenshots
description: >
  Generate annotated screenshot documentation for any web app. Use when asked to
  "screenshot the app", "document the app", "describe X with screenshots",
  "visual docs", "screenshot documentation", "show me the app", or any request
  to create a markdown file with annotated screenshots of a running web application.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, AskUserQuestion
---

# Annotated Screenshot Documentation

Generate a markdown document with annotated screenshots of a running web app. Screenshots include red circles, arrows, and labels highlighting key interactive elements.

## Prerequisites

- `agent-browser` CLI must be installed globally (`npm i -g agent-browser && agent-browser install`)

## Annotation Helper

The annotation script is bundled at `references/annotate.js` (relative to this skill file). Load it before annotating:

```bash
# Resolve the skill directory (works whether symlinked or copied)
SKILL_DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")"; pwd)"
# Fallback: find it relative to .claude/skills or .agents/skills
ANNOT_JS="$(find . .claude .agents -path '*/app-screenshots/references/annotate.js' 2>/dev/null | head -1)"
ANNOT="$(cat "$ANNOT_JS")"
```

In practice, Claude will locate the file via Glob and read it with `cat`.

## Workflow

```text
Phase 1: Discover the app
   ├─ Detect dev server command and port
   ├─ Start dev server if not running
   └─ Wait for it to be ready

Phase 2: Map the app
   ├─ Open homepage in agent-browser
   ├─ Snapshot header/nav to discover all pages
   └─ Build a page list with URLs

Phase 3: Screenshot each page with annotations
   ├─ For each page: navigate, inject annotations, screenshot
   └─ Save to docs/screenshots/

Phase 4: Generate markdown documentation
   └─ Create docs/app-screenshots.md with all images

Phase 5: Cleanup
   └─ Close browser (keep dev server running)
```

## Phase 1: Discover the App

Detect how to start and reach the app:

1. **Check if a dev server is already running** by curling common ports (3000, 3001, 3003, 5173, 4321, 8080):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   ```

2. **If not running**, detect the start command from `package.json` scripts (look for `dev`, `start`, `serve`) and the package manager (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, else npm):
   ```bash
   pnpm dev &>/tmp/dev-server.log &
   ```

3. **Wait for readiness** — poll the URL every 2s until it responds (max 30s).

4. **Determine the base URL** from dev server output or the port that responds.

## Phase 2: Map the App

1. Open the homepage:
   ```bash
   agent-browser open <base-url>
   ```

2. Wait for page load, then snapshot the navigation:
   ```bash
   agent-browser snapshot -i -s "header, nav, [role=navigation]" -c
   ```

3. Extract all nav links and build a **page list**. Example:
   ```
   / → Homepage
   /books → Books
   /table → Table View
   ```

4. If the user asked to document a specific feature (not the whole app), focus only on pages relevant to that feature.

5. **Ask the user** if the discovered pages look right, or if they want to add/remove any.

## Phase 3: Screenshot Each Page

For each page in the list:

### Step 1: Navigate and wait
```bash
agent-browser open <url> && sleep 3
```

### Step 2: Inject annotations

Locate the annotation helper, load it, and call annotation functions:

```bash
ANNOT="$(cat <path-to-skill>/references/annotate.js)"
agent-browser eval "$ANNOT; annotateMulti([
  {sel: 'selector', label: 'Label text', type: 'box'},
  {sel: 'selector', label: 'Label text', type: 'click'}
])"
```

**Annotation types:**
- `box` — dashed border around a region with a label (use for sections, containers, areas)
- `click` — filled circle with dot + arrow + label (use for buttons, links, interactive elements)
- `circle` (default) — dashed circle + arrow + label (use for general callouts)

**Color rotation:** When using `annotateMulti`, colors auto-rotate: red, blue, green, amber, purple.

**What to annotate per page type:**
- **Homepage/listing**: navigation bar, search button, key content sections
- **Detail page**: title/metadata area, table of contents, related content sidebar
- **Table/data view**: sortable column headers, filter controls, data area
- **Graph/visual**: the main visualization area, any controls
- **Settings/form**: key form fields, submit button
- **Modal/dialog**: trigger button (before), then the modal content (after opening)

### Step 3: Take screenshot
```bash
agent-browser screenshot docs/screenshots/<NN>-<page-name>.png
```

Use zero-padded numbering: `01-homepage.png`, `02-books.png`, etc.

### Step 4: Clear annotations for next page
Navigation to a new page clears them automatically.

### Special screenshots

For features that involve interaction (search modal, dark mode, dropdowns):

1. Take initial screenshot
2. Perform the interaction (`agent-browser click`, `agent-browser press`)
3. Annotate the result
4. Take the "after" screenshot with a descriptive name

Example — search modal:
```bash
agent-browser press "Meta+k" && sleep 1
agent-browser eval "$ANNOT; annotateMulti([...])"
agent-browser screenshot docs/screenshots/12-search.png
```

## Phase 4: Generate Markdown

Create `docs/app-screenshots.md` with this structure:

```markdown
# <App Name> - Visual Guide

Brief description of the app.

---

## <Page Name>

Description of this page and what the user can do here.

![<Page Name>](screenshots/<filename>.png)

---

(repeat for each page)
```

**Guidelines:**
- Each section should have 1-3 sentences describing the page purpose
- Reference annotated elements in the description (e.g., "Use the **Search** button (top right) to find content")
- Group related pages together
- Use `---` between sections for visual separation

## Phase 5: Cleanup

```bash
agent-browser close
```

Keep the dev server running (user may want to continue working).

## Selector Tips

When annotations can't find an element:
- Use `agent-browser snapshot -i -s "<container>"` to discover elements and their refs
- Use `agent-browser eval "document.querySelectorAll('<sel>').length"` to test selectors
- Prefer semantic selectors: `header nav`, `main h1`, `[role="dialog"]`, `aside`
- For nth-child buttons: `header button:nth-of-type(2)`

## Troubleshooting

- **Timeout on annotate**: Page too complex — use `-s` flag on snapshot to scope to a section
- **Element not found**: Use `agent-browser eval` to test the selector first
- **Screenshot blank/error**: Dev server may have crashed — check logs, restart
- **Annotations overlapping**: Reduce number of annotations per screenshot, or use different pages for different callouts
