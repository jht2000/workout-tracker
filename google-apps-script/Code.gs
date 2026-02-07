/**
 * Google Apps Script — Workout Tracker API
 *
 * SETUP:
 * 1. Create a new Google Spreadsheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire file into Code.gs
 * 4. Click Deploy → New Deployment
 * 5. Select "Web app"
 * 6. Set "Execute as" → Me
 * 7. Set "Who has access" → Anyone
 * 8. Deploy and copy the URL
 * 9. Paste the URL into the app's Settings screen
 *
 * The spreadsheet will auto-create two sheets:
 *   - "Exercises" — exercise database
 *   - "WorkoutLog" — all logged sets
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

const EXERCISE_HEADERS = ['id', 'name', 'primaryMuscles', 'secondaryMuscles', 'locations', 'notes', 'createdAt'];
const LOG_HEADERS = ['id', 'exerciseId', 'exerciseName', 'dayNumber', 'setNumber', 'weight', 'reps', 'timestamp', 'date'];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    let result;
    switch (action) {
      case 'getAll':
        result = handleGetAll();
        break;
      case 'replaceAll':
        result = handleReplaceAll(payload);
        break;
      case 'addExercise':
        result = handleAddExercise(payload.data);
        break;
      case 'logSet':
        result = handleLogSet(payload.data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const result = handleGetAll();
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Read all data ─────────────────────────────────────────────

function handleGetAll() {
  const exercises = readExercises();
  const workoutLog = readWorkoutLog();
  const locations = [...new Set(exercises.flatMap(e => e.locations || (e.location ? [e.location] : [])).filter(Boolean))];
  return { exercises, workoutLog, locations };
}

function readExercises() {
  const sheet = getOrCreateSheet('Exercises', EXERCISE_HEADERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  // Columns that store pipe-separated arrays (handle both 'location' and 'locations')
  const arrayColumns = new Set(['primaryMuscles', 'secondaryMuscles', 'locations', 'location']);

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (arrayColumns.has(h)) {
        // Normalize singular 'location' → 'locations' for consistency
        const key = h === 'location' ? 'locations' : h;
        obj[key] = row[i] ? String(row[i]).split('|').filter(Boolean) : [];
      } else {
        obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
      }
    });
    return obj;
  });
}

function readWorkoutLog() {
  const sheet = getOrCreateSheet('WorkoutLog', LOG_HEADERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h === 'weight' || h === 'reps' || h === 'setNumber' || h === 'dayNumber') {
        obj[h] = Number(row[i]) || 0;
      } else {
        obj[h] = row[i] || '';
      }
    });
    return obj;
  });
}

// ─── Replace all data (full sync push) ────────────────────────

function handleReplaceAll(payload) {
  const exercises = payload.exercises || [];
  const workoutLog = payload.workoutLog || [];

  // Replace exercises sheet
  const exSheet = getOrCreateSheet('Exercises', EXERCISE_HEADERS);
  exSheet.clearContents();
  exSheet.appendRow(EXERCISE_HEADERS);
  exSheet.getRange(1, 1, 1, EXERCISE_HEADERS.length).setFontWeight('bold');

  exercises.forEach(ex => {
    const locs = ex.locations || (ex.location ? [ex.location] : []);
    exSheet.appendRow([
      ex.id || '',
      ex.name || '',
      (ex.primaryMuscles || []).join('|'),
      (ex.secondaryMuscles || []).join('|'),
      locs.join('|'),
      ex.notes || '',
      ex.createdAt || ''
    ]);
  });

  // Replace workout log sheet
  const logSheet = getOrCreateSheet('WorkoutLog', LOG_HEADERS);
  logSheet.clearContents();
  logSheet.appendRow(LOG_HEADERS);
  logSheet.getRange(1, 1, 1, LOG_HEADERS.length).setFontWeight('bold');

  workoutLog.forEach(entry => {
    logSheet.appendRow([
      entry.id || '',
      entry.exerciseId || '',
      entry.exerciseName || '',
      entry.dayNumber || '',
      entry.setNumber || '',
      entry.weight || '',
      entry.reps || '',
      entry.timestamp || '',
      entry.timestamp ? entry.timestamp.slice(0, 10) : ''
    ]);
  });

  return { status: 'ok', exercises: exercises.length, sets: workoutLog.length };
}

// ─── Add single exercise ───────────────────────────────────────

function handleAddExercise(data) {
  const sheet = getOrCreateSheet('Exercises', EXERCISE_HEADERS);
  const locs = data.locations || (data.location ? [data.location] : []);
  sheet.appendRow([
    data.id || '',
    data.name || '',
    (data.primaryMuscles || []).join('|'),
    (data.secondaryMuscles || []).join('|'),
    locs.join('|'),
    data.notes || '',
    data.createdAt || ''
  ]);
  return { status: 'ok' };
}

// ─── Log single set ───────────────────────────────────────────

function handleLogSet(data) {
  const sheet = getOrCreateSheet('WorkoutLog', LOG_HEADERS);
  sheet.appendRow([
    data.id || '',
    data.exerciseId || '',
    data.exerciseName || '',
    data.dayNumber || '',
    data.setNumber || '',
    data.weight || '',
    data.reps || '',
    data.timestamp || '',
    data.timestamp ? data.timestamp.slice(0, 10) : ''
  ]);
  return { status: 'ok' };
}
