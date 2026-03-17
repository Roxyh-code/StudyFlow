import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';

function Section({ title, children }) {
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 transition-colors"
        style={{ height: 22, width: 40 }}
        aria-checked={value}
        role="switch"
      >
        <div
          className={`absolute inset-0 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
        />
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { courses, removeCourse, addCourse, studyPreferences, updatePreferences } = useApp();
  const [prefs, setPrefs] = useState({
    aiPlanning: true,
    workloadAlerts: true,
    deadlineReminders: true,
    focusMode: false,
    weeklyDigest: true,
    syncCalendar: false,
  });
  const [toast, setToast] = useState(false);

  const toggle = (k) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  function handleSave() {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <div className="p-6 space-y-5 animate-in max-w-2xl relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in">
          <Icons.CheckCircle className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Customize StudyFlow to fit your study style</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700">Y</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Yang Liu</p>
            <p className="text-xs text-gray-500">yang.liu@mail.utoronto.ca</p>
            <p className="text-xs text-gray-400 mt-0.5">UTORid: liuyang1</p>
          </div>
          <button className="btn-secondary text-xs">Edit Profile</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Display Name</label>
            <input type="text" defaultValue="Yang Liu" className="input-field text-sm" />
          </div>
          <div>
            <label className="label">Academic Year</label>
            <select className="select-field text-sm" defaultValue="3rd">
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>
        </div>
      </Section>

      {/* AI Planning Preferences */}
      <Section title="AI Planning">
        <div className="mb-4">
          <label className="label">Default Study Strategy</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { id: 'balanced', label: 'Balanced',     desc: 'Even distribution' },
              { id: 'focused',  label: 'Focused',      desc: 'Long sessions' },
              { id: 'early',    label: 'Early Finish', desc: 'Front-loaded' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => updatePreferences({ workloadStyle: s.id })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  studyPreferences.workloadStyle === s.id
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-xs font-semibold ${studyPreferences.workloadStyle === s.id ? 'text-indigo-700' : 'text-gray-700'}`}>{s.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          <Toggle label="AI Auto-Planning" desc="Automatically schedule study blocks when adding tasks" value={prefs.aiPlanning} onChange={() => toggle('aiPlanning')} />
          <Toggle label="Workload Alerts" desc="Get notified when a week looks overloaded" value={prefs.workloadAlerts} onChange={() => toggle('workloadAlerts')} />
          <Toggle label="Focus Mode" desc="Show only high-priority tasks when overloaded" value={prefs.focusMode} onChange={() => toggle('focusMode')} />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="divide-y divide-gray-50">
          <Toggle label="Deadline Reminders" desc="Notify 24h and 1h before deadlines" value={prefs.deadlineReminders} onChange={() => toggle('deadlineReminders')} />
          <Toggle label="Weekly Digest" desc="Sunday summary of upcoming week's workload" value={prefs.weeklyDigest} onChange={() => toggle('weeklyDigest')} />
          <Toggle label="Sync with Google Calendar" desc="Two-way sync study blocks to your calendar" value={prefs.syncCalendar} onChange={() => toggle('syncCalendar')} />
        </div>
      </Section>

      {/* Courses */}
      <Section title="My Courses">
        <div className="space-y-2 mb-4">
          {courses.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{c.code}</p>
                <p className="text-xs text-gray-400 truncate">{c.name}</p>
              </div>
              <button onClick={() => removeCourse(c.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Icons.Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => {}} className="btn-secondary text-xs w-full py-2">
          <Icons.Plus className="w-3.5 h-3.5" /> Add Course
        </button>
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary text-xs">Discard</button>
        <button onClick={handleSave} className="btn-primary text-xs">
          <Icons.CheckCircle className="w-3.5 h-3.5" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
