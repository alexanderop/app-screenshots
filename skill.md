---
name: screenshotting-apps
description: >
  Generates annotated screenshot documentation for web apps and websites — local dev servers
  or live sites. Use when asked to "screenshot the app", "document the app", "visual docs",
  "screenshot documentation", "show me the app", "screenshot <url>", or "document this website".
---

# Annotated Screenshot Documentation

Generate a markdown document with annotated screenshots of any web app or live website.

## Prerequisites

- `agent-browser` CLI installed globally (`npm i -g agent-browser && agent-browser install`)

## Phase 1: Determine the Target

### A) Live website

1. Normalize URL (add `https://` if missing):
   ```bash
   agent-browser open https://example.com && agent-browser wait --load networkidle
   ```
2. Dismiss cookie/consent banners using semantic locators (most reliable):
   ```bash
   agent-browser find text "Accept" click
   ```
   Or snapshot to find the accept button ref, then click the ref directly:
   ```bash
   agent-browser snapshot -i -s "[role=dialog], [class*=cookie], [class*=consent]" -c
   agent-browser click @e1  # Use the ref from snapshot
   ```
   Verify it's gone: `agent-browser is visible "[role=dialog]"` or `agent-browser wait "[role=dialog]" --state hidden`
3. For login walls or anti-bot issues, see [references/live-sites.md](references/live-sites.md).

### B) Local dev server

1. Find or start the dev server (check ports 3000/5173/4321/8080, or start via `package.json`)
2. For self-signed certs: `agent-browser --ignore-https-errors open https://localhost:<port>`

## Phase 2: Map the Site

1. Open homepage: `agent-browser open <url> && agent-browser wait --load networkidle`
2. Take a quick auto-annotated screenshot to survey the page — this labels all interactive elements with numbered refs:
   ```bash
   agent-browser screenshot --annotate docs/screenshots/_survey.png
   ```
   Read the output legend to understand what's on the page (buttons, links, inputs mapped to `@e` refs).
3. Snapshot navigation to discover pages:
   ```bash
   agent-browser snapshot -i -s "header, nav, [role=navigation]" -c
   ```
   For deep DOM: `agent-browser snapshot -i -c -d 3`
4. For SPAs with client-side routing: also check route definitions in the source code (`grep -r "path:" src/router` or similar) since not all routes may be linked from the nav.
5. **Ask the user** to confirm the page list. For live sites, suggest 5-10 pages max.

## Phase 3: Screenshot Each Page

Workflow per page: validate selectors → annotate → check for FAILED → verify screenshot → fix or continue.

**Setup (run once before all screenshots):**
```bash
agent-browser set viewport 1440 900
export AGENT_BROWSER_SCREENSHOT_DIR=docs/screenshots
```

Block ads and tracking scripts that create overlays or slow page loads (live sites):
```bash
agent-browser network route "**/*.doubleclick.net/**" --abort
agent-browser network route "**/googlesyndication.com/**" --abort
agent-browser network route "**/analytics.js" --abort
agent-browser network route "**/gtm.js" --abort
```

Resolve the annotation script path (checks common install locations):
```bash
ANNOT_JS="$(find . .claude .agents ~/skills -path '*/app-screenshots/references/annotate.js' 2>/dev/null | head -1)"
[ -z "$ANNOT_JS" ] && echo "ERROR: annotate.js not found — check skill installation"
```

For each page:

### Step 1: Navigate

```bash
agent-browser open <url> && agent-browser wait --load networkidle
```

For live sites, add `agent-browser wait 2000` for lazy-loaded content. Chain when you don't need intermediate output: `agent-browser open <url> && agent-browser wait --load networkidle && agent-browser wait 2000`

### Step 2: Dismiss cookie/consent banners (live sites)

```bash
agent-browser find text "Accept" click
agent-browser wait "[class*=overlay]" --state hidden
```

For complex or iframed banners, see [references/live-sites.md](references/live-sites.md).

### Step 3: Validate selectors BEFORE annotating

**Always test selectors first.** Failed selectors produce invisible annotations.

Use `eval --stdin` with heredoc for complex JS (avoids shell quoting issues):

```bash
agent-browser eval --stdin <<'EVALEOF'
const sels = ['selector1', 'selector2'];
sels.map(s => {
  const el = document.querySelector(s);
  if (!el) return 'MISSING: ' + s;
  const r = el.getBoundingClientRect();
  return 'OK: ' + s + ' (' + Math.round(r.width) + 'x' + Math.round(r.height) + ')';
}).join('\n')
EVALEOF
```

Quick match count check: `agent-browser get count "<selector>"`

If MISSING, use `agent-browser snapshot -i -c` to discover correct selectors and refs. **Do not annotate with broken selectors.** See [references/selectors.md](references/selectors.md) for tips.

For elements below the fold, scroll them into view first: `agent-browser scrollintoview "<selector>"`

### Step 4: Inject annotations

Use `eval --stdin` to inject the annotation script safely:

```bash
agent-browser eval --stdin <<EVALEOF
$(cat "$ANNOT_JS")
annotateMulti([
  {sel: 'selector', label: 'Label', type: 'box'},
  {sel: 'selector', label: 'Label', type: 'click'}
])
EVALEOF
```

**CRITICAL:** If output starts with `FAILED:`, fix selectors before screenshotting. Clear and retry:
```bash
agent-browser eval "clearAnnotations()"
```

**Annotation types:**
- `click` — filled circle + arrow + numbered label. Use for buttons, links, inputs.
- `box` — dashed border + numbered label. Use for sections, cards, containers.
- `circle` (default) — capped-radius dashed circle + arrow + numbered label. General callouts.

Colors auto-rotate: red, blue, green, amber, purple. Each annotation is auto-numbered (1, 2, 3...) for cross-referencing in markdown.

**MAX 3 annotations per screenshot.** Split into multiple screenshots if needed (e.g., `03a-top.png`, `03b-actions.png`).

**Type selection rules:**
- `click` for small elements (buttons, links, icons) — capped circle won't explode
- `box` for medium regions (cards, form groups, sidebars) — follows element shape
- **Never** use `circle` or `box` on full-width elements (navbars, headers) — annotate specific items within them instead

**What to annotate per page type:**
- **Homepage**: hero CTA, search input, one nav example
- **Product listing**: one product card, filter toggle, sort dropdown
- **Product detail**: price, add-to-cart, size/variant selector
- **Search results**: search input, one result card, filter sidebar
- **Dashboard**: one metric card, one chart, primary action
- **Table/data view**: column header, filter control, data area
- **Settings/form**: key form fields, submit button

### Step 5: Screenshot

```bash
agent-browser screenshot <NN>-<page-name>.png
```

Zero-padded numbering: `01-homepage.png`, `02-category.png`, etc. Use `--full` for full-page screenshots when content extends below the fold.

### Step 6: Verify screenshot quality

**Read the screenshot file you just captured** and check:
- Annotations are visible and not overlapping each other
- Labels are not cut off at viewport edges
- The page content loaded correctly (no spinners, broken images)
- Cookie banners or overlays are not blocking the view

If any issues: `agent-browser eval "clearAnnotations()"`, fix the problem, re-annotate, and re-screenshot. Do not proceed with a bad screenshot.

### Interactive screenshots

For search, menus, modals, hover states — use the snapshot → refs → interact pattern:

```bash
# 1. Snapshot to get refs
agent-browser snapshot -i
# 2. Interact using refs (more reliable than CSS selectors)
agent-browser click @e5          # Click search input by ref
agent-browser type @e5 "shoes"
agent-browser wait 2000
# 3. Annotate the result
agent-browser eval --stdin <<EVALEOF
$(cat "$ANNOT_JS")
annotateMulti([{sel: '[class*=suggest]', label: 'Suggestions', type: 'box'}])
EVALEOF
# 4. Screenshot
agent-browser screenshot 05-search-results.png
# 5. Verify — read the screenshot and check quality
```

Note: Refs inside iframes work directly — no `frame` switching needed for interaction.

### Recording interactive flows (optional)

For complex interactions (checkout flows, multi-step wizards), record a video alongside screenshots:

```bash
agent-browser record start docs/screenshots/checkout-flow.webm
# ... perform the interaction steps, taking screenshots along the way ...
agent-browser record stop
```

Link the video in the markdown: `[Watch checkout flow](screenshots/checkout-flow.webm)`

### Mobile / responsive screenshots

To document mobile layouts:

```bash
# Use device emulation (sets viewport + user agent together)
agent-browser set device "iPhone 14"
```

Then follow the same annotate → screenshot → verify workflow. Name files with a `-mobile` suffix: `01-homepage-mobile.png`.

To return to desktop: `agent-browser set viewport 1440 900`

Note: On narrow viewports, prefer max 2 annotations per screenshot to avoid crowding.

## Phase 4: Generate Markdown

Filename: `docs/<domain>-screenshots.md` (live sites) or `docs/app-screenshots.md` (local).

Use numbered references **(1)**, **(2)**, **(3)** in descriptions to cross-reference the annotation badges visible in each screenshot.

```markdown
# <Site/App Name> - Visual Guide

Brief description of the site/app.

**URL:** <base-url>
**Date:** <today's date>

**Annotation key:** Red = primary actions, Blue = secondary elements, Green = content areas

---

## <Page Name>

1-3 sentences describing the page. Reference annotations by number:
"The **Search bar** (1) supports autocomplete. Use the **Category nav** (2) to browse departments.
The **Hero banner** (3) rotates seasonal promotions."

![<Page Name>](screenshots/<filename>.png)

---
```

## Phase 5: Compare environments (optional)

When documenting differences between staging and production, or before/after a redesign:

```bash
# Visual pixel diff between two URLs
agent-browser diff url https://staging.example.com https://prod.example.com

# Diff against a baseline screenshot
agent-browser diff screenshot --baseline docs/screenshots/01-homepage-before.png

# Accessibility tree diff (detect structural changes)
agent-browser diff snapshot
```

Include diff screenshots in the markdown to highlight what changed.

## Phase 6: Cleanup

```bash
# Remove network intercepts
agent-browser network unroute
agent-browser close
```

## Reference

- **Selector tips and troubleshooting**: See [references/selectors.md](references/selectors.md)
- **Live site tips** (cookies, lazy loading, rate limiting, geo): See [references/live-sites.md](references/live-sites.md)
