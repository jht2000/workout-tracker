// ─── Google Sheets Integration via Apps Script ──────────────────
// The client talks to a deployed Google Apps Script web app which
// proxies reads/writes to a Google Spreadsheet.

const Sheets = {
  getUrl() {
    return Storage.getSheetsUrl();
  },

  isConfigured() {
    return !!this.getUrl();
  },

  // ─── Generic request helper ──────────────────────────────────
  async _request(action, data = {}) {
    const url = this.getUrl();
    if (!url) throw new Error('Google Sheets URL not configured');

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data })
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (err) {
      console.warn('Sheets request failed:', err.message);
      throw err;
    }
  },

  // ─── Full Sync: Pull from Sheets ────────────────────────────
  async pullFromSheets() {
    const result = await this._request('getAll');

    if (result.exercises && result.exercises.length > 0) {
      Storage.importExercises(result.exercises);
    }
    if (result.workoutLog && result.workoutLog.length > 0) {
      Storage.importWorkoutLog(result.workoutLog);
    }
    if (result.locations && result.locations.length > 0) {
      result.locations.forEach(loc => Storage.addLocation(loc));
    }

    Storage.setLastSync();
    return result;
  },

  // ─── Full Sync: Push all local data to Sheets ───────────────
  async pushToSheets() {
    const data = Storage.exportAll();
    const result = await this._request('replaceAll', data);
    Storage.clearSyncQueue();
    Storage.setLastSync();
    return result;
  },

  // ─── Process queued changes ──────────────────────────────────
  async processSyncQueue() {
    const queue = Storage.getSyncQueue();
    if (queue.length === 0) return;

    // Batch: just push everything (simpler and more reliable)
    await this.pushToSheets();
  },

  // ─── Sync (smart: pull then push) ───────────────────────────
  async sync() {
    if (!this.isConfigured()) return { status: 'not_configured' };

    try {
      // Push local data to sheets (local is source of truth)
      await this.pushToSheets();
      return { status: 'ok', time: new Date().toISOString() };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // ─── Initial load from Sheets ────────────────────────────────
  async initialLoad() {
    if (!this.isConfigured()) return false;

    try {
      // Only pull if local storage is empty
      const localExercises = Storage.getExercises();
      const localLog = Storage.getWorkoutLog();

      if (localExercises.length === 0 && localLog.length === 0) {
        await this.pullFromSheets();
        return true;
      } else {
        // Local has data, push to sheets to ensure sync
        await this.pushToSheets();
        return true;
      }
    } catch (err) {
      console.warn('Initial sheets load failed:', err.message);
      return false;
    }
  }
};
