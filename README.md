# Workout Tracker

Mobile-first PWA for tracking weightlifting workouts organized by muscle groups with Google Sheets sync.

## Quick Start (Local Testing)

Serve the files with any static server:

```bash
# Python
python -m http.server 8000

# Node (npx)
npx serve .

# Then open http://localhost:8000 in your browser
```

## Google Sheets Setup

### 1. Create a Google Spreadsheet
- Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet
- Name it whatever you want (e.g., "Workout Tracker Data")

### 2. Add the Apps Script
- In the spreadsheet, go to **Extensions > Apps Script**
- Delete any default code in the editor
- Copy the entire contents of `google-apps-script/Code.gs` and paste it in
- Save the project (Ctrl+S) and name it (e.g., "Workout Tracker API")

### 3. Deploy as Web App
- Click **Deploy > New deployment**
- Click the gear icon next to "Select type" and choose **Web app**
- Set **Execute as**: "Me"
- Set **Who has access**: "Anyone"
- Click **Deploy**
- **Authorize** when prompted (click through the "unsafe" warning — this is your own script)
- Copy the **Web app URL** (looks like `https://script.google.com/macros/s/ABC.../exec`)

### 4. Configure the App
- Open the workout tracker in your browser
- Tap the gear icon (settings)
- Paste the Web app URL
- Tap "Save URL"
- Tap "Sync Now" to verify the connection

The spreadsheet will auto-create two sheets: **Exercises** and **WorkoutLog**.

## Hosting as PWA

### GitHub Pages
1. Push this repo to GitHub
2. Go to repo Settings > Pages
3. Set source to "main" branch, root folder
4. Your app will be at `https://yourusername.github.io/workout-tracker/`

### Netlify
1. Drag and drop the project folder onto [netlify.com/drop](https://app.netlify.com/drop)
2. Get your URL instantly

### Adding to iPhone Home Screen
1. Open the hosted URL in Safari (Chrome PWA install requires Safari on iOS)
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app will run in standalone mode (no browser chrome)

## File Structure

```
workout-tracker/
├── index.html              # App shell with all screen views
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── css/
│   └── style.css           # Dark mode, mobile-first styles
├── js/
│   ├── data.js             # Muscle groups and 5-day split definitions
│   ├── storage.js          # LocalStorage CRUD layer
│   ├── sheets.js           # Google Sheets sync client
│   └── app.js              # Main app logic, UI rendering, navigation
└── google-apps-script/
    └── Code.gs             # Deploy this in Google Apps Script
```

## How It Works

- **Local-first**: All data is stored in localStorage. The app works fully offline.
- **Sheets sync**: When configured, data pushes to Google Sheets in the background after each change.
- **No server needed**: The app is 100% static files. Google Apps Script handles the Sheets API.
