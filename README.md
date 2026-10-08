# My Academia Buddy 🎓 — Adaptive Academic Coaching Platform

> **"Your personal academic coach that knows what you need to study, when you need to study it, and how your plan should change when life gets in the way."**  
> An adaptive academic organization platform for university students that monitors actual progress, identifies delays through 2-minute weekly check-ins, and dynamically recalibrates a realistic study schedule.

[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-729b1b?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tests](https://img.shields.io/badge/Tests-42%20Passed-10b981)](docs/TEST_RESULTS.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Product Vision

My Academia Buddy is **not an AI tutor that teaches academic subjects**.  
Instead, it acts as a **supportive, non-judgmental academic coach** that:
1. Understands each student's semester workload, courses, weekly syllabus topics, and real-life commitments (work shifts, commute, family).
2. Monitors observable progress and student confidence without equating mere lecture attendance with subject mastery.
3. Conducts fast **2-minute weekly check-ins** with questions generated directly from specific courses and topics.
4. Dynamically adapts planning assumptions (e.g. adding $+25\%$ breathing room buffer time when life gets busy) to prevent burnout and schedule collapse.

---

## ✨ Flagship Capabilities

### 1. 🧭 Personalized Weekly Academic Check-Ins (Core Feature)
- **Topic-Specific Questions:** Generates personalized questions based on active coursework (e.g., *"Did you attend the lecture on Graph Traversal in CSI 2110?"*, *"How much of Chapter 3 in MAT 1722 did you complete?"*).
- **Nuanced Feedback:** Supports answers such as *Completed*, *Partially completed*, *Not started*, *Skipped*, and *Unsure*.
- **Confidence Rating:** Captures self-reported understanding (1 to 5 stars) to detect shaky topics before midterms.
- **Schedule Reflection:** Queries upcoming shifts and commitments to plan the next 7 days realistically.
- **Fast & Easy:** Designed to be completed in approximately 2 minutes.

### 2. 📊 Observable Course Readiness Indicators
- **Transparent Multi-Factor Readiness Score:** Observable progress based on:
  $$\text{Readiness} = 50\% \times \text{Topics} + 25\% \times \text{Assignments} + 25\% \times \text{Confidence}$$
- **Tier Categorization:** Classifies courses into *High Readiness*, *Solid Progress*, and *Needs Focus*.
- **Exam Urgency Indicators:** Automatically flags courses with imminent exams ($<7$ days) and low readiness.
- **Scientific Integrity:** Prominently communicates that readiness is an organizational progress heuristic, never a scientific guarantee of exam success.

### 3. 🧠 Adaptive Student Profile & Pace Calibration
- **Dynamic Pacing Signals:** Tracks completion consistency, pace multiplier, and observed available hours.
- **Buffer Pace Recalibration:** When delays occur, the planner automatically applies a $+15\%$ to $+35\%$ breathing room buffer to future study sessions so students never feel overwhelmed.
- **Supportive, Non-Punitive Tone:** Avoids derogatory labels like "bad" or "lazy". Students are never penalized for postponed tasks.

### 4. ⚡ Intelligent Adaptive Study Planner
- **Concrete 3-Step Micro-Actions:** Replaces vague instructions (*"Study math for 2 hours"*) with actionable micro-steps:
  1. *Concept Review & Note Synthesis (20m)*
  2. *Applied Practice & Exercise Derivations (35m)*
  3. *Self-Verification & Checkpoint Summary (15m)*
- **Emergency Exam Preparation Mode:** 1-click toggle allocating 75% of scheduled time to nearest exams with high-yield revision blocks.
- **Topic Recovery Scheduling:** Automatically prioritizes past-due unstarted syllabus topics.
- **Fairness & Spacing Constraints:** Enforces reasonable study bounds (strictly between 06:00 and 22:00) with automatic 15-minute rest breaks.

### 5. 📚 Course & Syllabus Management
- **Weekly Topics Accordion:** Organize weekly modules, readings, and estimated workload hours.
- **Multi-State Topic Lifecycle:** Tracks *Not Started*, *Attended Lecture*, *Reading Done*, *Practiced*, and *Fully Reviewed*.
- **Syllabus Outline Importer:** Parse syllabus text outlines with a **mandatory review-and-correct table** before saving.

### 6. 🏠 Actionable Daily Dashboard
- **"What Should I Do Today?" Agenda:** Prioritized study sessions with timed micro-action checklists.
- **Coach Status Banner:** Real-time visibility into calibrated pace and emergency mode.
- **Outstanding Syllabus Topics:** Immediate visibility into topics requiring practice.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/mxnsbiaya/my-academia-buddy.git
cd my-academia-buddy

# Check out the academic coach branch
git checkout feature/academic-coach

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

---

## 🧪 Testing & Code Quality

Run the comprehensive automated test suite:
```bash
# Run all unit and integration tests (42 tests)
npm test

# Run ESLint validation
npm run lint

# Validate production build bundle
npm run build
```

**Quality Status:**
- ✅ **42 / 42 Tests Passed** across 6 test suites (`scheduler`, `coach`, `storage`, `context`, `components`, `smoke`).
- ✅ **0 ESLint Errors / 0 Warnings**.
- ✅ **Production build succeeds** in under 400ms.

---

## 🗺️ Architectural Documentation

- [Implementation Plan](docs/ACADEMIC_COACH_IMPLEMENTATION_PLAN.md): Detailed architectural strategy and vertical slice roadmap.
- [System Architecture](docs/ARCHITECTURE.md): Domain design, Storage Schema v3, and Cloud/Supabase roadmap.
- [Automated Testing Report](docs/TEST_RESULTS.md): Detailed verification breakdown.
- [Product Roadmap](docs/ROADMAP.md): Summary of Phase 1 deliverables and deferred phases (PDF extraction, PWA, email backend).

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.