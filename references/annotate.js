// Helper: inject annotation overlay via agent-browser eval
// Usage: agent-browser eval "$(cat docs/screenshots/annotate.js) annotate('.my-selector', 'Label text')"
//
// Annotations supported:
//   annotate(selector, label)           - red circle + arrow + label
//   annotateClick(selector, label)      - red circle + "click" cursor icon + label
//   annotateMulti([{sel, label}, ...])  - multiple annotations at once
//   clearAnnotations()                  - remove all annotations

function _createOverlay() {
  let overlay = document.getElementById('__annotations');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__annotations';
    overlay.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;top:0;left:0;width:100%;height:100%;';
    overlay.innerHTML = '<svg id="__ann_svg" width="100%" height="100%" style="position:absolute;top:0;left:0"><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker></defs></svg>';
    document.body.appendChild(overlay);
  }
  return document.getElementById('__ann_svg');
}

function annotate(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const svg = _createOverlay();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = Math.max(rect.width, rect.height) / 2 + 10;

  // Arrow start position (offset from circle)
  const ax = cx + r + 30;
  const ay = cy - r - 10;

  svg.innerHTML += `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="6,3"/>
    <line x1="${ax}" y1="${ay}" x2="${cx + r * 0.6}" y2="${cy - r * 0.6}" stroke="${color}" stroke-width="2.5" marker-end="url(#arrowhead)"/>
    <rect x="${ax + 2}" y="${ay - 22}" width="${label.length * 8.5 + 16}" height="24" rx="4" fill="${color}"/>
    <text x="${ax + 10}" y="${ay - 5}" fill="white" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `;
  return 'annotated: ' + label;
}

function annotateClick(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const svg = _createOverlay();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const r = Math.max(rect.width, rect.height) / 2 + 10;

  const ax = cx + r + 30;
  const ay = cy - r - 10;

  svg.innerHTML += `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(239,68,68,0.1)" stroke="${color}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="${color}"/>
    <line x1="${ax}" y1="${ay}" x2="${cx + r * 0.6}" y2="${cy - r * 0.6}" stroke="${color}" stroke-width="2.5" marker-end="url(#arrowhead)"/>
    <rect x="${ax + 2}" y="${ay - 22}" width="${label.length * 8.5 + 16}" height="24" rx="4" fill="${color}"/>
    <text x="${ax + 10}" y="${ay - 5}" fill="white" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `;
  return 'annotated click: ' + label;
}

function annotateBox(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const svg = _createOverlay();
  const pad = 6;

  svg.innerHTML += `
    <rect x="${rect.x - pad}" y="${rect.y - pad}" width="${rect.width + pad * 2}" height="${rect.height + pad * 2}" fill="none" stroke="${color}" stroke-width="2.5" rx="6" stroke-dasharray="8,4"/>
    <rect x="${rect.x - pad}" y="${rect.y - pad - 24}" width="${label.length * 8.5 + 16}" height="22" rx="4" fill="${color}"/>
    <text x="${rect.x - pad + 8}" y="${rect.y - pad - 7}" fill="white" font-size="12" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `;
  return 'annotated box: ' + label;
}

function annotateMulti(items) {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
  return items.map((item, i) => {
    const color = colors[i % colors.length];
    if (item.type === 'click') return annotateClick(item.sel, item.label, color);
    if (item.type === 'box') return annotateBox(item.sel, item.label, color);
    return annotate(item.sel, item.label, color);
  }).join('; ');
}

function clearAnnotations() {
  const el = document.getElementById('__annotations');
  if (el) el.remove();
  return 'cleared';
}
