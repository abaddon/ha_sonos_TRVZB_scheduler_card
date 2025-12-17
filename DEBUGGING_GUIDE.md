# SVG Chart Debugging Guide

## Quick Verification Steps

### Step 1: Check if the fix is applied
```bash
# In the project directory
grep -A 5 "<!-- Grid lines -->" src/components/schedule-graph-view.ts
```

**Expected output** (correct - fix applied):
```typescript
<!-- Grid lines -->
${this.renderGridLines(width, height)}

<!-- Axes -->
${this.renderAxes(width, height)}
```

**Wrong output** (incorrect - fix NOT applied):
```typescript
<!-- Grid lines -->
<g>${this.renderGridLines(width, height)}</g>

<!-- Axes -->
<g>${this.renderAxes(width, height)}</g>
```

### Step 2: Rebuild the card
```bash
npm run build
```
Should complete without errors and produce `dist/trvzb-scheduler-card.js` (~86KB)

### Step 3: Test the standalone SVG
```bash
# Open the test file in your browser
open test-svg.html  # macOS
xdg-open test-svg.html  # Linux
start test-svg.html  # Windows
```

You should see:
- ✅ Grid lines (dashed, gray)
- ✅ X and Y axes (solid lines)
- ✅ Time labels (0:00 to 24:00)
- ✅ Temperature labels (4°C to 29°C)
- ✅ Axis titles
- ✅ Cyan temperature line
- ✅ 5 colored circular points
- ✅ Labels on each point

### Step 4: Install in Home Assistant

1. Copy the built file:
```bash
cp dist/trvzb-scheduler-card.js /path/to/homeassistant/www/
```

2. Add to your Lovelace resources (if not already):
```yaml
resources:
  - url: /local/trvzb-scheduler-card.js
    type: module
```

3. Add card to dashboard:
```yaml
type: custom:trvzb-scheduler-card
entity: climate.your_trvzb_device
```

4. Reload your browser (Ctrl+F5 or Cmd+Shift+R)

5. Toggle to "Graph" view (📊 button in card header)

## Browser Console Debugging

### Check for JavaScript Errors
1. Open browser console (F12)
2. Look for any red error messages
3. Common errors and solutions:

**Error: "Uncaught SyntaxError"**
- Solution: Rebuild the card (`npm run build`)

**Error: "customElements.define called with non-constructor"**
- Solution: Check browser compatibility (needs ES6+ support)

**Error: "Cannot read property 'states' of undefined"**
- Solution: Verify Home Assistant connection and entity exists

### Inspect SVG Structure
1. Open browser DevTools (F12)
2. Click "Elements" or "Inspector" tab
3. Find the `<schedule-graph-view>` element
4. Expand the shadow root
5. Find the `<svg>` element
6. Check if it contains:
   - Multiple `<line>` elements (grid lines and axes)
   - Multiple `<text>` elements (labels)
   - One `<path>` element (temperature line)
   - Multiple `<g>` elements with `<circle>` children (points)

### Console Commands for Debugging
```javascript
// Get the card element
const card = document.querySelector('trvzb-scheduler-card');

// Get the graph view component
const graphView = card.shadowRoot.querySelector('schedule-graph-view');

// Get the SVG element
const svg = graphView.shadowRoot.querySelector('.chart-svg');

// Log SVG info
console.log('SVG element:', svg);
console.log('SVG bounding box:', svg.getBoundingClientRect());
console.log('SVG viewBox:', svg.getAttribute('viewBox'));

// Count child elements
console.log('Total SVG children:', svg.children.length);

// List all child elements by type
const elementTypes = {};
Array.from(svg.children).forEach(child => {
  const tag = child.tagName;
  elementTypes[tag] = (elementTypes[tag] || 0) + 1;
});
console.log('Element counts:', elementTypes);

// Expected output:
// {
//   line: ~15 (grid lines + axes),
//   text: ~25 (axis labels + point labels),
//   path: 1 (temperature line),
//   g: 5-6 (temperature points)
// }
```

## Common Issues and Solutions

### Issue 1: Chart Not Visible (White/Empty Space)
**Symptoms**: Card loads but graph view shows nothing

**Possible Causes:**
1. Old build cached in browser
2. SVG elements not rendering
3. CSS hiding elements
4. No schedule data

**Solutions:**
1. Hard reload browser (Ctrl+F5 / Cmd+Shift+R)
2. Check browser console for errors
3. Verify schedule data exists:
   ```javascript
   const card = document.querySelector('trvzb-scheduler-card');
   console.log('Schedule:', card._schedule);
   ```
4. Check if SVG has children:
   ```javascript
   const svg = card.shadowRoot.querySelector('schedule-graph-view').shadowRoot.querySelector('svg');
   console.log('SVG children:', svg.children.length);
   ```

### Issue 2: Only Some Elements Visible
**Symptoms**: See axes but no grid lines, or see grid but no temperature line

**Possible Causes:**
1. CSS color issues (elements same color as background)
2. Stroke width too small
3. Z-index/layering issues

**Solutions:**
1. Inspect element styles in DevTools
2. Check if elements exist but are hidden:
   ```javascript
   const gridLines = card.shadowRoot.querySelector('schedule-graph-view').shadowRoot.querySelectorAll('.grid-line');
   console.log('Grid lines found:', gridLines.length);
   gridLines.forEach(line => console.log('Stroke:', window.getComputedStyle(line).stroke));
   ```

### Issue 3: Chart Doesn't Respond to Interactions
**Symptoms**: Can't drag points or switch days

**Possible Causes:**
1. Event listeners not attached
2. Disabled state active
3. JavaScript errors preventing updates

**Solutions:**
1. Check for errors in console
2. Verify component is not disabled:
   ```javascript
   const graphView = card.shadowRoot.querySelector('schedule-graph-view');
   console.log('Disabled:', graphView.disabled);
   ```
3. Test event binding:
   ```javascript
   const points = graphView.shadowRoot.querySelectorAll('.temperature-point');
   console.log('Draggable points:', points.length);
   ```

### Issue 4: Chart Doesn't Update When Data Changes
**Symptoms**: Schedule data changes but chart doesn't refresh

**Possible Causes:**
1. LitElement not detecting property changes
2. Schedule data reference not updating
3. Component not connected to card state

**Solutions:**
1. Force update:
   ```javascript
   const graphView = card.shadowRoot.querySelector('schedule-graph-view');
   graphView.requestUpdate();
   ```
2. Check if schedule property is set:
   ```javascript
   console.log('Graph view schedule:', graphView.schedule);
   ```

## Performance Debugging

### Check Rendering Performance
```javascript
// Measure render time
const graphView = card.shadowRoot.querySelector('schedule-graph-view');
console.time('render');
graphView.requestUpdate();
await graphView.updateComplete;
console.timeEnd('render');
// Should be < 50ms for good performance
```

### Check Memory Leaks
```javascript
// Check if event listeners are cleaned up
const graphView = card.shadowRoot.querySelector('schedule-graph-view');
console.log('Has drag listeners:', graphView.draggingPoint !== null);

// Remove and re-add component
graphView.remove();
// Should remove all event listeners
// Check browser memory doesn't keep growing
```

## Validation Tests

### Test 1: SVG Elements Exist
```javascript
const svg = card.shadowRoot.querySelector('schedule-graph-view').shadowRoot.querySelector('svg');
const tests = {
  'SVG exists': !!svg,
  'Has viewBox': !!svg.getAttribute('viewBox'),
  'Has grid lines': svg.querySelectorAll('.grid-line').length > 0,
  'Has axes': svg.querySelectorAll('.axis-line').length >= 2,
  'Has axis labels': svg.querySelectorAll('.axis-label').length > 0,
  'Has temperature line': svg.querySelectorAll('.temperature-line').length === 1,
  'Has temperature points': svg.querySelectorAll('.temperature-point').length > 0
};
console.table(tests);
// All should be true
```

### Test 2: Interactive Elements Work
```javascript
const graphView = card.shadowRoot.querySelector('schedule-graph-view');
const points = graphView.shadowRoot.querySelectorAll('.temperature-point');
const dayButtons = graphView.shadowRoot.querySelectorAll('.day-button');

const tests = {
  'Has draggable points': points.length > 0,
  'Points have mousedown handler': points[0]?.onmousedown !== null,
  'Has day selector buttons': dayButtons.length === 7,
  'Buttons are clickable': !dayButtons[0]?.disabled
};
console.table(tests);
// All should be true
```

### Test 3: Data Flow
```javascript
const card = document.querySelector('trvzb-scheduler-card');
const graphView = card.shadowRoot.querySelector('schedule-graph-view');

console.log('Card schedule:', card._schedule);
console.log('Graph schedule:', graphView.schedule);
console.log('Schedules match:', card._schedule === graphView.schedule);
// Should be true
```

## Network Debugging

### Check if Resource Loads
1. Open DevTools Network tab
2. Filter by "JS"
3. Look for `trvzb-scheduler-card.js`
4. Should show:
   - Status: 200 OK
   - Size: ~86KB
   - Type: application/javascript

### Force Reload Resource
```javascript
// Clear cache and reload
location.reload(true);

// Or add cache-busting parameter
const timestamp = Date.now();
const script = document.createElement('script');
script.src = `/local/trvzb-scheduler-card.js?v=${timestamp}`;
script.type = 'module';
document.head.appendChild(script);
```

## Contact and Support

If the chart still doesn't render after applying this fix and following all debugging steps:

1. Check browser console for errors (F12)
2. Verify the fix is applied (Step 1 above)
3. Test the standalone SVG (test-svg.html)
4. Provide browser details (Chrome/Firefox/Safari version)
5. Provide Home Assistant version
6. Share any console errors or screenshots

The fix addresses the core rendering issue. If problems persist, they're likely environment-specific.
