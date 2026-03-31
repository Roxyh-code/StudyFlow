import { useMemo, useState } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { buildHeatmapRows } from '../utils/heatmapUtils';
import { getBestSuggestion } from '../utils/aiUtils';

const TODAY = new Date().toISOString().split('T')[0];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysUntil(dateStr) {
  if (!dateStr) return 999;
  return Math.ceil(
    (new Date(dateStr + 'T00:00:00Z') - new Date(TODAY + 'T00:00:00Z')) / 86400000
  );
}

function formatHour(h) {
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

function heatColor(hours, max) {
  if (hours === 0) return 'bg-gray-100';
  const ratio = Math.min(hours / Math.max(max, 1), 1);
  if (ratio < 0.25) return 'bg-indigo-100';
  if (ratio < 0.5)  return 'bg-indigo-200';
  if (ratio < 0.75) return 'bg-indigo-400';
  return 'bg-indigo-600';
}

// ── Today Panel ──────────────────────────────────────────────────────────────
function TodayPanel({ onNavigate }) {
  const { blocks, tasks, courses } = useApp();

  const todayBlocks = useMemo(() =>
    blocks.filter(b => b.date === TODAY).sort((a, b) => a.startHour - b.startHour),
  [blocks]);

  const todayDue = useMemo(() =>
    tasks.filter(t => t.dueDate === TODAY && t.status !== 'completed'),
  [tasks]);

  const totalStudyHours = todayBlocks
    .filter(b => b.type === 'study')
    .reduce((s, b) => s + b.duration, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Today</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(TODAY + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
          {totalStudyHours.toFixed(1)}h study
        </span>
      </div>

      {todayDue.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {todayDue.map(t => {
            const course = courses.find(c => c.id === t.courseId);
            return (
              <div key={t.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <Icons.Alert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-red-800 truncate">{t.title}</p>
                  <p className="text-[10px] text-red-500">{course?.code} · Due today</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {todayBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Icons.CheckCircle className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-xs font-medium text-gray-600">Nothing scheduled today</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Enjoy the free time or add a task</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todayBlocks.slice(0, 5).map(block => {
            const course = courses.find(c => c.id === block.courseId);
            const isLecture = block.type === 'lecture';
            const dotColor = course?.color || '#6366f1';
            return (
              <div
                key={block.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                style={{ backgroundColor: `${dotColor}11`, borderColor: `${dotColor}33` }}
              >
                <div className="flex flex-col items-center flex-shrink-0 w-10 text-center">
                  <span className="text-[10px] font-bold" style={{ color: dotColor }}>
                    {formatHour(block.startHour).replace(':00', '')}
                  </span>
                  <span className="text-[9px] text-gray-400">{block.duration}h</span>
                </div>
                <div className="w-px h-8 rounded-full flex-shrink-0" style={{ backgroundColor: `${dotColor}66` }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{block.title}</p>
                  <p className="text-[10px] text-gray-500">{course?.code} · {isLecture ? 'Lecture' : (block.source === 'ai' ? 'AI Study' : 'Study')}</p>
                </div>
                {block.source === 'ai' && !isLecture && (
                  <Icons.Sparkle className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
          {todayBlocks.length > 5 && (
            <p className="text-[10px] text-gray-400 text-center">+{todayBlocks.length - 5} more</p>
          )}
        </div>
      )}

      <button
        onClick={() => onNavigate('calendar')}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 pt-1"
      >
        Open calendar <Icons.ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Upcoming Risks Panel ─────────────────────────────────────────────────────
function UpcomingRisksPanel({ onNavigate }) {
  const { tasks, courses, blocks, studyPreferences } = useApp();
  const maxPerDay = studyPreferences.maxHoursPerDay || 6;

  const riskTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (t.status === 'completed') return false;
        const d = daysUntil(t.dueDate);
        return d <= 7; // includes overdue (d < 0) AND upcoming within 7 days
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);

  // Find overloaded days in the next 7 days
  const overloadedDays = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(TODAY + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const hours = blocks
        .filter(b => b.date === dateStr && b.type === 'study')
        .reduce((s, b) => s + b.duration, 0);
      if (hours > maxPerDay) {
        result.push({ date: dateStr, hours, daysAway: i });
      }
    }
    return result;
  }, [blocks, maxPerDay]);

  const hasRisks = riskTasks.length > 0 || overloadedDays.length > 0;

  if (!hasRisks) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-gray-900">Upcoming Risks</h2>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Icons.CheckCircle className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-xs font-medium text-gray-600">No overdue or upcoming deadlines</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Upcoming Risks</h2>
        {(() => {
          const overdueCount = riskTasks.filter(t => daysUntil(t.dueDate) < 0).length;
          const total = riskTasks.length + overloadedDays.length;
          return overdueCount > 0 ? (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {overdueCount} overdue · {total - overdueCount} upcoming
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {total} alert{total !== 1 ? 's' : ''}
            </span>
          );
        })()}
      </div>

      <div className="flex flex-col gap-2">
        {riskTasks.slice(0, 5).map(t => {
          const course = courses.find(c => c.id === t.courseId);
          const d = daysUntil(t.dueDate);
          const isOverdue = d < 0;
          const urgent = d <= 1;
          const rowStyle = isOverdue
            ? 'bg-red-50 border-red-300'
            : urgent ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200';
          const badgeStyle = isOverdue
            ? 'bg-red-600 text-white'
            : urgent ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700';
          const badgeLabel = isOverdue
            ? `${Math.abs(d)}d overdue`
            : d === 0 ? 'Due today'
            : d === 1 ? 'Tomorrow'
            : `${d}d left`;
          return (
            <div key={t.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${rowStyle}`}>
              <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: course?.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{t.title}</p>
                <p className="text-[10px] text-gray-500">{course?.code}{t.dueDate ? ` · due ${t.dueDate}` : ''}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 whitespace-nowrap ${badgeStyle}`}>
                {badgeLabel}
              </span>
            </div>
          );
        })}

        {overloadedDays.slice(0, Math.max(0, 5 - riskTasks.slice(0, 5).length)).map(({ date, hours, daysAway }) => (
          <div key={date} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border bg-orange-50 border-orange-200">
            <Icons.Alert className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800">
                {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : date} overloaded
              </p>
              <p className="text-[10px] text-orange-600">{hours.toFixed(1)}h study — over {maxPerDay}h limit</p>
            </div>
            <button
              onClick={() => onNavigate('workload')}
              className="text-[10px] font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 px-2 py-0.5 rounded-lg transition-colors"
            >
              Fix
            </button>
          </div>
        ))}
        {riskTasks.length + overloadedDays.length > 5 && (
          <p className="text-[10px] text-gray-400 text-center">+{riskTasks.length + overloadedDays.length - 5} more</p>
        )}
      </div>
    </div>
  );
}

// ── Next Best Action Panel ───────────────────────────────────────────────────
function NextBestActionPanel() {
  const { blocks, tasks, currentWeekDates, applyAISuggestion, replanAIBlocks } = useApp();
  const [applied, setApplied] = useState(false);
  const [replanning, setReplanning] = useState(false);

  const suggestion = useMemo(
    () => getBestSuggestion(blocks, tasks, currentWeekDates),
    [blocks, tasks, currentWeekDates]
  );

  function handleApply() {
    if (!suggestion) return;
    applyAISuggestion(suggestion);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  }

  function handleReplan() {
    setReplanning(true);
    setTimeout(() => {
      replanAIBlocks();
      setReplanning(false);
    }, 1200);
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Icons.Sparkle className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Next Best Action</h2>
          <p className="text-[10px] text-indigo-500">AI recommendation</p>
        </div>
      </div>

      {applied ? (
        <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
          <Icons.CheckCircle className="w-8 h-8 text-green-500" />
          <p className="text-sm font-semibold text-green-700">Applied!</p>
        </div>
      ) : suggestion ? (
        <>
          <div className="bg-white rounded-xl border border-indigo-100 p-3.5">
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                suggestion.severity === 'high' ? 'bg-red-100 text-red-600' :
                suggestion.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {suggestion.severity?.toUpperCase()}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-800">{suggestion.title}</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{suggestion.description}</p>
                <p className="text-[10px] font-medium text-indigo-600 mt-1.5">{suggestion.impact}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleApply}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Icons.Zap className="w-3.5 h-3.5" /> Apply This
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center gap-1">
          <Icons.CheckCircle className="w-8 h-8 text-green-400 mb-1" />
          <p className="text-xs font-medium text-gray-600">Schedule looks great!</p>
          <p className="text-[10px] text-gray-400">No suggestions needed this week</p>
        </div>
      )}

      <div className="border-t border-indigo-100 pt-3">
        <button
          onClick={handleReplan}
          disabled={replanning}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
        >
          {replanning ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Replanning…
            </>
          ) : (
            <>
              <Icons.RefreshCw className="w-3.5 h-3.5" />
              Replan AI blocks (keep manual)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Workload Overview Panel ──────────────────────────────────────────────────
function WorkloadOverviewPanel({ onNavigate }) {
  const { blocks, studyPreferences } = useApp();
  const maxPerDay = studyPreferences.maxHoursPerDay || 6;
  const rows = useMemo(() => buildHeatmapRows(blocks, 3), [blocks]);
  const globalMax = useMemo(() => Math.max(...rows.flatMap(r => r.days), 1), [rows]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Workload Overview</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Next 3 weeks</p>
        </div>
        <button
          onClick={() => onNavigate('workload')}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          Full view <Icons.ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Day header */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] gap-1">
          <div />
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[9px] font-bold text-gray-400 uppercase">{d}</div>
          ))}
        </div>

        {rows.map(row => {
          const isCurrent = TODAY >= row.weekDates[0] && TODAY <= row.weekDates[6];
          return (
            <div key={row.monday} className="grid grid-cols-[56px_repeat(7,1fr)] gap-1 items-center">
              <span className={`text-[10px] font-semibold text-right pr-1 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`}>
                {row.week}
              </span>
              {row.days.map((hours, i) => {
                const overLimit = hours > maxPerDay;
                return (
                  <div
                    key={i}
                    title={`${hours.toFixed(1)}h`}
                    className={`h-7 rounded-md flex items-center justify-center ${heatColor(hours, globalMax)} ${
                      overLimit ? 'ring-2 ring-red-400' : ''
                    }`}
                  >
                    <span className={`text-[9px] font-bold ${hours > globalMax * 0.5 ? 'text-white' : 'text-gray-500'}`}>
                      {hours > 0 ? `${hours % 1 === 0 ? hours : hours.toFixed(1)}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">Less</span>
        {['bg-gray-100', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600'].map(c => (
          <div key={c} className={`w-4 h-4 rounded ${c}`} />
        ))}
        <span className="text-[10px] text-gray-400">More</span>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-4 h-4 rounded ring-2 ring-red-400 bg-indigo-400" />
          <span className="text-[10px] text-gray-400">Over limit</span>
        </div>
      </div>
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage({ onNavigate, onAddTask }) {
  const { tasks, courses } = useApp();
  const activeCount = tasks.filter(t => t.status !== 'completed').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && daysUntil(t.dueDate) < 0).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5 animate-in">
      {/* Page intro */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })()}, Yang</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeCount} active assignment{activeCount !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="text-red-500 font-semibold"> · {overdueCount} overdue</span>}
          </p>
        </div>
      </div>

      {/* 2-column grid: Today + Upcoming Risks */}
      <div className="grid grid-cols-2 gap-5">
        <TodayPanel onNavigate={onNavigate} />
        <UpcomingRisksPanel onNavigate={onNavigate} />
      </div>

      {/* 2-column grid: Next Best Action + Workload */}
      <div className="grid grid-cols-2 gap-5">
        <NextBestActionPanel />
        <WorkloadOverviewPanel onNavigate={onNavigate} />
      </div>
    </div>
  );
}
