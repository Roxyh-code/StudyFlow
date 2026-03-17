const FULL_DAY_START = 7;
const FULL_DAY_END = 22;

export function getOccupiedIntervals(blocks, date) {
  return blocks
    .filter(b => b.date === date)
    .map(b => ({ start: Number(b.startHour), end: Number(b.startHour) + Number(b.duration), blockId: b.id }))
    .sort((a, b) => a.start - b.start);
}

export function findFreeSlotsForDay(existingBlocks, date, preferences = {}) {
  const { preferredStudyTime = 'morning' } = preferences;
  const occupied = getOccupiedIntervals(existingBlocks, date);
  const slots = [];
  let cursor = FULL_DAY_START;
  for (const occ of occupied) {
    if (occ.start > cursor + 0.1) {
      slots.push({ startHour: cursor, availableHours: occ.start - cursor });
    }
    cursor = Math.max(cursor, occ.end);
  }
  if (cursor < FULL_DAY_END) {
    slots.push({ startHour: cursor, availableHours: FULL_DAY_END - cursor });
  }
  const preferenceScore = (slot) => {
    const h = slot.startHour;
    if (preferredStudyTime === 'morning')   return h < 12 ? 0 : h < 17 ? 1 : 2;
    if (preferredStudyTime === 'afternoon') return (h >= 12 && h < 17) ? 0 : h < 12 ? 1 : 2;
    if (preferredStudyTime === 'evening')   return h >= 17 ? 0 : h >= 12 ? 1 : 2;
    return h; // balanced: chronological
  };
  return slots.filter(s => s.availableHours >= 0.5).sort((a, b) => preferenceScore(a) - preferenceScore(b));
}

/** How many study hours are already scheduled on a given date in workingBlocks */
function studyHoursOnDay(workingBlocks, date) {
  return workingBlocks
    .filter(b => b.date === date && b.type === 'study')
    .reduce((s, b) => s + Number(b.duration), 0);
}

/**
 * Place blocks into free time slots while respecting maxHoursPerDay.
 * When a block exceeds a day's remaining quota it is SPLIT:
 *   – the portion that fits is placed today
 *   – the remainder is queued and placed on the next suitable day
 * This ensures all hours get scheduled and no day goes over budget.
 */
export function placeBlocksWithoutOverlap(blocksToPlace, existingBlocks, candidateDates, preferences = {}) {
  const maxPerDay = Number(preferences.maxHoursPerDay) || 24;
  const placed = [];
  const workingBlocks = [...existingBlocks];

  // Use a queue so split-remainder fragments can be re-processed
  const queue = blocksToPlace.map((b, i) => ({ ...b, _queueIdx: i }));
  let safetyCounter = 0; // prevent infinite loops

  while (queue.length > 0 && safetyCounter < 200) {
    safetyCounter++;
    const block = queue.shift();
    let wasPlaced = false;

    for (const date of candidateDates) {
      const alreadyToday = studyHoursOnDay(workingBlocks, date);

      // Skip this day entirely if already at or above the daily quota
      if (alreadyToday >= maxPerDay) continue;

      const remainingQuota = maxPerDay - alreadyToday;
      // How much of this block can we fit today?
      const canFit = Math.min(block.duration, remainingQuota);

      const dayBlocks = workingBlocks.filter(b => b.date === date);
      const slots = findFreeSlotsForDay(dayBlocks, date, preferences);

      // Find a slot with enough physical room for the capped amount
      const fit = slots.find(s => s.availableHours >= Math.min(canFit, 0.5));
      if (!fit) continue;

      const actualDuration = Math.min(canFit, fit.availableHours);
      if (actualDuration < 0.5) continue;

      const p = { ...block, date, startHour: fit.startHour, duration: actualDuration };
      delete p._queueIdx;
      placed.push(p);
      workingBlocks.push(p);
      wasPlaced = true;

      // If we couldn't place the full block, push the remainder back into the queue
      const remainder = Math.round((block.duration - actualDuration) * 10) / 10;
      if (remainder >= 0.5) {
        queue.push({
          ...block,
          id: `${block.id}-r${safetyCounter}`,
          duration: remainder,
        });
      }
      break;
    }

    // Fallback: no day had quota — place on the least-loaded day anyway
    if (!wasPlaced) {
      let bestDate = candidateDates[0] || block.date;
      let bestSlot = null;
      let bestFree = -1;
      for (const date of candidateDates) {
        const dayBlocks = workingBlocks.filter(b => b.date === date);
        const slots = findFreeSlotsForDay(dayBlocks, date, preferences);
        const totalFree = slots.reduce((s, sl) => s + sl.availableHours, 0);
        if (totalFree > bestFree) { bestFree = totalFree; bestDate = date; bestSlot = slots[0] || null; }
      }
      const startHour = bestSlot?.startHour ?? 9;
      const maxDur = bestSlot?.availableHours ?? block.duration;
      const p = { ...block, date: bestDate, startHour, duration: Math.min(block.duration, maxDur), overflow: true };
      delete p._queueIdx;
      placed.push(p);
      workingBlocks.push(p);
    }
  }

  return placed;
}

export function hasConflict(block, existingBlocks) {
  const blockStart = Number(block.startHour);
  const blockEnd = blockStart + Number(block.duration);
  return existingBlocks.some(b => {
    if (b.date !== block.date || b.id === block.id) return false;
    const bStart = Number(b.startHour);
    const bEnd = bStart + Number(b.duration);
    return blockStart < bEnd && blockEnd > bStart;
  });
}
