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
/**
 * Populates realistic dataset for Student A: Alex Chen (Consistent, On-Track)
 */
export function getConsistentStudentData() {
  const now = new Date();
  const addDays = (d, days) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  };

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
      difficulty: 'High',
      color: '#10b981',
      createdAt: new Date().toISOString(),
    },
    {
      id: 104,
      name: 'ENG1112',
      instructor: 'Prof. Sarah Jenkins',
      schedule: 'Wed 14:30 - 17:30',
      credits: '3.0',
      difficulty: 'Medium',
      color: '#f59e0b',
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
    { id: 407, day: 'Sunday', startTime: '13:00', endTime: '17:00' },
  ];

  const sampleTopics = [
    // CSI2110: Data Structures and Algorithms
    {
      id: 'topic-csi2110-w1',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 1,
      week: 1,
      title: 'Algorithm Analysis & Big-O Notation',
      description: 'Growth rate functions, asymptotic notation (O, Omega, Theta), loops analysis.',
      requiredReadings: 'CLRS Chapter 3, Goodrich Chapter 1',
      practiceProblems: 'Problems 1.1-1.6 (Complexity bounding)',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w2',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 2,
      week: 2,
      title: 'Stacks, Queues & Linked Lists',
      description: 'Array vs node implementations, circular buffers, amortized doubling.',
      requiredReadings: 'Goodrich Chapter 6: Linear ADTs',
      practiceProblems: 'Implement circular queue in Java',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-csi2110-w1'],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w3',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 3,
      week: 3,
      title: 'Binary Heaps & Priority Queues',
      description: 'Heap order property, up-heap/down-heap bubbling, array representation.',
      requiredReadings: 'Goodrich Chapter 8, sections 8.1 - 8.3',
      practiceProblems: 'Exercises 8.4, 8.7, 8.12 (Heap building complexity)',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-csi2110-w2'],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w4',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 4,
      week: 4,
      title: 'Binary Search Trees & AVL Rotations',
      description: 'Search tree invariants, single and double AVL tree balance rotations.',
      requiredReadings: 'Goodrich Chapter 10, sections 10.1 - 10.2',
      practiceProblems: 'Problem Set 3: Trace insertion of keys into AVL tree',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-csi2110-w3'],
      status: 'reading_completed',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },

    // SEG2105: Introduction to Software Engineering
    {
      id: 'topic-seg2105-w1',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 1,
      week: 1,
      title: 'Agile Methodologies & User Stories',
      description: 'Scrum sprint lifecycle, INVEST user stories, backlog grooming.',
      requiredReadings: 'Lethbridge Chapter 1 & 2',
      practiceProblems: 'Draft user story backlog for course project',
      estimatedHours: 2.5,
      prerequisiteTopicIds: [],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w2',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 2,
      week: 2,
      title: 'Domain Modeling & Class Diagrams',
      description: 'UML class associations, multiplicities, generalization vs composition.',
      requiredReadings: 'Lethbridge Chapter 5: UML Modeling',
      practiceProblems: 'Model banking domain entities and relationships',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-seg2105-w1'],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w3',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 3,
      week: 3,
      title: 'Client-Server Architecture & Communication Protocols',
      description: 'Sockets, REST interfaces, concurrency, and thread safety.',
      requiredReadings: 'Lethbridge Chapter 6: Architectural Patterns',
      practiceProblems: 'Sprint 2 Milestone Architecture Document',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-seg2105-w2'],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w4',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 4,
      week: 4,
      title: 'Design Patterns: Factory, Observer & Singleton',
      description: 'Gang of Four behavioral and creational design patterns with clean refactoring.',
      requiredReadings: 'Lethbridge Chapter 8: Design Patterns',
      practiceProblems: 'Refactor notification subsystem to use Observer pattern',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-seg2105-w3'],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },

    // MAT1348: Discrete Mathematics for Computing
    {
      id: 'topic-mat1348-w1',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 1,
      week: 1,
      title: 'Propositional Equivalences & Truth Tables',
      description: 'De Morgan laws, disjunctive normal form (DNF), logical validity.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 1.1 - 1.3',
      practiceProblems: 'Problem Set 1: Simplify composite propositions',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w2',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 2,
      week: 2,
      title: 'Predicate Logic & Nested Quantifiers',
      description: 'Universal and existential quantifiers, negation rules, domain translation.',
      requiredReadings: 'Rosen Chapter 1.4 - 1.5',
      practiceProblems: 'Translate nested mathematical predicates into logical formulas',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-mat1348-w1'],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w3',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 3,
      week: 3,
      title: 'Methods of Mathematical Proof',
      description: 'Direct proofs, proof by contraposition, proof by contradiction.',
      requiredReadings: 'Rosen Chapter 1.7 - 1.8',
      practiceProblems: 'Prove irrationality of sqrt(2) and rational sum closure',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-mat1348-w2'],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w4',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 4,
      week: 4,
      title: 'Mathematical Induction & Well-Ordering Principle',
      description: 'Base case, inductive hypothesis, strong induction proofs.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 5.1 - 5.2',
      practiceProblems: 'Prove inequality 2^n > n^2 for n >= 5 by mathematical induction',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-mat1348-w3'],
      status: 'reading_completed',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },

    // ENG1112: Technical Report Writing
    {
      id: 'topic-eng1112-w1',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 1,
      week: 1,
      title: 'Audience Analysis & Technical Clarity',
      description: 'Writing for technical vs non-technical stakeholders, conciseness.',
      requiredReadings: 'Engineering Communication Handbook Chapter 1',
      practiceProblems: 'Exercise: Revise wordy passive memo into active executive summary',
      estimatedHours: 2.0,
      prerequisiteTopicIds: [],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w2',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 2,
      week: 2,
      title: 'Technical Research & IEEE Citation Standards',
      description: 'Peer-reviewed research retrieval, IEEE in-text citation and referencing.',
      requiredReadings: 'Engineering Communication Handbook Chapter 3',
      practiceProblems: 'Annotated bibliography for engineering feasibility proposal',
      estimatedHours: 2.5,
      prerequisiteTopicIds: ['topic-eng1112-w1'],
      status: 'reviewed',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w3',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 3,
      week: 3,
      title: 'Document Architecture: Specifications & Proposals',
      description: 'Structural breakdown: Executive summary, problem definition, methodology.',
      requiredReadings: 'Engineering Communication Handbook Chapter 5',
      practiceProblems: 'Draft outline of technical proposal',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-eng1112-w2'],
      status: 'practiced',
      confidence: 5,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w4',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 4,
      week: 4,
      title: 'Visual Data Presentation & Technical Figures',
      description: 'Figure captions, data flow diagrams, schematic readability.',
      requiredReadings: 'Engineering Communication Handbook Chapter 7',
      practiceProblems: 'Format software architecture diagram with proper IEEE captioning',
      estimatedHours: 2.5,
      prerequisiteTopicIds: ['topic-eng1112-w3'],
      status: 'practiced',
      confidence: 4,
      lastUpdated: new Date().toISOString(),
    },
  ];

  const sampleAssignments = [
    {
      id: 201,
      title: 'Sprint 1 Architecture Document',
      course: 'SEG2105',
      dueDate: addDays(now, -4),
      priority: 'High',
      estimatedWorkload: 6,
      completed: true,
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
      title: 'Induction & Strong Induction Problem Set',
      course: 'MAT1348',
      dueDate: addDays(now, 8),
      priority: 'High',
      estimatedWorkload: 3,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 204,
      title: 'Technical Proposal Draft',
      course: 'ENG1112',
      dueDate: addDays(now, -1),
      priority: 'Medium',
      estimatedWorkload: 3,
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
      notes: 'Complexity Analysis, Stacks, Queues, Heaps, and AVL Trees',
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
      notes: 'Truth tables, proofs by induction, and methods of proof',
      priority: 'High',
      estimatedWorkload: 6,
      createdAt: new Date().toISOString(),
    },
    {
      id: 303,
      title: 'Midterm Exam',
      course: 'SEG2105',
      date: addDays(now, 21),
      location: 'SITE 1001',
      notes: 'Software architecture patterns, UML modeling, design patterns',
      priority: 'Medium',
      estimatedWorkload: 5,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleProfile = {
    name: 'Alex Chen',
    program: 'Honours B.Sc. Computer Science',
    semester: 'Year 2, Fall Term',
    organizationLevel: 'Highly Structured',
    preferredStudyPeriods: ['morning', 'afternoon'],
    weeklyWorkHours: 8,
    workScheduleSummary: 'Peer Tutoring (Wed & Fri 13:00 - 17:00)',
    recurringCommitments: ['CS Student Society (Tue 17:30)', 'Gym / Fitness (Mon/Thu 07:30)'],
    weeklyStudyGoalHours: 24,
    academicGoal: 'Maintain Dean\'s List standing, master algorithms & discrete proofs, prepare early for midterms',
    preferredLanguage: 'en',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  };

  const sampleCheckIns = [
    {
      id: 'checkin-alex-w3',
      weekNumber: 3,
      date: addDays(now, -4),
      responses: [
        {
          topicId: 'topic-csi2110-w3',
          courseName: 'CSI2110',
          topicTitle: 'Binary Heaps & Priority Queues',
          questionText: 'Did you attend the lecture or review the primary notes for CSI2110 on "Binary Heaps & Priority Queues"?',
          answer: 'completed',
          confidenceScore: 4,
          field: 'lecture',
        },
        {
          topicId: 'topic-seg2105-w3',
          courseName: 'SEG2105',
          topicTitle: 'Client-Server Architecture & Communication Protocols',
          questionText: 'Did you finish Chapter 6 reading for SEG2105?',
          answer: 'completed',
          confidenceScore: 4,
          field: 'reading',
        },
        {
          topicId: 'topic-mat1348-w3',
          courseName: 'MAT1348',
          topicTitle: 'Methods of Mathematical Proof',
          questionText: 'How much of the practice exercises for "Methods of Mathematical Proof" were you able to complete?',
          answer: 'completed',
          confidenceScore: 4,
          field: 'practice',
        },
        {
          topicId: 'topic-eng1112-w3',
          courseName: 'ENG1112',
          topicTitle: 'Document Architecture: Specifications & Proposals',
          questionText: 'Did you draft the technical proposal outline?',
          answer: 'completed',
          confidenceScore: 5,
          field: 'practice',
        },
      ],
      newCommitmentsNoted: 'Schedule steady, completed all readings and tutoring shifts on time.',
      completedAt: addDays(now, -4),
    },
  ];

  const sampleAdaptiveSignals = {
    completionRate: 96,
    taskCompletionConsistency: 96,
    paceMultiplier: 1.0,
    missedSessionsCount: 0,
    postponementCount: 0,
    preferredSessionDuration: 60,
    observedVelocityByCourse: {
      CSI2110: 1.0,
      SEG2105: 1.0,
      MAT1348: 1.0,
      ENG1112: 1.0,
    },
    lastRecalibrationDate: addDays(now, -4),
    coachInsight: 'Outstanding consistency! You are progressing through syllabus topics on schedule. Keep protecting your scheduled breaks.',
  };

  return {
    courses: sampleCourses,
    assignments: sampleAssignments,
    exams: sampleExams,
    availability: sampleAvailability,
    topics: sampleTopics,
    profile: sampleProfile,
    checkIns: sampleCheckIns,
    adaptiveSignals: sampleAdaptiveSignals,
  };
}

/**
 * Populates realistic dataset for Student B: Jordan Taylor (Delayed, Several Weeks Behind)
 */
export function getDelayedStudentData() {
  const now = new Date();
  const addDays = (d, days) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy.toISOString().split('T')[0];
  };

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
      difficulty: 'High',
      color: '#10b981',
      createdAt: new Date().toISOString(),
    },
    {
      id: 104,
      name: 'ENG1112',
      instructor: 'Prof. Sarah Jenkins',
      schedule: 'Wed 14:30 - 17:30',
      credits: '3.0',
      difficulty: 'Medium',
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleAvailability = [
    { id: 401, day: 'Monday', startTime: '14:00', endTime: '18:00' },
    { id: 402, day: 'Wednesday', startTime: '13:00', endTime: '17:00' },
    { id: 403, day: 'Friday', startTime: '11:00', endTime: '15:00' },
    { id: 404, day: 'Sunday', startTime: '11:00', endTime: '16:00' },
  ];

  const sampleTopics = [
    // CSI2110: Data Structures and Algorithms
    {
      id: 'topic-csi2110-w1',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 1,
      week: 1,
      title: 'Algorithm Analysis & Big-O Notation',
      description: 'Growth rate functions, asymptotic notation (O, Omega, Theta), loops analysis.',
      requiredReadings: 'CLRS Chapter 3, Goodrich Chapter 1',
      practiceProblems: 'Problems 1.1-1.6 (Complexity bounding)',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w2',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 2,
      week: 2,
      title: 'Stacks, Queues & Linked Lists',
      description: 'Array vs node implementations, circular buffers, amortized doubling.',
      requiredReadings: 'Goodrich Chapter 6: Linear ADTs',
      practiceProblems: 'Implement circular queue in Java',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-csi2110-w1'],
      status: 'attended_lecture',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w3',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 3,
      week: 3,
      title: 'Binary Heaps & Priority Queues',
      description: 'Heap order property, up-heap/down-heap bubbling, array representation.',
      requiredReadings: 'Goodrich Chapter 8, sections 8.1 - 8.3',
      practiceProblems: 'Exercises 8.4, 8.7, 8.12 (Heap building complexity)',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-csi2110-w2'],
      status: 'not_started',
      confidence: 1,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-csi2110-w4',
      courseId: 102,
      courseName: 'CSI2110',
      weekNumber: 4,
      week: 4,
      title: 'Binary Search Trees & AVL Rotations',
      description: 'Search tree invariants, single and double AVL tree balance rotations.',
      requiredReadings: 'Goodrich Chapter 10, sections 10.1 - 10.2',
      practiceProblems: 'Problem Set 3: Trace insertion of keys into AVL tree',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-csi2110-w3'],
      status: 'not_started',
      confidence: 1,
      lastUpdated: new Date().toISOString(),
    },

    // SEG2105: Introduction to Software Engineering
    {
      id: 'topic-seg2105-w1',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 1,
      week: 1,
      title: 'Agile Methodologies & User Stories',
      description: 'Scrum sprint lifecycle, INVEST user stories, backlog grooming.',
      requiredReadings: 'Lethbridge Chapter 1 & 2',
      practiceProblems: 'Draft user story backlog for course project',
      estimatedHours: 2.5,
      prerequisiteTopicIds: [],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w2',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 2,
      week: 2,
      title: 'Domain Modeling & Class Diagrams',
      description: 'UML class associations, multiplicities, generalization vs composition.',
      requiredReadings: 'Lethbridge Chapter 5: UML Modeling',
      practiceProblems: 'Model banking domain entities and relationships',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-seg2105-w1'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w3',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 3,
      week: 3,
      title: 'Client-Server Architecture & Communication Protocols',
      description: 'Sockets, REST interfaces, concurrency, and thread safety.',
      requiredReadings: 'Lethbridge Chapter 6: Architectural Patterns',
      practiceProblems: 'Sprint 2 Milestone Architecture Document',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-seg2105-w2'],
      status: 'attended_lecture',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-seg2105-w4',
      courseId: 101,
      courseName: 'SEG2105',
      weekNumber: 4,
      week: 4,
      title: 'Design Patterns: Factory, Observer & Singleton',
      description: 'Gang of Four behavioral and creational design patterns with clean refactoring.',
      requiredReadings: 'Lethbridge Chapter 8: Design Patterns',
      practiceProblems: 'Refactor notification subsystem to use Observer pattern',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-seg2105-w3'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },

    // MAT1348: Discrete Mathematics for Computing
    {
      id: 'topic-mat1348-w1',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 1,
      week: 1,
      title: 'Propositional Equivalences & Truth Tables',
      description: 'De Morgan laws, disjunctive normal form (DNF), logical validity.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 1.1 - 1.3',
      practiceProblems: 'Problem Set 1: Simplify composite propositions',
      estimatedHours: 3.0,
      prerequisiteTopicIds: [],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w2',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 2,
      week: 2,
      title: 'Predicate Logic & Nested Quantifiers',
      description: 'Universal and existential quantifiers, negation rules, domain translation.',
      requiredReadings: 'Rosen Chapter 1.4 - 1.5',
      practiceProblems: 'Translate nested mathematical predicates into logical formulas',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-mat1348-w1'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w3',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 3,
      week: 3,
      title: 'Methods of Mathematical Proof',
      description: 'Direct proofs, proof by contraposition, proof by contradiction.',
      requiredReadings: 'Rosen Chapter 1.7 - 1.8',
      practiceProblems: 'Prove irrationality of sqrt(2) and rational sum closure',
      estimatedHours: 3.5,
      prerequisiteTopicIds: ['topic-mat1348-w2'],
      status: 'not_started',
      confidence: 1,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-mat1348-w4',
      courseId: 103,
      courseName: 'MAT1348',
      weekNumber: 4,
      week: 4,
      title: 'Mathematical Induction & Well-Ordering Principle',
      description: 'Base case, inductive hypothesis, strong induction proofs.',
      requiredReadings: 'Rosen Discrete Mathematics Chapter 5.1 - 5.2',
      practiceProblems: 'Prove inequality 2^n > n^2 for n >= 5 by mathematical induction',
      estimatedHours: 4.0,
      prerequisiteTopicIds: ['topic-mat1348-w3'],
      status: 'not_started',
      confidence: 1,
      lastUpdated: new Date().toISOString(),
    },

    // ENG1112: Technical Report Writing
    {
      id: 'topic-eng1112-w1',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 1,
      week: 1,
      title: 'Audience Analysis & Technical Clarity',
      description: 'Writing for technical vs non-technical stakeholders, conciseness.',
      requiredReadings: 'Engineering Communication Handbook Chapter 1',
      practiceProblems: 'Exercise: Revise wordy passive memo into active executive summary',
      estimatedHours: 2.0,
      prerequisiteTopicIds: [],
      status: 'attended_lecture',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w2',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 2,
      week: 2,
      title: 'Technical Research & IEEE Citation Standards',
      description: 'Peer-reviewed research retrieval, IEEE in-text citation and referencing.',
      requiredReadings: 'Engineering Communication Handbook Chapter 3',
      practiceProblems: 'Annotated bibliography for engineering feasibility proposal',
      estimatedHours: 2.5,
      prerequisiteTopicIds: ['topic-eng1112-w1'],
      status: 'reading_completed',
      confidence: 3,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w3',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 3,
      week: 3,
      title: 'Document Architecture: Specifications & Proposals',
      description: 'Structural breakdown: Executive summary, problem definition, methodology.',
      requiredReadings: 'Engineering Communication Handbook Chapter 5',
      practiceProblems: 'Draft outline of technical proposal',
      estimatedHours: 3.0,
      prerequisiteTopicIds: ['topic-eng1112-w2'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'topic-eng1112-w4',
      courseId: 104,
      courseName: 'ENG1112',
      weekNumber: 4,
      week: 4,
      title: 'Visual Data Presentation & Technical Figures',
      description: 'Figure captions, data flow diagrams, schematic readability.',
      requiredReadings: 'Engineering Communication Handbook Chapter 7',
      practiceProblems: 'Format software architecture diagram with proper IEEE captioning',
      estimatedHours: 2.5,
      prerequisiteTopicIds: ['topic-eng1112-w3'],
      status: 'not_started',
      confidence: 2,
      lastUpdated: new Date().toISOString(),
    },
  ];

  const sampleAssignments = [
    {
      id: 201,
      title: 'Sprint 2 Architecture Document',
      course: 'SEG2105',
      dueDate: addDays(now, 2),
      priority: 'High',
      estimatedWorkload: 6,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 202,
      title: 'Binary Search Tree & Heap Assignment',
      course: 'CSI2110',
      dueDate: addDays(now, 3),
      priority: 'High',
      estimatedWorkload: 5,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 203,
      title: 'Induction & Strong Induction Problem Set',
      course: 'MAT1348',
      dueDate: addDays(now, 5),
      priority: 'High',
      estimatedWorkload: 5,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 204,
      title: 'Technical Proposal Draft',
      course: 'ENG1112',
      dueDate: addDays(now, 9),
      priority: 'Medium',
      estimatedWorkload: 3,
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleExams = [
    {
      id: 301,
      title: 'Midterm Exam 1',
      course: 'CSI2110',
      date: addDays(now, 5), // in 5 days! Triggers Exam Critical alert (readiness < 65% and days <= 5)
      location: 'Marion Hall 150',
      notes: 'Covers Complexity Analysis, Stacks, Queues, Heaps, and AVL Trees',
      priority: 'High',
      estimatedWorkload: 8,
      createdAt: new Date().toISOString(),
    },
    {
      id: 302,
      title: 'Midterm Exam 2',
      course: 'MAT1348',
      date: addDays(now, 12),
      location: 'Montpetit 202',
      notes: 'Truth tables, proofs by induction, and methods of proof',
      priority: 'High',
      estimatedWorkload: 6,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleProfile = {
    name: 'Jordan Taylor',
    program: 'Honours B.Sc. Computer Science',
    semester: 'Year 2, Fall Term',
    organizationLevel: 'Building Habits',
    preferredStudyPeriods: ['evening', 'night'],
    weeklyWorkHours: 24,
    workScheduleSummary: 'Retail Shift Cashier: Tue, Thu, Sat evenings (17:00 - 22:00)',
    recurringCommitments: ['Family Support (Sunday afternoons)', 'Transit Commute (1h/day)'],
    weeklyStudyGoalHours: 16,
    academicGoal: 'Overcome accumulated delays, catch up on mathematical induction and AVL trees, pass midterms',
    preferredLanguage: 'en',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  };

  const sampleCheckIns = [
    {
      id: 'checkin-jordan-w3',
      weekNumber: 3,
      date: addDays(now, -4),
      responses: [
        {
          topicId: 'topic-csi2110-w3',
          courseName: 'CSI2110',
          topicTitle: 'Binary Heaps & Priority Queues',
          questionText: 'Did you attend the lecture or review the primary notes for CSI2110 on "Binary Heaps & Priority Queues"?',
          answer: 'not_started',
          confidenceScore: 1,
          field: 'lecture',
        },
        {
          topicId: 'topic-csi2110-w4',
          courseName: 'CSI2110',
          topicTitle: 'Binary Search Trees & AVL Rotations',
          questionText: 'Did you complete the required reading for "Binary Search Trees & AVL Rotations"?',
          answer: 'not_started',
          confidenceScore: 1,
          field: 'reading',
        },
        {
          topicId: 'topic-mat1348-w3',
          courseName: 'MAT1348',
          topicTitle: 'Methods of Mathematical Proof',
          questionText: 'How much of the practice exercises for "Methods of Mathematical Proof" were you able to complete?',
          answer: 'skipped',
          confidenceScore: 1,
          field: 'practice',
        },
        {
          topicId: 'topic-mat1348-w4',
          courseName: 'MAT1348',
          topicTitle: 'Mathematical Induction & Well-Ordering Principle',
          questionText: 'How confident do you feel applying the concepts from "Mathematical Induction & Well-Ordering Principle" on an exam right now?',
          answer: 'not_started',
          confidenceScore: 1,
          field: 'confidence',
        },
        {
          topicId: 'topic-seg2105-w3',
          courseName: 'SEG2105',
          topicTitle: 'Client-Server Architecture & Communication Protocols',
          questionText: 'Did you finish Chapter 6 reading for SEG2105?',
          answer: 'partially_completed',
          confidenceScore: 2,
          field: 'reading',
        },
      ],
      newCommitmentsNoted: 'Mandatory 24-hr retail shifts & recovered from flu in Week 3. Accumulated several weeks of backlog in algorithms and discrete math.',
      completedAt: addDays(now, -4),
    },
  ];

  const sampleAdaptiveSignals = {
    completionRate: 45,
    taskCompletionConsistency: 45,
    paceMultiplier: 1.3, // +30% buffer time
    missedSessionsCount: 5,
    postponementCount: 4,
    preferredSessionDuration: 60,
    observedVelocityByCourse: {
      CSI2110: 1.35,
      MAT1348: 1.3,
      SEG2105: 1.15,
      ENG1112: 1.0,
    },
    lastRecalibrationDate: addDays(now, -4),
    coachInsight: 'We noticed several syllabus topics needed more time than estimated. We have adjusted your upcoming sessions with +30% buffer time so you have breathing room without feeling rushed.',
  };

  return {
    courses: sampleCourses,
    assignments: sampleAssignments,
    exams: sampleExams,
    availability: sampleAvailability,
    topics: sampleTopics,
    profile: sampleProfile,
    checkIns: sampleCheckIns,
    adaptiveSignals: sampleAdaptiveSignals,
  };
}

/**
 * Loads a selected student persona scenario into localStorage
 * @param {'consistent' | 'delayed'} scenarioType
 */
export function loadScenarioData(scenarioType = 'consistent') {
  const data = scenarioType === 'delayed' ? getDelayedStudentData() : getConsistentStudentData();

  safeSetItem(STORAGE_KEYS.COURSES, data.courses);
  safeSetItem(STORAGE_KEYS.ASSIGNMENTS, data.assignments);
  safeSetItem(STORAGE_KEYS.EXAMS, data.exams);
  safeSetItem(STORAGE_KEYS.AVAILABILITY, data.availability);
  safeSetItem(STORAGE_KEYS.STUDY_PLAN, []);
  safeRemoveItem(STORAGE_KEYS.STUDY_INSIGHTS);
  safeSetItem(STORAGE_KEYS.STUDENT_PROFILE, data.profile);
  safeSetItem(STORAGE_KEYS.SYLLABUS_TOPICS, data.topics);
  safeSetItem(STORAGE_KEYS.CHECK_INS, data.checkIns);
  safeSetItem(STORAGE_KEYS.ADAPTIVE_SIGNALS, data.adaptiveSignals);
  safeSetItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  return data;
}

/**
 * Populates sample demo data with realistic academic courses (Alex Chen default)
 */
export function loadSampleDemoData() {
  return loadScenarioData('consistent');
}
