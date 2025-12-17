# Debugging the Schedule Graph View

## Problem Summary
The schedule graph view chart is not visible in Home Assistant, but basic SVG rendering works fine in test-svg.html.

## Debug Steps

### Step 1: Open test-component.html
1. Open `/Users/abaddon/Documents/src/sonos_TRVZB_scheduler_card/test-component.html` in your browser
2. The page will auto-load sample schedule data
3. Open browser console (F12) and look for messages starting with `[schedule-graph-view]`

### Step 2: Check Console Logs
Look for these specific log messages:

```
[schedule-graph-view] render() called, schedule: {...}
[schedule-graph-view] Rendering graph view with schedule
[schedule-graph-view] renderChart called
[schedule-graph-view] schedule: {...}
[schedule-graph-view] selectedDay: monday
[schedule-graph-view] daySchedule: {...}
[schedule-graph-view] Rendering chart with X transitions
```

### Step 3: Identify the Issue

#### Case A: "No schedule data" message
If you see: `[schedule-graph-view] No schedule data, showing empty state`
- The schedule property is null/undefined
- Check how the component is being instantiated in card.ts
- Verify schedule is being loaded correctly in _loadSchedule()

#### Case B: "No day schedule found for X" message
If you see: `[schedule-graph-view] No day schedule found for monday`
- The schedule object exists but doesn't have the selected day
- Check the structure of the schedule object in the console
- Verify it has properties: sunday, monday, tuesday, etc.

#### Case C: Chart renders but is hidden
If logs show chart is rendering but nothing visible:
- Click "Check SVG Elements" button in test-component.html
- Look for SVG dimensions and child count
- Check if SVG has height: 0 or display: none

### Step 4: Test in Home Assistant
After confirming test-component.html works:

1. Copy `dist/trvzb-scheduler-card.js` to your HA custom_components
2. Clear browser cache (Ctrl+F5)
3. Open browser console in HA
4. Look for the same `[schedule-graph-view]` log messages
5. Compare the console output between test-component.html and HA

### Step 5: Check Schedule Data Structure
In the HA console, inspect the actual schedule data:

```javascript
// In browser console while viewing the card
const card = document.querySelector('trvzb-scheduler-card');
console.log('Card schedule:', card._schedule);

// Check if schedule has correct structure
console.log('Monday schedule:', card._schedule?.monday);
console.log('Monday transitions:', card._schedule?.monday?.transitions);
```

Expected structure:
```javascript
{
  monday: {
    transitions: [
      { time: "00:00", temperature: 20 },
      { time: "06:00", temperature: 22 },
      // ...
    ]
  },
  tuesday: { transitions: [...] },
  // ... other days
}
```

## Common Issues and Fixes

### Issue 1: Schedule is null
**Symptom:** Console shows "No schedule data"
**Cause:** Schedule not loading from sensor
**Fix:** Check sensor entity exists and has `schedule` attribute

### Issue 2: Wrong schedule structure
**Symptom:** Schedule exists but daySchedule is null
**Cause:** Schedule doesn't match expected WeeklySchedule type
**Fix:** Verify parsing in parseWeeklySchedule() function

### Issue 3: SVG not visible
**Symptom:** Logs show chart rendering but nothing visible
**Cause:** CSS styling issue or Shadow DOM problem
**Fix:** Check .chart-wrapper and .chart-svg CSS, verify Shadow DOM

### Issue 4: Component not updating
**Symptom:** Schedule exists but render() not called
**Cause:** Property not triggering re-render
**Fix:** Verify @property decorator on schedule property

## Next Steps

Based on the console output from test-component.html, you should be able to identify which of the above cases applies. Then:

1. If test-component.html works but HA doesn't → Issue is with data loading in HA
2. If test-component.html also fails → Issue is with component rendering logic
3. If neither works → Issue is with the component code itself

## Report Back
Please share:
1. Console logs from test-component.html
2. Console logs from Home Assistant
3. Output of clicking "Inspect Component" button
4. Output of clicking "Check SVG Elements" button
5. Any error messages
