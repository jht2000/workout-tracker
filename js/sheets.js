// ─── Google Sheets Integration via Apps Script ──────────────────
// Google Sheets is the SOURCE OF TRUTH.
// - After local changes: push to Sheets so it stays current
// - On app load / Sync Now: pull from Sheets to overwrite local

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

  // ─── Pull from Sheets → overwrite local ──────────────────────
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

  // ─── Push all local data → overwrite Sheets ──────────────────
  async pushToSheets() {
    const data = Storage.exportAll();
    const result = await this._request('replaceAll', data);
    Storage.clearSyncQueue();
    Storage.setLastSync();
    return result;
  },

  // ─── Sync: pull from Sheets (Sheets is source of truth) ─────
  async sync() {
    if (!this.isConfigured()) return { status: 'not_configured' };

    try {
      await this.pullFromSheets();
      return { status: 'ok', time: nowCST() };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // ─── Background push after a local change ────────────────────
  // Keeps Sheets up to date without overwriting local
  async backgroundPush() {
    if (!this.isConfigured()) return;
    try {
      await this.pushToSheets();
    } catch (err) {
      console.warn('Background push failed:', err.message);
    }
  },

  // ─── Initial load: push pending changes first, then pull ────
  async initialLoad() {
    if (!this.isConfigured()) return false;

    try {
      // If there are unpushed local changes, push before pulling
      // so the pull doesn't overwrite them
      if (Storage.getSyncQueue().length > 0) {
        try {
          await this.pushToSheets();
        } catch (err) {
          console.warn('Initial push failed, preserving local data:', err.message);
          return false;
        }
      }
      await this.pullFromSheets();
      return true;
    } catch (err) {
      console.warn('Initial sheets load failed:', err.message);
      return false;
    }
  }
};
