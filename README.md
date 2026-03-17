# StudyFlow

An intelligent adaptive workload planning system built for university students. StudyFlow goes beyond a simple calendar — it automatically schedules study sessions around existing commitments, respects personal preferences, tracks real work time, and helps rebalance when life gets busy.

---

## Features

### Smart Auto-Scheduling
- Places study blocks in **free time slots** — never overlaps existing events
- Enforces a **daily hour limit** (e.g. max 6h/day) — excess hours spill forward to the next available day automatically
- Splits sessions when a day's quota is already full

### Workload Heatmap & AI Suggestions
- Semester-level heatmap showing daily study load across all weeks
- AI-generated suggestions to rebalance overloaded days (move, split, spread)
- Preview changes before applying — see before/after on the heatmap
- Dashboard mini-heatmap stays in sync with the full heatmap page

### Planning Preferences
- Set preferred study time: Morning / Afternoon / Evening / Flexible
- Configure session style: Balanced / Deep Focus / Front-load
- **Per task-type scheduling**: e.g. "Assignments in the afternoon, Projects in the evening"
- **Natural language input**: type preferences in plain English or Chinese — AI parses them into scheduling rules
- **Save & Reschedule**: one click rebuilds your entire calendar with the new preferences

### Task Management
- Multi-state tracking: Not Started → In Progress → Completed
- Focus Mode to surface only high-priority tasks
- Filter by course, status (including Overdue tab with badge), sort by due date / priority / hours
- Overdue highlighting with red left-border

### Built-in Time Tracker
- Start / Pause / Stop timer on any task
- Live progress bar vs planned hours with over-time detection
- Tracked time shown in task detail alongside estimated hours

### Weekly Calendar
- Drag-and-drop blocks to reschedule across days
- Resize blocks by dragging the bottom handle
- Click any block to edit: title, course, date, time, duration, priority, notes
- Every study block has a **Mark Status** button regardless of block size
- "Need More Time" flow: choose extra hours + reschedule strategy (extend / move / split / rebalance)

### Add Task & Add Course
- 3-step task creation with task-type selector and AI study plan preview
- Add Course with **syllabus PDF upload** — AI auto-extracts course code, name, and schedule
- Newly created courses immediately appear in all views

### Dashboard
- Clickable stat cards navigating to relevant filtered views
- Live heatmap thumbnail powered by the same data source as the full heatmap page
- Upcoming assignments list with clickable rows

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v3 + PostCSS |
| State | React Context API |
| Drag & Drop | HTML5 Drag and Drop API |
| Date Handling | UTC-safe arithmetic (no external date library) |

No backend — all state is in-memory. This is a high-fidelity interactive prototype.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (bundled with Node.js)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/ruoxinhe-code/studyflow.git
cd studyflow

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **http://localhost:5173** in your browser.

> On the login screen, click **Sign In** — no credentials required (prototype, no auth backend).

### Build for Production

```bash
npm run build
# Output is in the dist/ folder
```

---

## Project Structure

```
src/
├── components/
│   ├── AddMenu.jsx              # "New ▾" dropdown — Add Task / Add Course
│   ├── EventEditModal.jsx       # Calendar block edit form
│   ├── Icons.jsx                # Inline SVG icon set
│   ├── Modal.jsx
│   ├── Sidebar.jsx
│   ├── TaskCompletionModal.jsx  # 3-state session completion flow
│   ├── TimerWidget.jsx          # Live time tracker with progress bar
│   └── Topbar.jsx
├── context/
│   └── AppContext.jsx           # Global state, scheduling engine, timer & preference actions
├── data/
│   └── mockData.js              # Seed data: courses, tasks, initial calendar blocks
├── pages/
│   ├── AddCourseModal.jsx       # Course creation with syllabus upload
│   ├── AddTaskModal.jsx         # 3-step task creation with AI schedule preview
│   ├── CalendarPage.jsx         # Weekly grid with drag / drop / resize
│   ├── DashboardPage.jsx        # Overview with live stats and heatmap
│   ├── HeatmapPage.jsx          # Heatmap + AI suggestions + preferences panel
│   ├── LoginPage.jsx
│   ├── SettingsPage.jsx
│   └── TasksPage.jsx            # Full task list with timer integration
└── utils/
    ├── aiUtils.js               # Workload suggestion generation & application
    ├── dateUtils.js             # UTC-safe date arithmetic helpers
    ├── heatmapUtils.js          # Shared heatmap computation (dashboard + heatmap page)
    └── schedulerUtils.js        # Free-slot finder, overlap prevention, daily-quota enforcement
```

---

## Key Design Decisions

- **No overlap by default** — the scheduler scans free slots before placing any block
- **Daily quota is a hard budget** — blocks exceeding the cap are split and overflow to the next available day; no hours are lost
- **Heatmap consistency** — dashboard thumbnail and full heatmap page both read from the same live `blocks` state in context
- **Atomic preference + reschedule** — `applyPreferencesAndReschedule()` passes new prefs as a parameter (avoiding stale React closures) so the scheduler always uses the latest values

---

## Course Context

Built as a high-fidelity interactive prototype for **CSC318 — Design of Interactive Computational Media**, University of Toronto.

---

