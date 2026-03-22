import { useState } from 'react';
import { Icons } from '../components/Icons';
import { courses, HOURS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { formatWeekRange } from '../utils/dateUtils';
import EventEditModal from '../components/EventEditModal';
import TaskCompletionModal from '../components/TaskCompletionModal';

const CELL_HEIGHT = 56;
const START_HOUR = 7;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCourse(id) { return courses.find(c => c.id === id); }

function MiniMonth({ year, month, highlightedDates }) {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div className="card p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700">{MONTH_NAMES[month]} {year}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-gray-400 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isDue = highlightedDates.includes(dateStr);
          const isToday = dateStr === '2026-03-16';
          return (
            <div key={i} className={`text-[10px] rounded-full w-5 h-5 mx-auto flex items-center justify-center font-medium ${isToday ? 'bg-indigo-600 text-white' : isDue ? 'bg-amber-200 text-amber-800' : 'text-gray-700'}`}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBlock({ block, onEdit, onMarkStatus }) {
  const course = getCourse(block.courseId);
  const isLecture = block.type === 'lecture';
  const top = (block.startHour - START_HOUR) * CELL_HEIGHT;
  const height = Math.max(block.duration * CELL_HEIGHT - 3, 20);
  const { updateBlock } = useApp();

  function startResize(e) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startDuration = block.duration;
    const onMove = (ev) => {
      const delta = (ev.clientY - startY) / CELL_HEIGHT;
      const newDur = Math.max(0.5, Math.round((startDuration + delta) * 2) / 2);
      updateBlock(block.id, { duration: newDur });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const dotColor = isLecture ? (course?.color || '#6366f1') : (block.color || '#16a34a');
  const bgColor = isLecture
    ? `${course?.color || '#6366f1'}22`
    : block.color ? `${block.color}22` : '#dcfce7';
  const borderColor = isLecture
    ? `${course?.color || '#6366f1'}66`
    : block.color ? `${block.color}66` : '#86efac';

  function handleDragStart(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.dataTransfer.setData('blockId', block.id);
    e.dataTransfer.setData('offsetY', String(e.clientY - rect.top));
    e.currentTarget.style.opacity = '0.4';
  }
  function handleDragEnd(e) { e.currentTarget.style.opacity = '1'; }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit(block)}
      className="absolute rounded-md px-1.5 py-1 text-left overflow-hidden border shadow-sm hover:brightness-95 cursor-pointer select-none"
      style={{
        top: `${top + 1}px`,
        height: `${height}px`,
        left: '2px',
        right: '2px',
        backgroundColor: bgColor,
        borderColor,
        zIndex: 10,
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-[9px] font-bold uppercase tracking-wide truncate" style={{ color: dotColor }}>
          {isLecture ? 'Lecture' : 'Study'}
        </span>
      </div>
      <p className="text-[10px] font-semibold text-gray-800 leading-tight truncate">{block.title}</p>
      {height > 40 && (
        <p className="text-[9px] text-gray-500 mt-0.5">
          {block.startHour}:00 – {Number(block.startHour) + Number(block.duration)}:00 · {block.duration}h
        </p>
      )}
      {!isLecture && (
        <button
          onClick={e => { e.stopPropagation(); onMarkStatus(block); }}
          title="Mark status"
          className="absolute flex items-center gap-0.5 font-semibold hover:opacity-100 transition-all"
          style={{
            bottom: height > 32 ? '5px' : '2px',
            right: '4px',
            backgroundColor: `${dotColor}22`,
            border: `1px solid ${dotColor}66`,
            borderRadius: '4px',
            padding: height > 44 ? '2px 5px' : '1px 3px',
            color: dotColor,
            fontSize: height > 44 ? '9px' : '8px',
            zIndex: 25,
            lineHeight: 1.4,
          }}
        >
          {height > 44 ? '✓ Status' : '✓'}
        </button>
      )}
      <div
        onMouseDown={startResize}
        onClick={e => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-center justify-center"
        style={{ zIndex: 20 }}
      >
        <div className="w-6 h-0.5 rounded-full opacity-30" style={{ backgroundColor: dotColor }} />
      </div>
    </div>
  );
}

function DayColumn({ date, isToday, blocks, onEdit, onMarkStatus }) {
  const { updateBlock } = useApp();

  function handleDragOver(e) { e.preventDefault(); }

  function handleDrop(e) {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('blockId');
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY') || '0');
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top - offsetY;
    const newHour = Math.max(START_HOUR, Math.min(21, Math.round(relY / CELL_HEIGHT) + START_HOUR));
    updateBlock(blockId, { date, startHour: newHour });
  }

  return (
    <div
      className={`flex-1 relative border-r border-gray-100 last:border-0 ${isToday ? 'bg-indigo-50/20' : ''}`}
      style={{ height: HOURS.length * CELL_HEIGHT }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {blocks.map(block => (
        <EventBlock key={block.id} block={block} onEdit={onEdit} onMarkStatus={onMarkStatus} />
      ))}
    </div>
  );
}

export default function CalendarPage({ onAddTask }) {
  const { blocks, tasks, weekOffset, setWeekOffset, currentWeekStart, currentWeekDates, studyPreferences, applyPreferencesAndReschedule } = useApp();
  const [editingBlock, setEditingBlock] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [completionBlock, setCompletionBlock] = useState(null);
  const [completionOpen, setCompletionOpen] = useState(false);

  const weekBlocks = blocks.filter(b => currentWeekDates.includes(b.date));
  const blocksByDate = {};
  currentWeekDates.forEach(d => { blocksByDate[d] = []; });
  weekBlocks.forEach(b => { if (blocksByDate[b.date]) blocksByDate[b.date].push(b); });

  const weekRange = formatWeekRange(currentWeekStart);
  const allDueDates = tasks.map(t => t.dueDate).filter(Boolean);

  function handleBlockEdit(block) {
    setEditingBlock(block);
    setEditModalOpen(true);
  }
  function handleMarkStatus(block) {
    setCompletionBlock(block);
    setCompletionOpen(true);
  }

  const upcomingDue = tasks
    .filter(t => t.status !== 'completed' && currentWeekDates.includes(t.dueDate))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const weekYear = parseInt(currentWeekStart.split('-')[0]);
  const weekMonth = parseInt(currentWeekStart.split('-')[1]) - 1;

  return (
    <div className="flex h-full animate-in">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-4 space-y-4 overflow-y-auto">
        <MiniMonth year={weekYear} month={weekMonth} highlightedDates={allDueDates} />

        <div className="card p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-300 flex-shrink-0" />
              <span className="text-xs text-gray-600">Lecture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 flex-shrink-0" />
              <span className="text-xs text-gray-600">Study Block</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300 flex-shrink-0" />
              <span className="text-xs text-gray-600">Due Date</span>
            </div>
          </div>
        </div>

        <div className="card p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2.5">Due This Week</p>
          {upcomingDue.length === 0 ? (
            <p className="text-xs text-gray-400">Nothing due this week</p>
          ) : (
            <div className="space-y-2">
              {upcomingDue.slice(0, 5).map(t => {
                const c = getCourse(t.courseId);
                const daysLeft = Math.ceil((new Date(t.dueDate) - new Date(currentWeekStart)) / 86400000);
                return (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: c?.color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-800 truncate">{t.title}</p>
                      <p className={`text-[10px] ${daysLeft <= 2 ? 'text-red-500' : 'text-gray-400'}`}>
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d`} · {t.dueDate}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Max hours/day control */}
        <div className="card p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Daily Limit</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="2"
              max="12"
              step="1"
              value={studyPreferences.maxHoursPerDay}
              onChange={e => applyPreferencesAndReschedule({ maxHoursPerDay: Number(e.target.value) })}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-sm font-bold text-indigo-600 w-10 text-right">
              {studyPreferences.maxHoursPerDay}h
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Max study hours per day</p>
        </div>

      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
          >
            <Icons.ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-sm font-semibold text-gray-800">{weekRange}</span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="btn-ghost text-xs py-1.5 flex items-center gap-1"
          >
            Next <Icons.ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
              <div className="w-[52px] flex-shrink-0 py-2 px-2 text-[10px] text-gray-400 font-medium border-r border-gray-100">
                Time
              </div>
              {currentWeekDates.map((date, i) => {
                const isToday = date === '2026-03-16';
                const dayNum = parseInt(date.split('-')[2]);
                return (
                  <div
                    key={date}
                    className={`flex-1 py-2 px-2 text-center border-r border-gray-100 last:border-0 ${isToday ? 'bg-indigo-50' : ''}`}
                  >
                    <div className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {DAY_LABELS[i]}
                    </div>
                    <div className={`text-base font-bold ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {dayNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex">
              {/* Time labels */}
              <div className="w-[52px] flex-shrink-0 border-r border-gray-100">
                {HOURS.map(hour => (
                  <div
                    key={hour}
                    className="flex items-start pt-1 px-1 border-b border-gray-100"
                    style={{ height: CELL_HEIGHT }}
                  >
                    <span className="text-[10px] text-gray-400 font-medium">
                      {hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {currentWeekDates.map((date, i) => (
                <DayColumn
                  key={date}
                  date={date}
                  isToday={date === '2026-03-16'}
                  blocks={blocksByDate[date] || []}
                  onEdit={handleBlockEdit}
                  onMarkStatus={handleMarkStatus}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <EventEditModal
        block={editingBlock}
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingBlock(null); }}
      />
      <TaskCompletionModal
        block={completionBlock}
        open={completionOpen}
        onClose={() => { setCompletionOpen(false); setCompletionBlock(null); }}
      />
    </div>
  );
}
