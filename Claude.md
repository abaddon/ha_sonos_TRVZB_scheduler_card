# Sonoff TRVZB Scheduler Card - Project Context

## Project Overview

A Home Assistant custom card for managing weekly heating schedules on Sonoff TRVZB thermostatic radiator valves integrated via Zigbee2MQTT.

## Key Decisions

### 1. Technology Stack

- **Framework**: LitElement (standard for HA custom cards)
- **Language**: TypeScript (for type safety and better tooling)
- **Build Tool**: Rollup (standard for HA cards, produces single JS bundle)
- **Testing**: Vitest + Testing Library (modern, fast, compatible)
- **Package Manager**: npm

### 2. Architecture Pattern

**Component-Based Architecture** with clear separation of concerns:

```
src/
├── index.ts                    # Entry point, registers custom elements
├── card.ts                     # Main card component
├── editor.ts                   # Card configuration editor
├── components/
│   ├── schedule-week-view.ts   # Weekly calendar visualization
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

### 3. Data Model

#### TRVZB Schedule Format (from Zigbee2MQTT)

The device expects schedules in this MQTT format:
```json
{
  "weekly_schedule": {
    "sunday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18",
    "monday": "00:00/20 06:00/22 08:00/18 17:00/22 22:00/18",
    ...
  }
}
```

Each day's schedule is a space-separated string of transitions in `HH:mm/temperature` format.

#### Internal Data Model

```typescript
interface Transition {
  time: string;      // "HH:mm" format (24h)
  temperature: number; // 4-35°C, 0.5°C steps
}

interface DaySchedule {
  day: DayOfWeek;
  transitions: Transition[];
}

interface WeeklySchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

interface CardConfig {
  type: string;
  entity: string;           // climate entity ID
  name?: string;            // optional display name
  view_mode?: 'week' | 'list'; // default view mode
}
```

### 4. Key Constraints (from TRVZB documentation)

1. **Maximum 6 transitions per day**
2. **First transition must be at 00:00** (auto-added if missing)
3. **Temperature range: 4-35°C**
4. **Temperature step: 0.5°C**
5. **Time format: HH:mm (24-hour)**
6. **Days: Sunday through Saturday**
7. **Duplicate handling**: Transitions with the same time are automatically removed (first occurrence kept) during both parsing and serialization

### 5. UI/UX Design Decisions

#### View Modes

1. **Week View**: Visual calendar grid showing all 7 days with colored temperature bars
2. **List View**: Expandable accordion for each day with editable transition list

#### Interactions

- Toggle between view modes via button/dropdown
- Click on day to edit in modal/drawer
- Add/remove transitions with +/- buttons
- Time picker for transition times
- Temperature slider/input for temperatures
- Copy schedule dialog with checkboxes for target days
- Save button applies changes to device via MQTT

#### Visual Design

- Follow Home Assistant theming (CSS custom properties)
- Use HA native components where possible (`ha-card`, `ha-icon-button`, etc.)
- Color-code temperatures (blue=cold, red=hot gradient)
- Clear visual feedback for unsaved changes

### 6. Home Assistant Integration

#### Reading Schedule

The schedule is exposed as an attribute on the climate entity. Access via:
```javascript
const schedule = hass.states[entityId].attributes.schedule;
// or via weekly_schedule depending on Z2M version
```

#### Writing Schedule

Use `mqtt.publish` service or the climate entity's set method:
```javascript
hass.callService('mqtt', 'publish', {
  topic: 'zigbee2mqtt/DEVICE_NAME/set',
  payload: JSON.stringify({ weekly_schedule: scheduleData })
});
```

Alternatively, if Z2M exposes it properly:
```javascript
hass.callService('climate', 'set_preset_mode', {...});
// or via the entity's specific service
```

### 7. Validation Rules

1. Each day must have at least 1 transition
2. First transition must be at 00:00 (auto-corrected)
3. Maximum 6 transitions per day
4. Transitions must be in chronological order (auto-sorted)
5. No duplicate times within a day (auto-removed, keeping first occurrence)
6. Temperature must be 4-35°C
7. Temperature must be in 0.5°C increments
8. Time must be valid HH:mm format

### 8. Error Handling Strategy

- Show inline validation errors in editor
- Toast notifications for save success/failure
- Graceful degradation if entity unavailable
- Loading states during MQTT operations

### 9. Testing Strategy

#### Unit Tests
- Schedule parsing/serialization
- Validation logic
- Time utilities
- Data model transformations

#### Integration Tests
- Component rendering
- User interactions (add/remove transitions)
- Copy schedule functionality
- Save/load cycle simulation

#### Test Harness
- Mock Home Assistant `hass` object
- Mock MQTT service calls
- Snapshot tests for UI components

---

## Implementation Tasks

### Phase 1: Project Setup
- [ ] Initialize npm project with TypeScript
- [ ] Configure Rollup build
- [ ] Set up Vitest testing framework
- [ ] Create project structure

### Phase 2: Core Models & Utilities
- [ ] Define TypeScript interfaces
- [ ] Implement schedule parsing (string to model)
- [ ] Implement schedule serialization (model to string)
- [ ] Implement validation logic
- [ ] Implement time utilities
- [ ] Write unit tests for models/utilities

### Phase 3: Main Card Component
- [ ] Create base card structure with LitElement
- [ ] Implement `setConfig()` for configuration
- [ ] Implement `hass` property setter for state updates
- [ ] Implement schedule loading from entity
- [ ] Add view mode toggle
- [ ] Register custom element

### Phase 4: Schedule Views
- [ ] Implement week view component
- [ ] Implement list view component
- [ ] Add temperature color coding
- [ ] Write component tests

### Phase 5: Schedule Editor
- [ ] Implement day schedule editor component
- [ ] Implement transition editor component
- [ ] Add time picker integration
- [ ] Add temperature slider/input
- [ ] Add add/remove transition buttons
- [ ] Implement auto-00:00 correction
- [ ] Write editor tests

### Phase 6: Copy Schedule Feature
- [ ] Implement copy schedule dialog
- [ ] Add day selection checkboxes
- [ ] Implement copy logic
- [ ] Write copy feature tests

### Phase 7: HA Service Integration
- [ ] Implement schedule save via MQTT
- [ ] Add loading/saving states
- [ ] Add success/error notifications
- [ ] Write integration tests

### Phase 8: Card Configuration Editor
- [ ] Implement graphical card editor
- [ ] Add entity picker
- [ ] Add name input
- [ ] Add default view mode selector
- [ ] Register in customCards array

### Phase 9: Final Polish
- [ ] Accessibility review (ARIA labels, keyboard nav)
- [ ] Error boundary implementation
- [ ] Documentation (README, usage examples)
- [ ] Final testing pass

---

## File Structure

```
sonos_TRVZB_scheduler_card/
├── Claude.md                   # This file
├── README.md                   # Usage documentation
├── package.json
├── tsconfig.json
├── rollup.config.js
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── card.ts
│   ├── editor.ts
│   ├── components/
│   │   ├── schedule-week-view.ts
│   │   ├── schedule-list-view.ts
│   │   ├── day-schedule-editor.ts
│   │   ├── transition-editor.ts
│   │   └── copy-schedule-dialog.ts
│   ├── models/
│   │   ├── types.ts
│   │   └── schedule.ts
│   ├── services/
│   │   └── ha-service.ts
│   ├── utils/
│   │   ├── time.ts
│   │   └── validation.ts
│   └── styles/
│       └── card-styles.ts
├── test/
│   ├── setup.ts
│   ├── mocks/
│   │   └── hass-mock.ts
│   ├── unit/
│   │   ├── schedule.test.ts
│   │   ├── validation.test.ts
│   │   └── time.test.ts
│   └── integration/
│       ├── card.test.ts
│       ├── editor.test.ts
│       └── copy-schedule.test.ts
└── dist/
    └── trvzb-scheduler-card.js  # Built output
```

---

## Dependencies

### Production
- `lit` - LitElement for web components

### Development
- `typescript`
- `rollup` + plugins (`@rollup/plugin-typescript`, `@rollup/plugin-node-resolve`, `rollup-plugin-terser`)
- `vitest`
- `@testing-library/dom`
- `jsdom`

---

## Usage Example

```yaml
type: custom:trvzb-scheduler-card
entity: climate.living_room_trvzb
name: Living Room Heating
view_mode: week
```

---

## MQTT Topics Reference

- **State topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME`
- **Set topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME/set`
- **Get topic**: `zigbee2mqtt/DEVICE_FRIENDLY_NAME/get`

---

## Notes

- The card name uses "trvzb" to be specific to this device type
- Following HA custom card conventions for compatibility
- LitElement chosen for consistency with HA ecosystem
- TypeScript for type safety in schedule validation

---

## Questions Resolved

1. Entity defined per card instance via editor ✓
2. Single device per card ✓
3. Copy schedule to other days supported ✓
4. Both week and list views, switchable ✓
5. 24h time format ✓
6. Follow HA theme ✓
7. Auto-add 00:00 transition ✓
8. Focus on schedule management only ✓
9. Complete test harness included ✓
