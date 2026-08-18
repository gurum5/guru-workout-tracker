// ============================================================
// Ascend — progressive overload tracker
// All data in localStorage. No backend, no API dependency.
// ============================================================

const STORAGE_KEY = 'ascend_workouts_v1';
const LAST_QUOTE_KEY = 'ascend_last_quote_v1';

const BAND_LEVELS = ['Light', 'Medium', 'Heavy', 'X-Heavy'];
const RANGE = {
  weight: [8, 12],
  band: [12, 15],
};

// ---------- storage ----------

function loadWorkouts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Could not read workouts:', e);
    return [];
  }
}

function saveWorkouts(workouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- progressive overload engine ----------

/** Human-readable value: "135 lb" or "Heavy" */
function displayValue(type, value) {
  return type === 'weight' ? `${value} lb` : BAND_LEVELS[value];
}

/** Returns [min, max] rep range for this exercise — custom if set, else the type default. */
function exerciseRange(exercise) {
  return (exercise.repMin != null && exercise.repMax != null)
    ? [exercise.repMin, exercise.repMax]
    : RANGE[exercise.type];
}

function goalLabel(exercise, range) {
  return (exercise.targetSets ? `${exercise.targetSets} sets \u00d7 ` : '') + `${range[0]}\u2013${range[1]} reps`;
}

/**
 * Core rule:
 * - Each exercise carries its own rep range (defaults: weight 8–12, band 12–15).
 * - If the weakest set last session met the top of the range, bump
 *   (weight +5 lb, band up one level) and reset the target to the range floor.
 * - Otherwise repeat the same value, and report how close the last
 *   session got to the top of the range.
 */
function getSuggestion(exercise) {
  const range = exerciseRange(exercise);
  const history = exercise.history || [];

  if (history.length === 0) {
    return {
      value: exercise.startValue,
      goalLabel: goalLabel(exercise, range),
      message: 'No history yet — log your starting point.',
      leveledUp: false,
    };
  }

  const last = history[history.length - 1];

  if (last.reps >= range[1]) {
    const newValue = exercise.type === 'weight'
      ? last.value + 5
      : Math.min(last.value + 1, BAND_LEVELS.length - 1);
    return {
      value: newValue,
      goalLabel: goalLabel(exercise, range),
      message: `You hit ${last.reps} reps on your weakest set at ${displayValue(exercise.type, last.value)} last time — time to move up.`,
      leveledUp: true,
    };
  }

  const gap = range[1] - last.reps;
  return {
    value: last.value,
    goalLabel: goalLabel(exercise, range),
    message: `You hit ${last.reps} on your weakest set last time — ${gap} more rep${gap === 1 ? '' : 's'} and it's time to level up.`,
    leveledUp: false,
  };
}

// ---------- ascent-line (stepped history graphic) ----------

function ascentLineSVG(exercise) {
  const history = exercise.history || [];
  const w = 110, h = 32, pad = 4;
  if (history.length < 2) {
    return `<svg class="ascent-line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  }
  const values = history.map(hgt => hgt.value);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);

  // build a stepped (staircase) path
  let d = '';
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) {
      d += `M${x.toFixed(1)},${y.toFixed(1)}`;
    } else {
      const prevY = h - pad - ((values[i - 1] - min) / range) * (h - pad * 2);
      d += ` L${x.toFixed(1)},${prevY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
    }
  });
  const lastX = pad + (values.length - 1) * stepX;
  const lastY = h - pad - ((values[values.length - 1] - min) / range) * (h - pad * 2);

  return `<svg class="ascent-line" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${d}" fill="none" stroke="#E2632E" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4" fill="#E2632E"/>
  </svg>`;
}

// ---------- progress trail ----------

function computeSessionDates(workouts) {
  const set = new Set();
  workouts.forEach(w => w.exercises.forEach(e => (e.history || []).forEach(h => set.add(h.date))));
  return [...set].sort();
}

function computeCategoryCounts(workouts) {
  const counts = {};
  workouts.forEach(w => {
    const dates = new Set();
    w.exercises.forEach(e => (e.history || []).forEach(h => dates.add(h.date)));
    const cat = w.category || 'Uncategorized';
    counts[cat] = (counts[cat] || 0) + dates.size;
  });
  return counts;
}

function computeStreak(dates) {
  if (dates.length === 0) return 0;
  const daySet = new Set(dates);
  let streak = 0;
  let cursor = new Date(todayISO());
  if (!daySet.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const iso = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (daySet.has(iso)) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return streak;
}

function hikerIconAt(x, y) {
  return `<g stroke="var(--up)" stroke-width="2" stroke-linecap="round" fill="none">
    <circle cx="${x}" cy="${y - 14}" r="4" fill="var(--up)" stroke="none"/>
    <line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y}"/>
    <line x1="${x}" y1="${y - 6}" x2="${x - 6}" y2="${y - 2}"/>
    <line x1="${x}" y1="${y - 6}" x2="${x + 6}" y2="${y - 10}"/>
    <line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 8}"/>
    <line x1="${x}" y1="${y}" x2="${x + 5}" y2="${y + 6}"/>
  </g>`;
}

function trailSVG(dates) {
  const capped = dates.slice(-24);
  const n = capped.length;
  const w = 640, h = 130, padX = 20, padY = 26;
  if (n < 2) {
    const x = w / 2, y = h - padY;
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${hikerIconAt(x, y)}</svg>`;
  }
  const stepX = (w - padX * 2) / (n - 1);
  const stepY = (h - padY * 2) / (n - 1);
  const points = [];
  for (let i = 0; i < n; i++) points.push([padX + i * stepX, h - padY - i * stepY]);
  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const dots = points.slice(0, -1).map(p =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.8" fill="var(--muted)" opacity="0.55"/>`
  ).join('');
  const last = points[points.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${hikerIconAt(last[0], last[1])}
  </svg>`;
}

function renderProgress(workouts) {
  const dates = computeSessionDates(workouts);
  const streak = computeStreak(dates);
  const catCounts = computeCategoryCounts(workouts);
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);

  document.getElementById('progress-stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${dates.length}</div><div class="stat-label">Days trained</div></div>
    <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Day streak</div></div>
    ${topCats.map(([cat, count]) => `<div class="stat-card"><div class="stat-value">${count}</div><div class="stat-label">${escapeHTML(cat)}</div></div>`).join('')}
  `;

  const trailEl = document.getElementById('progress-trail');
  const captionEl = document.getElementById('trail-caption');
  if (dates.length === 0) {
    trailEl.innerHTML = '';
    captionEl.textContent = 'Log your first session and the trail starts here.';
    return;
  }
  trailEl.innerHTML = trailSVG(dates);
  captionEl.textContent = dates.length > 24
    ? `Showing your most recent 24 of ${dates.length} training days.`
    : `${dates.length} training day${dates.length === 1 ? '' : 's'} and climbing.`;
}

// ---------- quote plaque ----------

function renderQuote(forceNew) {
  const lastQuote = sessionStorage.getItem(LAST_QUOTE_KEY);
  const quote = forceNew || !lastQuote ? getRandomQuote(lastQuote) : lastQuote;
  sessionStorage.setItem(LAST_QUOTE_KEY, quote);
  document.getElementById('quote-text').textContent = quote;
}

// ---------- view routing ----------

let currentDetailId = null;

function showView(name) {
  document.getElementById('view-home').hidden = name !== 'home';
  document.getElementById('view-builder').hidden = name !== 'builder';
  document.getElementById('view-detail').hidden = name !== 'detail';
}

// ---------- HOME view ----------

let activeFilter = 'All';

function getCategories(workouts) {
  return [...new Set(workouts.map(w => w.category).filter(Boolean))].sort();
}

function renderFilters(workouts) {
  const cats = getCategories(workouts);
  const row = document.getElementById('filter-row');
  if (cats.length === 0) { row.innerHTML = ''; return; }
  const chips = ['All', ...cats];
  row.innerHTML = chips.map(c =>
    `<button class="btn-ghost filter-chip${activeFilter === c ? ' is-active' : ''}" data-cat="${escapeHTML(c)}">${escapeHTML(c)}</button>`
  ).join('');
  row.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { activeFilter = btn.getAttribute('data-cat'); renderHome(); });
  });
}

function renderHome() {
  const workouts = loadWorkouts();
  renderFilters(workouts);
  renderProgress(workouts);
  const filtered = activeFilter === 'All' ? workouts : workouts.filter(w => w.category === activeFilter);
  const list = document.getElementById('workout-list');
  const empty = document.getElementById('home-empty');
  const emptyText = document.getElementById('empty-text');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    emptyText.textContent = workouts.length === 0 ? 'No workouts yet.' : `No workouts in "${activeFilter}" yet.`;
    return;
  }
  empty.hidden = true;

  list.innerHTML = filtered.map(w => {
    const exCount = w.exercises.length;
    const lastDate = w.exercises
      .flatMap(e => (e.history || []).map(h => h.date))
      .sort()
      .pop();
    return `
      <div class="workout-card" data-id="${w.id}">
        ${w.category ? `<span class="cat-tag">${escapeHTML(w.category)}</span><br>` : ''}
        <h3>${escapeHTML(w.name)}</h3>
        <div class="meta">${exCount} exercise${exCount === 1 ? '' : 's'}${lastDate ? ' · last trained ' + fmtDate(lastDate) : ' · not trained yet'}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.workout-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.getAttribute('data-id')));
  });
}

// ---------- BUILDER view ----------

function newExerciseRow(prefill) {
  const row = document.createElement('div');
  row.className = 'builder-exercise-row';
  row.innerHTML = `
    <div class="field">
      <label>Exercise</label>
      <input type="text" class="ex-name" placeholder="e.g. Chest Press" value="${prefill ? escapeHTML(prefill.name) : ''}">
    </div>
    <div class="field field-narrow">
      <label>Type</label>
      <select class="ex-type">
        <option value="weight">Weight</option>
        <option value="band">Band</option>
      </select>
    </div>
    <div class="field field-narrow ex-start-weight-wrap">
      <label>Starting weight (lb)</label>
      <input type="number" class="ex-start-weight" min="0" step="2.5" placeholder="55">
    </div>
    <div class="field field-narrow ex-start-band-wrap" hidden>
      <label>Starting band level</label>
      <select class="ex-start-band">
        ${BAND_LEVELS.map((lvl, i) => `<option value="${i}">${lvl}</option>`).join('')}
      </select>
    </div>
    <div class="field field-narrow">
      <label>Target sets</label>
      <input type="number" class="ex-sets" min="1" step="1" value="${prefill && prefill.targetSets ? prefill.targetSets : 3}">
    </div>
    <div class="field field-narrow">
      <label>Rep range</label>
      <input type="text" class="ex-rep-range" value="${prefill && prefill.repMin != null ? prefill.repMin + '-' + prefill.repMax : '8-12'}" placeholder="8-12">
    </div>
    <button type="button" class="row-remove" title="Remove exercise">✕</button>
  `;

  const typeSelect = row.querySelector('.ex-type');
  const weightWrap = row.querySelector('.ex-start-weight-wrap');
  const bandWrap = row.querySelector('.ex-start-band-wrap');
  const repRangeInput = row.querySelector('.ex-rep-range');
  repRangeInput.addEventListener('input', () => { repRangeInput.dataset.touched = '1'; });
  typeSelect.addEventListener('change', () => {
    const isBand = typeSelect.value === 'band';
    weightWrap.hidden = isBand;
    bandWrap.hidden = !isBand;
    if (!repRangeInput.dataset.touched) {
      repRangeInput.value = isBand ? '12-15' : '8-12';
    }
  });
  row.querySelector('.row-remove').addEventListener('click', () => row.remove());

  if (prefill) {
    typeSelect.value = prefill.type;
    repRangeInput.dataset.touched = '1';
    if (prefill.type === 'band') {
      weightWrap.hidden = true;
      bandWrap.hidden = false;
      row.querySelector('.ex-start-band').value = prefill.startValue;
    } else {
      row.querySelector('.ex-start-weight').value = prefill.startValue;
    }
  }

  return row;
}

function parseRepRange(str, type) {
  const m = String(str).match(/(\d+)\D+(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  return RANGE[type];
}

function openBuilder() {
  document.getElementById('builder-title').textContent = 'New workout';
  document.getElementById('workout-name').value = '';
  document.getElementById('workout-category').value = 'Upper Body';
  document.getElementById('workout-category-custom').hidden = true;
  document.getElementById('workout-category-custom').value = '';
  const container = document.getElementById('builder-exercises');
  container.innerHTML = '';
  for (let i = 0; i < 4; i++) container.appendChild(newExerciseRow());
  showView('builder');
}

function collectBuilderExercises() {
  const rows = document.querySelectorAll('#builder-exercises .builder-exercise-row');
  const exercises = [];
  rows.forEach(row => {
    const name = row.querySelector('.ex-name').value.trim();
    if (!name) return;
    const type = row.querySelector('.ex-type').value;
    const startValue = type === 'weight'
      ? parseFloat(row.querySelector('.ex-start-weight').value) || 0
      : parseInt(row.querySelector('.ex-start-band').value, 10) || 0;
    const targetSets = parseInt(row.querySelector('.ex-sets').value, 10) || 3;
    const [repMin, repMax] = parseRepRange(row.querySelector('.ex-rep-range').value, type);
    exercises.push({ id: uid(), name, type, startValue, targetSets, repMin, repMax, history: [] });
  });
  return exercises;
}

function initBuilder() {
  document.getElementById('btn-new-workout').addEventListener('click', openBuilder);
  document.getElementById('btn-cancel-builder').addEventListener('click', () => showView('home'));
  document.getElementById('btn-add-exercise-row').addEventListener('click', () => {
    document.getElementById('builder-exercises').appendChild(newExerciseRow());
  });
  document.getElementById('workout-category').addEventListener('change', (e) => {
    document.getElementById('workout-category-custom').hidden = e.target.value !== '__custom';
  });
  document.getElementById('btn-save-workout').addEventListener('click', () => {
    const name = document.getElementById('workout-name').value.trim();
    if (!name) {
      alert('Give the workout a name first.');
      return;
    }
    let category = document.getElementById('workout-category').value;
    if (category === '__custom') {
      category = document.getElementById('workout-category-custom').value.trim() || 'Custom';
    }
    const exercises = collectBuilderExercises();
    if (exercises.length === 0) {
      alert('Add at least one exercise.');
      return;
    }
    const workouts = loadWorkouts();
    workouts.push({ id: uid(), name, category, exercises });
    saveWorkouts(workouts);
    activeFilter = 'All';
    renderHome();
    showView('home');
  });
}

// ---------- DETAIL view ----------

function openDetail(workoutId) {
  currentDetailId = workoutId;
  renderDetail();
  showView('detail');
}

function renderDetail() {
  const workouts = loadWorkouts();
  const workout = workouts.find(w => w.id === currentDetailId);
  if (!workout) { showView('home'); return; }

  document.getElementById('detail-title').textContent = workout.name;

  const container = document.getElementById('detail-exercises');
  if (workout.exercises.length === 0) {
    container.innerHTML = '<p class="no-exercises-note">No exercises in this workout.</p>';
    return;
  }

  container.innerHTML = workout.exercises.map(ex => {
    const suggestion = getSuggestion(ex);
    const history = ex.history || [];
    const lastLog = history[history.length - 1];

    const targetInput = ex.type === 'weight'
      ? `<input type="number" class="log-value" step="2.5" min="0" value="${suggestion.value}">`
      : `<select class="log-value">${BAND_LEVELS.map((lvl, i) =>
          `<option value="${i}" ${i === suggestion.value ? 'selected' : ''}>${lvl}</option>`).join('')}</select>`;

    return `
      <div class="exercise-card" data-ex-id="${ex.id}">
        <div class="exercise-card-head">
          <h3>${escapeHTML(ex.name)}</h3>
          <span class="exercise-type-tag">${ex.type === 'weight' ? 'Weighted' : 'Band'}</span>
        </div>

        <div class="suggestion-box ${suggestion.leveledUp ? 'is-levelup' : ''}">
          <span class="suggestion-target">${displayValue(ex.type, suggestion.value)} · ${suggestion.goalLabel}</span>
          <span class="suggestion-message">${escapeHTML(suggestion.message)}</span>
          ${ascentLineSVG(ex)}
        </div>

        <div class="log-form">
          <div class="field field-wide">
            <label>Weight / level</label>
            ${targetInput}
          </div>
          <div class="field">
            <label>Sets</label>
            <input type="number" class="log-sets" min="1" step="1" value="${ex.targetSets || 3}">
          </div>
          <div class="field">
            <label>Reps (weakest set)</label>
            <input type="number" class="log-reps" min="1" step="1" placeholder="${exerciseRange(ex)[0]}">
          </div>
          <button type="button" class="btn-primary btn-log-set">Log session</button>
        </div>

        ${lastLog ? `<p class="last-session-note">Last logged ${fmtDate(lastLog.date)}: ${displayValue(ex.type, lastLog.value)} for ${lastLog.reps} reps (weakest set), ${lastLog.sets} sets.</p>` : ''}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.exercise-card').forEach(card => {
    card.querySelector('.btn-log-set').addEventListener('click', () => logSession(card));
  });
}

function logSession(card) {
  const exId = card.getAttribute('data-ex-id');
  const valueRaw = card.querySelector('.log-value').value;
  const value = parseFloat(valueRaw);
  const sets = parseInt(card.querySelector('.log-sets').value, 10);
  const reps = parseInt(card.querySelector('.log-reps').value, 10);

  if (isNaN(value) || isNaN(sets) || isNaN(reps) || reps < 1 || sets < 1) {
    alert('Fill in weight/level, sets, and reps before logging.');
    return;
  }

  const workouts = loadWorkouts();
  const workout = workouts.find(w => w.id === currentDetailId);
  const exercise = workout.exercises.find(e => e.id === exId);
  exercise.history = exercise.history || [];
  exercise.history.push({ date: todayISO(), value, sets, reps });
  saveWorkouts(workouts);
  renderDetail();
}

function initDetail() {
  document.getElementById('btn-back').addEventListener('click', () => { showView('home'); renderHome(); });
  document.getElementById('btn-delete-workout').addEventListener('click', () => {
    if (!confirm('Delete this workout and all its logged history?')) return;
    const workouts = loadWorkouts().filter(w => w.id !== currentDetailId);
    saveWorkouts(workouts);
    showView('home');
    renderHome();
  });
}

// ---------- footer ----------

function initFooter() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = JSON.stringify(loadWorkouts(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascend-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ---------- starter workouts ----------

const SEED_WORKOUTS = [
  {
    name: 'Upper A (Chest Focused)',
    category: 'Chest & Triceps',
    exercises: [
      { name: 'Chest Press / Incline Chest Press', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Lat Pulldown (Neutral Grip)', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Flys', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Shoulder Press', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Preacher Curls', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Tricep Extensions', targetSets: 2, repMin: 8, repMax: 12 },
    ],
  },
  {
    name: 'Upper B (Back Focused)',
    category: 'Back & Biceps',
    exercises: [
      { name: 'Lat Pulldown (Overhand Grip)', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Chest Press', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Cable Rows / Machine Rows (Elbows Flared)', targetSets: 2, repMin: 10, repMax: 12 },
      { name: 'Dips Machine / Tricep Pulldown', targetSets: 2, repMin: 8, repMax: 10 },
      { name: 'Cable Bicep Curls', targetSets: 2, repMin: 8, repMax: 12 },
    ],
  },
  {
    name: 'Legs',
    category: 'Legs',
    exercises: [
      { name: 'Leg Curls', targetSets: 2, repMin: 10, repMax: 15 },
      { name: 'Squats (or Leg Press)', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Dumbbell RDLs', targetSets: 2, repMin: 8, repMax: 12 },
      { name: 'Leg Extensions', targetSets: 2, repMin: 10, repMax: 15 },
      { name: 'Calf Raises', targetSets: 2, repMin: 12, repMax: 15 },
    ],
  },
];

function seedIfNeeded() {
  const workouts = loadWorkouts();
  const existingNames = new Set(workouts.map(w => w.name));
  let changed = false;
  SEED_WORKOUTS.forEach(sw => {
    if (!existingNames.has(sw.name)) {
      workouts.push({
        id: uid(),
        name: sw.name,
        category: sw.category,
        exercises: sw.exercises.map(e => ({
          id: uid(), name: e.name, type: 'weight', startValue: 0,
          targetSets: e.targetSets, repMin: e.repMin, repMax: e.repMax, history: [],
        })),
      });
      changed = true;
    }
  });
  if (changed) saveWorkouts(workouts);
}

// ---------- boot ----------

document.addEventListener('DOMContentLoaded', () => {
  renderQuote(false);
  document.getElementById('quote-refresh').addEventListener('click', () => renderQuote(true));
  initBuilder();
  initDetail();
  initFooter();
  seedIfNeeded();
  renderHome();
  showView('home');
});
