import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildHeatmapRows } from '../utils/heatmapUtils';
import { Icons } from '../components/Icons';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY = '2026-03-22';

function heatColor(hours, max) {
  if (hours === 0) return { bg: 'bg-gray-100', text: 'text-gray-300' };
  const ratio = Math.min(hours / Math.max(max, 1), 1);
  if (ratio < 0.25) return { bg: 'bg-indigo-100', text: 'text-indigo-400' };
  if (ratio < 0.5)  return { bg: 'bg-indigo-200', text: 'text-indigo-500' };
  if (ratio < 0.75) return { bg: 'bg-indigo-400', text: 'text-white' };
  return { bg: 'bg-indigo-600', text: 'text-white' };
}

export default function WorkloadPage() {
  const { blocks, studyPreferences, applyPreferencesAndReschedule } = useApp();
  const maxPerDay = studyPreferences.maxHoursPerDay || 6;

  const [balancing, setBalancing] = useState(false);
  const [result, setResult] = useState(null); // { fixed, total }

  const rows = useMemo(() => buildHeatmapRows(blocks, 6), [blocks]);

  const globalMax = useMemo(() => {
    const all = rows.flatMap(r => r.days);
    return Math.max(...all, 1);
  }, [rows]);

  const overloadedDays = useMemo(() =>
    rows.flatMap(r => r.days).filter(h => h > maxPerDay).length,
  [rows, maxPerDay]);

  function handleBalance() {
    const before = rows.flatMap(r => r.days).filter(h => h > maxPerDay).length;
    setBalancing(true);
    setResult(null);
    setTimeout(() => {
      applyPreferencesAndReschedule(studyPreferences);
      setBalancing(false);
      setResult({ fixed: before, total: blocks.filter(b => b.type === 'study').length });
    }, 1400);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-in">

      {/* AI Balance card */}
      <div className={`rounded-2xl border p-5 flex items-center gap-5 transition-all ${
        overloadedDays > 0
          ? 'bg-red-50 border-red-200'
          : 'bg-indigo-50 border-indigo-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          overloadedDays > 0 ? 'bg-red-100' : 'bg-indigo-100'
        }`}>
          <Icons.Zap className={`w-5 h-5 ${overloadedDays > 0 ? 'text-red-500' : 'text-indigo-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          {result ? (
            <>
              <p className="text-sm font-bold text-green-800">Schedule balanced</p>
              <p className="text-xs text-green-600 mt-0.5">
                {result.fixed > 0
                  ? `Resolved ${result.fixed} overloaded day${result.fixed > 1 ? 's' : ''} · ${result.total} study blocks redistributed`
                  : `${result.total} study blocks are already evenly spread`}
              </p>
            </>
          ) : overloadedDays > 0 ? (
            <>
              <p className="text-sm font-bold text-red-800">
                {overloadedDays} day{overloadedDays > 1 ? 's' : ''} over your {maxPerDay}h daily limit
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                AI will redistribute the excess to lighter days
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-indigo-800">Your schedule looks balanced</p>
              <p className="text-xs text-indigo-500 mt-0.5">
                No days exceed your {maxPerDay}h limit · run again anytime after adding deadlines
              </p>
            </>
          )}
        </div>
        <button
          onClick={handleBalance}
          disabled={balancing}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            balancing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : overloadedDays > 0
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}
        >
          {balancing ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Balancing…
            </>
          ) : (
            <>
              <Icons.Zap className="w-4 h-4" />
              {result ? 'Re-balance' : 'Auto-Balance'}
            </>
          )}
        </button>
      </div>

      {/* Heatmap grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 mb-2">
          <div />
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {rows.map((row) => {
            const isCurrentWeek = TODAY >= row.weekDates[0] && TODAY <= row.weekDates[6];
            return (
              <div key={row.monday} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1.5 items-center">
                <div className={`text-[11px] font-semibold pr-2 text-right ${isCurrentWeek ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {row.week}
                  {isCurrentWeek && (
                    <span className="ml-1 text-[9px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded">Now</span>
                  )}
                </div>
                {row.days.map((hours, i) => {
                  const { bg, text } = heatColor(hours, globalMax);
                  const overLimit = hours > maxPerDay;
                  return (
                    <div
                      key={i}
                      title={`${hours.toFixed(1)}h`}
                      className={`rounded-lg h-10 flex items-center justify-center ${bg} ${
                        overLimit ? 'ring-2 ring-red-400 ring-offset-1' : ''
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${text}`}>
                        {hours > 0 ? (hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`) : ''}
                      </span>
                    </div>
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
            <span className="text-[11px] text-gray-400">Over {maxPerDay}h limit</span>
          </div>
        </div>
      </div>

      {/* Per-week bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Weekly Total</h3>
        <div className="space-y-3">
          {rows.map((row) => {
            const isCurrentWeek = TODAY >= row.weekDates[0] && TODAY <= row.weekDates[6];
            const weekMax = maxPerDay * 5;
            const pct = Math.min(100, (row.total / weekMax) * 100);
            const overloaded = row.total > weekMax;
            return (
              <div key={row.monday} className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold w-16 text-right ${isCurrentWeek ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {row.week}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overloaded ? 'bg-red-400' : isCurrentWeek ? 'bg-indigo-500' : 'bg-indigo-300'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold w-12 ${overloaded ? 'text-red-500' : 'text-gray-500'}`}>
                  {row.total.toFixed(1)}h
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">
          Recommended max: {maxPerDay * 5}h/week ({maxPerDay}h/day × 5 days)
        </p>
      </div>
    </div>
  );
}
