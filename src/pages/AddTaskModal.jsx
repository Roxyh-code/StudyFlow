import { useState } from 'react';
import Modal from '../components/Modal';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';

export default function AddTaskModal({ open, onClose }) {
  const { addTask, courses } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    dueDate: '',
    estimatedHours: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Deadline is optional — the only required fields are title + estimatedHours
  const isValid = !!(form.title && form.estimatedHours);
  const hasDeadline = !!form.dueDate;

  function handleAdd() {
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      addTask({
        id: `task-${Date.now()}`,
        title: form.title,
        courseId: form.courseId || null,
        dueDate: form.dueDate || null,          // null = flexible
        estimatedHours: Number(form.estimatedHours),
        priority: hasDeadline ? 'medium' : 'low',
        effortLevel: 'medium',
        taskType: hasDeadline ? 'assignment' : 'flexible',
        status: 'not-started',
      });
      setLoading(false);
      setForm({ title: '', courseId: '', dueDate: '', estimatedHours: '' });
      onClose();
    }, 900);
  }

  function handleClose() {
    setForm({ title: '', courseId: '', dueDate: '', estimatedHours: '' });
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Task" size="sm">
      {loading ? (
        <div className="flex flex-col items-center py-10 gap-3">
          <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm font-medium text-gray-600">
            {hasDeadline ? 'Scheduling study blocks…' : 'Spreading across your week…'}
          </p>
          <p className="text-xs text-gray-400">
            {hasDeadline ? 'Fitting sessions before your deadline' : 'Finding light days in the next week'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Mode indicator */}
          <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs ${
            hasDeadline
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
          }`}>
            {hasDeadline ? (
              <Icons.Alert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
            ) : (
              <Icons.Sparkle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-400" />
            )}
            <span>
              {hasDeadline
                ? 'AI will split this into study blocks before the deadline.'
                : 'No deadline — AI will spread sessions flexibly over the next 7 days.'}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="label">Task name *</label>
            <input
              type="text"
              placeholder="e.g. Assignment 3 – Dynamic Programming"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          {/* Course + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Course <span className="text-gray-400 font-normal">(optional)</span></label>
              <select value={form.courseId} onChange={e => update('courseId', e.target.value)} className="select-field">
                <option value="">No course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Deadline <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => update('dueDate', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Hours */}
          <div>
            <label className="label">Hours needed *</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 6, 8, 10].map(h => (
                <button
                  key={h}
                  onClick={() => update('estimatedHours', String(h))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    form.estimatedHours === String(h)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {h}h
                </button>
              ))}
              <input
                type="number"
                min="0.5"
                max="40"
                step="0.5"
                placeholder="other"
                value={[1,2,3,4,6,8,10].includes(Number(form.estimatedHours)) ? '' : form.estimatedHours}
                onChange={e => update('estimatedHours', e.target.value)}
                className="input-field w-20 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={handleClose} className="flex-1 btn-secondary text-sm py-2">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!isValid}
              className="flex-1 btn-primary text-sm py-2"
            >
              <Icons.Zap className="w-4 h-4" />
              {hasDeadline ? 'Schedule It' : 'Add to Plan'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
