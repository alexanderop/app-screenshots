---
name: app-screenshots
description: >
  Generate annotated screenshot documentation for any web app or website — local dev servers
  or live sites like otto.de, github.com, etc. Use when asked to "screenshot the app",
  "document the app", "describe X with screenshots", "visual docs", "screenshot documentation",
  "show me the app", "screenshot otto.de", "document this website", or any request to create
  a markdown file with annotated screenshots of a web application.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, AskUserQuestion
---

# Annotated Screenshot Documentation

Generate a markdown document with annotated screenshots of any web app — whether it's a local dev server or a live website. Screenshots include red circles, arrows, and labels highlighting key interactive elements.

## Prerequisites

- `agent-browser` CLI must be installed globally (`npm i -g agent-browser && agent-browser install`)

## Annotation Helper

The annotation script is bundled at `references/annotate.js` (relative to this skill file). Locate it before use:

```bash
ANNOT_JS="$(find . .claude .agents -path '*/app-screenshots/references/annotate.js' 2>/dev/null | head -1)"
ANNOT="$(cat "$ANNOT_JS")"
```

## Workflow

```text
Phase 1: Determine the target
   ├─ A) Live site: user gave a URL (e.g., otto.de) → use directly
   └─ B) Local app: detect/start dev server → get localhost URL

Phase 2: Map the site
   ├─ Open homepage in agent-browser
   ├─ Snapshot navigation to discover pages
   ├─ For live sites: also consider common pages (/about, /login, /pricing)
   └─ Build a page list with URLs

Phase 3: Screenshot each page with annotations
   ├─ For each page: navigate, dismiss popups, inject annotations, screenshot
   └─ Save to docs/screenshots/

Phase 4: Generate markdown documentation
   └─ Create docs/<site-name>-screenshots.md with all images

Phase 5: Cleanup
   └─ Close browser
```

## Phase 1: Determine the Target

### A) Live website (e.g., otto.de, github.com)

If the user provides a URL or domain name:

1. Normalize the URL — add `https://` if missing:
   ```bash
   agent-browser open https://otto.de
   ```

2. **Handle cookie banners / consent dialogs** — most live sites show these. After page load:
   ```bash
   agent-browser snapshot -i -s "[role=dialog], [class*=cookie], [class*=consent], [id*=cookie], [id*=consent]" -c
   ```
   If a consent dialog is found, accept it:
   ```bash
   agent-browser click "button:has-text('Accept'), button:has-text('Akzeptieren'), button:has-text('Allow'), button:has-text('Agree'), [class*=accept], [id*=accept]"
   ```
   Wait briefly for the dialog to close: `sleep 2`

3. **Handle login walls** — if the site requires login and the user hasn't provided credentials, screenshot what's publicly accessible. Ask the user if they want to provide auth.

4. For sites with anti-bot measures, consider using:
   ```bash
   agent-browser --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" open <url>
   ```

### B) Local dev server

1. **Check if a dev server is already running** by curling common ports (3000, 3001, 3003, 5173, 4321, 8080):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   ```

2. **If not running**, detect the start command from `package.json` scripts (look for `dev`, `start`, `serve`) and the package manager (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, else npm):
   ```bash
   pnpm dev &>/tmp/dev-server.log &
   ```

3. **Wait for readiness** — poll the URL every 2s until it responds (max 30s).

## Phase 2: Map the Site

1. Open the homepage:
   ```bash
   agent-browser open <url>
   ```

2. Wait for full page load:
   ```bash
   agent-browser wait --load networkidle
   ```

3. Snapshot the navigation:
   ```bash
   agent-browser snapshot -i -s "header, nav, [role=navigation]" -c
   ```

4. Build a **page list** from discovered links. For live sites, also consider:
   - Footer links (often have sitemap-style links)
   - Category/section pages visible on homepage
   - Common pages: `/about`, `/contact`, `/pricing`, `/login`, `/search`

   Example for otto.de:
   ```
   / → Homepage
   /mode/ → Fashion
   /technik/ → Electronics
   /sale/ → Sale
   ```

   Example for a local app:
   ```
   / → Homepage
   /books → Books
   /table → Table View
   ```

5. If the user asked to document a specific feature or section, focus only on relevant pages.

6. **Ask the user** if the discovered pages look right, or if they want to add/remove any. For live sites, suggest a reasonable subset (5-10 pages max) to avoid excessive screenshotting.

## Phase 3: Screenshot Each Page

For each page in the list:

### Step 1: Navigate and wait
```bash
agent-browser open <url>
agent-browser wait --load networkidle
```

For live sites, add extra wait time for lazy-loaded content:
```bash
agent-browser wait 2000
```

### Step 2: Dismiss overlays (live sites)

Live sites often have popups, banners, or overlays. Before annotating:

```bash
# Try to dismiss common overlays
agent-browser eval "document.querySelectorAll('[class*=overlay], [class*=modal-backdrop], [class*=popup]').forEach(el => el.style.display='none')"
```

### Step 3: Inject annotations

Load the annotation helper and call annotation functions:

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
- **Homepage/landing**: hero section, main CTA, navigation, search
- **Product listing / catalog**: filters, product cards, sorting, pagination
- **Product detail**: images, price, add-to-cart, reviews section
- **Search results**: search input, result cards, filter sidebar
- **Login/signup**: form fields, submit button, OAuth options
- **Dashboard**: metric cards, charts, action buttons
- **Detail/article page**: title, table of contents, content area, sidebar
- **Table/data view**: sortable column headers, filter controls, data area
- **Settings/form**: key form fields, submit button
- **Modal/dialog**: trigger button (before), then the modal content (after)

### Step 4: Take screenshot
```bash
agent-browser screenshot docs/screenshots/<NN>-<page-name>.png
```

Use zero-padded numbering: `01-homepage.png`, `02-category.png`, etc.

### Step 5: Clear annotations for next page
Navigation to a new page clears them automatically.

### Special screenshots

For features that involve interaction (search, menus, modals, hover states):

1. Take initial screenshot
2. Perform the interaction (`agent-browser click`, `agent-browser press`, `agent-browser hover`)
3. Annotate the result
4. Take the "after" screenshot with a descriptive name

Example — search on a live site:
```bash
agent-browser click "input[type=search], [class*=search] input, #search"
agent-browser type "input:focus" "shoes" && sleep 2
agent-browser eval "$ANNOT; annotateMulti([{sel:'[class*=search-result], [class*=suggest]', label:'Search suggestions', type:'box'}])"
agent-browser screenshot docs/screenshots/05-search-results.png
```

Example — mega menu:
```bash
agent-browser hover "nav a:nth-of-type(2)"
agent-browser wait 1000
agent-browser eval "$ANNOT; annotateBox('[class*=mega], [class*=dropdown-menu]', 'Category menu')"
agent-browser screenshot docs/screenshots/03-mega-menu.png
```

## Phase 4: Generate Markdown

For **live sites**, use the domain as the doc name: `docs/otto-de-screenshots.md`
For **local apps**, use: `docs/app-screenshots.md`

```markdown
# <Site/App Name> - Visual Guide

Brief description of the site/app and what it does.

**URL:** <base-url>
**Date:** <today's date>

---

## <Page Name>

Description of this page and what the user can do here.

![<Page Name>](screenshots/<filename>.png)

---

(repeat for each page)
```

**Guidelines:**
- Each section should have 1-3 sentences describing the page purpose
- Reference annotated elements in the description (e.g., "Use the **Search** button (top right) to find products")
- Group related pages together
- Use `---` between sections for visual separation
- For live sites, note anything interesting about the UX patterns used

## Phase 5: Cleanup

```bash
agent-browser close
```

For local apps, keep the dev server running (user may want to continue working).

## Selector Tips

When annotations can't find an element:
- Use `agent-browser snapshot -i -s "<container>"` to discover elements and their refs
- Use `agent-browser eval "document.querySelectorAll('<sel>').length"` to test selectors
- Prefer semantic selectors: `header nav`, `main h1`, `[role="dialog"]`, `aside`
- For nth-child buttons: `header button:nth-of-type(2)`
- For live sites with obfuscated class names, use `[data-testid]`, `[aria-label]`, or structural selectors

## Live Site Tips

- **Cookie banners**: Always dismiss before screenshotting. Try multiple selectors — sites use various patterns.
- **Lazy loading**: Scroll the page first to trigger lazy-loaded images: `agent-browser scroll down 1000 && agent-browser scroll up 1000 && sleep 2`
- **Responsive**: Default viewport is 1280x720. For mobile docs: `agent-browser set viewport 390 844 3` (iPhone 14 Pro)
- **Rate limiting**: Add `sleep 2` between page navigations to avoid triggering bot protection
- **Dynamic content**: Use `agent-browser wait --fn "document.querySelectorAll('.product-card').length > 0"` to wait for specific content
- **Geolocation**: Some sites show different content by region: `agent-browser set geo 52.52 13.405` (Berlin)

## Troubleshooting

- **Timeout on page load**: Live sites can be slow — increase wait: `agent-browser wait --load networkidle` or `agent-browser wait 5000`
- **Consent dialog blocking**: Check for iframes — cookie banners are often in iframes: `agent-browser frame "[class*=consent]"` then click accept, then `agent-browser frame main`
- **Element not found**: Use `agent-browser eval` to test the selector first
- **Bot protection / CAPTCHA**: Try `--user-agent` flag, or ask user to use `--headed` mode and solve manually
- **Screenshot blank/error**: Dev server may have crashed — check logs, restart
- **Annotations overlapping**: Reduce number of annotations per screenshot, or use different pages for different callouts
