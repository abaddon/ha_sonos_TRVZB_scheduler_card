# TRVZB Scheduler Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/abaddon/ha_sonos_TRVZB_scheduler_card.svg)](https://github.com/abaddon/ha_sonos_TRVZB_scheduler_card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue.svg)](https://www.home-assistant.io/)
[![Zigbee2MQTT](https://img.shields.io/badge/Zigbee2MQTT-Compatible-green.svg)](https://www.zigbee2mqtt.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Home Assistant custom card for managing weekly heating schedules on **Sonoff TRVZB** thermostatic radiator valves integrated via Zigbee2MQTT.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=abaddon&repository=ha_sonos_TRVZB_scheduler_card&category=plugin)

## Features

- **Two View Modes**: Switch between a visual weekly calendar grid and a detailed list view
- **Full Schedule Control**: Edit up to 6 temperature transitions per day
- **Copy Schedules**: Easily copy a day's schedule to other days (weekdays, weekend, or custom selection)
- **Temperature Range**: Set temperatures from 4°C to 35°C in 0.5°C increments
- **Smart Defaults**: Automatically adds midnight (00:00) transition if missing and removes duplicate time entries
- **Theme Integration**: Follows your Home Assistant theme colors
- **Temperature Color Coding**: Visual temperature indicators (blue for cold, red for hot)
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Screenshots

<!-- TODO: Add actual screenshots -->
| Week View | Graph View                                                                                                            | Day Editor |
|-----------|-----------------------------------------------------------------------------------------------------------------------|------------|
| ![Week View](https://raw.githubusercontent.com/abaddon/ha_sonos_TRVZB_scheduler_card/main/screenshots/week-view.png) | ![List View](https://raw.githubusercontent.com/abaddon/ha_sonos_TRVZB_scheduler_card/main/screenshots/graph-view.png) | ![Day Editor](https://raw.githubusercontent.com/abaddon/ha_sonos_TRVZB_scheduler_card/main/screenshots/day-editor.png) |

## Requirements

- **Home Assistant** 2024.1 or later
- **HACS** (Home Assistant Community Store) - for easy installation
- **Zigbee2MQTT** with Sonoff TRVZB device integrated
- **MQTT Integration** enabled in Home Assistant

## Installation

### Option 1: HACS Installation (Recommended)

1. Make sure [HACS](https://hacs.xyz/) is installed in your Home Assistant instance

2. Click the button below to add this repository to HACS:

   [![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=abaddon&repository=ha_sonos_TRVZB_scheduler_card&category=plugin)

   **Or manually add the repository:**

   1. Open HACS in Home Assistant
   2. Click on the three dots menu in the top right corner
   3. Select **Custom repositories**
   4. Add the repository URL: `https://github.com/abaddon/ha_sonos_TRVZB_scheduler_card`
   5. Select **Dashboard** as the category
   6. Click **Add**

3. Search for "TRVZB Scheduler Card" in HACS

4. Click **Download**

5. Restart Home Assistant

6. Add the card to your dashboard (see [Configuration](#configuration))

### Option 2: Manual Installation

1. Download `trvzb-scheduler-card.js` from the [latest release](https://github.com/abaddon/ha_sonos_TRVZB_scheduler_card/releases/latest)

2. Copy the file to your Home Assistant config directory:
   ```
   /config/www/trvzb-scheduler-card.js
   ```

3. Add the resource to your dashboard:
   - Go to **Settings** → **Dashboards**
   - Click the three-dot menu → **Resources**
   - Click **Add Resource**
   - Enter URL: `/local/trvzb-scheduler-card.js`
   - Select **JavaScript Module**
   - Click **Create**

4. Restart Home Assistant

5. Add the card to your dashboard (see [Configuration](#configuration))

## Configuration

### Using the Visual Editor

1. Go to your dashboard
2. Click **Edit Dashboard** (pencil icon)
3. Click **Add Card**
4. Search for "TRVZB Scheduler Card"
5. Select your climate entity from the dropdown
6. Optionally set a custom name and default view mode
7. Click **Save**

### Using YAML

#### Basic Configuration

```yaml
type: custom:trvzb-scheduler-card
entity: climate.living_room_trvzb
```

#### Full Configuration

```yaml
type: custom:trvzb-scheduler-card
entity: climate.living_room_trvzb
name: Living Room Heating
view_mode: week
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `entity` | string | **Yes** | - | The climate entity ID of your TRVZB device |
| `name` | string | No | Entity friendly name | Custom title for the card |
| `view_mode` | string | No | `week` | Default view mode: `week` or `list` |

## Usage

### Switching Views

Click the view toggle button in the card header to switch between:
- **Week View**: Visual 7-day calendar with colored temperature blocks
- **List View**: Expandable accordion showing each day's transitions

### Editing a Day's Schedule

1. Click on any day (in week view) or the "Edit" button (in list view)
2. The day editor modal will open showing all transitions
3. Modify times and temperatures as needed
4. Click **Save** to apply changes to the card

### Adding Transitions

1. Open the day editor
2. Click **Add Transition** (max 6 per day)
3. Set the time and temperature
4. Click **Save**

### Removing Transitions

1. Open the day editor
2. Click the **X** button next to any transition (except the first one at 00:00)
3. Click **Save**

### Copying Schedules

1. Open the day editor for the day you want to copy
2. Click **Copy to Other Days...**
3. Select target days using checkboxes or quick buttons:
   - **Weekdays**: Monday through Friday
   - **Weekend**: Saturday and Sunday
   - **All**: All days except the source
4. Click **Copy**
5. Click **Save** on the main card to apply to the device

### Saving to Device

After making changes, click the **Save** button in the card header to send the schedule to your TRVZB device via MQTT.

## Schedule Format

The TRVZB device uses the following schedule format:

- Each day can have up to **6 transitions**
- Each transition specifies a **time** (HH:mm) and **temperature** (4-35°C)
- The first transition must be at **00:00** (midnight) - automatically added if missing
- Temperature steps are **0.5°C**
- The temperature remains active until the next transition
- **Duplicate transitions** with the same time are automatically removed (first occurrence is kept)

Example: `00:00/18 06:00/21 08:00/18 17:00/22 22:00/18`
- Midnight to 6:00 AM: 18°C
- 6:00 AM to 8:00 AM: 21°C
- 8:00 AM to 5:00 PM: 18°C
- 5:00 PM to 10:00 PM: 22°C
- 10:00 PM to midnight: 18°C

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/abaddon/ha_sonos_TRVZB_scheduler_card.git
cd ha_sonos_TRVZB_scheduler_card

# Install dependencies
npm install
```

### Development Mode

```bash
# Start development server with watch mode
npm run dev
```

The built file will be in `dist/trvzb-scheduler-card.js`. You can symlink this to your HA config for live development.

### Production Build

```bash
# Build for production (minified)
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
src/
├── index.ts                    # Entry point
├── card.ts                     # Main card component
├── editor.ts                   # Card configuration editor
├── components/
│   ├── schedule-week-view.ts   # Weekly calendar view
│   ├── schedule-list-view.ts   # Accordion list view
│   ├── day-schedule-editor.ts  # Day editing modal
│   ├── transition-editor.ts    # Single transition editor
│   └── copy-schedule-dialog.ts # Copy schedule dialog
├── models/
│   ├── types.ts                # TypeScript interfaces
│   └── schedule.ts             # Schedule parsing/serialization
├── services/
│   └── ha-service.ts           # Home Assistant integration
├── utils/
│   ├── time.ts                 # Time utilities
│   └── validation.ts           # Validation logic
└── styles/
    └── card-styles.ts          # Shared CSS styles
```

## Troubleshooting

### Card Not Showing

1. Ensure the resource is added correctly in Dashboard → Resources
2. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
3. Check the browser console (F12) for errors
4. Restart Home Assistant after installation

### Card Not Found in Add Card Dialog

1. Make sure you've restarted Home Assistant after installation
2. Clear your browser cache
3. Try accessing your dashboard in an incognito/private window

### Entity Not Found

1. Verify your TRVZB is properly integrated with Zigbee2MQTT
2. Check that the climate entity exists in **Settings** → **Devices & Services** → **Entities**
3. Ensure the entity ID in the card config matches exactly

### Schedule Not Saving

1. Check that MQTT integration is working in Home Assistant
2. Verify the Zigbee2MQTT device is online
3. Check Home Assistant logs (**Settings** → **System** → **Logs**) for MQTT errors
4. Ensure you have the correct permissions to publish MQTT messages

### Schedule Not Loading

1. The schedule is read from entity attributes (`schedule` or `weekly_schedule`)
2. Ensure Zigbee2MQTT is exposing the schedule attribute
3. Try requesting the schedule manually: publish to `zigbee2mqtt/DEVICE_NAME/get` with payload `{"weekly_schedule":""}`
4. Check if the schedule appears in the entity's attributes in Developer Tools → States

### HACS Installation Issues

1. Make sure HACS is properly installed and configured
2. Try removing and re-adding the custom repository
3. Check HACS logs for any error messages
4. Ensure your Home Assistant instance can reach GitHub

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Home Assistant](https://www.home-assistant.io/) - The home automation platform
- [HACS](https://hacs.xyz/) - Home Assistant Community Store
- [Zigbee2MQTT](https://www.zigbee2mqtt.io/) - Zigbee to MQTT bridge
- [LitElement](https://lit.dev/) - Web components library
- [Sonoff](https://sonoff.tech/) - TRVZB thermostatic radiator valve

---

Made with ❤️ for the Home Assistant community
