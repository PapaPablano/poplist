# Goals tab — design spec

## Purpose

Poplist's four tabs track day-to-day tasks that get "popped" when done. This adds a
fifth tab, **Goals**, for monthly numeric objectives (e.g. "20 cars delivered," "270
calls"). Instead of a to-do list, each bubble tracks progress toward a target and
surfaces the one number that matters most day to day: **how many you need to do
today to stay on pace**. The whole point is to make the big goal feel small — the
daily number is the hero of the bubble; the total, current count, and remaining are
reduced to small supporting context.

## Data model

- `TABS` gains a fifth entry appended at the end: `{key:"goals", label:"Goals",
  color:"#3fa7a0", type:"goals"}` — a teal accent, distinct from the four existing
  tab colors (blue/green/amber/purple). Existing four tabs implicitly have
  `type:"tasks"` (no change needed to their config, just branch on absence of
  `type:"goals"`).
- `state.tabs.goals` is an array of goal objects, structurally different from task
  objects:
  ```js
  { id, target, label, current, periodKey, celebrated, createdAt }
  ```
  - `target`: number, the objective (e.g. `270`)
  - `label`: string, the unit/description (e.g. `"calls"`)
  - `current`: number, user-editable running total, defaults to `0`
  - `periodKey`: string `"YYYY-MM"`, the calendar month this goal currently belongs
    to, computed from the app's existing 5am-aware `dayStamp()` helper (so a goal
    started at 2am still reads as belonging to "yesterday's" month, consistent with
    how the rest of the app treats "today")
  - `celebrated`: bool, true once the goal has been hit this period (drives the
    one-time spark animation vs. the persistent celebrated visual state)
  - `createdAt`: timestamp, for ordering (goals are NOT drag-reorderable — order is
    creation order, oldest first)
- New top-level `state.workingDays`: a 7-element boolean array indexed Sun(0)→Sat(6),
  default `[false,false,true,true,true,true,true]` — Tue–Sat on, Sun/Mon off. This is
  a single global setting (not per-goal), editable via a small gear icon shown next
  to the add-row only when the Goals tab is active. Popover/inline row of 7 toggle
  chips (S M T W T F S).
- `hydrate()` is extended to default `state.tabs.goals=[]` and
  `state.workingDays=<default above>` when loading older saved state that predates
  this feature, so existing users don't break.
- Export (`exportBtn`) payload gains `workingDays` alongside the existing `tabs` and
  `delegated` fields. Import restores it the same way, defaulting if absent (loading
  an old backup file).

## Month rollover

- On init, and once per minute (piggybacking on the existing `setToday` interval), a
  `checkGoalRollover()` pass computes the current `periodKey` and compares it against
  each goal's stored `periodKey`.
- On mismatch: `current` resets to `0`, `celebrated` resets to `false`, `periodKey`
  updates to the current period. `target` and `label` are untouched — a recurring
  goal (e.g. always "20 cars") keeps running next month with no user action needed.
- This is a deliberate product choice: goals are assumed to repeat monthly unless
  manually deleted.

## Tab mechanics — isolation from existing task code

Goals are different enough from tasks (no drag, no pop-to-remove, no new-day
review, own add-parsing, own edit UI) that they get their own self-contained block
in the script — own render/add/edit/delete/pace functions — rather than branches
scattered through `renderList`, `addTask`, `popTask`, `startDrag`, and the review
flow. The tab-click handler and the top-level render dispatcher check
`TABS.find(...).type` and route to either the existing task-rendering path or the
new goals path. This keeps the two concerns physically separate in the file.

- **Add row:** when the Goals tab is active, the shared add-input's placeholder
  changes to `"Add a goal, e.g. 20 cars delivered"` and its submit handler routes to
  `addGoal()` instead of `addTask()`.
- **"Start a new day" button:** on the Goals tab, clicking it does not launch the
  keep/drop/delegate review (that concept doesn't apply to goals). Instead it shows
  a short explanatory sheet: *"Goals aren't reviewed day-to-day — they reset
  automatically each month."* This reuses the existing `flashEmptyDay`-style sheet
  pattern.
- **Delegated log / export / import:** unaffected; log stays scoped to task tabs,
  export/import already generically covers `state.tabs` plus the new
  `workingDays` field.

## Add-goal parsing

Single text box (consistent with the rest of the app), parsed on submit:

```js
/^\s*(\d+(\.\d+)?)\s*(.*)/
```

- Group 1 → `target` (parsed as a number)
- Group 3 (trimmed) → `label`
- If the regex doesn't match (no leading number), the input shakes/flashes red and
  nothing is added — same "don't silently fail" bar as the rest of the app.

## Pace calculation

- `remaining = Math.max(target - current, 0)`
- `workingDaysLeft` = count of calendar dates from today (using the app's
  5am-aware "today") through the last day of today's month, inclusive of today,
  whose JS weekday (`0`=Sun…`6`=Sat) is `true` in `state.workingDays`.
- `perDay = remaining <= 0 ? 0 : Math.ceil(remaining / workingDaysLeft)` — rounded
  up, since you can't make a fraction of a call or deliver a fraction of a car.
- **Edge case:** if `workingDaysLeft === 0` and `remaining > 0`, the pace line reads
  "No working days left this month" instead of dividing by zero.

## Bubble layout & visual hierarchy

The core visual requirement: **the per-day number is the hero.** Total, current,
and remaining are all small supporting captions around it — the opposite of a
normal to-do bubble, which has no numeric hierarchy at all.

```
╭─────────────────────────────────────╮
│ calls · 270 total          ✏ ×      │   <- small caption, corner actions
│                                     │
│            16                      │   <- hero number, large/bold
│         per day                    │   <- small label under hero
│                                     │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░  30%   │   <- thin progress bar, tab-tinted
│ 80/270 (tap) · 190 left · 12 workdays│   <- small caption
╰─────────────────────────────────────╯
```

- Hero number reuses the app's existing display-weight styling (Nunito 800, large
  size — similar scale to the `.brand` title) so it reads instantly at a glance.
- Everything else (unit/total caption, progress bar, remaining/current/workdays
  caption) uses small, muted text (`--ink-soft` / `--ink-faint`), matching the
  existing `.tagline`/`.today` treatment.
- Tapping the `current` number in the bottom caption (e.g. `80/270`) swaps it for an
  inline `<input type=number>`, autofocused; Enter/blur commits, Escape cancels. No
  full-screen sheet — this should stay a quick, lightweight edit.
- ✏ opens an inline editor prefilled with `"270 calls"` (same text format and parser
  as add-goal), letting you correct target/label together.
- × deletes the goal immediately, no confirmation — consistent with how popping a
  task is already instant and irreversible elsewhere in the app.
- No rank number and no drag handle for goal bubbles — order is creation order.

## Completion state

When `remaining` reaches `0`:

1. The existing spark-burst animation (`burst()`) fires once, reusing the same
   visual as popping a task.
2. `celebrated` is set `true`. The bubble does **not** leave the list — it flips to
   a celebrated look: progress bar full, a subtle green (`--ok`) tint/glow, and the
   "per day" hero area replaced with something like "🎉 Goal hit" (still emphasized,
   just swapped for the celebration message instead of a number).
3. The bubble remains fully editable/deletable in this state (e.g. to bump `current`
   further, or fix a target for the rest of the month).

## Testing plan

Poplist is a static single-file app with no test harness. Verification will be
manual, in-browser:

- Add a goal via the smart-parsed input; confirm correct target/label split,
  including the shake/error path for input with no leading number.
- Tap-to-edit `current`; confirm commit (Enter/blur) and cancel (Escape) behavior.
- Verify pace math by hand against several `workingDays` configurations, including
  the default Tue–Sat schedule.
- Force `current >= target` and confirm the one-time spark animation, the
  persistent celebrated state, and that the bubble remains editable afterward.
- Simulate month rollover by editing a goal's stored `periodKey` via devtools
  (localStorage) to confirm `current`/`celebrated` reset on next load while
  `target`/`label` persist.
- Confirm export/import round-trips `workingDays` and `state.tabs.goals`.
- Confirm clicking "Start a new day" while the Goals tab is active shows the
  explanatory sheet instead of the task-review flow.
