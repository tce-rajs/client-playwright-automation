// Page Object for the Attendance module.
//
// CONFIRMED LIVE (2026-09-06): the entry point is NOT the bottom-left
// running-figure icon (a separate, unrelated control) -- it's hidden behind
// the Magnet tool's submenu. Cross-checked against a Cypress reference
// project's own AttendancePage.js, which had already solved this.
//
// ALSO CONFIRMED LIVE: opening Attendance from this account gets stuck on
// an infinite loading spinner and never renders real content -- reproduced
// across two different subjects (Physics, Mathematics) in Class 12A, with
// no console/page error thrown and all network requests completing (the
// only failures are expected 404s for days with no prior attendance data).
// See tests/attendance/attendance.spec.js for the documented finding.

class AttendancePage {
  constructor(page) {
    this.page = page;

    this.magnetToolBtn = page.locator('[data-qa-id="toolbar-tool-gtMagnet"]');
    this.magnetAttendanceItem = page.locator('[data-qa-id="toolbar-magnet-gtAttendance"]');

    this.container = page.locator('[data-qa-id="attendance-container"]');
    this.loaderSpinner = page.locator('.attendance-container .loader-container .spinner');

    // --- Confirmed selectors from the reference project (mostly
    // unreachable right now due to the stuck-loading bug above, but ready
    // for whenever that's fixed) ---
    this.dateBox = this.container.locator('.date_box, .date-controls .current-date');
    this.playAttendanceBtn = this.container.locator('.btn-start');
    this.markAttendanceBtn = this.container.getByRole('button', { name: 'Mark Attendance' });
    this.innerCloseBtn = this.container.getByRole('button', { name: 'Close' });
    this.doneBtn = this.container.getByRole('button', { name: 'Done' });
    this.gridCells = this.container.locator('.grid-cell');
    this.summaryTable = this.container.locator('.attendance-summary-table');
    this.closeDialogConfirmBtn = page.locator('[data-qa-id="attendance-close-dialog-confirm-btn"]');
    this.closeDialogCancelBtn = page.locator('[data-qa-id="attendance-close-dialog-cancel-btn"]');
    this.submitAttendanceBtn = this.container.getByRole('button', { name: 'Submit Attendance' });
    this.editAttendanceBtn = this.container.getByRole('button', { name: 'Edit Attendance' });
    this.markAllPresentBtn = this.container.getByRole('button', { name: 'Mark All Present' });
    this.dragText = this.container.locator('.drag-text');
    this.dateNavLeft = this.container.locator('.tce-icon-btn:has(.arrow_left)');
    this.dateNavRight = this.container.locator('.tce-icon-btn:has(.arrow_right)');
    this.summaryRows = this.summaryTable.locator('.table-box .row');
  }

  async openMagnetSubmenu() {
    await this.magnetToolBtn.click({ force: true });
    await this.page.waitForTimeout(800);
  }

  async open() {
    await this.openMagnetSubmenu();
    await this.magnetAttendanceItem.click({ force: true });
    await this.page.waitForTimeout(1500);
  }
}

module.exports = { AttendancePage };
