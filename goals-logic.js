(function(root){
  "use strict";

  function parseGoalInput(text){
    const m = /^\s*(\d+(?:\.\d+)?)\s*(.*)$/.exec(text);
    if(!m) return null;
    return { target: Number(m[1]), label: m[2].trim() };
  }

  function periodKeyFor(date){
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function workingDaysLeft(fromDate, workingDays){
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for(let d = fromDate.getDate(); d <= lastDay; d++){
      const dow = new Date(year, month, d).getDay();
      if(workingDays[dow]) count++;
    }
    return count;
  }

  function computePace(target, current, workingDaysLeftCount){
    const remaining = Math.max(target - current, 0);
    if(remaining === 0) return { remaining: 0, perDay: 0, noWorkingDaysLeft: false };
    if(workingDaysLeftCount <= 0) return { remaining, perDay: null, noWorkingDaysLeft: true };
    return { remaining, perDay: Math.ceil(remaining / workingDaysLeftCount), noWorkingDaysLeft: false };
  }

  function defaultWorkingDays(){
    return [false, false, true, true, true, true, true];
  }

  const api = { parseGoalInput, periodKeyFor, workingDaysLeft, computePace, defaultWorkingDays };
  if(typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GoalsLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
