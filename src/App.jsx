import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { formatWeekRange } from './utils/dateUtils';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import DeadlinesPage from './pages/DeadlinesPage';
import WorkloadPage from './pages/WorkloadPage';
import SettingsPage from './pages/SettingsPage';
import AddTaskModal from './pages/AddTaskModal';
import AddCourseModal from './pages/AddCourseModal';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AddMenu from './components/AddMenu';
import './index.css';

function AppShell() {
  const [page, setPage] = useState('home');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const { currentWeekStart } = useApp();

  const weekRange = formatWeekRange(currentWeekStart);

  const PAGE_TITLES = {
    home:      { title: 'StudyFlow',  subtitle: 'Your daily overview' },
    calendar:  { title: 'This Week',  subtitle: weekRange },
    deadlines: { title: 'Deadlines',  subtitle: 'All assignments & deadlines' },
    workload:  { title: 'Workload',   subtitle: 'Study hours — next 6 weeks' },
    settings:  { title: 'Settings',   subtitle: 'Courses & preferences' },
  };

  const { title, subtitle } = PAGE_TITLES[page] || { title: page, subtitle: '' };

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
          {page === 'home'      && <HomePage onNavigate={setPage} onAddTask={() => setAddTaskOpen(true)} />}
          {page === 'calendar'  && <CalendarPage onAddTask={() => setAddTaskOpen(true)} />}
          {page === 'deadlines' && <DeadlinesPage onAddTask={() => setAddTaskOpen(true)} />}
          {page === 'workload'  && <WorkloadPage />}
          {page === 'settings'  && <SettingsPage />}
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
