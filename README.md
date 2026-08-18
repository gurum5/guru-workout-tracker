# Guru's Progression

A personal progressive-overload workout tracker with a quote you actually read. Build your own workout splits (chest & triceps, back & biceps, legs — whatever your routine is), log your sets, and let the app tell you exactly what to do next time: repeat the weight, or move up.

**[Live demo →](#)** *https://gurum5.github.io/guru-workout-tracker/*

## How the progression logic works

- **Weighted exercises** target an **8–12 rep range**. **Band exercises** target a **12–15 rep range** (bands are read from a fixed level list: Light → Medium → Heavy → X-Heavy).
- Every session, you log the reps you hit on your **weakest set** — that's the honest measure of whether the weight is still challenging.
- If your weakest set hit the **top of the range**, the app bumps you up next time: **+5 lb** for weighted exercises, or **one level up** for bands — and resets your rep target to the bottom of the range.
- If you didn't hit the top, the app tells you to repeat the same weight/level, and shows exactly how many reps stand between you and leveling up.

No guessing what you did last time, no plateauing without noticing.

## Features

- **Quote plaque** — an original, locally-curated set of ~70 fitness/discipline quotes, rotated on load (and on demand). No external API, works offline.
- **Custom workout splits with categories** — create as many named workouts as you want (Upper Body, Lower Body, Chest & Triceps, Back & Biceps, Push, Pull, Legs, Full Body, Core, or your own custom tag), each with its own set of exercises. Filter chips on the home screen let you jump straight to a category.
- **Comes pre-loaded** with a starter split: Upper A (chest-focused), Upper B (back-focused), and Legs, matching a common two-day-upper/one-day-lower program.
- **Per-exercise targets** — each exercise carries its own target sets and rep range (e.g. leg curls at 10–15, dips at 8–10) instead of one fixed range for every exercise.
- **Per-exercise progression** — automatic bump/repeat logic per the rules above.
- **Ascent line** — a small stepped chart per exercise showing weight/level progression over time.
- **Your climb** — a progress section showing days trained, current streak, top categories, and a rising trail graphic with a marker on your most recent session.
- **Local-first** — everything lives in your browser's `localStorage`. Nothing leaves your machine.
- **Export** — download your full workout + history log as JSON at any time.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No build step, no framework, no dependencies. Open `index.html` and it works.

## Running locally

```bash
git clone https://github.com/<your-username>/ascend.git
cd ascend
open index.html   # or just double-click it
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In repo settings, go to **Pages** → source: `main` branch, root folder.
3. Live at `https://<your-username>.github.io/ascend/`.

## Data model

```json
{
  "id": "workout-id",
  "name": "Chest & Triceps",
  "exercises": [
    {
      "id": "exercise-id",
      "name": "Chest Press",
      "type": "weight",
      "startValue": 55,
      "history": [
        { "date": "2026-08-18", "value": 55, "sets": 3, "reps": 9 }
      ]
    }
  ]
}
```

Stored under the `ascend_workouts_v1` key in `localStorage`. Use the **Export JSON** button to back it up.

## License

MIT
