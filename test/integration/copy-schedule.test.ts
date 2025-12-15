/**
 * Integration tests for copy-schedule-dialog.ts
 * Tests the schedule copy dialog functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../../src/components/copy-schedule-dialog';
import type { DayOfWeek } from '../../src/models/types';

// Define element interface for TypeScript
interface CopyScheduleDialog extends HTMLElement {
  sourceDay: DayOfWeek;
  open: boolean;
  updateComplete: Promise<boolean>;
  shadowRoot: ShadowRoot | null;
}

/**
 * Helper to wait for multiple update cycles with longer delay
 */
async function waitForUpdates(dialog: CopyScheduleDialog, delay = 20): Promise<void> {
  await dialog.updateComplete;
  await new Promise(resolve => setTimeout(resolve, delay));
  await dialog.updateComplete;
}

/**
 * Helper function to create a copy schedule dialog element
 */
async function createDialog(
  sourceDay: DayOfWeek = 'monday',
  open = true
): Promise<CopyScheduleDialog> {
  const dialog = document.createElement('copy-schedule-dialog') as CopyScheduleDialog;
  document.body.appendChild(dialog);

  dialog.sourceDay = sourceDay;
  dialog.open = open;

  await waitForUpdates(dialog);

  return dialog;
}

/**
 * Helper function to query elements in shadow DOM
 */
function querySelector<T extends Element>(
  dialog: CopyScheduleDialog,
  selector: string
): T | null {
  return dialog.shadowRoot?.querySelector<T>(selector) || null;
}

/**
 * Helper function to query all elements in shadow DOM
 */
function querySelectorAll<T extends Element>(
  dialog: CopyScheduleDialog,
  selector: string
): T[] {
  return Array.from(dialog.shadowRoot?.querySelectorAll<T>(selector) || []);
}

/**
 * Helper to get all checked day checkboxes
 */
async function getCheckedDays(dialog: CopyScheduleDialog): Promise<DayOfWeek[]> {
  // Ensure all updates are complete
  await waitForUpdates(dialog);

  const checkboxes = querySelectorAll<HTMLInputElement>(dialog, '.day-checkbox input[type="checkbox"]');
  return checkboxes
    .filter(cb => cb.checked)
    .map(cb => {
      const label = cb.closest('.day-checkbox')?.querySelector('.day-checkbox-label');
      return label?.textContent?.trim().toLowerCase() as DayOfWeek;
    })
    .filter(Boolean);
}

/**
 * Helper to click a quick select button by text
 */
async function clickQuickSelectButton(dialog: CopyScheduleDialog, buttonText: string): Promise<void> {
  const buttons = querySelectorAll<HTMLButtonElement>(dialog, '.quick-select-button');
  const button = buttons.find(btn => btn.textContent?.trim().toLowerCase() === buttonText.toLowerCase());

  expect(button).toBeDefined();
  if (button) {
    button.click();
    await waitForUpdates(dialog);
  }
}

/**
 * Helper to toggle a day checkbox - clicks the checkbox input directly to avoid double-toggle issues
 */
async function toggleDay(dialog: CopyScheduleDialog, day: DayOfWeek): Promise<void> {
  const dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
  const dayCheckboxLabel = dayCheckboxes.find(label => {
    const labelText = label.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase();
    return labelText === day;
  });

  expect(dayCheckboxLabel).toBeDefined();
  if (dayCheckboxLabel) {
    // Click on the checkbox input directly to avoid the double-toggle from label click + checkbox change
    const checkbox = dayCheckboxLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.click();
      await waitForUpdates(dialog);
    }
  }
}

describe('Copy Schedule Dialog Component', () => {
  describe('Dialog Display', () => {
    it('should render when open is true', async () => {
      const dialog = await createDialog('monday', true);

      const modal = querySelector(dialog, '.modal');
      expect(modal).toBeDefined();
    });

    it('should be hidden when open is false', async () => {
      const dialog = await createDialog('monday', false);

      const modal = querySelector(dialog, '.modal');
      expect(modal).toBeNull();
    });

    it('should display source day in header', async () => {
      const dialog = await createDialog('wednesday', true);

      const header = querySelector<HTMLElement>(dialog, '.modal-title');
      expect(header).toBeDefined();
      expect(header?.textContent?.toLowerCase()).toContain('wednesday');
    });

    it('should exclude source day from checkboxes', async () => {
      const dialog = await createDialog('tuesday', true);

      const dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      const dayLabels = dayCheckboxes.map(cb =>
        cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase()
      );

      expect(dayLabels).not.toContain('tuesday');
      expect(dayLabels.length).toBe(6); // 7 days - 1 source day
    });

    it('should capitalize source day name in header', async () => {
      const dialog = await createDialog('friday', true);

      const header = querySelector<HTMLElement>(dialog, '.modal-title');
      expect(header?.textContent).toContain('Friday');
    });

    it('should display all expected UI sections', async () => {
      const dialog = await createDialog('monday', true);

      const quickSelectButtons = querySelector(dialog, '.quick-select-buttons');
      const dayCheckboxes = querySelector(dialog, '.copy-dialog-days');
      const footer = querySelector(dialog, '.modal-footer');

      expect(quickSelectButtons).toBeDefined();
      expect(dayCheckboxes).toBeDefined();
      expect(footer).toBeDefined();
    });

    it('should show modal overlay', async () => {
      const dialog = await createDialog('monday', true);

      const overlay = querySelector(dialog, '.modal-overlay');
      expect(overlay).toBeDefined();
    });
  });

  describe('Day Selection', () => {
    it('should allow individual days to be toggled', async () => {
      const dialog = await createDialog('monday', true);

      // Initially no days selected
      let checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(0);

      // Select Tuesday
      await toggleDay(dialog, 'tuesday');
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).toContain('tuesday');

      // Unselect Tuesday
      await toggleDay(dialog, 'tuesday');
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).not.toContain('tuesday');
    });

    it('should select weekdays (Mon-Fri) excluding source', async () => {
      const dialog = await createDialog('wednesday', true);

      await clickQuickSelectButton(dialog, 'Weekdays');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).toContain('monday');
      expect(checkedDays).toContain('tuesday');
      expect(checkedDays).not.toContain('wednesday'); // Source day
      expect(checkedDays).toContain('thursday');
      expect(checkedDays).toContain('friday');
      expect(checkedDays).not.toContain('saturday');
      expect(checkedDays).not.toContain('sunday');
    });

    it('should select weekend (Sat-Sun) excluding source', async () => {
      const dialog = await createDialog('saturday', true);

      await clickQuickSelectButton(dialog, 'Weekend');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).not.toContain('saturday'); // Source day
      expect(checkedDays).toContain('sunday');
      expect(checkedDays).not.toContain('monday');
      expect(checkedDays).not.toContain('tuesday');
    });

    it('should select all days except source', async () => {
      const dialog = await createDialog('thursday', true);

      await clickQuickSelectButton(dialog, 'All');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(6); // All except source
      expect(checkedDays).not.toContain('thursday'); // Source day

      const allOtherDays: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'friday', 'saturday'];
      allOtherDays.forEach(day => {
        expect(checkedDays).toContain(day);
      });
    });

    it('should clear all selections', async () => {
      const dialog = await createDialog('monday', true);

      // First select some days
      await clickQuickSelectButton(dialog, 'All');
      let checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBeGreaterThan(0);

      // Then clear
      await clickQuickSelectButton(dialog, 'Clear');
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(0);
    });

    it('should handle multiple individual selections', async () => {
      const dialog = await createDialog('monday', true);

      await toggleDay(dialog, 'tuesday');
      await toggleDay(dialog, 'thursday');
      await toggleDay(dialog, 'saturday');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(3);
      expect(checkedDays).toContain('tuesday');
      expect(checkedDays).toContain('thursday');
      expect(checkedDays).toContain('saturday');
    });

    it('should replace previous selection when using quick select buttons', async () => {
      const dialog = await createDialog('monday', true);

      // Select weekdays
      await clickQuickSelectButton(dialog, 'Weekdays');
      let checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(4); // Tue-Fri (excluding Monday)

      // Select weekend (should replace weekdays)
      await clickQuickSelectButton(dialog, 'Weekend');
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(2); // Sat-Sun
      expect(checkedDays).toContain('saturday');
      expect(checkedDays).toContain('sunday');
    });

    it('should maintain selection state when toggling same day twice', async () => {
      const dialog = await createDialog('monday', true);

      await toggleDay(dialog, 'wednesday');
      await toggleDay(dialog, 'wednesday');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).not.toContain('wednesday');
    });
  });

  describe('Copy Action', () => {
    it('should have copy button disabled when no days selected', async () => {
      const dialog = await createDialog('monday', true);

      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      expect(copyButton).toBeDefined();
      expect(copyButton.disabled).toBe(true);
    });

    it('should enable copy button when days are selected', async () => {
      const dialog = await createDialog('monday', true);

      await toggleDay(dialog, 'tuesday');
      await waitForUpdates(dialog);

      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      expect(copyButton).toBeDefined();
      expect(copyButton.disabled).toBe(false);
    });

    it('should dispatch copy-confirmed event with correct data', async () => {
      const dialog = await createDialog('monday', true);

      const copyConfirmedSpy = vi.fn();
      dialog.addEventListener('copy-confirmed', copyConfirmedSpy);

      // Select some days
      await toggleDay(dialog, 'tuesday');
      await toggleDay(dialog, 'friday');
      await waitForUpdates(dialog);

      // Click copy button
      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      copyButton.click();
      await waitForUpdates(dialog);

      expect(copyConfirmedSpy).toHaveBeenCalled();
      const event = copyConfirmedSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.sourceDay).toBe('monday');
      expect(event.detail.targetDays).toContain('tuesday');
      expect(event.detail.targetDays).toContain('friday');
      expect(event.detail.targetDays.length).toBe(2);
    });

    it('should dispatch dialog-closed event on cancel', async () => {
      const dialog = await createDialog('monday', true);

      const dialogClosedSpy = vi.fn();
      dialog.addEventListener('dialog-closed', dialogClosedSpy);

      const cancelButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-secondary')[0];
      cancelButton.click();
      await dialog.updateComplete;

      expect(dialogClosedSpy).toHaveBeenCalled();
    });

    it('should clear selection after successful copy', async () => {
      const dialog = await createDialog('monday', true);

      // Select days
      await toggleDay(dialog, 'tuesday');
      await toggleDay(dialog, 'wednesday');

      let checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(2);

      // Click copy
      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      copyButton.click();
      await waitForUpdates(dialog);

      // Selection should be cleared
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(0);
    });

    it('should clear selection after cancel', async () => {
      const dialog = await createDialog('monday', true);

      // Select days
      await toggleDay(dialog, 'tuesday');

      let checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(1);

      // Click cancel
      const cancelButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-secondary')[0];
      cancelButton.click();
      await waitForUpdates(dialog);

      // Selection should be cleared
      checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(0);
    });

    it('should not copy when button is disabled', async () => {
      const dialog = await createDialog('monday', true);

      const copyConfirmedSpy = vi.fn();
      dialog.addEventListener('copy-confirmed', copyConfirmedSpy);

      // Try to click copy button without selecting days
      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      copyButton.click();
      await dialog.updateComplete;

      expect(copyConfirmedSpy).not.toHaveBeenCalled();
    });

    it('should update copy button text based on selection count', async () => {
      const dialog = await createDialog('monday', true);

      // Select 1 day
      await toggleDay(dialog, 'tuesday');
      await waitForUpdates(dialog);
      let copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      expect(copyButton.textContent).toContain('1');
      expect(copyButton.textContent?.toLowerCase()).toContain('day');

      // Select 2 days
      await toggleDay(dialog, 'wednesday');
      await waitForUpdates(dialog);
      copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      expect(copyButton.textContent).toContain('2');
      expect(copyButton.textContent?.toLowerCase()).toContain('days');
    });
  });

  describe('Quick Select Buttons', () => {
    it('should display all quick select buttons', async () => {
      const dialog = await createDialog('monday', true);

      const buttons = querySelectorAll<HTMLButtonElement>(dialog, '.quick-select-button');
      const buttonTexts = buttons.map(btn => btn.textContent?.trim().toLowerCase());

      expect(buttonTexts).toContain('weekdays');
      expect(buttonTexts).toContain('weekend');
      expect(buttonTexts).toContain('all');
      expect(buttonTexts).toContain('clear');
    });

    it('should have descriptive titles on quick select buttons', async () => {
      const dialog = await createDialog('monday', true);

      const buttons = querySelectorAll<HTMLButtonElement>(dialog, '.quick-select-button');

      buttons.forEach(button => {
        expect(button.title).toBeDefined();
        expect(button.title.length).toBeGreaterThan(0);
      });
    });

    it('should handle weekdays selection when source is a weekday', async () => {
      const dialog = await createDialog('tuesday', true);

      await clickQuickSelectButton(dialog, 'Weekdays');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(4); // Mon, Wed, Thu, Fri (excluding Tue)
      expect(checkedDays).not.toContain('tuesday');
    });

    it('should handle weekend selection when source is weekend', async () => {
      const dialog = await createDialog('sunday', true);

      await clickQuickSelectButton(dialog, 'Weekend');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(1); // Only Saturday
      expect(checkedDays).toContain('saturday');
      expect(checkedDays).not.toContain('sunday');
    });
  });

  describe('Dialog Interaction', () => {
    it('should close dialog when overlay is clicked', async () => {
      const dialog = await createDialog('monday', true);

      const dialogClosedSpy = vi.fn();
      dialog.addEventListener('dialog-closed', dialogClosedSpy);

      const overlay = querySelector<HTMLElement>(dialog, '.modal-overlay');
      expect(overlay).toBeDefined();

      if (overlay) {
        // Create a click event on the overlay itself (not bubbled from child)
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(clickEvent, 'target', { value: overlay, enumerable: true });
        Object.defineProperty(clickEvent, 'currentTarget', { value: overlay, enumerable: true });

        overlay.dispatchEvent(clickEvent);
        await dialog.updateComplete;

        expect(dialogClosedSpy).toHaveBeenCalled();
      }
    });

    it('should not close dialog when modal content is clicked', async () => {
      const dialog = await createDialog('monday', true);

      const dialogClosedSpy = vi.fn();
      dialog.addEventListener('dialog-closed', dialogClosedSpy);

      const modalContent = querySelector<HTMLElement>(dialog, '.modal');
      expect(modalContent).toBeDefined();

      if (modalContent) {
        modalContent.click();
        await dialog.updateComplete;

        expect(dialogClosedSpy).not.toHaveBeenCalled();
      }
    });

    it('should render all 6 available days for selection', async () => {
      const dialog = await createDialog('monday', true);

      const dayCheckboxes = querySelectorAll(dialog, '.day-checkbox');
      expect(dayCheckboxes.length).toBe(6); // 7 days - 1 source day
    });

    it('should display days in correct order', async () => {
      const dialog = await createDialog('monday', true);

      const dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      const dayLabels = dayCheckboxes.map(cb =>
        cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase()
      );

      // Should be in Sun-Sat order, excluding Monday
      expect(dayLabels[0]).toBe('sunday');
      expect(dayLabels[1]).toBe('tuesday');
      expect(dayLabels[2]).toBe('wednesday');
      expect(dayLabels[3]).toBe('thursday');
      expect(dayLabels[4]).toBe('friday');
      expect(dayLabels[5]).toBe('saturday');
    });
  });

  describe('Visual Feedback', () => {
    it('should apply checked class to selected days', async () => {
      const dialog = await createDialog('monday', true);

      await toggleDay(dialog, 'tuesday');
      await waitForUpdates(dialog);

      const dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      const tuesdayCheckbox = dayCheckboxes.find(cb => {
        const label = cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase();
        return label === 'tuesday';
      });

      expect(tuesdayCheckbox?.classList.contains('checked')).toBe(true);
    });

    it('should remove checked class when day is unselected', async () => {
      const dialog = await createDialog('monday', true);

      // Select
      await toggleDay(dialog, 'wednesday');
      await waitForUpdates(dialog);
      let dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      let wednesdayCheckbox = dayCheckboxes.find(cb => {
        const label = cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase();
        return label === 'wednesday';
      });
      expect(wednesdayCheckbox?.classList.contains('checked')).toBe(true);

      // Unselect
      await toggleDay(dialog, 'wednesday');
      await waitForUpdates(dialog);
      dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      wednesdayCheckbox = dayCheckboxes.find(cb => {
        const label = cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase();
        return label === 'wednesday';
      });
      expect(wednesdayCheckbox?.classList.contains('checked')).toBe(false);
    });

    it('should have cancel button with secondary styling', async () => {
      const dialog = await createDialog('monday', true);

      const cancelButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-secondary')[0];
      expect(cancelButton).toBeDefined();
      expect(cancelButton.classList.contains('button-secondary')).toBe(true);
    });

    it('should have copy button with primary styling', async () => {
      const dialog = await createDialog('monday', true);

      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      expect(copyButton).toBeDefined();
      expect(copyButton.classList.contains('button-primary')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle source day being sunday', async () => {
      const dialog = await createDialog('sunday', true);

      const header = querySelector<HTMLElement>(dialog, '.modal-title');
      expect(header?.textContent?.toLowerCase()).toContain('sunday');

      const dayCheckboxes = querySelectorAll<HTMLLabelElement>(dialog, '.day-checkbox');
      const dayLabels = dayCheckboxes.map(cb =>
        cb.querySelector('.day-checkbox-label')?.textContent?.trim().toLowerCase()
      );

      expect(dayLabels).not.toContain('sunday');
      expect(dayLabels.length).toBe(6);
    });

    it('should handle rapid toggling of days', async () => {
      const dialog = await createDialog('monday', true);

      // Rapidly toggle the same day multiple times
      await toggleDay(dialog, 'tuesday');
      await toggleDay(dialog, 'tuesday');
      await toggleDay(dialog, 'tuesday');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays).toContain('tuesday');
    });

    it('should handle switching between quick select buttons rapidly', async () => {
      const dialog = await createDialog('monday', true);

      await clickQuickSelectButton(dialog, 'Weekdays');
      await clickQuickSelectButton(dialog, 'Weekend');
      await clickQuickSelectButton(dialog, 'All');
      await clickQuickSelectButton(dialog, 'Clear');

      const checkedDays = await getCheckedDays(dialog);
      expect(checkedDays.length).toBe(0);
    });

    it('should properly handle events bubbling and composition', async () => {
      const dialog = await createDialog('monday', true);

      const copyConfirmedSpy = vi.fn();
      dialog.addEventListener('copy-confirmed', copyConfirmedSpy);

      await toggleDay(dialog, 'tuesday');
      await waitForUpdates(dialog);

      const copyButton = querySelectorAll<HTMLButtonElement>(dialog, '.button-primary')[0];
      copyButton.click();
      await waitForUpdates(dialog);

      expect(copyConfirmedSpy).toHaveBeenCalled();
      const event = copyConfirmedSpy.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });
});
