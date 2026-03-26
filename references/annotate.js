// Helper: inject annotation overlay via agent-browser eval
// Usage: agent-browser eval "$(cat references/annotate.js); annotate('.my-selector', 'Label text')"
//
// Annotations supported:
//   annotate(selector, label)           - capped circle + smart arrow + numbered label
//   annotateClick(selector, label)      - filled circle + arrow + numbered label (for buttons/links)
//   annotateBox(selector, label)        - dashed border + numbered label (for sections/containers)
//   annotateMulti([{sel, label}, ...])  - multiple annotations at once (recommended)
//   clearAnnotations()                  - remove all annotations

// Module-level state for overlap avoidance
const __ann_placed = [];
let __ann_counter = 0;

function _createOverlay() {
  let overlay = document.getElementById('__annotations');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__annotations';
    // Use absolute positioning so annotations work with --full page screenshots
    overlay.style.cssText = 'position:absolute;z-index:99999;pointer-events:none;top:0;left:0;width:100%;height:100%;overflow:visible;';
    overlay.innerHTML = '<svg id="__ann_svg" width="100%" height="100%" style="position:absolute;top:0;left:0;overflow:visible"><defs></defs></svg>';
    document.body.appendChild(overlay);
  }
  return document.getElementById('__ann_svg');
}

function _ensureArrowMarker(svg, color) {
  const id = 'arrow-' + color.replace('#', '');
  if (!svg.querySelector('#' + id)) {
    const defs = svg.querySelector('defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', color);
    marker.appendChild(polygon);
    defs.appendChild(marker);
  }
  return 'url(#arrow-' + color.replace('#', '') + ')';
}

// Measure label width using canvas for accuracy
function _measureLabel(text, fontSize) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  return ctx.measureText(text).width + 16; // 8px padding each side
}

// Check if a rect overlaps any previously placed label
function _overlapsPlaced(x, y, w, h) {
  const pad = 4;
  for (const p of __ann_placed) {
    if (x < p.x + p.w + pad && x + w + pad > p.x &&
        y < p.y + p.h + pad && y + h + pad > p.y) {
      return true;
    }
  }
  return false;
}

// Pick the best position for a label, avoiding overlaps with previously placed labels
function _labelPos(cx, cy, r, labelW, labelH) {
  const vw = document.documentElement.scrollWidth || window.innerWidth;
  const vh = document.documentElement.scrollHeight || window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const pad = 8;
  const gap = 20;

  // Candidates: top-right, top-left, bottom-right, bottom-left, far-right, far-left
  const candidates = [
    { ax: cx + r + gap, ay: cy - r - gap },                    // top-right
    { ax: cx - r - gap - labelW, ay: cy - r - gap },           // top-left
    { ax: cx + r + gap, ay: cy + r + gap + labelH },           // bottom-right
    { ax: cx - r - gap - labelW, ay: cy + r + gap + labelH },  // bottom-left
    { ax: cx + r + gap + 40, ay: cy },                         // far-right
    { ax: cx - r - gap - labelW - 40, ay: cy },                // far-left
  ];

  // Score each: prefer on-screen + no overlap with existing labels
  for (const c of candidates) {
    const onScreen = c.ax >= pad && c.ax + labelW <= vw - pad &&
                     c.ay - labelH >= pad && c.ay <= vh - pad;
    if (onScreen && !_overlapsPlaced(c.ax, c.ay - labelH, labelW, labelH)) {
      return c;
    }
  }

  // Second pass: accept on-screen even with overlap
  for (const c of candidates) {
    const onScreen = c.ax >= pad && c.ax + labelW <= vw - pad &&
                     c.ay - labelH >= pad && c.ay <= vh - pad;
    if (onScreen) return c;
  }

  // Fallback: clamp top-right to viewport, then nudge vertically to avoid overlap
  let best = {
    ax: Math.min(Math.max(pad, candidates[0].ax), vw - labelW - pad),
    ay: Math.min(Math.max(labelH + pad, candidates[0].ay), vh - pad)
  };

  // Try vertical nudging if overlapping
  for (let nudge = 0; nudge < 200; nudge += labelH + 4) {
    if (!_overlapsPlaced(best.ax, best.ay - labelH + nudge, labelW, labelH)) {
      best.ay += nudge;
      break;
    }
    if (!_overlapsPlaced(best.ax, best.ay - labelH - nudge, labelW, labelH)) {
      best.ay -= nudge;
      break;
    }
  }

  return best;
}

// Append SVG content without re-parsing existing content
function _appendSVG(svg, html) {
  const temp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  temp.innerHTML = html;
  while (temp.firstChild) {
    svg.appendChild(temp.firstChild);
  }
}

// Get element coordinates adjusted for scroll (works with --full screenshots)
function _getCoords(rect) {
  return {
    x: rect.x + window.scrollX,
    y: rect.y + window.scrollY,
    width: rect.width,
    height: rect.height,
    cx: rect.x + window.scrollX + rect.width / 2,
    cy: rect.y + window.scrollY + rect.height / 2
  };
}

function annotate(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const coords = _getCoords(rect);
  const svg = _createOverlay();
  const marker = _ensureArrowMarker(svg, color);
  const { cx, cy } = coords;
  const rawR = Math.max(rect.width, rect.height) / 2 + 10;
  const r = Math.min(Math.max(rawR, 20), 80);

  __ann_counter++;
  const num = __ann_counter;
  const fullLabel = `${num}  ${label}`;

  const labelW = _measureLabel(fullLabel, 13);
  const labelH = 24;
  const pos = _labelPos(cx, cy, r, labelW, labelH);

  // Register this label placement for overlap avoidance
  __ann_placed.push({ x: pos.ax, y: pos.ay - labelH, w: labelW, h: labelH });

  const angle = Math.atan2(cy - pos.ay, cx - pos.ax);
  const arrowEndX = cx - Math.cos(angle) * r * 0.85;
  const arrowEndY = cy - Math.sin(angle) * r * 0.85;

  _appendSVG(svg, `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="6,3"/>
    <line x1="${pos.ax + labelW / 2}" y1="${pos.ay - labelH / 2}" x2="${arrowEndX}" y2="${arrowEndY}" stroke="${color}" stroke-width="2.5" marker-end="${marker}"/>
    <rect x="${pos.ax}" y="${pos.ay - labelH}" width="${labelW}" height="${labelH}" rx="4" fill="${color}"/>
    <circle cx="${pos.ax + 14}" cy="${pos.ay - labelH / 2}" r="9" fill="white" opacity="0.9"/>
    <text x="${pos.ax + 14}" y="${pos.ay - labelH / 2 + 4.5}" fill="${color}" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${num}</text>
    <text x="${pos.ax + 28}" y="${pos.ay - 7}" fill="white" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `);
  return 'annotated #' + num + ': ' + label;
}

function annotateClick(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const coords = _getCoords(rect);
  const svg = _createOverlay();
  const marker = _ensureArrowMarker(svg, color);
  const { cx, cy } = coords;
  const rawR = Math.max(rect.width, rect.height) / 2 + 10;
  const r = Math.min(Math.max(rawR, 20), 80);

  __ann_counter++;
  const num = __ann_counter;
  const fullLabel = `${num}  ${label}`;

  const labelW = _measureLabel(fullLabel, 13);
  const labelH = 24;
  const pos = _labelPos(cx, cy, r, labelW, labelH);

  __ann_placed.push({ x: pos.ax, y: pos.ay - labelH, w: labelW, h: labelH });

  const angle = Math.atan2(cy - pos.ay, cx - pos.ax);
  const arrowEndX = cx - Math.cos(angle) * r * 0.85;
  const arrowEndY = cy - Math.sin(angle) * r * 0.85;

  const fillColor = color + '18';

  _appendSVG(svg, `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${color}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="${color}"/>
    <line x1="${pos.ax + labelW / 2}" y1="${pos.ay - labelH / 2}" x2="${arrowEndX}" y2="${arrowEndY}" stroke="${color}" stroke-width="2.5" marker-end="${marker}"/>
    <rect x="${pos.ax}" y="${pos.ay - labelH}" width="${labelW}" height="${labelH}" rx="4" fill="${color}"/>
    <circle cx="${pos.ax + 14}" cy="${pos.ay - labelH / 2}" r="9" fill="white" opacity="0.9"/>
    <text x="${pos.ax + 14}" y="${pos.ay - labelH / 2 + 4.5}" fill="${color}" font-size="12" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${num}</text>
    <text x="${pos.ax + 28}" y="${pos.ay - 7}" fill="white" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `);
  return 'annotated click #' + num + ': ' + label;
}

function annotateBox(selector, label, color = '#ef4444') {
  const el = document.querySelector(selector);
  if (!el) return 'Element not found: ' + selector;
  const rect = el.getBoundingClientRect();
  const coords = _getCoords(rect);
  const svg = _createOverlay();
  const pad = 6;
  const vw = document.documentElement.scrollWidth || window.innerWidth;

  const x = Math.max(0, coords.x - pad);
  const y = Math.max(0, coords.y - pad);
  const w = Math.min(rect.width + pad * 2, vw - x);
  const h = rect.height + pad * 2;

  __ann_counter++;
  const num = __ann_counter;
  const fullLabel = `${num}  ${label}`;

  const labelW = _measureLabel(fullLabel, 12);
  const labelH = 22;

  // Place label above box, but check for overlap and nudge if needed
  let labelX = Math.min(Math.max(0, x), vw - labelW);
  let labelY = Math.max(22, y);

  // Check overlap and try alternative positions
  if (_overlapsPlaced(labelX, labelY - labelH, labelW, labelH)) {
    // Try below the box
    const altY = y + h + labelH + 4;
    if (!_overlapsPlaced(labelX, altY - labelH, labelW, labelH)) {
      labelY = altY;
    } else {
      // Nudge right
      for (let nudge = 0; nudge < 300; nudge += labelW + 8) {
        if (!_overlapsPlaced(labelX + nudge, labelY - labelH, labelW, labelH)) {
          labelX += nudge;
          break;
        }
      }
    }
  }

  __ann_placed.push({ x: labelX, y: labelY - labelH, w: labelW, h: labelH });

  _appendSVG(svg, `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="2.5" rx="6" stroke-dasharray="8,4"/>
    <rect x="${labelX}" y="${labelY - labelH}" width="${labelW}" height="${labelH}" rx="4" fill="${color}"/>
    <circle cx="${labelX + 13}" cy="${labelY - labelH / 2}" r="8" fill="white" opacity="0.9"/>
    <text x="${labelX + 13}" y="${labelY - labelH / 2 + 4}" fill="${color}" font-size="11" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${num}</text>
    <text x="${labelX + 26}" y="${labelY - 6}" fill="white" font-size="12" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
  `);
  return 'annotated box #' + num + ': ' + label;
}

function annotateMulti(items) {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
  const results = items.map((item, i) => {
    const color = colors[i % colors.length];
    if (item.type === 'click') return annotateClick(item.sel, item.label, color);
    if (item.type === 'box') return annotateBox(item.sel, item.label, color);
    return annotate(item.sel, item.label, color);
  });
  // Report failures prominently
  const failed = results.filter(r => r.startsWith('Element not found'));
  if (failed.length > 0) {
    return 'FAILED: ' + failed.join(' | ') + ' --- OK: ' + results.filter(r => !r.startsWith('Element not found')).join('; ');
  }
  return results.join('; ');
}

function clearAnnotations() {
  const el = document.getElementById('__annotations');
  if (el) el.remove();
  __ann_placed.length = 0;
  __ann_counter = 0;
  return 'cleared';
}
