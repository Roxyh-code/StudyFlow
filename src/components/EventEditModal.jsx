import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';

const HOURS_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 7); // 7–21

export default function EventEditModal({ block, open, onClose }) {
  const { updateBlock, removeBlock, tasks, courses } = useApp();

  const [form, setForm] = useState({
    title: '',
    courseId: '',
    date: '',
    startHour: 9,
    duration: 1,
    priority: 'medium',
    notes: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (block && open) {
      setForm({
        title: block.title || '',
        courseId: block.courseId || '',
        date: block.date || '',
        startHour: block.startHour ?? 9,
        duration: block.duration ?? 1,
        priority: block.priority || 'medium',
        notes: block.notes || '',
      });
      setShowDeleteConfirm(false);
      setSaved(false);
    }
  }, [block, open]);

  if (!block) return null;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedCourse = courses.find(c => c.id === form.courseId);

  function handleSave() {
    updateBlock(block.id, {
      title: form.title,
      courseId: form.courseId,
      date: form.date,
      startHour: Number(form.startHour),
      duration: Number(form.duration),
      priority: form.priority,
      notes: form.notes,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  }

  function handleDelete() {
    removeBlock(block.id);
    onClose();
  }

  const endHour = Number(form.startHour) + Number(form.duration);
  const endHourDisplay = endHour >= 24 ? 23 : endHour;

  function formatHour(h) {
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
  }

  return (
    <Modal open={open} onClose={onClose} title={block.type === 'lecture' ? 'Edit Lecture Block' : 'Edit Study Block'} size="md">
      <div className="space-y-4">
        {/* Color strip */}
        {selectedCourse && (
          <div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: selectedCourse.color }}
          />
        )}

        {/* Title */}
        <div>
          <label className="label">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            className="input-field"
            placeholder="Block title"
          />
        </div>

        {/* Course + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Course</label>
            <select
              value={form.courseId}
              onChange={e => update('courseId', e.target.value)}
              className="select-field"
            >
              <option value="">No course</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {/* Start time + Duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Time</label>
            <select
              value={form.startHour}
              onChange={e => update('startHour', Number(e.target.value))}
              className="select-field"
            >
              {HOURS_OPTIONS.map(h => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Duration: {form.duration}h</label>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.5}
              value={form.duration}
              onChange={e => update('duration', Number(e.target.value))}
              className="w-full mt-2 accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0.5h</span>
              <span>8h</span>
            </div>
          </div>
        </div>

        {/* Time preview */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
          <Icons.Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {formatHour(Number(form.startHour))} – {formatHour(Math.min(endHourDisplay, 21))}
            &nbsp;·&nbsp;{form.duration}h
          </span>
        </div>

        {/* Priority (only for study blocks) */}
        {block.type === 'study' && (
          <div>
            <label className="label">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  onClick={() => update('priority', p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                    form.priority === p
                      ? p === 'high'
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : p === 'medium'
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            rows={2}
            placeholder="Optional notes…"
            className="input-field resize-none"
          />
        </div>

        {/* Color swatch */}
        {selectedCourse && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div
              className="w-4 h-4 rounded-full border border-white shadow"
              style={{ backgroundColor: selectedCourse.color }}
            />
            <span>{selectedCourse.code} — {selectedCourse.name}</span>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
            <p className="font-semibold mb-2">Delete this block?</p>
            <p className="text-xs text-red-600 mb-3">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary text-xs py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
          >
            <Icons.Trash className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-ghost text-xs py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`btn-primary text-xs py-2 px-4 min-w-[80px] ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {saved ? (
              <span className="flex items-center gap-1.5">
                <Icons.CheckCircle className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
