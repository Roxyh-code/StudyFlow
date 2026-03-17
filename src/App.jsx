import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { formatWeekRange } from './utils/dateUtils';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import HeatmapPage from './pages/HeatmapPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import AddTaskModal from './pages/AddTaskModal';
import AddCourseModal from './pages/AddCourseModal';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AddMenu from './components/AddMenu';
import './index.css';

function AppShell() {
  const [page, setPage] = useState('dashboard');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  // taskFilter allows dashboard cards to navigate to tasks with a pre-set filter
  const [taskFilter, setTaskFilter] = useState(null);
  const { currentWeekStart } = useApp();

  const weekRange = formatWeekRange(currentWeekStart);

  const PAGE_TITLES = {
    dashboard: { title: 'Dashboard',         subtitle: 'Monday, March 16, 2026' },
    calendar:  { title: 'Weekly Calendar',   subtitle: weekRange },
    heatmap:   { title: 'Workload Heatmap',  subtitle: 'Semester overview' },
    tasks:     { title: 'My Tasks',          subtitle: 'All assignments & deadlines' },
    settings:  { title: 'Settings',          subtitle: 'Preferences & account' },
  };

  const { title, subtitle } = PAGE_TITLES[page] || { title: page, subtitle: '' };

  function navigateTo(targetPage, filter = null) {
    setPage(targetPage);
    if (filter) setTaskFilter(filter);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col" style={{ marginLeft: '224px' }}>
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={
            <AddMenu
              onAddTask={() => setAddTaskOpen(true)}
              onAddCourse={() => setAddCourseOpen(true)}
            />
          }
        />
        <main
          className={`flex-1 ${page === 'calendar' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}
          style={page === 'calendar' ? { height: 'calc(100vh - 57px)' } : {}}
        >
          {page === 'dashboard' && (
            <DashboardPage
              onNavigate={navigateTo}
              onAddTask={() => setAddTaskOpen(true)}
            />
          )}
          {page === 'calendar' && <CalendarPage onAddTask={() => setAddTaskOpen(true)} />}
          {page === 'heatmap'  && <HeatmapPage />}
          {page === 'tasks'    && (
            <TasksPage
              onAddTask={() => setAddTaskOpen(true)}
              initialFilter={taskFilter}
              onFilterConsumed={() => setTaskFilter(null)}
            />
          )}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>

      <AddTaskModal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
      <AddCourseModal open={addCourseOpen} onClose={() => setAddCourseOpen(false)} />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
