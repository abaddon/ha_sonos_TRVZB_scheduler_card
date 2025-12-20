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
│   ├── day-schedule-editor.ts  # Single day schedule editing
│   ├── transition-editor.ts    # Single transition (time/temp) editor
│   └── copy-schedule-dialog.ts # Dialog for copying schedules
├── models/
│   ├── types.ts                # TypeScript interfaces & DAYS_OF_WEEK constant
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

The device expects schedules in this MQTT format (each day as a separate property):
```json
{
  "weekly_schedule_sunday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18",
  "weekly_schedule_monday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18",
  "weekly_schedule_tuesday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18"
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
Schedule is read from 7 separate day text entities:
```javascript
// Each day has its own text entity: text.{device}_weekly_schedule_{day}
const sundaySchedule = hass.states['text.living_room_trvzb_weekly_schedule_sunday'].state;
const mondaySchedule = hass.states['text.living_room_trvzb_weekly_schedule_monday'].state;
// ... etc for each day
```

### Writing Schedule
Each day is published to its own topic:
```javascript
// For each day, publish to: zigbee2mqtt/DEVICE_NAME/set/weekly_schedule_{day}
hass.callService('mqtt', 'publish', {
  topic: 'zigbee2mqtt/DEVICE_NAME/set/weekly_schedule_monday',
  payload: '00:00/18 06:00/21 08:00/19 17:00/22 22:00/18'
});
// Repeat for each day of the week
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
