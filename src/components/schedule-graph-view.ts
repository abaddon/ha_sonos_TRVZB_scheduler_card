import { LitElement, html, css, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cardStyles, getTemperatureColor } from '../styles/card-styles.js';
import { WeeklySchedule, DayOfWeek, Transition, DaySchedule } from '../models/types.js';
import { sortTransitions, copyDaySchedule } from '../models/schedule.js';

/**
 * Schedule Graph View Component
 * Displays an interactive temperature chart for the selected day with draggable points
 */
@customElement('schedule-graph-view')
export class ScheduleGraphView extends LitElement {
  static styles = [
    cardStyles,
    css`
      :host {
        display: block;
      }

      .graph-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Day selector buttons */
      .day-selector {
        display: flex;
        gap: 6px;
        justify-content: center;
        flex-wrap: wrap;
        padding: 8px 0;
      }

      .day-button {
        padding: 8px 16px;
        border: 1px solid var(--divider-color, #dddddd);
        background: var(--card-background-color, #ffffff);
        color: var(--primary-text-color, #333333);
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 60px;
      }

      .day-button:hover:not(:disabled):not(.active) {
        background: var(--secondary-background-color, #f0f0f0);
        border-color: var(--primary-color, #03a9f4);
      }

      .day-button.active {
        background: var(--primary-color, #03a9f4);
        color: white;
        border-color: var(--primary-color, #03a9f4);
        font-weight: 600;
      }

      .day-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Chart container */
      .chart-wrapper {
        position: relative;
        background: var(--card-background-color, #ffffff);
        border: 1px solid var(--divider-color, #dddddd);
        border-radius: 8px;
        padding: 20px;
        min-height: 350px;
      }

      .chart-svg {
        width: 100%;
        height: 350px;
        user-select: none;
      }

      /* Chart elements */
      .grid-line {
        stroke: var(--divider-color, #dddddd);
        stroke-width: 1;
        stroke-dasharray: 3, 3;
        opacity: 0.5;
      }

      .axis-line {
        stroke: var(--secondary-text-color, #666666);
        stroke-width: 2;
      }

      .axis-label {
        fill: var(--secondary-text-color, #666666);
        font-size: 11px;
        font-family: var(--paper-font-body1_-_font-family, Arial, sans-serif);
      }

      .axis-title {
        fill: var(--primary-text-color, #333333);
        font-size: 12px;
        font-weight: 600;
        font-family: var(--paper-font-body1_-_font-family, Arial, sans-serif);
      }

      .temperature-line {
        fill: none;
        stroke: var(--primary-color, #00bcd4);
        stroke-width: 2;
        stroke-linejoin: round;
      }

      .point-group {
        cursor: grab;
        pointer-events: auto;
      }

      .point-group:active {
        cursor: grabbing;
      }

      .temperature-point {
        transition: r 0.2s ease, stroke-width 0.2s ease;
        pointer-events: auto;
      }

      .point-group:hover .temperature-point {
        stroke-width: 3;
      }

      .temperature-point.dragging {
        stroke-width: 4;
      }

      .point-label {
        fill: var(--primary-text-color, #333333);
        font-size: 10px;
        font-weight: 600;
        pointer-events: none;
        font-family: var(--paper-font-body1_-_font-family, Arial, sans-serif);
      }

      /* Add transition button */
      .add-transition-container {
        display: flex;
        justify-content: center;
        padding-top: 8px;
      }

      .add-transition-button {
        padding: 10px 20px;
        background: var(--primary-color, #03a9f4);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .add-transition-button:hover:not(:disabled) {
        background: var(--dark-primary-color, #0288d1);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .add-transition-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .add-transition-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .day-button {
          padding: 6px 12px;
          font-size: 12px;
          min-width: 50px;
        }

        .chart-wrapper {
          padding: 12px;
          min-height: 300px;
        }

        .chart-svg {
          height: 300px;
        }
      }

      @media (max-width: 480px) {
        .day-selector {
          gap: 4px;
        }

        .day-button {
          padding: 6px 10px;
          font-size: 11px;
          min-width: 45px;
        }

        .chart-wrapper {
          padding: 8px;
          min-height: 250px;
        }

        .chart-svg {
          height: 250px;
        }
      }
    `,
  ];

  @property({ type: Object })
  schedule: WeeklySchedule | null = null;

  @property({ type: Boolean })
  disabled = false;

  @state()
  private selectedDay: DayOfWeek = 'monday';

  @state()
  private draggingPoint: number | null = null;

  @state()
  private dragStartX: number = 0;

  @state()
  private dragStartY: number = 0;

  @state()
  private isDragging: boolean = false;

  // Minimum distance (in pixels) to move before considering it a drag
  private readonly DRAG_THRESHOLD = 5;

  // Day order for display (Monday-Sunday)
  private readonly dayOrder: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Chart dimensions and layout constants
  private readonly CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
  private readonly TEMP_MIN = 4;
  private readonly TEMP_MAX = 35;
  private readonly HOUR_MIN = 0;
  private readonly HOUR_MAX = 24;

  /**
   * Select a different day
   */
  private selectDay(day: DayOfWeek): void {
    if (this.disabled) return;
    this.selectedDay = day;
  }

  /**
   * Get the current day's schedule
   */
  private getCurrentDaySchedule(): DaySchedule | null {
    if (!this.schedule) return null;
    return this.schedule[this.selectedDay] || null;
  }

  /**
   * Convert hour (0-24) to SVG X coordinate
   */
  private hourToX(hour: number, width: number): number {
    const chartWidth = width - this.CHART_PADDING.left - this.CHART_PADDING.right;
    return this.CHART_PADDING.left + (hour / 24) * chartWidth;
  }

  /**
   * Convert temperature (4-35) to SVG Y coordinate
   */
  private tempToY(temp: number, height: number): number {
    const chartHeight = height - this.CHART_PADDING.top - this.CHART_PADDING.bottom;
    const tempRange = this.TEMP_MAX - this.TEMP_MIN;
    const normalized = (temp - this.TEMP_MIN) / tempRange;
    return this.CHART_PADDING.top + chartHeight * (1 - normalized);
  }

  /**
   * Convert SVG X coordinate to hour
   */
  private xToHour(x: number, width: number): number {
    const chartWidth = width - this.CHART_PADDING.left - this.CHART_PADDING.right;
    const relX = x - this.CHART_PADDING.left;
    return Math.max(0, Math.min(24, (relX / chartWidth) * 24));
  }

  /**
   * Convert SVG Y coordinate to temperature
   */
  private yToTemp(y: number, height: number): number {
    const chartHeight = height - this.CHART_PADDING.top - this.CHART_PADDING.bottom;
    const relY = y - this.CHART_PADDING.top;
    const normalized = 1 - relY / chartHeight;
    const temp = this.TEMP_MIN + normalized * (this.TEMP_MAX - this.TEMP_MIN);

    // Round to nearest 0.5°C and clamp to range
    const rounded = Math.round(temp * 2) / 2;
    return Math.max(this.TEMP_MIN, Math.min(this.TEMP_MAX, rounded));
  }

  /**
   * Convert time string "HH:mm" to decimal hours
   */
  private timeToHours(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Convert decimal hours to time string "HH:mm"
   */
  private hoursToTime(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Handle mouse down on temperature point (start drag)
   */
  private handlePointMouseDown(index: number, event: MouseEvent): void {
    console.log('[schedule-graph-view] handlePointMouseDown called', { index, disabled: this.disabled });
    if (this.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    this.draggingPoint = index;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.isDragging = false; // Will become true once threshold is exceeded

    // Change cursor to grabbing
    document.body.style.cursor = 'grabbing';

    // Add global mouse event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove = (event: MouseEvent): void => {
    if (this.draggingPoint === null || this.disabled) return;

    // Check if we've exceeded the drag threshold
    if (!this.isDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.DRAG_THRESHOLD) {
        // Haven't moved enough to be considered a drag yet
        return;
      }

      // Now we're actually dragging
      this.isDragging = true;
      console.log('[schedule-graph-view] Drag threshold exceeded, starting drag');
    }

    const svg = this.renderRoot.querySelector('.chart-svg') as SVGSVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert to time and temperature
    const hours = this.xToHour(x, rect.width);
    const temp = this.yToTemp(y, rect.height);

    // Update the transition
    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    const transitions = [...daySchedule.transitions];
    const transition = transitions[this.draggingPoint];

    // For the first point (index 0), keep time fixed at 00:00
    // For other points, round hours to 15-minute intervals
    const isFirstPoint = this.draggingPoint === 0;
    const newTime = isFirstPoint ? '00:00' : this.hoursToTime(Math.round(hours * 4) / 4);

    // Update transition (temperature already rounded in yToTemp)
    transitions[this.draggingPoint] = {
      time: newTime,
      temperature: temp,
    };

    // Dispatch preview update (don't save yet, wait for mouse up)
    this.dispatchTransitionUpdate(transitions, false);
  };

  /**
   * Handle mouse up (end drag and save)
   */
  private handleMouseUp = (): void => {
    console.log('[schedule-graph-view] handleMouseUp called', { draggingPoint: this.draggingPoint, isDragging: this.isDragging });

    // Only save if an actual drag occurred (threshold was exceeded)
    if (this.draggingPoint !== null && this.isDragging) {
      // Save the changes
      const daySchedule = this.getCurrentDaySchedule();
      if (daySchedule) {
        this.dispatchTransitionUpdate(daySchedule.transitions, true);
      }
    }

    this.draggingPoint = null;
    this.isDragging = false;
    document.body.style.cursor = ''; // Restore cursor
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  /**
   * Dispatch transition update event
   */
  private dispatchTransitionUpdate(transitions: Transition[], save: boolean): void {
    // Sort transitions
    const sorted = sortTransitions(transitions);

    this.dispatchEvent(
      new CustomEvent('schedule-changed', {
        detail: {
          day: this.selectedDay,
          schedule: { transitions: sorted },
          save, // true = auto-save, false = preview only
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Add a new transition
   */
  private addTransition(): void {
    if (this.disabled) return;

    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    const transitions = [...daySchedule.transitions];

    // Max 6 transitions
    if (transitions.length >= 6) return;

    // Find a good default position (mid-day, mid-temperature)
    let defaultTime = '12:00';
    let defaultTemp = 20;

    // If there are existing transitions, place new one between existing ones
    if (transitions.length > 1) {
      // Sort by time first
      const sorted = sortTransitions(transitions);

      // Find the biggest time gap
      let maxGap = 0;
      let maxGapIndex = 0;

      for (let i = 0; i < sorted.length - 1; i++) {
        const hours1 = this.timeToHours(sorted[i].time);
        const hours2 = this.timeToHours(sorted[i + 1].time);
        const gap = hours2 - hours1;

        if (gap > maxGap) {
          maxGap = gap;
          maxGapIndex = i;
        }
      }

      // Place new transition in the middle of the biggest gap
      const hours1 = this.timeToHours(sorted[maxGapIndex].time);
      const hours2 = this.timeToHours(sorted[maxGapIndex + 1].time);
      const midHours = (hours1 + hours2) / 2;
      defaultTime = this.hoursToTime(midHours);

      // Average temperature of surrounding transitions
      defaultTemp = Math.round((sorted[maxGapIndex].temperature + sorted[maxGapIndex + 1].temperature) / 2);
    }

    // Add new transition
    const newTransition: Transition = {
      time: defaultTime,
      temperature: defaultTemp,
    };

    transitions.push(newTransition);

    // Dispatch update with save
    this.dispatchTransitionUpdate(transitions, true);
  }

  /**
   * Format day name for display
   */
  private formatDayName(day: DayOfWeek): string {
    return day.charAt(0).toUpperCase() + day.slice(1).substring(0, 2);
  }

  /**
   * Render day selector buttons
   */
  private renderDaySelector() {
    return html`
      <div class="day-selector">
        ${this.dayOrder.map(
          (day) => html`
            <button
              class="day-button ${this.selectedDay === day ? 'active' : ''}"
              @click="${() => this.selectDay(day)}"
              ?disabled="${this.disabled}"
            >
              ${this.formatDayName(day)}
            </button>
          `
        )}
      </div>
    `;
  }

  /**
   * Render grid lines
   */
  private renderGridLines(width: number, height: number) {
    console.log('[schedule-graph-view] renderGridLines called', { width, height, padding: this.CHART_PADDING });
    const lines = [];

    // Horizontal grid lines (temperature)
    for (let temp = this.TEMP_MIN; temp <= this.TEMP_MAX; temp += 5) {
      const y = this.tempToY(temp, height);
      console.log(`[schedule-graph-view] Horizontal grid line at temp ${temp}°C: y=${y}`);
      lines.push(svg`
        <line
          class="grid-line"
          x1="${this.CHART_PADDING.left}"
          y1="${y}"
          x2="${width - this.CHART_PADDING.right}"
          y2="${y}"
        />
      `);
    }

    // Vertical grid lines (hours)
    for (let hour = 0; hour <= 24; hour += 3) {
      const x = this.hourToX(hour, width);
      console.log(`[schedule-graph-view] Vertical grid line at hour ${hour}: x=${x}`);
      lines.push(svg`
        <line
          class="grid-line"
          x1="${x}"
          y1="${this.CHART_PADDING.top}"
          x2="${x}"
          y2="${height - this.CHART_PADDING.bottom}"
        />
      `);
    }

    console.log(`[schedule-graph-view] renderGridLines returning ${lines.length} lines`);
    return lines;
  }

  /**
   * Render axes and labels
   */
  private renderAxes(width: number, height: number) {
    console.log('[schedule-graph-view] renderAxes called', { width, height });
    const elements = [];

    // X-axis (time)
    const xAxisY = height - this.CHART_PADDING.bottom;
    console.log(`[schedule-graph-view] X-axis at y=${xAxisY}, from x=${this.CHART_PADDING.left} to x=${width - this.CHART_PADDING.right}`);
    elements.push(svg`
      <line
        class="axis-line"
        x1="${this.CHART_PADDING.left}"
        y1="${xAxisY}"
        x2="${width - this.CHART_PADDING.right}"
        y2="${xAxisY}"
      />
    `);

    // X-axis labels (hours)
    for (let hour = 0; hour <= 24; hour += 3) {
      const x = this.hourToX(hour, width);
      elements.push(svg`
        <text
          class="axis-label"
          x="${x}"
          y="${height - this.CHART_PADDING.bottom + 20}"
          text-anchor="middle"
        >
          ${hour}:00
        </text>
      `);
    }

    // X-axis title
    elements.push(svg`
      <text
        class="axis-title"
        x="${width / 2}"
        y="${height - 5}"
        text-anchor="middle"
      >
        Time of Day
      </text>
    `);

    // Y-axis (temperature)
    elements.push(svg`
      <line
        class="axis-line"
        x1="${this.CHART_PADDING.left}"
        y1="${this.CHART_PADDING.top}"
        x2="${this.CHART_PADDING.left}"
        y2="${height - this.CHART_PADDING.bottom}"
      />
    `);

    // Y-axis labels (temperature)
    for (let temp = this.TEMP_MIN; temp <= this.TEMP_MAX; temp += 5) {
      const y = this.tempToY(temp, height);
      elements.push(svg`
        <text
          class="axis-label"
          x="${this.CHART_PADDING.left - 10}"
          y="${y + 4}"
          text-anchor="end"
        >
          ${temp}°C
        </text>
      `);
    }

    // Y-axis title
    elements.push(svg`
      <text
        class="axis-title"
        x="${-height / 2}"
        y="15"
        text-anchor="middle"
        transform="rotate(-90, 0, 0)"
      >
        Temperature
      </text>
    `);

    return elements;
  }

  /**
   * Render temperature profile line as a step chart
   * Each temperature level stays constant until the next transition time
   */
  private renderTemperatureLine(transitions: Transition[], width: number, height: number) {
    console.log('[schedule-graph-view] renderTemperatureLine called', { transitions, width, height });
    if (transitions.length === 0) {
      console.log('[schedule-graph-view] No transitions, returning null');
      return null;
    }

    // Create step chart path
    // For each transition, draw horizontal line to next transition time, then vertical to next temp
    const pathParts: string[] = [];

    for (let i = 0; i < transitions.length; i++) {
      const t = transitions[i];
      const hours = this.timeToHours(t.time);
      const x = this.hourToX(hours, width);
      const y = this.tempToY(t.temperature, height);

      if (i === 0) {
        // Start point
        pathParts.push(`M ${x},${y}`);
        console.log(`[schedule-graph-view] Step start: time=${t.time}, temp=${t.temperature}°C -> x=${x}, y=${y}`);
      } else {
        // Vertical line to current temperature (step up/down)
        pathParts.push(`L ${x},${y}`);
        console.log(`[schedule-graph-view] Step vertical to: time=${t.time}, temp=${t.temperature}°C -> x=${x}, y=${y}`);
      }

      // Determine the end x position for the horizontal line
      let nextX: number;
      if (i < transitions.length - 1) {
        // Horizontal line extends to the next transition time
        const nextHours = this.timeToHours(transitions[i + 1].time);
        nextX = this.hourToX(nextHours, width);
      } else {
        // Last transition: extend to 24:00
        nextX = this.hourToX(24, width);
      }

      // Horizontal line at current temperature
      pathParts.push(`L ${nextX},${y}`);
      console.log(`[schedule-graph-view] Step horizontal to: x=${nextX}, y=${y}`);
    }

    const pathData = pathParts.join(' ');
    console.log('[schedule-graph-view] Step path data:', pathData);

    return svg`
      <path class="temperature-line" d="${pathData}" />
    `;
  }

  /**
   * Render temperature points
   */
  private renderTemperaturePoints(transitions: Transition[], width: number, height: number) {
    console.log('[schedule-graph-view] renderTemperaturePoints called', { transitions, width, height });
    return transitions.map((transition, index) => {
      const hours = this.timeToHours(transition.time);
      const x = this.hourToX(hours, width);
      const y = this.tempToY(transition.temperature, height);
      const color = getTemperatureColor(transition.temperature);
      const isDragging = this.draggingPoint === index;
      const isTimeFixed = index === 0; // Midnight transition has fixed time but adjustable temp

      console.log(`[schedule-graph-view] Point ${index}: time=${transition.time} (${hours}h), temp=${transition.temperature}°C, color=${color}, x=${x}, y=${y}`);

      return svg`
        <g
          class="point-group"
          data-point-index="${index}"
          style="cursor: ${isTimeFixed ? 'ns-resize' : 'grab'};"
        >
          <circle
            class="temperature-point ${isDragging ? 'dragging' : ''}"
            cx="${x}"
            cy="${y}"
            r="${isDragging ? 8 : 6}"
            fill="${color}"
            stroke="white"
            stroke-width="${isDragging ? 4 : 2}"
          />
          <text
            class="point-label"
            x="${x}"
            y="${y - 12}"
            text-anchor="middle"
          >
            ${transition.temperature}°C
          </text>
          <text
            class="point-label"
            x="${x}"
            y="${y + 20}"
            text-anchor="middle"
            fill="${isTimeFixed ? 'var(--info-color, #2196F3)' : 'var(--secondary-text-color, #666666)'}"
          >
            ${transition.time}${isTimeFixed ? ' (time fixed)' : ''}
          </text>
        </g>
      `;
    });
  }

  /**
   * Render the temperature chart
   */
  private renderChart() {
    const daySchedule = this.getCurrentDaySchedule();

    // Debug logging
    console.log('[schedule-graph-view] renderChart called');
    console.log('[schedule-graph-view] schedule:', this.schedule);
    console.log('[schedule-graph-view] selectedDay:', this.selectedDay);
    console.log('[schedule-graph-view] daySchedule:', daySchedule);

    if (!daySchedule) {
      console.warn('[schedule-graph-view] No day schedule found for', this.selectedDay);
      return html`
        <div class="chart-wrapper">
          <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
            No schedule data available for ${this.selectedDay}
          </div>
        </div>
      `;
    }

    const transitions = daySchedule.transitions;
    const width = 800; // ViewBox width
    const height = 350; // ViewBox height

    console.log('[schedule-graph-view] Rendering chart with', transitions.length, 'transitions');

    return html`
      <div class="chart-wrapper">
        <svg
          class="chart-svg"
          viewBox="0 0 ${width} ${height}"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- Grid lines -->
          ${this.renderGridLines(width, height)}

          <!-- Axes -->
          ${this.renderAxes(width, height)}

          <!-- Temperature profile line -->
          ${this.renderTemperatureLine(transitions, width, height)}

          <!-- Temperature points -->
          ${this.renderTemperaturePoints(transitions, width, height)}
        </svg>
      </div>
    `;
  }

  /**
   * Render add transition button
   */
  private renderAddButton() {
    const daySchedule = this.getCurrentDaySchedule();
    const canAdd = daySchedule && daySchedule.transitions.length < 6;

    return html`
      <div class="add-transition-container">
        <button
          class="add-transition-button"
          @click="${this.addTransition}"
          ?disabled="${!canAdd || this.disabled}"
          title="${canAdd ? 'Add new temperature transition' : 'Maximum 6 transitions per day'}"
        >
          + Add Transition
        </button>
      </div>
    `;
  }

  render() {
    console.log('[schedule-graph-view] render() called, schedule:', this.schedule);

    if (!this.schedule) {
      console.warn('[schedule-graph-view] No schedule data, showing empty state');
      return html`
        <div class="empty-state">
          <div class="empty-state-text">No schedule data available</div>
        </div>
      `;
    }

    console.log('[schedule-graph-view] Rendering graph view with schedule');

    return html`
      <div class="graph-container">
        ${this.renderDaySelector()}
        ${this.renderChart()}
        ${this.renderAddButton()}
      </div>
    `;
  }

  // Bound handlers to prevent duplicate listeners
  private boundSvgMouseDown: ((e: Event) => void) | null = null;
  private boundSvgDblClick: ((e: Event) => void) | null = null;

  /**
   * Attach event listener to SVG for event delegation
   * This is needed because svg template literal doesn't support @event bindings
   */
  protected updated(): void {
    // Use event delegation on the chart SVG
    const svg = this.renderRoot.querySelector('.chart-svg');
    if (svg) {
      // Create bound handlers if not exists
      if (!this.boundSvgMouseDown) {
        this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this);
      }
      if (!this.boundSvgDblClick) {
        this.boundSvgDblClick = this.handleSvgDblClick.bind(this);
      }

      // Check if listener already attached using a data attribute
      if (!svg.hasAttribute('data-listener-attached')) {
        console.log('[schedule-graph-view] updated() - attaching event delegation to SVG');
        svg.addEventListener('mousedown', this.boundSvgMouseDown);
        svg.addEventListener('dblclick', this.boundSvgDblClick);
        svg.setAttribute('data-listener-attached', 'true');
      }
    }
  }

  /**
   * Handle mousedown on SVG using event delegation
   */
  private handleSvgMouseDown(e: Event): void {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as Element;

    console.log('[schedule-graph-view] SVG mousedown, target:', target.tagName, target.className);

    // Find the closest point-group ancestor
    const pointGroup = target.closest('.point-group');
    if (pointGroup) {
      const indexAttr = pointGroup.getAttribute('data-point-index');
      console.log('[schedule-graph-view] Found point group with index:', indexAttr);
      if (indexAttr !== null) {
        const index = parseInt(indexAttr, 10);
        this.handlePointMouseDown(index, mouseEvent);
      }
    }
  }

  /**
   * Handle double-click on SVG using event delegation - removes the point
   */
  private handleSvgDblClick(e: Event): void {
    if (this.disabled) return;

    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as Element;

    console.log('[schedule-graph-view] SVG dblclick, target:', target.tagName, target.className);

    // Find the closest point-group ancestor
    const pointGroup = target.closest('.point-group');
    if (pointGroup) {
      const indexAttr = pointGroup.getAttribute('data-point-index');
      console.log('[schedule-graph-view] Double-click on point group with index:', indexAttr);

      if (indexAttr !== null) {
        const index = parseInt(indexAttr, 10);
        this.removeTransitionAtIndex(index);
      }
    }
  }

  /**
   * Remove a transition at the given index
   */
  private removeTransitionAtIndex(index: number): void {
    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    // Cannot remove the first point (00:00 is required)
    if (index === 0) {
      console.log('[schedule-graph-view] Cannot remove first point (00:00 is required)');
      return;
    }

    // Must have at least 1 transition
    if (daySchedule.transitions.length <= 1) {
      console.log('[schedule-graph-view] Cannot remove last transition');
      return;
    }

    console.log('[schedule-graph-view] Removing transition at index:', index);

    // Create new transitions array without the removed point
    const transitions = daySchedule.transitions.filter((_, i) => i !== index);

    // Dispatch update with save
    this.dispatchTransitionUpdate(transitions, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'schedule-graph-view': ScheduleGraphView;
  }
}
