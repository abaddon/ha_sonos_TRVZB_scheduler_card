# Sonoff TRVZB Scheduler Card

A Home Assistant custom card for managing weekly heating schedules on Sonoff TRVZB thermostatic radiator valves integrated via Zigbee2MQTT.

## Technology Stack

- **Framework**: LitElement
- **Language**: TypeScript
- **Build Tool**: Rollup
- **Testing**: Vitest + Testing Library

## Architecture

```
src/
├── index.ts                    # Entry point, registers custom elements
├── card.ts                     # Main card component
├── editor.ts                   # Card configuration editor
├── components/
│   ├── schedule-week-view.ts   # Weekly calendar visualization
│   ├── schedule-graph-view.ts  # Interactive graph view with drag controls
│   ├── schedule-list-view.ts   # List-based schedule view
│   ├── day-schedule-editor.ts  # Single day schedule editing
│   ├── transition-editor.ts    # Single transition (time/temp) editor
│   └── copy-schedule-dialog.ts # Dialog for copying schedules
├── models/
│   ├── types.ts                # TypeScript interfaces
│   └── schedule.ts             # Schedule data model & validation
├── services/
│   └── ha-service.ts           # Home Assistant service calls
├── utils/
│   ├── time.ts                 # Time formatting utilities
│   └── validation.ts           # Schedule validation logic
└── styles/
    └── card-styles.ts          # Shared CSS styles
```

## TRVZB Schedule Format

The device expects schedules in this MQTT format:
```json
{
  "weekly_schedule": {
    "sunday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18",
    "monday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18"
  }
}
```

Each day's schedule is a space-separated string of transitions in `HH:mm/temperature` format.

## Key Constraints

1. **Maximum 6 transitions per day**
2. **First transition must be at 00:00** (auto-added if missing)
3. **Temperature range: 4-35°C**
4. **Temperature step: 0.5°C**
5. **Time format: HH:mm (24-hour)**
6. **Duplicate handling**: Transitions with the same time are automatically removed (first occurrence kept)

## Validation Rules

1. Each day must have at least 1 transition
2. First transition must be at 00:00 (auto-corrected)
3. Maximum 6 transitions per day
4. Transitions must be in chronological order (auto-sorted)
5. No duplicate times within a day (auto-removed, keeping first occurrence)
6. Temperature must be 4-35°C in 0.5°C increments
7. Time must be valid HH:mm format

## Home Assistant Integration

### Reading Schedule
```javascript
const schedule = hass.states[entityId].attributes.weekly_schedule;
```

### Writing Schedule
```javascript
hass.callService('mqtt', 'publish', {
  topic: 'zigbee2mqtt/DEVICE_NAME/set',
  payload: JSON.stringify({ weekly_schedule: scheduleData })
});
```

## Usage

```yaml
type: custom:trvzb-scheduler-card
entity: climate.living_room_trvzb
name: Living Room Heating
view_mode: week
```

## MQTT Topics

- **State topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME`
- **Set topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME/set`
- **Get topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME/get`

## Build Commands

```bash
npm install      # Install dependencies
npm run build    # Build the card
npm test         # Run tests
```
