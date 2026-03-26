# Live Site Tips

## Cookie banners

Always dismiss before screenshotting. Approaches in order of reliability:

**1. Semantic locator (simplest):**
```bash
agent-browser find text "Accept" click
agent-browser find text "Akzeptieren" click   # German sites
agent-browser find text "Allow" click
```

**2. Snapshot refs (most reliable for complex dialogs):**
```bash
agent-browser snapshot -i -s "[role=dialog]" -c
agent-browser click @e1   # Click the accept button ref directly
```

**3. Iframed banners:**
Refs from snapshots carry iframe context — interact directly without frame switching:
```bash
agent-browser snapshot -i    # Iframe content is auto-inlined
agent-browser click @e3      # Click accept button even if it's inside an iframe
```

If direct ref interaction doesn't work, switch frames manually:
```bash
agent-browser frame @e2     # Enter iframe by ref
agent-browser snapshot -i   # Get refs inside iframe
agent-browser click @e1     # Click accept
agent-browser frame main    # Return to main frame
```

Verify banner is gone: `agent-browser is visible "[role=dialog]"` (should return false)

## Login walls

If a site is login-walled, screenshot public pages first and ask the user about auth before proceeding.

## Authentication

For sites requiring login:

```bash
# Connect to user's existing browser (they're already logged in)
agent-browser --auto-connect open https://app.example.com

# Or save/restore auth state for reuse
agent-browser state save ./auth.json    # After manual login
agent-browser state load ./auth.json    # In future sessions

# Or use session persistence (auto-saves/restores between runs)
agent-browser --session-name mysite open https://app.example.com
```

## Lazy loading

Scroll to trigger lazy-loaded images before screenshotting:
```bash
agent-browser scroll down 1000 && agent-browser scroll up 1000 && sleep 2
```

For specific elements below the fold:
```bash
agent-browser scrollintoview ".footer-section"
```

## Waiting for content

```bash
agent-browser wait --text "Products"                    # Wait for specific text
agent-browser wait ".product-card"                      # Wait for element
agent-browser wait "#spinner" --state hidden            # Wait for loading to finish
agent-browser wait --fn "document.images.length > 5"    # Wait for JS condition
```

## Blocking ads, trackers, and overlays

Use network interception to prevent ad scripts, tracking pixels, and marketing overlays from interfering with screenshots:

```bash
# Block common ad/tracking networks
agent-browser network route "**/*.doubleclick.net/**" --abort
agent-browser network route "**/googlesyndication.com/**" --abort
agent-browser network route "**/analytics.js" --abort
agent-browser network route "**/gtm.js" --abort

# Block newsletter/marketing popups (site-specific)
agent-browser network route "**/popup-widget*" --abort
agent-browser network route "**/intercom-frame*" --abort

# View intercepted requests to diagnose issues
agent-browser network requests --filter blocked

# Remove all intercepts when done
agent-browser network unroute
```

This runs during setup (Phase 3 of skill.md) and prevents overlays from appearing mid-screenshot.

## Anti-bot protection

Some sites block headless browsers. Use a standard user-agent:
```bash
agent-browser --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" open <url>
```

If blocked by CAPTCHA, ask the user to solve it manually with `--headed` mode.

## Rate limiting

Add `sleep 2` between page navigations to avoid bot protection triggers.

## Geolocation

Some sites vary by region:
```bash
agent-browser set geo 52.52 13.405  # Berlin
```

## Viewport & device emulation

- Default 1280x720 is too cramped for annotations — use `1440 900`
- For mobile docs, use device emulation: `agent-browser set device "iPhone 14"` (sets viewport + user agent in one step)
- For retina/HiDPI: `agent-browser set viewport 1440 900 2` (2x pixel density, same CSS layout)
- Full-page screenshots: `agent-browser screenshot --full 01-homepage-full.png`

### Mobile-specific tips

- On narrow viewports, limit to **2 annotations max** per screenshot — labels crowd quickly
- Some sites serve completely different markup for mobile user agents; re-test selectors after switching to device emulation
- Hamburger menus: snapshot, click the menu ref, wait for animation, then annotate the open menu
- Sticky headers can overlap annotations — scroll past them or use `box` type on content below the header

## Comparing environments

Use built-in diff commands to compare staging vs production, or before/after a change:

```bash
# Visual pixel diff between two URLs
agent-browser diff url https://staging.example.com https://prod.example.com

# Diff current page against a saved baseline screenshot
agent-browser diff screenshot --baseline before.png

# Accessibility tree diff (structural changes, not visual)
agent-browser diff snapshot
```

## Debugging rendering issues

If a page doesn't look right:
```bash
agent-browser console            # View console messages (log, error, warn)
agent-browser errors             # View uncaught JavaScript exceptions
agent-browser get text body      # Get full page text to understand content
```
