const assert = require("assert");
const {
  parseGoalInput,
  periodKeyFor,
  workingDaysLeft,
  computePace,
  defaultWorkingDays,
} = require("../goals-logic.js");

// parseGoalInput
assert.deepStrictEqual(parseGoalInput("270 calls"), {target:270, label:"calls"});
assert.deepStrictEqual(parseGoalInput("20 cars delivered"), {target:20, label:"cars delivered"});
assert.deepStrictEqual(parseGoalInput("  15.5 units "), {target:15.5, label:"units"});
assert.strictEqual(parseGoalInput("calls only"), null);
assert.strictEqual(parseGoalInput(""), null);
assert.deepStrictEqual(parseGoalInput("42"), {target:42, label:""});

// periodKeyFor
assert.strictEqual(periodKeyFor(new Date(2026, 6, 29)), "2026-07"); // July (0-indexed month 6)
assert.strictEqual(periodKeyFor(new Date(2026, 0, 5)), "2026-01");
assert.strictEqual(periodKeyFor(new Date(2026, 11, 31)), "2026-12");

// workingDaysLeft — Tue-Sat working week (index 0=Sun..6=Sat)
const tueSat = [false,false,true,true,true,true,true];
// July 2026: the 29th is a Wednesday. Days left in July counting Tue-Sat,
// inclusive of the 29th: Wed29, Thu30, Fri31 = 3 (30th/31st are Thu/Fri; no Sat before month end)
assert.strictEqual(workingDaysLeft(new Date(2026, 6, 29), tueSat), 3);
// From the 1st of a 31-day month starting on a Wednesday (July 2026 starts on a Wed),
// Tue-Sat working days in July 2026 = every week has 5 working days; July has ~4.4 weeks.
// Verified value below is asserted, not derived, to pin exact behavior.
assert.strictEqual(workingDaysLeft(new Date(2026, 6, 1), tueSat), 23);
// All-days-working config: every remaining calendar day counts, inclusive
const allDays = [true,true,true,true,true,true,true];
assert.strictEqual(workingDaysLeft(new Date(2026, 6, 29), allDays), 3);
assert.strictEqual(workingDaysLeft(new Date(2026, 6, 31), allDays), 1);
// No working days configured at all -> 0
const noDays = [false,false,false,false,false,false,false];
assert.strictEqual(workingDaysLeft(new Date(2026, 6, 29), noDays), 0);

// computePace
assert.deepStrictEqual(computePace(270, 80, 12), {remaining:190, perDay:16, noWorkingDaysLeft:false});
assert.deepStrictEqual(computePace(270, 270, 12), {remaining:0, perDay:0, noWorkingDaysLeft:false});
assert.deepStrictEqual(computePace(270, 300, 12), {remaining:0, perDay:0, noWorkingDaysLeft:false}); // overshoot clamps to 0
assert.deepStrictEqual(computePace(270, 80, 0), {remaining:190, perDay:null, noWorkingDaysLeft:true});

// defaultWorkingDays
assert.deepStrictEqual(defaultWorkingDays(), [false,false,true,true,true,true,true]);

console.log("All goals-logic tests passed.");
