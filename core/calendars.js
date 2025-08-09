export function pickCalendarKey(date, calendars, candidates){
  const ymd = date.toISOString().slice(0,10);
  const dow = date.getDay(); // 0..6

  const inRange = (from,to)=>{
    const y = date.getFullYear();
    const toDate = s => s.startsWith('--')
      ? new Date(y, +s.slice(2,4)-1, +s.slice(5,7))
      : new Date(s);
    let a = toDate(from), b = toDate(to);
    if (from.startsWith('--') && to.startsWith('--') && a > b){
      return (date >= a && date <= new Date(y,11,31)) || (date >= new Date(y,0,1) && date <= b);
    }
    return date >= a && date <= b;
  };

  for (const key of candidates){
    const cal = calendars[key]; if (!cal) continue;
    for (const r of (cal.ranges||[])) if (inRange(r.from, r.to)) return key;
  }
  for (const key of candidates){
    const cal = calendars[key]; if (!cal) continue;
    for (const r of (cal.yearly_ranges||[])) if (inRange(r.from, r.to)) return key;
  }
  if (calendars.HOLIDAY?.dates?.includes(ymd)) return 'HOLIDAY';
  for (const key of candidates){
    const cal = calendars[key]; if (!cal) continue;
    if (cal.days?.includes(dow)) return key;
  }
  return candidates[0] || 'WEEKDAY';
}