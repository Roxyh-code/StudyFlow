import { findFreeSlotsForDay } from './schedulerUtils';

// ── NL Constraint Parser ──────────────────────────────────────────────────────
/**
 * Parses a natural language preference string into constraint overrides.
 * Keyword-based mapping — no external NLP needed.
 * @param {string} text
 * @returns {Object} partial preferences/options
 */
export function parseNLConstraints(text) {
  if (!text || !text.trim()) return {};
  const lower = text.toLowerCase();
  const out = {};

  // Study time preference
  if (/\b(afternoon|after noon|midday|lunch)\b/.test(lower))
    out.preferredStudyTime = 'afternoon';
  else if (/\b(morning|early|breakfast|am)\b/.test(lower))
    out.preferredStudyTime = 'morning';
  else if (/\b(evening|night|late|after dinner)\b/.test(lower))
    out.preferredStudyTime = 'evening';

  // Weekend handling
  if (/weekend.*(light|free|easy|avoid|less|low)|avoid.*(weekend|sat|sun)|no.*(sat|sun)|free (sat|sun)/.test(lower))
    out.avoidWeekends = true;

  // Week bias
  if (/\b(early week|front.?load|start of week|monday|tuesday)\b/.test(lower))
    out.earlyWeekBias = true;

  // Strategy
  if (/\b(compact|together|cluster|group|consecutive)\b/.test(lower))
    out.strategy = 'compact';
  else if (/\b(spread|even|balance|distribute|smooth)\b/.test(lower))
    out.strategy = 'even_distribution';
  else if (/\b(minimize|reduce|lower).*(peak|max|overload)\b/.test(lower))
    out.strategy = 'minimize_overload';

  return out;
}

// ── Smart Rebalance ──────────────────────────────────────────────────────────
/**
 * Moves AI study blocks to reduce peak workload without violating deadlines.
 *
 * Key design:
 *  - Tries ALL lighter target days per block (not just global valley)
 *  - workDates covers every weekday in the full date range, including empty days
 *  - minimize_overload: keeps moving until no day exceeds maxPerDay
 *  - even_distribution: keeps moving until peak–valley spread < 1h
 */
export function smartRebalance(blocks, tasks, preferences, options = {}) {
  const {
    strategy = 'minimize_overload',
    pickSmallest = false,
    nlConstraints = {},
  } = options;

  const effectivePrefs = { ...preferences, ...nlConstraints };
  const maxPerDay = Number(effectivePrefs.maxHoursPerDay) || 6;

  function studyHours(blockSet, date) {
    return blockSet
      .filter(b => b.date === date && b.type === 'study')
      .reduce((s, b) => s + Number(b.duration), 0);
  }

  function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  // Build comprehensive workDates: every weekday in the full date range,
  // including days that currently have no blocks (valid move targets).
  const blockDates = [...new Set(blocks.map(b => b.date))].sort();
  const rangeStart = blockDates[0] || shiftDate(new Date().toISOString().split('T')[0], 0);
  const rangeEnd   = blockDates[blockDates.length - 1] || shiftDate(rangeStart, 30);

  const workDates = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const dow = new Date(cursor + 'T00:00:00Z').getUTCDay();
    if (dow !== 0 && !(effectivePrefs.avoidWeekends && dow === 6)) {
      workDates.push(cursor);
    }
    cursor = shiftDate(cursor, 1);
  }

  let currentBlocks = [...blocks];
  const moveLog = [];
  const unchangedLog = [];
  const movedBlockIds = new Set(); // avoid repeatedly logging same block as unmovable
  let iterations = 0;

  while (iterations < 60) {
    iterations++;

    // Recompute study hours per day
    const hoursPerDay = {};
    workDates.forEach(d => { hoursPerDay[d] = studyHours(currentBlocks, d); });

    const sortedByLoad = [...workDates].sort((a, b) => hoursPerDay[b] - hoursPerDay[a]);
    const peakDay    = sortedByLoad[0];
    const peakLoad   = hoursPerDay[peakDay] || 0;
    const valleyLoad = hoursPerDay[sortedByLoad[sortedByLoad.length - 1]] || 0;

    if (!peakDay) break;

    // Strategy-based termination
    if (strategy === 'minimize_overload') {
      if (peakLoad <= maxPerDay) break;
    } else {
      // even_distribution: stop when spread is already small
      if (peakLoad - valleyLoad < 1.0) break;
    }

    // Find movable AI study blocks on peak day
    let candidates = currentBlocks.filter(b =>
      b.type === 'study' &&
      b.source === 'ai' &&
      b.date === peakDay &&
      !b.locked
    );

    if (candidates.length === 0) {
      if (!unchangedLog.find(u => u.date === peakDay)) {
        unchangedLog.push({
          date: peakDay,
          hours: peakLoad,
          reason: 'All study blocks on the busiest day are manual — cannot move them',
        });
      }
      break;
    }

    // Largest first (or smallest for Try Another variants)
    candidates = candidates.sort((a, b) =>
      pickSmallest ? a.duration - b.duration : b.duration - a.duration
    );

    // Target candidates: all days lighter than peakDay, lightest first
    const targetDays = workDates
      .filter(d => d !== peakDay && hoursPerDay[d] < peakLoad)
      .sort((a, b) => hoursPerDay[a] - hoursPerDay[b]);

    if (targetDays.length === 0) {
      unchangedLog.push({ date: peakDay, hours: peakLoad, reason: 'No lighter days available' });
      break;
    }

    let moved = false;

    outer: for (const movable of candidates) {
      const task = movable.assignmentId
        ? tasks.find(t => t.id === movable.assignmentId)
        : null;

      for (const targetDay of targetDays) {
        // Deadline: can't schedule study after the task's due date.
        // Studying ON the due date is OK (morning work before an evening submission).
        if (task?.dueDate && targetDay > task.dueDate) continue;

        // Guard: would make target as heavy as or heavier than current peak
        const newTargetHours = hoursPerDay[targetDay] + movable.duration;
        if (newTargetHours >= peakLoad) continue;

        // Physical slot availability on target day
        const targetBlocks = currentBlocks.filter(b => b.date === targetDay);
        const slots = findFreeSlotsForDay(targetBlocks, targetDay, effectivePrefs);
        const fit = slots.find(s => s.availableHours >= movable.duration);
        if (!fit) continue;

        // Execute move
        const movedBlock = { ...movable, date: targetDay, startHour: fit.startHour };
        currentBlocks = currentBlocks.map(b => b.id === movable.id ? movedBlock : b);
        moveLog.push({
          id: movable.id,
          title: movable.title,
          from: peakDay,
          to: targetDay,
          hours: movable.duration,
        });
        movedBlockIds.add(movable.id);
        moved = true;
        break outer;
      }

      // Log why this specific block couldn't be moved (once per block)
      if (!movedBlockIds.has(movable.id)) {
        movedBlockIds.add(movable.id);
        const deadlineBlocked = task?.dueDate &&
          targetDays.every(d => d >= task.dueDate);
        unchangedLog.push({
          title: movable.title,
          from: peakDay,
          reason: deadlineBlocked
            ? `Due ${task.dueDate} — no lighter day is before the deadline`
            : 'No suitable target day found (no free time slots)',
        });
      }
    }

    if (!moved) break;
  }

  // Compute before/after metrics
  const hoursBeforeByDay = {};
  const hoursAfterByDay  = {};
  workDates.forEach(d => {
    hoursBeforeByDay[d] = studyHours(blocks, d);
    hoursAfterByDay[d]  = studyHours(currentBlocks, d);
  });

  const peakBefore = Math.max(...workDates.map(d => hoursBeforeByDay[d]), 0);
  const peakAfter  = Math.max(...workDates.map(d => hoursAfterByDay[d]),  0);
  const overloadBefore = workDates.filter(d => hoursBeforeByDay[d] > maxPerDay).length;
  const overloadAfter  = workDates.filter(d => hoursAfterByDay[d]  > maxPerDay).length;

  // Human-readable reason when nothing was moved
  let reason = '';
  if (moveLog.length === 0) {
    const anyOverloaded = workDates.some(d => hoursBeforeByDay[d] > maxPerDay);
    const hasAIBlocks   = blocks.some(b => b.type === 'study' && b.source === 'ai');
    const allManual     = blocks.filter(b => b.type === 'study').every(b => b.source !== 'ai');

    if (!anyOverloaded && strategy === 'minimize_overload') {
      const spread = peakBefore - Math.min(...workDates.map(d => hoursBeforeByDay[d]).filter(h => h > 0), peakBefore);
      if (spread < 1) {
        reason = 'Schedule is already within your daily limit and well-balanced — no changes needed.';
      } else {
        reason = `No day exceeds your ${maxPerDay}h limit. Switch to "Spread evenly" strategy to further balance the workload.`;
      }
    } else if (allManual) {
      reason = 'All study blocks are manual — Rebalance only moves AI-generated blocks.';
    } else if (!hasAIBlocks) {
      reason = 'No AI-generated study blocks found to move.';
    } else {
      reason = 'Could not redistribute: AI blocks are pinned by their deadlines — no earlier lighter day is available. Try raising the daily limit.';
    }
  }

  return {
    blocks: currentBlocks,
    moveLog,
    unchangedLog,
    workDates,
    hoursBeforeByDay,
    hoursAfterByDay,
    improved: moveLog.length > 0,
    peakBefore,
    peakAfter,
    overloadBefore,
    overloadAfter,
    deadlinesAffected: 0,
    reason,
  };
}

// ── Week Suggestions ──────────────────────────────────────────────────────────
export function generateSuggestions(blocks, _tasks, weekDates) {
  const suggestions = [];
  const weekStudyBlocks = blocks.filter(b => b.type === 'study' && weekDates.includes(b.date));
  const hoursPerDay = {};
  weekDates.forEach(d => { hoursPerDay[d] = 0; });
  weekStudyBlocks.forEach(b => { hoursPerDay[b.date] = (hoursPerDay[b.date] || 0) + b.duration; });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const overloadedDays = weekDates.filter(d => hoursPerDay[d] > 5);
  const lightDays = weekDates.filter((d, i) => i < 5 && hoursPerDay[d] < 2);

  if (overloadedDays.length > 0 && lightDays.length > 0) {
    const heavyDay = overloadedDays[0];
    const lightDay = lightDays[0];
    const heavyDayName = dayNames[weekDates.indexOf(heavyDay)];
    const lightDayName = dayNames[weekDates.indexOf(lightDay)];
    const heavyHours = hoursPerDay[heavyDay];
    const moveable = weekStudyBlocks
      .filter(b => b.date === heavyDay)
      .sort((a, b) => b.duration - a.duration)[0];

    if (moveable) {
      const usedHours = weekStudyBlocks.filter(b => b.date === lightDay).map(b => b.startHour);
      let targetHour = 10;
      while (usedHours.includes(targetHour)) targetHour++;
      suggestions.push({
        id: `sug-move-${heavyDay}-${lightDay}`,
        type: 'move',
        title: `Lighten ${heavyDayName} — move 1 block to ${lightDayName}`,
        description: `${heavyDayName} has ${heavyHours}h of study (overloaded). Moving "${moveable.title}" (${moveable.duration}h) to ${lightDayName} would balance your week.`,
        impact: `Reduces ${heavyDayName} from ${heavyHours}h to ${(heavyHours - moveable.duration).toFixed(1)}h`,
        severity: 'high',
        changes: [{ blockId: moveable.id, newDate: lightDay, newStartHour: targetHour, newDuration: moveable.duration }],
      });
    }
  }

  const largeBlocks = weekStudyBlocks.filter(b => b.duration >= 3);
  if (largeBlocks.length > 0) {
    const big = largeBlocks[0];
    const bigDayIndex = weekDates.indexOf(big.date);
    const bigDayName = dayNames[bigDayIndex];
    const splitToIndex = bigDayIndex < 6 ? bigDayIndex + 1 : bigDayIndex - 1;
    const splitToDate = weekDates[splitToIndex];
    const splitToDayName = dayNames[splitToIndex];
    const half = Math.ceil(big.duration / 2 * 2) / 2;
    suggestions.push({
      id: `sug-split-${big.id}`,
      type: 'split',
      title: `Split ${big.duration}h "${big.title}" block`,
      description: `A ${big.duration}h study session on ${bigDayName} is long. Split into two ${half}h sessions across ${bigDayName} and ${splitToDayName}.`,
      impact: `Better focus with 2×${half}h sessions`,
      severity: 'medium',
      changes: [
        { blockId: big.id, newDate: big.date, newStartHour: big.startHour, newDuration: half },
        { blockId: null, sourceBlockId: big.id, newDate: splitToDate, newStartHour: 10, newDuration: big.duration - half, isNewBlock: true },
      ],
    });
  }

  const studiedDays = weekDates.filter(d => hoursPerDay[d] > 0);
  const maxHours = Math.max(...weekDates.map(d => hoursPerDay[d]));
  const minHours = Math.min(...studiedDays.map(d => hoursPerDay[d]));
  if (studiedDays.length >= 2 && maxHours - minHours >= 3) {
    const maxDay = weekDates.find(d => hoursPerDay[d] === maxHours);
    const minDay = weekDates.find(d => studiedDays.includes(d) && hoursPerDay[d] === minHours);
    const maxDayName = dayNames[weekDates.indexOf(maxDay)];
    const minDayName = dayNames[weekDates.indexOf(minDay)];
    const candidateBlock = weekStudyBlocks
      .filter(b => b.date === maxDay && b.duration <= 2)
      .sort((a, b) => a.duration - b.duration)[0];
    if (candidateBlock && maxDay !== minDay) {
      const alreadySuggested = suggestions.some(s => s.changes.some(c => c.blockId === candidateBlock.id));
      if (!alreadySuggested) {
        const usedHours = weekStudyBlocks.filter(b => b.date === minDay).map(b => b.startHour);
        let targetHour = 9;
        while (usedHours.includes(targetHour)) targetHour++;
        suggestions.push({
          id: `sug-rebalance-${maxDay}-${minDay}`,
          type: 'rebalance',
          title: `Rebalance: spread from ${maxDayName} to ${minDayName}`,
          description: `${maxDayName} has ${maxHours}h vs ${minDayName}'s ${minHours}h. Moving "${candidateBlock.title}" (${candidateBlock.duration}h) creates a more even rhythm.`,
          impact: `${maxDayName}: ${maxHours}h→${(maxHours - candidateBlock.duration).toFixed(1)}h · ${minDayName}: ${minHours}h→${(minHours + candidateBlock.duration).toFixed(1)}h`,
          severity: 'low',
          changes: [{ blockId: candidateBlock.id, newDate: minDay, newStartHour: targetHour, newDuration: candidateBlock.duration }],
        });
      }
    }
  }

  return suggestions;
}

export function getBestSuggestion(blocks, tasks, weekDates) {
  return generateSuggestions(blocks, tasks, weekDates)[0] || null;
}

export function generateBlockExplanation(block, allBlocks, tasks) {
  const task = tasks.find(t => t.id === block.assignmentId);
  if (!task) return 'Study session scheduled by AI to keep you on track.';

  const daysUntilDue = Math.ceil(
    (new Date(task.dueDate + 'T00:00:00Z') - new Date(block.date + 'T00:00:00Z')) / 86400000
  );
  const dayStudyHours = allBlocks
    .filter(b => b.date === block.date && b.type === 'study' && b.id !== block.id)
    .reduce((sum, b) => sum + b.duration, 0);
  const timeLabel = block.startHour < 12 ? 'morning' : block.startHour < 17 ? 'afternoon' : 'evening';

  let reason = dayStudyHours < 2
    ? `This ${timeLabel} slot was chosen because the day has a light workload (${dayStudyHours.toFixed(1)}h other study)`
    : daysUntilDue <= 2
    ? `Placed urgently — only ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} until the deadline`
    : `Spread across your week to avoid cramming, ${daysUntilDue}d before the deadline`;

  const totalScheduled = allBlocks
    .filter(b => b.assignmentId === block.assignmentId && b.type === 'study')
    .reduce((sum, b) => sum + b.duration, 0);

  return `${reason}. ${totalScheduled.toFixed(1)}h of ${task.estimatedHours}h total scheduled for this assignment.`;
}

export function applySuggestion(suggestion, blocks) {
  let newBlocks = [...blocks];
  for (const change of suggestion.changes) {
    if (change.isNewBlock) {
      const source = blocks.find(b => b.id === change.sourceBlockId);
      if (source) {
        newBlocks.push({
          ...source,
          id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: change.newDate,
          startHour: change.newStartHour,
          duration: change.newDuration,
        });
      }
    } else {
      newBlocks = newBlocks.map(b =>
        b.id === change.blockId
          ? {
              ...b,
              ...(change.newDate !== undefined && { date: change.newDate }),
              ...(change.newStartHour !== undefined && { startHour: change.newStartHour }),
              ...(change.newDuration !== undefined && { duration: change.newDuration }),
            }
          : b
      );
    }
  }
  return newBlocks;
}
