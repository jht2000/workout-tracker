// ─── Local Storage Layer ─────────────────────────────────────────
// Primary data source is localStorage. Google Sheets is sync backup.

const Storage = {
  // ─── Keys ────────────────────────────────────────────────────
  KEYS: {
    EXERCISES: 'wt_exercises',
    WORKOUT_LOG: 'wt_workout_log',
    ACTIVE_DAY: 'wt_active_day',
    LOCATIONS: 'wt_locations',
    SYNC_QUEUE: 'wt_sync_queue',
    LAST_SYNC: 'wt_last_sync',
    SHEETS_URL: 'wt_sheets_url'
  },

  // ─── Generic helpers ─────────────────────────────────────────
  _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ─── Active Day ──────────────────────────────────────────────
  getActiveDay() {
    return this._get(this.KEYS.ACTIVE_DAY) || null;
  },

  setActiveDay(dayNumber) {
    this._set(this.KEYS.ACTIVE_DAY, dayNumber);
  },

  // ─── Sheets URL ──────────────────────────────────────────────
  getSheetsUrl() {
    return localStorage.getItem(this.KEYS.SHEETS_URL) || '';
  },

  setSheetsUrl(url) {
    localStorage.setItem(this.KEYS.SHEETS_URL, url);
  },

  // ─── Exercises ───────────────────────────────────────────────
  getExercises() {
    return this._get(this.KEYS.EXERCISES) || [];
  },

  saveExercises(exercises) {
    this._set(this.KEYS.EXERCISES, exercises);
  },

  addExercise(exercise) {
    const exercises = this.getExercises();
    exercise.id = exercise.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    exercise.createdAt = exercise.createdAt || new Date().toISOString();
    exercises.push(exercise);
    this.saveExercises(exercises);
    this.queueSync({ action: 'addExercise', data: exercise });
    return exercise;
  },

  updateExercise(id, updates) {
    const exercises = this.getExercises();
    const idx = exercises.findIndex(e => e.id === id);
    if (idx === -1) return null;
    exercises[idx] = { ...exercises[idx], ...updates, id };
    this.saveExercises(exercises);
    this.queueSync({ action: 'updateExercise', data: exercises[idx] });
    return exercises[idx];
  },

  deleteExercise(id) {
    let exercises = this.getExercises();
    exercises = exercises.filter(e => e.id !== id);
    this.saveExercises(exercises);
    this.queueSync({ action: 'deleteExercise', data: { id } });
  },

  getExerciseById(id) {
    return this.getExercises().find(e => e.id === id) || null;
  },

  // Filter exercises that match a day's muscle groups
  getExercisesForDay(dayNumber) {
    const day = DAYS.find(d => d.number === dayNumber);
    if (!day) return { primary: [], secondary: [], other: [] };

    const exercises = this.getExercises();
    const dayMuscles = new Set(day.muscles);

    const primary = [];
    const secondary = [];
    const other = [];

    exercises.forEach(ex => {
      const primaryMuscles = ex.primaryMuscles || [];
      const secondaryMuscles = ex.secondaryMuscles || [];

      const hasPrimaryMatch = primaryMuscles.some(m => dayMuscles.has(m));
      const hasSecondaryMatch = secondaryMuscles.some(m => dayMuscles.has(m));

      if (hasPrimaryMatch) {
        primary.push(ex);
      } else if (hasSecondaryMatch) {
        secondary.push(ex);
      } else {
        other.push(ex);
      }
    });

    return { primary, secondary, other };
  },

  // Group exercises by their first matching primary muscle for a day
  groupExercisesByMuscle(dayNumber) {
    const day = DAYS.find(d => d.number === dayNumber);
    if (!day) return {};

    const { primary } = this.getExercisesForDay(dayNumber);
    const grouped = {};

    // Initialize all day muscle groups
    day.muscles.forEach(m => { grouped[m] = []; });

    primary.forEach(ex => {
      const matchingMuscle = (ex.primaryMuscles || []).find(m => day.muscles.includes(m));
      if (matchingMuscle && grouped[matchingMuscle]) {
        grouped[matchingMuscle].push(ex);
      }
    });

    return grouped;
  },

  // ─── Workout Log ─────────────────────────────────────────────
  getWorkoutLog() {
    return this._get(this.KEYS.WORKOUT_LOG) || [];
  },

  saveWorkoutLog(log) {
    this._set(this.KEYS.WORKOUT_LOG, log);
  },

  logSet(entry) {
    const log = this.getWorkoutLog();
    entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    entry.timestamp = entry.timestamp || new Date().toISOString();
    log.push(entry);
    this.saveWorkoutLog(log);
    this.queueSync({ action: 'logSet', data: entry });
    return entry;
  },

  deleteSet(setId) {
    let log = this.getWorkoutLog();
    log = log.filter(e => e.id !== setId);
    this.saveWorkoutLog(log);
    this.queueSync({ action: 'deleteSet', data: { id: setId } });
  },

  // Get all sets for an exercise, sorted newest first
  getHistoryForExercise(exerciseId) {
    return this.getWorkoutLog()
      .filter(e => e.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  // Get last workout session's sets for an exercise
  getLastWorkoutSets(exerciseId) {
    const history = this.getHistoryForExercise(exerciseId);
    if (history.length === 0) return [];

    // Find the last session date (group by CST date)
    const lastDate = toDateCST(history[0].timestamp);
    return history
      .filter(e => toDateCST(e.timestamp) === lastDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  // Get workout log grouped by CST date
  getWorkoutsByDate() {
    const log = this.getWorkoutLog();
    const grouped = {};
    log.forEach(entry => {
      const date = toDateCST(entry.timestamp);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(entry);
    });
    return grouped;
  },

  // ─── Locations ───────────────────────────────────────────────
  getLocations() {
    const stored = this._get(this.KEYS.LOCATIONS);
    if (stored && stored.length > 0) return stored;
    // Defaults
    return ['Apartment Gym', 'EOS Fitness'];
  },

  addLocation(name) {
    const locations = this.getLocations();
    if (!locations.includes(name)) {
      locations.push(name);
      this._set(this.KEYS.LOCATIONS, locations);
    }
  },

  // ─── Sync Queue ──────────────────────────────────────────────
  getSyncQueue() {
    return this._get(this.KEYS.SYNC_QUEUE) || [];
  },

  queueSync(item) {
    const queue = this.getSyncQueue();
    item.queuedAt = new Date().toISOString();
    queue.push(item);
    this._set(this.KEYS.SYNC_QUEUE, queue);
  },

  clearSyncQueue() {
    this._set(this.KEYS.SYNC_QUEUE, []);
  },

  getLastSync() {
    return localStorage.getItem(this.KEYS.LAST_SYNC) || 'Never';
  },

  setLastSync() {
    localStorage.setItem(this.KEYS.LAST_SYNC, nowCST());
  },

  // ─── Bulk Import (from Sheets) ───────────────────────────────
  importExercises(exercises) {
    this.saveExercises(exercises);
  },

  importWorkoutLog(log) {
    this.saveWorkoutLog(log);
  },

  // ─── Export all data ─────────────────────────────────────────
  exportAll() {
    return {
      exercises: this.getExercises(),
      workoutLog: this.getWorkoutLog(),
      locations: this.getLocations(),
      activeDay: this.getActiveDay()
    };
  }
};
