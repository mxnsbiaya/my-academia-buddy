# Automated Testing & Quality Assurance Report

**Project:** My Academia Buddy 2.0  
**Test Framework:** Vitest 5.0.3 + @testing-library/react 16.3.3 + jsdom 30.1.2  
**Execution Date:** October 2026  
**Status:** ✅ 27 / 27 Tests Passed (100% Pass Rate)

---

## 1. Test Suite Summary

| Test File | Description | Total Tests | Passed | Failed |
| :--- | :--- | :---: | :---: | :---: |
| `src/test/smoke.test.js` | Infrastructure baseline & localStorage isolation | 2 | 2 | 0 |
| `src/test/storage.test.js` | Resilient JSON parsing, schema migrations (v1 → v2), and backup import/export | 5 | 5 | 0 |
| `src/test/scheduler.test.js` | Pure scheduling engine utilities, heuristic scoring, constraint enforcement, and impossible schedule detection | 11 | 11 | 0 |
| `src/test/context.test.jsx` | AppContext reactive store, CRUD state updates, plan generation, and notifications | 4 | 4 | 0 |
| `src/test/components.test.jsx` | Integration testing for Courses, Assignments, Exams, and Dashboard views | 5 | 5 | 0 |
| **Total** | **Comprehensive Automated Test Coverage** | **27** | **27** | **0** |

---

## 2. Test Execution Details

### 2.1 Pure Scheduling Engine (`src/test/scheduler.test.js`)
* **Time conversions:** Validates `timeToMinutes('09:30') === 570` and `minutesToTime(855) === '14:15'` bidirectional formatting.
* **Date math:** Tests `daysBetween` calculations across calendar boundaries without timezone drift.
* **Course difficulty estimation:** Verifies keyword parsing (`SEG`, `CSI`, `MAT`, `PHYS` → High; `BIOL`, `CHEM` → Medium; others → Low).
* **Task weight estimation:** Verifies keyword identification (`Project`, `Lab`, `Final`, `Exam` → High; `Quiz`, `Reflection` → Low).
* **Missing availability:** Ensures graceful error reporting when no weekly availability window is configured.
* **Permitted study hours constraint:** Enforces that study sessions are **strictly** scheduled between 06:00 and 22:00, even if the user accidentally enters late-night availability.
* **Deadline cutoff constraint:** Proves that sessions are **never** scheduled after a task's deadline date.
* **Multi-factor prioritization:** Confirms high-urgency and high-priority tasks are scheduled before distant or low-priority deliverables.
* **Spaced repetition & fairness:** Verifies that large workloads are distributed across days and interleaved when multiple urgent tasks compete.
* **Preservation of completed work:** Validates that completed sessions are retained upon regeneration and their minutes are subtracted from the task's remaining requirement without time-slot collisions.
* **Impossible schedule detection:** Tests overload detection when required workload exceeds available slots before the deadline, producing explicit task deficit hours.
* **Break insertion:** Proves that 15-minute rest intervals are automatically scheduled between consecutive learning blocks.

### 2.2 Storage & Migrations (`src/test/storage.test.js`)
* **Safe parse resilience:** Verifies that corrupted or malformed localStorage entries fall back gracefully to default collections instead of throwing unhandled exceptions.
* **CRUD operations:** Verifies safe write, read, and delete operations.
* **v1 to v2 schema migration:** Tests automatic migration of legacy data (populating missing `difficulty`, `estimatedWorkload`, `priority`, and `title` properties).
* **JSON Backup / Restore:** Verifies full application state serialization and restoration with schema integrity checks.
* **Invalid backup rejection:** Confirms malformed JSON backup files are rejected with informative error messages.

### 2.3 Context State Management (`src/test/context.test.jsx`)
* **Course lifecycle:** Tests reactive addition, editing, and deletion.
* **Assignment lifecycle:** Tests task creation, editing, and completion toggling.
* **Study plan generation:** Verifies that invoking `generatePlan()` from the context populates both the schedule and analytical insights.

### 2.4 User Interface Integration (`src/test/components.test.jsx`)
* **Courses view:** Tests empty state, form input, difficulty tier selection, card rendering, and validation error banner for blank submissions.
* **Assignments view:** Tests task creation with workload hours, due date, priority badge, and completion checkbox toggling.
* **Exams view:** Tests scheduling midterms with location, workload, and date rendering.
* **Dashboard view:** Verifies statistics card computation, active course counts, and empty spotlight states.

---

## 3. Bugs Discovered & Fixes Implemented

| Issue ID | Bug Discovered | Impact | Fix Implemented |
| :--- | :--- | :--- | :--- |
| **BUG-01** | `JSON.parse` called without `try/catch` in `Dashboard.jsx` | Uncaught `SyntaxError` crashes app on corrupted storage | Implemented `safeGetItem()` with fallback return values |
| **BUG-02** | Monolithic 943-line `StudyPlanner.jsx` mixed state, UI, and logic | Zero testability of the core algorithm | Extracted pure deterministic functions into `services/scheduler.js` |
| **BUG-03** | `Math.random()` used in session keys | Non-deterministic IDs broke React reconciliation | Created deterministic ID scheme based on task, date, and start time |
| **BUG-04** | Form submissions failed silently on invalid inputs | Zero user feedback when inputs were omitted | Added visible error banners and field validation states |
| **BUG-05** | Native `alert()` and `confirm()` blocked browser thread | Poor UX and accessibility degradation | Built custom accessible dialog `Modal` and non-blocking `ToastContainer` |
| **BUG-06** | Regeneration destroyed completed sessions | Students lost track of sessions they already finished | Added `preserveCompleted` option to lock finished sessions during recalculation |
| **BUG-07** | Dashboard rendered exams from months in the past | Misleading upcoming exam counts | Added date filter: `examDate >= today` |

---

## 4. Remaining Limitations & Future Roadmap

1. **Local-Only Storage:** While localStorage is resilient and now supports JSON export/import backups, multi-device synchronization requires a remote cloud database (planned for v3.0 with Supabase).
2. **Calendar Export:** Direct integration with Google Calendar / Apple Calendar (`.ics` format) is planned for the v2.1 minor release.
3. **Time Zone Nuances:** Dates are parsed at midday (`12:00:00`) to mitigate daylight saving shifts; future enhancements will integrate temporal date-fns utilities.
