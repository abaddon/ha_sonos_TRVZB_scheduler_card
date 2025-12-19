import { css } from 'lit';

/**
 * Temperature color gradient function
 * Maps temperature from 4°C (blue) to 35°C (red)
 * with a smooth transition through green at ~20°C
 */
export function getTemperatureColor(temp: number): string {
  // Clamp temperature to valid range
  const clampedTemp = Math.max(4, Math.min(35, temp));

  // Normalize temperature to 0-1 range
  const normalized = Math.max(0, Math.min(1, (clampedTemp - 14) / (22 - 14)))

  let r: number, g: number, b: number;

  if (normalized < 0.5) {
    // Blue (4°C) to Green (19.5°C)
    const t = normalized * 2; // 0-1 for first half
    r = Math.round(0 + (100 - 0) * t);
    g = Math.round(150 + (200 - 150) * t);
    b = Math.round(255 + (50 - 255) * t);
  } else {
    // Green (19.5°C) to Red (35°C)
    const t = (normalized - 0.5) * 2; // 0-1 for second half
    r = Math.round(100 + (255 - 100) * t);
    g = Math.round(200 + (80 - 200) * t);
    b = Math.round(50 + (20 - 50) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Main card styles
 * Uses Home Assistant CSS custom properties for theming
 */
export const cardStyles = css`
  :host {
    display: block;
  }

  /* Card Container */
  ha-card {
    padding: 16px;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--card-background-color);
    box-shadow: var(--ha-card-box-shadow, none);
  }

  /* Card Header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--divider-color);
  }

  .card-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--primary-text-color);
    margin: 0;
    flex: 1;
  }

  .card-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* View Mode Toggle */
  .view-toggle {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--primary-background-color, #f5f5f5);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .view-toggle-button {
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--secondary-text-color);
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
  }

  .view-toggle-button:hover {
    background: var(--card-background-color);
  }

  .view-toggle-button.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* Week View Grid - Compact & Responsive */
  .week-view {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 12px;
  }

  .day-column {
    display: flex;
    flex-direction: column;
    min-height: 150px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    overflow: hidden;
    background: var(--card-background-color);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .day-column:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
  }

  .day-column.active {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  .day-header {
    padding: 6px 4px;
    background: var(--primary-background-color, #f5f5f5);
    text-align: center;
    font-weight: 600;
    font-size: 11px;
    color: var(--primary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .day-schedule {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 3px;
    gap: 2px;
  }

  .transition-block {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 11px;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .transition-block:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }

  .transition-time {
    font-weight: 600;
    font-size: 10px;
  }

  .transition-temp {
    font-weight: 500;
    font-size: 10px;
  }

  /* List View Accordion */
  .list-view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .day-accordion {
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    overflow: hidden;
    background: var(--card-background-color);
  }

  .day-accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    cursor: pointer;
    background: var(--primary-background-color, #f5f5f5);
    transition: background 0.2s ease;
  }

  .day-accordion-header:hover {
    background: var(--secondary-background-color, #e8e8e8);
  }

  .day-accordion-header.expanded {
    background: var(--primary-color);
    color: white;
  }

  .day-name {
    font-weight: 600;
    font-size: 14px;
    text-transform: capitalize;
  }

  .day-summary {
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-left: 8px;
  }

  .day-accordion-header.expanded .day-summary {
    color: rgba(255, 255, 255, 0.8);
  }

  .accordion-icon {
    transition: transform 0.2s ease;
  }

  .accordion-icon.expanded {
    transform: rotate(180deg);
  }

  .day-accordion-content {
    padding: 16px;
    background: var(--card-background-color);
  }

  .transitions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Transition Editor */
  .transition-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--primary-background-color, #f5f5f5);
    border-radius: 8px;
    border: 1px solid var(--divider-color);
  }

  .transition-item.invalid {
    border-color: var(--error-color);
    background: rgba(var(--error-color), 0.05);
  }

  .transition-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .transition-fields {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .transition-actions {
    display: flex;
    gap: 4px;
  }

  /* Form Inputs */
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .input-label {
    font-size: 12px;
    font-weight: 500;
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
    width: 100px;
    transition: all 0.2s ease;
  }

  .time-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color), 0.2);
  }

  .time-input:invalid {
    border-color: var(--error-color);
  }

  .temperature-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .temperature-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
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
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--primary-color);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .temperature-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .temperature-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--primary-color);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .temperature-slider::-moz-range-thumb:hover {
    transform: scale(1.1);
  }

  .temperature-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-text-color);
  }

  .temperature-display {
    padding: 4px 12px;
    border-radius: 4px;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    min-width: 60px;
    text-align: center;
  }

  /* Buttons */
  .button {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-primary {
    background: var(--primary-color);
    color: white;
  }

  .button-primary:hover:not(:disabled) {
    opacity: 0.9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .button-secondary {
    background: var(--secondary-background-color, #e8e8e8);
    color: var(--primary-text-color);
  }

  .button-secondary:hover:not(:disabled) {
    background: var(--divider-color);
  }

  .button-success {
    background: var(--success-color, #4caf50);
    color: white;
  }

  .button-success:hover:not(:disabled) {
    opacity: 0.9;
  }

  .button-error {
    background: var(--error-color);
    color: white;
  }

  .button-error:hover:not(:disabled) {
    opacity: 0.9;
  }

  .button-icon {
    padding: 6px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }

  .button-icon:hover:not(:disabled) {
    background: var(--primary-background-color, #f5f5f5);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .button-icon.add {
    border-color: var(--success-color, #4caf50);
    color: var(--success-color, #4caf50);
  }

  .button-icon.add:hover:not(:disabled) {
    background: var(--success-color, #4caf50);
    color: white;
  }

  .button-icon.remove {
    border-color: var(--error-color);
    color: var(--error-color);
  }

  .button-icon.remove:hover:not(:disabled) {
    background: var(--error-color);
    color: white;
  }

  /* Save Button with Loading State */
  .save-button {
    padding: 8px 16px;
    font-size: 14px;
    position: relative;
    white-space: nowrap;
  }

  .save-button.loading {
    pointer-events: none;
  }

  .save-button.loading::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    top: 50%;
    right: 12px;
    margin-top: -6px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Messages */
  .message {
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .message-error {
    background: rgba(var(--error-color), 0.1);
    color: var(--error-color);
    border: 1px solid var(--error-color);
  }

  .message-warning {
    background: rgba(255, 152, 0, 0.1);
    color: rgb(255, 152, 0);
    border: 1px solid rgb(255, 152, 0);
  }

  .message-success {
    background: rgba(var(--success-color, 76, 175, 80), 0.1);
    color: var(--success-color, #4caf50);
    border: 1px solid var(--success-color, #4caf50);
  }

  .message-info {
    background: rgba(var(--primary-color), 0.1);
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
  }

  .validation-error {
    font-size: 12px;
    color: var(--error-color);
    margin-top: 4px;
  }

  /* Modal/Dialog Overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--card-background-color);
    border-radius: var(--ha-card-border-radius, 12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
    animation: slideUp 0.3s ease;
    box-sizing: border-box;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--divider-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary-text-color);
    margin: 0;
  }

  .modal-content {
    padding: 20px;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--divider-color);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  /* Copy Schedule Dialog */
  .copy-dialog-days {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    margin: 16px 0;
  }

  .day-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .day-checkbox:hover {
    background: var(--primary-background-color, #f5f5f5);
  }

  .day-checkbox.checked {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .day-checkbox input[type="checkbox"] {
    cursor: pointer;
  }

  .day-checkbox-label {
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-transform: capitalize;
  }

  /* Loading State */
  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--divider-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--secondary-text-color);
  }

  .empty-state-icon {
    font-size: 48px;
    opacity: 0.3;
    margin-bottom: 16px;
  }

  .empty-state-text {
    font-size: 14px;
  }

  /* Responsive Design */
  /* Tablet breakpoint */
  @media (max-width: 768px) {
    ha-card {
      padding: 8px;
    }

    .week-view {
      grid-template-columns: repeat(4, 1fr);
      gap: 3px;
    }

    .day-column {
      min-height: 130px;
    }

    .day-header {
      font-size: 9px;
      padding: 4px 2px;
    }

    .transition-block {
      font-size: 10px;
      padding: 3px 4px;
    }

    .transition-time,
    .transition-temp {
      font-size: 9px;
    }

    .transition-fields {
      flex-direction: column;
      align-items: stretch;
    }

    .time-input {
      width: 100%;
    }

    .modal {
      width: 95%;
      max-height: 95vh;
      margin: 10px;
    }

    .modal-header {
      padding: 12px 16px;
    }

    .modal-content {
      padding: 12px;
    }

    .copy-dialog-days {
      grid-template-columns: 1fr;
    }
  }

  /* Mobile breakpoint */
  @media (max-width: 480px) {
    ha-card {
      padding: 6px;
    }

    .week-view {
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .view-toggle {
      width: 100%;
    }

    .view-toggle-button {
      flex: 1;
      text-align: center;
    }

    .day-column {
      min-height: 100px;
    }

    .day-header {
      font-size: 8px;
      padding: 3px 2px;
      letter-spacing: 0px;
    }

    .transition-block {
      font-size: 9px;
      padding: 2px 3px;
    }

    .transition-time,
    .transition-temp {
      font-size: 8px;
    }

    .transition-item {
      flex-direction: column;
      align-items: stretch;
    }

    .transition-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .modal {
      width: calc(100% - 16px);
      max-height: calc(100vh - 32px);
      margin: 8px;
      border-radius: 8px;
    }

    .modal-header {
      padding: 10px 12px;
    }

    .modal-title {
      font-size: 16px;
    }

    .modal-content {
      padding: 10px;
    }
  }
`;

/**
 * Configuration editor styles
 * Styles specific to the card configuration UI
 */
export const editorStyles = css`
  ${cardStyles}

  .editor-container {
    padding: 16px;
  }

  .editor-row {
    margin-bottom: 16px;
  }

  .editor-row:last-child {
    margin-bottom: 0;
  }

  .editor-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color);
    margin-bottom: 8px;
  }

  .editor-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    font-size: 14px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .editor-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color), 0.2);
  }

  .editor-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    font-size: 14px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .editor-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color), 0.2);
  }

  .editor-description {
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-top: 4px;
    line-height: 1.4;
  }

  .editor-error {
    color: var(--error-color);
    font-size: 12px;
    margin-top: 4px;
  }

  .editor-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .editor-toggle input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  ha-entity-picker,
  ha-selector {
    width: 100%;
  }
`;
