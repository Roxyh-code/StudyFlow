import { useState, useMemo } from 'react';
import { Icons } from '../components/Icons';
import { useApp, DEFAULT_PREFERENCES } from '../context/AppContext';
import { applySuggestion, generateSuggestions } from '../utils/aiUtils';
import { buildHeatmapRows } from '../utils/heatmapUtils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function heatColor(hours) {
  if (hours === 0) return { bg: 'bg-gray-100', text: 'text-gray-400' };
  if (hours < 3)   return { bg: 'bg-emerald-200', text: 'text-emerald-800' };
  if (hours < 5)   return { bg: 'bg-amber-300', text: 'text-amber-900' };
  return { bg: 'bg-red-400', text: 'text-white' };
}

// Comprehensive rule-based NL parser (simulates AI extraction)
function parseNaturalPreferences(text) {
  const lower = text.toLowerCase();
  const parsed = {};
  const detected = [];   // rules that were successfully parsed
  const ignored = [];    // fragments that look intentional but weren't understood

  // ── General study time ──
  if (lower.match(/\bmorning\b|早上|上午/)) {
    parsed.preferredStudyTime = 'morning';
    detected.push({ rule: 'Default study time → Morning (7 AM – 12 PM)', field: 'preferredStudyTime' });
  } else if (lower.match(/\bafternoon\b|下午/) && !lower.match(/assignment|project|reading|problem|exam/)) {
    parsed.preferredStudyTime = 'afternoon';
    detected.push({ rule: 'Default study time → Afternoon (12 PM – 5 PM)', field: 'preferredStudyTime' });
  } else if (lower.match(/\bevening\b|\bnight\b|晚上|夜/) && !lower.match(/assignment|project|reading|problem|exam/)) {
    parsed.preferredStudyTime = 'evening';
    detected.push({ rule: 'Default study time → Evening (5 PM – 10 PM)', field: 'preferredStudyTime' });
  }

  // ── Task-type specific time preferences ──
  const TASK_TYPES = [
    { keys: ['assignment', '作业', 'assignments'], id: 'assignment', label: 'Assignments' },
    { keys: ['project', '项目', 'projects'],       id: 'project',    label: 'Projects' },
    { keys: ['reading', '阅读', 'readings'],        id: 'reading',    label: 'Reading' },
    { keys: ['problem set', 'problem_set', 'pset', '习题'], id: 'problem_set', label: 'Problem Sets' },
    { keys: ['exam', '考试', 'exam prep', 'review'],          id: 'exam_prep',  label: 'Exam Prep' },
  ];
  const TIME_WORDS = [
    { keys: ['morning', '早上', '上午'],      value: 'morning',   label: 'morning (7–12)' },
    { keys: ['afternoon', '下午'],            value: 'afternoon', label: 'afternoon (12–17)' },
    { keys: ['evening', 'night', '晚上', '夜'], value: 'evening',   label: 'evening (17–22)' },
  ];

  if (!parsed.taskTypeTime) parsed.taskTypeTime = {};

  for (const task of TASK_TYPES) {
    const taskMentioned = task.keys.some(k => lower.includes(k));
    if (!taskMentioned) continue;
    let matched = false;
    for (const tw of TIME_WORDS) {
      const timeMentioned = tw.keys.some(k => lower.includes(k));
      if (timeMentioned) {
        parsed.taskTypeTime[task.id] = tw.value;
        detected.push({ rule: `${task.label} → ${tw.label}`, field: `taskTypeTime.${task.id}` });
        matched = true;
        break;
      }
    }
    if (!matched) {
      ignored.push(`Mentioned "${task.keys[0]}" but no time slot detected — try adding "in the morning/afternoon/evening"`);
    }
  }

  // ── Avoid weekends ──
  if (lower.match(/avoid weekend|no weekend|weekday only|不.*周末|周末.*不|keep.*weekend.*free/)) {
    parsed.avoidWeekends = true;
    detected.push({ rule: 'Avoid scheduling on weekends', field: 'avoidWeekends' });
  }
  if (lower.match(/include weekend|weekends ok|ok.*weekend/)) {
    parsed.avoidWeekends = false;
    detected.push({ rule: 'Weekends available for study', field: 'avoidWeekends' });
  }

  // ── Max hours ──
  const hoursMatch = lower.match(/(\d+)\s*(?:hours?|h|小时)\s*(?:per|a|\/|每)?\s*day|每天.*?(\d+)\s*(?:hours?|h|小时)/);
  if (hoursMatch) {
    const h = parseInt(hoursMatch[1] || hoursMatch[2]);
    if (!isNaN(h) && h >= 2 && h <= 10) {
      parsed.maxHoursPerDay = h;
      detected.push({ rule: `Max study time → ${h}h per day`, field: 'maxHoursPerDay' });
    }
  }

  // ── Workload style ──
  if (lower.match(/deep focus|focused|long session|深度|专注|block.*time/)) {
    parsed.workloadStyle = 'focused';
    detected.push({ rule: 'Session style → Deep Focus (3h blocks)', field: 'workloadStyle' });
  } else if (lower.match(/finish early|front.?load|ahead|早完成|提前/)) {
    parsed.workloadStyle = 'early';
    detected.push({ rule: 'Session style → Front-load (start ASAP)', field: 'workloadStyle' });
  } else if (lower.match(/balanced|spread|even|均匀/)) {
    parsed.workloadStyle = 'balanced';
    detected.push({ rule: 'Session style → Balanced (evenly spread)', field: 'workloadStyle' });
  }

  return { parsed, detected, ignored };
}

function SuggestionCard({ suggestion, onApply, onPreview, applied, previewing }) {
  const sc = {
    high:   { border: 'border-red-300',   badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
    medium: { border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    low:    { border: 'border-blue-300',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  }[suggestion.severity] || { border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  const typeLabel = { move: 'Move', split: 'Split', spread: 'Spread', rebalance: 'Rebalance' }[suggestion.type] || suggestion.type;
  return (
    <div className={`rounded-xl border-2 p-4 ${sc.border} ${applied ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.badge}`}>{typeLabel}</span>
        {applied && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
            <Icons.CheckCircle className="w-3 h-3" /> Applied
          </span>
        )}
      </div>
      <h4 className="text-sm font-bold text-gray-900 mb-1">{suggestion.title}</h4>
      <p className="text-xs text-gray-600 mb-2 leading-relaxed">{suggestion.description}</p>
      <div className="bg-white rounded-lg px-3 py-2 text-xs border border-gray-100 mb-3">
        <span className="text-gray-400 mr-1">Impact:</span>
        <span className="font-medium text-gray-700">{suggestion.impact}</span>
      </div>
      {!applied && (
        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className={`flex-1 text-xs py-1.5 rounded-lg border font-semibold transition-colors ${
              previewing ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icons.Eye className="w-3 h-3 inline mr-1" />{previewing ? 'Previewing' : 'Preview'}
          </button>
          <button onClick={onApply} className="flex-1 btn-primary text-xs py-1.5">
            <Icons.Zap className="w-3 h-3 inline mr-1" />Apply
          </button>
        </div>
      )}
    </div>
  );
}

export default function HeatmapPage() {
  const {
    blocks, tasks, courses, weekOffset, currentWeekDates,
    applyAISuggestion, studyPreferences, updatePreferences, applyPreferencesAndReschedule,
  } = useApp();

  const [appliedIds, setAppliedIds] = useState(new Set());
  const [previewingId, setPreviewingId] = useState(null);
  const [previewBlocks, setPreviewBlocks] = useState(null);

  // Preferences panel state
  const [localPrefs, setLocalPrefs] = useState(studyPreferences);
  const [prefsChanged, setPrefsChanged] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDone, setRescheduleDone] = useState(false);

  // Natural language input
  const [nlText, setNlText] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResult, setNlResult] = useState(null);

  function updateLocalPref(changes) {
    setLocalPrefs(p => ({ ...p, ...changes }));
    setPrefsChanged(true);
    setRescheduleDone(false);
  }

  function handleSaveAndReschedule() {
    setRescheduling(true);
    // applyPreferencesAndReschedule receives the full new prefs as a parameter,
    // so it never reads a stale studyPreferences closure — both state updates
    // (preferences + blocks) happen atomically in the same call.
    setTimeout(() => {
      applyPreferencesAndReschedule(localPrefs);
      setRescheduling(false);
      setRescheduleDone(true);
      setPrefsChanged(false);
      setTimeout(() => setRescheduleDone(false), 3000);
    }, 50);
  }

  function handleNLParse() {
    if (!nlText.trim()) return;
    setNlParsing(true);
    setNlResult(null);
    setTimeout(() => {
      const { parsed, detected, ignored } = parseNaturalPreferences(nlText);
      setNlResult({ parsed, detected, ignored });
      if (Object.keys(parsed).length > 0) {
        setLocalPrefs(p => ({
          ...p,
          ...parsed,
          taskTypeTime: { ...(p.taskTypeTime || {}), ...(parsed.taskTypeTime || {}) },
        }));
        setPrefsChanged(true);
        setRescheduleDone(false);
      }
      setNlParsing(false);
    }, 900);
  }

  const heatmapRows = useMemo(() => buildHeatmapRows(blocks), [blocks]);
  const previewRows  = useMemo(() => previewBlocks ? buildHeatmapRows(previewBlocks) : null, [previewBlocks]);

  const suggestions = useMemo(
    () => generateSuggestions(blocks, tasks, currentWeekDates),
    [blocks, tasks, currentWeekDates]
  );

  function handleApply(suggestion) {
    applyAISuggestion(suggestion);
    setAppliedIds(prev => new Set([...prev, suggestion.id]));
    if (previewingId === suggestion.id) { setPreviewingId(null); setPreviewBlocks(null); }
  }

  function handlePreview(suggestion) {
    if (previewingId === suggestion.id) {
      setPreviewingId(null); setPreviewBlocks(null);
    } else {
      setPreviewBlocks(applySuggestion(suggestion, blocks));
      setPreviewingId(suggestion.id);
    }
  }

  const courseHours = useMemo(() => {
    const h = {};
    blocks.filter(b => b.type === 'study' && currentWeekDates.includes(b.date))
      .forEach(b => { h[b.courseId] = (h[b.courseId] || 0) + b.duration; });
    return h;
  }, [blocks, currentWeekDates]);

  const displayRows = previewRows || heatmapRows;

  const timeOptions = [
    { id: 'morning',   label: 'Morning',   desc: '7–12',  icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', desc: '12–17', icon: '☀️' },
    { id: 'evening',   label: 'Evening',   desc: '17–22', icon: '🌆' },
    { id: 'balanced',  label: 'Any Time',  desc: 'Flex',  icon: '⚖️' },
  ];
  const styleOptions = [
    { id: 'balanced', label: 'Balanced',   desc: 'Spread evenly' },
    { id: 'focused',  label: 'Deep Focus', desc: '3h sessions' },
    { id: 'early',    label: 'Front-load', desc: 'ASAP, finish early' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Workload Heatmap</h2>
        <p className="text-sm text-gray-500 mt-0.5">Visualize effort distribution and apply AI rebalancing</p>
      </div>

      {suggestions.filter(s => s.severity === 'high' && !appliedIds.has(s.id)).map(s => (
        <div key={s.id} className="flex items-center gap-4 rounded-xl px-5 py-3.5 border bg-red-50 border-red-200">
          <Icons.Alert className="w-5 h-5 flex-shrink-0 text-red-500" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-red-800">{s.title}</span>
            <p className="text-xs text-red-600 mt-0.5">{s.description}</p>
          </div>
        </div>
      ))}

      {previewingId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800 flex items-center gap-3">
          <Icons.Eye className="w-4 h-4 flex-shrink-0 text-indigo-500" />
          <span className="flex-1">Previewing suggestion — heatmap shows proposed changes.</span>
          <button onClick={() => { setPreviewingId(null); setPreviewBlocks(null); }} className="text-xs underline text-indigo-600">Exit preview</button>
        </div>
      )}

      {/* ── Main 2-col layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: heatmap */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">
                Daily Study Hours
                {previewingId && <span className="ml-2 text-xs font-normal text-indigo-600">(Preview)</span>}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                {[['bg-gray-100 border border-gray-200','0h'],['bg-emerald-200','<3h'],['bg-amber-300','3–5h'],['bg-red-400','>5h']].map(([cls,label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3.5 h-3.5 rounded ${cls}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full border-separate" style={{ borderSpacing: '0 4px' }}>
                <thead>
                  <tr>
                    <th className="text-xs text-gray-400 font-medium text-left pr-3 w-16">Week</th>
                    {DAY_LABELS.map(d => <th key={d} className="text-xs font-semibold text-gray-500 text-center">{d}</th>)}
                    <th className="text-xs font-semibold text-gray-500 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="text-xs text-gray-600 font-medium pr-3 whitespace-nowrap align-middle">
                        {row.week}
                        {ri === weekOffset && <span className="ml-1 text-[9px] text-indigo-500 font-bold">←</span>}
                      </td>
                      {row.days.map((h, di) => {
                        const { bg, text } = heatColor(h);
                        return (
                          <td key={di} className="px-0.5">
                            <div
                              className={`${bg} ${text} rounded-lg h-10 flex flex-col items-center justify-center ${ri === weekOffset ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                              title={`${DAY_LABELS[di]}: ${h}h`}
                            >
                              <span className="text-xs font-bold leading-tight">{h > 0 ? (h % 1 === 0 ? h : h.toFixed(1)) : '—'}</span>
                              {h > 0 && <span className="text-[9px] leading-tight opacity-80">hrs</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-0.5">
                        <div className={`rounded-lg h-10 flex items-center justify-center text-xs font-bold ${
                          row.total >= 20 ? 'bg-red-100 text-red-700' :
                          row.total >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {row.total % 1 === 0 ? row.total : row.total.toFixed(1)}h
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Planning Preferences — prominent card below heatmap ── */}
          <div className="card border-2 border-indigo-100">
            <div className="px-5 py-4 border-b border-indigo-100 flex items-center gap-2 bg-indigo-50/50">
              <Icons.Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Planning Preferences</h3>
              <span className="ml-auto text-[10px] text-indigo-500 font-medium">Changes apply when you reschedule</span>
            </div>
            <div className="p-5 space-y-5">

              {/* Preferred study time */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Preferred Study Time</p>
                <div className="grid grid-cols-4 gap-2">
                  {timeOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateLocalPref({ preferredStudyTime: opt.id })}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${
                        localPrefs.preferredStudyTime === opt.id
                          ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300'
                          : 'bg-white border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <p className="text-lg mb-0.5">{opt.icon}</p>
                      <p className={`text-[11px] font-semibold ${localPrefs.preferredStudyTime === opt.id ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-[9px] text-gray-400">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Session style + max hours + avoid weekends in a grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Session Style</p>
                  <div className="space-y-1.5">
                    {styleOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => updateLocalPref({ workloadStyle: opt.id })}
                        className={`w-full p-2.5 rounded-xl border text-left transition-colors ${
                          localPrefs.workloadStyle === opt.id
                            ? 'bg-indigo-50 border-indigo-400'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${localPrefs.workloadStyle === opt.id ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</p>
                          {localPrefs.workloadStyle === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-700">Max hrs / day</p>
                      <span className="text-xs font-bold text-indigo-600">{localPrefs.maxHoursPerDay}h</span>
                    </div>
                    <input
                      type="range" min={2} max={10} step={1}
                      value={localPrefs.maxHoursPerDay}
                      onChange={e => updateLocalPref({ maxHoursPerDay: Number(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400"><span>2h</span><span>10h</span></div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Avoid Weekends</p>
                      <p className="text-[10px] text-gray-400">No Sat/Sun scheduling</p>
                    </div>
                    <button
                      onClick={() => updateLocalPref({ avoidWeekends: !localPrefs.avoidWeekends })}
                      className="relative flex-shrink-0" style={{ height: 22, width: 40 }}
                      role="switch" aria-checked={localPrefs.avoidWeekends}
                    >
                      <div className={`absolute inset-0 rounded-full transition-colors ${localPrefs.avoidWeekends ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${localPrefs.avoidWeekends ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Natural language input */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <p className="text-xs font-semibold text-gray-700">Tell AI your preferences</p>
                  <span className="text-[10px] text-gray-400 ml-1">— type in plain language</span>
                </div>
                <div className="relative">
                  <textarea
                    value={nlText}
                    onChange={e => { setNlText(e.target.value); setNlResult(null); }}
                    rows={3}
                    placeholder={`e.g. "I prefer to study in the morning and avoid weekends. Max 5 hours per day with balanced sessions."\n或中文: "我喜欢早上学习，周末不安排，每天最多6小时"`}
                    className="input-field resize-none text-xs pr-24"
                  />
                  <button
                    onClick={handleNLParse}
                    disabled={!nlText.trim() || nlParsing}
                    className="absolute right-2 bottom-2 btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    {nlParsing ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Parsing
                      </span>
                    ) : 'AI Parse'}
                  </button>
                </div>

                {nlResult && (
                  <div className="mt-2 space-y-2">
                    {nlResult.detected.length > 0 && (
                      <div className="rounded-xl p-3 text-xs bg-green-50 border border-green-200 text-green-800">
                        <p className="font-semibold mb-1.5 flex items-center gap-1">
                          <Icons.CheckCircle className="w-3 h-3" />
                          {nlResult.detected.length} rule{nlResult.detected.length !== 1 ? 's' : ''} detected &amp; applied to controls:
                        </p>
                        <ul className="space-y-0.5">
                          {nlResult.detected.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-green-500 mt-0.5">✓</span>
                              <span>{r.rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {nlResult.ignored.length > 0 && (
                      <div className="rounded-xl p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800">
                        <p className="font-semibold mb-1.5 flex items-center gap-1">
                          <Icons.Alert className="w-3 h-3" />
                          {nlResult.ignored.length} phrase{nlResult.ignored.length !== 1 ? 's' : ''} not fully understood:
                        </p>
                        <ul className="space-y-0.5">
                          {nlResult.ignored.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">⚠</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {nlResult.detected.length === 0 && nlResult.ignored.length === 0 && (
                      <div className="rounded-xl p-3 text-xs bg-gray-50 border border-gray-200 text-gray-600">
                        No preferences detected. Try phrases like:<br />
                        <span className="text-gray-500">"assignments in the afternoon", "morning study", "max 5h per day", "avoid weekends"</span>
                      </div>
                    )}
                    {(nlResult.detected.length > 0 || nlResult.ignored.length > 0) && (
                      <p className="text-[10px] text-gray-400 px-1">
                        Only detected rules update the controls above. Unrecognized phrases are shown but not saved.
                        Click "Save &amp; Reschedule" to apply all current controls to your calendar.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Task-type time preferences summary */}
              {Object.keys(localPrefs.taskTypeTime || {}).length > 0 && (
                <div className="border border-indigo-100 rounded-xl p-3 bg-indigo-50/40">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                    <Icons.Zap className="w-3 h-3" /> Task-type schedules (from AI parse):
                  </p>
                  <div className="space-y-1">
                    {Object.entries(localPrefs.taskTypeTime).map(([type, time]) => {
                      const typeLabel = { assignment: '📝 Assignment', project: '🏗️ Project', reading: '📖 Reading', problem_set: '🔢 Problem Set', exam_prep: '📚 Exam Prep' }[type] || type;
                      const timeLabel = { morning: '🌅 Morning', afternoon: '☀️ Afternoon', evening: '🌆 Evening' }[time] || time;
                      return (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-indigo-700 font-medium">{typeLabel}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-500">{timeLabel}</span>
                            <button
                              onClick={() => {
                                const updated = { ...localPrefs.taskTypeTime };
                                delete updated[type];
                                updateLocalPref({ taskTypeTime: updated });
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Icons.X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save & Reschedule button */}
              <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                <div className="flex-1">
                  {rescheduleDone && (
                    <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <Icons.CheckCircle className="w-3.5 h-3.5" /> Schedule rebuilt with your preferences!
                    </p>
                  )}
                  {prefsChanged && !rescheduleDone && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Icons.Alert className="w-3 h-3" /> Unsaved changes — click to apply to calendar
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSaveAndReschedule}
                  disabled={rescheduling}
                  className={`btn-primary text-xs py-2 px-5 flex items-center gap-2 ${
                    rescheduleDone ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}
                >
                  {rescheduling ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Rescheduling…
                    </>
                  ) : rescheduleDone ? (
                    <><Icons.CheckCircle className="w-3.5 h-3.5" /> Applied!</>
                  ) : (
                    <><Icons.Zap className="w-3.5 h-3.5" /> Save & Reschedule</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: course breakdown + AI suggestions + effort key */}
        <div className="space-y-4">
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">This Week by Course</h3>
            </div>
            <div className="p-4 space-y-3">
              {courses.map(c => {
                const hours = courseHours[c.id] || 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs font-medium text-gray-700">{c.code}</span>
                      </div>
                      <span className="text-xs text-gray-500">{hours % 1 === 0 ? hours : hours.toFixed(1)}h</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((hours / 12) * 100, 100)}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Icons.Zap className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">AI Suggestions</h3>
              {suggestions.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{suggestions.length}</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-4">
                  <Icons.CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">Workload looks balanced!</p>
                  <p className="text-[10px] text-gray-400 mt-1">No suggestions for this week.</p>
                </div>
              ) : (
                suggestions.map(s => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    applied={appliedIds.has(s.id)}
                    previewing={previewingId === s.id}
                    onApply={() => handleApply(s)}
                    onPreview={() => handlePreview(s)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Effort Levels</h3>
            <div className="space-y-2">
              {[
                { label: 'Light',    range: '< 3h / day', color: 'bg-emerald-200', desc: 'Manageable' },
                { label: 'Moderate', range: '3–5h / day', color: 'bg-amber-300',   desc: 'Busy — consider redistributing' },
                { label: 'Heavy',    range: '> 5h / day', color: 'bg-red-400',     desc: 'Overloaded — reschedule now' },
              ].map(({ label, range, color, desc }) => (
                <div key={label} className="flex gap-3 items-start">
                  <div className={`w-5 h-5 rounded-md ${color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label} <span className="font-normal text-gray-500">({range})</span></p>
                    <p className="text-[10px] text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
