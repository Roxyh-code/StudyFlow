# StudyFlow — Product Redesign Notes
### From Feature-Heavy Prototype → Focused, Opinionated Planner

---

## 1. Overview

StudyFlow started as a comprehensive student productivity suite — multiple pages, many controls, rich preference settings, AI parsing, timers, and analytics. After a structured product review, the team made a deliberate decision to **simplify aggressively**.

The redesign was not about removing effort — it was about removing the wrong effort. The original version tried to be a calendar, a task tracker, a Pomodoro timer, a workload analyzer, and an AI preference engine simultaneously. The result was a product that did many things adequately but nothing exceptionally.

**The core insight that drove the redesign:**

> The one moment that creates real value is this: a student adds a deadline, and the app immediately shows them *when* they will work on it. Everything else is secondary.

The new version is built entirely around that moment.

---

## 2. High-Level Comparison

| Aspect | Previous Version | Current Version |
|---|---|---|
| **Product focus** | Broad productivity suite | Deadline-driven schedule builder |
| **Navigation** | 5 pages (Dashboard, Calendar, Workload, Tasks, Settings) | 3 pages (This Week, Deadlines, Workload) |
| **Core action** | "Add Task" (3-step wizard) | "Add Deadline" (4 fields, one tap) |
| **Primary view** | Dashboard with stat cards | Weekly calendar — opens by default |
| **Scheduling feedback** | Visible after navigating to Calendar | Immediately visible on the same screen |
| **AI features** | NL preference parser, syllabus PDF upload, task-type scheduling rules | One-click Auto-Balance across the heatmap |
| **Preferences** | Multi-field panel: time-of-day, style, breaks, per-task-type overrides | Single slider: max hours/day, inline on calendar |
| **Time tracking** | Full timer (start/pause/stop, tracked vs planned) | Removed |
| **Onboarding friction** | High — many concepts to understand before getting value | Low — first action produces immediate visible output |
| **Cognitive load** | High | Low |

---

## 3. Feature Changes

### 3.1 Removed Features

| Feature | What it was | Why removed |
|---|---|---|
| **Dashboard page** | Stat cards (completion %, hours logged), mini heatmap, course progress | Duplicate of information already visible on Calendar and Deadlines pages. Added a navigation step without adding value. |
| **Task timer / time tracking** | Start / pause / stop per task, tracked vs planned hours comparison | Scope creep. Competes with dedicated tools (Toggl, Clockify). Pulled focus away from the core scheduling identity. |
| **Natural language preference parser** | Free-text input like "schedule assignments in the afternoon" parsed into scheduling rules | Clever but fragile. Created transparency issues (what was understood vs silently ignored). A direct UI is faster and more reliable. |
| **Syllabus PDF upload** | Drag-and-drop PDF → AI extracts course details and assignments | Demo-friendly but not reliable enough for real use. Adds setup complexity before the user gets any value. |
| **Task-type time preferences** | Different time-of-day rules per task type (assignment in afternoon, reading in morning) | Over-engineered for a problem most users have not identified. Hidden complexity in a settings panel no one reads. |
| **Workload style selector** | Balanced / focused / front-loaded scheduling strategy | Difference between modes was not legible to users. The algorithm should just work without needing to explain itself. |
| **Focus mode** | Filters task list to high-priority only | Gimmick. The correct fix is a better default sort, not a mode toggle. |
| **Multi-step Add Task wizard** | 3-step flow: Task Info → Schedule → AI Preview | Process-heavy. Most fields (priority, effort level, task type, notes) were rarely changed from their defaults. |

---

### 3.2 Simplified Features

| Feature | Before | After |
|---|---|---|
| **Add Deadline modal** | 3-step wizard, 10+ fields including priority, effort, task type, today's goal, notes | Single screen, 4 required fields: title, course, due date, hours needed |
| **Preferences / scheduling controls** | Dedicated Workload page with a collapsible panel: time preference, max hours, weekend avoidance, workload style, break duration, per-task-type overrides | One slider: max hours/day, embedded directly in the Calendar sidebar |
| **Navigation** | 5 nav items, all equal weight | 3 nav items with clear hierarchy: Calendar (home), Deadlines (management), Workload (review) |
| **"Add" button** | Dropdown with "Add Task" and "Add Course" as separate flows | Single "New ▾" dropdown in topbar — available globally, no duplication across pages |
| **Heatmap** | Full page with NL input, preference cards, per-task-type rules, save & reschedule button | Clean grid + weekly bar chart + one Auto-Balance button |
| **Workload page** | Primarily a settings interface with a heatmap embedded | Primarily a data visualization with a single action (Auto-Balance) |
| **Settings page** | AI strategy picker, course management, workload preferences | Course management only |

---

### 3.3 New / Refocused Features

| Feature | Description | Why it matters |
|---|---|---|
| **Calendar as home screen** | App opens directly to the weekly calendar view instead of a dashboard | The calendar is where the core value lives. Students should see their schedule immediately, not a summary of it. |
| **Deadlines page with progress bars** | Simple list sorted by due date, each item shows scheduled hours vs total hours as a progress bar | Replaces the task tracker with a deadline-oriented view. The key question is "how much of this is already scheduled?" not "what is the status?" |
| **Inline max hours/day slider** | Visible at all times in the calendar sidebar, changes take effect immediately | Moves the most impactful preference to where it is most relevant (the calendar), without requiring a trip to Settings. |
| **Auto-Balance (Workload page)** | Single button that detects overloaded days and redistributes study blocks to respect the daily cap | The right level of AI involvement — solves a concrete, visible problem (red squares in the heatmap) with a single tap and clear feedback. |
| **Wow moment preserved** | Adding a deadline still shows scheduling animation and populates study blocks on the calendar | The original core mechanic is intact and now more prominent since surrounding complexity was removed. |

---

## 4. Product Design Decisions

### Why simplify now?

The first version was built to explore the possibility space — to understand what *could* exist. That is the right approach for early prototype stages. The redesign is about answering the harder question: what *should* exist?

Several signals pointed to over-complexity:
- Features that required explanation were features that were not working
- Multiple pages contained redundant information (dashboard heatmap and workload heatmap showing identical data)
- The 3-step "Add Task" wizard added process to what should be a 10-second interaction
- The NL parser introduced a transparency problem: users could not tell which parts of their input were understood

### Why make Calendar the home screen?

The previous dashboard showed statistics *about* the schedule. The calendar shows the schedule itself. Showing the summary of a thing before showing the thing is backwards. Users who open the app want to know "what am I doing this week" — the calendar answers that directly.

### Why remove the timer?

Time tracking is a different product with a different mental model. A student using StudyFlow is thinking "when do I need to study" — not "how long did I study." Conflating these two problems produces a product that does neither well. Toggl and similar tools already solve time tracking. StudyFlow's moat is scheduling, not tracking.

### Why keep Workload but simplify it?

The heatmap is genuinely useful — it answers "am I overloaded this month?" in a single glance. What was wrong was surrounding it with a preference panel that made it feel like a configuration screen. The redesign separates the concern: heatmap for *seeing*, slider for *adjusting*, Auto-Balance for *fixing*. Three distinct actions, each clear.

### Why a one-button AI balance instead of a preference-driven reschedule?

The previous "Save & Reschedule" button required the user to:
1. Open the preferences panel
2. Understand each setting
3. Adjust sliders/toggles
4. Confirm the operation

The new Auto-Balance button requires the user to:
1. See red squares in the heatmap
2. Click the button

The AI's job is to remove decisions, not to present them.

---

## 5. Tradeoffs

| What was gained | What was sacrificed |
|---|---|
| **Speed to value** — first useful output in under 15 seconds | **Granular control** — power users cannot fine-tune session timing or task-type-specific rules |
| **Clarity of purpose** — the product has one clear job | **Breadth** — students who want time tracking or PDF parsing need separate tools |
| **Reliability of expectations** — the UI is predictable and learnable | **Flexibility** — edge cases (night-owl students, weekend workers) have fewer options |
| **Clean demo narrative** — one action, one visible result | **Feature richness** — the product looks less impressive on a feature checklist |
| **Reduced cognitive load** — fewer decisions required from the user | **User autonomy** — some users prefer more control over the algorithm's behavior |
| **Consistent UX** — all pages share a single data source and interaction model | **Customization** — per-task or per-course scheduling overrides are gone |

The central tradeoff is **simplicity vs flexibility**. The redesign bets that most students want the schedule to be made for them, not to configure how the schedule is made. That assumption can be validated or challenged through user testing.

---

## 6. New Product Philosophy

**StudyFlow is:**
- A system that turns a list of deadlines into a weekly study schedule automatically
- Opinionated about how scheduling should work (spread evenly, respect daily limits)
- Focused on the moment between "I have this due" and "I know when I'm working on it"

**StudyFlow is NOT:**
- A task manager (that's Todoist / Notion)
- A time tracker (that's Toggl / Clockify)
- A calendar replacement (that's Google Calendar)
- A productivity analytics tool
- A course management system

The product occupies a specific gap: the space between knowing you have work due and actually having time blocked to do it. Students fall into that gap constantly. StudyFlow is the bridge.

---

## 7. User Experience Changes

### Onboarding

| Before | After |
|---|---|
| User lands on Dashboard — sees stats with no data, finds it empty and unclear | User lands on Calendar — sees an already-populated week with existing mock data |
| First action requires opening "New ▾" → "Add Task" → completing 3-step wizard | First action is "New ▾" → "Add Deadline" → 4 fields → watch blocks appear |
| Value requires understanding the system first | Value is the first interaction |

### Interaction Flow

The previous flow had detours:
```
Add task → wizard step 1 → wizard step 2 → AI preview → confirm → navigate to Calendar → see result
```

The new flow is direct:
```
Click "Add Deadline" → fill 4 fields → click "Schedule It" → blocks appear on calendar instantly
```

### Cognitive Load

The previous version required users to make active decisions about:
- Priority level
- Effort level
- Task type
- Today's goal
- Scheduling strategy (balanced / focused / early)
- Time-of-day preference per task type

The new version requires users to make active decisions about:
- What is due
- When it is due
- How many hours it will take

Everything else is a default that the system handles. Defaults can be overridden (daily limit slider), but the override is in context — not buried in a settings page.

---

## 8. Future Directions

These features are deliberately deferred — not permanently excluded. Each could be added without breaking the core simplicity, if sequenced correctly.

| Feature | When to add it | Condition |
|---|---|---|
| **Google Calendar sync** | After core scheduling is validated | Removes manual lecture entry, increases adoption |
| **Mobile PWA** | After web experience is stable | Same product, smaller screen |
| **Drag to reschedule** (already partially built) | Refinement phase | Adds direct manipulation without adding new concepts |
| **Recurring events / auto-import from course syllabus** | After trust in manual flow | Reduces setup friction for new semesters |
| **Per-task notes / context** | Only if user research shows this is a real gap | Keep as optional, not in the main add flow |
| **Spaced repetition scheduling** | Advanced feature, for exam-prep use case | Opt-in, not default behavior |
| **Time-of-day preferences** | If user segmentation shows night-owl students are underserved | Reintroduce as one preference, not per-task-type |

**The guiding principle for future additions:**

> A new feature earns its place by making the core loop — add deadline → schedule appears — faster, more accurate, or more trusted. If it doesn't serve that loop, it belongs in a different product.

---

*Document written as part of the CSC318 Design of Interactive Computational Media course, University of Toronto.*
