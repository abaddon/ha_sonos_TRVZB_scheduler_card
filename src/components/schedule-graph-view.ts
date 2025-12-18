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
        flex-wrap: nowrap;
        padding: 8px 0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .day-selector::-webkit-scrollbar {
        display: none;
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
        flex-shrink: 0;
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
        touch-action: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
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
        font-size: 9px;
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
        -webkit-tap-highlight-color: transparent;
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

      /* Action buttons container */
      .action-buttons-container {
        display: flex;
        justify-content: center;
        gap: 12px;
        padding-top: 8px;
      }

      .action-button {
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

      .action-button:hover:not(:disabled) {
        background: var(--dark-primary-color, #0288d1);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .action-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .action-button.secondary {
        background: var(--secondary-background-color, #f0f0f0);
        color: var(--primary-text-color, #333333);
        border: 1px solid var(--divider-color, #dddddd);
      }

      .action-button.secondary:hover:not(:disabled) {
        background: var(--divider-color, #dddddd);
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
          justify-content: flex-start;
          padding: 8px 4px;
        }

        .day-button {
          padding: 6px 8px;
          font-size: 11px;
          min-width: 40px;
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
  private readonly TEMP_PADDING = 5;
  private readonly TEMP_ABSOLUTE_MIN = 4;
  private readonly TEMP_ABSOLUTE_MAX = 35;
  private readonly HOUR_MIN = 0;
  private readonly HOUR_MAX = 24;

  /**
   * Get dynamic temperature range based on current day's schedule
   */
  private getTempRange(): { min: number; max: number } {
    const daySchedule = this.getCurrentDaySchedule();

    if (!daySchedule || daySchedule.transitions.length === 0) {
      return { min: 15, max: 25 };
    }

    const temps = daySchedule.transitions.map(t => t.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    const rangeMin = Math.max(this.TEMP_ABSOLUTE_MIN, Math.floor(minTemp - this.TEMP_PADDING));
    const rangeMax = Math.min(this.TEMP_ABSOLUTE_MAX, Math.ceil(maxTemp + this.TEMP_PADDING));

    const range = rangeMax - rangeMin;
    if (range < 10) {
      const midpoint = (rangeMin + rangeMax) / 2;
      return {
        min: Math.max(this.TEMP_ABSOLUTE_MIN, Math.floor(midpoint - 5)),
        max: Math.min(this.TEMP_ABSOLUTE_MAX, Math.ceil(midpoint + 5))
      };
    }

    return { min: rangeMin, max: rangeMax };
  }

  private selectDay(day: DayOfWeek): void {
    if (this.disabled) return;
    this.selectedDay = day;
  }

  private getCurrentDaySchedule(): DaySchedule | null {
    if (!this.schedule) return null;
    return this.schedule[this.selectedDay] || null;
  }

  private hourToX(hour: number, width: number): number {
    const chartWidth = width - this.CHART_PADDING.left - this.CHART_PADDING.right;
    return this.CHART_PADDING.left + (hour / 24) * chartWidth;
  }

  private tempToY(temp: number, height: number): number {
    const { min, max } = this.getTempRange();
    const chartHeight = height - this.CHART_PADDING.top - this.CHART_PADDING.bottom;
    const tempRange = max - min;
    const normalized = (temp - min) / tempRange;
    return this.CHART_PADDING.top + chartHeight * (1 - normalized);
  }

  private xToHour(x: number, width: number): number {
    const chartWidth = width - this.CHART_PADDING.left - this.CHART_PADDING.right;
    const relX = x - this.CHART_PADDING.left;
    return Math.max(0, Math.min(24, (relX / chartWidth) * 24));
  }

  private yToTemp(y: number, height: number): number {
    const { min, max } = this.getTempRange();
    const chartHeight = height - this.CHART_PADDING.top - this.CHART_PADDING.bottom;
    const relY = y - this.CHART_PADDING.top;
    const normalized = 1 - relY / chartHeight;
    const temp = min + normalized * (max - min);

    const rounded = Math.round(temp * 2) / 2;
    return Math.max(this.TEMP_ABSOLUTE_MIN, Math.min(this.TEMP_ABSOLUTE_MAX, rounded));
  }

  private timeToHours(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  private hoursToTime(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private handlePointMouseDown(index: number, event: MouseEvent): void {
    if (this.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    this.draggingPoint = index;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.isDragging = false;

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  private handlePointTouchStart(index: number, event: TouchEvent): void {
    if (this.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    this.draggingPoint = index;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.isDragging = false;

    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
    document.addEventListener('touchcancel', this.handleTouchEnd);
  }

  // ViewBox dimensions (must match the viewBox in renderChart)
  private readonly VIEWBOX_WIDTH = 800;
  private readonly VIEWBOX_HEIGHT = 350;

  /**
   * Convert screen coordinates to SVG viewBox coordinates
   * Properly handles preserveAspectRatio transformations
   */
  private screenToSVGCoords(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    // Get the inverse of the screen transformation matrix
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPoint = point.matrixTransform(ctm.inverse());
      return { x: svgPoint.x, y: svgPoint.y };
    }

    // Fallback if CTM is not available
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.VIEWBOX_WIDTH,
      y: ((clientY - rect.top) / rect.height) * this.VIEWBOX_HEIGHT
    };
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (this.draggingPoint === null || this.disabled) return;

    if (!this.isDragging) {
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.DRAG_THRESHOLD) {
        return;
      }

      this.isDragging = true;
    }

    const svg = this.renderRoot.querySelector('.chart-svg') as SVGSVGElement;
    if (!svg) return;

    // Use SVG's built-in coordinate transformation
    const coords = this.screenToSVGCoords(svg, event.clientX, event.clientY);

    // Use viewBox dimensions for coordinate conversion
    const hours = this.xToHour(coords.x, this.VIEWBOX_WIDTH);
    const temp = this.yToTemp(coords.y, this.VIEWBOX_HEIGHT);

    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    const transitions = [...daySchedule.transitions];

    const isFirstPoint = this.draggingPoint === 0;
    const newTime = isFirstPoint ? '00:00' : this.hoursToTime(Math.round(hours * 4) / 4);

    transitions[this.draggingPoint] = {
      time: newTime,
      temperature: temp,
    };

    this.dispatchTransitionUpdate(transitions, false);
  };

  private handleMouseUp = (): void => {
    if (this.draggingPoint !== null && this.isDragging) {
      const daySchedule = this.getCurrentDaySchedule();
      if (daySchedule) {
        this.dispatchTransitionUpdate(daySchedule.transitions, true);
      }
    }

    this.draggingPoint = null;
    this.isDragging = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (this.draggingPoint === null || this.disabled) return;

    event.preventDefault();
    const touch = event.touches[0];

    if (!this.isDragging) {
      const dx = touch.clientX - this.dragStartX;
      const dy = touch.clientY - this.dragStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.DRAG_THRESHOLD) {
        return;
      }

      this.isDragging = true;
    }

    const svg = this.renderRoot.querySelector('.chart-svg') as SVGSVGElement;
    if (!svg) return;

    // Use SVG's built-in coordinate transformation
    const coords = this.screenToSVGCoords(svg, touch.clientX, touch.clientY);

    // Use viewBox dimensions for coordinate conversion
    const hours = this.xToHour(coords.x, this.VIEWBOX_WIDTH);
    const temp = this.yToTemp(coords.y, this.VIEWBOX_HEIGHT);

    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    const transitions = [...daySchedule.transitions];

    const isFirstPoint = this.draggingPoint === 0;
    const newTime = isFirstPoint ? '00:00' : this.hoursToTime(Math.round(hours * 4) / 4);

    transitions[this.draggingPoint] = {
      time: newTime,
      temperature: temp,
    };

    this.dispatchTransitionUpdate(transitions, false);
  };

  private handleTouchEnd = (): void => {
    if (this.draggingPoint !== null && this.isDragging) {
      const daySchedule = this.getCurrentDaySchedule();
      if (daySchedule) {
        this.dispatchTransitionUpdate(daySchedule.transitions, true);
      }
    }

    this.draggingPoint = null;
    this.isDragging = false;
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchcancel', this.handleTouchEnd);
  };

  private dispatchTransitionUpdate(transitions: Transition[], save: boolean): void {
    const sorted = sortTransitions(transitions);

    this.dispatchEvent(
      new CustomEvent('schedule-changed', {
        detail: {
          day: this.selectedDay,
          schedule: { transitions: sorted },
          save,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addTransition(): void {
    if (this.disabled) return;

    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    const transitions = [...daySchedule.transitions];

    if (transitions.length >= 6) return;

    let defaultTime = '12:00';
    let defaultTemp = 20;

    if (transitions.length > 1) {
      const sorted = sortTransitions(transitions);

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

      const hours1 = this.timeToHours(sorted[maxGapIndex].time);
      const hours2 = this.timeToHours(sorted[maxGapIndex + 1].time);
      const midHours = (hours1 + hours2) / 2;
      defaultTime = this.hoursToTime(midHours);

      defaultTemp = Math.round((sorted[maxGapIndex].temperature + sorted[maxGapIndex + 1].temperature) / 2);
    }

    const newTransition: Transition = {
      time: defaultTime,
      temperature: defaultTemp,
    };

    transitions.push(newTransition);
    this.dispatchTransitionUpdate(transitions, true);
  }

  private formatDayName(day: DayOfWeek): string {
    return day.charAt(0).toUpperCase() + day.slice(1).substring(0, 2);
  }

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

  private renderGridLines(width: number, height: number) {
    const lines = [];
    const { min: tempMin, max: tempMax } = this.getTempRange();

    const gridStart = Math.ceil(tempMin / 5) * 5;
    const gridEnd = Math.floor(tempMax / 5) * 5;

    for (let temp = gridStart; temp <= gridEnd; temp += 5) {
      const y = this.tempToY(temp, height);
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

    for (let hour = 0; hour <= 24; hour += 1) {
      const x = this.hourToX(hour, width);
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

    return lines;
  }

  private renderAxes(width: number, height: number) {
    const elements = [];

    const xAxisY = height - this.CHART_PADDING.bottom;
    elements.push(svg`
      <line
        class="axis-line"
        x1="${this.CHART_PADDING.left}"
        y1="${xAxisY}"
        x2="${width - this.CHART_PADDING.right}"
        y2="${xAxisY}"
      />
    `);

    for (let hour = 0; hour <= 24; hour += 1) {
      const x = this.hourToX(hour, width);
      elements.push(svg`
        <text
          class="axis-label"
          x="${x}"
          y="${height - this.CHART_PADDING.bottom + 15}"
          text-anchor="middle"
        >
          ${hour}
        </text>
      `);
    }

    elements.push(svg`
      <line
        class="axis-line"
        x1="${this.CHART_PADDING.left}"
        y1="${this.CHART_PADDING.top}"
        x2="${this.CHART_PADDING.left}"
        y2="${height - this.CHART_PADDING.bottom}"
      />
    `);

    const { min: tempMin, max: tempMax } = this.getTempRange();
    const labelStart = Math.ceil(tempMin / 5) * 5;
    const labelEnd = Math.floor(tempMax / 5) * 5;

    for (let temp = labelStart; temp <= labelEnd; temp += 5) {
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

    return elements;
  }

  private renderTemperatureLine(transitions: Transition[], width: number, height: number) {
    if (transitions.length === 0) {
      return null;
    }

    const pathParts: string[] = [];

    for (let i = 0; i < transitions.length; i++) {
      const t = transitions[i];
      const hours = this.timeToHours(t.time);
      const x = this.hourToX(hours, width);
      const y = this.tempToY(t.temperature, height);

      if (i === 0) {
        pathParts.push(`M ${x},${y}`);
      } else {
        pathParts.push(`L ${x},${y}`);
      }

      let nextX: number;
      if (i < transitions.length - 1) {
        const nextHours = this.timeToHours(transitions[i + 1].time);
        nextX = this.hourToX(nextHours, width);
      } else {
        nextX = this.hourToX(24, width);
      }

      pathParts.push(`L ${nextX},${y}`);
    }

    const pathData = pathParts.join(' ');

    return svg`
      <path class="temperature-line" d="${pathData}" />
    `;
  }

  private renderTemperaturePoints(transitions: Transition[], width: number, height: number) {
    return transitions.map((transition, index) => {
      const hours = this.timeToHours(transition.time);
      const x = this.hourToX(hours, width);
      const y = this.tempToY(transition.temperature, height);
      const color = getTemperatureColor(transition.temperature);
      const isDragging = this.draggingPoint === index;
      const isTimeFixed = index === 0;

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

  private renderChart() {
    const daySchedule = this.getCurrentDaySchedule();

    if (!daySchedule) {
      return html`
        <div class="chart-wrapper">
          <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
            No schedule data available for ${this.selectedDay}
          </div>
        </div>
      `;
    }

    const transitions = daySchedule.transitions;

    return html`
      <div class="chart-wrapper">
        <svg
          class="chart-svg"
          viewBox="0 0 ${this.VIEWBOX_WIDTH} ${this.VIEWBOX_HEIGHT}"
          preserveAspectRatio="xMidYMid meet"
        >
          ${this.renderGridLines(this.VIEWBOX_WIDTH, this.VIEWBOX_HEIGHT)}
          ${this.renderAxes(this.VIEWBOX_WIDTH, this.VIEWBOX_HEIGHT)}
          ${this.renderTemperatureLine(transitions, this.VIEWBOX_WIDTH, this.VIEWBOX_HEIGHT)}
          ${this.renderTemperaturePoints(transitions, this.VIEWBOX_WIDTH, this.VIEWBOX_HEIGHT)}
        </svg>
      </div>
    `;
  }

  private renderActionButtons() {
    const daySchedule = this.getCurrentDaySchedule();
    const canAdd = daySchedule && daySchedule.transitions.length < 6;

    return html`
      <div class="action-buttons-container">
        <button
          class="action-button"
          @click="${this.addTransition}"
          ?disabled="${!canAdd || this.disabled}"
          title="${canAdd ? 'Add new temperature transition' : 'Maximum 6 transitions per day'}"
        >
          + Add Transition
        </button>
        <button
          class="action-button secondary"
          @click="${this.copyToOtherDays}"
          ?disabled="${this.disabled}"
          title="Copy this day's schedule to other days"
        >
          Copy to Other Days
        </button>
      </div>
    `;
  }

  private copyToOtherDays(): void {
    if (this.disabled) return;

    this.dispatchEvent(
      new CustomEvent('copy-requested', {
        detail: { day: this.selectedDay },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.schedule) {
      return html`
        <div class="empty-state">
          <div class="empty-state-text">No schedule data available</div>
        </div>
      `;
    }

    return html`
      <div class="graph-container">
        ${this.renderDaySelector()}
        ${this.renderChart()}
        ${this.renderActionButtons()}
      </div>
    `;
  }

  private boundSvgMouseDown: ((e: Event) => void) | null = null;
  private boundSvgTouchStart: ((e: Event) => void) | null = null;
  private boundSvgDblClick: ((e: Event) => void) | null = null;

  protected updated(): void {
    const svg = this.renderRoot.querySelector('.chart-svg');
    if (svg) {
      if (!this.boundSvgMouseDown) {
        this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this);
      }
      if (!this.boundSvgTouchStart) {
        this.boundSvgTouchStart = this.handleSvgTouchStart.bind(this);
      }
      if (!this.boundSvgDblClick) {
        this.boundSvgDblClick = this.handleSvgDblClick.bind(this);
      }

      if (!svg.hasAttribute('data-listener-attached')) {
        svg.addEventListener('mousedown', this.boundSvgMouseDown);
        // Use passive: false to allow preventDefault on iOS
        svg.addEventListener('touchstart', this.boundSvgTouchStart, { passive: false });
        svg.addEventListener('dblclick', this.boundSvgDblClick);
        svg.setAttribute('data-listener-attached', 'true');
      }
    }
  }

  private handleSvgMouseDown(e: Event): void {
    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as Element;

    const pointGroup = target.closest('.point-group');
    if (pointGroup) {
      const indexAttr = pointGroup.getAttribute('data-point-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr, 10);
        this.handlePointMouseDown(index, mouseEvent);
      }
    }
  }

  private handleSvgTouchStart(e: Event): void {
    const touchEvent = e as TouchEvent;
    const touch = touchEvent.touches[0];

    // First try direct target from the touch event
    let target = touchEvent.target as Element;

    // If that doesn't work, try elementFromPoint as fallback
    if (!target || !(target instanceof Element)) {
      const fallbackTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!fallbackTarget) return; // Early return if no target found
      target = fallbackTarget;
    }

    const pointGroup = target.closest('.point-group');
    if (pointGroup) {
      const indexAttr = pointGroup.getAttribute('data-point-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr, 10);
        this.handlePointTouchStart(index, touchEvent);
      }
    }
  }

  private handleSvgDblClick(e: Event): void {
    if (this.disabled) return;

    const mouseEvent = e as MouseEvent;
    const target = mouseEvent.target as Element;

    const pointGroup = target.closest('.point-group');
    if (pointGroup) {
      const indexAttr = pointGroup.getAttribute('data-point-index');
      if (indexAttr !== null) {
        const index = parseInt(indexAttr, 10);
        this.removeTransitionAtIndex(index);
      }
    }
  }

  private removeTransitionAtIndex(index: number): void {
    const daySchedule = this.getCurrentDaySchedule();
    if (!daySchedule) return;

    if (index === 0) return;

    if (daySchedule.transitions.length <= 1) return;

    const transitions = daySchedule.transitions.filter((_, i) => i !== index);
    this.dispatchTransitionUpdate(transitions, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchcancel', this.handleTouchEnd);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'schedule-graph-view': ScheduleGraphView;
  }
}
