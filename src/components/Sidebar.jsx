import { Icons } from './Icons';
import { useApp } from '../context/AppContext';

const navItems = [
  { id: 'home',       label: 'Home',       Icon: Icons.Home },
  { id: 'calendar',   label: 'This Week',  Icon: Icons.Calendar },
  { id: 'workload',   label: 'Workload',   Icon: Icons.BarChart },
  { id: 'deadlines',  label: 'Deadlines',  Icon: Icons.CheckSquare },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { courses } = useApp();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col z-30 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icons.Logo className="w-8 h-8 flex-shrink-0" />
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">StudyFlow</div>
          <div className="text-xs text-gray-400">Smart Planner</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Menu</p>
        {navItems.map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-600' : ''}`} />
              {label}
            </button>
          );
        })}

        {/* Courses section */}
        <div className="pt-5">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Courses</p>
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-gray-600 group-hover:text-gray-900 truncate">{c.code}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom: Settings + User */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activePage === 'settings'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
        >
          <Icons.Settings className="w-3.5 h-3.5 flex-shrink-0" />
          Settings
        </button>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">Y</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">Yang Liu</div>
            <div className="text-[10px] text-gray-400">yang.liu@mail.utoronto.ca</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
