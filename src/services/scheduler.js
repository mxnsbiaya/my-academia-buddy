/**
 * Smart Study Planner Scheduling Engine — My Academia Buddy 2.0 (Adaptive Coach Edition)
 * 
 * Deterministic, rule-based heuristic scheduler with:
 * - Constraint satisfaction (daily availability, 06:00-22:00 window, no overlaps)
 * - Multi-factor scoring (urgency, priority, difficulty, workload, exam urgency)
 * - Topic-level granularity and prerequisite dependency ordering
 * - Adaptive pace multiplier adjustment (calibrated by check-in signals)
 * - Automatic rescheduling for missed or in-progress topics
 * - Emergency Exam Preparation Mode
 * - Concrete, granular task action breakdowns (not vague instructions)
 * - Preservation of completed sessions across plan regenerations
 * - Detailed explainability annotations for each session
 * - Impossible schedule detection and workload analysis
 */

import { normalizeCourseCode } from './duplicateDetector';
import { detectAvailabilityConflicts } from './timetableService';

export const DAY_START_MINUTES = 6 * 60; // 06:00
export const NIGHT_START_MINUTES = 22 * 60; // 22:00
export const MIN_SESSION_MINUTES = 30;
export const BREAK_MINUTES = 15;
export const DEFAULT_TRANSITION_BUFFER_MINUTES = 15;
export const MAX_PLANNING_DAYS = 35; // 5-week rolling horizon

export const DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const PRIORITY_VALUE = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const LEVEL_VALUE = {
  High: 3,
  Medium: 2,
  Low: 1,
};

/**
 * Converts "HH:MM" string to minutes from midnight
 * @param {string} timeString
 * @returns {number}
 */
export function timeToMinutes(timeString = '') {
  if (!timeString || !timeString.includes(':')) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" 24-hour string
 * @param {number} totalMinutes
 * @returns {string}
 */
export function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats a Date object to YYYY-MM-DD local string
 * @param {Date} date
 * @returns {string}
 */
export function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a midday Date object to avoid timezone shifts
 * @param {string} dateString
 * @returns {Date|null}
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  const cleaned = String(dateString).split('T')[0];
  const parts = cleaned.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

/**
 * Calculates calendar days between two dates
 * @param {Date} fromDate
 * @param {Date} toDate
 * @returns {number}
 */
export function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = toDate.getTime() - fromDate.getTime();
  return Math.round(diff / dayMs);
}

/**
 * Formats a date into human-readable format e.g. "Mon, Oct 12"
 * @param {string} dateString
 * @returns {string}
 */
export function formatReadableDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return dateString || '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Heuristically estimates course difficulty if not explicitly set
 * @param {string} courseName
 * @returns {"High"|"Medium"|"Low"}
 */
export function estimateCourseDifficulty(courseName = '') {
  const name = courseName.toLowerCase();
  if (
    name.includes('mat') ||
    name.includes('math') ||
    name.includes('calculus') ||
    name.includes('algebra') ||
    name.includes('physics') ||
    name.includes('csi') ||
    name.includes('seg') ||
    name.includes('engineering') ||
    name.includes('algorithm') ||
    name.includes('programming') ||
    name.includes('software')
  ) {
    return 'High';
  }

  if (
    name.includes('business') ||
    name.includes('psychology') ||
    name.includes('biology') ||
    name.includes('chemistry') ||
    name.includes('economics')
  ) {
    return 'Medium';
  }

  return 'Low';
}

/**
 * Estimates task weight from title keywords
 * @param {string} taskTitle
 * @returns {"High"|"Medium"|"Low"}
 */
export function estimateTaskWeight(taskTitle = '') {
  const title = taskTitle.toLowerCase();
  if (
    title.includes('project') ||
    title.includes('lab') ||
    title.includes('final') ||
    title.includes('midterm') ||
    title.includes('exam') ||
    title.includes('research') ||
    title.includes('presentation') ||
    title.includes('essay')
  ) {
    return 'High';
  }

  if (
    title.includes('quiz') ||
    title.includes('reading') ||
    title.includes('summary') ||
    title.includes('reflection')
  ) {
    return 'Low';
  }

  return 'Medium';
}

/**
 * Categorizes a course
 * @param {string} courseName
 * @returns {string}
 */
export function getCourseCategory(courseName = '') {
  const name = courseName.toLowerCase();
  if (name.includes('seg') || name.includes('csi') || name.includes('prog') || name.includes('soft')) {
    return 'Programming / Software';
  }
  if (name.includes('mat') || name.includes('math') || name.includes('calc') || name.includes('algeb')) {
    return 'Mathematics';
  }
  if (name.includes('eng') || name.includes('fra') || name.includes('writ')) {
    return 'Language / Writing';
  }
  if (name.includes('bio') || name.includes('chem') || name.includes('phys')) {
    return 'Science';
  }
  return 'General Academic';
}

/**
 * Computes study session length based on difficulty and weight
 * @param {"High"|"Medium"|"Low"} difficulty
 * @param {"High"|"Medium"|"Low"} taskWeight
 * @returns {number} minutes (45 to 75)
 */
export function getSessionLength(difficulty, taskWeight) {
  if (difficulty === 'High' || taskWeight === 'High') return 75;
  if (difficulty === 'Medium' || taskWeight === 'Medium') return 60;
  return 45;
}

/**
 * Fallback workload estimation when user has not entered hours
 * @param {"Assignment"|"Exam Review"|"Course Review"|"Topic Study"} type
 * @param {"High"|"Medium"|"Low"} difficulty
 * @param {"High"|"Medium"|"Low"} taskWeight
 * @returns {number} minutes
 */
export function estimateTotalWorkMinutes(type, difficulty, taskWeight) {
  if (type === 'Exam Review') {
    if (difficulty === 'High') return 360; // 6h
    if (difficulty === 'Medium') return 240; // 4h
    return 150; // 2.5h
  }

  if (type === 'Topic Study') {
    if (difficulty === 'High') return 210; // 3.5h
    if (difficulty === 'Medium') return 150; // 2.5h
    return 90; // 1.5h
  }

  if (type === 'Course Review') {
    if (difficulty === 'High') return 120;
    if (difficulty === 'Medium') return 90;
    return 60;
  }

  if (taskWeight === 'High' && difficulty === 'High') return 360;
  if (taskWeight === 'High') return 240;
  if (taskWeight === 'Medium' && difficulty === 'High') return 180;
  if (taskWeight === 'Medium') return 120;
  return 75;
}

/**
 * Generates concrete, granular action steps for a session rather than vague instructions
 * 
 * @param {object} task
 * @param {number} sessionMinutes
 * @returns {Array<{ step: string, duration: number, details: string }>}
 */
export function generateGranularActionBreakdown(task, sessionMinutes = 60) {
  const isExam = task.type === 'Exam Review';
  const isEmergency = Boolean(task.isEmergencyMode);
  const isTopic = task.type === 'Topic Study';

  if (isEmergency) {
    const part1 = Math.round(sessionMinutes * 0.3);
    const part2 = Math.round(sessionMinutes * 0.5);
    const part3 = sessionMinutes - part1 - part2;
    return [
      {
        step: 1,
        title: 'High-Yield Formula & Concept Review',
        action: 'Review critical cheat sheets, core theorems, and recurring exam problem patterns.',
        details: 'Review critical cheat sheets, core theorems, and recurring exam problem patterns.',
        duration: part1,
      },
      {
        step: 2,
        title: 'Timed Mock Practice Problems',
        action: 'Solve exam-level questions under timed conditions without checking solutions.',
        details: 'Solve exam-level questions under timed conditions without checking solutions.',
        duration: part2,
      },
      {
        step: 3,
        title: 'Targeted Mistake Analysis & Fixes',
        action: 'Trace errors, verify edge cases, and solidify weak problem-solving steps.',
        details: 'Trace errors, verify edge cases, and solidify weak problem-solving steps.',
        duration: part3,
      },
    ];
  }

  if (isExam) {
    const part1 = Math.round(sessionMinutes * 0.25);
    const part2 = Math.round(sessionMinutes * 0.55);
    const part3 = sessionMinutes - part1 - part2;
    return [
      {
        step: 1,
        title: 'Active Recall & Topic Mapping',
        action: 'Recall key definitions and structures without looking at textbook notes.',
        details: 'Recall key definitions and structures without looking at textbook notes.',
        duration: part1,
      },
      {
        step: 2,
        title: 'Practice Exercises & Derivations',
        action: 'Complete end-of-chapter problems and previous midterm sample questions.',
        details: 'Complete end-of-chapter problems and previous midterm sample questions.',
        duration: part2,
      },
      {
        step: 3,
        title: 'Self-Quiz & Summary',
        action: 'Write down a 1-page summary sheet of concepts mastered during this block.',
        details: 'Write down a 1-page summary sheet of concepts mastered during this block.',
        duration: part3,
      },
    ];
  }

  if (isTopic) {
    const part1 = Math.round(sessionMinutes * 0.3);
    const part2 = Math.round(sessionMinutes * 0.5);
    const part3 = sessionMinutes - part1 - part2;
    const readingDetails = task.requiredReadings
      ? `Read & annotate: ${task.requiredReadings}`
      : 'Synthesize core lecture slide points into organized Cornell notes.';
    const practiceDetails = task.practiceProblems
      ? `Solve assigned problems: ${task.practiceProblems}`
      : 'Work through worked examples and textbook practice questions.';

    return [
      {
        step: 1,
        title: 'Lecture Slide & Reading Synthesis',
        action: readingDetails,
        details: readingDetails,
        duration: part1,
      },
      {
        step: 2,
        title: 'Applied Problem Solving',
        action: practiceDetails,
        details: practiceDetails,
        duration: part2,
      },
      {
        step: 3,
        title: 'Checkpoint Verification',
        action: 'Verify answers, document questions for TA office hours, and rate confidence.',
        details: 'Verify answers, document questions for TA office hours, and rate confidence.',
        duration: part3,
      },
    ];
  }

  // Default assignment step breakdown
  const part1 = Math.round(sessionMinutes * 0.2);
  const part2 = Math.round(sessionMinutes * 0.6);
  const part3 = sessionMinutes - part1 - part2;
  return [
    {
      step: 1,
      title: 'Requirement Breakdown & Planning',
      action: 'Review rubric, set clear milestone criteria, and draft outline or pseudocode.',
      details: 'Review rubric, set clear milestone criteria, and draft outline or pseudocode.',
      duration: part1,
    },
    {
      step: 2,
      title: 'Focused Implementation / Writing',
      action: 'Deep work block: build milestone deliverables with zero distractions.',
      details: 'Deep work block: build milestone deliverables with zero distractions.',
      duration: part2,
    },
    {
      step: 3,
      title: 'Testing, Review & Verification',
      action: 'Test edge cases, format according to instructions, and save clean checkpoints.',
      details: 'Test edge cases, format according to instructions, and save clean checkpoints.',
      duration: part3,
    },
  ];
}

/**
 * Computes the multi-factor scheduling priority score for a task on a specific session date
 * @param {object} task
 * @param {Date} sessionDate
 * @param {number} dailyCount Number of sessions scheduled for this task on this specific day
 * @returns {number} Higher score = scheduled sooner
 */
export function getTaskScore(task, sessionDate, dailyCount = 0) {
  const dueDate = parseDate(task.date);
  const daysLeft = dueDate ? daysBetween(sessionDate, dueDate) : 30;

  // 1. Urgency score (exponential decay curve as deadline approaches)
  let urgencyScore = 1;
  if (daysLeft <= 0) urgencyScore = 16;
  else if (daysLeft === 1) urgencyScore = 13;
  else if (daysLeft <= 2) urgencyScore = 10;
  else if (daysLeft <= 4) urgencyScore = 8;
  else if (daysLeft <= 7) urgencyScore = 6;
  else if (daysLeft <= 14) urgencyScore = 3;

  // 2. Explicit priority score
  const priorityScore = (PRIORITY_VALUE[task.priority] || 2) * 3.5;

  // 3. Difficulty & workload weight
  const difficultyScore = (LEVEL_VALUE[task.difficulty] || 2) * 1.5;
  const workloadScore = (LEVEL_VALUE[task.taskWeight] || 2) * 1.5;

  // 4. Fixed exam urgency bonus
  const examBonus = task.type === 'Exam Review' ? 4.0 : 0;

  // 5. Emergency Exam Prep Mode Bonus
  const emergencyBonus = task.isEmergencyMode ? 8.0 : 0;

  // 6. Missed / Rescheduled Priority Boost
  const missedBoost = task.isMissedRescheduled ? 6.0 : 0;

  // 7. Prerequisite bonus (if this task is a prerequisite for upcoming tasks)
  const prereqBonus = task.isPrerequisite ? 4.0 : 0;

  // 8. Fairness penalties:
  // - High penalty if already scheduled on the same calendar day (encourages spaced repetition)
  const sameDayPenalty = dailyCount * 4.0;
  // - General repetition penalty to allow other subjects to make progress
  const repetitionPenalty = task.sessionsScheduled * 1.5;

  return (
    urgencyScore +
    priorityScore +
    difficultyScore +
    workloadScore +
    examBonus +
    emergencyBonus +
    missedBoost +
    prereqBonus -
    sameDayPenalty -
    repetitionPenalty
  );
}

/**
 * Generates available time slots across the planning horizon
 * @param {Array} availability User availability configs
 * @param {string} lastDeadline Latest deadline in the task set
 * @param {Date} [startDate] Starting date (defaults to today)
 * @returns {Array} List of usable slot objects
 */
export function buildPlanningSlots(
  availability,
  lastDeadline,
  startDate = new Date(),
  timetable = [],
  transitionBufferMinutes = DEFAULT_TRANSITION_BUFFER_MINUTES
) {
  const today = new Date(startDate);
  today.setHours(12, 0, 0, 0);

  const requestedEnd = lastDeadline ? parseDate(lastDeadline) : null;
  const maximumEnd = new Date(today);
  maximumEnd.setDate(maximumEnd.getDate() + MAX_PLANNING_DAYS);

  // Extend at least 7 days ahead even if last deadline is tomorrow, so user gets forward plan
  const minimumHorizon = new Date(today);
  minimumHorizon.setDate(minimumHorizon.getDate() + 7);

  let planningEnd = requestedEnd && requestedEnd > today ? requestedEnd : minimumHorizon;
  if (planningEnd > maximumEnd) planningEnd = maximumEnd;

  const slots = [];

  for (let cursor = new Date(today); cursor <= planningEnd; cursor.setDate(cursor.getDate() + 1)) {
    const cursorDayNumber = cursor.getDay();

    availability.forEach((slot) => {
      if (DAY_INDEX[slot.day] !== cursorDayNumber) return;

      const enteredStart = timeToMinutes(slot.startTime);
      const enteredEnd = timeToMinutes(slot.endTime);
      const startMinutes = Math.max(enteredStart, DAY_START_MINUTES);
      const endMinutes = Math.min(enteredEnd, NIGHT_START_MINUTES);

      if (endMinutes - startMinutes < MIN_SESSION_MINUTES) return;

      // Check if timetable classes exist on this day
      const dayClasses = (timetable || []).filter(
        (t) => t.dayOfWeek?.toLowerCase() === slot.day?.toLowerCase()
      );

      if (dayClasses.length === 0) {
        slots.push({
          id: `slot-${toLocalDateString(cursor)}-${slot.id || slot.startTime}`,
          day: slot.day,
          date: toLocalDateString(cursor),
          startMinutes,
          endMinutes,
        });
        return;
      }

      // Carve out timetable class intervals with transition buffer
      let intervals = [{ start: startMinutes, end: endMinutes }];
      dayClasses.forEach((cls) => {
        const clsStart = Math.max(0, timeToMinutes(cls.startTime) - transitionBufferMinutes);
        const clsEnd = timeToMinutes(cls.endTime) + transitionBufferMinutes;

        const nextIntervals = [];
        intervals.forEach((inv) => {
          if (inv.end <= clsStart || inv.start >= clsEnd) {
            nextIntervals.push(inv);
            return;
          }
          if (inv.start < clsStart) {
            nextIntervals.push({ start: inv.start, end: clsStart });
          }
          if (inv.end > clsEnd) {
            nextIntervals.push({ start: clsEnd, end: inv.end });
          }
        });
        intervals = nextIntervals;
      });

      intervals.forEach((inv, subIdx) => {
        if (inv.end - inv.start >= MIN_SESSION_MINUTES) {
          slots.push({
            id: `slot-${toLocalDateString(cursor)}-${slot.id || slot.startTime}-${subIdx}`,
            day: slot.day,
            date: toLocalDateString(cursor),
            startMinutes: inv.start,
            endMinutes: inv.end,
          });
        }
      });
    });
  }

  return slots.sort((a, b) => {
    const diff = parseDate(a.date) - parseDate(b.date);
    if (diff !== 0) return diff;
    return a.startMinutes - b.startMinutes;
  });
}

/**
 * Extracts and prepares tasks from courses, assignments, exams, and syllabus topics
 * 
 * @param {object} params
 * @param {Array} params.courses
 * @param {Array} params.assignments
 * @param {Array} params.exams
 * @param {Array} [params.syllabusTopics]
 * @param {Array} [params.completedSessions]
 * @param {object} [params.adaptiveSignals]
 * @param {Array} [params.missedTopicIds] Topics flagged in check-in needing priority catch-up
 * @param {boolean} [params.emergencyExamMode]
 * @returns {Array} List of normalized task objects
 */
export function buildNormalizedTasks({
  courses = [],
  assignments = [],
  exams = [],
  syllabusTopics = [],
  completedSessions = [],
  adaptiveSignals = null,
  missedTopicIds = [],
  emergencyExamMode = false,
}) {
  const tasks = [];

  // Index course details for lookup
  const courseMap = {};
  courses.forEach((c) => {
    courseMap[c.name] = c;
  });

  const paceMultiplier = adaptiveSignals?.paceMultiplier || 1.0;

  // Calculate completed minutes per task from existing sessions
  const completedMinutesByTask = {};
  completedSessions.forEach((session) => {
    if (session.taskId && session.sessionLength) {
      completedMinutesByTask[session.taskId] =
        (completedMinutesByTask[session.taskId] || 0) + Number(session.sessionLength);
    }
  });

  const missedSet = new Set(missedTopicIds || []);

  // 1. Pending Assignments
  assignments
    .filter((a) => !a.completed)
    .forEach((assignment) => {
      const courseObj = courseMap[assignment.course];
      const courseName = assignment.course || 'General';
      const difficulty = courseObj?.difficulty || estimateCourseDifficulty(courseName);
      const taskWeight = estimateTaskWeight(assignment.title);
      const category = getCourseCategory(courseName);

      // Course-specific velocity multiplier if available
      const courseMultiplier = adaptiveSignals?.observedVelocityByCourse?.[courseName] || paceMultiplier;

      // Base minutes scaled by adaptive velocity
      const baseMinutes =
        assignment.estimatedWorkload && Number(assignment.estimatedWorkload) > 0
          ? Math.round(Number(assignment.estimatedWorkload) * 60)
          : estimateTotalWorkMinutes('Assignment', difficulty, taskWeight);

      const totalMinutes = Math.round(baseMinutes * courseMultiplier);

      const taskId = `assignment-${assignment.id}`;
      const completedSoFar = completedMinutesByTask[taskId] || 0;
      const remainingMinutes = Math.max(0, totalMinutes - completedSoFar);

      tasks.push({
        id: taskId,
        sourceId: assignment.id,
        type: 'Assignment',
        title: assignment.title,
        course: courseName,
        courseColor: courseObj?.color || '#3b82f6',
        date: assignment.dueDate,
        priority: assignment.priority || 'Medium',
        difficulty,
        taskWeight,
        category,
        sessionLength: Math.max(30, Math.round(getSessionLength(difficulty, taskWeight) * courseMultiplier)),
        totalMinutes,
        remainingMinutes,
        sessionsScheduled: 0,
        isEmergencyMode: emergencyExamMode,
        isMissedRescheduled: false,
      });
    });

  // 2. Upcoming Exams
  exams.forEach((exam) => {
    const courseObj = courseMap[exam.course];
    const courseName = exam.course || 'General';
    const difficulty = courseObj?.difficulty || estimateCourseDifficulty(courseName);
    const category = getCourseCategory(courseName);

    const courseMultiplier = adaptiveSignals?.observedVelocityByCourse?.[courseName] || paceMultiplier;

    const baseMinutes =
      exam.estimatedWorkload && Number(exam.estimatedWorkload) > 0
        ? Math.round(Number(exam.estimatedWorkload) * 60)
        : estimateTotalWorkMinutes('Exam Review', difficulty, 'High');

    const totalMinutes = Math.round(baseMinutes * courseMultiplier);

    const taskId = `exam-${exam.id}`;
    const completedSoFar = completedMinutesByTask[taskId] || 0;
    const remainingMinutes = Math.max(0, totalMinutes - completedSoFar);

    tasks.push({
      id: taskId,
      sourceId: exam.id,
      type: 'Exam Review',
      title: exam.title || `${courseName} Exam Review`,
      course: courseName,
      courseColor: courseObj?.color || '#8b5cf6',
      date: exam.date,
      location: exam.location || '',
      priority: exam.priority || 'High',
      difficulty,
      taskWeight: 'High',
      category,
      sessionLength: Math.max(30, Math.round(getSessionLength(difficulty, 'High') * courseMultiplier)),
      totalMinutes,
      remainingMinutes,
      sessionsScheduled: 0,
      isEmergencyMode: emergencyExamMode || Boolean(exam.isUrgent),
      isMissedRescheduled: false,
    });
  });

  // 3. Syllabus Topics (Adaptive Coach Feature)
  // Schedule topics that are not yet marked as 'reviewed'
  const activeTopics = syllabusTopics.filter(
    (t) => t.status !== 'reviewed'
  );

  activeTopics.forEach((topic) => {
    const courseObj = courseMap[topic.courseName];
    const difficulty = courseObj?.difficulty || estimateCourseDifficulty(topic.courseName);
    const category = getCourseCategory(topic.courseName);

    const courseMultiplier = adaptiveSignals?.observedVelocityByCourse?.[topic.courseName] || paceMultiplier;

    // Estimate minutes for topic completion
    const baseMinutes = topic.estimatedHours
      ? Math.round(Number(topic.estimatedHours) * 60)
      : estimateTotalWorkMinutes('Topic Study', difficulty, 'Medium');

    const totalMinutes = Math.round(baseMinutes * courseMultiplier);

    const taskId = `topic-${topic.id}`;
    const completedSoFar = completedMinutesByTask[taskId] || 0;
    const remainingMinutes = Math.max(0, totalMinutes - completedSoFar);

    // Target date defaults to 7 days ahead for current week topics
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (topic.weekNumber ? topic.weekNumber * 3 : 7));

    const isMissed = missedSet.has(topic.id);

    tasks.push({
      id: taskId,
      sourceId: topic.id,
      type: 'Topic Study',
      title: `${topic.courseName}: ${topic.title}`,
      course: topic.courseName,
      courseColor: courseObj?.color || '#10b981',
      date: toLocalDateString(targetDate),
      priority: isMissed ? 'High' : (difficulty === 'High' ? 'High' : 'Medium'),
      difficulty,
      taskWeight: 'Medium',
      category,
      requiredReadings: topic.requiredReadings,
      practiceProblems: topic.practiceProblems,
      sessionLength: Math.max(30, Math.round(getSessionLength(difficulty, 'Medium') * courseMultiplier)),
      totalMinutes,
      remainingMinutes,
      sessionsScheduled: 0,
      isEmergencyMode: emergencyExamMode,
      isMissedRescheduled: isMissed,
      isPrerequisite: (topic.prerequisiteTopicIds || []).length > 0,
    });
  });

  // 4. Fallback: If no tasks found at all, schedule general course review
  if (tasks.length === 0 && courses.length > 0) {
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 7);

    courses.forEach((course) => {
      const difficulty = course.difficulty || estimateCourseDifficulty(course.name);
      const category = getCourseCategory(course.name);
      const totalMinutes = estimateTotalWorkMinutes('Course Review', difficulty, 'Medium');
      const taskId = `course-${course.id}`;
      const completedSoFar = completedMinutesByTask[taskId] || 0;
      const remainingMinutes = Math.max(0, totalMinutes - completedSoFar);

      tasks.push({
        id: taskId,
        sourceId: course.id,
        type: 'Course Review',
        title: `${course.name} Weekly Review`,
        course: course.name,
        courseColor: course.color || '#10b981',
        date: toLocalDateString(fallbackDate),
        priority: difficulty === 'High' ? 'High' : 'Medium',
        difficulty,
        taskWeight: 'Medium',
        category,
        sessionLength: getSessionLength(difficulty, 'Medium'),
        totalMinutes,
        remainingMinutes,
        sessionsScheduled: 0,
        isEmergencyMode: false,
        isMissedRescheduled: false,
      });
    });
  }

  return tasks;
}

/**
 * Main Study Plan Generation Engine — Adaptive Coach Edition
 * 
 * @param {object} options
 * @param {Array} options.courses
 * @param {Array} options.assignments
 * @param {Array} options.exams
 * @param {Array} options.availability
 * @param {Array} [options.syllabusTopics]
 * @param {Array} [options.existingPlan] Existing plan to preserve completed work from
 * @param {boolean} [options.preserveCompleted=true]
 * @param {object} [options.adaptiveSignals]
 * @param {Array} [options.missedTopicIds]
 * @param {boolean} [options.emergencyExamMode=false]
 * @param {Date} [options.startDate]
 * @returns {{ plan: Array, insights: object, errors: Array }}
 */
export function generateStudyPlan({
  courses = [],
  assignments = [],
  exams = [],
  availability = [],
  timetable = [],
  transitionBufferMinutes = DEFAULT_TRANSITION_BUFFER_MINUTES,
  syllabusTopics = [],
  existingPlan = [],
  preserveCompleted = true,
  adaptiveSignals = null,
  missedTopicIds = [],
  emergencyExamMode = false,
  startDate = new Date(),
}) {
  if (!availability || availability.length === 0) {
    return {
      plan: [],
      insights: null,
      errors: ['No weekly availability configured. Please add at least one availability window.'],
      timetableConflicts: [],
    };
  }

  // Detect any direct conflicts between user availability windows and scheduled classes
  const timetableConflicts = detectAvailabilityConflicts(
    timetable,
    availability,
    transitionBufferMinutes
  );

  // Adaptive pace multiplier (1.0x to 1.5x)
  const paceMultiplier = Math.max(1.0, Math.min(1.5, adaptiveSignals?.paceMultiplier || 1.0));

  // Preserve completed sessions if requested
  const preservedCompletedSessions = preserveCompleted
    ? existingPlan.filter((s) => s.completed)
    : [];

  const tasks = buildNormalizedTasks({
    courses,
    assignments,
    exams,
    syllabusTopics,
    completedSessions: preservedCompletedSessions,
    adaptiveSignals,
    missedTopicIds,
    emergencyExamMode,
  });

  if (tasks.length === 0) {
    return {
      plan: preservedCompletedSessions,
      insights: null,
      errors: ['No courses, pending assignments, exams, or syllabus topics found to plan for.'],
      timetableConflicts,
    };
  }

  const validDates = tasks
    .map((t) => t.date)
    .filter(Boolean)
    .sort();

  const latestDeadline = validDates[validDates.length - 1] || null;
  const slots = buildPlanningSlots(
    availability,
    latestDeadline,
    startDate,
    timetable,
    transitionBufferMinutes
  );

  if (slots.length === 0) {
    return {
      plan: preservedCompletedSessions,
      insights: null,
      errors: ['No usable study periods between 06:00 and 22:00 within the planning horizon.'],
      timetableConflicts,
    };
  }

  // Track occupancy per date for preserved sessions to prevent overlaps
  const occupiedWindowsByDate = {};
  preservedCompletedSessions.forEach((session) => {
    if (!occupiedWindowsByDate[session.date]) {
      occupiedWindowsByDate[session.date] = [];
    }
    occupiedWindowsByDate[session.date].push({
      start: timeToMinutes(session.startTime),
      end: timeToMinutes(session.endTime),
    });
  });

  // Track daily session count per task for fair spaced repetition
  const dailyTaskCount = {};
  const newGeneratedSessions = [];

  slots.forEach((slot) => {
    let currentTime = slot.startMinutes;
    const sessionDate = parseDate(slot.date);
    const dateKey = slot.date;

    if (!dailyTaskCount[dateKey]) {
      dailyTaskCount[dateKey] = {};
    }

    while (currentTime + MIN_SESSION_MINUTES <= slot.endMinutes) {
      // Check if currentTime overlaps with any preserved completed session
      const existingOccupied = occupiedWindowsByDate[dateKey] || [];
      const overlap = existingOccupied.find(
        (win) => currentTime < win.end && currentTime + MIN_SESSION_MINUTES > win.start
      );

      if (overlap) {
        currentTime = Math.max(currentTime + 5, overlap.end);
        continue;
      }

      // Filter tasks eligible for this slot:
      // Must have remaining minutes AND cannot be scheduled after the deadline
      const eligibleTasks = tasks.filter((task) => {
        if (task.remainingMinutes <= 0) return false;
        const dueDate = parseDate(task.date);
        if (!dueDate) return true;
        return sessionDate <= dueDate;
      });

      if (eligibleTasks.length === 0) break;

      // Check for scheduled classes for courses on this day
      const dayClasses = (timetable || []).filter(
        (t) => t.dayOfWeek?.toLowerCase() === slot.day?.toLowerCase()
      );

      // Sort eligible tasks by current dynamic score on this date with pre/post lecture bonuses
      eligibleTasks.sort((a, b) => {
        const countA = dailyTaskCount[dateKey][a.id] || 0;
        const countB = dailyTaskCount[dateKey][b.id] || 0;
        let scoreA = getTaskScore(a, sessionDate, countA);
        let scoreB = getTaskScore(b, sessionDate, countB);

        // Pre-lecture & post-lecture boosts
        const classA = dayClasses.find(
          (c) =>
            normalizeCourseCode(c.courseCode) === normalizeCourseCode(a.course) ||
            (a.course && c.courseName?.toLowerCase().includes(a.course.toLowerCase()))
        );
        if (classA) {
          const classStartMin = timeToMinutes(classA.startTime);
          if (currentTime + MIN_SESSION_MINUTES <= classStartMin) {
            scoreA += 5.0; // Pre-lecture prep bonus
          } else if (currentTime >= timeToMinutes(classA.endTime)) {
            scoreA += 3.0; // Post-lecture consolidation bonus
          }
        }

        const classB = dayClasses.find(
          (c) =>
            normalizeCourseCode(c.courseCode) === normalizeCourseCode(b.course) ||
            (b.course && c.courseName?.toLowerCase().includes(b.course.toLowerCase()))
        );
        if (classB) {
          const classStartMin = timeToMinutes(classB.startTime);
          if (currentTime + MIN_SESSION_MINUTES <= classStartMin) {
            scoreB += 5.0;
          } else if (currentTime >= timeToMinutes(classB.endTime)) {
            scoreB += 3.0;
          }
        }

        return scoreB - scoreA;
      });

      const chosenTask = eligibleTasks[0];
      const remainingSlotTime = slot.endMinutes - currentTime;
      const sessionLength = Math.min(
        chosenTask.sessionLength,
        chosenTask.remainingMinutes,
        remainingSlotTime
      );

      if (sessionLength < MIN_SESSION_MINUTES) break;

      const sessionStart = currentTime;
      const sessionEnd = currentTime + sessionLength;
      const daysUntilDue = parseDate(chosenTask.date)
        ? daysBetween(sessionDate, parseDate(chosenTask.date))
        : null;

      // Deterministic unique ID
      const sessionId = `session-${chosenTask.id}-${slot.date}-${sessionStart}`;

      // Granular action breakdown
      const actionBreakdown = generateGranularActionBreakdown(chosenTask, sessionLength);

      // Build explainability rationale
      const explanation = [
        `${chosenTask.title} was scheduled using urgency, priority (${chosenTask.priority}), difficulty (${chosenTask.difficulty}), and adaptive pacing.`,
        daysUntilDue !== null
          ? daysUntilDue === 0
            ? 'Due today! Highest scheduling urgency.'
            : `${daysUntilDue} day(s) remain until the deadline/exam.`
          : 'Scheduled based on syllabus progression and priority.',
        chosenTask.isEmergencyMode
          ? '⚡ Scheduled under Emergency Exam Mode: prioritizes high-yield mock problems before the exam.'
          : chosenTask.isMissedRescheduled
          ? '🔄 Rescheduled from your weekly check-in feedback to keep you on track.'
          : `Assigned ${sessionLength} minutes within your ${slot.day} window (${slot.startTime}-${slot.endTime}).`,
        chosenTask.sessionsScheduled > 0
          ? `Session #${chosenTask.sessionsScheduled + 1} for this topic (distributed across days to promote spaced learning).`
          : 'First dedicated study block scheduled for this topic.',
      ];

      // Check if this task was scheduled as pre-lecture prep or post-lecture consolidation
      const lectureOnDay = dayClasses.find(
        (c) =>
          normalizeCourseCode(c.courseCode) === normalizeCourseCode(chosenTask.course) ||
          (chosenTask.course && c.courseName?.toLowerCase().includes(chosenTask.course.toLowerCase()))
      );
      if (lectureOnDay) {
        const classStartMin = timeToMinutes(lectureOnDay.startTime);
        if (sessionEnd <= classStartMin) {
          explanation.unshift(
            `🎒 Pre-lecture prep: scheduled before your ${chosenTask.course} ${lectureOnDay.activityType} (${lectureOnDay.startTime}) to review relevant concepts.`
          );
        } else if (sessionStart >= timeToMinutes(lectureOnDay.endTime)) {
          explanation.unshift(
            `🧠 Post-lecture consolidation: scheduled after your ${chosenTask.course} class to solidify key takeaways.`
          );
        }
      }

      const recommendation =
        chosenTask.isEmergencyMode
          ? 'Emergency Exam Focus: Prioritize high-yield review, formula sheets, and timed sample questions.'
          : chosenTask.type === 'Exam Review'
          ? 'Focus on active recall, concept mapping, and practicing timed mock problems.'
          : chosenTask.type === 'Topic Study'
          ? 'Synthesize lecture notes, work through textbook problem sets, and verify solutions.'
          : chosenTask.category === 'Programming / Software'
          ? 'Implement core modules, test edge cases, and review code structure.'
          : 'Produce concrete milestone progress and review key notes.';

      newGeneratedSessions.push({
        id: sessionId,
        taskId: chosenTask.id,
        date: slot.date,
        day: slot.day,
        startTime: minutesToTime(sessionStart),
        endTime: minutesToTime(sessionEnd),
        type: chosenTask.type,
        title: chosenTask.title,
        course: chosenTask.course,
        courseColor: chosenTask.courseColor,
        targetDate: chosenTask.date,
        priority: chosenTask.priority,
        difficulty: chosenTask.difficulty,
        taskWeight: chosenTask.taskWeight,
        category: chosenTask.category,
        sessionLength,
        completed: false,
        recommendation,
        explanation,
        actionBreakdown,
        isEmergencyMode: chosenTask.isEmergencyMode,
        isEmergencyExam: Boolean(chosenTask.isEmergencyMode && chosenTask.type === 'Exam Review'),
        isMissedRescheduled: chosenTask.isMissedRescheduled,
      });

      chosenTask.remainingMinutes -= sessionLength;
      chosenTask.sessionsScheduled += 1;
      dailyTaskCount[dateKey][chosenTask.id] = (dailyTaskCount[dateKey][chosenTask.id] || 0) + 1;
      currentTime = sessionEnd;

      // Add a 15-minute break if there are still more eligible tasks and enough time left in the slot
      const hasMoreWork = tasks.some((candidate) => {
        if (candidate.remainingMinutes <= 0) return false;
        const dueDate = parseDate(candidate.date);
        return !dueDate || sessionDate <= dueDate;
      });

      if (hasMoreWork && currentTime + BREAK_MINUTES + MIN_SESSION_MINUTES <= slot.endMinutes) {
        newGeneratedSessions.push({
          id: `break-${slot.date}-${currentTime}`,
          date: slot.date,
          day: slot.day,
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(currentTime + BREAK_MINUTES),
          type: 'Break',
          title: 'Rest & Cognitive Recovery',
          course: 'Rest',
          courseColor: '#64748b',
          sessionLength: BREAK_MINUTES,
          completed: false,
          recommendation: 'Step away from screens, hydrate, and stretch before your next session.',
          explanation: ['15-minute interval scheduled between intensive learning blocks to maximize retention.'],
          actionBreakdown: [
            { step: 'Hydrate & Stretch', duration: 5, details: 'Stand up, walk around, rest your eyes.' },
            { step: 'Mental Reset', duration: 10, details: 'Avoid heavy reading or phone doom-scrolling.' },
          ],
        });
        currentTime += BREAK_MINUTES;
      }
    }
  });

  // Combine preserved completed sessions and newly generated sessions
  const combinedPlan = [...preservedCompletedSessions, ...newGeneratedSessions].sort((a, b) => {
    const dateDiff = parseDate(a.date) - parseDate(b.date);
    if (dateDiff !== 0) return dateDiff;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // Compute workload insights & impossible schedule detection
  const taskSessions = combinedPlan.filter((s) => s.type !== 'Break');
  const totalMinutes = taskSessions.reduce((sum, s) => sum + Number(s.sessionLength || 0), 0);

  const categories = {};
  taskSessions.forEach((s) => {
    const cat = s.category || 'General';
    categories[cat] = (categories[cat] || 0) + Number(s.sessionLength || 0);
  });

  // Identify work that could not be scheduled before its deadline
  const unscheduledTasks = tasks
    .filter((task) => task.remainingMinutes > 0)
    .map((task) => ({
      id: task.id,
      title: task.title,
      course: task.course,
      date: task.date,
      priority: task.priority,
      remainingMinutes: task.remainingMinutes,
      deficitHours: (task.remainingMinutes / 60).toFixed(1),
    }));

  const hardestCourse =
    [...tasks].sort((a, b) => (LEVEL_VALUE[b.difficulty] || 0) - (LEVEL_VALUE[a.difficulty] || 0))[0]
      ?.course || 'None';

  const nearestDeadline =
    [...tasks]
      .filter((t) => t.date)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0] || null;

  const insights = {
    totalMinutes,
    totalSessions: taskSessions.length,
    completedSessions: taskSessions.filter((s) => s.completed).length,
    hardestCourse,
    nearestDeadline: nearestDeadline ? `${nearestDeadline.title} (${nearestDeadline.date})` : 'None',
    categories,
    unscheduledTasks,
    hasImpossibleSchedule: unscheduledTasks.length > 0,
    emergencyModeActive: emergencyExamMode,
    adaptivePaceApplied: paceMultiplier,
    timetableConflicts,
    recommendation:
      unscheduledTasks.length === 0
        ? timetableConflicts.length > 0
          ? `All planned workload fitted before deadlines. Notice: ${timetableConflicts.length} study slot(s) conflicted with scheduled classes and were automatically buffered around them.`
          : 'All planned workload successfully fitted into your availability before deadlines.'
        : `Warning: ${unscheduledTasks.length} task(s) exceed available hours before deadline. Add availability or reduce scope.`,
  };

  return {
    plan: combinedPlan,
    insights,
    errors: [],
    timetableConflicts,
  };
}
