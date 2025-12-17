import { LitElement, html, css, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { cardStyles, getTemperatureColor } from '../styles/card-styles.js';
import { WeeklySchedule, DayOfWeek } from '../models/types.js';

/**
 * Schedule Week View Component
 *
 * Displays the weekly schedule in a visual calendar grid format.
 * Shows 7 columns (Sunday through Saturday) with transition blocks
 * representing time ranges and temperatures.
 */
@customElement('schedule-week-view')
export class ScheduleWeekView extends LitElement {
  @property({ type: Object }) schedule?: WeeklySchedule;
  @property({ type: Boolean }) disabled = false;

  static styles = [
    cardStyles,
    css`
      :host {
        display: block;
      }

      .week-container {
        width: 100%;
      }

      .empty-placeholder {
        text-align: center;
        padding: 60px 20px;
        color: var(--secondary-text-color);
      }

      .empty-icon {
        font-size: 64px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .empty-text {
        font-size: 16px;
        font-weight: 500;
      }

      .empty-subtext {
        font-size: 14px;
        margin-top: 8px;
        opacity: 0.7;
      }
    `
  ];

  private readonly dayOrder: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];

  private readonly dayAbbreviations: Record<DayOfWeek, string> = {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat'
  };

  /**
   * Handle day column click
   * Dispatches a custom event with the selected day
   */
  private handleDayClick(day: DayOfWeek): void {
    if (this.disabled) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent('day-selected', {
        detail: { day },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Render a single day column
   */
  private renderDayColumn(day: DayOfWeek): TemplateResult {
    const daySchedule = this.schedule?.[day];
    const transitions = daySchedule?.transitions || [];
    const hasTransitions = transitions.length > 0;

    return html`
      <div
        class="day-column"
        @click=${() => this.handleDayClick(day)}
        role="button"
        tabindex=${this.disabled ? '-1' : '0'}
        aria-label="Edit ${day} schedule"
        @keydown=${(e: KeyboardEvent) => {
          if ((e.key === 'Enter' || e.key === ' ') && !this.disabled) {
            e.preventDefault();
            this.handleDayClick(day);
          }
        }}
      >
        <div class="day-header">
          ${this.dayAbbreviations[day]}
        </div>
        <div class="day-schedule">
          ${hasTransitions
            ? transitions.map((transition) => this.renderTransitionBlock(transition.time, transition.temperature))
            : this.renderEmptyDay()
          }
        </div>
      </div>
    `;
  }

  /**
   * Render a single transition block
   */
  private renderTransitionBlock(time: string, temperature: number): TemplateResult {
    const backgroundColor = getTemperatureColor(temperature);

    return html`
      <div
        class="transition-block"
        style="background-color: ${backgroundColor}"
        title="${time} - ${temperature}°C"
      >
        <span class="transition-time">${time}</span>
        <span class="transition-temp">${temperature}°C</span>
      </div>
    `;
  }

  /**
   * Render empty day placeholder
   */
  private renderEmptyDay(): TemplateResult {
    return html`
      <div class="transition-block" style="background-color: var(--divider-color); color: var(--secondary-text-color);">
        <span>No schedule</span>
      </div>
    `;
  }

  /**
   * Render empty state when no schedule is available
   */
  private renderEmptyState(): TemplateResult {
    return html`
      <div class="empty-placeholder">
        <div class="empty-icon">📅</div>
        <div class="empty-text">No Schedule Available</div>
        <div class="empty-subtext">Click on a day to create a schedule</div>
      </div>
    `;
  }

  /**
   * Main render method
   */
  render(): TemplateResult {
    // Check if schedule exists and has at least one day with transitions
    const hasSchedule = this.schedule && this.dayOrder.some(
      day => this.schedule![day]?.transitions?.length > 0
    );

    if (!hasSchedule) {
      return this.renderEmptyState();
    }

    return html`
      <div class="week-container">
        <div class="week-view">
          ${this.dayOrder.map(day => this.renderDayColumn(day))}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'schedule-week-view': ScheduleWeekView;
  }
}
