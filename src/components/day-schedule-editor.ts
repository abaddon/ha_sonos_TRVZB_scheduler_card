/**
 * Day Schedule Editor Component
 * Modal dialog for editing a single day's schedule
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { DayOfWeek, DaySchedule, Transition } from '../models/types';
import { copyDaySchedule, ensureMidnightTransition, sortTransitions, generateTransitionId } from '../models/schedule';
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
        padding-top: 8px;
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
   * Auto-saves after adding
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
      id: generateTransitionId(),
      time: defaultTime,
      temperature: defaultTemp
    };

    this._workingSchedule = {
      transitions: [...transitions, newTransition]
    };

    // Auto-save after adding transition
    this._autoSave();
  }

  /**
   * Update a transition by its ID
   * Auto-saves after updating
   */
  private _updateTransitionById(id: string | undefined, transition: Transition) {
    if (!id) return;

    const transitions = this._workingSchedule.transitions.map(t =>
      t.id === id ? { ...transition, id } : t
    );

    this._workingSchedule = {
      transitions
    };

    // Auto-save after updating transition
    this._autoSave();
  }

  /**
   * Delete a transition by its ID
   * Auto-saves after deleting
   */
  private _deleteTransitionById(id: string | undefined) {
    if (!id) return;

    const transitions = this._workingSchedule.transitions.filter(t => t.id !== id);

    this._workingSchedule = {
      transitions
    };

    // Auto-save after deleting transition
    this._autoSave();
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
   * Auto-save the schedule
   * Applies auto-fixes and immediately dispatches the schedule-changed event
   * This is called automatically whenever transitions are added, updated, or deleted
   */
  private _autoSave() {
    // Apply auto-fixes (midnight transition, sorting, deduplication)
    let schedule = { ...this._workingSchedule };
    schedule = ensureMidnightTransition(schedule);
    schedule.transitions = sortTransitions(schedule.transitions);

    // Update working schedule with fixed version
    this._workingSchedule = schedule;

    // Validate to show any errors, but don't block saving
    const result = validateDaySchedule(schedule);
    this._errors = result.errors;

    // Dispatch schedule-changed event (auto-save)
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
   * Close the editor modal
   * Dispatches editor-closed event
   */
  private _close() {
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
      this._close();
    }
  }

  /**
   * Handle transition update event from transition-editor
   */
  private _handleTransitionChange(e: CustomEvent) {
    // Event detail structure is { id: string, transition: Transition }
    const { id, transition } = e.detail;
    this._updateTransitionById(id, transition);
  }

  /**
   * Handle transition delete event from transition-editor
   */
  private _handleTransitionDelete(e: CustomEvent) {
    // Event detail structure is { id: string }
    const { id } = e.detail;
    this._deleteTransitionById(id);
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
            <button
              class="button-icon close"
              @click=${this._close}
              title="Close editor"
              aria-label="Close editor"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
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
                  ${repeat(
                    this._workingSchedule.transitions,
                    (transition) => transition.id,
                    (transition, index) => html`
                      <transition-editor
                        .index=${index}
                        .transition=${transition}
                        .canDelete=${this._workingSchedule.transitions.length > 1}
                        @transition-changed=${this._handleTransitionChange}
                        @transition-deleted=${this._handleTransitionDelete}
                      ></transition-editor>
                    `
                  )}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="button-row">
                <button
                  class="button button-primary"
                  ?disabled=${!canAddTransition}
                  @click=${this._addTransition}
                  title=${canAddTransition ? 'Add new transition' : 'Maximum 6 transitions per day'}
                >
                  + Add Transition
                </button>
                <button
                  class="button button-secondary"
                  @click=${this._requestCopy}
                >
                  Copy to Other Days...
                </button>
              </div>
            </div>
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
