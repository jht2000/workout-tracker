# Workout Tracker — Project Context

## Overview
Mobile-first PWA for tracking weightlifting workouts organized by muscle groups (not specific exercises). Used exclusively on iPhone via Chrome/Safari. Hosted on GitHub Pages, syncs to Google Sheets.

**Live site:** https://jht2000.github.io/workout-tracker/
**Repo:** https://github.com/jht2000/workout-tracker

## Architecture
Pure static site — vanilla HTML/CSS/JS, no build step, no framework. Google Apps Script acts as middleware for Sheets API (code in `google-apps-script/Code.gs`).

### File Structure
- `js/logger.js` — Loaded FIRST. In-memory session log collector wrapping console.log/warn/error. Viewable via Settings > "View Session Logs"
- `js/data.js` — Contains `APP_VERSION`, muscle groups, 4-day split definitions, timezone helpers (CST)
- `js/storage.js` — LocalStorage CRUD layer. Depends on helpers from data.js
- `js/sheets.js` — Google Sheets sync client via Apps Script
- `js/app.js` — Main app logic: navigation, rendering, event listeners
- `css/style.css` — Dark mode, mobile-first styles
- `service-worker.js` — Network-first caching (offline fallback only)
- `google-apps-script/Code.gs` — Server-side GAS code (must be manually deployed to Apps Script)

## Critical Rules

### Version Bumping
**Every change must bump both:**
1. `APP_VERSION` in `js/data.js` (displayed in Settings screen)
2. `CACHE_NAME` in `service-worker.js` (forces cache refresh)

The user checks the version in Settings to confirm updates are live.

### Timezone
All dates and times use **Central Time (America/Chicago)**. Helper functions in `data.js`:
- `todayCST()` — today's date as YYYY-MM-DD
- `toDateCST(isoString)` — extract CST date from UTC timestamp
- `toTimeCST(isoString)` — format time for display
- `formatDateCST(dateStr)` — format date for display (e.g., "Thu, Feb 6")
- `nowCST()` — readable current time

Timestamps are stored as UTC ISO strings but ALL display and "today" logic uses these CST helpers. Never use `new Date().toISOString().slice(0, 10)` for dates — it returns UTC which can be a day ahead of CST.

### Sync Model — Google Sheets is Source of Truth
- **App load / "Sync Now"**: PULLS from Sheets → overwrites local (but pushes first if sync queue is non-empty)
- **After local changes**: uses **targeted** operations — `pushExercise()`, `pushLogEntry()`, `removeExercise()`, `removeSet()` — to sync only the affected row
- **Full `replaceAll`**: only used by Settings "Push to Sheets" button, `initialLoad` safety net, and manual overrides
- **Never** call `Sheets.pushToSheets()` automatically on load — that can wipe Sheets data
- Manual "Push to Sheets" button exists for explicit user-initiated override

### Service Worker — Network-First
The service worker uses **network-first** strategy everywhere. Cache is only an offline fallback. This prevents stale code from being served after deploys. Previous cache-first strategy caused painful debugging where code changes wouldn't appear on the user's phone.

## Data Model

### Exercise
```json
{
  "id": "unique_string",
  "name": "Hammer Strength Chest Press",
  "primaryMuscles": ["Chest"],
  "secondaryMuscles": ["Triceps", "Front Deltoids"],
  "locations": ["EOS Fitness", "Apartment Gym"],
  "notes": "Seat position 3, wide grip",
  "createdAt": "2026-02-06T..."
}
```
- `locations` is an **array** (multiple gyms per exercise). Legacy data may have singular `location` string — code handles both.
- Default location presets: "Apartment Gym", "EOS Fitness"

### Workout Log Entry
```json
{
  "id": "unique_string",
  "exerciseId": "ref_to_exercise",
  "exerciseName": "Hammer Strength Chest Press",
  "dayNumber": 1,
  "setNumber": 1,
  "weight": 135,
  "reps": 10,
  "timestamp": "2026-02-06T...",
  "date": "2026-02-06"
}
```

## Deployment
- Push to `main` → GitHub Pages auto-deploys in ~60 seconds
- User may need to hard-refresh or close/reopen tab after deploy
- The `.Codex/settings.local.json` is committed (not sensitive)

## Lessons Learned
- Service worker caching caused the most debugging pain. Always bump CACHE_NAME with changes.
- iOS Chrome doesn't support standalone PWA mode — only Safari does for "Add to Home Screen"
- `toLocaleDateString('en-CA', { timeZone })` is the reliable way to get YYYY-MM-DD in a specific timezone
- Google Apps Script deployed as "Anyone" web app — the URL itself acts as the auth token
- User edits notes frequently at the gym — inline editable notes on the logging screen (auto-saves after 800ms) was an important UX improvement
- **Deployed GAS can differ from repo code.** The `Code.gs` in the repo is NOT automatically deployed — user must manually copy/paste and redeploy in the Apps Script editor. Always consider that the live GAS version may be stale. When debugging sync issues, check what the GAS actually returns (field names, data shapes) rather than assuming it matches the repo.
- **`location` vs `locations` field mismatch.** The deployed GAS originally had a `location` (singular string) column header while the client used `locations` (plural array). The client-side `pushToSheets` now normalizes exercises to include BOTH fields for backward compatibility. The `readExercises` GAS function normalizes `location` → `locations` on read.
- **The in-app session logger (`js/logger.js`) is essential for debugging.** Since the user tests on their iPhone, browser DevTools aren't available. The Settings > "View Session Logs" button + Copy feature lets the user paste logs directly into a chat for diagnosis. All sync operations log details (exercise samples with field names, request actions, success/failure).
- **`initialLoad` must push before pulling** if the sync queue is non-empty, otherwise a failed background push followed by a pull will silently wipe unpushed local changes.
- **`pullFromSheets` should guard against empty arrays** — use `result.exercises.length > 0` before calling `importExercises`, otherwise an empty Sheet response overwrites all local data.
