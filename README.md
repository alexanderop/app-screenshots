# app-screenshots

A Claude Code skill that generates annotated screenshot documentation for any web app. Point it at your app and get a markdown file with screenshots showing every page, with red circles, arrows, and labels highlighting key UI elements.

## What it does

1. Starts your dev server (auto-detects `pnpm dev`, `npm run dev`, etc.)
2. Discovers all pages from your app's navigation
3. Takes screenshots of each page with SVG annotations injected via [agent-browser](https://github.com/vercel-labs/agent-browser)
4. Generates a single markdown doc with all screenshots and descriptions

## Example output

```markdown
# My App - Visual Guide

## Homepage

The homepage shows recent content. Use the **Search** button (top right) to find items.

![Homepage](screenshots/01-homepage.png)
```

Screenshots include:
- **Box annotations** — dashed borders around sections (nav, content areas)
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

Clone this repo into your project's `.claude/skills/` or `.agents/skills/` directory:

```bash
git clone https://github.com/alexanderop/app-screenshots .claude/skills/app-screenshots
```

Or symlink it:

```bash
git clone https://github.com/alexanderop/app-screenshots ~/skills/app-screenshots
ln -s ~/skills/app-screenshots .claude/skills/app-screenshots
```

## Usage

Just ask Claude Code:

- "Screenshot the app"
- "Document the app with screenshots"
- "Give me a visual guide of the dashboard"
- "Describe the search feature with screenshots"

Claude will discover your app, take annotated screenshots, and generate `docs/app-screenshots.md`.

## How annotations work

The skill injects an SVG overlay into the page via `agent-browser eval` before taking each screenshot. The overlay draws circles, arrows, and labels on top of the page using bounding box coordinates from the DOM.

Three annotation types are available:

| Type | Look | Use for |
|------|------|---------|
| `box` | Dashed border + label | Sections, containers, areas |
| `click` | Filled circle + arrow + label | Buttons, links, interactive elements |
| `circle` | Dashed circle + arrow + label | General callouts |

See `references/annotate.js` for the full API.

## License

MIT
