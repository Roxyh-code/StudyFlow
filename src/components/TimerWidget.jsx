import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';

function formatDuration(hours) {
  const totalSeconds = Math.floor(Math.max(0, hours) * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TimerWidget({ taskId, plannedHours }) {
  const { timers, startTimer, pauseTimer, stopTimer } = useApp();
  const timer = timers[taskId] || { elapsed: 0, isRunning: false, startedAt: null };
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timer.isRunning) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning]);

  const currentElapsed = timer.isRunning
    ? timer.elapsed + (Date.now() - timer.startedAt) / 3600000
    : timer.elapsed;

  const planned = Number(plannedHours) || 0;
  const percent = planned > 0 ? Math.min((currentElapsed / planned) * 100, 100) : 0;
  const overTime = planned > 0 && currentElapsed > planned;
  const hasTime = currentElapsed > 0.001;

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icons.Timer className="w-4 h-4 text-indigo-500" />
        <p className="text-xs font-semibold text-gray-700">Time Tracker</p>
        {timer.isRunning && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
        {!timer.isRunning && hasTime && (
          <span className="ml-auto text-[10px] text-gray-400">Paused</span>
        )}
      </div>

      <div className="text-center py-1">
        <div className={`text-3xl font-mono font-bold tracking-tight ${
          overTime ? 'text-red-600' : timer.isRunning ? 'text-indigo-600' : 'text-gray-800'
        }`}>
          {formatDuration(currentElapsed)}
        </div>
        {planned > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            of {planned}h planned
            {overTime && (
              <span className="text-red-500 font-semibold ml-1">
                (+{formatDuration(currentElapsed - planned)} over)
              </span>
            )}
          </p>
        )}
      </div>

      {planned > 0 && (
        <div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${overTime ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>0</span>
            <span className={overTime ? 'text-red-500 font-semibold' : ''}>{Math.round(percent)}%</span>
            <span>{planned}h</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!timer.isRunning ? (
          <button
            onClick={() => startTimer(taskId)}
            className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <Icons.Play className="w-3.5 h-3.5" />
            {hasTime ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button
            onClick={() => pauseTimer(taskId)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <Icons.Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        )}
        {hasTime && (
          <button
            onClick={() => stopTimer(taskId)}
            className="py-2 px-3 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <Icons.Square className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {hasTime && !timer.isRunning && planned > 0 && (
        <div className={`rounded-lg px-3 py-2 text-xs ${
          overTime ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
        }`}>
          {overTime
            ? `Went ${formatDuration(currentElapsed - planned)} over planned time`
            : `Finished ${formatDuration(planned - currentElapsed)} under planned time`
          }
        </div>
      )}
    </div>
  );
}
