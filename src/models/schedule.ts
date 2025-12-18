/**
 * Schedule data model with parsing and serialization
 * Handles conversion between MQTT format and internal representation
 */

import { DaySchedule, Transition, WeeklySchedule, MQTTWeeklySchedule, DayOfWeek } from './types';
import { compareTime } from '../utils/time';

/**
 * Counter for generating unique transition IDs within a session
 */
let transitionIdCounter = 0;

/**
 * Generate a unique ID for a transition
 * Used for UI tracking to maintain DOM element identity during sorting
 */
export function generateTransitionId(): string {
  return `t-${Date.now()}-${++transitionIdCounter}`;
}

/**
 * Ensure a transition has an ID, generating one if missing
 */
export function ensureTransitionId(transition: Transition): Transition {
  if (transition.id) {
    return transition;
  }
  return { ...transition, id: generateTransitionId() };
}

/**
 * Parse a day schedule string from MQTT format
 * Format: "00:00/20 06:00/22 08:00/18" -> array of transitions
 *
 * @param scheduleString - Space-separated transitions in HH:mm/temperature format
 * @returns Parsed day schedule
 */
export function parseDaySchedule(scheduleString: string): DaySchedule {
  // Handle empty or whitespace-only strings
  const trimmed = scheduleString.trim();
  if (!trimmed) {
    return createEmptyDaySchedule();
  }

  try {
    // Split by spaces and parse each transition
    const parts = trimmed.split(/\s+/);
    const transitions: Transition[] = [];

    for (const part of parts) {
      // Each part should be "HH:mm/temperature"
      const match = part.match(/^(\d{2}:\d{2})\/(\d+(?:\.\d+)?)$/);
      if (!match) {
        console.warn(`Malformed transition: ${part}, skipping`);
        continue;
      }

      const time = match[1];
      const temperature = parseFloat(match[2]);

      transitions.push({ id: generateTransitionId(), time, temperature });
    }

    // If no valid transitions were parsed, return default
    if (transitions.length === 0) {
      return createEmptyDaySchedule();
    }

    // Remove duplicate transitions (keep first occurrence of each time)
    const deduplicated = removeDuplicateTransitions(transitions);

    // Ensure midnight transition and sort
    const schedule = { transitions: deduplicated };
    return ensureMidnightTransition(schedule);
  } catch (error) {
    console.error('Error parsing day schedule:', error);
    return createEmptyDaySchedule();
  }
}

/**
 * Serialize a day schedule to MQTT format string
 *
 * @param schedule - Day schedule to serialize
 * @returns Space-separated string in HH:mm/temperature format
 */
export function serializeDaySchedule(schedule: DaySchedule): string {
  // Remove duplicates (keep first occurrence of each time)
  const deduplicated = removeDuplicateTransitions(schedule.transitions);

  // Sort transitions before serializing
  const sorted = sortTransitions(deduplicated);

  // Convert each transition to "HH:mm/temperature" format
  const parts = sorted.map(t => {
    // Format temperature to remove unnecessary decimals
    const temp = t.temperature % 1 === 0
      ? t.temperature.toFixed(0)
      : t.temperature.toFixed(1);
    return `${t.time}/${temp}`;
  });

  return parts.join(' ');
}

/**
 * Parse a full weekly schedule from MQTT format
 *
 * @param mqtt - MQTT weekly schedule object
 * @returns Parsed weekly schedule
 */
export function parseWeeklySchedule(mqtt: MQTTWeeklySchedule): WeeklySchedule {
  return {
    sunday: parseDaySchedule(mqtt.sunday || ''),
    monday: parseDaySchedule(mqtt.monday || ''),
    tuesday: parseDaySchedule(mqtt.tuesday || ''),
    wednesday: parseDaySchedule(mqtt.wednesday || ''),
    thursday: parseDaySchedule(mqtt.thursday || ''),
    friday: parseDaySchedule(mqtt.friday || ''),
    saturday: parseDaySchedule(mqtt.saturday || '')
  };
}

/**
 * Serialize a weekly schedule to MQTT format
 *
 * @param schedule - Weekly schedule to serialize
 * @returns MQTT-compatible weekly schedule object
 */
export function serializeWeeklySchedule(schedule: WeeklySchedule): MQTTWeeklySchedule {
  return {
    sunday: serializeDaySchedule(schedule.sunday),
    monday: serializeDaySchedule(schedule.monday),
    tuesday: serializeDaySchedule(schedule.tuesday),
    wednesday: serializeDaySchedule(schedule.wednesday),
    thursday: serializeDaySchedule(schedule.thursday),
    friday: serializeDaySchedule(schedule.friday),
    saturday: serializeDaySchedule(schedule.saturday)
  };
}

/**
 * Create an empty day schedule with default 00:00/20 transition
 */
export function createEmptyDaySchedule(): DaySchedule {
  return {
    transitions: [
      { id: generateTransitionId(), time: '00:00', temperature: 20 }
    ]
  };
}

/**
 * Create an empty weekly schedule with defaults for all days
 */
export function createEmptyWeeklySchedule(): WeeklySchedule {
  return {
    sunday: createEmptyDaySchedule(),
    monday: createEmptyDaySchedule(),
    tuesday: createEmptyDaySchedule(),
    wednesday: createEmptyDaySchedule(),
    thursday: createEmptyDaySchedule(),
    friday: createEmptyDaySchedule(),
    saturday: createEmptyDaySchedule()
  };
}

/**
 * Ensure a day schedule has a midnight (00:00) transition
 * If missing, adds one with temperature 20°C at the beginning
 *
 * @param schedule - Day schedule to check
 * @returns Schedule with guaranteed midnight transition
 */
export function ensureMidnightTransition(schedule: DaySchedule): DaySchedule {
  const transitions = [...schedule.transitions];

  // Check if there's already a 00:00 transition
  const hasMidnight = transitions.some(t => t.time === '00:00');

  if (!hasMidnight) {
    // Add default midnight transition with a new ID
    transitions.unshift({ id: generateTransitionId(), time: '00:00', temperature: 20 });
  }

  return {
    transitions: sortTransitions(transitions)
  };
}

/**
 * Sort transitions by time (chronologically)
 *
 * @param transitions - Array of transitions to sort
 * @returns Sorted array (new array, doesn't mutate original)
 */
export function sortTransitions(transitions: Transition[]): Transition[] {
  return [...transitions].sort((a, b) => compareTime(a.time, b.time));
}

/**
 * Create a deep copy of a day schedule
 *
 * @param source - Day schedule to copy
 * @returns Deep copy of the schedule (preserves IDs, generates if missing)
 */
export function copyDaySchedule(source: DaySchedule): DaySchedule {
  return {
    transitions: source.transitions.map(t => ({
      id: t.id || generateTransitionId(),
      time: t.time,
      temperature: t.temperature
    }))
  };
}

/**
 * Remove duplicate transitions with the same time
 * Keeps the first occurrence of each unique time
 *
 * @param transitions - Array of transitions to deduplicate
 * @returns Array with duplicates removed (new array, doesn't mutate original)
 */
export function removeDuplicateTransitions(transitions: Transition[]): Transition[] {
  const seen = new Set<string>();
  const result: Transition[] = [];

  for (const transition of transitions) {
    if (!seen.has(transition.time)) {
      seen.add(transition.time);
      // Preserve ID, generate if missing
      result.push({
        id: transition.id || generateTransitionId(),
        time: transition.time,
        temperature: transition.temperature
      });
    }
  }

  return result;
}
