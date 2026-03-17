import { addDays, getWeekDates, formatShort } from './dateUtils';

const BASE_MONDAY = '2026-03-16';

export function computeWeeklyHours(blocks, weekDates) {
  const hoursPerDay = {};
  weekDates.forEach(d => { hoursPerDay[d] = 0; });
  blocks
    .filter(b => b.type === 'study' && weekDates.includes(b.date))
    .forEach(b => { hoursPerDay[b.date] = (hoursPerDay[b.date] || 0) + Number(b.duration); });
  return weekDates.map(d => hoursPerDay[d]);
}

export function buildHeatmapRows(blocks, numWeeks = 6) {
  const rows = [];
  for (let w = 0; w < numWeeks; w++) {
    const monday = addDays(BASE_MONDAY, w * 7);
    const weekDates = getWeekDates(monday);
    const days = computeWeeklyHours(blocks, weekDates);
    rows.push({
      week: formatShort(monday),
      monday,
      weekDates,
      days,
      total: days.reduce((s, h) => s + h, 0),
    });
  }
  return rows;
}
