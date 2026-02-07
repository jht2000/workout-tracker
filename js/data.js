// ─── App Version ─────────────────────────────────────────────────
const APP_VERSION = '1.2.2';

// ─── Muscle Groups ───────────────────────────────────────────────
const MUSCLE_GROUPS = [
  'Front Deltoids', 'Side Deltoids', 'Rear Deltoids', 'Chest',
  'Biceps', 'Forearms', 'Traps', 'Rotator Cuff',
  'Hip Adductors', 'Hip Abductors', 'Obliques', 'Abdominals',
  'Quadriceps', 'Triceps', 'Upper Back', 'Middle Back',
  'Lower Back', 'Glutes', 'Hamstrings', 'Calves'
];

// ─── 5-Day Split ─────────────────────────────────────────────────
const DAYS = [
  {
    number: 1,
    theme: 'Push + Quad-Dominant',
    muscles: [
      'Chest', 'Front Deltoids', 'Triceps', 'Side Deltoids',
      'Quadriceps', 'Hip Adductors', 'Abdominals', 'Rotator Cuff'
    ]
  },
  {
    number: 2,
    theme: 'Pull + Hip-Dominant',
    muscles: [
      'Upper Back', 'Middle Back', 'Biceps', 'Rear Deltoids',
      'Hamstrings', 'Glutes', 'Hip Abductors', 'Traps'
    ]
  },
  {
    number: 3,
    theme: 'Push + Accessories',
    muscles: [
      'Chest', 'Front Deltoids', 'Triceps', 'Side Deltoids',
      'Lower Back', 'Calves', 'Forearms', 'Obliques'
    ]
  },
  {
    number: 4,
    theme: 'Pull + Quad-Dominant',
    muscles: [
      'Upper Back', 'Middle Back', 'Biceps', 'Rear Deltoids',
      'Quadriceps', 'Hip Adductors', 'Abdominals', 'Rotator Cuff'
    ]
  },
  {
    number: 5,
    theme: 'Hip-Dominant + Accessories',
    muscles: [
      'Hamstrings', 'Glutes', 'Hip Abductors', 'Traps',
      'Lower Back', 'Calves', 'Forearms', 'Obliques'
    ]
  }
];

// ─── Timezone Helpers (Central Time) ─────────────────────────────
const TZ = 'America/Chicago';

// Get today's date as YYYY-MM-DD in Central Time
function todayCST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// Convert a UTC ISO timestamp to YYYY-MM-DD in Central Time
function toDateCST(isoString) {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ });
}

// Convert a UTC ISO timestamp to display time (e.g., "2:35 PM") in Central Time
function toTimeCST(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit'
  });
}

// Format a YYYY-MM-DD string for display (e.g., "Thu, Feb 6") in Central Time
function formatDateCST(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric'
  });
}

// Get current Central Time as readable string (for "last sync" display)
function nowCST() {
  return new Date().toLocaleString('en-US', {
    timeZone: TZ, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// Muscle group → category color mapping for visual variety
const MUSCLE_CATEGORY = {
  'Chest': 'push', 'Front Deltoids': 'push', 'Triceps': 'push', 'Side Deltoids': 'push',
  'Upper Back': 'pull', 'Middle Back': 'pull', 'Biceps': 'pull', 'Rear Deltoids': 'pull',
  'Quadriceps': 'legs', 'Hamstrings': 'legs', 'Glutes': 'legs', 'Calves': 'legs',
  'Hip Adductors': 'legs', 'Hip Abductors': 'legs',
  'Abdominals': 'core', 'Obliques': 'core', 'Lower Back': 'core',
  'Traps': 'misc', 'Forearms': 'misc', 'Rotator Cuff': 'misc'
};
