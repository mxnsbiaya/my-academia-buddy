# Codebase Audit Report — My Academia Buddy

**Date:** October 2026  
**Auditor:** Senior Full-Stack Software Engineer & Technical Mentor  
**Repository:** `https://github.com/mxnsbiaya/my-academia-buddy`  
**Current Baseline Branch:** `feature/academia-buddy-v2` (branched from `main` @ `d976e20`)

---

## 1. Executive Summary

"My Academia Buddy" was developed as an academic planning client-side web application for university students. The application's core ambition—providing automated, heuristic-driven study plan generation based on assignments, exam dates, course difficulty, and weekly availability—is a strong concept for a portfolio project.

However, an exhaustive audit of the existing codebase reveals that the application is currently structured as an early-stage academic prototype. Key architectural patterns, validation layers, error boundaries, accessible UI design, and automated testing are absent. The flagship scheduling algorithm, while exhibiting thoughtful heuristic logic, is embedded inside a 943-line monolithic React component, preventing unit testing and code reuse.

This document classifies all findings by severity, provides verifiable code citations, assesses technical debt, and establishes the modernization roadmap for **My Academia Buddy 2.0**.

---

## 2. Repository & Architectural Overview

### 2.1 Technology Stack (Baseline)
- **Framework:** React 19.2.7 (React DOM 19.2.7)
- **Bundler / Tooling:** Vite 8.1.1, `@vitejs/plugin-react` 6.0.3
- **Routing:** React Router DOM 7.18.1
- **Linting:** ESLint 10.6.0 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- **Testing:** *None installed* (no test runner, no test files)
- **Styling:** Vanilla CSS (`src/index.css` and `src/App.css`)
- **State & Storage:** Direct, unvalidated `localStorage` calls across components

### 2.2 Directory Structure
```
my-academia-buddy/
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── README.md
├── vite.config.js
└── src/
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/
    │   └── Sidebar.jsx
    ├── pages/
    │   ├── Assignments.jsx
    │   ├── Courses.jsx
    │   ├── Dashboard.jsx
    │   ├── Exams.jsx
    │   └── StudyPlanner.jsx
    ├── App.css
    ├── App.jsx
    ├── index.css
    └── main.jsx
```

---

## 3. Detailed Audit Findings by Severity

### 3.1 Critical Severity (Blockers, Crashes & Data Integrity Risks)

#### [CRIT-01] Unhandled `JSON.parse` Exceptions Crash the Application
* **Location:** `src/pages/Dashboard.jsx:2-5`
  ```javascript
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const studyPlan = JSON.parse(localStorage.getItem("studyPlan")) || [];
  ```
* **Evidence:** In `Dashboard.jsx`, `JSON.parse` is executed directly in the component body without a `try/catch` wrapper. If any item in `localStorage` contains corrupted, partially written, or invalid JSON, the component throws an unhandled `SyntaxError` on mount, triggering an uncaught runtime error and a blank white screen. In contrast, `StudyPlanner.jsx` uses a local `safeParse()` utility function, highlighting inconsistent data handling across pages.
* **Impact:** Immediate crash upon app load; loss of user trust.
* **Recommendation:** Centralize storage access with a resilient `storageService` with schema validation, fallback values, and an error boundary to prevent full-application crashes.

#### [CRIT-02] Monolithic Tightly-Coupled Scheduling Engine
* **Location:** `src/pages/StudyPlanner.jsx` (lines 1 to 943)
* **Evidence:** The file combines 20+ algorithmic helper functions (`estimateCourseDifficulty`, `estimateTaskWeight`, `estimateTotalWorkMinutes`, `getSessionLength`, `getCourseCategory`, `timeToMinutes`, `minutesToTime`, `parseDate`, `daysBetween`, `getTaskScore`, `buildPlanningSlots`, `buildTasks`, `generatePlan`), local state hooks, 4 separate form elements, native browser blocking alerts (`alert()`, `confirm()`), and over 300 lines of JSX rendering.
* **Impact:** The core business logic of the entire project cannot be tested in isolation, cannot be reused on the Dashboard (e.g., displaying the "Next Recommended Study Session"), and violates the Single Responsibility Principle.
* **Recommendation:** Extract the scheduling engine into a dedicated `services/scheduler/` module with pure, deterministic functions, clear TypeScript/JSDoc types, and automated unit tests.

#### [CRIT-03] Complete Absence of Automated Test Suite
* **Location:** `package.json:6-11`
* **Evidence:** `package.json` contains only `dev`, `build`, `lint`, and `preview` scripts. No unit test runner (Vitest or Jest) or component testing library (React Testing Library) is installed.
* **Impact:** Every change carries high regression risk; impossible to objectively demonstrate correctness of scheduling algorithms to hiring managers or recruiters.
* **Recommendation:** Configure Vitest and `@testing-library/react` and develop unit and integration test suites covering data persistence, CRUD operations, edge cases, and scheduling logic.

---

### 3.2 High Priority (Functional Deficits & Architectural Flaws)

#### [HIGH-01] Missing Core Data Entities & Fields Required by Functional Requirements
* **Location:**
  - `src/pages/Courses.jsx`: Lacks course difficulty setting (`Low`, `Medium`, `High`) and lacks course editing capabilities.
  - `src/pages/Assignments.jsx`: Lacks `estimatedWorkload` (hours needed) input, leaving the planner to guess workloads solely based on title keywords.
  - `src/pages/Exams.jsx`: Lacks exam `title` (e.g., "Midterm 1"), exam `priority`, and exam `estimatedWorkload`.
* **Evidence:** The current implementation forces hardcoded heuristics to deduce difficulty and workload from title substrings rather than allowing students to input their actual course difficulty and estimated workload.
* **Impact:** Scheduling output does not reflect student reality; users cannot edit existing items without deleting and re-entering them.
* **Recommendation:** Expand data models to store explicit user preferences while preserving fallback heuristic estimation when fields are omitted.

#### [HIGH-02] Lack of Cross-Page State Synchronization
* **Location:** `src/pages/Courses.jsx`, `src/pages/Assignments.jsx`, `src/pages/Exams.jsx`, `src/pages/StudyPlanner.jsx`, `src/pages/Dashboard.jsx`
* **Evidence:** Each page manages its own local React state initialized via `useState(() => JSON.parse(localStorage.getItem(...)))`. There is no central React Context or state management store. If courses are modified or deleted in `Courses.jsx`, active assignments and exams retain references to deleted courses. Furthermore, navigating between pages relies on full unmount/mount to re-read localStorage.
* **Impact:** Inconsistent state, orphaned records, stale data displays.
* **Recommendation:** Implement an `AppContext` or dedicated custom hooks (`useCourses`, `useAssignments`, `useExams`, `useStudyPlan`) providing reactive updates across views with cascading referential integrity.

#### [HIGH-03] Silent Form Validation Failures & Reliance on Browser Alerts
* **Location:**
  - `src/pages/Assignments.jsx:26`: `if (title.trim() === "" || dueDate === "") return;`
  - `src/pages/Exams.jsx:26`: `if (course === "" || date === "") return;`
  - `src/pages/StudyPlanner.jsx:315, 323, 331`: uses `alert()` and `confirm()`
* **Evidence:** Form submissions fail silently without rendering inline field error messages when inputs are invalid. In `StudyPlanner.jsx`, modal interactions block the browser thread via native `window.alert()`.
* **Impact:** Frustrating user experience; unhelpful error reporting; poor accessibility.
* **Recommendation:** Implement inline form validation states, clear helper error messages, and non-blocking in-app notification toasts.

#### [HIGH-04] Non-Deterministic Session Keys in Study Plan
* **Location:** `src/pages/StudyPlanner.jsx:536, 593`
  ```javascript
  id: `${task.id}-${slot.date}-${sessionStart}-${Math.random()}`
  ```
* **Evidence:** Unique IDs for sessions and breaks are generated using `Math.random()`. Every time a plan is generated or state is touched, keys change unpredictably, breaking React list reconciliation and state tracking across sessions.
* **Impact:** Inability to stably correlate completed sessions with persistent plan identifiers.
* **Recommendation:** Generate deterministic UUIDs or slugged identifiers based on task ID, date, and time slot.

---

### 3.3 Medium Priority (UI/UX, Responsiveness & Accessibility)

#### [MED-01] Conflicting Layout Constraints in Global CSS
* **Location:** `src/index.css:57-67` vs `src/App.css:31-34`
  ```css
  /* index.css */
  #root {
    width: 1126px;
    max-width: 100%;
    margin: 0 auto;
    text-align: center;
    border-inline: 1px solid var(--border);
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  ```
* **Evidence:** `index.css` retains the default Vite starter template styling (`width: 1126px; text-align: center;`), conflicting with `App.css` which specifies a full-width viewport flex layout (`.app { display: flex; min-height: 100vh; }`).
* **Impact:** Centered text misalignments, unexpected horizontal layout clipping on large displays, and conflicting CSS specificity.
* **Recommendation:** Replace `index.css` with a unified CSS design system defining cohesive custom properties (colors, typography, spacing, elevations).

#### [MED-02] Accessibility (a11y) Violations
* **Location:** `src/components/Sidebar.jsx`, `src/pages/Courses.jsx`, `src/pages/Assignments.jsx`, `src/pages/Exams.jsx`, `src/pages/StudyPlanner.jsx`
* **Evidence:**
  - Form inputs lack associated `<label>` elements or `aria-label` tags; placeholder text is used as the sole label.
  - Emojis in navigation (`🎓`, `🏠`, `📚`, `📝`, `📅`, `✨`) are unlabelled and not hidden from screen readers (`aria-hidden="true"` is missing).
  - Low-contrast text colors (`#64748b` on dark backgrounds) fail WCAG AA contrast ratio thresholds (4.5:1).
  - Interactive elements lack visible focus rings for keyboard navigators.
* **Impact:** Poor accessibility score; unusable for screen reader and keyboard-only users.
* **Recommendation:** Add proper semantic labels, IDs, ARIA tags, and accessible focus outlines across all forms and navigation links.

#### [MED-03] Mobile & Tablet Layout Clutter
* **Location:** `src/App.css:460-505`
* **Evidence:** On viewports under 768px, the sidebar converts into a static block at the top with a 2-column grid (`grid-template-columns: repeat(2, 1fr)`). This occupies significant vertical space before users can see page content. Tablet breakpoints (768px–1024px) are unhandled.
* **Impact:** Unpolished mobile UX.
* **Recommendation:** Implement a responsive top navigation bar with a mobile hamburger drawer, alongside responsive multi-column layouts for tablets and desktops.

#### [MED-04] Dashboard Metrics Don't Reflect Real Planner Context
* **Location:** `src/pages/Dashboard.jsx:15-18, 58-75`
* **Evidence:**
  - `upcomingExams` does not filter out past exams: `exams.slice().sort((a, b) => new Date(a.date) - new Date(b.date))` renders exams that occurred months ago.
  - The dashboard lacks key metrics: Next recommended study session, total study hours planned, urgent deadlines due within 48 hours, and workload distribution.
* **Impact:** The student dashboard feels static and lacks actionable guidance.
* **Recommendation:** Enhance Dashboard computations to highlight immediate deadlines, calculate true study workload, and display the next upcoming study session card.

---

### 3.4 Low Priority (Documentation & Hygiene)

#### [LOW-01] Barebones Project Documentation
* **Location:** `README.md`
* **Evidence:** The current README is 35 lines long, includes student number, lists generic bullet points, and provides no architectural breakdown, testing commands, screenshots, or live deployment details.
* **Impact:** Fails to convey software engineering maturity to portfolio reviewers.
* **Recommendation:** Overhaul `README.md` to professional industry standard and add comprehensive architectural docs (`docs/ARCHITECTURE.md`, `docs/ROADMAP.md`).

#### [LOW-02] Unused Assets & Generic Boilerplate
* **Location:** `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`
* **Evidence:** Default Vite template icons and unused images reside in `src/assets/`.
* **Impact:** Code bloat and incomplete branding.
* **Recommendation:** Clean up unused assets and provide clean SVG branding and favicon.

---

## 4. Technical Debt & Modernization Recommendations

| Area | Current State | Target 2.0 State |
| :--- | :--- | :--- |
| **Architecture** | Monolithic components, fragmented logic | Modular design: `services/`, `hooks/`, `context/`, `components/`, `utils/` |
| **Scheduling Engine** | Inline heuristic algorithm in 940-line component | Decoupled pure engine in `services/scheduler/` with full unit test coverage |
| **Data Persistence** | Direct `localStorage` writes, no schema validation | `StorageService` with versioning, validation, error handling, and JSON import/export |
| **UI/UX Design** | Basic dark theme, mismatched starter CSS, no labels | Polished productivity SaaS design system, accessible forms, smooth responsive layout |
| **Testing** | 0% automated test coverage | Vitest unit tests for scheduling & RTL tests for component interactions |
| **Accessibility** | Unlabelled inputs, missing ARIA tags, low contrast | WCAG 2.1 AA compliant, explicit labels, keyboard navigable |
| **Deployment** | Not configured for production CI/CD or Vercel | Vercel production-ready build, clean routing, zero console errors |

---

## 5. Audit Conclusion

The application has a strong functional premise and high utility value for students. By addressing the critical architectural decoupling, adding a robust test suite, standardizing data schemas, and refining the UI into a modern productivity SaaS interface, **My Academia Buddy 2.0** will serve as an exemplary software engineering portfolio project.
