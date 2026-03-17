import { useState, useRef } from 'react';
import Modal from '../components/Modal';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899',
  '#10b981', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#ef4444', '#64748b', '#a16207',
];

// Simulated AI syllabus extraction results (prototype demo)
const SYLLABUS_SAMPLES = [
  { code: 'CSC418', name: 'Computer Graphics', lectureSchedule: 'Mon 13:00–14:00, Wed 13:00–14:00', color: '#8b5cf6' },
  { code: 'ECE361', name: 'Computer Networks I', lectureSchedule: 'Tue 11:00–12:00, Thu 11:00–12:00', color: '#0ea5e9' },
  { code: 'STA302', name: 'Methods of Data Analysis', lectureSchedule: 'Mon 10:00–11:00, Fri 10:00–11:00', color: '#10b981' },
  { code: 'PSY100', name: 'Introductory Psychology', lectureSchedule: 'Wed 14:00–16:00', color: '#ec4899' },
];

export default function AddCourseModal({ open, onClose }) {
  const { addCourse } = useApp();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ code: '', name: '', color: '#6366f1', lectureSchedule: '' });
  const [saved, setSaved] = useState(false);
  const [syllabusParsing, setSyllabusParsing] = useState(false);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [parsedFields, setParsedFields] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.code.trim().length > 0 && form.name.trim().length > 0;

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.PDF')) {
      alert('Please upload a PDF file.');
      return;
    }
    setSyllabusFile(file);
    setSyllabusParsing(true);
    setParsedFields(null);

    // Simulate AI parsing delay
    setTimeout(() => {
      const sample = SYLLABUS_SAMPLES[Math.floor(Math.random() * SYLLABUS_SAMPLES.length)];
      setParsedFields(sample);
      setSyllabusParsing(false);
      // Auto-fill the form
      setForm(f => ({
        ...f,
        code: sample.code,
        name: sample.name,
        color: sample.color,
        lectureSchedule: sample.lectureSchedule,
      }));
    }, 1800);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  function handleSave() {
    if (!valid) return;
    addCourse({
      id: `course-${form.code.toLowerCase().replace(/\W+/g, '-')}-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      color: form.color,
      lectures: form.lectureSchedule
        ? form.lectureSchedule.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setForm({ code: '', name: '', color: '#6366f1', lectureSchedule: '' });
      setSyllabusFile(null);
      setParsedFields(null);
      onClose();
    }, 900);
  }

  function handleClose() {
    setForm({ code: '', name: '', color: '#6366f1', lectureSchedule: '' });
    setSyllabusFile(null);
    setParsedFields(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add New Course" size="md">
      <div className="space-y-4">

        {/* Syllabus Upload */}
        <div>
          <label className="label">Upload Syllabus <span className="text-gray-400 font-normal">(optional — AI auto-fills details)</span></label>
          <div
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50' :
              syllabusFile ? 'border-green-300 bg-green-50' :
              'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !syllabusParsing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files[0])}
            />
            {syllabusParsing ? (
              <>
                <svg className="animate-spin w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-sm font-semibold text-indigo-700">AI is reading your syllabus…</p>
                <p className="text-xs text-indigo-500">Extracting course code, name, and schedule</p>
              </>
            ) : syllabusFile ? (
              <>
                <Icons.CheckCircle className="w-7 h-7 text-green-500" />
                <p className="text-sm font-semibold text-green-700">{syllabusFile.name}</p>
                <p className="text-xs text-green-600">Details auto-filled below — review and adjust</p>
                <button
                  onClick={e => { e.stopPropagation(); setSyllabusFile(null); setParsedFields(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 underline"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <Icons.Upload className="w-7 h-7 text-gray-300" />
                <p className="text-sm text-gray-500">Drop syllabus PDF here or click to browse</p>
                <p className="text-xs text-gray-400">AI will extract course code, name, and lecture schedule</p>
              </>
            )}
          </div>

          {/* Parsed result banner */}
          {parsedFields && (
            <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <Icons.Zap className="w-3 h-3" /> AI extracted:
              </p>
              <ul className="space-y-0.5 text-indigo-600">
                <li>• Course code: <strong>{parsedFields.code}</strong></li>
                <li>• Name: <strong>{parsedFields.name}</strong></li>
                <li>• Schedule: <strong>{parsedFields.lectureSchedule}</strong></li>
              </ul>
              <p className="text-[10px] text-indigo-400 mt-1">Fields auto-filled — edit below if needed.</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Manual fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Course Code *</label>
            <input
              type="text"
              placeholder="e.g. CSC400"
              value={form.code}
              onChange={e => update('code', e.target.value.toUpperCase())}
              className="input-field uppercase"
              maxLength={10}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => update('color', c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.color === c ? 'border-gray-800 scale-110' : 'border-white shadow'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Course Name *</label>
          <input
            type="text"
            placeholder="e.g. Introduction to Machine Learning"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Lecture Schedule <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="text"
            placeholder="Mon 10:00–11:00, Thu 13:00–14:00"
            value={form.lectureSchedule}
            onChange={e => update('lectureSchedule', e.target.value)}
            className="input-field"
          />
          <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
        </div>

        {(form.code || form.name) && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: form.color }}
            >
              {(form.code || '??').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{form.code || 'CODE'}</p>
              <p className="text-xs text-gray-500 truncate">{form.name || 'Course name'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={handleClose} className="btn-ghost text-xs py-2 flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className={`btn-primary text-xs py-2 flex-1 disabled:opacity-40 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {saved ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Icons.CheckCircle className="w-3.5 h-3.5" /> Created!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 justify-center">
                <Icons.GraduationCap className="w-3.5 h-3.5" /> Add Course
              </span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
