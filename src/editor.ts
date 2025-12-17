import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { editorStyles } from './styles/card-styles';
import type { HomeAssistant, TRVZBSchedulerCardConfig } from './models/types';

/**
 * Configuration editor for TRVZB Scheduler Card
 *
 * Provides a graphical interface for configuring the card:
 * - Entity picker (climate entities only)
 * - Name input (optional card title override)
 * - Default view mode selector (week/graph)
 */
@customElement('trvzb-scheduler-card-editor')
export class TRVZBSchedulerCardEditor extends LitElement {
  static styles = editorStyles;

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: TRVZBSchedulerCardConfig;
  @state() private _entityPickerAvailable = true;

  /**
   * Set configuration
   * Called by Home Assistant when the card is configured
   */
  public setConfig(config: TRVZBSchedulerCardConfig): void {
    this._config = {
      ...config,
      type: 'custom:trvzb-scheduler-card',
    };
  }

  /**
   * Dispatch config-changed event to Home Assistant
   * This notifies HA that the configuration has been updated
   */
  private _configChanged(): void {
    const event = new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: { config: this._config },
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle entity picker change
   */
  private _entityChanged(e: Event): void {
    const target = e.target as HTMLElement;
    const value = (target as any).value;

    if (value === this._config.entity) {
      return;
    }

    this._config = {
      ...this._config,
      entity: value,
    };

    this._configChanged();
  }

  /**
   * Handle name input change
   */
  private _nameChanged(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (value === this._config.name) {
      return;
    }

    this._config = {
      ...this._config,
      name: value || undefined,
    };

    this._configChanged();
  }

  /**
   * Handle view mode select change
   */
  private _viewModeChanged(e: Event): void {
    const target = e.target as HTMLSelectElement;
    const value = target.value as 'week' | 'graph';

    if (value === this._config.view_mode) {
      return;
    }

    this._config = {
      ...this._config,
      view_mode: value,
    };

    this._configChanged();
  }

  /**
   * Handle schedule sensor input change
   */
  private _scheduleSensorChanged(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (value === this._config.schedule_sensor) {
      return;
    }

    this._config = {
      ...this._config,
      schedule_sensor: value || undefined,
    };

    this._configChanged();
  }

  /**
   * Handle fallback entity select change (when ha-entity-picker is not available)
   */
  private _entitySelectChanged(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this._entityChanged(e);
  }

  /**
   * Get all climate entities
   * Used for fallback entity picker
   */
  private _getClimateEntities(): Array<{ id: string; name: string }> {
    if (!this.hass) {
      return [];
    }

    return Object.keys(this.hass.states)
      .filter((entityId) => entityId.startsWith('climate.'))
      .map((entityId) => {
        const state = this.hass.states[entityId];
        const friendlyName = state.attributes.friendly_name;
        return {
          id: entityId,
          name: (typeof friendlyName === 'string' ? friendlyName : entityId) as string,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Render entity picker (with fallback)
   */
  private _renderEntityPicker(): TemplateResult {
    // Try to use ha-entity-picker if available
    if (this._entityPickerAvailable) {
      return html`
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.entity}
          .includeDomains=${['climate']}
          @value-changed=${this._entityChanged}
          allow-custom-entity
        ></ha-entity-picker>
      `;
    }

    // Fallback to standard select
    const climateEntities = this._getClimateEntities();

    if (climateEntities.length === 0) {
      return html`
        <input
          type="text"
          class="editor-input"
          .value=${this._config.entity || ''}
          @input=${this._entityChanged}
          placeholder="climate.your_trvzb"
        />
        <div class="editor-description">
          No climate entities found. Enter the entity ID manually.
        </div>
      `;
    }

    return html`
      <select
        class="editor-select"
        .value=${this._config.entity || ''}
        @change=${this._entitySelectChanged}
      >
        <option value="">Select an entity...</option>
        ${climateEntities.map(
          (entity) => html`
            <option value=${entity.id} ?selected=${entity.id === this._config.entity}>
              ${entity.name}
            </option>
          `
        )}
      </select>
    `;
  }

  /**
   * Handle entity picker error (fallback to select)
   */
  protected firstUpdated(): void {
    // Check if ha-entity-picker is available
    if (!customElements.get('ha-entity-picker')) {
      this._entityPickerAvailable = false;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="editor-container">
        <!-- Entity Picker -->
        <div class="editor-row">
          <label class="editor-label">
            Entity
          </label>
          ${this._renderEntityPicker()}
          <div class="editor-description">
            Select the Sonoff TRVZB climate entity to manage
          </div>
        </div>

        <!-- Name Input -->
        <div class="editor-row">
          <label class="editor-label">
            Name (optional)
          </label>
          <input
            type="text"
            class="editor-input"
            .value=${this._config.name || ''}
            @input=${this._nameChanged}
            placeholder="Living Room Heating"
          />
          <div class="editor-description">
            Override the card title. Leave empty to use the entity name.
          </div>
        </div>

        <!-- View Mode Selector -->
        <div class="editor-row">
          <label class="editor-label">
            Default View Mode
          </label>
          <select
            class="editor-select"
            .value=${this._config.view_mode || 'week'}
            @change=${this._viewModeChanged}
          >
            <option value="week">Week View</option>
            <option value="graph">Graph View</option>
          </select>
          <div class="editor-description">
            Choose the default view when the card loads. Week view shows a calendar grid,
            graph view shows an interactive temperature chart.
          </div>
        </div>

        <!-- Schedule Sensor Override -->
        <div class="editor-row">
          <label class="editor-label">
            Schedule Sensor (optional)
          </label>
          <input
            type="text"
            class="editor-input"
            .value=${this._config.schedule_sensor || ''}
            @input=${this._scheduleSensorChanged}
            placeholder="sensor.device_weekly_schedule"
          />
          <div class="editor-description">
            Override the schedule sensor entity. By default, the card derives it from the
            climate entity (e.g., climate.device → sensor.device_weekly_schedule).
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Register the card in window.customCards for card picker
 * This allows Home Assistant to discover the card in the UI
 */
declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'custom:trvzb-scheduler-card',
  name: 'TRVZB Scheduler Card',
  description: 'Manage weekly heating schedules for Sonoff TRVZB thermostats',
  preview: false,
  documentationURL: 'https://github.com/abaddon/ha_sonos_TRVZB_scheduler_card',
});
