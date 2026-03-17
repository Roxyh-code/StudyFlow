import { useState, useMemo, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import TimerWidget from '../components/TimerWidget';

const priorityColor = {
  high:   { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  low:    { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};
const effortIcon = { low: '●', medium: '●●', high: '●●●' };

const SORT_OPTIONS = [
  { id: 'dueDate', label: 'Due Date' },
  { id: 'priority', label: 'Priority' },
  { id: 'estimatedHours', label: 'Hours' },
];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const TODAY = '2026-03-16';

export default function TasksPage({ onAddTask, initialFilter, onFilterConsumed }) {
  const { tasks, courses, updateTask, timers } = useApp();
  const [filter, setFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Accept initialFilter from dashboard card navigation
  useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter.statusFilter === 'in-progress') setFilter('in-progress');
    else if (initialFilter.statusFilter === 'overdue') setFilter('overdue');
    if (initialFilter.courseFilter && initialFilter.courseFilter !== 'all') setCourseFilter(initialFilter.courseFilter);
    if (initialFilter.selectedTask) {
      const t = tasks.find(t => t.id === initialFilter.selectedTask);
      if (t) { setSelectedTask(t); setTaskModalOpen(true); }
    }
    onFilterConsumed?.();
  }, [initialFilter]);

  const getCourse = (id) => courses.find(c => c.id === id);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter === 'overdue') {
      list = list.filter(t => new Date(t.dueDate) < new Date(TODAY) && t.status !== 'completed');
    } else if (filter !== 'all') {
      list = list.filter(t => t.status === filter);
    }
    if (courseFilter !== 'all') list = list.filter(t => t.courseId === courseFilter);
    if (focusMode) list = list.filter(t => t.priority === 'high');
    list.sort((a, b) => {
      if (sortBy === 'dueDate') return new Date(a.dueDate) - new Date(b.dueDate);
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === 'estimatedHours') return b.estimatedHours - a.estimatedHours;
      return 0;
    });
    return list;
  }, [tasks, filter, courseFilter, sortBy, focusMode]);

  function handleStatusToggle(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { status: task.status === 'completed' ? 'in-progress' : 'completed' });
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => ({ ...prev, status: prev.status === 'completed' ? 'in-progress' : 'completed' }));
    }
  }

  const overdueCount = tasks.filter(t => new Date(t.dueDate) < new Date(TODAY) && t.status !== 'completed').length;

  return (
    <div className="p-6 space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.filter(t => t.status !== 'completed').length} active,{' '}
            {tasks.filter(t => t.status === 'completed').length} completed
            {overdueCount > 0 && (
              <button
                onClick={() => setFilter('overdue')}
                className="ml-2 text-red-600 font-semibold hover:underline"
              >
                · {overdueCount} overdue
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              focusMode ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icons.Zap className="w-3.5 h-3.5" />
            {focusMode ? 'Focus ON' : 'Focus Mode'}
          </button>
          <button onClick={onAddTask} className="btn-primary text-xs py-1.5 px-3">
            <Icons.Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
      </div>

      {focusMode && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Icons.Zap className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Focus Mode Active</p>
            <p className="text-xs text-red-600">Showing only high-priority tasks.</p>
          </div>
          <button onClick={() => setFocusMode(false)} className="text-xs text-red-600 hover:underline">Exit</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {[['all','All'], ['not-started','Not Started'], ['in-progress','In Progress'], ['completed','Completed'], ['overdue','Overdue']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === val
                  ? val === 'overdue'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {val === 'overdue' && overdueCount > 0 && (
                <span className={`ml-1 text-[9px] font-bold px-1 py-0.5 rounded-full ${filter === 'overdue' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <select
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          className="select-field text-xs h-8 w-auto min-w-[130px]"
        >
          <option value="all">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">Sort:</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {SORT_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSortBy(id)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  sortBy === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Icons.CheckCircle className="w-10 h-10 text-green-400 mb-3" />
          <p className="text-sm font-semibold text-gray-700">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No tasks match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const course = getCourse(task.courseId);
            const daysLeft = Math.ceil((new Date(task.dueDate) - new Date(TODAY)) / 86400000);
            const pc = priorityColor[task.priority] || priorityColor.medium;
            const completed = task.status === 'completed';
            const overdue = daysLeft < 0 && !completed;
            const timer = timers[task.id];
            const isTimerRunning = timer?.isRunning;

            return (
              <div
                key={task.id}
                className={`card px-4 py-3.5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer ${completed ? 'opacity-60' : ''} ${overdue ? 'border-l-2 border-red-400' : ''}`}
                onClick={() => { setSelectedTask(task); setTaskModalOpen(true); }}
              >
                <button
                  onClick={e => { e.stopPropagation(); handleStatusToggle(task.id); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {completed && <Icons.CheckCircle className="w-3 h-3 text-white" />}
                </button>

                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course?.color }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold text-gray-900 ${completed ? 'line-through' : ''}`}>{task.title}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot} mr-1`} />
                      {task.priority}
                    </span>
                    {isTimerRunning && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Tracking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{course?.code}</span>
                    <span className="flex items-center gap-1">
                      <Icons.Clock className="w-3 h-3" />{task.estimatedHours}h
                    </span>
                    <span className="text-gray-400">Effort: <span className="text-gray-600">{effortIcon[task.effortLevel] || '●'}</span></span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-semibold ${
                    completed ? 'text-green-600' :
                    overdue ? 'text-red-600' :
                    daysLeft <= 3 ? 'text-amber-600' : 'text-gray-600'
                  }`}>
                    {completed ? 'Done' : overdue ? 'Overdue' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                  </p>
                  <p className="text-[10px] text-gray-400">{task.dueDate}</p>
                </div>

                <div className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${
                  task.status === 'completed' ? 'bg-green-100 text-green-700' :
                  task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Task Details" size="sm">
        {selectedTask && (() => {
          const course = getCourse(selectedTask.courseId);
          const daysLeft = Math.ceil((new Date(selectedTask.dueDate) - new Date(TODAY)) / 86400000);
          const liveTask = tasks.find(t => t.id === selectedTask.id) || selectedTask;
          const timer = timers[liveTask.id];
          const trackedHours = timer
            ? (timer.isRunning ? timer.elapsed + (Date.now() - timer.startedAt) / 3600000 : timer.elapsed)
            : 0;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: course?.color }}
                >
                  {course?.code?.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{liveTask.title}</p>
                  <p className="text-xs text-gray-500">{course?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Due Date', liveTask.dueDate],
                  ['Days Left', daysLeft <= 0 ? 'Overdue' : `${daysLeft} days`],
                  ['Estimated', `${liveTask.estimatedHours}h`],
                  ['Tracked', trackedHours > 0.001 ? `${trackedHours.toFixed(2)}h` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                    <p className="text-gray-400 mb-0.5">{k}</p>
                    <p className="font-semibold text-gray-800 capitalize">{v}</p>
                  </div>
                ))}
              </div>

              {liveTask.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                  <p className="text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-800">{liveTask.notes}</p>
                </div>
              )}

              {/* Timer */}
              <TimerWidget taskId={liveTask.id} plannedHours={liveTask.estimatedHours} />

              <div className="flex gap-2">
                <button
                  onClick={() => { handleStatusToggle(liveTask.id); setTaskModalOpen(false); }}
                  className="flex-1 btn-primary text-xs py-2"
                >
                  <Icons.CheckCircle className="w-3.5 h-3.5" />
                  {liveTask.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button onClick={() => setTaskModalOpen(false)} className="flex-1 btn-secondary text-xs py-2">
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
