/**
 * Day Schedule Editor Component
 * Modal dialog for editing a single day's schedule
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DayOfWeek, DaySchedule, Transition } from '../models/types';
import { copyDaySchedule, ensureMidnightTransition, sortTransitions } from '../models/schedule';
import { validateDaySchedule } from '../utils/validation';
import { cardStyles } from '../styles/card-styles';
import './transition-editor';

/**
 * Event detail types for custom events
 */
export interface ScheduleChangedEvent {
  day: DayOfWeek;
  schedule: DaySchedule;
}

export interface CopyRequestedEvent {
  day: DayOfWeek;
  schedule: DaySchedule;
}

/**
 * Day Schedule Editor Component
 * Provides a modal dialog for editing a single day's heating schedule
 */
@customElement('day-schedule-editor')
export class DayScheduleEditor extends LitElement {
  static styles = [
    cardStyles,
    css`
      :host {
        display: contents;
      }

      .editor-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .transitions-container {
        max-height: 400px;
        overflow-y: auto;
        padding-right: 8px;
      }

      .transitions-container::-webkit-scrollbar {
        width: 8px;
      }

      .transitions-container::-webkit-scrollbar-track {
        background: var(--primary-background-color, #f5f5f5);
        border-radius: 4px;
      }

      .transitions-container::-webkit-scrollbar-thumb {
        background: var(--divider-color);
        border-radius: 4px;
      }

      .transitions-container::-webkit-scrollbar-thumb:hover {
        background: var(--secondary-text-color);
      }

      .transitions-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .add-transition-container {
        display: flex;
        justify-content: center;
        padding-top: 8px;
      }

      .error-list {
        margin: 0;
        padding-left: 20px;
      }

      .error-list li {
        margin: 4px 0;
      }

      .button-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .button-row .button {
        flex: 1;
        min-width: 120px;
        justify-content: center;
      }
    `
  ];

  /**
   * Which day of the week is being edited
   */
  @property({ type: String })
  day: DayOfWeek = 'monday';

  /**
   * The schedule being edited (original, not modified)
   */
  @property({ type: Object })
  schedule: DaySchedule = { transitions: [] };

  /**
   * Whether the editor modal is open
   */
  @property({ type: Boolean })
  open = false;

  /**
   * Working copy of the schedule (modified until saved)
   */
  @state()
  private _workingSchedule: DaySchedule = { transitions: [] };

  /**
   * Validation errors
   */
  @state()
  private _errors: string[] = [];

  /**
   * Lifecycle: When properties change, update working copy
   */
  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('schedule') && this.open) {
      // Create a working copy when schedule changes and editor is open
      this._workingSchedule = copyDaySchedule(this.schedule);
      this._errors = [];
    }

    if (changedProperties.has('open') && this.open) {
      // Create a working copy when editor opens
      this._workingSchedule = copyDaySchedule(this.schedule);
      this._errors = [];
    }
  }

  /**
   * Add a new transition
   * Default: next hour after last transition, same temperature as last
   */
  private _addTransition() {
    const transitions = [...this._workingSchedule.transitions];

    if (transitions.length >= 6) {
      return; // Should not happen (button is disabled) but safety check
    }

    // Calculate default time and temperature
    let defaultTime = '12:00';
    let defaultTemp = 20;

    if (transitions.length > 0) {
      const lastTransition = transitions[transitions.length - 1];
      defaultTemp = lastTransition.temperature;

      // Try to find next hour
      try {
        const match = lastTransition.time.match(/^(\d{2}):(\d{2})$/);
        if (match) {
          const hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);

          // Add one hour, wrap around if needed
          let nextHour = hours + 1;
          if (nextHour > 23) {
            nextHour = 23;
          }

          defaultTime = `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      } catch (error) {
        console.warn('Error calculating next time:', error);
      }
    }

    const newTransition: Transition = {
      time: defaultTime,
      temperature: defaultTemp
    };

    this._workingSchedule = {
      transitions: [...transitions, newTransition]
    };
  }

  /**
   * Update a transition at a specific index
   */
  private _updateTransition(index: number, transition: Transition) {
    const transitions = [...this._workingSchedule.transitions];
    transitions[index] = { ...transition };

    this._workingSchedule = {
      transitions
    };
  }

  /**
   * Delete a transition at a specific index
   */
  private _deleteTransition(index: number) {
    const transitions = this._workingSchedule.transitions.filter((_, i) => i !== index);

    this._workingSchedule = {
      transitions
    };
  }

  /**
   * Validate the working schedule
   * Returns true if valid, false otherwise
   */
  private _validate(): boolean {
    // First, apply auto-fixes
    let schedule = { ...this._workingSchedule };

    // Ensure midnight transition
    schedule = ensureMidnightTransition(schedule);

    // Sort transitions
    schedule.transitions = sortTransitions(schedule.transitions);

    // Update working schedule with fixed version
    this._workingSchedule = schedule;

    // Now validate
    const result = validateDaySchedule(schedule);
    this._errors = result.errors;

    return result.valid;
  }

  /**
   * Save the schedule
   * Validates first, then dispatches event if valid
   */
  private _save() {
    if (!this._validate()) {
      return;
    }

    // Dispatch schedule-changed event
    this.dispatchEvent(new CustomEvent<ScheduleChangedEvent>('schedule-changed', {
      detail: {
        day: this.day,
        schedule: this._workingSchedule
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Cancel editing
   * Dispatches editor-closed event without saving
   */
  private _cancel() {
    this.dispatchEvent(new CustomEvent('editor-closed', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Request to copy this schedule to other days
   */
  private _requestCopy() {
    this.dispatchEvent(new CustomEvent<CopyRequestedEvent>('copy-requested', {
      detail: {
        day: this.day,
        schedule: this._workingSchedule
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle overlay click (close dialog)
   */
  private _handleOverlayClick(e: MouseEvent) {
    // Only close if clicking the overlay itself, not its children
    if (e.target === e.currentTarget) {
      this._cancel();
    }
  }

  /**
   * Handle transition update event from transition-editor
   */
  private _handleTransitionChange(index: number, e: CustomEvent) {
    // Event detail structure is { index: number, transition: Transition }
    const transition = e.detail.transition as Transition;
    this._updateTransition(index, transition);
  }

  /**
   * Handle transition delete event from transition-editor
   */
  private _handleTransitionDelete(index: number) {
    this._deleteTransition(index);
  }

  /**
   * Get display name for day
   */
  private _getDayDisplayName(): string {
    return this.day.charAt(0).toUpperCase() + this.day.slice(1);
  }

  render() {
    if (!this.open) {
      return html``;
    }

    const canAddTransition = this._workingSchedule.transitions.length < 6;
    const hasErrors = this._errors.length > 0;

    return html`
      <div class="modal-overlay" @click=${this._handleOverlayClick}>
        <div class="modal">
          <!-- Modal Header -->
          <div class="modal-header">
            <h2 class="modal-title">${this._getDayDisplayName()} Schedule</h2>
          </div>

          <!-- Modal Content -->
          <div class="modal-content">
            <div class="editor-content">
              <!-- Validation Errors -->
              ${hasErrors ? html`
                <div class="message message-error">
                  <strong>Validation Errors:</strong>
                  <ul class="error-list">
                    ${this._errors.map(error => html`<li>${error}</li>`)}
                  </ul>
                </div>
              ` : ''}

              <!-- Transitions List -->
              <div class="transitions-container">
                <div class="transitions-list">
                  ${this._workingSchedule.transitions.map((transition, index) => html`
                    <transition-editor
                      .index=${index}
                      .transition=${transition}
                      .canDelete=${this._workingSchedule.transitions.length > 1}
                      @transition-changed=${(e: CustomEvent) => this._handleTransitionChange(index, e)}
                      @transition-deleted=${() => this._handleTransitionDelete(index)}
                    ></transition-editor>
                  `)}
                </div>
              </div>

              <!-- Add Transition Button -->
              <div class="add-transition-container">
                <button
                  class="button button-primary"
                  ?disabled=${!canAddTransition}
                  @click=${this._addTransition}
                  title=${canAddTransition ? 'Add new transition' : 'Maximum 6 transitions per day'}
                >
                  + Add Transition
                  ${!canAddTransition ? html` <span>(Max 6)</span>` : ''}
                </button>
              </div>

              <!-- Copy Button -->
              <div class="button-row">
                <button
                  class="button button-secondary"
                  @click=${this._requestCopy}
                >
                  Copy to Other Days...
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer">
            <button
              class="button button-secondary"
              @click=${this._cancel}
            >
              Cancel
            </button>
            <button
              class="button button-success"
              @click=${this._save}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'day-schedule-editor': DayScheduleEditor;
  }
}
