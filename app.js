import { planTrips } from './core/planner.js';

const pad = n => String(n).padStart(2,'0');
const ymd = d => d.toISOString().slice(0,10);

const DATA = await fetch('./data/timetable.json').then(r=>r.json());
const LABELS = await fetch('./data/label-maps.json').then(r=>r.json());

// Populate presets & scenarios
const presetSel = document.getElementById('preset');
for (const p of DATA.presets){
  const o = document.createElement('option');
  o.value = p.id; o.textContent = p.label;
  presetSel.appendChild(o);
}
const scenSel = document.getElementById('scenario');
for (const s of DATA.scenarios){
  const o = document.createElement('option');
  o.value = s.id; o.textContent = s.label;
  if (s.default) o.selected = true;
  scenSel.appendChild(o);
}

// Default date/time
const now = new Date();
document.getElementById('date').value = ymd(now);
document.getElementById('time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

// Run
document.getElementById('search').addEventListener('click', run);
run();

function toDate(dateStr,timeStr){ return new Date(`${dateStr}T${timeStr}:00`); }
function fmtHM(d){ return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

function renderTrip(trip, idx, bufferMin){
  const div = document.createElement('div');
  div.className = 'trip' + (idx===0 ? ' best' : '');
  const head = document.createElement('div');
  head.className = 'row';
  head.innerHTML = `<strong>Leave</strong> <span class="mono">${fmtHM(trip.leave)}</span>
                    <span class="muted">→</span>
                    <strong>Arrive</strong> <span class="mono">${fmtHM(trip.arrive)}</span>
                    <span class="pill">Total ${trip.totalMin} min</span>`;
  div.appendChild(head);
  const ol = document.createElement('ol');
  ol.style.margin = '.5rem 0 0 1rem'; ol.style.padding = 0;
  for (const s of trip.segments){
    const li = document.createElement('li');
    li.style.margin = '.35rem 0';
    li.innerHTML = `<span class="badge mode">${s.mode}</span> ${s.fromName} → ${s.toName}
      | dep <span class="mono">${s.depStr}</span> → arr <span class="mono">${s.arrStr}</span>
      ${s.transferGapMin!=null ? ' • transfer ' + s.transferGapMin + ' min' : ''}
      ${s.link ? ' • <a target="_blank" rel="noopener" class="link" href="'+s.link+'">carrier</a>' : ''}`;
    ol.appendChild(li);
  }
  div.appendChild(ol);
  return div;
}

function run(){
  const dateStr = document.getElementById('date').value;
  const timeStr = document.getElementById('time').value;
  const buffer = parseInt(document.getElementById('buffer').value,10) || 4;
  const windowMin = parseInt(document.getElementById('window').value,10);
  const scenario = document.getElementById('scenario').value;
  const bike = parseInt(document.getElementById('bike').value,10) || 10;
  const direction = document.getElementById('preset').value;

  // Update bike leg duration
  const bikeLeg = DATA.legs.find(l=>l.id==='bike_home_pernis');
  if (bikeLeg) bikeLeg.duration_minutes = bike;

  const depart = toDate(dateStr, timeStr);
  const trips = planTrips({ data: DATA, labels: LABELS, depart, buffer, windowMin, scenario, direction });
  const host = document.getElementById('results');
  host.innerHTML = '';
  if (!trips.length){
    host.innerHTML = `<div class="muted">No feasible trips in the selected window.</div>`;
    return;
  }
  trips.forEach((t,idx)=>host.appendChild(renderTrip(t, idx, buffer)));

  if ('serviceWorker' in navigator) {
    const canSW = (location.protocol === 'https:' || location.hostname === 'localhost');
    if (canSW) navigator.serviceWorker.register('./pwa/service-worker.js').catch(()=>{});
  }
}