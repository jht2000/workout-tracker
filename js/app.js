// ─── App State ─────────────────────────────────────────────────
const App = {
  currentScreen: 'home',
  screenStack: [],
  selectedDay: null,        // day being viewed
  currentExerciseId: null,  // exercise being viewed/logged

  // ─── Navigation ──────────────────────────────────────────────
  navigate(screen, opts = {}) {
    if (this.currentScreen !== screen) {
      this.screenStack.push(this.currentScreen);
    }
    this.showScreen(screen, opts);
  },

  goBack() {
    const prev = this.screenStack.pop() || 'home';
    this.showScreen(prev);
  },

  showScreen(screen, opts = {}) {
    this.currentScreen = screen;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');

    // Header
    const backBtn = document.getElementById('btn-back');
    const title = document.getElementById('header-title');
    const settingsBtn = document.getElementById('btn-settings');

    if (screen === 'home') {
      backBtn.classList.add('hidden');
      title.textContent = 'Workout Tracker';
      settingsBtn.classList.remove('hidden');
    } else {
      backBtn.classList.remove('hidden');
      settingsBtn.classList.add('hidden');
      const titles = {
        day: opts.title || 'Workout Day',
        library: 'Exercise Library',
        'exercise-form': opts.editing ? 'Edit Exercise' : 'Add Exercise',
        'exercise-detail': 'Exercise',
        'history-exercise': 'History',
        history: 'Workout History',
        settings: 'Settings'
      };
      title.textContent = titles[screen] || 'Workout Tracker';
    }

    // Screen-specific init
    if (screen === 'home') this.renderHome();
    if (screen === 'day') this.renderDay();
    if (screen === 'library') this.renderLibrary();
    if (screen === 'exercise-form') this.renderExerciseForm(opts);
    if (screen === 'exercise-detail') this.renderExerciseDetail();
    if (screen === 'history-exercise') this.renderExerciseHistory();
    if (screen === 'history') this.renderWorkoutHistory();
    if (screen === 'settings') this.renderSettings();

    window.scrollTo(0, 0);
  },

  // ─── Toast ───────────────────────────────────────────────────
  toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (type ? ' ' + type : '');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  },

  // ─── HOME SCREEN ─────────────────────────────────────────────
  renderHome() {
    const activeDay = Storage.getActiveDay();
    const banner = document.getElementById('active-day-banner');

    if (activeDay) {
      const day = DAYS.find(d => d.number === activeDay);
      banner.className = 'active-day-banner has-day';
      banner.innerHTML = `<span class="day-num">Day ${day.number}</span> &mdash; ${day.theme}`;
    } else {
      banner.className = 'active-day-banner';
      banner.innerHTML = '<span>No active workout selected</span>';
    }

    const container = document.getElementById('day-cards');
    container.innerHTML = DAYS.map(day => {
      const isActive = day.number === activeDay;
      const preview = day.muscles.slice(0, 4).join(', ') + (day.muscles.length > 4 ? '...' : '');
      return `
        <div class="day-card ${isActive ? 'is-active' : ''}" data-day="${day.number}">
          <div class="day-num">${day.number}</div>
          <div class="day-info">
            <div class="day-theme">${day.theme}</div>
            <div class="day-muscles-preview">${preview}</div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.day-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedDay = parseInt(card.dataset.day);
        const day = DAYS.find(d => d.number === this.selectedDay);
        this.navigate('day', { title: `Day ${day.number}` });
      });
    });
  },

  // ─── DAY WORKOUT SCREEN ──────────────────────────────────────
  renderDay() {
    const day = DAYS.find(d => d.number === this.selectedDay);
    if (!day) return;

    document.getElementById('day-title').textContent = `Day ${day.number}`;
    document.getElementById('day-theme').textContent = day.theme;

    // Active button
    const activeDay = Storage.getActiveDay();
    const activeBtn = document.getElementById('btn-set-active');
    if (activeDay === day.number) {
      activeBtn.textContent = 'Active Workout';
      activeBtn.classList.remove('btn-primary');
      activeBtn.classList.add('btn-outline');
      activeBtn.style.borderColor = 'var(--accent)';
      activeBtn.style.color = 'var(--accent)';
    } else {
      activeBtn.textContent = 'Set as Today\'s Workout';
      activeBtn.classList.add('btn-primary');
      activeBtn.classList.remove('btn-outline');
      activeBtn.style.borderColor = '';
      activeBtn.style.color = '';
    }

    // Render muscle chips
    const musclesEl = document.getElementById('day-muscles');
    musclesEl.innerHTML = day.muscles.map(m => {
      const cat = MUSCLE_CATEGORY[m] || 'misc';
      return `<div class="muscle-chip cat-${cat}">${m}</div>`;
    }).join('');

    // Render exercises tab
    this.renderDayExercises(day);

    // Reset tabs to muscles
    document.querySelectorAll('.day-tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.day-tabs .tab[data-tab="muscles"]').classList.add('active');
    document.getElementById('day-muscles-tab').classList.add('active');
    document.getElementById('day-exercises-tab').classList.remove('active');
  },

  renderDayExercises(day) {
    const grouped = Storage.groupExercisesByMuscle(day.number);
    const { secondary } = Storage.getExercisesForDay(day.number);

    const container = document.getElementById('day-exercises');
    let html = '';

    day.muscles.forEach(muscle => {
      const exercises = grouped[muscle] || [];
      html += `<div class="exercise-group">
        <div class="exercise-group-header">${muscle} <span class="exercise-group-count">(${exercises.length})</span></div>`;

      if (exercises.length === 0) {
        html += `<div class="no-exercises-msg">No exercises yet</div>`;
      } else {
        exercises.forEach(ex => {
          const lastSets = Storage.getLastWorkoutSets(ex.id);
          const lastInfo = lastSets.length > 0
            ? `${lastSets[lastSets.length - 1].weight}lb x${lastSets[lastSets.length - 1].reps}`
            : '';
          const exLocs = (ex.locations || (ex.location ? [ex.location] : [])).join(', ');
          html += `
            <div class="exercise-item" data-id="${ex.id}">
              <div>
                <div class="ex-name">${ex.name}</div>
                <div class="ex-location">${exLocs}</div>
              </div>
              <div class="ex-last">${lastInfo}</div>
            </div>`;
        });
      }
      html += '</div>';
    });

    container.innerHTML = html;

    // Secondary matches
    const secContainer = document.getElementById('day-secondary-exercises');
    if (secondary.length > 0) {
      let secHtml = `<div class="secondary-header">Secondary muscle matches (${secondary.length})</div>`;
      secondary.forEach(ex => {
        const exLocs = (ex.locations || (ex.location ? [ex.location] : [])).join(', ');
        secHtml += `
          <div class="exercise-item" data-id="${ex.id}">
            <div>
              <div class="ex-name">${ex.name}</div>
              <div class="ex-location">${exLocs} <span class="match-badge match-secondary">secondary</span></div>
            </div>
          </div>`;
      });
      secContainer.innerHTML = secHtml;
    } else {
      secContainer.innerHTML = '';
    }

    // Click handlers
    container.querySelectorAll('.exercise-item').forEach(el => {
      el.addEventListener('click', () => {
        this.currentExerciseId = el.dataset.id;
        this.navigate('exercise-detail');
      });
    });
    secContainer.querySelectorAll('.exercise-item').forEach(el => {
      el.addEventListener('click', () => {
        this.currentExerciseId = el.dataset.id;
        this.navigate('exercise-detail');
      });
    });
  },

  // ─── EXERCISE LIBRARY ────────────────────────────────────────
  _libraryFilter: '',
  _libraryMuscle: null,

  renderLibrary() {
    this._libraryFilter = '';
    this._libraryMuscle = null;
    document.getElementById('library-search').value = '';
    this.renderLibraryFilters();
    this.renderLibraryList();
  },

  renderLibraryFilters() {
    const container = document.getElementById('library-filter-muscles');
    container.innerHTML = '<button class="filter-chip active" data-muscle="">All</button>' +
      MUSCLE_GROUPS.map(m =>
        `<button class="filter-chip" data-muscle="${m}">${m}</button>`
      ).join('');

    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this._libraryMuscle = chip.dataset.muscle || null;
        this.renderLibraryList();
      });
    });
  },

  renderLibraryList() {
    let exercises = Storage.getExercises();

    // Filter by search
    if (this._libraryFilter) {
      const q = this._libraryFilter.toLowerCase();
      exercises = exercises.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.locations || (e.location ? [e.location] : [])).some(l => l.toLowerCase().includes(q)) ||
        (e.primaryMuscles || []).some(m => m.toLowerCase().includes(q))
      );
    }

    // Filter by muscle
    if (this._libraryMuscle) {
      exercises = exercises.filter(e =>
        (e.primaryMuscles || []).includes(this._libraryMuscle) ||
        (e.secondaryMuscles || []).includes(this._libraryMuscle)
      );
    }

    const activeDay = Storage.getActiveDay();
    const dayMuscles = activeDay
      ? new Set(DAYS.find(d => d.number === activeDay)?.muscles || [])
      : new Set();

    const container = document.getElementById('library-list');
    if (exercises.length === 0) {
      container.innerHTML = '<div class="no-exercises-msg">No exercises found. Tap + to add one.</div>';
      return;
    }

    container.innerHTML = exercises.map(ex => {
      const hasPrimary = (ex.primaryMuscles || []).some(m => dayMuscles.has(m));
      const hasSecondary = (ex.secondaryMuscles || []).some(m => dayMuscles.has(m));
      let badge = '';
      if (activeDay) {
        if (hasPrimary) badge = '<span class="match-badge match-primary">today</span>';
        else if (hasSecondary) badge = '<span class="match-badge match-secondary">secondary</span>';
      }

      return `
        <div class="exercise-item" data-id="${ex.id}">
          <div>
            <div class="ex-name">${ex.name} ${badge}</div>
            <div class="ex-location">${(ex.primaryMuscles || []).join(', ')} &mdash; ${(ex.locations || (ex.location ? [ex.location] : [])).join(', ')}</div>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.exercise-item').forEach(el => {
      el.addEventListener('click', () => {
        this.currentExerciseId = el.dataset.id;
        this.navigate('exercise-detail');
      });
    });
  },

  // ─── EXERCISE FORM ───────────────────────────────────────────
  renderExerciseForm(opts = {}) {
    const form = document.getElementById('exercise-form');
    const titleEl = document.getElementById('exercise-form-title');
    const deleteBtn = document.getElementById('btn-delete-exercise');
    const saveLogBtn = document.getElementById('btn-save-and-log');
    const matchEl = document.getElementById('exercise-day-match');

    form.reset();
    document.getElementById('exercise-id').value = '';
    document.getElementById('location-custom-input').value = '';

    // Build muscle pickers
    this.buildMusclePicker('primary-muscles-select', []);
    this.buildMusclePicker('secondary-muscles-select', []);

    if (opts.exerciseId) {
      // Editing
      const ex = Storage.getExerciseById(opts.exerciseId);
      if (!ex) return;
      titleEl.textContent = 'Edit Exercise';
      document.getElementById('exercise-id').value = ex.id;
      document.getElementById('exercise-name').value = ex.name;
      document.getElementById('exercise-notes').value = ex.notes || '';

      // Migrate legacy single location to array
      const exLocations = ex.locations || (ex.location ? [ex.location] : []);
      this.buildLocationPicker(exLocations);

      this.buildMusclePicker('primary-muscles-select', ex.primaryMuscles || []);
      this.buildMusclePicker('secondary-muscles-select', ex.secondaryMuscles || []);

      deleteBtn.classList.remove('hidden');
      saveLogBtn.classList.add('hidden');
    } else {
      titleEl.textContent = 'Add Exercise';
      this.buildLocationPicker([]);
      deleteBtn.classList.add('hidden');
      saveLogBtn.classList.remove('hidden');
    }

    // Update day match indicator as muscles are selected
    this.updateDayMatchIndicator();
    matchEl.classList.remove('hidden');
  },

  buildMusclePicker(containerId, selected) {
    const container = document.getElementById(containerId);
    const selectedSet = new Set(selected);
    container.innerHTML = MUSCLE_GROUPS.map(m =>
      `<button type="button" class="muscle-pick ${selectedSet.has(m) ? 'selected' : ''}" data-muscle="${m}">${m}</button>`
    ).join('');

    container.querySelectorAll('.muscle-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        this.updateDayMatchIndicator();
      });
    });
  },

  getSelectedMuscles(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .muscle-pick.selected`))
      .map(b => b.dataset.muscle);
  },

  buildLocationPicker(selected) {
    const container = document.getElementById('location-picker');
    const allLocations = Storage.getLocations();
    // Merge in any selected locations not in the global list
    const merged = [...new Set([...allLocations, ...selected])];
    const selectedSet = new Set(selected);

    container.innerHTML = merged.map(loc =>
      `<button type="button" class="location-pick ${selectedSet.has(loc) ? 'selected' : ''}" data-loc="${loc}">${loc}</button>`
    ).join('');

    container.querySelectorAll('.location-pick').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });
  },

  getSelectedLocations() {
    return Array.from(document.querySelectorAll('#location-picker .location-pick.selected'))
      .map(b => b.dataset.loc);
  },

  updateDayMatchIndicator() {
    const activeDay = Storage.getActiveDay();
    const matchEl = document.getElementById('exercise-day-match');

    if (!activeDay) {
      matchEl.classList.add('hidden');
      return;
    }

    const day = DAYS.find(d => d.number === activeDay);
    const dayMuscles = new Set(day.muscles);
    const primary = this.getSelectedMuscles('primary-muscles-select');
    const hasPrimaryMatch = primary.some(m => dayMuscles.has(m));

    matchEl.classList.remove('hidden');
    if (primary.length === 0) {
      matchEl.className = 'day-match-indicator match-no';
      matchEl.textContent = 'Select muscle groups to check today\'s match';
    } else if (hasPrimaryMatch) {
      const matches = primary.filter(m => dayMuscles.has(m));
      matchEl.className = 'day-match-indicator match-yes';
      matchEl.textContent = `Matches today (Day ${day.number}): ${matches.join(', ')}`;
    } else {
      matchEl.className = 'day-match-indicator match-no';
      matchEl.textContent = `Does not match today's muscle groups (Day ${day.number})`;
    }
  },

  saveExercise(andLog = false) {
    const id = document.getElementById('exercise-id').value;
    const name = document.getElementById('exercise-name').value.trim();
    if (!name) { this.toast('Enter an exercise name', 'error'); return; }

    const primaryMuscles = this.getSelectedMuscles('primary-muscles-select');
    if (primaryMuscles.length === 0) { this.toast('Select at least one primary muscle', 'error'); return; }

    const secondaryMuscles = this.getSelectedMuscles('secondary-muscles-select');
    const locations = this.getSelectedLocations();

    const notes = document.getElementById('exercise-notes').value.trim();

    const data = { name, primaryMuscles, secondaryMuscles, locations, notes };
    console.log('[App] saveExercise:', { id: id || '(new)', name, locations });

    let exercise;
    if (id) {
      exercise = Storage.updateExercise(id, data);
      this.toast('Exercise updated', 'success');
    } else {
      exercise = Storage.addExercise(data);
      this.toast('Exercise added', 'success');
    }

    // Sync just this exercise
    Sheets.pushExercise(exercise);

    if (andLog && exercise) {
      this.currentExerciseId = exercise.id;
      this.screenStack.pop(); // Remove form from stack
      this.navigate('exercise-detail');
    } else {
      this.goBack();
    }
  },

  deleteExercise() {
    const id = document.getElementById('exercise-id').value;
    if (!id) return;
    if (!confirm('Delete this exercise? This cannot be undone.')) return;
    Storage.deleteExercise(id);
    this.toast('Exercise deleted', 'success');
    Sheets.removeExercise(id);
    // Go back twice (past detail screen)
    this.screenStack.pop();
    this.goBack();
  },

  // ─── EXERCISE DETAIL / SET LOGGING ───────────────────────────
  renderExerciseDetail() {
    const ex = Storage.getExerciseById(this.currentExerciseId);
    if (!ex) return;

    document.getElementById('detail-name').textContent = ex.name;

    // Muscles
    const musclesEl = document.getElementById('detail-muscles');
    const primaryBadges = (ex.primaryMuscles || []).map(m =>
      `<span class="badge badge-primary">${m}</span>`).join('');
    const secondaryBadges = (ex.secondaryMuscles || []).map(m =>
      `<span class="badge badge-secondary">${m}</span>`).join('');
    musclesEl.innerHTML = primaryBadges + secondaryBadges;

    // Locations (support legacy single + new array)
    const locs = ex.locations || (ex.location ? [ex.location] : []);
    document.getElementById('detail-location').textContent = locs.join(', ');

    // Inline notes
    const notesInput = document.getElementById('detail-notes-input');
    notesInput.value = ex.notes || '';
    // Remove old listener by replacing node
    const newNotes = notesInput.cloneNode(true);
    notesInput.parentNode.replaceChild(newNotes, notesInput);
    let notesTimer;
    newNotes.addEventListener('input', () => {
      clearTimeout(notesTimer);
      notesTimer = setTimeout(() => {
        Storage.updateExercise(this.currentExerciseId, { notes: newNotes.value.trim() });
        const updatedEx = Storage.getExerciseById(this.currentExerciseId);
        Sheets.pushExercise(updatedEx);
        this.toast('Notes saved', 'success');
      }, 800);
    });

    // Pre-fill weight from last set
    const lastSets = Storage.getLastWorkoutSets(ex.id);
    if (lastSets.length > 0) {
      document.getElementById('input-weight').value = lastSets[lastSets.length - 1].weight;
      document.getElementById('input-reps').value = '';
    } else {
      document.getElementById('input-weight').value = '';
      document.getElementById('input-reps').value = '';
    }

    this.renderTodaySets();
    this.renderLastWorkoutSets();
  },

  renderTodaySets() {
    const today = todayCST();
    const history = Storage.getHistoryForExercise(this.currentExerciseId);
    const todaySets = history
      .filter(e => toDateCST(e.timestamp) === today)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const container = document.getElementById('today-sets');
    if (todaySets.length === 0) {
      container.innerHTML = '<div class="empty-sets">No sets logged today</div>';
      return;
    }

    let html = `<div class="set-row set-row-header">
      <span class="set-num">#</span>
      <span class="set-weight">Weight</span>
      <span class="set-reps">Reps</span>
      <span class="set-time">Time</span>
      <span style="width:36px"></span>
    </div>`;

    todaySets.forEach((s, i) => {
      const time = toTimeCST(s.timestamp);
      html += `<div class="set-row">
        <span class="set-num">${i + 1}</span>
        <span class="set-weight">${s.weight} lb</span>
        <span class="set-reps">${s.reps} reps</span>
        <span class="set-time">${time}</span>
        <button class="set-delete" data-id="${s.id}">&times;</button>
      </div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.set-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const setId = btn.dataset.id;
        Storage.deleteSet(setId);
        this.renderTodaySets();
        this.toast('Set removed');
        Sheets.removeSet(setId);
      });
    });
  },

  renderLastWorkoutSets() {
    const today = todayCST();
    const history = Storage.getHistoryForExercise(this.currentExerciseId);

    // Find last session that isn't today (using CST dates)
    const pastSets = history.filter(e => toDateCST(e.timestamp) !== today);
    if (pastSets.length === 0) {
      document.getElementById('last-workout-sets').innerHTML =
        '<div class="empty-sets">No previous workout data</div>';
      return;
    }

    const lastDate = toDateCST(pastSets[0].timestamp);
    const lastSets = pastSets
      .filter(e => toDateCST(e.timestamp) === lastDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let html = `<div class="set-row set-row-header">
      <span class="set-num">#</span>
      <span class="set-weight">Weight</span>
      <span class="set-reps">Reps</span>
      <span class="set-time">${formatDateCST(lastDate)}</span>
    </div>`;

    lastSets.forEach((s, i) => {
      html += `<div class="set-row">
        <span class="set-num">${i + 1}</span>
        <span class="set-weight">${s.weight} lb</span>
        <span class="set-reps">${s.reps} reps</span>
        <span class="set-time"></span>
      </div>`;
    });

    document.getElementById('last-workout-sets').innerHTML = html;
  },

  logSet() {
    const weight = parseFloat(document.getElementById('input-weight').value);
    const reps = parseInt(document.getElementById('input-reps').value);

    if (isNaN(weight) || isNaN(reps) || reps <= 0) {
      this.toast('Enter weight and reps', 'error');
      return;
    }

    const ex = Storage.getExerciseById(this.currentExerciseId);
    const today = todayCST();
    const todaySets = Storage.getHistoryForExercise(this.currentExerciseId)
      .filter(e => toDateCST(e.timestamp) === today);

    const entry = Storage.logSet({
      exerciseId: this.currentExerciseId,
      exerciseName: ex ? ex.name : '',
      dayNumber: Storage.getActiveDay() || 0,
      setNumber: todaySets.length + 1,
      weight,
      reps,
      date: today
    });

    this.toast(`Set ${todaySets.length + 1}: ${weight}lb x${reps}`, 'success');
    document.getElementById('input-reps').value = '';
    document.getElementById('input-reps').focus();

    this.renderTodaySets();

    // Sync just this entry
    Sheets.pushLogEntry(entry);
  },

  // ─── EXERCISE FULL HISTORY ───────────────────────────────────
  renderExerciseHistory() {
    const ex = Storage.getExerciseById(this.currentExerciseId);
    if (!ex) return;

    document.getElementById('history-exercise-name').textContent = ex.name;

    const history = Storage.getHistoryForExercise(this.currentExerciseId);
    const container = document.getElementById('exercise-full-history');

    if (history.length === 0) {
      container.innerHTML = '<div class="no-exercises-msg">No history yet</div>';
      return;
    }

    // Group by CST date
    const byDate = {};
    history.forEach(s => {
      const d = toDateCST(s.timestamp);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(s);
    });

    let html = '';
    Object.keys(byDate).sort().reverse().forEach(date => {
      const sets = byDate[date].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const dayNum = sets[0].dayNumber;

      html += `<div class="history-date-group">
        <div class="history-date-header">
          <span>${formatDateCST(date)}</span>
          ${dayNum ? `<span class="day-badge">Day ${dayNum}</span>` : ''}
        </div>`;

      sets.forEach((s, i) => {
        html += `<div class="set-row">
          <span class="set-num">${i + 1}</span>
          <span class="set-weight">${s.weight} lb</span>
          <span class="set-reps">${s.reps} reps</span>
          <span class="set-time"></span>
        </div>`;
      });

      html += '</div>';
    });

    container.innerHTML = html;
  },

  // ─── WORKOUT HISTORY (ALL) ───────────────────────────────────
  renderWorkoutHistory() {
    const log = Storage.getWorkoutLog();
    const container = document.getElementById('workout-history-list');

    if (log.length === 0) {
      container.innerHTML = '<div class="no-exercises-msg">No workouts logged yet</div>';
      return;
    }

    // Group by CST date
    const byDate = {};
    log.forEach(s => {
      const d = toDateCST(s.timestamp);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(s);
    });

    let html = '';
    Object.keys(byDate).sort().reverse().forEach(date => {
      const sets = byDate[date].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const dayNum = sets[0].dayNumber;

      // Group by exercise within the date
      const byExercise = {};
      sets.forEach(s => {
        const key = s.exerciseId || s.exerciseName;
        if (!byExercise[key]) byExercise[key] = { name: s.exerciseName, sets: [] };
        byExercise[key].sets.push(s);
      });

      html += `<div class="history-date-group">
        <div class="history-date-header">
          <span>${formatDateCST(date)}</span>
          ${dayNum ? `<span class="day-badge">Day ${dayNum}</span>` : ''}
        </div>`;

      Object.values(byExercise).forEach(group => {
        html += `<div class="set-row set-row-header">
          <span style="flex:1">${group.name}</span>
        </div>`;
        group.sets.forEach((s, i) => {
          html += `<div class="set-row">
            <span class="set-num">${i + 1}</span>
            <span class="set-weight">${s.weight} lb</span>
            <span class="set-reps">${s.reps} reps</span>
            <span class="set-time"></span>
          </div>`;
        });
      });

      html += '</div>';
    });

    container.innerHTML = html;
  },

  // ─── SETTINGS ────────────────────────────────────────────────
  renderSettings() {
    document.getElementById('sheets-url').value = Storage.getSheetsUrl();
    document.getElementById('last-sync-time').textContent = Storage.getLastSync();
    document.getElementById('app-version').textContent = 'v' + APP_VERSION;
  }
};

// ─── Event Listeners ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('btn-back').addEventListener('click', () => App.goBack());
  document.getElementById('btn-settings').addEventListener('click', () => App.navigate('settings'));
  document.getElementById('btn-library').addEventListener('click', () => App.navigate('library'));
  document.getElementById('btn-history').addEventListener('click', () => App.navigate('history'));

  // Day screen
  document.getElementById('btn-set-active').addEventListener('click', () => {
    Storage.setActiveDay(App.selectedDay);
    App.renderDay();
    App.toast(`Day ${App.selectedDay} set as active`, 'success');
  });

  // Day tabs
  document.querySelectorAll('.day-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.day-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('day-muscles-tab').classList.toggle('active', tab.dataset.tab === 'muscles');
      document.getElementById('day-exercises-tab').classList.toggle('active', tab.dataset.tab === 'exercises');
    });
  });

  // Add exercise buttons (FABs)
  document.getElementById('btn-add-exercise-day').addEventListener('click', () => App.navigate('exercise-form'));
  document.getElementById('btn-add-exercise-lib').addEventListener('click', () => App.navigate('exercise-form'));

  // Add custom location
  document.getElementById('btn-add-location').addEventListener('click', () => {
    const input = document.getElementById('location-custom-input');
    const name = input.value.trim();
    if (!name) return;
    Storage.addLocation(name);
    input.value = '';
    // Rebuild picker with the new location pre-selected
    const currentSelected = App.getSelectedLocations();
    currentSelected.push(name);
    App.buildLocationPicker(currentSelected);
  });

  // Exercise form
  document.getElementById('exercise-form').addEventListener('submit', (e) => {
    e.preventDefault();
    App.saveExercise(false);
  });
  document.getElementById('btn-save-and-log').addEventListener('click', () => App.saveExercise(true));
  document.getElementById('btn-delete-exercise').addEventListener('click', () => App.deleteExercise());

  // Exercise detail
  document.getElementById('btn-edit-exercise').addEventListener('click', () => {
    App.navigate('exercise-form', { exerciseId: App.currentExerciseId, editing: true });
  });
  document.getElementById('btn-log-set').addEventListener('click', () => App.logSet());

  // Allow Enter key in reps field to log set
  document.getElementById('input-reps').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); App.logSet(); }
  });

  document.getElementById('btn-full-history').addEventListener('click', () => {
    App.navigate('history-exercise');
  });

  // Library search
  document.getElementById('library-search').addEventListener('input', (e) => {
    App._libraryFilter = e.target.value;
    App.renderLibraryList();
  });

  // Settings
  document.getElementById('btn-save-sheets-url').addEventListener('click', () => {
    const url = document.getElementById('sheets-url').value.trim();
    Storage.setSheetsUrl(url);
    App.toast(url ? 'Sheets URL saved' : 'Sheets URL cleared', 'success');
  });

  document.getElementById('btn-sync-now').addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-now');
    btn.classList.add('loading');
    btn.textContent = 'Syncing...';
    const result = await Sheets.sync();
    btn.classList.remove('loading');
    btn.textContent = 'Sync Now';
    if (result.status === 'ok') {
      App.toast('Synced successfully', 'success');
      document.getElementById('last-sync-time').textContent = Storage.getLastSync();
    } else if (result.status === 'not_configured') {
      App.toast('Enter a Sheets URL first', 'error');
    } else {
      App.toast('Sync failed: ' + (result.message || 'unknown error'), 'error');
    }
  });

  document.getElementById('btn-pull-sheets').addEventListener('click', async () => {
    if (!confirm('This will overwrite local data with Sheets data. Continue?')) return;
    const btn = document.getElementById('btn-pull-sheets');
    btn.classList.add('loading');
    try {
      await Sheets.pullFromSheets();
      App.toast('Pulled from Sheets', 'success');
      document.getElementById('last-sync-time').textContent = Storage.getLastSync();
    } catch (e) {
      App.toast('Pull failed: ' + e.message, 'error');
    }
    btn.classList.remove('loading');
  });

  document.getElementById('btn-push-sheets').addEventListener('click', async () => {
    if (!confirm('This will overwrite Sheets data with local data. Continue?')) return;
    const btn = document.getElementById('btn-push-sheets');
    btn.classList.add('loading');
    try {
      await Sheets.pushToSheets();
      App.toast('Pushed to Sheets', 'success');
      document.getElementById('last-sync-time').textContent = Storage.getLastSync();
    } catch (e) {
      App.toast('Push failed: ' + e.message, 'error');
    }
    btn.classList.remove('loading');
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-data-${todayCST()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Data exported', 'success');
  });

  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.exercises) Storage.importExercises(data.exercises);
        if (data.workoutLog) Storage.importWorkoutLog(data.workoutLog);
        if (data.locations) data.locations.forEach(l => Storage.addLocation(l));
        if (data.activeDay) Storage.setActiveDay(data.activeDay);
        App.toast('Data imported', 'success');
      } catch (err) {
        App.toast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (!confirm('Delete ALL local data? This cannot be undone.')) return;
    if (!confirm('Are you sure? All exercises and workout logs will be deleted.')) return;
    localStorage.clear();
    App.toast('All data cleared');
    App.showScreen('home');
  });

  // Logs modal
  document.getElementById('btn-view-logs').addEventListener('click', () => {
    document.getElementById('logs-output').textContent = Logger.getText();
    document.getElementById('logs-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-logs').addEventListener('click', () => {
    document.getElementById('logs-modal').classList.add('hidden');
  });
  document.getElementById('btn-copy-logs').addEventListener('click', () => {
    navigator.clipboard.writeText(Logger.getText()).then(() => {
      App.toast('Logs copied', 'success');
    }).catch(() => {
      // Fallback: select text in the pre element
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('logs-output'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      App.toast('Logs selected — tap Copy', 'success');
    });
  });

  // ─── Init ────────────────────────────────────────────────────
  console.log(`[App] Workout Tracker v${APP_VERSION} loaded`);
  console.log(`[App] Sheets configured: ${Sheets.isConfigured()}`);
  console.log(`[App] Local exercises: ${Storage.getExercises().length}, log entries: ${Storage.getWorkoutLog().length}`);
  console.log(`[App] Sync queue: ${Storage.getSyncQueue().length} items`);
  App.renderHome();

  // Try initial sheets sync in background
  Sheets.initialLoad().then(loaded => {
    if (loaded) App.renderHome();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
