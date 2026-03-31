import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { buildHeatmapRows } from '../utils/heatmapUtils';
import { parseNLConstraints } from '../utils/aiUtils';
import { Icons } from '../components/Icons';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY = '2026-03-22';

function dayAbbr(dateStr) {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  return DAY_LABELS[dow === 0 ? 6 : dow - 1];
}

function heatColor(hours, max) {
  if (hours === 0) return { bg: 'bg-gray-100', text: 'text-gray-300' };
  const ratio = Math.min(hours / Math.max(max, 1), 1);
  if (ratio < 0.25) return { bg: 'bg-indigo-100', text: 'text-indigo-400' };
  if (ratio < 0.5)  return { bg: 'bg-indigo-200', text: 'text-indigo-500' };
  if (ratio < 0.75) return { bg: 'bg-indigo-400', text: 'text-white' };
  return { bg: 'bg-indigo-600', text: 'text-white' };
}

// ── Before/After Chart ────────────────────────────────────────────────────────
function BeforeAfterChart({ result, maxPerDay }) {
  const { hoursBeforeByDay, hoursAfterByDay, workDates } = result;
  const activeDates = workDates.filter(d => hoursBeforeByDay[d] > 0 || hoursAfterByDay[d] > 0);
  const globalMax = Math.max(...activeDates.flatMap(d => [hoursBeforeByDay[d], hoursAfterByDay[d]]), maxPerDay, 1);

  return (
    <div className="space-y-2.5">
      {activeDates.map(date => {
        const before = hoursBeforeByDay[date] || 0;
        const after  = hoursAfterByDay[date]  || 0;
        const delta  = after - before;
        const changed = Math.abs(delta) > 0.05;
        const label  = dayAbbr(date);
        const beforePct = `${(before / globalMax) * 100}%`;
        const afterPct  = `${(after  / globalMax) * 100}%`;

        return (
          <div key={date} className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-400 w-7 flex-shrink-0">{label}</span>
            <div className="flex-1 flex flex-col gap-1">
              {/* Before row */}
              <div className="flex items-center gap-2">
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${before > maxPerDay ? 'bg-red-400' : 'bg-gray-300'}`}
                    style={{ width: beforePct }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-8 flex-shrink-0 text-right">{before.toFixed(1)}h</span>
              </div>
              {/* After row */}
              <div className="flex items-center gap-2">
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${after > maxPerDay ? 'bg-red-400' : 'bg-indigo-400'}`}
                    style={{ width: afterPct }}
                  />
                </div>
                <span className="text-[10px] text-indigo-600 font-semibold w-8 flex-shrink-0 text-right">{after.toFixed(1)}h</span>
              </div>
            </div>
            <div className="w-14 text-right flex-shrink-0">
              {changed ? (
                <span className={`text-[11px] font-bold ${delta < 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {delta < 0 ? `↓ ${(-delta).toFixed(1)}h` : `↑ ${delta.toFixed(1)}h`}
                </span>
              ) : (
                <span className="text-[10px] text-gray-300">no change</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-5 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 bg-gray-300 rounded-full" />
          <span className="text-[10px] text-gray-400">Before</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 bg-indigo-400 rounded-full" />
          <span className="text-[10px] text-gray-400">After</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-2 bg-red-400 rounded-full" />
          <span className="text-[10px] text-gray-400">Over limit</span>
        </div>
      </div>
    </div>
  );
}

// ── Changes Summary ───────────────────────────────────────────────────────────
function ChangesSummary({ result }) {
  const { moveLog, unchangedLog } = result;
  if (moveLog.length === 0 && unchangedLog.length === 0) return null;

  return (
    <div className="space-y-3">
      {moveLog.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Moved blocks</p>
          <div className="space-y-1.5">
            {moveLog.map((m, i) => (
              <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <Icons.CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-gray-700 flex-1 truncate">{m.title}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{m.hours}h</span>
                <span className="text-[11px] text-gray-500 flex-shrink-0">{dayAbbr(m.from)}</span>
                <Icons.ArrowRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span className="text-[11px] font-bold text-green-700 flex-shrink-0">{dayAbbr(m.to)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {unchangedLog.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Could not move</p>
          <div className="space-y-1.5">
            {unchangedLog.map((u, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                <Icons.Alert className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-600 truncate">
                    {u.title || `${dayAbbr(u.date)} (${u.hours?.toFixed(1)}h)`}
                  </p>
                  <p className="text-[10px] text-gray-400">{u.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 pt-1">
        Lectures and manual study blocks were not moved.
      </p>
    </div>
  );
}

// ── Optimization Summary ──────────────────────────────────────────────────────
function OptimizationSummary({ result, maxPerDay }) {
  const { peakBefore, peakAfter, overloadBefore, overloadAfter, deadlinesAffected, improved } = result;
  const items = [
    {
      label: 'Peak workload',
      before: `${peakBefore.toFixed(1)}h`,
      after: `${peakAfter.toFixed(1)}h`,
      good: peakAfter < peakBefore,
      same: Math.abs(peakAfter - peakBefore) < 0.1,
    },
    {
      label: 'Overloaded days',
      before: overloadBefore,
      after: overloadAfter,
      good: overloadAfter < overloadBefore,
      same: overloadAfter === overloadBefore,
    },
    {
      label: 'Deadlines affected',
      before: null,
      after: deadlinesAffected,
      good: deadlinesAffected === 0,
      same: false,
      override: deadlinesAffected === 0 ? '✓ None' : `⚠ ${deadlinesAffected}`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className={`rounded-xl border p-3 flex flex-col gap-1 ${
          item.good ? 'bg-green-50 border-green-100' :
          item.same ? 'bg-gray-50 border-gray-100' :
          'bg-amber-50 border-amber-100'
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
          {item.override ? (
            <p className={`text-sm font-bold ${item.good ? 'text-green-700' : 'text-amber-700'}`}>
              {item.override}
            </p>
          ) : item.before !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-gray-400 line-through">{item.before}</span>
              <Icons.ArrowRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
              <span className={`text-sm font-bold ${item.good ? 'text-green-700' : item.same ? 'text-gray-500' : 'text-amber-700'}`}>
                {item.after}
              </span>
            </div>
          ) : (
            <p className="text-sm font-bold text-green-700">{item.after}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Advanced Settings Panel ───────────────────────────────────────────────────
function AdvancedSettingsPanel({ strategy, setStrategy, preferredTime, setPreferredTime, nlText, setNLText }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
      <p className="text-xs font-bold text-gray-600">Advanced Settings</p>

      {/* Strategy */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Strategy</label>
        <div className="flex gap-2">
          {[
            { value: 'minimize_overload', label: 'Reduce peak', desc: 'Focus on fixing overloaded days' },
            { value: 'even_distribution', label: 'Spread evenly', desc: 'Distribute hours as evenly as possible' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStrategy(s.value)}
              className={`flex-1 text-left px-3 py-2.5 rounded-xl border text-[11px] transition-colors ${
                strategy === s.value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              <p className="font-semibold">{s.label}</p>
              <p className={`mt-0.5 ${strategy === s.value ? 'text-indigo-200' : 'text-gray-400'}`}>{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred time */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">Preferred study time</label>
        <div className="flex gap-2">
          {['morning', 'afternoon', 'evening'].map(t => (
            <button
              key={t}
              onClick={() => setPreferredTime(t === preferredTime ? '' : t)}
              className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold capitalize transition-colors ${
                preferredTime === t
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* NL input */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
          Describe your preference
        </label>
        <textarea
          value={nlText}
          onChange={e => setNLText(e.target.value)}
          placeholder={'e.g. "Prefer mornings, keep weekends light, spread evenly"'}
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-gray-700 placeholder-gray-300"
        />
        {nlText.trim() && (() => {
          const parsed = parseNLConstraints(nlText);
          const keys = Object.keys(parsed);
          if (keys.length === 0) return null;
          return (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {keys.map(k => (
                <span key={k} className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {k}: {String(parsed[k])}
                </span>
              ))}
            </div>
          );
        })()}
        <p className="text-[10px] text-gray-400 mt-1">Keywords like "afternoon", "avoid weekends", "spread evenly" are auto-parsed.</p>
      </div>
    </div>
  );
}

// ── Rebalance Preview Modal ───────────────────────────────────────────────────
function RebalancePreviewModal({ result, maxPerDay, onApply, onCancel, onTryAnother, onPreviewWithHigherLimit, advancedOpen, setAdvancedOpen, strategy, setStrategy, preferredTime, setPreferredTime, nlText, setNLText }) {
  const { improved, reason } = result;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Icons.RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Rebalance Preview</p>
              <p className="text-[11px] text-gray-400">
                This adjusts your current schedule without changing your rules
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* No improvement case */}
          {!improved ? (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Icons.CheckCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-700">No improvement found</p>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">{reason}</p>
            </div>
          ) : (
            <>
              {/* Optimization summary */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-3">Optimization Result</p>
                <OptimizationSummary result={result} maxPerDay={maxPerDay} />
              </div>

              {/* Before / After chart */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-3">Before vs After</p>
                <BeforeAfterChart result={result} maxPerDay={maxPerDay} />
              </div>

              {/* Changes summary */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-3">Changes</p>
                <ChangesSummary result={result} />
              </div>
            </>
          )}

          {/* Advanced Settings (collapsed) */}
          <div>
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <Icons.Sliders className="w-3.5 h-3.5" />
              {advancedOpen ? 'Hide' : 'Customize'} settings
              <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen && (
              <div className="mt-3">
                <AdvancedSettingsPanel
                  strategy={strategy}
                  setStrategy={setStrategy}
                  preferredTime={preferredTime}
                  setPreferredTime={setPreferredTime}
                  nlText={nlText}
                  setNLText={setNLText}
                />
              </div>
            )}
          </div>

          {/* Daily limit hint */}
          {result.peakBefore > maxPerDay && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2 mb-3">
                <Icons.Alert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Daily limit is restricting optimization</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Your {maxPerDay}h limit prevents blocks from moving freely. Try previewing with a higher limit or keep current settings.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPreviewWithHigherLimit}
                  className="flex-1 text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  Preview with {maxPerDay + 1}h limit
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 text-[11px] font-semibold py-1.5 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors"
                >
                  Keep {maxPerDay}h limit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 px-6 py-4 border-t border-gray-100">
          {!improved && reason && (
            <p className="text-[11px] text-gray-400 text-center">{reason}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary text-sm py-2 px-5"
            >
              Cancel
            </button>
            <button
              onClick={onTryAnother}
              className="flex items-center gap-1.5 btn-secondary text-sm py-2 px-4"
            >
              <Icons.RefreshCw className="w-3.5 h-3.5" />
              Try Another
            </button>
            <button
              onClick={onApply}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 px-5 rounded-xl transition-colors ${
                improved
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-500'
              }`}
            >
              <Icons.CheckCircle className="w-4 h-4" />
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Day Detail Popover ────────────────────────────────────────────────────────
function DayDetailPopover({ date, blocks, tasks, maxPerDay, onClose, onRebalanceClick }) {
  const studyBlocks = blocks.filter(b => b.date === date && b.type === 'study');
  const lectureBlocks = blocks.filter(b => b.date === date && b.type === 'lecture');
  const studyHours = studyBlocks.reduce((s, b) => s + b.duration, 0);
  const isOverloaded = studyHours > maxPerDay;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-5 w-80 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{date} · {dayAbbr(date)}</p>
            <p className={`text-xs font-semibold mt-0.5 ${isOverloaded ? 'text-red-500' : 'text-gray-400'}`}>
              {studyHours.toFixed(1)}h study
              {isOverloaded && ` — ${(studyHours - maxPerDay).toFixed(1)}h over ${maxPerDay}h limit`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X className="w-4 h-4" />
          </button>
        </div>

        {isOverloaded && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
            <Icons.Alert className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700">
              Study workload exceeds your {maxPerDay}h daily limit. Lectures are excluded from this count.
            </p>
          </div>
        )}

        {lectureBlocks.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Lectures (excluded from limit)</p>
            {lectureBlocks.map(b => (
              <div key={b.id} className="flex items-center gap-2 text-[11px] py-1">
                <div className="w-2 h-2 rounded-full bg-indigo-300" />
                <span className="text-gray-500 flex-1">{b.title}</span>
                <span className="text-gray-400">{b.startHour}:00 · {b.duration}h</span>
              </div>
            ))}
          </div>
        )}

        {studyBlocks.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Study Blocks</p>
            {studyBlocks.map(b => {
              const task = b.assignmentId ? tasks.find(t => t.id === b.assignmentId) : null;
              return (
                <div key={b.id} className="flex items-start gap-2 text-[11px] py-1.5 border-b border-gray-50 last:border-0">
                  <Icons.Sparkle className={`w-2.5 h-2.5 mt-0.5 flex-shrink-0 ${b.source === 'ai' ? 'text-indigo-400' : 'text-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{b.title}</p>
                    {task?.dueDate && <p className="text-[10px] text-gray-400">Due {task.dueDate}</p>}
                    <p className="text-[10px] text-gray-400">{b.source === 'ai' ? 'AI scheduled' : 'Manual'}</p>
                  </div>
                  <span className="text-gray-400 flex-shrink-0">{b.duration}h</span>
                </div>
              );
            })}
          </div>
        )}

        {studyBlocks.length === 0 && lectureBlocks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No blocks this day</p>
        )}

        {isOverloaded && (
          <button
            onClick={() => { onRebalanceClick(); onClose(); }}
            className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Icons.RefreshCw className="w-3.5 h-3.5" /> Preview Rebalance
          </button>
        )}
      </div>
    </div>
  );
}

// Variation cycles for Try Another
const TRY_VARIATIONS = [
  { pickSmallest: true,  strategyFlip: false },
  { pickSmallest: false, strategyFlip: true  },
  { pickSmallest: true,  strategyFlip: true  },
  { pickSmallest: false, strategyFlip: false },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkloadPage() {
  const { blocks, tasks, studyPreferences, previewRebalance, applyRebalanceResult } = useApp();
  const maxPerDay = studyPreferences.maxHoursPerDay || 6;

  // Preview modal state
  const [previewResult, setPreviewResult] = useState(null);
  const [previewOpen, setPreviewOpen]   = useState(false);
  const [tryAnotherCount, setTryAnotherCount] = useState(0);
  const [toast, setToast] = useState(null);

  // Advanced settings state (lives here, passed into modal)
  const [advancedOpen, setAdvancedOpen]     = useState(false);
  const [strategy, setStrategy]             = useState('minimize_overload');
  const [preferredTime, setPreferredTime]   = useState('');
  const [nlText, setNLText]                 = useState('');

  // Day detail
  const [selectedDay, setSelectedDay] = useState(null);

  const rows = useMemo(() => buildHeatmapRows(blocks, 6), [blocks]);
  const globalMax = useMemo(() => Math.max(...rows.flatMap(r => r.days), 1), [rows]);
  const overloadedDays = useMemo(() =>
    rows.flatMap(r => r.days).filter(h => h > maxPerDay).length,
  [rows, maxPerDay]);

  function buildNLConstraints(limitOverride) {
    const nlConstraints = parseNLConstraints(nlText);
    if (preferredTime) nlConstraints.preferredStudyTime = preferredTime;
    if (limitOverride != null) nlConstraints.maxHoursPerDay = limitOverride;
    return nlConstraints;
  }

  function handleOpenPreview() {
    // If no day is over the limit, switch to even_distribution automatically
    // so the user sees a useful rebalance even when the schedule is "within limit"
    const effectiveStrategy = overloadedDays > 0 ? strategy : 'even_distribution';
    const result = previewRebalance({ strategy: effectiveStrategy, pickSmallest: false, nlConstraints: buildNLConstraints() });
    setPreviewResult(result);
    setTryAnotherCount(0);
    setPreviewOpen(true);
  }

  function handleTryAnother() {
    const v = TRY_VARIATIONS[tryAnotherCount % TRY_VARIATIONS.length];
    const variantStrategy = v.strategyFlip
      ? (strategy === 'minimize_overload' ? 'even_distribution' : 'minimize_overload')
      : strategy;
    const result = previewRebalance({ strategy: variantStrategy, pickSmallest: v.pickSmallest, nlConstraints: buildNLConstraints() });
    setPreviewResult(result);
    setTryAnotherCount(c => c + 1);
  }

  function handlePreviewWithHigherLimit() {
    const result = previewRebalance({ strategy, pickSmallest: false, nlConstraints: buildNLConstraints(maxPerDay + 1) });
    setPreviewResult(result);
  }

  function handleApply() {
    if (previewResult?.improved) {
      applyRebalanceResult(previewResult.blocks);
      const count = previewResult.moveLog.length;
      setToast(`${count} block${count !== 1 ? 's' : ''} moved — schedule improved`);
      setTimeout(() => setToast(null), 3000);
    }
    setPreviewOpen(false);
  }

  // Auto-refresh preview when advanced settings change (while modal is open)
  useEffect(() => {
    if (!previewOpen) return;
    const result = previewRebalance({ strategy, pickSmallest: false, nlConstraints: buildNLConstraints() });
    setPreviewResult(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy, preferredTime, nlText]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-in">

      {/* Status + Rebalance trigger */}
      <div className={`rounded-2xl border p-5 flex items-center gap-5 ${
        overloadedDays > 0 ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          overloadedDays > 0 ? 'bg-red-100' : 'bg-indigo-100'
        }`}>
          <Icons.Zap className={`w-5 h-5 ${overloadedDays > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          {overloadedDays > 0 ? (
            <>
              <p className="text-sm font-bold text-red-800">
                {overloadedDays} day{overloadedDays > 1 ? 's' : ''} over your {maxPerDay}h study limit
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                Rebalance moves AI study blocks to lighter days — preview changes before applying
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-indigo-800">Schedule looks balanced</p>
              <p className="text-xs text-indigo-400 mt-0.5">
                No days exceed your {maxPerDay}h limit · run again after adding new tasks
              </p>
            </>
          )}
        </div>
        <button
          onClick={handleOpenPreview}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            overloadedDays > 0
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Icons.RefreshCw className="w-4 h-4" />
          Rebalance
        </button>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Study Workload Heatmap</h3>
          <p className="text-[11px] text-gray-400">Click any day to see breakdown</p>
        </div>
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 mb-2">
          <div />
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>
        <div className="space-y-1.5">
          {rows.map(row => {
            const isCurrentWeek = TODAY >= row.weekDates[0] && TODAY <= row.weekDates[6];
            return (
              <div key={row.monday} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 items-center">
                <div className={`text-[11px] font-semibold pr-2 text-right ${isCurrentWeek ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {row.week}
                  {isCurrentWeek && <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded">Now</span>}
                </div>
                {row.days.map((hours, i) => {
                  const { bg, text } = heatColor(hours, globalMax);
                  const overLimit = hours > maxPerDay;
                  const date = row.weekDates[i];
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(selectedDay === date ? null : date)}
                      title={`${hours.toFixed(1)}h — click for details`}
                      className={`rounded-lg h-10 flex items-center justify-center transition-all hover:scale-105 hover:shadow-md ${bg} ${overLimit ? 'ring-2 ring-red-400 ring-offset-1' : ''} ${selectedDay === date ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                    >
                      <span className={`text-[11px] font-bold ${text}`}>
                        {hours > 0 ? (hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`) : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">Less</span>
          {['bg-gray-100', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600'].map(c => (
            <div key={c} className={`w-5 h-5 rounded ${c}`} />
          ))}
          <span className="text-[11px] text-gray-400">More</span>
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-5 h-5 rounded ring-2 ring-red-400 bg-indigo-400" />
            <span className="text-[11px] text-gray-400">Over {maxPerDay}h study limit</span>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Weekly Total (study only)</h3>
        <div className="space-y-3">
          {rows.map(row => {
            const isCurrentWeek = TODAY >= row.weekDates[0] && TODAY <= row.weekDates[6];
            const weekMax = maxPerDay * 5;
            const pct = Math.min(100, (row.total / weekMax) * 100);
            const overloaded = row.total > weekMax;
            return (
              <div key={row.monday} className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold w-16 text-right ${isCurrentWeek ? 'text-indigo-600' : 'text-gray-400'}`}>{row.week}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${overloaded ? 'bg-red-400' : isCurrentWeek ? 'bg-indigo-500' : 'bg-indigo-300'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold w-12 ${overloaded ? 'text-red-500' : 'text-gray-500'}`}>{row.total.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">
          Recommended max: {maxPerDay * 5}h/week ({maxPerDay}h/day × 5 days) · lectures excluded
        </p>
      </div>

      {/* Day detail popover */}
      {selectedDay && (
        <DayDetailPopover
          date={selectedDay}
          blocks={blocks}
          tasks={tasks}
          maxPerDay={maxPerDay}
          onClose={() => setSelectedDay(null)}
          onRebalanceClick={handleOpenPreview}
        />
      )}

      {/* Rebalance Preview Modal */}
      {previewOpen && previewResult && (
        <RebalancePreviewModal
          result={previewResult}
          maxPerDay={maxPerDay}
          onApply={handleApply}
          onCancel={() => setPreviewOpen(false)}
          onTryAnother={handleTryAnother}
          onPreviewWithHigherLimit={handlePreviewWithHigherLimit}
          advancedOpen={advancedOpen}
          setAdvancedOpen={setAdvancedOpen}
          strategy={strategy}
          setStrategy={setStrategy}
          preferredTime={preferredTime}
          setPreferredTime={setPreferredTime}
          nlText={nlText}
          setNLText={setNLText}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in">
          <Icons.CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
