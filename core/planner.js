import { pickCalendarKey } from './calendars.js';
import { renderCarrierUrl } from './url-templates.js';

const pad = n => String(n).padStart(2,'0');
const ymd = d => d.toISOString().slice(0,10);
const fmtHM = d => d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
const addMin = (d, m) => new Date(d.getTime()+m*60000);

function candidateCalendarKeysForLeg(leg){
  const base = ['WEEKDAY','WEEKEND'];
  if (leg.carrier === 'ret') return ['RET_SUMMER_OVERRIDES','RET_SUMMER', ...base];
  return ['HOLIDAY', ...base];
}

function getTripsForLegOnDate(leg, date, calendars){
  if (!leg.tripsByCalendar) return [];
  const keys = candidateCalendarKeysForLeg(leg);
  const calKey = pickCalendarKey(date, calendars, keys);
  return leg.tripsByCalendar[calKey] || [];
}

export function planTrips({ data, labels, depart, buffer, windowMin, scenario, direction }){
  const preset = data.presets.find(p=>p.id===direction) || data.presets[0];
  const origin = preset.origin, destination = preset.destination;

  const activeLegs = data.legs.filter(l => !(l.blocked_by || []).includes(scenario));
  const byFrom = {};
  for (const leg of activeLegs){
    (byFrom[leg.from] ||= []).push(leg);
  }

  const deadline = addMin(depart, windowMin);
  const queue = [{ at: origin, time: new Date(depart), path: [], lastArr: new Date(depart) }];
  const results = [];

  while (queue.length){
    const state = queue.shift();
    if (state.time > deadline) continue;
    const nextLegs = byFrom[state.at] || [];

    for (const leg of nextLegs){
      if (leg.behavior === 'flex'){
        const dep = state.time;
        const arr = addMin(dep, leg.duration_minutes || 0);
        const next = { at: leg.to, time: arr, path: [...state.path, {leg, dep, arr}], lastArr: arr };
        if (leg.to === destination) results.push(next); else queue.push(next);
      } else {
        const trips = getTripsForLegOnDate(leg, state.time, data.calendars);
        const minDepTime = addMin(state.lastArr, buffer);
        let chosen = null;
        for (const t of trips){
          const dep = new Date(`${ymd(state.time)}T${t.dep}:00`);
          const arr = new Date(`${ymd(state.time)}T${t.arr}:00`);
          if (dep >= minDepTime){ chosen = {dep, arr}; break; }
        }
        if (!chosen) continue;
        const next = { at: leg.to, time: chosen.arr, path: [...state.path, {leg, dep: chosen.dep, arr: chosen.arr}], lastArr: chosen.arr };
        if (leg.to === destination) results.push(next); else queue.push(next);
      }
    }
    queue.sort((a,b)=>a.time-b.time);
    if (queue.length > 120) queue.length = 120;
  }

  const shaped = results.filter(r=>r.lastArr <= deadline).map(r=>{
    const leave = (r.path[0]?.dep) || depart;
    const arrive = r.lastArr;
    const totalMin = Math.round((arrive - depart)/60000);
    return {
      leave, arrive, totalMin,
      leaveStr: fmtHM(leave), arriveStr: fmtHM(arrive),
      segments: r.path.map((s,i)=>{
        const prev = i>0 ? r.path[i-1] : null;
        const gap = prev ? Math.max(0, Math.round((s.dep - prev.arr)/60000)) : null;
        const link = (s.leg.linkTemplate && s.leg.carrier)
          ? renderCarrierUrl(s.leg.linkTemplate, s.leg.carrier, s.leg.from, s.leg.to, s.dep, data.templates, data.labelMaps || labels)
          : '';
        return {
          mode: s.leg.mode,
          fromName: data.stops[s.leg.from]?.name || s.leg.from,
          toName: data.stops[s.leg.to]?.name || s.leg.to,
          depStr: fmtHM(s.dep), arrStr: fmtHM(s.arr),
          transferGapMin: gap, link
        };
      })
    };
  });

  shaped.sort((a,b)=> (a.leave - b.leave) || (a.totalMin - b.totalMin));
  return shaped.slice(0, 12);
}