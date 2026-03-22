import { Icons } from './Icons';

export default function Topbar({ title, subtitle, actions }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-base font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <Icons.Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
