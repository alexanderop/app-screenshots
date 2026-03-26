# Selector Tips & Troubleshooting

## Finding selectors

Prefer the **snapshot → refs** workflow over raw CSS selectors:

```bash
agent-browser snapshot -i                    # Get all interactive elements with @refs
agent-browser snapshot -i -s "header nav"    # Scope to a container
agent-browser snapshot -i -c -d 3           # Compact, depth-limited (for large pages)
agent-browser snapshot -i --json             # JSON output for programmatic parsing
```

Use refs (`@e1`, `@e2`) for clicks and fills — they're more reliable than CSS selectors and carry iframe context automatically (no `frame` switching needed).

**Fallback to CSS selectors** only for annotation injection (annotate.js requires CSS selectors).

### Semantic locators (alternative to refs and CSS selectors)

When refs are stale or CSS selectors are obfuscated:

```bash
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find role button click --name "Submit"
agent-browser find testid "submit-btn" click
```

### CSS selector tips

- Prefer semantic selectors: `header nav`, `main h1`, `[role="dialog"]`, `aside`
- For nth-child: `header button:nth-of-type(2)`
- For obfuscated class names: use `[data-testid]`, `[aria-label]`, or structural selectors
- Test match count: `agent-browser get count "<selector>"`
- Check visibility: `agent-browser is visible "<selector>"`
- Verify position: `agent-browser eval "document.querySelector('<sel>')?.getBoundingClientRect()"`

### Below-the-fold elements

Scroll elements into view before annotating:
```bash
agent-browser scrollintoview "<selector>"
```

## Strict mode errors

`snapshot -s` requires a single matching element. If "strict mode violation: resolved to N elements":
- Bad: `header` (matches multiple headers)
- Good: `header:first-child` or scope to unique parent
- Test first: `agent-browser get count "<selector>"` (should return 1)

## Annotation vs snapshot selectors

- `snapshot -s` — strict mode, single match required
- `annotate()` — uses `querySelector`, picks first match

## Ref lifecycle

Refs are invalidated when the page changes. **Always re-snapshot after:**
- Clicking links/buttons that navigate
- Form submissions
- Dynamic content loading (dropdowns, modals)

```bash
agent-browser click @e5              # Navigates to new page
agent-browser snapshot -i            # MUST re-snapshot for fresh refs
agent-browser click @e1              # Use new refs
```

## Troubleshooting

- **Timeout on page load**: Use `agent-browser wait --load networkidle` or `agent-browser wait 5000`. For consistently slow sites, increase the default: `export AGENT_BROWSER_DEFAULT_TIMEOUT=45000`
- **Consent dialog blocking**: Try `agent-browser find text "Accept" click`. If iframed, refs from snapshot carry iframe context — use `agent-browser click @e2` directly.
- **Element not found**: Check `annotateMulti` output for `FAILED:` prefix. Test with `agent-browser get count "<sel>"` and `agent-browser is visible "<sel>"`.
- **Bot protection / CAPTCHA**: Try `--user-agent` flag, or ask user to use `--headed` mode and solve manually
- **Screenshot blank/error**: Check `agent-browser console` and `agent-browser errors` for page errors. Dev server may have crashed — check logs, restart.
- **Annotations overlapping**: The script has auto-overlap avoidance, but still reduce to max 3 per screenshot for readability. If overlaps persist, split into multiple files.
- **Giant circles on wide elements**: Use `click` type on specific items within wide containers, or `box` type
- **Labels cut off at edge**: Annotation script auto-positions labels, but very edge elements may still clip. Use `agent-browser scrollintoview` or enlarge viewport.
- **Dialog blocking commands**: If commands time out unexpectedly, check `agent-browser dialog status` — a JS alert/confirm may be pending. Dismiss with `agent-browser dialog accept`.
- **Full-page screenshot annotations misplaced**: Annotations use absolute positioning with scroll offsets. If annotating below-the-fold elements, scroll them into view with `agent-browser scrollintoview` before annotating — `getBoundingClientRect` needs the element visible to return correct coords.
- **Numbering resets unexpectedly**: `clearAnnotations()` resets the counter. If you need continuous numbering across multiple annotation calls on the same page, don't clear between them.
