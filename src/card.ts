/**
 * Main TRVZB Scheduler Card Component
 * A Home Assistant custom card for managing Sonoff TRVZB thermostat schedules
 */

import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, TRVZBSchedulerCardConfig, WeeklySchedule, DayOfWeek, MQTTWeeklySchedule } from './models/types';
import { getScheduleFromSensor, deriveDaySensorEntityId, saveSchedule, getEntityInfo, entityExists } from './services/ha-service';
import { createEmptyWeeklySchedule, serializeWeeklySchedule } from './models/schedule';
import { cardStyles, getTemperatureColor } from './styles/card-styles';

// Import child components (they will be registered separately)
import './components/schedule-week-view';
import './components/schedule-graph-view';
import './components/day-schedule-editor';
import './components/copy-schedule-dialog';

@customElement('trvzb-scheduler-card')
export class TRVZBSchedulerCard extends LitElement {
  // Static styles
  static styles = cardStyles;

  // Static methods for Home Assistant integration
  public static getConfigElement() {
    return document.createElement('trvzb-scheduler-card-editor');
  }

  public static getStubConfig() {
    return { entity: '' };
  }

  // Public properties (set by Home Assistant)
  @property({ attribute: false }) public hass!: HomeAssistant;

  // Card configuration
  @state() private config!: TRVZBSchedulerCardConfig;

  // Internal state
  @state() private _schedule: WeeklySchedule | null = null;
  @state() private _viewMode: 'week' | 'graph' = 'week';
  @state() private _editingDay: DayOfWeek | null = null;
  @state() private _showCopyDialog: boolean = false;
  @state() private _copySourceDay: DayOfWeek | null = null;
  @state() private _saving: boolean = false;
  @state() private _error: string | null = null;
  @state() private _hasUnsavedChanges: boolean = false;

  // Track previous entity ID for change detection
  private _previousEntityId: string | null = null;

  // Track the schedule we saved (in MQTT format) to ignore updates until sensors match
  private _pendingSaveSchedule: MQTTWeeklySchedule | null = null;

  /**
   * Set card configuration
   * Called by Home Assistant when the card is configured
   */
  public setConfig(config: TRVZBSchedulerCardConfig): void {
    if (!config.entity) {
      throw new Error('You must specify an entity');
    }

    this.config = {
      ...config,
      view_mode: config.view_mode || 'week'
    };

    // Set initial view mode from config
    this._viewMode = this.config.view_mode || 'week';
  }

  /**
   * Get card size for Home Assistant layout
   */
  public getCardSize(): number {
    return 4;
  }

  /**
   * Lifecycle: component updated
   * Load schedule when hass or entity changes
   */
  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass') && this.hass && this.config) {
      const currentEntityId = this.config.entity;

      // Check if entity changed or if this is the first load
      if (currentEntityId !== this._previousEntityId) {
        this._previousEntityId = currentEntityId;
        this._loadSchedule();
        return;
      }

      // Skip change detection if we're currently saving
      if (this._saving) {
        return;
      }

      // If we have a pending save, check if all sensors now match what we saved
      if (this._pendingSaveSchedule) {
        const days: Array<keyof MQTTWeeklySchedule> = [
          'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
        ];

        let allMatch = true;
        for (const day of days) {
          const daySensorId = deriveDaySensorEntityId(currentEntityId, day);
          const sensor = this.hass.states[daySensorId];

          if (!sensor || sensor.state !== this._pendingSaveSchedule[day]) {
            allMatch = false;
            break;
          }
        }

        if (allMatch) {
          // All sensors caught up - clear pending and resume normal operation
          this._pendingSaveSchedule = null;
        }
        // Don't reload while we have a pending save
        return;
      }

      // Normal external change detection - check if any day sensor changed
      if (changedProps.has('hass')) {
        const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
        if (oldHass) {
          const days: Array<keyof MQTTWeeklySchedule> = [
            'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
          ];

          let hasChanges = false;
          for (const day of days) {
            const daySensorId = deriveDaySensorEntityId(currentEntityId, day);
            const oldSensor = oldHass.states[daySensorId];
            const newSensor = this.hass.states[daySensorId];

            // Compare sensor states
            if (oldSensor && newSensor && oldSensor.state !== newSensor.state) {
              hasChanges = true;
              break;
            }
          }

          // Reload if any day schedule changed externally
          if (hasChanges) {
            this._loadSchedule();
          }
        }
      }
    }
  }

  /**
   * Load schedule from 7 day sensor entities
   */
  private _loadSchedule(): void {
    if (!this.hass || !this.config?.entity) {
      return;
    }

    // Clear error
    this._error = null;

    // Check if climate entity exists (still needed for saving and entity info)
    if (!entityExists(this.hass, this.config.entity)) {
      this._error = `Climate entity not found: ${this.config.entity}`;
      this._schedule = null;
      return;
    }

    // Check if all day sensors exist
    const days: Array<keyof MQTTWeeklySchedule> = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    const missingSensors: string[] = [];

    for (const day of days) {
      const daySensorId = deriveDaySensorEntityId(this.config.entity, day);
      if (!entityExists(this.hass, daySensorId)) {
        missingSensors.push(daySensorId);
      }
    }

    if (missingSensors.length > 0) {
      this._error = `Schedule sensors not found: ${missingSensors.join(', ')}`;
      this._schedule = null;
      return;
    }

    // Get schedule from all day sensors
    const schedule = getScheduleFromSensor(this.hass, this.config.entity);

    if (schedule) {
      this._schedule = schedule;
      this._hasUnsavedChanges = false;
    } else {
      // Sensors exist but have no valid schedule - use default
      this._schedule = createEmptyWeeklySchedule();
      this._hasUnsavedChanges = true;
      this._error = 'No valid schedule found on sensors. Using default schedule.';
    }
  }

  /**
   * Handle day selected from week/list view
   */
  private _handleDaySelected(e: CustomEvent<{ day: DayOfWeek }>): void {
    this._editingDay = e.detail.day;
  }

  /**
   * Handle schedule changed in day editor
   */
  private _handleScheduleChanged(e: CustomEvent<{ day: DayOfWeek; schedule: any }>): void {
    if (!this._schedule) {
      return;
    }

    // Update the schedule for the specific day
    this._schedule = {
      ...this._schedule,
      [e.detail.day]: e.detail.schedule
    };

    // Mark as having unsaved changes
    this._hasUnsavedChanges = true;
  }

  /**
   * Handle copy requested from day editor
   */
  private _handleCopyRequested(e: CustomEvent<{ day: DayOfWeek }>): void {
    this._copySourceDay = e.detail.day;
    this._showCopyDialog = true;
  }

  /**
   * Handle copy confirmed from copy dialog
   */
  private _handleCopyConfirmed(e: CustomEvent<{ targetDays: DayOfWeek[] }>): void {
    if (!this._schedule || !this._copySourceDay) {
      return;
    }

    // Get source day schedule
    const sourceSchedule = this._schedule[this._copySourceDay];

    // Copy to target days
    const updatedSchedule = { ...this._schedule };
    for (const day of e.detail.targetDays) {
      updatedSchedule[day] = {
        transitions: sourceSchedule.transitions.map(t => ({
          time: t.time,
          temperature: t.temperature
        }))
      };
    }

    this._schedule = updatedSchedule;
    this._hasUnsavedChanges = true;

    // Close dialog
    this._handleDialogClosed();
  }

  /**
   * Handle day editor closed
   */
  private _handleEditorClosed(): void {
    this._editingDay = null;
  }

  /**
   * Handle copy dialog closed
   */
  private _handleDialogClosed(): void {
    this._showCopyDialog = false;
    this._copySourceDay = null;
  }

  /**
   * Save schedule to device
   */
  private async _saveSchedule(): Promise<void> {
    if (!this.hass || !this.config?.entity || !this._schedule || this._saving) {
      return;
    }

    this._saving = true;
    this._error = null;

    // Store the schedule in MQTT format to compare with sensor updates
    this._pendingSaveSchedule = serializeWeeklySchedule(this._schedule);

    try {
      await saveSchedule(this.hass, this.config.entity, this._schedule);
      this._hasUnsavedChanges = false;
      this._error = null;
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to save schedule';
      console.error('Save schedule error:', error);
      // Clear pending on error so we can detect external changes again
      this._pendingSaveSchedule = null;
    } finally {
      this._saving = false;
    }
  }

  /**
   * Toggle view mode between week and graph
   */
  private _toggleViewMode(): void {
    this._viewMode = this._viewMode === 'week' ? 'graph' : 'week';
  }

  /**
   * Render the card
   */
  protected render() {
    if (!this.config) {
      return html`<ha-card>
        <div class="message message-error">
          Configuration required
        </div>
      </ha-card>`;
    }

    // Get entity info for display
    const entityInfo = this.hass ? getEntityInfo(this.hass, this.config.entity) : null;
    const cardTitle = this.config.name || entityInfo?.name || this.config.entity;

    return html`
      <ha-card>
        <div class="card-header">
          <span class="card-title">${cardTitle}</span>
          <div class="card-actions">
            <button
              class="button button-icon"
              @click=${this._toggleViewMode}
              title="Toggle view mode"
            >
              ${this._viewMode === 'week' ? '📅' : '📊'}
            </button>
            <button
              class="button button-primary save-button ${this._saving ? 'loading' : ''}"
              @click=${this._saveSchedule}
              ?disabled=${!this._hasUnsavedChanges || this._saving}
            >
              ${this._saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div class="card-content">
          ${this._error
            ? html`<div class="message message-error">${this._error}</div>`
            : ''}

          ${!this._schedule
            ? html`<div class="loading-spinner"><div class="spinner"></div></div>`
            : this._viewMode === 'week'
            ? html`
                <schedule-week-view
                  .schedule=${this._schedule}
                  @day-selected=${this._handleDaySelected}
                ></schedule-week-view>
              `
            : html`
                <schedule-graph-view
                  .schedule=${this._schedule}
                  @schedule-changed=${this._handleScheduleChanged}
                  @copy-requested=${this._handleCopyRequested}
                ></schedule-graph-view>
              `}
        </div>
      </ha-card>

      ${this._schedule && this._editingDay
        ? html`
            <day-schedule-editor
              .day=${this._editingDay}
              .schedule=${this._schedule[this._editingDay]}
              .open=${true}
              @schedule-changed=${this._handleScheduleChanged}
              @copy-requested=${this._handleCopyRequested}
              @editor-closed=${this._handleEditorClosed}
            ></day-schedule-editor>
          `
        : ''}

      ${this._showCopyDialog && this._copySourceDay
        ? html`
            <copy-schedule-dialog
              .sourceDay=${this._copySourceDay}
              .open=${true}
              @copy-confirmed=${this._handleCopyConfirmed}
              @dialog-closed=${this._handleDialogClosed}
            ></copy-schedule-dialog>
          `
        : ''}
    `;
  }
}

// Declare custom element for TypeScript
declare global {
  interface HTMLElementTagNameMap {
    'trvzb-scheduler-card': TRVZBSchedulerCard;
  }
}
