import type {
  HomeAssistant,
  HassEntity,
  WeeklySchedule,
  DaySchedule,
  MQTTWeeklySchedule
} from '../../src/models/types';

/**
 * Sample day schedule string in TRVZB format
 * Format: "HH:mm/temp HH:mm/temp ..."
 */
export const SAMPLE_DAY_SCHEDULE_STRING = "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18";

/**
 * Sample entity ID for testing
 */
export const SAMPLE_ENTITY_ID = "climate.living_room_trvzb";

/**
 * Sample weekly schedule in MQTT format (string-based)
 */
export const SAMPLE_WEEKLY_SCHEDULE: MQTTWeeklySchedule = {
  sunday: "00:00/20 08:00/22 22:00/18",
  monday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
  tuesday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
  wednesday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
  thursday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
  friday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
  saturday: "00:00/20 08:00/22 22:00/18",
};

/**
 * Sample weekly schedule in parsed format
 */
export const SAMPLE_PARSED_WEEKLY_SCHEDULE: WeeklySchedule = {
  sunday: {
    transitions: [
      { time: "00:00", temperature: 20 },
      { time: "08:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  monday: {
    transitions: [
      { time: "00:00", temperature: 18 },
      { time: "06:00", temperature: 21 },
      { time: "08:00", temperature: 19 },
      { time: "17:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  tuesday: {
    transitions: [
      { time: "00:00", temperature: 18 },
      { time: "06:00", temperature: 21 },
      { time: "08:00", temperature: 19 },
      { time: "17:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  wednesday: {
    transitions: [
      { time: "00:00", temperature: 18 },
      { time: "06:00", temperature: 21 },
      { time: "08:00", temperature: 19 },
      { time: "17:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  thursday: {
    transitions: [
      { time: "00:00", temperature: 18 },
      { time: "06:00", temperature: 21 },
      { time: "08:00", temperature: 19 },
      { time: "17:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  friday: {
    transitions: [
      { time: "00:00", temperature: 18 },
      { time: "06:00", temperature: 21 },
      { time: "08:00", temperature: 19 },
      { time: "17:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
  saturday: {
    transitions: [
      { time: "00:00", temperature: 20 },
      { time: "08:00", temperature: 22 },
      { time: "22:00", temperature: 18 },
    ],
  },
};

/**
 * Service call record for tracking calls to hass.callService
 */
export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

/**
 * MockServiceCallRecorder - Tracks and provides assertions for service calls
 */
export class MockServiceCallRecorder {
  private _calls: ServiceCall[] = [];

  /**
   * Get all recorded service calls
   */
  get calls(): ServiceCall[] {
    return [...this._calls];
  }

  /**
   * Record a service call
   */
  record(domain: string, service: string, data: Record<string, unknown>): void {
    this._calls.push({ domain, service, data });
  }

  /**
   * Get the most recent service call
   */
  getLastCall(): ServiceCall | undefined {
    return this._calls[this._calls.length - 1];
  }

  /**
   * Get filtered service calls by domain and/or service
   */
  getCalls(domain?: string, service?: string): ServiceCall[] {
    return this._calls.filter(call => {
      const domainMatch = !domain || call.domain === domain;
      const serviceMatch = !service || call.service === service;
      return domainMatch && serviceMatch;
    });
  }

  /**
   * Reset all recorded calls
   */
  reset(): void {
    this._calls = [];
  }

  /**
   * Assert that a service was called with specific parameters
   */
  expectServiceCalled(
    domain: string,
    service: string,
    data?: Partial<Record<string, unknown>>
  ): boolean {
    const calls = this.getCalls(domain, service);

    if (calls.length === 0) {
      return false;
    }

    if (!data) {
      return true;
    }

    // Check if any call matches the expected data
    return calls.some(call => {
      return Object.entries(data).every(([key, value]) => {
        // Deep equality check for nested objects
        return JSON.stringify(call.data[key]) === JSON.stringify(value);
      });
    });
  }

  /**
   * Get the number of times a service was called
   */
  getCallCount(domain?: string, service?: string): number {
    return this.getCalls(domain, service).length;
  }
}

/**
 * Options for creating a mock HomeAssistant object
 */
export interface MockHassOptions {
  states?: Record<string, HassEntity>;
  recorder?: MockServiceCallRecorder;
}

/**
 * Create a mock HomeAssistant object for testing
 *
 * @param options - Optional configuration for the mock
 * @returns Mock HomeAssistant instance
 */
export function createMockHass(options: MockHassOptions = {}): HomeAssistant {
  const recorder = options.recorder || new MockServiceCallRecorder();

  return {
    states: options.states || {},
    callService: async (domain: string, service: string, data: Record<string, unknown> = {}) => {
      recorder.record(domain, service, data);
      return Promise.resolve();
    },
  };
}

/**
 * Create a mock TRVZB climate entity
 *
 * @param friendlyName - The friendly name for the entity (will be used to create entity_id)
 * @param schedule - Optional weekly schedule (uses sample schedule if not provided)
 * @returns Mock HassEntity
 */
export function createMockTRVZBEntity(
  friendlyName: string = "living_room_trvzb",
  schedule?: MQTTWeeklySchedule | WeeklySchedule
): HassEntity {
  const entityId = `climate.${friendlyName}`;

  // Determine if schedule is MQTT format or parsed format
  const scheduleAttribute = schedule || SAMPLE_WEEKLY_SCHEDULE;

  // Check if it's a parsed schedule (has transitions property)
  const isParsedSchedule = schedule && 'sunday' in schedule &&
    typeof schedule.sunday === 'object' && 'transitions' in schedule.sunday;

  return {
    entity_id: entityId,
    state: 'heat',
    attributes: {
      friendly_name: friendlyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      temperature: 21,
      current_temperature: 20.5,
      hvac_modes: ['off', 'heat', 'auto'],
      hvac_mode: 'heat',
      min_temp: 4,
      max_temp: 35,
      target_temp_step: 0.5,
      preset_mode: 'none',
      preset_modes: ['none', 'away', 'schedule'],
      // Support both attribute names for compatibility
      schedule: isParsedSchedule ? undefined : scheduleAttribute,
      weekly_schedule: scheduleAttribute,
    },
  };
}

/**
 * Create a mock weekly_scheduler sensor entity (deprecated - kept for backwards compatibility)
 * @deprecated Use createMockDaySensors instead - schedule is now split across 7 sensors
 * This sensor contains the schedule attribute that the card reads from
 *
 * @param friendlyName - The base name for the entity (will create sensor.{name}_weekly_schedule)
 * @param schedule - Optional weekly schedule (uses sample schedule if not provided)
 * @returns Mock HassEntity for the sensor
 */
export function createMockScheduleSensor(
  friendlyName: string = "living_room_trvzb",
  schedule?: MQTTWeeklySchedule
): HassEntity {
  const sensorEntityId = `sensor.${friendlyName}_weekly_schedule`;
  const scheduleAttribute = schedule || SAMPLE_WEEKLY_SCHEDULE;

  return {
    entity_id: sensorEntityId,
    state: 'active',
    attributes: {
      friendly_name: `${friendlyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Weekly Scheduler`,
      schedule: scheduleAttribute,
    },
  };
}

/**
 * Create mock day-specific sensor entities for the new sensor structure
 * Creates 7 sensors: sensor.{name}_weekly_schedule_{day}
 *
 * @param friendlyName - The base name for the entity
 * @param schedule - Optional weekly schedule (uses sample schedule if not provided)
 * @returns Record of sensor entity IDs to HassEntity objects
 */
export function createMockDaySensors(
  friendlyName: string = "living_room_trvzb",
  schedule?: MQTTWeeklySchedule
): Record<string, HassEntity> {
  const scheduleData = schedule || SAMPLE_WEEKLY_SCHEDULE;
  const days: Array<keyof MQTTWeeklySchedule> = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];

  const sensors: Record<string, HassEntity> = {};

  for (const day of days) {
    const sensorEntityId = `sensor.${friendlyName}_weekly_schedule_${day}`;
    const dayScheduleString = scheduleData[day];

    sensors[sensorEntityId] = {
      entity_id: sensorEntityId,
      state: dayScheduleString,
      attributes: {
        friendly_name: `${friendlyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Weekly Schedule ${day.charAt(0).toUpperCase() + day.slice(1)}`,
      },
    };
  }

  return sensors;
}

/**
 * Create a realistic weekly schedule for testing
 *
 * @param variant - Optional variant ('weekday', 'weekend', 'minimal', 'maximal')
 * @returns MQTTWeeklySchedule
 */
export function createMockSchedule(
  variant: 'weekday' | 'weekend' | 'minimal' | 'maximal' | 'default' = 'default'
): MQTTWeeklySchedule {
  switch (variant) {
    case 'weekday':
      // Active heating during work week
      return {
        sunday: "00:00/18 08:00/20 22:00/18",
        monday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
        tuesday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
        wednesday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
        thursday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
        friday: "00:00/18 06:00/21 08:00/19 17:00/22 22:00/18",
        saturday: "00:00/18 08:00/20 22:00/18",
      };

    case 'weekend':
      // Relaxed schedule for weekends
      return {
        sunday: "00:00/18 09:00/22 23:00/18",
        monday: "00:00/18 06:00/20 22:00/18",
        tuesday: "00:00/18 06:00/20 22:00/18",
        wednesday: "00:00/18 06:00/20 22:00/18",
        thursday: "00:00/18 06:00/20 22:00/18",
        friday: "00:00/18 06:00/20 22:00/18",
        saturday: "00:00/18 09:00/22 23:00/18",
      };

    case 'minimal':
      // Minimal schedule (1 transition per day - just midnight)
      return {
        sunday: "00:00/20",
        monday: "00:00/20",
        tuesday: "00:00/20",
        wednesday: "00:00/20",
        thursday: "00:00/20",
        friday: "00:00/20",
        saturday: "00:00/20",
      };

    case 'maximal':
      // Maximum transitions (6 per day)
      return {
        sunday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        monday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        tuesday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        wednesday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        thursday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        friday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
        saturday: "00:00/18 06:00/21 08:00/19 12:00/20 17:00/22 22:00/18",
      };

    case 'default':
    default:
      return SAMPLE_WEEKLY_SCHEDULE;
  }
}

/**
 * Create a mock climate entity without schedule attributes (for testing error cases)
 */
export function createMockClimateEntityWithoutSchedule(
  friendlyName: string = "basic_thermostat"
): HassEntity {
  return {
    entity_id: `climate.${friendlyName}`,
    state: 'heat',
    attributes: {
      friendly_name: friendlyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      temperature: 21,
      current_temperature: 20.5,
      hvac_modes: ['off', 'heat', 'auto'],
      hvac_mode: 'heat',
      min_temp: 7,
      max_temp: 30,
      target_temp_step: 1,
    },
  };
}

/**
 * Create a mock entity with invalid schedule data (for testing error handling)
 */
export function createMockEntityWithInvalidSchedule(
  friendlyName: string = "invalid_trvzb"
): HassEntity {
  return {
    entity_id: `climate.${friendlyName}`,
    state: 'heat',
    attributes: {
      friendly_name: friendlyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      temperature: 21,
      current_temperature: 20.5,
      hvac_modes: ['off', 'heat', 'auto'],
      min_temp: 4,
      max_temp: 35,
      target_temp_step: 0.5,
      // Invalid schedule data
      weekly_schedule: {
        sunday: "invalid/format/here",
        monday: "25:00/99", // Invalid time and temperature
        tuesday: "", // Empty schedule
        wednesday: null,
        thursday: undefined,
        friday: "00:00/18 99:99/40", // Invalid time
        saturday: "00:00/18 08:00/3", // Temperature out of range
      },
    },
  };
}

/**
 * Helper to update mock hass states
 */
export function updateMockHassState(
  hass: HomeAssistant,
  entityId: string,
  updates: Partial<HassEntity>
): void {
  const existing = hass.states[entityId];
  if (existing) {
    hass.states[entityId] = {
      ...existing,
      ...updates,
      attributes: {
        ...existing.attributes,
        ...(updates.attributes || {}),
      },
    };
  }
}

/**
 * Helper to create a complete test scenario with hass and entities
 */
export interface TestScenario {
  hass: HomeAssistant;
  recorder: MockServiceCallRecorder;
  entity: HassEntity;
  sensorEntity: HassEntity; // Deprecated - kept for backwards compatibility
  daySensors: Record<string, HassEntity>; // New day-specific sensors
  entityId: string;
  sensorEntityId: string; // Deprecated - kept for backwards compatibility
}

export function createTestScenario(
  entityName: string = "living_room_trvzb",
  schedule?: MQTTWeeklySchedule
): TestScenario {
  const recorder = new MockServiceCallRecorder();
  const entity = createMockTRVZBEntity(entityName, schedule);
  const sensorEntity = createMockScheduleSensor(entityName, schedule); // Deprecated but kept for compatibility
  const daySensors = createMockDaySensors(entityName, schedule);

  const hass = createMockHass({
    states: {
      [entity.entity_id]: entity,
      [sensorEntity.entity_id]: sensorEntity, // Deprecated but kept for compatibility
      ...daySensors, // Add all 7 day sensors
    },
    recorder,
  });

  return {
    hass,
    recorder,
    entity,
    sensorEntity, // Deprecated but kept for compatibility
    daySensors,
    entityId: entity.entity_id,
    sensorEntityId: sensorEntity.entity_id, // Deprecated but kept for compatibility
  };
}
