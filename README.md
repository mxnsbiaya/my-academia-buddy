# My Academia Buddy 2.0 🎓

> **An autonomous, explainable study planning suite designed for university students.**  
> Transform deadlines, exam dates, course difficulty, and weekly availability into realistic, structured study sessions.

[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-729b1b?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tests](https://img.shields.io/badge/Tests-27%20Passed-10b981)](docs/TEST_RESULTS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Problem Statement

University students often struggle with balance, burnout, and last-minute cramming when balancing multiple challenging courses, major term projects, and midterm exams. Existing calendar tools are either purely manual or treat all tasks as simple to-do items without factoring in:
- Cognitive load and course difficulty differences (e.g. theoretical algorithms vs. elective readings).
- True task preparation requirements and remaining workload.
- Realistic weekly availability constraints and permitted daylight study hours.
- Spaced repetition and cognitive break intervals.

**My Academia Buddy 2.0** solves this with a **deterministic, explainable client-side scheduling engine** that automatically generates balanced, conflict-free study plans before deadlines occur.

---

## ✨ Flagship Features

### 1. 📊 Intelligent Student Dashboard
- **Real-Time Academic Metrics:** Live counters for active courses, pending assignments, upcoming exams, and planned study hours.
- **Next Recommended Session Spotlight:** Immediately highlights the next study block with priority badges, time windows, and completion triggers.
- **Workload Distribution Overview:** Visual breakdown of estimated hours across registered courses.
- **Urgent Deadlines Feed:** Filters tasks due within the next 7 days.

### 2. 📚 Course Management
- Configure course codes, instructors, schedules, credits, and custom color tags.
- **Difficulty Tiers:** Classify courses as `High`, `Medium`, or `Low` difficulty to calibrate study session lengths and scheduling priorities.
- **Progress Tracking:** Automatically calculates completion percentages based on linked deliverables.

### 3. 📝 Assignment & Exam Management
- Track deliverables with explicit **Estimated Workload (Hours)**, due dates, and priority weighting (`High`, `Medium`, `Low`).
- Schedule exams with date, location, preparation scope notes, and review workloads.
- Filter and sort by course, deadline, priority, or completion status.
- Full CRUD support with accessible edit dialog modals and clear validation error feedback.

### 4. ⚡ Smart Study Planner (Flagship Engine)
- **Weekly Availability Configuration:** Define repeating weekly study windows.
- **Constraint Satisfaction:** Enforces study hours strictly between **06:00 and 22:00**; nocturnal hours are filtered out for student well-being.
- **Explainable Decisions:** Every study block includes an interactive *"Why was this session scheduled?"* accordion detailing urgency scores, priority rankings, and spacing logic.
- **Overload & Impossible Schedule Warnings:** Instantly alerts students when workload exceeds available hours prior to a deadline, detailing the exact deficit hours.
- **Preservation of Completed Work:** Lock in and preserve completed study sessions when regenerating plans.
- **Cognitive Recovery Breaks:** Automatically inserts 15-minute rest intervals between consecutive intensive study blocks.

### 5. 💾 Privacy-First Storage & Data Backups
- Runs entirely in the client's browser with **zero data collection** and **no external tracking**.
- **Schema Migrations:** Versioned persistence automatically migrates older data structures without data loss.
- **One-Click Backup & Restore:** Export and import complete workspace snapshots as formatted JSON files.
- **Sample Demo Dataset:** Load realistic university coursework with 1 click to test or demonstrate the application.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19 (Hooks, Context API, Suspense-ready) |
| **Build & Tooling** | Vite 8, ES Modules |
| **Routing** | React Router DOM 7 |
| **Testing** | Vitest 5, React Testing Library, jsdom |
| **Styling** | Modern Vanilla CSS Design System (Custom properties, CSS Grid, Flexbox, accessible focus rings) |
| **Linting & Code Quality** | ESLint 10 with `react-hooks` and `react-refresh` plugins |
| **Deployment** | Vercel (SPA rewrite configuration via `vercel.json`) |

---

## 🏗️ Architecture & Documentation

Comprehensive engineering documentation is maintained in the [`docs/`](docs/) directory:

- 📖 [**System Architecture (docs/ARCHITECTURE.md)**](docs/ARCHITECTURE.md) — Clean Architecture breakdown, data flow diagrams, and the heuristic scoring formula.
- 🧪 [**Test Results & Quality Assurance (docs/TEST_RESULTS.md)**](docs/TEST_RESULTS.md) — Automated test suite execution, bug fixes, and quality metrics.
- 🔍 [**Codebase Audit Report (docs/PROJECT_AUDIT.md)**](docs/PROJECT_AUDIT.md) — Initial codebase audit, identified technical debt, and modernization steps.
- 🗺️ [**Product Roadmap (docs/ROADMAP.md)**](docs/ROADMAP.md) — Future releases and proposed Supabase Cloud Database / Auth migration plan.

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- `npm` (version 9+ or 10+)

### 1. Clone the repository
```bash
git clone https://github.com/mxnsbiaya/my-academia-buddy.git
cd my-academia-buddy
```

### 2. Switch to the v2 development branch
```bash
git checkout feature/academia-buddy-v2
```

### 3. Install dependencies
```bash
npm install
```

### 4. Run the development server
```bash
npm run dev
```
Open your browser at `http://localhost:5173/`.

### 5. Run the automated test suite
```bash
# Run tests once
npm test

# Run tests in interactive watch mode
npm run test:watch
```

### 6. Run linting & production build
```bash
# Check code style & React rules
npm run lint

# Build production bundle
npm run build
```

---

## 🌐 Production Deployment

The project is pre-configured for one-click deployment on [Vercel](https://vercel.com):

1. Import the repository into your Vercel dashboard.
2. Vercel automatically detects the Vite framework and runs `npm run build`.
3. SPA client-side routing is handled via `vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## 🧑‍💻 Author

**Manassé Biaya**  
*Computer Science & Software Engineering Student*  
*University of Ottawa*  
GitHub: [@mxnsbiaya](https://github.com/mxnsbiaya)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).