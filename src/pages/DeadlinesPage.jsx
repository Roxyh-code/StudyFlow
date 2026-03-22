import { useMemo } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';

const TODAY = '2026-03-22';

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date(TODAY)) / 86400000);
}

function urgencyStyle(daysLeft, completed) {
  if (completed) return { bar: 'bg-green-400', label: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  if (daysLeft < 0)  return { bar: 'bg-red-500',   label: 'text-red-600',   badge: 'bg-red-100 text-red-700' };
  if (daysLeft <= 2) return { bar: 'bg-orange-400', label: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' };
  if (daysLeft <= 5) return { bar: 'bg-amber-400',  label: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' };
  return { bar: 'bg-indigo-400', label: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' };
}

function daysLabel(daysLeft, completed) {
  if (completed) return 'Done';
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  return `${daysLeft}d left`;
}

export default function DeadlinesPage({ onAddTask }) {
  const { tasks, courses, blocks, updateTask } = useApp();

  // Map taskId → scheduled study hours
  const scheduledHours = useMemo(() => {
    const map = {};
    blocks.forEach(b => {
      if (b.type === 'study' && b.assignmentId) {
        map[b.assignmentId] = (map[b.assignmentId] || 0) + b.duration;
      }
    });
    return map;
  }, [blocks]);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // completed go to bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [tasks]);

  const active = sorted.filter(t => t.status !== 'completed');
  const done   = sorted.filter(t => t.status === 'completed');

  function toggleDone(task) {
    updateTask(task.id, {
      status: task.status === 'completed' ? 'not-started' : 'completed',
    });
  }

  function renderTask(task) {
    const course = courses.find(c => c.id === task.courseId);
    const daysLeft = daysUntil(task.dueDate);
    const completed = task.status === 'completed';
    const style = urgencyStyle(daysLeft, completed);
    const scheduled = scheduledHours[task.id] || 0;
    const total = task.estimatedHours || 1;
    const progress = Math.min(100, Math.round((scheduled / total) * 100));

    return (
      <div
        key={task.id}
        className={`bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 transition-opacity ${completed ? 'opacity-50' : ''}`}
      >
        {/* Done checkbox */}
        <button
          onClick={() => toggleDone(task)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
          }`}
        >
          {completed && <Icons.CheckCircle className="w-3.5 h-3.5 text-white" />}
        </button>

        {/* Course color bar */}
        <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: course?.color ?? '#94a3b8' }} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-semibold text-gray-900 truncate ${completed ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </p>
            <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">{course?.code}</span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${style.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 w-20 text-right">
              {scheduled.toFixed(1)}h / {total}h scheduled
            </span>
          </div>
        </div>

        {/* Due date badge */}
        <div className="text-right flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${style.badge}`}>
            {daysLabel(daysLeft, completed)}
          </span>
          <p className="text-[10px] text-gray-400 mt-1">{task.dueDate}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Deadlines</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {active.length} upcoming · {done.length} completed
        </p>
      </div>

      {/* Active tasks */}
      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-16 text-center">
          <Icons.CheckCircle className="w-10 h-10 text-green-400 mb-3" />
          <p className="text-sm font-semibold text-gray-700">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No upcoming deadlines. Add one to get started.</p>
          <button onClick={onAddTask} className="btn-primary text-xs py-2 px-4 mt-4">
            <Icons.Plus className="w-3.5 h-3.5" /> Add Deadline
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(renderTask)}
        </div>
      )}

      {/* Completed section */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-3 px-1">Completed</p>
          <div className="space-y-2">
            {done.map(renderTask)}
          </div>
        </div>
      )}
    </div>
  );
}
