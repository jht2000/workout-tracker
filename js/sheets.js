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

    console.log(`[Sheets] _request: action=${action}`);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data })
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      console.log(`[Sheets] _request OK: action=${action}`, result.status || '');
      return result;
    } catch (err) {
      console.warn(`[Sheets] _request FAILED: action=${action}`, err.message);
      throw err;
    }
  },

  // ─── Pull from Sheets → overwrite local ──────────────────────
  async pullFromSheets() {
    console.log('[Sheets] pullFromSheets: starting');
    const result = await this._request('getAll');

    const exCount = result.exercises ? result.exercises.length : 0;
    const logCount = result.workoutLog ? result.workoutLog.length : 0;
    console.log(`[Sheets] pullFromSheets: got ${exCount} exercises, ${logCount} log entries`);

    if (result.exercises && result.exercises.length > 0) {
      // Log location data from the first few exercises for debugging
      const sample = result.exercises.slice(0, 3).map(e => ({
        name: e.name,
        locations: e.locations,
        location: e.location
      }));
      console.log('[Sheets] pullFromSheets: exercise sample', sample);
      Storage.importExercises(result.exercises);
    }
    if (result.workoutLog && result.workoutLog.length > 0) {
      Storage.importWorkoutLog(result.workoutLog);
    }
    if (result.locations && result.locations.length > 0) {
      console.log('[Sheets] pullFromSheets: locations from sheet', result.locations);
      result.locations.forEach(loc => Storage.addLocation(loc));
    }

    Storage.setLastSync();
    return result;
  },

  // ─── Push all local data → overwrite Sheets ──────────────────
  async pushToSheets() {
    const data = Storage.exportAll();

    // Ensure every exercise has both locations (array) and location (pipe-joined string).
    // The deployed GAS may use either column name, so we send both.
    if (data.exercises) {
      data.exercises = data.exercises.map(ex => {
        const locs = ex.locations || (ex.location ? [ex.location] : []);
        return { ...ex, locations: locs, location: locs.join('|') };
      });
    }

    const exCount = data.exercises ? data.exercises.length : 0;
    const logCount = data.workoutLog ? data.workoutLog.length : 0;
    console.log(`[Sheets] pushToSheets: sending ${exCount} exercises, ${logCount} log entries`);

    // Log location data from the first few exercises for debugging
    if (data.exercises) {
      const sample = data.exercises.slice(0, 3).map(e => ({
        name: e.name,
        locations: e.locations,
        location: e.location
      }));
      console.log('[Sheets] pushToSheets: exercise sample', sample);
    }

    const result = await this._request('replaceAll', data);
    Storage.clearSyncQueue();
    Storage.setLastSync();
    console.log('[Sheets] pushToSheets: complete');
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
    if (!this.isConfigured()) {
      console.log('[Sheets] backgroundPush: skipped (not configured)');
      return;
    }
    console.log('[Sheets] backgroundPush: starting');
    try {
      await this.pushToSheets();
      console.log('[Sheets] backgroundPush: success');
    } catch (err) {
      console.warn('[Sheets] backgroundPush: FAILED', err.message);
    }
  },

  // ─── Initial load: push pending changes first, then pull ────
  async initialLoad() {
    if (!this.isConfigured()) {
      console.log('[Sheets] initialLoad: skipped (not configured)');
      return false;
    }

    const queueLen = Storage.getSyncQueue().length;
    console.log(`[Sheets] initialLoad: starting (sync queue: ${queueLen} items)`);

    try {
      // If there are unpushed local changes, push before pulling
      // so the pull doesn't overwrite them
      if (queueLen > 0) {
        console.log('[Sheets] initialLoad: pushing pending changes first');
        try {
          await this.pushToSheets();
        } catch (err) {
          console.warn('[Sheets] initialLoad: push failed, preserving local data:', err.message);
          return false;
        }
      }
      await this.pullFromSheets();
      console.log('[Sheets] initialLoad: complete');
      return true;
    } catch (err) {
      console.warn('[Sheets] initialLoad: FAILED', err.message);
      return false;
    }
  }
};
