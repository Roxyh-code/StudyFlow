/**
 * Analyzes calendar blocks and generates actionable AI suggestions.
 * @param {Array} blocks - All calendar blocks
 * @param {Array} tasks - All tasks
 * @param {Array} weekDates - Array of 7 date strings (Mon–Sun) for the current week
 * @returns {Array} suggestions
 */
export function generateSuggestions(blocks, tasks, weekDates) {
  const suggestions = [];

  // Filter to only study blocks in the current week
  const weekStudyBlocks = blocks.filter(
    b => b.type === 'study' && weekDates.includes(b.date)
  );

  // Sum hours per day
  const hoursPerDay = {};
  weekDates.forEach(d => { hoursPerDay[d] = 0; });
  weekStudyBlocks.forEach(b => {
    hoursPerDay[b.date] = (hoursPerDay[b.date] || 0) + b.duration;
  });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Identify overloaded days (> 5h study)
  const overloadedDays = weekDates.filter(d => hoursPerDay[d] > 5);
  // Identify light days (< 2h study, weekdays only = index 0-4)
  const lightDays = weekDates.filter((d, i) => i < 5 && hoursPerDay[d] < 2);

  // Suggestion 1: Move blocks from overloaded day to light day
  if (overloadedDays.length > 0 && lightDays.length > 0) {
    const heavyDay = overloadedDays[0];
    const lightDay = lightDays[0];
    const heavyDayName = dayNames[weekDates.indexOf(heavyDay)];
    const lightDayName = dayNames[weekDates.indexOf(lightDay)];
    const heavyHours = hoursPerDay[heavyDay];

    // Find a moveable block on the heavy day (prefer 2h blocks)
    const moveable = weekStudyBlocks
      .filter(b => b.date === heavyDay)
      .sort((a, b) => b.duration - a.duration)[0];

    if (moveable) {
      // Find a free time slot on the light day (start at 10:00 if possible)
      const usedHours = weekStudyBlocks
        .filter(b => b.date === lightDay)
        .map(b => b.startHour);
      let targetHour = 10;
      while (usedHours.includes(targetHour)) targetHour++;

      suggestions.push({
        id: `sug-move-${heavyDay}-${lightDay}`,
        type: 'move',
        title: `Lighten ${heavyDayName} — move 1 block to ${lightDayName}`,
        description: `${heavyDayName} has ${heavyHours}h of study (overloaded). Moving "${moveable.title}" (${moveable.duration}h) to ${lightDayName} would balance your week.`,
        impact: `Reduces ${heavyDayName} from ${heavyHours}h to ${(heavyHours - moveable.duration).toFixed(1)}h`,
        severity: 'high',
        changes: [
          {
            blockId: moveable.id,
            newDate: lightDay,
            newStartHour: targetHour,
            newDuration: moveable.duration,
          },
        ],
      });
    }
  }

  // Suggestion 2: Split large block (> 3h) into two sessions
  const largeBlocks = weekStudyBlocks.filter(b => b.duration >= 3);
  if (largeBlocks.length > 0) {
    const big = largeBlocks[0];
    const bigDayIndex = weekDates.indexOf(big.date);
    const bigDayName = dayNames[bigDayIndex];

    // Find an adjacent day to place the second half
    const splitToIndex = bigDayIndex < 6 ? bigDayIndex + 1 : bigDayIndex - 1;
    const splitToDate = weekDates[splitToIndex];
    const splitToDayName = dayNames[splitToIndex];
    const half = Math.ceil(big.duration / 2 * 2) / 2; // round to 0.5h

    suggestions.push({
      id: `sug-split-${big.id}`,
      type: 'split',
      title: `Split ${big.duration}h "${big.title}" block`,
      description: `A ${big.duration}h study session on ${bigDayName} is long and may reduce focus. Split it into two ${half}h sessions across ${bigDayName} and ${splitToDayName}.`,
      impact: `Better focus with 2x${half}h sessions instead of 1x${big.duration}h`,
      severity: 'medium',
      changes: [
        // Shorten original block
        {
          blockId: big.id,
          newDate: big.date,
          newStartHour: big.startHour,
          newDuration: half,
        },
        // New block on adjacent day (will be created by applySuggestion)
        {
          blockId: null,
          sourceBlockId: big.id,
          newDate: splitToDate,
          newStartHour: 10,
          newDuration: big.duration - half,
          isNewBlock: true,
        },
      ],
    });
  }

  // Suggestion 3: Rebalance if overall distribution is very uneven
  const studiedDays = weekDates.filter(d => hoursPerDay[d] > 0);
  const maxHours = Math.max(...weekDates.map(d => hoursPerDay[d]));
  const minHours = Math.min(...studiedDays.map(d => hoursPerDay[d]));

  if (studiedDays.length >= 2 && maxHours - minHours >= 3) {
    const maxDay = weekDates.find(d => hoursPerDay[d] === maxHours);
    const minDay = weekDates.find(d => studiedDays.includes(d) && hoursPerDay[d] === minHours);
    const maxDayName = dayNames[weekDates.indexOf(maxDay)];
    const minDayName = dayNames[weekDates.indexOf(minDay)];

    // Find a 1h or 1.5h block on the max day to move
    const candidateBlock = weekStudyBlocks
      .filter(b => b.date === maxDay && b.duration <= 2)
      .sort((a, b) => a.duration - b.duration)[0];

    if (candidateBlock && maxDay !== minDay) {
      // Don't duplicate a suggestion we already made
      const alreadySuggested = suggestions.some(s =>
        s.changes.some(c => c.blockId === candidateBlock.id)
      );
      if (!alreadySuggested) {
        const usedHours = weekStudyBlocks
          .filter(b => b.date === minDay)
          .map(b => b.startHour);
        let targetHour = 9;
        while (usedHours.includes(targetHour)) targetHour += 1;

        suggestions.push({
          id: `sug-rebalance-${maxDay}-${minDay}`,
          type: 'rebalance',
          title: `Rebalance: spread study from ${maxDayName} to ${minDayName}`,
          description: `${maxDayName} has ${maxHours}h vs ${minDayName}'s ${minHours}h. Moving "${candidateBlock.title}" (${candidateBlock.duration}h) creates a more even weekly rhythm.`,
          impact: `Equalises ${maxDayName} (${maxHours}h→${(maxHours - candidateBlock.duration).toFixed(1)}h) and ${minDayName} (${minHours}h→${(minHours + candidateBlock.duration).toFixed(1)}h)`,
          severity: 'low',
          changes: [
            {
              blockId: candidateBlock.id,
              newDate: minDay,
              newStartHour: targetHour,
              newDuration: candidateBlock.duration,
            },
          ],
        });
      }
    }
  }

  return suggestions;
}

/**
 * Applies a suggestion's changes to the blocks array.
 * @param {Object} suggestion
 * @param {Array} blocks
 * @returns {Array} new blocks
 */
export function applySuggestion(suggestion, blocks) {
  let newBlocks = [...blocks];

  for (const change of suggestion.changes) {
    if (change.isNewBlock) {
      // Create a new block based on an existing one
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
      // Modify existing block
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
