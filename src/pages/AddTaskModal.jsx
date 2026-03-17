import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { addDays, getWeekDates } from '../utils/dateUtils';

const steps = ['Task Info', 'Schedule', 'AI Preview'];

function generatePreviewBlocks(form, currentWeekStart) {
  if (!form.estimatedHours || !form.dueDate) return [];
  const totalHours = Number(form.estimatedHours);
  const sessionsNeeded = Math.max(1, Math.ceil(totalHours / 2));
  const candidateDates = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(currentWeekStart, i);
    if (d >= form.dueDate) break;
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    if (dow !== 0) candidateDates.push(d);
  }
  if (candidateDates.length === 0) candidateDates.push(currentWeekStart);
  const step = Math.max(1, Math.floor(candidateDates.length / sessionsNeeded));
  const blocks = [];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  for (let i = 0; i < sessionsNeeded; i++) {
    const dateIndex = Math.min(i * step, candidateDates.length - 1);
    const date = candidateDates[dateIndex];
    const dow = new Date(date + 'T00:00:00Z').getUTCDay();
    const hours = i === sessionsNeeded - 1 ? totalHours - (sessionsNeeded - 1) * 2 : 2;
    blocks.push({
      day: dayNames[dow],
      date,
      time: `9:00 – ${9 + Math.max(0.5, hours)}:00`,
      hours: Math.max(0.5, hours),
    });
  }
  return blocks;
}

export default function AddTaskModal({ open, onClose }) {
  const { addTask, currentWeekStart, courses } = useApp();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    dueDate: '',
    estimatedHours: '',
    priority: 'medium',
    effortLevel: 'medium',
    taskType: 'assignment',
    todayGoal: '',
    notes: '',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNext = () => {
    if (step === 1) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setStep(2); }, 1200);
    } else {
      setStep(s => Math.min(s + 1, 2));
    }
  };

  const handleConfirm = () => {
    addTask({
      id: `task-${Date.now()}`,
      title: form.title,
      courseId: form.courseId,
      dueDate: form.dueDate,
      estimatedHours: Number(form.estimatedHours) || 2,
      priority: form.priority,
      effortLevel: form.effortLevel,
      taskType: form.taskType,
      todayGoal: form.todayGoal,
      notes: form.notes,
      status: 'not-started',
    });
    setStep(0);
    setForm({ title: '', courseId: '', dueDate: '', estimatedHours: '', priority: 'medium', effortLevel: 'medium', taskType: 'assignment', todayGoal: '', notes: '' });
    onClose();
  };

  const selectedCourse = courses.find(c => c.id === form.courseId);
  const previewBlocks = useMemo(
    () => generatePreviewBlocks(form, currentWeekStart),
    [form, currentWeekStart]
  );

  const stepValid = [
    !!(form.title && form.courseId && form.dueDate),
    !!form.estimatedHours,
    true,
  ];

  function handleClose() {
    setStep(0);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add New Task" size="md">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <Icons.CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium flex-1 ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Task Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Assignment 3 – Dynamic Programming"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Course *</label>
              <select value={form.courseId} onChange={e => update('courseId', e.target.value)} className="select-field">
                <option value="">Select course…</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <div className="flex gap-2">
                {['low','medium','high'].map(p => (
                  <button key={p} onClick={() => update('priority', p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                      form.priority === p
                        ? p === 'high' ? 'bg-red-100 border-red-300 text-red-700'
                          : p === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Effort Level</label>
              <div className="flex gap-2">
                {['low','medium','high'].map(e => (
                  <button key={e} onClick={() => update('effortLevel', e)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                      form.effortLevel === e ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">Task Type</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'assignment', label: 'Assignment', icon: '📝' },
                { id: 'project',    label: 'Project',    icon: '🏗️' },
                { id: 'reading',    label: 'Reading',    icon: '📖' },
                { id: 'problem_set',label: 'Problem Set',icon: '🔢' },
                { id: 'exam_prep',  label: 'Exam Prep',  icon: '📚' },
                { id: 'other',      label: 'Other',      icon: '📌' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => update('taskType', t.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.taskType === t.id
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={2}
              placeholder="Any additional context…"
              className="input-field resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 1: Schedule */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
            <Icons.Zap className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">StudyFlow AI Planning</p>
              <p className="text-xs text-indigo-600 mt-0.5">Provide your time estimate and StudyFlow will schedule study blocks for you.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estimated Hours *</label>
              <input
                type="number" min="0.5" max="40" step="0.5"
                placeholder="e.g. 6"
                value={form.estimatedHours}
                onChange={e => update('estimatedHours', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Today's Goal (optional)</label>
              <input
                type="text"
                placeholder="e.g. Finish Q1–Q3"
                value={form.todayGoal}
                onChange={e => update('todayGoal', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-indigo-300 transition-colors cursor-pointer group">
            <Icons.Upload className="w-7 h-7 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            <p className="text-sm text-gray-500 group-hover:text-indigo-600 transition-colors">Drop syllabus or assignment PDF here</p>
            <p className="text-xs text-gray-400">AI will extract due dates and estimate effort automatically</p>
            <button className="btn-secondary text-xs mt-1">Browse Files</button>
          </div>
        </div>
      )}

      {/* Step 2: AI Preview */}
      {step === 2 && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-sm text-gray-600">AI is planning your week…</p>
            </div>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <Icons.CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Study plan created!</p>
                  <p className="text-xs text-green-600">AI scheduled {previewBlocks.length} study block{previewBlocks.length !== 1 ? 's' : ''} based on your availability.</p>
                </div>
              </div>

              {selectedCourse && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedCourse.color }}>
                    {selectedCourse.code.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{form.title}</p>
                    <p className="text-xs text-gray-500">{selectedCourse.code} · Due {form.dueDate} · {form.estimatedHours}h total</p>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Scheduled Study Blocks</label>
                {previewBlocks.length === 0 ? (
                  <p className="text-xs text-gray-400 mt-1">No dates available before the due date. Block will be added to the current week.</p>
                ) : (
                  <div className="space-y-2">
                    {previewBlocks.map((b, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800">{b.day}</p>
                          <p className="text-[10px] text-gray-500">{b.date} · {b.time}</p>
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{b.hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                You can drag blocks in the calendar to adjust timing after confirming.
              </p>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-xs py-2">
            <Icons.ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        <div className="flex-1" />
        <button onClick={handleClose} className="btn-ghost text-xs py-2">Cancel</button>
        {step < 2 ? (
          <button onClick={handleNext} disabled={!stepValid[step] || loading} className="btn-primary text-xs py-2 px-4">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Planning…
              </span>
            ) : <><span>Next</span> <Icons.ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        ) : (
          <button onClick={handleConfirm} className="btn-primary text-xs py-2 px-4">
            <Icons.CheckCircle className="w-3.5 h-3.5" /> Add to Calendar
          </button>
        )}
      </div>
    </Modal>
  );
}
