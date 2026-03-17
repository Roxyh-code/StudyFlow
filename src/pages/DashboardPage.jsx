import { useMemo } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { buildHeatmapRows } from '../utils/heatmapUtils';

const priorityColor = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
};

const HEAT_BG = ['bg-gray-100', 'bg-emerald-200', 'bg-amber-300', 'bg-red-400'];
const HEAT_TEXT = ['text-gray-400', 'text-emerald-800', 'text-amber-900', 'text-white'];
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TODAY = '2026-03-16';

function heatLevel(h) { return h === 0 ? 0 : h < 3 ? 1 : h < 5 ? 2 : 3; }

function MiniHeatmap({ rows, weekOffset }) {
  return (
    <div>
      <div className="grid grid-cols-8 gap-0.5 mb-1">
        <div />
        {DAYS_SHORT.map((d, i) => (
          <div key={i} className="text-[10px] text-center font-medium text-gray-400">{d}</div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-8 gap-0.5 mb-0.5">
          <div className="text-[10px] text-gray-400 flex items-center truncate pr-0.5">
            {row.week.split(' ')[1]}
          </div>
          {row.days.map((h, di) => {
            const lv = heatLevel(h);
            const isCurrentWeek = ri === weekOffset;
            return (
              <div
                key={di}
                className={`${HEAT_BG[lv]} ${HEAT_TEXT[lv]} rounded text-[9px] font-semibold flex items-center justify-center h-6 ${isCurrentWeek ? 'ring-1 ring-indigo-400' : ''}`}
              >
                {h > 0 ? `${h}` : '—'}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-3 mt-2 justify-end flex-wrap">
        {[['bg-emerald-200','<3h'],['bg-amber-300','3–5h'],['bg-red-400','>5h']].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {badge && <span className="text-[10px] font-semibold text-indigo-600 mb-0.5">{badge}</span>}
      </div>
      {onClick && (
        <p className="text-[10px] text-indigo-500 mt-1 flex items-center gap-0.5">
          View details <Icons.ArrowRight className="w-2.5 h-2.5" />
        </p>
      )}
    </button>
  );
}

export default function DashboardPage({ onNavigate, onAddTask }) {
  const { tasks, blocks, courses, currentWeekDates, weekOffset } = useApp();

  const upcomingAssignments = tasks
    .filter(a => a.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const totalStudyHoursThisWeek = blocks
    .filter(b => b.type === 'study' && currentWeekDates.includes(b.date))
    .reduce((s, b) => s + Number(b.duration), 0);

  const overdueCount = tasks.filter(a =>
    new Date(a.dueDate) < new Date(TODAY) && a.status !== 'completed'
  ).length;

  const activeTasks = tasks.filter(a => a.status === 'in-progress').length;

  // Live heatmap data — same source as full heatmap page
  const heatmapRows = useMemo(() => buildHeatmapRows(blocks, 4), [blocks]);

  const stats = [
    {
      label: 'Active Courses',
      value: courses.length,
      icon: Icons.BookOpen,
      color: 'bg-indigo-50 text-indigo-600',
      onClick: () => onNavigate('tasks', { courseFilter: 'all' }),
      badge: 'courses',
    },
    {
      label: 'Active Tasks',
      value: activeTasks,
      icon: Icons.CheckSquare,
      color: 'bg-blue-50 text-blue-600',
      onClick: () => onNavigate('tasks', { statusFilter: 'in-progress' }),
    },
    {
      label: 'Study Hrs / Week',
      value: `${totalStudyHoursThisWeek % 1 === 0 ? totalStudyHoursThisWeek : totalStudyHoursThisWeek.toFixed(1)}h`,
      icon: Icons.Clock,
      color: 'bg-amber-50 text-amber-600',
      onClick: () => onNavigate('heatmap'),
    },
    {
      label: 'Overdue',
      value: overdueCount,
      icon: Icons.Alert,
      color: overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400',
      onClick: overdueCount > 0 ? () => onNavigate('tasks', { statusFilter: 'overdue' }) : undefined,
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Good afternoon, Yang</h2>
        <p className="text-sm text-gray-500 mt-0.5">Here's your study overview for this week.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon, color, onClick, badge }) => (
          <StatCard key={label} label={label} value={value} icon={icon} color={color} onClick={onClick} badge={badge} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming assignments */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Upcoming Assignments</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-indigo-600 hover:underline font-medium">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingAssignments.map(a => {
              const course = courses.find(c => c.id === a.courseId);
              const daysLeft = Math.ceil((new Date(a.dueDate) - new Date(TODAY)) / 86400000);
              return (
                <button
                  key={a.id}
                  onClick={() => onNavigate('tasks', { selectedTask: a.id })}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course?.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityColor[a.priority]}`}>{a.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{course?.code}</span>
                      <span className="flex items-center gap-1"><Icons.Clock className="w-3 h-3" />{a.estimatedHours}h estimated</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-semibold ${daysLeft <= 1 ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {daysLeft <= 0 ? 'Overdue' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Due {a.dueDate}</p>
                  </div>
                </button>
              );
            })}
            {upcomingAssignments.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-gray-400">No upcoming assignments</div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* My Courses — clickable */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">My Courses</h3>
              <span className="text-xs text-gray-400">{courses.length} active</span>
            </div>
            <div className="p-4 space-y-2.5">
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => onNavigate('tasks', { courseFilter: c.id })}
                  className="flex items-center gap-2.5 w-full text-left hover:bg-gray-50 rounded-lg px-1 py-0.5 transition-colors group"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-700">{c.code}</p>
                    <p className="text-[10px] text-gray-400 truncate">{c.name}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {tasks.filter(a => a.courseId === c.id && a.status !== 'completed').length} tasks
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Live workload heatmap — same data source as full page */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Workload Heatmap</h3>
              <button onClick={() => onNavigate('heatmap')} className="text-xs text-indigo-600 hover:underline">Full view</button>
            </div>
            <div className="p-4">
              <MiniHeatmap rows={heatmapRows} weekOffset={weekOffset} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icons.Alert className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">Workload Alert — This week is peak</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You have 3 assignments due before Friday. StudyFlow suggests starting CSC373 Asgn 3 today to stay on track.
          </p>
        </div>
        <button
          onClick={() => onNavigate('calendar')}
          className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0 border-amber-200 text-amber-700 hover:bg-amber-100 flex items-center gap-1"
        >
          View Plan <Icons.ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
