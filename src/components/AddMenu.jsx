import { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';

export default function AddMenu({ onAddTask, onAddCourse }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
      >
        <Icons.Plus className="w-3.5 h-3.5" />
        New
        <Icons.ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 min-w-[180px] animate-in">
          <button
            onClick={() => { onAddTask(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Icons.CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Add Task</p>
              <p className="text-[10px] text-gray-400 font-normal">Assignment or deadline</p>
            </div>
          </button>
          <div className="mx-3 my-1 border-t border-gray-100" />
          <button
            onClick={() => { onAddCourse(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Icons.GraduationCap className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Add Course</p>
              <p className="text-[10px] text-gray-400 font-normal">New class or subject</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
