/**
 * Academic Coach Domain Engine — My Academia Buddy 2.0
 * 
 * Provides:
 * - Dynamic, contextual weekly check-in question generation
 * - Observable course readiness indexing (transparent, non-predictive)
 * - Adaptive behavioral pace calibration (non-punitive, supportive)
 * - Missed topic identification for automatic schedule adaptation
 */

/**
 * Valid check-in response answer types
 */
export const CHECK_IN_ANSWERS = {
  COMPLETED: 'completed',
  PARTIALLY_COMPLETED: 'partially_completed',
  NOT_STARTED: 'not_started',
  SKIPPED: 'skipped',
  NOT_APPLICABLE: 'not_applicable',
  UNSURE: 'unsure',
};

/**
 * Status weights for calculating observable topic progress
 */
const TOPIC_STATUS_WEIGHTS = {
  reviewed: 1.0,
  practiced: 0.85,
  reading_completed: 0.6,
  attended_lecture: 0.35,
  not_started: 0.0,
};

/**
 * Generates personalized weekly check-in questions based on active courses and syllabus topics
 * 
 * @param {Array} courses Registered courses
 * @param {Array} topics Syllabus topics
 * @param {Array} checkInHistory Previous check-in logs
 * @returns {Array} List of specific questions
 */
export function generateWeeklyCheckInQuestions(arg1 = [], arg2 = [], arg3 = []) {
  let courses;
  let topics;
  let checkInHistory;

  if (!Array.isArray(arg1) && typeof arg1 === 'object') {
    courses = arg1.courses || [];
    topics = arg1.syllabusTopics || arg1.topics || [];
    checkInHistory = arg1.checkInHistory || arg1.checkIns || [];
  } else {
    courses = Array.isArray(arg1) ? arg1 : [];
    topics = Array.isArray(arg2) ? arg2 : [];
    checkInHistory = Array.isArray(arg3) ? arg3 : [];
  }

  if (!courses || courses.length === 0) {
    const defaultText = 'Do you have all your courses and weekly syllabi registered in Academia Buddy?';
    return [
      {
        id: 'q-general-setup',
        courseName: 'General',
        topicId: null,
        topicTitle: 'Semester Setup',
        question: defaultText,
        questionText: defaultText,
        type: 'status',
        options: ['completed', 'partially_completed', 'not_started'],
      },
    ];
  }

  const questions = [];
  const previouslyCoveredTopicIds = new Set();

  // Track topics asked in the most recent check-in
  if (checkInHistory.length > 0) {
    const latest = checkInHistory[0];
    if (latest && Array.isArray(latest.responses)) {
      latest.responses.forEach((r) => {
        if (r.topicId && r.answer === CHECK_IN_ANSWERS.COMPLETED) {
          previouslyCoveredTopicIds.add(r.topicId);
        }
      });
    }
  }

  // Iterate through active courses and find topics needing check-in
  courses.forEach((course) => {
    const courseTopics = topics.filter(
      (t) => (t.courseId === course.id || t.courseName === course.name)
    );

    // Filter topics that are in progress or not yet fully reviewed
    const candidateTopics = courseTopics.filter(
      (t) =>
        !previouslyCoveredTopicIds.has(t.id) &&
        !(t.status === 'reviewed' && (t.confidence ?? 3) >= 4)
    );

    // Pick 1 primary focal topic per course for a realistic 2-minute check-in
    const focalTopics = candidateTopics.slice(0, 1);

    focalTopics.forEach((topic) => {
      // 1. Lecture & concept engagement question
      const lectureQ = `Did you attend the lecture or review the primary notes for ${course.name} on "${topic.title}"?`;
      questions.push({
        id: `q-lecture-${topic.id}`,
        courseName: course.name,
        topicId: topic.id,
        topicTitle: topic.title,
        question: lectureQ,
        questionText: lectureQ,
        type: 'topic_lecture',
        field: 'lecture',
        options: [
          CHECK_IN_ANSWERS.COMPLETED,
          CHECK_IN_ANSWERS.PARTIALLY_COMPLETED,
          CHECK_IN_ANSWERS.NOT_STARTED,
          CHECK_IN_ANSWERS.SKIPPED,
        ],
      });

      // 2. Reading or practice exercise question if specified in syllabus
      const readingText = topic.requiredReading || topic.requiredReadings;
      if (topic.practiceProblems) {
        const practiceQ = `How much of the practice exercises for "${topic.title}" (${topic.practiceProblems}) were you able to complete?`;
        questions.push({
          id: `q-practice-${topic.id}`,
          courseName: course.name,
          topicId: topic.id,
          topicTitle: topic.title,
          question: practiceQ,
          questionText: practiceQ,
          type: 'topic_practice',
          field: 'practice',
          options: [
            CHECK_IN_ANSWERS.COMPLETED,
            CHECK_IN_ANSWERS.PARTIALLY_COMPLETED,
            CHECK_IN_ANSWERS.NOT_STARTED,
            CHECK_IN_ANSWERS.UNSURE,
          ],
        });
      } else if (readingText) {
        const readingQ = `Did you complete the required reading for "${topic.title}" (${readingText})?`;
        questions.push({
          id: `q-reading-${topic.id}`,
          courseName: course.name,
          topicId: topic.id,
          topicTitle: topic.title,
          question: readingQ,
          questionText: readingQ,
          type: 'topic_reading',
          field: 'reading',
          options: [
            CHECK_IN_ANSWERS.COMPLETED,
            CHECK_IN_ANSWERS.PARTIALLY_COMPLETED,
            CHECK_IN_ANSWERS.NOT_STARTED,
            CHECK_IN_ANSWERS.SKIPPED,
          ],
        });
      }

      // 3. Confidence level prompt
      const confQ = `How confident do you feel applying the concepts from "${topic.title}" on an exam right now?`;
      questions.push({
        id: `q-confidence-${topic.id}`,
        courseName: course.name,
        topicId: topic.id,
        topicTitle: topic.title,
        question: confQ,
        questionText: confQ,
        type: 'confidence',
        field: 'confidence',
        options: [1, 2, 3, 4, 5],
      });
    });
  });

  // Always append commitments / schedule question
  const commitQ = 'Do you have any new work shifts, travel, or new commitments coming up next week?';
  questions.push({
    id: 'q-new-commitments',
    courseName: 'General',
    topicId: null,
    topicTitle: 'Schedule & Life Commitments',
    question: commitQ,
    questionText: commitQ,
    type: 'commitment_update',
    field: 'commitments',
  });

  return questions;
}

/**
 * Calculates a transparent observable readiness score for a course
 * 
 * @param {object} course
 * @param {Array} topics Syllabus topics for this course
 * @param {Array} assignments Assignments for this course
 * @param {Array} exams Exams for this course
 * @returns {object} Readiness metrics & transparent assessment
 */
export function calculateCourseReadiness(course, topics = [], assignments = [], exams = []) {
  const courseTopics = topics.filter(
    (t) => t.courseId === course.id || t.courseName === course.name
  );
  const courseAssignments = assignments.filter((a) => a.course === course.name);
  const courseExams = exams.filter((e) => e.course === course.name);

  // 1. Topic Progress Score (0 to 100)
  let topicScore = 0;
  if (courseTopics.length > 0) {
    const totalWeighted = courseTopics.reduce(
      (sum, t) => sum + (TOPIC_STATUS_WEIGHTS[t.status] || 0),
      0
    );
    topicScore = Math.round((totalWeighted / courseTopics.length) * 100);
  }

  // 2. Average Self-Reported Confidence (1 to 5 converted to 20-100%)
  let confidenceScore = 60; // neutral default
  if (courseTopics.length > 0) {
    const reported = courseTopics.filter((t) => typeof t.confidence === 'number' && t.confidence > 0);
    if (reported.length > 0) {
      const avg = reported.reduce((sum, t) => sum + t.confidence, 0) / reported.length;
      confidenceScore = Math.round((avg / 5) * 100);
    }
  }

  // 3. Assignment Completion Rate
  let assignmentScore = 100;
  if (courseAssignments.length > 0) {
    const completedCount = courseAssignments.filter((a) => a.completed).length;
    assignmentScore = Math.round((completedCount / courseAssignments.length) * 100);
  }

  // Combined Readiness Calculation:
  // 50% Observable Topic Milestones + 25% Assignment Completion + 25% Confidence
  const overallReadiness = Math.round(
    topicScore * 0.5 + assignmentScore * 0.25 + confidenceScore * 0.25
  );

  // Nearest Exam Analysis
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingExams = courseExams
    .filter((e) => {
      if (!e.date) return false;
      return new Date(`${e.date}T23:59:59`) >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const nearestExam = upcomingExams[0] || null;
  let daysToExam = null;
  let isExamUrgent = false;

  if (nearestExam && nearestExam.date) {
    const examDate = new Date(`${nearestExam.date}T12:00:00`);
    daysToExam = Math.max(0, Math.ceil((examDate - today) / (1000 * 60 * 60 * 24)));
    if (daysToExam <= 5 && overallReadiness < 65) {
      isExamUrgent = true;
    }
  }

  // Descriptive status label
  let statusTier;
  let statusBadge;

  if (isExamUrgent) {
    statusTier = 'Exam Critical';
    statusBadge = 'badge-danger';
  } else if (overallReadiness >= 80) {
    statusTier = 'High Readiness';
    statusBadge = 'badge-success';
  } else if (overallReadiness >= 60) {
    statusTier = 'Solid Progress';
    statusBadge = 'badge-info';
  } else if (overallReadiness >= 40) {
    statusTier = 'Needs Focus';
    statusBadge = 'badge-warning';
  } else {
    statusTier = 'Catch-Up Needed';
    statusBadge = 'badge-danger';
  }

  return {
    courseId: course.id || course.name,
    courseName: course.name,
    overallReadiness,
    topicScore,
    confidenceScore,
    assignmentScore,
    totalTopics: courseTopics.length,
    completedTopics: courseTopics.filter((t) => t.status === 'practiced' || t.status === 'reviewed').length,
    statusTier,
    statusBadge,
    readinessScore: overallReadiness,
    tier: overallReadiness >= 80 ? 'High' : overallReadiness >= 50 ? 'Moderate' : 'Needs Attention',
    tierColor:
      statusBadge === 'badge-success'
        ? '#10b981'
        : statusBadge === 'badge-warning'
        ? '#f59e0b'
        : statusBadge === 'badge-info'
        ? '#06b6d4'
        : '#ef4444',
    hasExamUrgency: isExamUrgent,
    daysToNearestExam: daysToExam,
    topicProgress: {
      total: courseTopics.length,
      completed: courseTopics.filter((t) => t.status === 'practiced' || t.status === 'reviewed').length,
    },
    assignmentProgress: {
      total: courseAssignments.length,
      completed: courseAssignments.filter((a) => a.completed).length,
    },
    avgConfidence:
      courseTopics.length > 0
        ? Math.round(
            (courseTopics.reduce((sum, t) => sum + (t.confidence || 3), 0) / courseTopics.length) * 10
          ) / 10
        : 3.0,
    nearestExam: nearestExam
      ? {
          title: nearestExam.title,
          date: nearestExam.date,
          daysRemaining: daysToExam,
          isUrgent: isExamUrgent,
        }
      : null,
    disclaimer:
      'Readiness is calculated transparently from completed topics, readings, exercises, and submitted assignments. It is an organizational progress meter, not a scientific predictor of exam success.',
  };
}

/**
 * Recalibrates student adaptive pacing signals based on recent check-ins and session completion
 * Non-punitive: adapts workload assumptions with supportive coaching tone
 * 
 * @param {Array} checkIns List of past check-ins
 * @param {Array} studyPlan Current study sessions
 * @param {object} existingSignals Current signals
 * @returns {object} Updated adaptive signals
 */
export function recalibrateAdaptiveSignals(arg1 = [], arg2 = [], arg3 = {}) {
  let checkIns;
  let studyPlan;
  let existingSignals;

  if (!Array.isArray(arg1) && typeof arg1 === 'object') {
    // Called as (existingSignals, checkIns, studyPlan)
    existingSignals = arg1 || {};
    checkIns = Array.isArray(arg2) ? arg2 : arg2 ? [arg2] : [];
    studyPlan = Array.isArray(arg3) ? arg3 : [];
  } else {
    // Called as (checkIns, studyPlan, existingSignals)
    checkIns = Array.isArray(arg1) ? arg1 : arg1 ? [arg1] : [];
    studyPlan = Array.isArray(arg2) ? arg2 : [];
    existingSignals = (!Array.isArray(arg3) && typeof arg3 === 'object') ? arg3 : {};
  }

  // Count observed completed sessions from study plan
  const completedPlanCount = Array.isArray(studyPlan)
    ? studyPlan.filter((s) => s.completed).length
    : 0;

  const defaultSignals = {
    completionRate: 100,
    taskCompletionConsistency: 100,
    paceMultiplier: 1.0,
    missedSessionsCount: 0,
    postponementCount: 0,
    preferredSessionDuration: 60,
    observedVelocityByCourse: {},
    lastRecalibrationDate: new Date().toISOString(),
    coachInsight: 'Your study plan is calibrated to your current schedule.',
  };

  const current = {
    ...defaultSignals,
    ...existingSignals,
    completionRate: existingSignals.taskCompletionConsistency ?? existingSignals.completionRate ?? 100,
  };

  if (!checkIns || checkIns.length === 0) {
    return current;
  }

  // Extract recent responses (from latest 3 check-ins)
  const recentCheckIns = checkIns.slice(0, 3);
  let totalTasksEvaluated = 0;
  let incompleteCount = 0;
  let lowConfidenceCount = 0;
  const courseIncompleteCounts = {};

  recentCheckIns.forEach((checkIn) => {
    const responseItems = checkIn.responses || checkIn.answers || [];
    responseItems.forEach((resp) => {
      const respType = resp.type || 'status';
      if (respType === 'status' || !resp.type) {
        totalTasksEvaluated += 1;
        if (
          resp.answer === CHECK_IN_ANSWERS.NOT_STARTED ||
          resp.answer === CHECK_IN_ANSWERS.PARTIALLY_COMPLETED ||
          resp.answer === CHECK_IN_ANSWERS.SKIPPED ||
          resp.answer === 'not_started' ||
          resp.answer === 'partially_completed' ||
          resp.answer === 'skipped'
        ) {
          incompleteCount += 1;
          const cName = resp.courseName || 'General';
          courseIncompleteCounts[cName] = (courseIncompleteCounts[cName] || 0) + 1;
        }
      } else if (respType === 'confidence') {
        if (Number(resp.answer) <= 2) {
          lowConfidenceCount += 1;
        }
      }
    });
  });

  // Calculate completion velocity (0% - 100%)
  const completionRate =
    totalTasksEvaluated > 0
      ? Math.round(((totalTasksEvaluated - incompleteCount) / totalTasksEvaluated) * 100)
      : current.completionRate;

  // Adaptive Pace Multiplier:
  // If tasks are frequently incomplete or confidence is low, increase estimated duration (e.g. 1.1x to 1.35x)
  let paceMultiplier = 1.0;

  if (completionRate < 60) {
    paceMultiplier = 1.3; // Give 30% more buffer time per task
  } else if (completionRate < 80) {
    paceMultiplier = 1.15; // Give 15% more buffer time per task
  } else if (completionRate >= 95 && lowConfidenceCount === 0) {
    paceMultiplier = 1.0; // Optimal steady pace
  }

  // Course velocity adjustments
  const observedVelocityByCourse = { ...current.observedVelocityByCourse };
  Object.keys(courseIncompleteCounts).forEach((cName) => {
    if (courseIncompleteCounts[cName] >= 2) {
      observedVelocityByCourse[cName] = 1.25;
    }
  });

  // Generate supportive, constructive coaching insight
  let coachInsight = 'Your study plan is calibrated and balanced across your courses.';

  if (paceMultiplier >= 1.25) {
    coachInsight =
      'We noticed several syllabus topics needed more time than estimated. We have adjusted your upcoming sessions with +25% buffer time so you have breathing room without feeling rushed.';
  } else if (paceMultiplier > 1.0) {
    coachInsight =
      'Adaptive pacing active: We added a modest time buffer to your technical study blocks based on your recent check-in feedback.';
  } else if (completionRate >= 90) {
    coachInsight =
      'Outstanding consistency! You are progressing through syllabus topics on schedule. Keep protecting your scheduled breaks.';
  }

  return {
    completionRate,
    taskCompletionConsistency: completionRate,
    paceMultiplier,
    missedSessionsCount: incompleteCount,
    completedSessionsCount: completedPlanCount,
    postponementCount: current.postponementCount,
    preferredSessionDuration: current.preferredSessionDuration,
    observedVelocityByCourse,
    lastRecalibrationDate: new Date().toISOString(),
    coachInsight,
  };
}

/**
 * Identifies topics from the latest check-in that require automatic rescheduling
 * 
 * @param {Array} checkIns List of check-ins OR topics list if called as (topics, currentWeek)
 * @param {Array|number} topics Syllabus topics OR current week number
 * @returns {Array} List of topics that need study session priority
 */
export function identifyMissedTopicsForRescheduling(arg1 = [], arg2 = []) {
  if (Array.isArray(arg1) && arg1.length > 0 && typeof arg1[0]?.week === 'number') {
    // Called as (topics, currentWeek)
    const topics = arg1;
    const currentWeek = typeof arg2 === 'number' ? arg2 : 1;
    return topics.filter((t) => t.week < currentWeek && t.status !== 'reviewed');
  }

  const checkIns = Array.isArray(arg1) ? arg1 : [];
  const topics = Array.isArray(arg2) ? arg2 : [];
  if (checkIns.length === 0) return [];

  const latest = checkIns[0];
  if (!latest) return [];
  const responseItems = latest.responses || latest.answers || [];

  const missedTopicIds = new Set();
  responseItems.forEach((r) => {
    if (
      r.topicId &&
      (r.answer === CHECK_IN_ANSWERS.NOT_STARTED ||
        r.answer === CHECK_IN_ANSWERS.PARTIALLY_COMPLETED ||
        r.answer === CHECK_IN_ANSWERS.SKIPPED ||
        r.answer === 'not_started' ||
        r.answer === 'partially_completed' ||
        r.answer === 'skipped')
    ) {
      missedTopicIds.add(r.topicId);
    }
  });

  return topics.filter((t) => missedTopicIds.has(t.id));
}
