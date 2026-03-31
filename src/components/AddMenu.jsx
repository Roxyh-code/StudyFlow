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
        className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
      >
        <Icons.Plus className="w-4 h-4" />
        New
        <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 w-48">
          <button
            onClick={() => { onAddTask(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            <Icons.CheckSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            Add Task
          </button>
          <button
            onClick={() => { onAddCourse(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <Icons.GraduationCap className="w-4 h-4 text-green-500 flex-shrink-0" />
            Add Course
          </button>
        </div>
      )}
    </div>
  );
}
