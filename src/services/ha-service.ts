/**
 * Home Assistant service integration layer
 * Handles reading/writing TRVZB schedules via Home Assistant and MQTT
 */

import { HomeAssistant, WeeklySchedule, MQTTWeeklySchedule } from '../models/types';
import { parseWeeklySchedule, serializeWeeklySchedule, createEmptyWeeklySchedule } from '../models/schedule';

/**
 * Entity information for display
 */
export interface EntityInfo {
  name: string;
  available: boolean;
  currentTemp?: number;
  targetTemp?: number;
}

/**
 * Derive the schedule sensor entity ID from a climate entity ID
 * Convention: climate.device_name -> sensor.device_name_weekly_scheduler
 *
 * @param climateEntityId - Climate entity ID (e.g., "climate.living_room_trvzb")
 * @returns Sensor entity ID (e.g., "sensor.living_room_trvzb_weekly_scheduler")
 */
export function deriveSensorEntityId(climateEntityId: string): string {
  const deviceName = extractFriendlyName(climateEntityId);
  return `sensor.${deviceName}_weekly_scheduler`;
}

/**
 * Get the sensor entity ID for reading schedule
 * Uses configured override or derives from climate entity
 *
 * @param climateEntityId - Climate entity ID
 * @param configuredSensor - Optional configured sensor entity ID override
 * @returns Sensor entity ID to use for reading schedule
 */
export function getSensorEntityId(climateEntityId: string, configuredSensor?: string): string {
  return configuredSensor || deriveSensorEntityId(climateEntityId);
}

/**
 * Get the weekly schedule from the schedule sensor entity
 * Reads from the 'schedule' attribute of the weekly_scheduler sensor
 *
 * @param hass - Home Assistant instance
 * @param sensorEntityId - Sensor entity ID (e.g., "sensor.device_weekly_scheduler")
 * @returns Weekly schedule or null if not found
 */
export function getScheduleFromSensor(hass: HomeAssistant, sensorEntityId: string): WeeklySchedule | null {
  try {
    // Get the sensor entity from hass.states
    const entity = hass.states[sensorEntityId];
    if (!entity) {
      console.warn(`Sensor entity not found: ${sensorEntityId}`);
      return null;
    }

    // Read from the 'schedule' attribute
    const mqttSchedule = entity.attributes.schedule;

    if (!mqttSchedule) {
      console.warn(`No schedule attribute found on sensor: ${sensorEntityId}`);
      return null;
    }

    // Validate that we have a proper schedule object
    if (typeof mqttSchedule !== 'object' || mqttSchedule === null) {
      console.error(`Invalid schedule format on sensor: ${sensorEntityId}`, mqttSchedule);
      return null;
    }

    // Parse the MQTT format to our internal WeeklySchedule format
    const schedule = parseWeeklySchedule(mqttSchedule as MQTTWeeklySchedule);
    return schedule;
  } catch (error) {
    console.error(`Error getting schedule from sensor ${sensorEntityId}:`, error);
    return null;
  }
}

/**
 * Get the weekly schedule from a climate entity (legacy)
 * Handles both 'schedule' and 'weekly_schedule' attribute names (Z2M version differences)
 * @deprecated Use getScheduleFromSensor instead
 *
 * @param hass - Home Assistant instance
 * @param entityId - Climate entity ID
 * @returns Weekly schedule or null if not found
 */
export function getEntitySchedule(hass: HomeAssistant, entityId: string): WeeklySchedule | null {
  try {
    // Get the entity from hass.states
    const entity = hass.states[entityId];
    if (!entity) {
      console.warn(`Entity not found: ${entityId}`);
      return null;
    }

    // Try both 'weekly_schedule' and 'schedule' attribute names
    const mqttSchedule = entity.attributes.weekly_schedule || entity.attributes.schedule;

    if (!mqttSchedule) {
      console.warn(`No schedule attribute found on entity: ${entityId}`);
      return null;
    }

    // Validate that we have a proper schedule object
    if (typeof mqttSchedule !== 'object' || mqttSchedule === null) {
      console.error(`Invalid schedule format on entity: ${entityId}`, mqttSchedule);
      return null;
    }

    // Parse the MQTT format to our internal WeeklySchedule format
    const schedule = parseWeeklySchedule(mqttSchedule as MQTTWeeklySchedule);
    return schedule;
  } catch (error) {
    console.error(`Error getting schedule for ${entityId}:`, error);
    return null;
  }
}

/**
 * Save a weekly schedule to the device via MQTT
 *
 * @param hass - Home Assistant instance
 * @param entityId - Climate entity ID
 * @param schedule - Weekly schedule to save
 * @throws Error if save fails
 */
export async function saveSchedule(
  hass: HomeAssistant,
  entityId: string,
  schedule: WeeklySchedule
): Promise<void> {
  try {
    // Extract device friendly name from entity_id
    const friendlyName = extractFriendlyName(entityId);

    // Serialize the schedule to MQTT format
    const mqttSchedule = serializeWeeklySchedule(schedule);

    // Construct the MQTT topic
    const topic = `zigbee2mqtt/${friendlyName}/set`;

    // Prepare the payload
    const payload = JSON.stringify({
      weekly_schedule: mqttSchedule
    });

    // Call mqtt.publish service
    await hass.callService('mqtt', 'publish', {
      topic: topic,
      payload: payload
    });

    console.log(`Schedule saved successfully for ${entityId}`);
  } catch (error) {
    console.error(`Error saving schedule for ${entityId}:`, error);
    throw new Error(`Failed to save schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get basic entity information for display
 *
 * @param hass - Home Assistant instance
 * @param entityId - Climate entity ID
 * @returns Entity info or null if not found
 */
export function getEntityInfo(hass: HomeAssistant, entityId: string): EntityInfo | null {
  try {
    const entity = hass.states[entityId];
    if (!entity) {
      console.warn(`Entity not found: ${entityId}`);
      return null;
    }

    // Extract friendly name - prefer friendly_name attribute, fallback to entity_id
    const name = (entity.attributes.friendly_name as string) || entityId;

    // Check availability - entity state should not be 'unavailable'
    const available = entity.state !== 'unavailable';

    // Get current temperature
    const currentTemp = entity.attributes.current_temperature as number | undefined;

    // Get target temperature - try multiple attribute names
    const targetTemp = (entity.attributes.temperature || entity.attributes.target_temperature) as number | undefined;

    return {
      name,
      available,
      currentTemp,
      targetTemp
    };
  } catch (error) {
    console.error(`Error getting entity info for ${entityId}:`, error);
    return null;
  }
}

/**
 * Extract device friendly name from climate entity_id
 * Handles "climate.device_name" format
 *
 * @param entityId - Full entity ID (e.g., "climate.living_room_trvzb")
 * @returns Device friendly name (e.g., "living_room_trvzb")
 */
export function extractFriendlyName(entityId: string): string {
  // Remove the domain prefix (e.g., "climate.")
  const parts = entityId.split('.');
  if (parts.length < 2) {
    // If no domain prefix, return as-is
    return entityId;
  }

  // Return everything after the first dot
  return parts.slice(1).join('.');
}

/**
 * Check if a climate entity exists in Home Assistant
 *
 * @param hass - Home Assistant instance
 * @param entityId - Climate entity ID
 * @returns True if entity exists
 */
export function entityExists(hass: HomeAssistant, entityId: string): boolean {
  return entityId in hass.states;
}

/**
 * Get all climate entities from Home Assistant
 * Useful for entity picker in configuration
 *
 * @param hass - Home Assistant instance
 * @returns Array of climate entity IDs
 */
export function getClimateEntities(hass: HomeAssistant): string[] {
  return Object.keys(hass.states).filter(entityId => entityId.startsWith('climate.'));
}

/**
 * Create a default weekly schedule
 * Useful when initializing new configurations or when entity has no schedule
 *
 * @returns Empty weekly schedule with default transitions
 */
export function getDefaultSchedule(): WeeklySchedule {
  return createEmptyWeeklySchedule();
}
