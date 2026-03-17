import { createContext, useContext, useState, useMemo } from 'react';
import { courses as initialCoursesData, assignments as initialAssignments } from '../data/mockData';
import { initialBlocks } from '../data/mockData';
import { addDays, getWeekDates } from '../utils/dateUtils';
import { applySuggestion } from '../utils/aiUtils';
import { placeBlocksWithoutOverlap, findFreeSlotsForDay } from '../utils/schedulerUtils';

const BASE_MONDAY = '2026-03-16';

export const DEFAULT_PREFERENCES = {
  preferredStudyTime: 'morning', // 'morning' | 'afternoon' | 'evening' | 'balanced'
  maxHoursPerDay: 6,
  avoidWeekends: false,
  workloadStyle: 'balanced', // 'balanced' | 'focused' | 'early'
  breakBetweenSessions: 0.5,
  taskTypeTime: {}, // e.g. { assignment: 'afternoon', project: 'evening', reading: 'morning' }
};

function generateStudyBlocks(task, currentWeekStart, existingBlocks, preferences = DEFAULT_PREFERENCES) {
  const totalHours = Number(task.estimatedHours) || 2;

  // Override preferredStudyTime with task-type-specific preference if set
  const effectivePrefs = {
    ...preferences,
    preferredStudyTime: preferences.taskTypeTime?.[task.taskType] || preferences.preferredStudyTime,
  };

  const maxSessionHours = effectivePrefs.workloadStyle === 'focused' ? 3 : 2;
  const sessionsNeeded = Math.max(1, Math.ceil(totalHours / maxSessionHours));

  // Gather candidate dates (up to 14 days from today, before due date, skip Sunday if avoidWeekends)
  const candidateDates = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(currentWeekStart, i);
    if (d >= task.dueDate) break;
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    if (effectivePrefs.avoidWeekends && (dow === 0 || dow === 6)) continue;
    if (dow === 0) continue; // always skip Sunday
    candidateDates.push(d);
  }
  if (candidateDates.length === 0) candidateDates.push(currentWeekStart);

  // Sort candidate dates by preference workloadStyle
  if (effectivePrefs.workloadStyle === 'early') {
    // already in chronological order — front-load
  } else if (effectivePrefs.workloadStyle === 'focused') {
    // group sessions close together — keep as-is
  }
  // else balanced — default order

  // Build raw session blocks (without placement)
  const rawBlocks = [];
  for (let i = 0; i < sessionsNeeded; i++) {
    const sessionHours = i === sessionsNeeded - 1
      ? Math.max(0.5, totalHours - i * maxSessionHours)
      : maxSessionHours;
    rawBlocks.push({
      id: `study-${task.id}-${i}-${Date.now() + i}`,
      type: 'study',
      courseId: task.courseId,
      assignmentId: task.id,
      title: task.title,
      date: candidateDates[0], // will be overridden by placeBlocksWithoutOverlap
      startHour: 9,
      duration: Math.max(0.5, sessionHours),
      color: null,
      notes: task.notes || '',
      priority: task.priority || 'medium',
    });
  }

  // Place without overlap using smart scheduler
  return placeBlocksWithoutOverlap(rawBlocks, existingBlocks, candidateDates, effectivePrefs);
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [courses, setCourses] = useState(initialCoursesData);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [tasks, setTasks] = useState(initialAssignments);
  const [weekOffset, setWeekOffset] = useState(0);
  const [studyPreferences, setStudyPreferences] = useState(DEFAULT_PREFERENCES);
  const [timers, setTimers] = useState({}); // { [taskId]: { elapsed: 0, isRunning: false, startedAt: null } }

  const currentWeekStart = useMemo(() => addDays(BASE_MONDAY, weekOffset * 7), [weekOffset]);
  const currentWeekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // ── Course actions ──────────────────────────────────────────────────────────

  function addCourse(courseData) {
    const newCourse = {
      id: courseData.id || `course-${Date.now()}`,
      code: courseData.code,
      name: courseData.name,
      color: courseData.color || '#6366f1',
      lectures: courseData.lectures || [],
    };
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  }

  function updateCourse(courseId, changes) {
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...changes } : c));
  }

  function removeCourse(courseId) {
    setCourses(prev => prev.filter(c => c.id !== courseId));
  }

  // ── Task actions ────────────────────────────────────────────────────────────

  function addTask(taskData) {
    const newTask = {
      ...taskData,
      id: taskData.id || `task-${Date.now()}`,
      status: taskData.status || 'not-started',
    };
    setTasks(prev => [...prev, newTask]);
    const newBlocks = generateStudyBlocks(newTask, currentWeekStart, blocks, studyPreferences);
    setBlocks(prev => [...prev, ...newBlocks]);
    return newTask;
  }

  function updateTask(taskId, changes) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...changes } : t));
  }

  // ── Block actions ───────────────────────────────────────────────────────────

  function updateBlock(blockId, changes) {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...changes } : b));
  }

  function removeBlock(blockId) {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  }

  function completeBlock(blockId, outcome, options = {}) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    if (outcome === 'early' || outcome === 'ontime') {
      removeBlock(blockId);
      if (block.assignmentId) {
        const remaining = blocks.filter(b => b.assignmentId === block.assignmentId && b.id !== blockId);
        if (remaining.length === 0) {
          updateTask(block.assignmentId, { status: 'completed' });
        }
      }
    } else if (outcome === 'moretime') {
      const { extraHours = 1, reschedule = 'extend' } = options;
      if (reschedule === 'extend') {
        updateBlock(blockId, { duration: block.duration + extraHours });
      } else if (reschedule === 'tomorrow') {
        const nextDate = addDays(block.date, 1);
        // Find free slot on next day
        const nextDayBlocks = blocks.filter(b => b.date === nextDate);
        const slots = findFreeSlotsForDay(nextDayBlocks, nextDate, studyPreferences);
        const fit = slots.find(s => s.availableHours >= block.duration);
        updateBlock(blockId, { date: nextDate, startHour: fit ? fit.startHour : block.startHour });
      } else if (reschedule === 'split') {
        const half = Math.max(0.5, block.duration / 2);
        updateBlock(blockId, { duration: half });
        const nextDate = addDays(block.date, 1);
        const nextDayBlocks = blocks.filter(b => b.date === nextDate);
        const slots = findFreeSlotsForDay(nextDayBlocks, nextDate, studyPreferences);
        const fit = slots.find(s => s.availableHours >= half + extraHours);
        setBlocks(prev => [...prev, {
          ...block,
          id: `split-${Date.now()}`,
          date: nextDate,
          startHour: fit ? fit.startHour : block.startHour,
          duration: half + extraHours,
        }]);
      } else if (reschedule === 'rebalance') {
        const futureDays = currentWeekDates.filter(d => d > block.date);
        const hoursPerDay = {};
        futureDays.forEach(d => { hoursPerDay[d] = 0; });
        blocks.filter(b => b.type === 'study' && futureDays.includes(b.date) && b.id !== blockId)
          .forEach(b => { hoursPerDay[b.date] = (hoursPerDay[b.date] || 0) + b.duration; });
        const lightestDay = futureDays.sort((a, b) => hoursPerDay[a] - hoursPerDay[b])[0];
        if (lightestDay) {
          const dayBlocks = blocks.filter(b => b.date === lightestDay);
          const slots = findFreeSlotsForDay(dayBlocks, lightestDay, studyPreferences);
          const fit = slots.find(s => s.availableHours >= extraHours);
          setBlocks(prev => [...prev, {
            ...block,
            id: `rebalance-${Date.now()}`,
            date: lightestDay,
            startHour: fit ? fit.startHour : 10,
            duration: extraHours,
          }]);
        }
      }
    }
  }

  function delayBlock(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const nextDate = addDays(block.date, 1);
    const nextDayBlocks = blocks.filter(b => b.date === nextDate);
    const slots = findFreeSlotsForDay(nextDayBlocks, nextDate, studyPreferences);
    const fit = slots.find(s => s.availableHours >= block.duration);
    updateBlock(blockId, { date: nextDate, startHour: fit ? fit.startHour : block.startHour });
  }

  /**
   * Save new preferences AND rebuild all study blocks in one atomic step.
   * Accepts the full new prefs object as a parameter to avoid stale-closure issues —
   * if we called updatePreferences() first and then rescheduleAllTasks(), the
   * scheduler would still read the old studyPreferences from the closure.
   */
  function applyPreferencesAndReschedule(newPrefs) {
    const merged = {
      ...studyPreferences,
      ...newPrefs,
      taskTypeTime: { ...studyPreferences.taskTypeTime, ...(newPrefs.taskTypeTime || {}) },
    };
    setStudyPreferences(merged);
    setBlocks(prev => {
      const lectureBlocks = prev.filter(b => b.type !== 'study');
      const activeTasks = tasks.filter(t => t.status !== 'completed');
      let runningBlocks = [...lectureBlocks];
      const newStudyBlocks = [];
      for (const task of activeTasks) {
        const generated = generateStudyBlocks(task, currentWeekStart, runningBlocks, merged);
        newStudyBlocks.push(...generated);
        runningBlocks = [...runningBlocks, ...generated];
      }
      return [...lectureBlocks, ...newStudyBlocks];
    });
  }

  // Keep a simple rescheduleAllTasks for internal use (uses current studyPreferences)
  function rescheduleAllTasks() {
    applyPreferencesAndReschedule(studyPreferences);
  }

  function applyAISuggestion(suggestion) {
    setBlocks(prev => applySuggestion(suggestion, prev));
  }

  // ── Preference actions ──────────────────────────────────────────────────────

  function updatePreferences(changes) {
    setStudyPreferences(prev => ({ ...prev, ...changes }));
  }

  // ── Timer actions ───────────────────────────────────────────────────────────

  function startTimer(taskId) {
    setTimers(prev => ({
      ...prev,
      [taskId]: {
        elapsed: prev[taskId]?.elapsed || 0,
        isRunning: true,
        startedAt: Date.now(),
      },
    }));
    // Mark task as in-progress when timer starts
    updateTask(taskId, { status: 'in-progress' });
  }

  function pauseTimer(taskId) {
    setTimers(prev => {
      const timer = prev[taskId];
      if (!timer?.isRunning) return prev;
      const elapsed = timer.elapsed + (Date.now() - timer.startedAt) / 3600000;
      return { ...prev, [taskId]: { elapsed, isRunning: false, startedAt: null } };
    });
  }

  function stopTimer(taskId) {
    setTimers(prev => {
      const timer = prev[taskId];
      if (!timer) return prev;
      const elapsed = timer.isRunning
        ? timer.elapsed + (Date.now() - timer.startedAt) / 3600000
        : timer.elapsed;
      return { ...prev, [taskId]: { elapsed, isRunning: false, startedAt: null, stopped: true } };
    });
  }

  function getTrackedHours(taskId) {
    const timer = timers[taskId];
    if (!timer) return 0;
    const elapsed = timer.isRunning
      ? timer.elapsed + (Date.now() - timer.startedAt) / 3600000
      : timer.elapsed;
    return elapsed;
  }

  const value = {
    courses,
    blocks,
    tasks,
    weekOffset,
    setWeekOffset,
    currentWeekStart,
    currentWeekDates,
    BASE_MONDAY,
    studyPreferences,
    timers,
    addCourse,
    updateCourse,
    removeCourse,
    addTask,
    updateTask,
    updateBlock,
    removeBlock,
    completeBlock,
    delayBlock,
    rescheduleAllTasks,
    applyPreferencesAndReschedule,
    applyAISuggestion,
    updatePreferences,
    startTimer,
    pauseTimer,
    stopTimer,
    getTrackedHours,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
