import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Transition } from '../models/types';
import { cardStyles, getTemperatureColor } from '../styles/card-styles';

/**
 * TransitionEditor - A component for editing a single transition (time + temperature)
 *
 * Emits custom events:
 * - transition-changed: when time or temperature changes
 * - transition-deleted: when delete button is clicked
 */
@customElement('transition-editor')
export class TransitionEditor extends LitElement {
  static styles = [
    cardStyles,
    css`
      :host {
        display: block;
      }

      .transition-editor {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--primary-background-color, #f5f5f5);
        border-radius: 8px;
        border: 1px solid var(--divider-color);
      }

      .transition-editor.disabled {
        opacity: 0.6;
        pointer-events: none;
      }

      .transition-editor.has-error {
        border-color: var(--error-color);
        background: rgba(244, 67, 54, 0.05);
      }

      .transition-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        font-size: 13px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .transition-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        flex-wrap: wrap;
      }

      .time-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 120px;
      }

      .temperature-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-width: 200px;
      }

      .field-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .time-input {
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        font-size: 14px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-family: monospace;
        transition: all 0.2s ease;
      }

      .time-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(3, 169, 244, 0.2);
      }

      .time-input:disabled {
        cursor: not-allowed;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        opacity: 0.7;
      }

      .time-input.error {
        border-color: var(--error-color);
      }

      .temperature-control {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .temperature-slider {
        flex: 1;
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(
          to right,
          rgb(0, 150, 255) 0%,
          rgb(100, 200, 50) 50%,
          rgb(255, 80, 20) 100%
        );
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
      }

      .temperature-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: white;
        border: 3px solid var(--primary-color);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
      }

      .temperature-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }

      .temperature-slider::-webkit-slider-thumb:active {
        transform: scale(1.25);
      }

      .temperature-slider::-moz-range-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: white;
        border: 3px solid var(--primary-color);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
      }

      .temperature-slider::-moz-range-thumb:hover {
        transform: scale(1.15);
      }

      .temperature-slider::-moz-range-thumb:active {
        transform: scale(1.25);
      }

      .temperature-display {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 14px;
        border-radius: 6px;
        color: white;
        font-size: 15px;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        min-width: 70px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .transition-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .error-message {
        font-size: 11px;
        color: var(--error-color);
        margin-top: 2px;
      }

      /* Responsive adjustments */
      @media (max-width: 600px) {
        .transition-content {
          flex-direction: column;
          align-items: stretch;
        }

        .time-field,
        .temperature-field {
          width: 100%;
          min-width: auto;
        }
      }
    `,
  ];

  @property({ type: Object })
  transition: Transition = { time: '00:00', temperature: 20 };

  @property({ type: Number })
  index = 0;

  @property({ type: Boolean })
  canDelete = true;

  @property({ type: Boolean })
  disabled = false;

  @state()
  private _validationError: string | null = null;

  /**
   * Handle time input blur (focus loss)
   * Only triggers update if the value actually changed
   */
  private _handleTimeBlur(e: Event): void {
    const input = e.target as HTMLInputElement;
    const newTime = input.value;

    // Skip if value hasn't changed
    if (newTime === this.transition.time) {
      this._validationError = null;
      return;
    }

    // Validate time format
    if (!this._isValidTime(newTime)) {
      this._validationError = 'Invalid time format (use HH:mm)';
      return;
    }

    this._validationError = null;

    const updatedTransition: Transition = {
      ...this.transition,
      time: newTime,
    };

    this._dispatchTransitionChanged(updatedTransition);
  }

  /**
   * Handle temperature slider change
   */
  private _handleTemperatureChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const newTemp = parseFloat(input.value);

    // Clamp temperature to valid range
    const clampedTemp = this._clampTemperature(newTemp);

    const updatedTransition: Transition = {
      ...this.transition,
      temperature: clampedTemp,
    };

    this._dispatchTransitionChanged(updatedTransition);
  }

  /**
   * Handle delete button click
   */
  private _handleDelete(): void {
    this.dispatchEvent(
      new CustomEvent('transition-deleted', {
        detail: { index: this.index, id: this.transition.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Dispatch transition-changed event
   */
  private _dispatchTransitionChanged(transition: Transition): void {
    this.dispatchEvent(
      new CustomEvent('transition-changed', {
        detail: { index: this.index, id: this.transition.id, transition },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Validate time format (HH:mm)
   */
  private _isValidTime(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Clamp temperature to valid range (4-35°C) in 0.5°C steps
   */
  private _clampTemperature(temp: number): number {
    // Clamp to range
    let clamped = Math.max(4, Math.min(35, temp));

    // Round to nearest 0.5
    clamped = Math.round(clamped * 2) / 2;

    return clamped;
  }

  /**
   * Get temperature color for display
   */
  private _getTemperatureColor(): string {
    const temp = this.transition?.temperature ?? 20;
    return getTemperatureColor(temp);
  }

  /**
   * Safely get the current time value
   */
  private _getTime(): string {
    return this.transition?.time ?? '00:00';
  }

  /**
   * Safely get the current temperature value
   */
  private _getTemperature(): number {
    return this.transition?.temperature ?? 20;
  }

  render() {
    // Guard against undefined transition
    if (!this.transition) {
      return html`<div class="transition-editor">Loading...</div>`;
    }

    const isFirstTransition = this.index === 0;
    const timeInputDisabled = isFirstTransition || this.disabled;
    const hasError = this._validationError !== null;

    return html`
      <div
        class="transition-editor ${this.disabled ? 'disabled' : ''} ${hasError
          ? 'has-error'
          : ''}"
      >
        <div class="transition-number">${this.index + 1}</div>

        <div class="transition-content">
          <!-- Time Input -->
          <div class="time-field">
            <label class="field-label">Time</label>
            <input
              type="time"
              class="time-input ${hasError ? 'error' : ''}"
              .value=${this._getTime()}
              @blur=${this._handleTimeBlur}
              ?disabled=${timeInputDisabled}
              step="900"
              title=${isFirstTransition
                ? 'Midnight transition cannot be changed'
                : 'Select transition time'}
            />
            ${hasError
              ? html`<div class="error-message">${this._validationError}</div>`
              : ''}
            ${isFirstTransition
              ? html`<div class="error-message" style="color: var(--info-color, #2196F3);">
                  Fixed at 00:00
                </div>`
              : ''}
          </div>

          <!-- Temperature Slider -->
          <div class="temperature-field">
            <label class="field-label">Temperature</label>
            <div class="temperature-control">
              <input
                type="range"
                class="temperature-slider"
                min="4"
                max="35"
                step="0.5"
                .value=${this._getTemperature().toString()}
                @input=${this._handleTemperatureChange}
                ?disabled=${this.disabled}
                title="Adjust temperature (4-35°C)"
              />
              <div
                class="temperature-display"
                style="background-color: ${this._getTemperatureColor()}"
              >
                ${this._getTemperature().toFixed(1)}°C
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        ${this.canDelete && !this.disabled
          ? html`
              <div class="transition-actions">
                <button
                  class="button-icon remove"
                  @click=${this._handleDelete}
                  title="Delete transition"
                  aria-label="Delete transition ${this.index + 1}"
                >
                  <svg
                    width="16"
                    height="16"
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
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transition-editor': TransitionEditor;
  }
}
