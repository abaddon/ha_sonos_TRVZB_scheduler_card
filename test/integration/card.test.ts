/**
 * Integration tests for TRVZB Scheduler Card
 * Tests the main card component with realistic Home Assistant scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TRVZBSchedulerCard } from '../../src/card';
import { HomeAssistant, DayOfWeek, WeeklySchedule } from '../../src/models/types';
import {
  createTestScenario,
  createMockHass,
  createMockTRVZBEntity,
  createMockScheduleSensor,
  createMockDaySensors,
  createMockClimateEntityWithoutSchedule,
  createMockSchedule,
  MockServiceCallRecorder,
  SAMPLE_ENTITY_ID,
  TestScenario
} from '../mocks/hass-mock';

/**
 * Helper: Create and mount card element to DOM
 */
function createCard(): TRVZBSchedulerCard {
  const card = document.createElement('trvzb-scheduler-card') as TRVZBSchedulerCard;
  document.body.appendChild(card);
  return card;
}

/**
 * Helper: Wait for LitElement to complete updates
 */
async function waitForUpdate(card: TRVZBSchedulerCard): Promise<void> {
  await card.updateComplete;
  // Additional tick for child components
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Helper: Query shadow DOM elements
 */
function queryShadow<T extends Element>(card: TRVZBSchedulerCard, selector: string): T | null {
  return card.shadowRoot?.querySelector<T>(selector) || null;
}

/**
 * Helper: Query all shadow DOM elements
 */
function queryShadowAll<T extends Element>(card: TRVZBSchedulerCard, selector: string): T[] {
  return Array.from(card.shadowRoot?.querySelectorAll<T>(selector) || []);
}

/**
 * Helper: Simulate custom event from child component
 */
function dispatchCustomEvent<T = any>(
  target: Element,
  eventName: string,
  detail: T
): boolean {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true
  });
  return target.dispatchEvent(event);
}

describe('TRVZBSchedulerCard - Integration Tests', () => {
  let card: TRVZBSchedulerCard;
  let scenario: TestScenario;

  beforeEach(() => {
    // Create a fresh card instance
    card = createCard();

    // Create test scenario with mock hass
    scenario = createTestScenario();
  });

  afterEach(() => {
    // Clean up card element
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
  });

  describe('Card Initialization', () => {
    it('should render without error when properly configured', async () => {
      // Set configuration
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });

      // Set hass
      card.hass = scenario.hass;

      await waitForUpdate(card);

      // Should render without throwing
      const haCard = queryShadow(card, 'ha-card');
      expect(haCard).toBeTruthy();
    });

    it('should throw error if entity not configured', () => {
      expect(() => {
        card.setConfig({
          type: 'custom:trvzb-scheduler-card',
          entity: ''
        });
      }).toThrow('You must specify an entity');
    });

    it('should show error if entity not found in hass', async () => {
      // Configure with non-existent entity
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: 'climate.non_existent'
      });

      card.hass = scenario.hass;

      await waitForUpdate(card);

      // Should show error message
      const errorMessage = queryShadow(card, '.message-error');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Climate entity not found');
    });

    it('should load schedule from entity attributes', async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });

      card.hass = scenario.hass;

      await waitForUpdate(card);

      // Access internal state via card instance
      const scheduleState = (card as any)._schedule;
      expect(scheduleState).toBeTruthy();
      expect(scheduleState.monday).toBeTruthy();
      expect(scheduleState.monday.transitions).toBeInstanceOf(Array);
    });

    it('should show error and use default schedule when day sensors have invalid state', async () => {
      // Create climate entity and day sensors with invalid states
      const entityWithoutSchedule = createMockClimateEntityWithoutSchedule();
      const entityName = entityWithoutSchedule.entity_id.split('.')[1];

      // Create day sensors with unavailable state
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const daySensorStates: Record<string, any> = {};

      for (const day of days) {
        const daySensorId = `text.${entityName}_weekly_schedule_${day}`;
        daySensorStates[daySensorId] = {
          entity_id: daySensorId,
          state: 'unavailable',
          attributes: {
            friendly_name: `Basic Thermostat Weekly Schedule ${day.charAt(0).toUpperCase() + day.slice(1)}`,
          }
        };
      }

      const customHass = createMockHass({
        states: {
          [entityWithoutSchedule.entity_id]: entityWithoutSchedule,
          ...daySensorStates
        }
      });

      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: entityWithoutSchedule.entity_id
      });

      card.hass = customHass;

      await waitForUpdate(card);

      // Should use default schedule and show error when sensors have invalid state
      const scheduleState = (card as any)._schedule;
      const errorState = (card as any)._error;
      const hasChanges = (card as any)._hasUnsavedChanges;

      // Sensors exist but have invalid state -> use default schedule with error
      expect(scheduleState).not.toBeNull();
      expect(scheduleState.monday).toBeTruthy();
      expect(scheduleState.monday.transitions).toBeInstanceOf(Array);
      expect(hasChanges).toBe(true);
      expect(errorState).toBe('No valid schedule found on sensors. Using default schedule.');

      // Error message should be displayed in the UI
      const errorMessage = queryShadow(card, '.message-error');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('No valid schedule found');
    });

    it('should use custom name from config', async () => {
      const customName = 'Custom Thermostat Name';

      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId,
        name: customName
      });

      card.hass = scenario.hass;

      await waitForUpdate(card);

      const title = queryShadow(card, '.card-title');
      expect(title?.textContent).toBe(customName);
    });

    it('should use entity friendly name when config name not provided', async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });

      card.hass = scenario.hass;

      await waitForUpdate(card);

      const title = queryShadow(card, '.card-title');
      expect(title?.textContent).toBeTruthy();
      // Should contain some version of the entity name
      expect(title?.textContent).not.toBe(scenario.entityId);
    });
  });

  describe('View Mode', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should default view mode to week', async () => {
      const viewMode = (card as any)._viewMode;
      expect(viewMode).toBe('week');
    });

    it('should render week view when viewMode is week', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      expect(weekView).toBeTruthy();

      const graphView = queryShadow(card, 'schedule-graph-view');
      expect(graphView).toBeFalsy();
    });

    it('should toggle view mode to graph when toggle button clicked', async () => {
      const toggleButton = queryShadow<HTMLButtonElement>(card, '.button-icon');
      expect(toggleButton).toBeTruthy();

      // Click to toggle
      toggleButton!.click();
      await waitForUpdate(card);

      const viewMode = (card as any)._viewMode;
      expect(viewMode).toBe('graph');
    });

    it('should render graph view when viewMode is graph', async () => {
      // Toggle to graph view
      const toggleButton = queryShadow<HTMLButtonElement>(card, '.button-icon');
      toggleButton!.click();
      await waitForUpdate(card);

      const graphView = queryShadow(card, 'schedule-graph-view');
      expect(graphView).toBeTruthy();

      const weekView = queryShadow(card, 'schedule-week-view');
      expect(weekView).toBeFalsy();
    });

    it('should respect config view_mode setting', async () => {
      // Create new card with graph view_mode
      const newCard = createCard();
      newCard.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId,
        view_mode: 'graph'
      });
      newCard.hass = scenario.hass;
      await waitForUpdate(newCard);

      const viewMode = (newCard as any)._viewMode;
      expect(viewMode).toBe('graph');

      const graphView = queryShadow(newCard, 'schedule-graph-view');
      expect(graphView).toBeTruthy();

      // Cleanup
      newCard.parentNode?.removeChild(newCard);
    });

    it('should toggle view mode back to week', async () => {
      const toggleButton = queryShadow<HTMLButtonElement>(card, '.button-icon');

      // Toggle to graph
      toggleButton!.click();
      await waitForUpdate(card);
      expect((card as any)._viewMode).toBe('graph');

      // Toggle back to week
      toggleButton!.click();
      await waitForUpdate(card);
      expect((card as any)._viewMode).toBe('week');
    });
  });

  describe('Schedule Display', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should pass schedule data to week view component', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      expect(weekView).toBeTruthy();

      // Check that schedule property is set
      const weekViewSchedule = (weekView as any).schedule;
      expect(weekViewSchedule).toBeTruthy();
      expect(weekViewSchedule.monday).toBeTruthy();
    });

    it('should pass schedule data to graph view component', async () => {
      // Toggle to graph view
      const toggleButton = queryShadow<HTMLButtonElement>(card, '.button-icon');
      toggleButton!.click();
      await waitForUpdate(card);

      const graphView = queryShadow(card, 'schedule-graph-view');
      expect(graphView).toBeTruthy();

      // Check that schedule property is set
      const graphViewSchedule = (graphView as any).schedule;
      expect(graphViewSchedule).toBeTruthy();
      expect(graphViewSchedule.monday).toBeTruthy();
    });

    it('should show loading spinner when schedule not loaded', async () => {
      // Create card without setting hass yet
      const newCard = createCard();
      newCard.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      await waitForUpdate(newCard);

      const spinner = queryShadow(newCard, '.loading-spinner');
      expect(spinner).toBeTruthy();

      // Cleanup
      newCard.parentNode?.removeChild(newCard);
    });

    it('should update schedule when day sensor states change', async () => {
      const initialSchedule = (card as any)._schedule;

      // Create new schedule
      const newSchedule = createMockSchedule('minimal');
      const updatedEntity = createMockTRVZBEntity('living_room_trvzb', newSchedule);
      const updatedDaySensors = createMockDaySensors('living_room_trvzb', newSchedule);

      // Update hass with new entity and day sensor states
      const updatedHass = createMockHass({
        states: {
          [scenario.entityId]: updatedEntity,
          ...updatedDaySensors
        }
      });

      card.hass = updatedHass;
      await waitForUpdate(card);

      const updatedScheduleState = (card as any)._schedule;

      // Schedules should be different
      expect(JSON.stringify(updatedScheduleState)).not.toBe(JSON.stringify(initialSchedule));
    });
  });

  describe('Day Editing', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should open day editor when day is selected', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      expect(weekView).toBeTruthy();

      // Simulate day-selected event
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      // Day editor should now be rendered
      const dayEditor = queryShadow(card, 'day-schedule-editor');
      expect(dayEditor).toBeTruthy();
    });

    it('should pass correct day to day editor', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'wednesday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      const editorDay = (dayEditor as any).day;
      expect(editorDay).toBe('wednesday');
    });

    it('should pass correct schedule to day editor', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      const originalSchedule = (card as any)._schedule;

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'friday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      const editorSchedule = (dayEditor as any).schedule;

      expect(editorSchedule).toEqual(originalSchedule.friday);
    });

    it('should close day editor when editor-closed event is dispatched', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      // Open editor
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      let dayEditor = queryShadow(card, 'day-schedule-editor');
      expect(dayEditor).toBeTruthy();

      // Close editor
      dispatchCustomEvent(dayEditor!, 'editor-closed', {});
      await waitForUpdate(card);

      dayEditor = queryShadow(card, 'day-schedule-editor');
      expect(dayEditor).toBeFalsy();
    });

    it('should set open property on day editor', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'tuesday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      const isOpen = (dayEditor as any).open;
      expect(isOpen).toBe(true);
    });
  });

  describe('Schedule Changes', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should update internal state when day schedule changes', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      const originalSchedule = (card as any)._schedule;

      // Open editor
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      // Simulate schedule change
      const newDaySchedule = {
        transitions: [
          { time: '00:00', temperature: 18 },
          { time: '07:00', temperature: 23 }
        ]
      };

      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: newDaySchedule
      });
      await waitForUpdate(card);

      const updatedSchedule = (card as any)._schedule;

      // Monday schedule should be updated
      expect(updatedSchedule.monday).toEqual(newDaySchedule);

      // Other days should remain unchanged
      expect(updatedSchedule.tuesday).toEqual(originalSchedule.tuesday);
    });

    it('should set hasUnsavedChanges to true after edit', async () => {
      // Initially should be false
      expect((card as any)._hasUnsavedChanges).toBe(false);

      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: {
          transitions: [{ time: '00:00', temperature: 20 }]
        }
      });
      await waitForUpdate(card);

      expect((card as any)._hasUnsavedChanges).toBe(true);
    });

    it('should enable save button when changes exist', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: {
          transitions: [{ time: '00:00', temperature: 21 }]
        }
      });
      await waitForUpdate(card);

      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      expect(saveButton).toBeTruthy();
      expect(saveButton!.disabled).toBe(false);
    });

    it('should disable save button when no changes exist', async () => {
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      expect(saveButton).toBeTruthy();
      expect(saveButton!.disabled).toBe(true);
    });

    it('should preserve changes when switching views', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'sunday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      const newSchedule = {
        transitions: [{ time: '00:00', temperature: 25 }]
      };

      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'sunday' as DayOfWeek,
        schedule: newSchedule
      });
      await waitForUpdate(card);

      // Close editor
      dispatchCustomEvent(dayEditor!, 'editor-closed', {});
      await waitForUpdate(card);

      // Toggle view mode
      const toggleButton = queryShadow<HTMLButtonElement>(card, '.button-icon');
      toggleButton!.click();
      await waitForUpdate(card);

      // Schedule should still have changes
      const schedule = (card as any)._schedule;
      expect(schedule.sunday).toEqual(newSchedule);
    });
  });

  describe('Copy Schedule', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should open copy dialog when copy is requested', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      // Open day editor
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      // Request copy
      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const copyDialog = queryShadow(card, 'copy-schedule-dialog');
      expect(copyDialog).toBeTruthy();
    });

    it('should pass correct source day to copy dialog', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'thursday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'thursday' as DayOfWeek });
      await waitForUpdate(card);

      const copyDialog = queryShadow(card, 'copy-schedule-dialog');
      const sourceDay = (copyDialog as any).sourceDay;
      expect(sourceDay).toBe('thursday');
    });

    it('should copy schedule to target days when confirmed', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');
      const originalSchedule = (card as any)._schedule;
      const mondaySchedule = { ...originalSchedule.monday };

      // Open editor for monday
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');

      // Request copy
      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const copyDialog = queryShadow(card, 'copy-schedule-dialog');

      // Confirm copy to tuesday and wednesday
      dispatchCustomEvent(copyDialog!, 'copy-confirmed', {
        targetDays: ['tuesday', 'wednesday'] as DayOfWeek[]
      });
      await waitForUpdate(card);

      const updatedSchedule = (card as any)._schedule;

      // Tuesday and wednesday should match monday (comparing time and temperature, ignoring id)
      const mondayTimeTemp = mondaySchedule.transitions.map((t: { time: string; temperature: number }) => ({ time: t.time, temperature: t.temperature }));
      const tuesdayTimeTemp = updatedSchedule.tuesday.transitions.map((t: { time: string; temperature: number }) => ({ time: t.time, temperature: t.temperature }));
      const wednesdayTimeTemp = updatedSchedule.wednesday.transitions.map((t: { time: string; temperature: number }) => ({ time: t.time, temperature: t.temperature }));

      expect(tuesdayTimeTemp).toEqual(mondayTimeTemp);
      expect(wednesdayTimeTemp).toEqual(mondayTimeTemp);

      // But should be separate objects (deep copy)
      expect(updatedSchedule.tuesday).not.toBe(mondaySchedule);
      expect(updatedSchedule.tuesday.transitions).not.toBe(mondaySchedule.transitions);
    });

    it('should close copy dialog after confirmation', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'friday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'friday' as DayOfWeek });
      await waitForUpdate(card);

      let copyDialog = queryShadow(card, 'copy-schedule-dialog');
      expect(copyDialog).toBeTruthy();

      dispatchCustomEvent(copyDialog!, 'copy-confirmed', {
        targetDays: ['saturday'] as DayOfWeek[]
      });
      await waitForUpdate(card);

      copyDialog = queryShadow(card, 'copy-schedule-dialog');
      expect(copyDialog).toBeFalsy();
    });

    it('should close copy dialog when dialog-closed event is dispatched', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'sunday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'sunday' as DayOfWeek });
      await waitForUpdate(card);

      let copyDialog = queryShadow(card, 'copy-schedule-dialog');
      expect(copyDialog).toBeTruthy();

      dispatchCustomEvent(copyDialog!, 'dialog-closed', {});
      await waitForUpdate(card);

      copyDialog = queryShadow(card, 'copy-schedule-dialog');
      expect(copyDialog).toBeFalsy();
    });

    it('should mark as having unsaved changes after copy', async () => {
      const weekView = queryShadow(card, 'schedule-week-view');

      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'copy-requested', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const copyDialog = queryShadow(card, 'copy-schedule-dialog');

      dispatchCustomEvent(copyDialog!, 'copy-confirmed', {
        targetDays: ['tuesday'] as DayOfWeek[]
      });
      await waitForUpdate(card);

      expect((card as any)._hasUnsavedChanges).toBe(true);
    });
  });

  describe('Save Operation', () => {
    beforeEach(async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);
    });

    it('should call mqtt.publish service when save is clicked', async () => {
      // Make a change to enable save
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Click save
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();

      // Wait for async operation
      await waitForUpdate(card);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify service was called
      const mqttCalls = scenario.recorder.getCalls('mqtt', 'publish');
      expect(mqttCalls.length).toBeGreaterThan(0);
    });

    it('should pass correct topic to mqtt.publish', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Save
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();
      await waitForUpdate(card);
      await new Promise(resolve => setTimeout(resolve, 10));

      const lastCall = scenario.recorder.getLastCall();
      expect(lastCall?.domain).toBe('mqtt');
      expect(lastCall?.service).toBe('publish');
      expect(lastCall?.data.topic).toContain('zigbee2mqtt');
      expect(lastCall?.data.topic).toContain('/set');
    });

    it('should pass weekly_schedule in payload', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Save
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();
      await waitForUpdate(card);
      await new Promise(resolve => setTimeout(resolve, 10));

      const lastCall = scenario.recorder.getLastCall();
      const payload = JSON.parse(lastCall?.data.payload as string);
      expect(payload).toHaveProperty('weekly_schedule');
      expect(payload.weekly_schedule).toHaveProperty('monday');
      expect(payload.weekly_schedule).toHaveProperty('sunday');
    });

    it('should show loading state during save', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Click save but don't wait for completion
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();

      // Immediately check for loading state
      const isSaving = (card as any)._saving;
      expect(isSaving).toBe(true);
    });

    it('should clear hasUnsavedChanges after successful save', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      expect((card as any)._hasUnsavedChanges).toBe(true);

      // Save
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();
      await waitForUpdate(card);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect((card as any)._hasUnsavedChanges).toBe(false);
    });

    it('should display error message on save failure', async () => {
      // Create hass that throws error but with proper states (including sensor)
      const failingHass = {
        states: scenario.hass.states,
        callService: vi.fn().mockRejectedValue(new Error('Network error'))
      } as unknown as HomeAssistant;

      card.hass = failingHass;

      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Try to save
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      saveButton!.click();
      await waitForUpdate(card);
      await new Promise(resolve => setTimeout(resolve, 10));

      const errorMessage = queryShadow(card, '.message-error');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('Failed to save');
    });

    it('should disable save button when already saving', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');

      // Check internal state for saving flag
      // (The button disabled state depends on both _hasUnsavedChanges and _saving)
      expect((card as any)._saving).toBe(false);

      // Click save (don't await completion)
      const savePromise = (card as any)._saveSchedule();

      // Check that saving flag is now true
      expect((card as any)._saving).toBe(true);

      // Wait for save to complete
      await savePromise;
      await waitForUpdate(card);
    });

    it('should show "Saving..." text when save in progress', async () => {
      // Make a change
      const weekView = queryShadow(card, 'schedule-week-view');
      dispatchCustomEvent(weekView!, 'day-selected', { day: 'monday' as DayOfWeek });
      await waitForUpdate(card);

      const dayEditor = queryShadow(card, 'day-schedule-editor');
      dispatchCustomEvent(dayEditor!, 'schedule-changed', {
        day: 'monday' as DayOfWeek,
        schedule: { transitions: [{ time: '00:00', temperature: 20 }] }
      });
      await waitForUpdate(card);

      // Set _saving flag to true manually to test UI rendering
      (card as any)._saving = true;
      await waitForUpdate(card);

      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');

      // Check button text when saving
      expect(saveButton!.textContent?.trim()).toBe('Saving...');

      // Reset state
      (card as any)._saving = false;
      await waitForUpdate(card);
    });

    it('should not save when no changes exist', async () => {
      // Try to click save without making changes
      const saveButton = queryShadow<HTMLButtonElement>(card, '.save-button');
      expect(saveButton!.disabled).toBe(true);

      // Verify that hasUnsavedChanges is false
      expect((card as any)._hasUnsavedChanges).toBe(false);

      // The save function checks _hasUnsavedChanges and returns early
      // We can verify this by checking that the internal state prevents saving
      const schedule = (card as any)._schedule;
      expect(schedule).toBeTruthy();

      // No unsaved changes means save button should be disabled
      expect((card as any)._hasUnsavedChanges).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid entity changes gracefully', async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });

      // Rapidly change hass object
      for (let i = 0; i < 5; i++) {
        const newEntity = createMockTRVZBEntity('living_room_trvzb');
        const newDaySensors = createMockDaySensors('living_room_trvzb');
        const newHass = createMockHass({
          states: {
            [scenario.entityId]: newEntity,
            ...newDaySensors
          }
        });
        card.hass = newHass;
      }

      await waitForUpdate(card);

      // Should still render without error
      const haCard = queryShadow(card, 'ha-card');
      expect(haCard).toBeTruthy();
    });

    it('should handle missing hass gracefully', async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: 'climate.test'
      });

      // Don't set hass
      await waitForUpdate(card);

      // Should render without crashing
      const haCard = queryShadow(card, 'ha-card');
      expect(haCard).toBeTruthy();
    });

    it('should handle config changes after initialization', async () => {
      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: scenario.entityId
      });
      card.hass = scenario.hass;
      await waitForUpdate(card);

      // Change config
      const newEntity = createMockTRVZBEntity('new_entity');
      const newDaySensors = createMockDaySensors('new_entity');
      const newHass = createMockHass({
        states: {
          'climate.new_entity': newEntity,
          ...newDaySensors
        }
      });

      card.setConfig({
        type: 'custom:trvzb-scheduler-card',
        entity: 'climate.new_entity'
      });
      card.hass = newHass;
      await waitForUpdate(card);

      // Should load new entity's schedule
      const schedule = (card as any)._schedule;
      expect(schedule).toBeTruthy();
    });

    it('should return correct card size', () => {
      const size = card.getCardSize();
      expect(size).toBe(4);
    });

    it('should provide stub config for UI editor', () => {
      const stubConfig = TRVZBSchedulerCard.getStubConfig();
      expect(stubConfig).toBeTruthy();
      expect(stubConfig).toHaveProperty('entity');
    });
  });
});
