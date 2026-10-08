/**
 * Storage Service — My Academia Buddy (Schema v3: Academic Coach Edition)
 * Provides safe, validated, versioned localStorage persistence with schema migrations
 * for student profile, syllabus topics, weekly check-ins, adaptive signals, and JSON backups.
 */

const STORAGE_VERSION_KEY = 'mab_storage_version';
const CURRENT_STORAGE_VERSION = 3;

export const STORAGE_KEYS = {
  COURSES: 'courses',
  ASSIGNMENTS: 'assignments',
  EXAMS: 'exams',
  AVAILABILITY: 'availability',
  STUDY_PLAN: 'studyPlan',
  STUDY_INSIGHTS: 'studyInsights',
  // Schema v3 — Academic Coach additions
  STUDENT_PROFILE: 'studentProfile',
  SYLLABUS_TOPICS: 'syllabusTopics',
  CHECK_INS: 'checkIns',
  ADAPTIVE_SIGNALS: 'adaptiveSignals',
};

/**
 * Safely parse JSON from localStorage with fallback
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function safeGetItem(key, fallback) {
  try {
    const item = window.localStorage.getItem(key);
    if (item === null || item === undefined || item === '') {
      return fallback;
    }
    const parsed = JSON.parse(item);
    return parsed ?? fallback;
  } catch (error) {
    console.warn(`[storageService] Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely set JSON in localStorage
 * @param {string} key
 * @param {any} value
 * @returns {boolean} True if successfully stored
 */
export function safeSetItem(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[storageService] Error setting localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Removes an item from localStorage
 * @param {string} key
 */
export function safeRemoveItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`[storageService] Error removing key "${key}":`, error);
  }
}

/**
 * Default student profile template (neutral, supportive, skippable)
 */
export function getDefaultStudentProfile() {
  return {
    program: 'Computer Science',
    semester: 'Undergraduate',
    organizationLevel: 'Building Habits', // "Building Habits" | "Moderately Organized" | "Highly Structured"
    preferredStudyPeriods: ['afternoon', 'evening'],
    weeklyWorkHours: 10,
    workScheduleSummary: '',
    recurringCommitments: [],
    weeklyStudyGoalHours: 18,
    academicGoal: 'Build consistent study habits and balance coursework without burnout',
    preferredLanguage: 'en',
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Default adaptive signals baseline (non-judgmental, objective starting point)
 */
export function getDefaultAdaptiveSignals() {
  return {
    completionRate: 100, // % of scheduled tasks completed
    paceMultiplier: 1.0, // 1.0 = on schedule, 1.2 = needs 20% more time
    missedSessionsCount: 0,
    postponementCount: 0,
    preferredSessionDuration: 60, // minutes
    observedVelocityByCourse: {},
    lastRecalibrationDate: new Date().toISOString(),
    coachInsight: 'Welcome to your adaptive semester coach! Complete your first weekly check-in to calibrate your personalized pace.',
  };
}

/**
 * Generates starter syllabus topics for a given course
 * @param {object} course
 * @returns {Array}
 */
export function generateDefaultTopicsForCourse(course) {
  return [
    {
      id: `topic-${course.id}-1`,
      courseId: course.id,
      courseName: course.name,
      weekNumber: 1,
      title: 'Course Foundations & Core Concepts',
      description: 'Introductory methodology, syllabus requirements, and key definitions.',
      requiredReadings: 'Chapter 1 & Course Syllabus',
      practiceProblems: 'Introductory Exercises 1-5',
      estimatedHours: 2.5,
      prerequisiteTopicIds: [],
      status: 'reading_completed', // not_started | attended_lecture | reading_completed | practiced | reviewed
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: `topic-${course.id}-2`,
      courseId: course.id,
      courseName: course.name,
      weekNumber: 2,
      title: 'Theoretical Models & Primary Methods',
      description: 'Formal techniques, problem setup, and algorithmic/conceptual patterns.',
      requiredReadings: 'Chapter 2, pages 25-60',
      practiceProblems: 'Problem Set 1 (Questions 1-4)',
      estimatedHours: 3.5,
      prerequisiteTopicIds: [`topic-${course.id}-1`],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: `topic-${course.id}-3`,
      courseId: course.id,
      courseName: course.name,
      weekNumber: 3,
      title: 'Advanced Applied Problem Solving',
      description: 'Complex problem analysis, edge cases, and midterm preparation exercises.',
      requiredReadings: 'Chapter 3 & Supplementary Lecture Notes',
      practiceProblems: 'Problem Set 2 & Practice Mock Questions',
      estimatedHours: 4.0,
      prerequisiteTopicIds: [`topic-${course.id}-2`],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
  ];
}

/**
 * Normalize and migrate legacy data models (v1/v2 to v3)
 */
export function migrateStorage() {
  const currentVersion = Number(safeGetItem(STORAGE_VERSION_KEY, 1));

  if (currentVersion < 2) {
    // Migrate courses to v2
    const courses = safeGetItem(STORAGE_KEYS.COURSES, []);
    const migratedCourses = courses.map((course) => ({
      id: course.id || Date.now(),
      name: course.name || 'Untitled Course',
      instructor: course.instructor || '',
      schedule: course.schedule || '',
      credits: course.credits || '3.0',
      difficulty: course.difficulty || 'Medium',
      color: course.color || '#3b82f6',
      createdAt: course.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.COURSES, migratedCourses);

    // Migrate assignments to v2
    const assignments = safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []);
    const migratedAssignments = assignments.map((assignment) => ({
      id: assignment.id || Date.now(),
      title: assignment.title || 'Untitled Assignment',
      course: assignment.course || '',
      dueDate: assignment.dueDate || '',
      priority: assignment.priority || 'Medium',
      estimatedWorkload: assignment.estimatedWorkload ? Number(assignment.estimatedWorkload) : 3,
      completed: Boolean(assignment.completed),
      createdAt: assignment.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.ASSIGNMENTS, migratedAssignments);

    // Migrate exams to v2
    const exams = safeGetItem(STORAGE_KEYS.EXAMS, []);
    const migratedExams = exams.map((exam) => ({
      id: exam.id || Date.now(),
      title: exam.title || `${exam.course || 'Course'} Exam`,
      course: exam.course || '',
      date: exam.date || '',
      location: exam.location || '',
      notes: exam.notes || '',
      priority: exam.priority || 'High',
      estimatedWorkload: exam.estimatedWorkload ? Number(exam.estimatedWorkload) : 5,
      createdAt: exam.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.EXAMS, migratedExams);
  }

  if (currentVersion < 3) {
    // Schema v3: Academic Coach additions
    // 1. Student Profile
    const existingProfile = safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, null);
    if (!existingProfile) {
      safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile());
    }

    // 2. Syllabus Topics
    const existingTopics = safeGetItem(STORAGE_KEYS.SYLLABUS_TOPICS, []);
    if (!Array.isArray(existingTopics) || existingTopics.length === 0) {
      const activeCourses = safeGetItem(STORAGE_KEYS.COURSES, []);
      const generatedTopics = [];
      activeCourses.forEach((c) => {
        generatedTopics.push(...generateDefaultTopicsForCourse(c));
      });
      safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, generatedTopics);
    }

    // 3. Check-Ins
    const existingCheckIns = safeGetItem(STORAGE_KEYS.CHECK_INS, null);
    if (!Array.isArray(existingCheckIns)) {
      safeSetItem(STORAGE_KEYS.CHECK_INS, []);
    }

    // 4. Adaptive Signals
    const existingSignals = safeGetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, null);
    if (!existingSignals) {
      safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals());
    }

    // Mark storage as version 3
    safeSetItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  }
}

/**
 * Export all application data as a formatted JSON string
 * @returns {string}
 */
export function exportAllData() {
  const payload = {
    appName: 'My Academia Buddy',
    version: CURRENT_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      courses: safeGetItem(STORAGE_KEYS.COURSES, []),
      assignments: safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []),
      exams: safeGetItem(STORAGE_KEYS.EXAMS, []),
      availability: safeGetItem(STORAGE_KEYS.AVAILABILITY, []),
      studyPlan: safeGetItem(STORAGE_KEYS.STUDY_PLAN, []),
      studyInsights: safeGetItem(STORAGE_KEYS.STUDY_INSIGHTS, null),
      // Schema v3 additions
      studentProfile: safeGetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile()),
      syllabusTopics: safeGetItem(STORAGE_KEYS.SYLLABUS_TOPICS, []),
      checkIns: safeGetItem(STORAGE_KEYS.CHECK_INS, []),
      adaptiveSignals: safeGetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals()),
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and imports data from a JSON object or string
 * @param {string|object} jsonSource
 * @returns {{ success: boolean, message: string }}
 */
export function importAllData(jsonSource) {
  try {
    const parsed = typeof jsonSource === 'string' ? JSON.parse(jsonSource) : jsonSource;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) {
      return { success: false, message: 'Invalid backup file format: missing root "data" object.' };
    }

    const {
      courses,
      assignments,
      exams,
      availability,
      studyPlan,
      studyInsights,
      studentProfile,
      syllabusTopics,
      checkIns,
      adaptiveSignals,
    } = parsed.data;

    if (Array.isArray(courses)) safeSetItem(STORAGE_KEYS.COURSES, courses);
    if (Array.isArray(assignments)) safeSetItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    if (Array.isArray(exams)) safeSetItem(STORAGE_KEYS.EXAMS, exams);
    if (Array.isArray(availability)) safeSetItem(STORAGE_KEYS.AVAILABILITY, availability);
    if (Array.isArray(studyPlan)) safeSetItem(STORAGE_KEYS.STUDY_PLAN, studyPlan);
    if (studyInsights) safeSetItem(STORAGE_KEYS.STUDY_INSIGHTS, studyInsights);

    if (studentProfile) safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, studentProfile);
    if (Array.isArray(syllabusTopics)) safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, syllabusTopics);
    if (Array.isArray(checkIns)) safeSetItem(STORAGE_KEYS.CHECK_INS, checkIns);
    if (adaptiveSignals) safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, adaptiveSignals);

    safeSetItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
    return { success: true, message: 'Data imported successfully!' };
  } catch (error) {
    return { success: false, message: `Import failed: ${error.message}` };
  }
}

/**
 * Resets all application data to empty defaults
 */
export function clearAllData() {
  safeSetItem(STORAGE_KEYS.COURSES, []);
  safeSetItem(STORAGE_KEYS.ASSIGNMENTS, []);
  safeSetItem(STORAGE_KEYS.EXAMS, []);
  safeSetItem(STORAGE_KEYS.AVAILABILITY, []);
  safeSetItem(STORAGE_KEYS.STUDY_PLAN, []);
  safeRemoveItem(STORAGE_KEYS.STUDY_INSIGHTS);
  safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, getDefaultStudentProfile());
  safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, []);
  safeSetItem(STORAGE_KEYS.CHECK_INS, []);
  safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, getDefaultAdaptiveSignals());
}

/**
 * Populates sample demo data with realistic academic courses, syllabus topics, and coach history
 */
export function loadSampleDemoData() {
  const sampleCourses = [
    {
      id: 101,
      name: 'SEG2105',
      instructor: 'Dr. Timothy Lethbridge',
      schedule: 'Mon / Wed 10:00 - 11:30',
      credits: '3.0',
      difficulty: 'High',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    },
    {
      id: 102,
      name: 'CSI2110',
      instructor: 'Dr. Lucia Moura',
      schedule: 'Tue / Thu 13:00 - 14:30',
      credits: '3.0',
      difficulty: 'High',
      color: '#8b5cf6',
      createdAt: new Date().toISOString(),
    },
    {
      id: 103,
      name: 'MAT1348',
      instructor: 'Prof. Joseph Khoury',
      schedule: 'Mon / Fri 08:30 - 10:00',
      credits: '3.0',
      difficulty: 'Medium',
      color: '#10b981',
      createdAt: new Date().toISOString(),
    },
    {
      id: 104,
      name: 'ENG1112',
      instructor: 'Prof. Sarah Jenkins',
      schedule: 'Wed 14:30 - 17:30',
      credits: '3.0',
      difficulty: 'Low',
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
    },
  ];

  const now = new Date();
  const addDays = (d, days) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  };

  const sampleAssignments = [
    {
      id: 201,
      title: 'Sprint 2 Architecture Document',
      course: 'SEG2105',
      dueDate: addDays(now, 3),
      priority: 'High',
      estimatedWorkload: 6,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 202,
      title: 'Binary Search Tree & Heap Assignment',
      course: 'CSI2110',
      dueDate: addDays(now, 5),
      priority: 'High',
      estimatedWorkload: 4,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 203,
      title: 'Propositional Logic Problem Set',
      course: 'MAT1348',
      dueDate: addDays(now, 8),
      priority: 'Medium',
      estimatedWorkload: 3,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 204,
      title: 'Technical Communication Draft',
      course: 'ENG1112',
      dueDate: addDays(now, 12),
      priority: 'Low',
      estimatedWorkload: 2,
      completed: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleExams = [
    {
      id: 301,
      title: 'Midterm Exam 1',
      course: 'CSI2110',
      date: addDays(now, 7),
      location: 'Marion Hall 150',
      notes: 'Covers Complexity Analysis, Stacks, Queues, Heaps, and Trees',
      priority: 'High',
      estimatedWorkload: 8,
      createdAt: new Date().toISOString(),
    },
    {
      id: 302,
      title: 'Midterm Exam 2',
      course: 'MAT1348',
      date: addDays(now, 14),
      location: 'Montpetit 202',
      notes: 'Truth tables, proofs by induction, and graph theory',
      priority: 'Medium',
      estimatedWorkload: 6,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleAvailability = [
    { id: 401, day: 'Monday', startTime: '13:00', endTime: '17:00' },
    { id: 402, day: 'Tuesday', startTime: '15:00', endTime: '19:00' },
    { id: 403, day: 'Wednesday', startTime: '13:00', endTime: '17:00' },
    { id: 404, day: 'Thursday', startTime: '15:00', endTime: '19:00' },
    { id: 405, day: 'Friday', startTime: '10:00', endTime: '15:00' },
    { id: 406, day: 'Saturday', startTime: '10:00', endTime: '16:00' },
  ];

  // Schema v3: Academic Coach Syllabus Topics
  const sampleTopics = [
    // CSI2110 Topics
    {
      id: 'topic-csi2110-1',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 3,
      title: 'Binary Heaps & Priority Queues',
      description: 'Heap order property, up-heap/down-heap bubbling, array representation.',
      requiredReadings: 'Goodrich Chapter 8, sections 8.1 - 8.3',
      practiceProblems: 'Exercises 8.4, 8.7, 8.12 (Heap building complexity)',
      estimatedHours: 3.5,
      prerequisiteTopicIds: [],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-2',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 4,
      title: 'Binary Search Trees & AVL Rotations',
      description: 'Search tree invariants, single and double AVL tree balance rotations.',
      requiredReadings: 'Goodrich Chapter 10, sections 10.1 - 10.2',
      practiceProblems: 'Problem Set 3: Trace insertion of keys [14, 17, 11, 7, 53, 4] into AVL tree',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-csi2110-1'],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-3',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 5,
      title: 'Graph Traversals: BFS & DFS',
      description: 'Adjacency lists vs matrices, topological sorting, cycle detection.',
      requiredReadings: 'Goodrich Chapter 14, sections 14.1 - 14.3',
      practiceProblems: 'Implement BFS shortest path algorithm in Java',
      estimatedHours: 4.5,
      prerequisiteTopicIds: ['topic-csi2110-2'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },

    // SEG2105 Topics
    {
      id: 'topic-seg2105-1',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 3,
      title: 'Client-Server Architecture & Communication Protocols',
      description: 'Sockets, REST interfaces, concurrency, and thread safety.',
      requiredReadings: 'Lethbridge Chapter 6: Architectural Patterns',
      practiceProblems: 'Sprint 2 Milestone Architecture Document',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'reading_completed',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-2',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 4,
      title: 'Design Patterns: Factory, Observer & Singleton',
      description: 'Gang of Four behavioral and creational design patterns with clean refactoring.',
      requiredReadings: 'Lethbridge Chapter 8: Design Patterns',
      practiceProblems: 'Refactor notification subsystem to use Observer pattern',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-seg2105-1'],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },

    // MAT1348 Topics
    {
      id: 'topic-mat1348-1',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 3,
      title: 'Propositional Equivalences & Truth Tables',
      description: 'De Morgan laws, disjunctive normal form (DNF), logical validity.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 1.3',
      practiceProblems: 'Problem Set 2: Simplify composite propositions using laws of equivalence',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-2',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 4,
      title: 'Mathematical Induction & Well-Ordering Principle',
      description: 'Base case, inductive hypothesis, strong induction proofs.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 5.1 - 5.2',
      practiceProblems: 'Prove inequality 2^n > n^2 for n >= 5 by mathematical induction',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-mat1348-1'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
  ];

  const sampleProfile = {
    program: 'Software Engineering (B.A.Sc.)',
    semester: 'Year 2, Fall Term',
    organizationLevel: 'Building Consistency',
    preferredStudyPeriods: ['afternoon', 'evening'],
    weeklyWorkHours: 12,
    workScheduleSummary: 'Part-time IT support: Tue & Thu evenings (17:30 - 21:30)',
    recurringCommitments: ['IEEE Student Branch (Wed 18:00)', 'Campus Commute (45m/day)'],
    weeklyStudyGoalHours: 20,
    academicGoal: 'Stay ahead of CSI2110 & MAT1348 midterms while working part-time',
    preferredLanguage: 'en',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  };

  const sampleCheckIns = [
    {
      id: 'checkin-w3',
      weekNumber: 3,
      date: addDays(now, -4),
      responses: [
        {
          topicId: 'topic-csi2110-1',
          courseName: 'CSI2110',
          topicTitle: 'Binary Heaps & Priority Queues',
          questionText: 'Did you attend your CSI2110 lecture on Binary Heaps & Priority Queues?',
          answer: 'completed',
          confidenceScore: 4,
          notes: 'Understood array indexing formulas 2i and 2i+1.',
        },
        {
          topicId: 'topic-seg2105-1',
          courseName: 'SEG2105',
          topicTitle: 'Client-Server Architecture',
          questionText: 'Did you finish Chapter 6 reading for SEG2105?',
          answer: 'completed',
          confidenceScore: 4,
          notes: 'Architecture draft is in progress.',
        },
        {
          topicId: 'topic-mat1348-1',
          courseName: 'MAT1348',
          topicTitle: 'Propositional Equivalences & Truth Tables',
          questionText: 'Did you finish the assigned problem set for MAT1348?',
          answer: 'completed',
          confidenceScore: 4,
          notes: 'Finished all 10 equivalence problems.',
        },
      ],
      newCommitmentsNoted: 'Extra 3-hour shift on Friday evening.',
      completedAt: addDays(now, -4),
    },
  ];

  const sampleAdaptiveSignals = {
    completionRate: 88,
    paceMultiplier: 1.15, // Student needs slightly more time for technical problem sets
    missedSessionsCount: 1,
    postponementCount: 2,
    preferredSessionDuration: 60,
    observedVelocityByCourse: {
      CSI2110: 1.25, // Math/algorithms take longer
      SEG2105: 1.0,
      MAT1348: 1.2,
      ENG1112: 0.9,
    },
    lastRecalibrationDate: addDays(now, -4),
    coachInsight:
      'We noticed algorithmic problem sets (CSI2110 & MAT1348) required ~20% more time than initial estimates. We have calibrated upcoming sessions with extra buffer time to avoid rushing before your midterms.',
  };

  safeSetItem(STORAGE_KEYS.COURSES, sampleCourses);
  safeSetItem(STORAGE_KEYS.ASSIGNMENTS, sampleAssignments);
  safeSetItem(STORAGE_KEYS.EXAMS, sampleExams);
  safeSetItem(STORAGE_KEYS.AVAILABILITY, sampleAvailability);
  safeSetItem(STORAGE_KEYS.STUDY_PLAN, []);
  safeRemoveItem(STORAGE_KEYS.STUDY_INSIGHTS);
  safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, sampleProfile);
  safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, sampleTopics);
  safeSetItem(STORAGE_KEYS.CHECK_INS, sampleCheckIns);
  safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, sampleAdaptiveSignals);
  safeSetItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
}
