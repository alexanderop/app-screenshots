# app-screenshots

A Claude Code skill that generates annotated screenshot documentation for any web app or live website. Point it at your local dev server **or** any public URL (otto.de, github.com, etc.) and get a markdown file with screenshots showing every page, with red circles, arrows, and labels highlighting key UI elements.

## What it does

1. **Local apps**: auto-detects and starts your dev server (`pnpm dev`, `npm run dev`, etc.)
   **Live sites**: navigates directly to the URL, handles cookie banners and popups
2. Discovers all pages from the site's navigation
3. Takes screenshots of each page with SVG annotations injected via [agent-browser](https://github.com/vercel-labs/agent-browser)
4. Generates a single markdown doc with all screenshots and descriptions

## Example prompts

```
"Screenshot the app"
"Document otto.de with screenshots"
"Give me a visual guide of the dashboard"
"Describe the search feature on amazon.de with screenshots"
"Screenshot my app's checkout flow"
```

## Example output

```markdown
# otto.de - Visual Guide

**URL:** https://www.otto.de
**Date:** 2026-03-24

---

## Homepage

The landing page features a hero banner with seasonal promotions.
Use the **Search** bar (top center) to find products.
The **Category navigation** (below header) provides access to all departments.

![Homepage](screenshots/01-homepage.png)
```

Screenshots include:
- **Box annotations** — dashed borders around sections (nav, content areas, product grids)
- **Click annotations** — circles with arrows pointing to buttons and interactive elements
- **Auto-rotating colors** — red, blue, green, amber, purple for multiple annotations

## Prerequisites

Install [agent-browser](https://github.com/vercel-labs/agent-browser) globally:

```bash
npm install -g agent-browser
agent-browser install
```

## Installation

### With `npx skills` (recommended)

```bash
npx skills add alexanderop/app-screenshots
```

### Manual

Clone into your project's `.claude/skills/` directory:

```bash
git clone https://github.com/alexanderop/app-screenshots .claude/skills/app-screenshots
```

Or symlink from a shared location:

```bash
git clone https://github.com/alexanderop/app-screenshots ~/skills/app-screenshots
ln -s ~/skills/app-screenshots .claude/skills/app-screenshots
```

## Usage

Just ask Claude Code:

- **Local app**: "Screenshot the app" — auto-starts dev server, discovers pages
- **Live site**: "Document otto.de with screenshots" — navigates to site, handles popups
- **Specific feature**: "Describe the search feature with screenshots" — focuses on relevant pages
- **Mobile view**: Ask for mobile screenshots — uses device emulation

Claude will navigate the site, take annotated screenshots, and generate the markdown doc.

## How annotations work

The skill injects an SVG overlay into the page via `agent-browser eval` before taking each screenshot. The overlay draws circles, arrows, and labels on top of the page using bounding box coordinates from the DOM.

Three annotation types are available:

| Type | Look | Use for |
|------|------|---------|
| `box` | Dashed border + label | Sections, containers, areas |
| `click` | Filled circle + arrow + label | Buttons, links, interactive elements |
| `circle` | Dashed circle + arrow + label | General callouts |

See `references/annotate.js` for the full API.

## Live site features

- Auto-dismisses cookie banners and consent dialogs
- Handles lazy-loaded content by scrolling before screenshotting
- Adds delays between navigations to avoid bot protection
- Supports geolocation for region-specific content
- Works with responsive viewports for mobile documentation

## License

MIT
