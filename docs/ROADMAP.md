# Product Roadmap & Phased Implementation Strategy

This document outlines the evolutionary milestones for **My Academia Buddy**, tracking completed features, the current Adaptive Academic Coaching Platform implementation, and the architectural plan for future phases.

---

## 1. Release Milestones & Phase Progress

### ✅ Phase 1: Adaptive Academic Coaching Platform (Current Release — Branch `feature/academic-coach`)
- **Student Onboarding & Dynamic Profile:**
  - Non-judgmental 3-step onboarding flow.
  - Profile tracking program, semester, organization approach, work commitments, study goal hours, and academic goals.
  - Dynamic inspection of observed adaptive signals (completion consistency, pace multiplier, observed weekly hours).
- **Course & Syllabus Management:**
  - Interactive syllabus weekly topics accordion per course.
  - Multi-state topic tracking (`not_started`, `attended_lecture`, `reading_completed`, `practiced`, `reviewed`).
  - Self-reported confidence ratings (1 to 5 stars).
  - Manual syllabus topic creation and structured text syllabus import with mandatory review-and-correct step.
- **Weekly Academic Check-Ins (Core Feature):**
  - Personalized 2-minute check-in generating course- and topic-specific questions.
  - Supports nuanced responses (`completed`, `partially_completed`, `not_started`, `skipped`, `unsure`).
  - Non-repetitive questions for mastered topics.
  - Automatic schedule recalibration and pace buffer adjustment.
- **Observable Course Readiness Indicators:**
  - Transparent heuristic readiness scoring ($50\%$ topic completion + $25\%$ assignments + $25\%$ confidence).
  - Categorization into High, Moderate, and Needs Attention tiers with exam urgency alerts.
  - Prominent disclaimer clarifying readiness is an organizational heuristic, not a scientific passing predictor.
- **Intelligent Adaptive Study Planner:**
  - Concrete 3-step micro-actions (`step: 1, action, duration`) replacing vague multi-hour blocks.
  - Adaptive pace buffer multiplier ($1.0\times - 1.5\times$) adding breathing room to prevent schedule collapse.
  - Emergency Exam Preparation Mode prioritizing 75% of available study slots for approaching tests.
  - Syllabus topic-driven study sessions and recovery rescheduling for missed topics.
- **Personalized Academic Dashboard:**
  - Actionable "What should I do today?" daily agenda.
  - Coach Guidance status banner and 2-minute weekly check-in trigger.
  - Outstanding syllabus topics requiring attention.
- **Automated QA & Reliability:**
  - 42 / 42 automated tests passing in Vitest.
  - Clean ESLint with 0 warnings, 0 errors.
  - 385ms production build with Vite.

---

## 2. Deferred Future Phases

The following features have been intentionally planned and deferred to subsequent phases to prioritize stability, transparency, and product quality in Phase 1:

### ⏳ Phase 2: Client-Side PDF Syllabus Extraction (Safe OCR/Parser)
- **Objective:** Allow students to drop a `.pdf` syllabus directly into the browser to extract weekly topics, reading lists, and assignment deadlines.
- **Technical Architecture:**
  - Integrate `pdfjs-dist` client-side (no private student documents sent to third-party AI services).
  - Regex and layout-based tokenization for syllabus sections (Weeks, Modules, Exams).
  - Mandatory Review & Correct wizard: The student must verify and edit extracted rows before saving to their course.

### ⏳ Phase 3: Cloud Synchronization & Supabase Backend
- **Objective:** Enable multi-device synchronization (laptop study planning, mobile agenda review).
- **Technical Architecture:**
  - Supabase Auth (Passwordless Email Magic Links or Google OAuth).
  - PostgreSQL schema matching Storage v3 with Row-Level Security (RLS) policies.
  - Local-first cache with offline synchronization.
  - Account deletion and complete GDPR data export tools.

### ⏳ Phase 4: Installable Progressive Web App (PWA)
- **Objective:** Provide an installable, full-screen native feel on macOS, Windows, iOS, and Android without app store distribution barriers.
- **Technical Architecture:**
  - `vite-plugin-pwa` with web app manifest and custom app icons.
  - Service worker offline cache strategy for static assets.
  - Background sync queue for check-in responses when offline.

### ⏳ Phase 5: Scheduled Reminders & Email Backend
- **Objective:** Send scheduled weekly check-in reminders and exam alerts even when the browser is closed.
- **Technical Architecture:**
  - Supabase Edge Function triggered via `pg_cron` daily at midnight.
  - Resend or SendGrid email API with authenticating deep links (`/check-in?token=...`).
  - User controls for notification frequency, quiet hours, and opt-out preferences.

### ⏳ Phase 6: Native Mobile App (React Native / Expo)
- **Objective:** Dedicated mobile companion app for on-the-go check-ins and agenda tracking.
- **Technical Architecture:**
  - Monorepo structure with `@academia/core` containing shared scheduling and coaching logic (`scheduler.js`, `coach.js`, `storage.js`).
  - Expo / React Native mobile UI consuming the shared domain engine.
