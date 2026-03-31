// BASE_MONDAY = '2026-03-16'
// Weeks 0-5 lecture blocks generated for all courses

// ── Courses ──────────────────────────────────────────────────────────────────
export const courses = [
  { id: 'csc318', code: 'CSC318', name: 'Design of Interactive Computational Media', color: '#6366f1', lectures: ['Mon 13:00–14:00', 'Wed 13:00–14:00', 'Fri 13:00–14:00'] },
  { id: 'csc373', code: 'CSC373', name: 'Algorithm Design & Analysis',               color: '#0ea5e9', lectures: ['Tue 10:00–11:00', 'Thu 10:00–11:00'] },
  { id: 'csc343', code: 'CSC343', name: 'Introduction to Databases',                 color: '#f59e0b', lectures: ['Mon 15:00–16:00', 'Wed 15:00–16:00'] },
  { id: 'mat337', code: 'MAT337', name: 'Introduction to Real Analysis',             color: '#ec4899', lectures: ['Tue 14:00–15:00', 'Thu 14:00–15:00'] },
];

// ── Assignments ───────────────────────────────────────────────────────────────
export const assignments = [
  { id: 'a1', courseId: 'csc318', title: 'G2 Report',                      dueDate: '2026-03-17', estimatedHours: 8,  status: 'in-progress',  priority: 'high',   effortLevel: 'high',   taskType: 'project'     },
  { id: 'a2', courseId: 'csc373', title: 'Assignment 3 – DP Problems',      dueDate: '2026-03-20', estimatedHours: 6,  status: 'in-progress',  priority: 'high',   effortLevel: 'high',   taskType: 'assignment'  },
  { id: 'a3', courseId: 'csc343', title: 'Lab 4 – SQL Queries',             dueDate: '2026-03-19', estimatedHours: 3,  status: 'in-progress',  priority: 'medium', effortLevel: 'medium', taskType: 'assignment'  },
  { id: 'a4', courseId: 'mat337', title: 'Problem Set 5',                   dueDate: '2026-03-21', estimatedHours: 5,  status: 'not-started',  priority: 'medium', effortLevel: 'high',   taskType: 'problem_set' },
  { id: 'a5', courseId: 'csc318', title: 'G3 Prototype',                    dueDate: '2026-04-01', estimatedHours: 12, status: 'not-started',  priority: 'low',    effortLevel: 'high',   taskType: 'project'     },
  { id: 'a6', courseId: 'csc373', title: 'Assignment 4 – Graph Algorithms', dueDate: '2026-04-07', estimatedHours: 8,  status: 'not-started',  priority: 'low',    effortLevel: 'high',   taskType: 'assignment'  },
];

// ── Helper: add days to a date string ────────────────────────────────────────
function addDaysLocal(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split('T')[0];
}

// ── Generate lecture blocks for weeks 0-5 ────────────────────────────────────
const BASE_MONDAY = '2026-03-16';

// dayOffset: 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri
const LECTURE_SCHEDULE = [
  { courseId: 'csc318', dayOffset: 0, startHour: 13, duration: 1 },
  { courseId: 'csc318', dayOffset: 2, startHour: 13, duration: 1 },
  { courseId: 'csc318', dayOffset: 4, startHour: 13, duration: 1 },
  { courseId: 'csc373', dayOffset: 1, startHour: 10, duration: 1 },
  { courseId: 'csc373', dayOffset: 3, startHour: 10, duration: 1 },
  { courseId: 'csc343', dayOffset: 0, startHour: 15, duration: 1 },
  { courseId: 'csc343', dayOffset: 2, startHour: 15, duration: 1 },
  { courseId: 'mat337', dayOffset: 1, startHour: 14, duration: 1 },
  { courseId: 'mat337', dayOffset: 3, startHour: 14, duration: 1 },
];

const lectureBlocks = [];
for (let week = 0; week < 6; week++) {
  const weekMonday = addDaysLocal(BASE_MONDAY, week * 7);
  LECTURE_SCHEDULE.forEach(({ courseId, dayOffset, startHour, duration }) => {
    const date = addDaysLocal(weekMonday, dayOffset);
    const course = courses.find(c => c.id === courseId);
    lectureBlocks.push({
      id: `lec-${courseId}-w${week}-d${dayOffset}`,
      type: 'lecture',
      courseId,
      title: `${course.code} Lecture`,
      date,
      startHour,
      duration,
    });
  });
}

// ── Week 0 study blocks — realistic heavy load ────────────────────────────────
// Mon 2026-03-16: G2 Report 9-12 (3h) + 16-18 (2h) = 5h total
// Tue 2026-03-17: G2 Report 9-12 (3h) = 3h
// Wed 2026-03-18: Lab 4 SQL 10-12 (2h)
// Thu 2026-03-19: Asgn3 DP 11-13 (2h)
// Fri 2026-03-20: Asgn3 DP 9-11 (2h) + PS5 14-16 (2h) = 4h
// Sat 2026-03-21: G3 Prototype 10-12 (2h)
const week0StudyBlocks = [
  { id: 's-w0-1', type: 'study', source: 'ai',     courseId: 'csc318', assignmentId: 'a1', title: 'G2 Report',    date: '2026-03-16', startHour: 9,  duration: 3 },
  { id: 's-w0-2', type: 'study', source: 'ai',     courseId: 'csc318', assignmentId: 'a1', title: 'G2 Report',    date: '2026-03-16', startHour: 16, duration: 2 },
  { id: 's-w0-3', type: 'study', source: 'ai',     courseId: 'csc318', assignmentId: 'a1', title: 'G2 Report',    date: '2026-03-17', startHour: 9,  duration: 3 },
  { id: 's-w0-4', type: 'study', source: 'ai',     courseId: 'csc343', assignmentId: 'a3', title: 'Lab 4 SQL',    date: '2026-03-18', startHour: 10, duration: 2 },
  { id: 's-w0-5', type: 'study', source: 'ai',     courseId: 'csc373', assignmentId: 'a2', title: 'Asgn3 DP',     date: '2026-03-19', startHour: 11, duration: 2 },
  { id: 's-w0-6', type: 'study', source: 'ai',     courseId: 'csc373', assignmentId: 'a2', title: 'Asgn3 DP',     date: '2026-03-20', startHour: 9,  duration: 2 },
  { id: 's-w0-7', type: 'study', source: 'manual', courseId: 'mat337', assignmentId: 'a4', title: 'PS5',          date: '2026-03-20', startHour: 14, duration: 2 },
  { id: 's-w0-8', type: 'study', source: 'ai',     courseId: 'csc318', assignmentId: 'a5', title: 'G3 Prototype', date: '2026-03-21', startHour: 10, duration: 2 },
];

// ── Export all blocks ─────────────────────────────────────────────────────────
export const initialBlocks = [...lectureBlocks, ...week0StudyBlocks];

// For backwards compat with older imports
export const weeklyBlocks = initialBlocks;

// ── Heatmap data (static, for dashboard mini-heatmap) ────────────────────────
export const heatmapWeeks = [
  { week: 'Mar 16', days: [5.0, 3.0, 2.0, 2.0, 4.0, 2.0, 0] },
  { week: 'Mar 23', days: [3.0, 4.0, 2.0, 4.5, 3.0, 1.0, 0] },
  { week: 'Mar 30', days: [2.5, 5.5, 4.0, 6.5, 3.5, 2.0, 0] },
  { week: 'Apr 6',  days: [1.0, 3.0, 2.5, 3.0, 1.5, 0,   0] },
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
