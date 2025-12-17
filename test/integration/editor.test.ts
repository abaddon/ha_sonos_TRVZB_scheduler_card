/**
 * Integration tests for editor.ts
 * Tests the TRVZB Scheduler Card configuration editor
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../src/editor';
import { createMockHass, createMockTRVZBEntity } from '../mocks/hass-mock';
import type { HomeAssistant, TRVZBSchedulerCardConfig } from '../../src/models/types';

// Define element interface for TypeScript
interface TRVZBSchedulerCardEditor extends HTMLElement {
  hass: HomeAssistant;
  setConfig(config: TRVZBSchedulerCardConfig): void;
  updateComplete: Promise<boolean>;
  shadowRoot: ShadowRoot | null;
}

/**
 * Helper function to create an editor element
 */
async function createEditor(
  config: Partial<TRVZBSchedulerCardConfig> = {},
  hass?: HomeAssistant
): Promise<TRVZBSchedulerCardEditor> {
  const editor = document.createElement('trvzb-scheduler-card-editor') as TRVZBSchedulerCardEditor;
  document.body.appendChild(editor);

  // Set up mock hass if not provided
  const mockHass = hass || createMockHass({
    states: {
      'climate.living_room_trvzb': createMockTRVZBEntity('living_room_trvzb'),
      'climate.bedroom_trvzb': createMockTRVZBEntity('bedroom_trvzb'),
      'climate.office_thermostat': createMockTRVZBEntity('office_thermostat'),
    },
  });

  editor.hass = mockHass;

  const defaultConfig: TRVZBSchedulerCardConfig = {
    type: 'trvzb-scheduler-card',
    entity: 'climate.living_room_trvzb',
    ...config,
  };

  editor.setConfig(defaultConfig);
  await editor.updateComplete;
  // Additional tick for child components
  await new Promise(resolve => setTimeout(resolve, 0));

  return editor;
}

/**
 * Helper function to query elements in shadow DOM
 */
function querySelector<T extends Element>(
  editor: TRVZBSchedulerCardEditor,
  selector: string
): T | null {
  return editor.shadowRoot?.querySelector<T>(selector) || null;
}

/**
 * Helper function to query all elements in shadow DOM
 */
function querySelectorAll<T extends Element>(
  editor: TRVZBSchedulerCardEditor,
  selector: string
): T[] {
  return Array.from(editor.shadowRoot?.querySelectorAll<T>(selector) || []);
}

describe('Editor Component', () => {
  describe('Editor Initialization', () => {
    it('should render without error', async () => {
      const editor = await createEditor();
      expect(editor).toBeDefined();
      expect(editor.shadowRoot).toBeDefined();
    });

    it('should display entity picker', async () => {
      const editor = await createEditor();

      // Should have either ha-entity-picker or a fallback select/input
      const entityPicker = querySelector(editor, 'ha-entity-picker');
      const entitySelect = querySelector(editor, '.editor-select');
      const entityInput = querySelector(editor, '.editor-input');

      const hasEntityPicker = entityPicker !== null || entitySelect !== null || entityInput !== null;
      expect(hasEntityPicker).toBe(true);
    });

    it('should display name input', async () => {
      const editor = await createEditor();

      const nameInputs = querySelectorAll<HTMLInputElement>(editor, 'input[type="text"]');
      const nameInput = nameInputs.find(input =>
        input.placeholder?.toLowerCase().includes('living room') ||
        input.placeholder?.toLowerCase().includes('heating')
      );

      expect(nameInput).toBeDefined();
    });

    it('should display view mode selector', async () => {
      const editor = await createEditor();

      const viewModeSelects = querySelectorAll<HTMLSelectElement>(editor, 'select');
      const viewModeSelect = viewModeSelects.find(select => {
        const options = Array.from(select.options);
        return options.some(opt => opt.value === 'week') && options.some(opt => opt.value === 'graph');
      });

      expect(viewModeSelect).toBeDefined();
    });

    it('should render all editor sections', async () => {
      const editor = await createEditor();

      const editorRows = querySelectorAll(editor, '.editor-row');
      expect(editorRows.length).toBeGreaterThanOrEqual(3); // Entity, Name, View Mode
    });

    it('should show entity label', async () => {
      const editor = await createEditor();

      const labels = querySelectorAll<HTMLLabelElement>(editor, '.editor-label');
      const entityLabel = labels.find(label => label.textContent?.trim().toLowerCase().includes('entity'));

      expect(entityLabel).toBeDefined();
    });

    it('should show name label', async () => {
      const editor = await createEditor();

      const labels = querySelectorAll<HTMLLabelElement>(editor, '.editor-label');
      const nameLabel = labels.find(label => label.textContent?.trim().toLowerCase().includes('name'));

      expect(nameLabel).toBeDefined();
    });

    it('should show view mode label', async () => {
      const editor = await createEditor();

      const labels = querySelectorAll<HTMLLabelElement>(editor, '.editor-label');
      const viewModeLabel = labels.find(label =>
        label.textContent?.trim().toLowerCase().includes('view') ||
        label.textContent?.trim().toLowerCase().includes('mode')
      );

      expect(viewModeLabel).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should dispatch config-changed event when entity changes', async () => {
      const editor = await createEditor();

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      // Find entity select/input
      const entitySelect = querySelector<HTMLSelectElement>(editor, '.editor-select');
      const entityInput = querySelector<HTMLInputElement>(editor, '.editor-input');

      if (entitySelect && entitySelect.options.length > 1) {
        // Use select if available
        entitySelect.value = 'climate.bedroom_trvzb';
        entitySelect.dispatchEvent(new Event('change', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.config.entity).toBe('climate.bedroom_trvzb');
      } else if (entityInput) {
        // Use input if select not available
        entityInput.value = 'climate.bedroom_trvzb';
        entityInput.dispatchEvent(new Event('input', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.config.entity).toBe('climate.bedroom_trvzb');
      }
    });

    it('should dispatch config-changed event when name changes', async () => {
      const editor = await createEditor();

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      // Find name input
      const nameInputs = querySelectorAll<HTMLInputElement>(editor, 'input[type="text"]');
      const nameInput = nameInputs.find(input =>
        input.placeholder?.toLowerCase().includes('living room') ||
        input.placeholder?.toLowerCase().includes('heating')
      );

      expect(nameInput).toBeDefined();
      if (nameInput) {
        nameInput.value = 'My Custom Name';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.config.name).toBe('My Custom Name');
      }
    });

    it('should dispatch config-changed event when view mode changes', async () => {
      const editor = await createEditor({ view_mode: 'week' });

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      // Find view mode select
      const viewModeSelects = querySelectorAll<HTMLSelectElement>(editor, 'select');
      const viewModeSelect = viewModeSelects.find(select => {
        const options = Array.from(select.options);
        return options.some(opt => opt.value === 'week') && options.some(opt => opt.value === 'graph');
      });

      expect(viewModeSelect).toBeDefined();
      if (viewModeSelect) {
        viewModeSelect.value = 'graph';
        viewModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.config.view_mode).toBe('graph');
      }
    });

    it('should include all expected properties in config object', async () => {
      const editor = await createEditor({
        entity: 'climate.test_entity',
        name: 'Test Card',
        view_mode: 'graph',
      });

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      // Trigger a change
      const nameInputs = querySelectorAll<HTMLInputElement>(editor, 'input[type="text"]');
      const nameInput = nameInputs.find(input =>
        input.placeholder?.toLowerCase().includes('living room') ||
        input.placeholder?.toLowerCase().includes('heating')
      );

      if (nameInput) {
        nameInput.value = 'Updated Name';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        const config = event.detail.config;

        expect(config.type).toBe('custom:trvzb-scheduler-card');
        expect(config.entity).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.view_mode).toBeDefined();
      }
    });

    it('should not dispatch event when value has not changed', async () => {
      const editor = await createEditor({ name: 'Test Name' });

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      // Find name input
      const nameInputs = querySelectorAll<HTMLInputElement>(editor, 'input[type="text"]');
      const nameInput = nameInputs.find(input => input.value === 'Test Name');

      if (nameInput) {
        nameInput.value = 'Test Name'; // Same value
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).not.toHaveBeenCalled();
      }
    });

    it('should set name to undefined when empty', async () => {
      const editor = await createEditor({ name: 'Initial Name' });

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      const nameInputs = querySelectorAll<HTMLInputElement>(editor, 'input[type="text"]');
      const nameInput = nameInputs.find(input => input.value === 'Initial Name');

      if (nameInput) {
        nameInput.value = '';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        await editor.updateComplete;

        expect(configChangedSpy).toHaveBeenCalled();
        const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
        expect(event.detail.config.name).toBeUndefined();
      }
    });
  });

  describe('Entity Picker', () => {
    it('should show available climate entities', async () => {
      const editor = await createEditor();

      // Check for entity select options
      const entitySelect = querySelector<HTMLSelectElement>(editor, '.editor-select');

      if (entitySelect) {
        const options = Array.from(entitySelect.options);
        const climateOptions = options.filter(opt =>
          opt.value.startsWith('climate.') && opt.value !== ''
        );

        expect(climateOptions.length).toBeGreaterThan(0);
      }
    });

    it('should filter to climate domain only', async () => {
      const hass = createMockHass({
        states: {
          'climate.living_room_trvzb': createMockTRVZBEntity('living_room_trvzb'),
          'light.bedroom_light': {
            entity_id: 'light.bedroom_light',
            state: 'on',
            attributes: { friendly_name: 'Bedroom Light' },
          },
          'switch.kitchen_switch': {
            entity_id: 'switch.kitchen_switch',
            state: 'off',
            attributes: { friendly_name: 'Kitchen Switch' },
          },
        },
      });

      const editor = await createEditor({}, hass);

      const entitySelect = querySelector<HTMLSelectElement>(editor, '.editor-select');

      if (entitySelect) {
        const options = Array.from(entitySelect.options);
        const nonClimateOptions = options.filter(opt =>
          opt.value !== '' && !opt.value.startsWith('climate.')
        );

        expect(nonClimateOptions.length).toBe(0);
      }
    });

    it('should handle entity selection', async () => {
      const editor = await createEditor();

      const configChangedSpy = vi.fn();
      editor.addEventListener('config-changed', configChangedSpy);

      const entitySelect = querySelector<HTMLSelectElement>(editor, '.editor-select');

      if (entitySelect && entitySelect.options.length > 1) {
        // Select the second option (first is usually empty placeholder)
        const targetOption = Array.from(entitySelect.options).find(
          opt => opt.value.startsWith('climate.') && opt.value !== editor.hass.states['climate.living_room_trvzb']?.entity_id
        );

        if (targetOption) {
          entitySelect.value = targetOption.value;
          entitySelect.dispatchEvent(new Event('change', { bubbles: true }));
          await editor.updateComplete;

          expect(configChangedSpy).toHaveBeenCalled();
          const event = configChangedSpy.mock.calls[0][0] as CustomEvent;
          expect(event.detail.config.entity).toBe(targetOption.value);
        }
      }
    });

    it('should show entity friendly names in options', async () => {
      const editor = await createEditor();

      const entitySelect = querySelector<HTMLSelectElement>(editor, '.editor-select');

      if (entitySelect) {
        const options = Array.from(entitySelect.options);
        const climateOptions = options.filter(opt => opt.value.startsWith('climate.'));

        climateOptions.forEach(option => {
          // Option text should be more readable than entity_id
          expect(option.textContent).toBeDefined();
          expect(option.textContent!.length).toBeGreaterThan(0);
        });
      }
    });

    it('should provide fallback input when no entities available', async () => {
      const hass = createMockHass({ states: {} });
      const editor = await createEditor({}, hass);

      // Should show text input for manual entry
      const manualInput = querySelector<HTMLInputElement>(editor, 'input[type="text"]');
      const hasPlaceholder = manualInput?.placeholder?.includes('climate');

      expect(manualInput).toBeDefined();
      if (manualInput) {
        expect(hasPlaceholder).toBe(true);
      }
    });
  });

  describe('View Mode Selector', () => {
    it('should have week and graph options', async () => {
      const editor = await createEditor();

      const viewModeSelects = querySelectorAll<HTMLSelectElement>(editor, 'select');
      const viewModeSelect = viewModeSelects.find(select => {
        const options = Array.from(select.options);
        return options.some(opt => opt.value === 'week') && options.some(opt => opt.value === 'graph');
      });

      expect(viewModeSelect).toBeDefined();

      if (viewModeSelect) {
        const options = Array.from(viewModeSelect.options);
        const weekOption = options.find(opt => opt.value === 'week');
        const graphOption = options.find(opt => opt.value === 'graph');

        expect(weekOption).toBeDefined();
        expect(graphOption).toBeDefined();
      }
    });

    it('should default to week view when not specified', async () => {
      const editor = await createEditor({ view_mode: undefined });

      const viewModeSelects = querySelectorAll<HTMLSelectElement>(editor, 'select');
      const viewModeSelect = viewModeSelects.find(select => {
        const options = Array.from(select.options);
        return options.some(opt => opt.value === 'week');
      });

      if (viewModeSelect) {
        expect(viewModeSelect.value).toBe('week');
      }
    });

    it('should preserve selected view mode', async () => {
      const editor = await createEditor({ view_mode: 'graph' });

      const viewModeSelects = querySelectorAll<HTMLSelectElement>(editor, 'select');
      const viewModeSelect = viewModeSelects.find(select => {
        const options = Array.from(select.options);
        return options.some(opt => opt.value === 'graph');
      });

      if (viewModeSelect) {
        expect(viewModeSelect.value).toBe('graph');
      }
    });
  });

  describe('Editor Descriptions', () => {
    it('should show helpful descriptions for each field', async () => {
      const editor = await createEditor();

      const descriptions = querySelectorAll(editor, '.editor-description');
      expect(descriptions.length).toBeGreaterThanOrEqual(3);
    });

    it('should describe entity field purpose', async () => {
      const editor = await createEditor();

      const descriptions = querySelectorAll<HTMLElement>(editor, '.editor-description');
      const entityDescription = descriptions.find(desc =>
        desc.textContent?.toLowerCase().includes('trvzb') ||
        desc.textContent?.toLowerCase().includes('entity')
      );

      expect(entityDescription).toBeDefined();
    });

    it('should describe name field as optional', async () => {
      const editor = await createEditor();

      const labels = querySelectorAll<HTMLElement>(editor, '.editor-label');
      const nameLabel = labels.find(label =>
        label.textContent?.toLowerCase().includes('name')
      );

      expect(nameLabel?.textContent?.toLowerCase()).toContain('optional');
    });
  });
});
