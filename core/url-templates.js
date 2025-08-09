const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dmy = d => `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`;
const hhmm = d => `${pad(d.getHours())}${pad(d.getMinutes())}`;

export function renderCarrierUrl(templateKey, carrierKey, fromId, toId, depDateTime, templates, labelMaps){
  const t = templates[templateKey]; if (!t) return '';
  const map = labelMaps[carrierKey] || {};
  const fromLabel = map[fromId] ?? encodeURIComponent(fromId);
  const toLabel   = map[toId]   ?? encodeURIComponent(toId);
  return t
    .replaceAll('{fromLabel}', fromLabel)
    .replaceAll('{toLabel}',   toLabel)
    .replaceAll('{fromSlug}',  fromLabel)
    .replaceAll('{toSlug}',    toLabel)
    .replaceAll('{iso}',       iso(depDateTime))
    .replaceAll('{date_dmy}',  dmy(depDateTime))
    .replaceAll('{time_hhmm}', hhmm(depDateTime));
}