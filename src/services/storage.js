/**
 * Storage Service — My Academia Buddy
 * Provides safe, validated, versioned localStorage persistence with schema migrations
 * and JSON import/export capabilities.
 */

const STORAGE_VERSION_KEY = 'mab_storage_version';
const CURRENT_STORAGE_VERSION = 2;

export const STORAGE_KEYS = {
  COURSES: 'courses',
  ASSIGNMENTS: 'assignments',
  EXAMS: 'exams',
  AVAILABILITY: 'availability',
  STUDY_PLAN: 'studyPlan',
  STUDY_INSIGHTS: 'studyInsights',
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
 * Normalize and migrate legacy v1 data models to v2
 */
export function migrateStorage() {
  const currentVersion = Number(safeGetItem(STORAGE_VERSION_KEY, 1));

  if (currentVersion < 2) {
    // 1. Migrate courses: ensure difficulty exists
    const courses = safeGetItem(STORAGE_KEYS.COURSES, []);
    const migratedCourses = courses.map((course) => ({
      id: course.id || Date.now(),
      name: course.name || 'Untitled Course',
      instructor: course.instructor || '',
      schedule: course.schedule || '',
      credits: course.credits || '',
      difficulty: course.difficulty || 'Medium',
      color: course.color || '#3b82f6',
      createdAt: course.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.COURSES, migratedCourses);

    // 2. Migrate assignments: ensure estimatedWorkload and priority exist
    const assignments = safeGetItem(STORAGE_KEYS.ASSIGNMENTS, []);
    const migratedAssignments = assignments.map((assignment) => ({
      id: assignment.id || Date.now(),
      title: assignment.title || 'Untitled Assignment',
      course: assignment.course || '',
      dueDate: assignment.dueDate || '',
      priority: assignment.priority || 'Medium',
      estimatedWorkload: assignment.estimatedWorkload ? Number(assignment.estimatedWorkload) : 3, // hours
      completed: Boolean(assignment.completed),
      createdAt: assignment.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.ASSIGNMENTS, migratedAssignments);

    // 3. Migrate exams: ensure title, priority, estimatedWorkload exist
    const exams = safeGetItem(STORAGE_KEYS.EXAMS, []);
    const migratedExams = exams.map((exam) => ({
      id: exam.id || Date.now(),
      title: exam.title || `${exam.course || 'Course'} Exam`,
      course: exam.course || '',
      date: exam.date || '',
      location: exam.location || '',
      notes: exam.notes || '',
      priority: exam.priority || 'High',
      estimatedWorkload: exam.estimatedWorkload ? Number(exam.estimatedWorkload) : 5, // hours
      createdAt: exam.createdAt || new Date().toISOString(),
    }));
    safeSetItem(STORAGE_KEYS.EXAMS, migratedExams);

    // Set updated storage version
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

    const { courses, assignments, exams, availability, studyPlan, studyInsights } = parsed.data;

    if (Array.isArray(courses)) safeSetItem(STORAGE_KEYS.COURSES, courses);
    if (Array.isArray(assignments)) safeSetItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
    if (Array.isArray(exams)) safeSetItem(STORAGE_KEYS.EXAMS, exams);
    if (Array.isArray(availability)) safeSetItem(STORAGE_KEYS.AVAILABILITY, availability);
    if (Array.isArray(studyPlan)) safeSetItem(STORAGE_KEYS.STUDY_PLAN, studyPlan);
    if (studyInsights) safeSetItem(STORAGE_KEYS.STUDY_INSIGHTS, studyInsights);

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
}

/**
 * Populates sample demo data for student presentation
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

  // Dynamically set dates relative to today for demo realism
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

  safeSetItem(STORAGE_KEYS.COURSES, sampleCourses);
  safeSetItem(STORAGE_KEYS.ASSIGNMENTS, sampleAssignments);
  safeSetItem(STORAGE_KEYS.EXAMS, sampleExams);
  safeSetItem(STORAGE_KEYS.AVAILABILITY, sampleAvailability);
  safeSetItem(STORAGE_KEYS.STUDY_PLAN, []);
  safeRemoveItem(STORAGE_KEYS.STUDY_INSIGHTS);
  safeSetItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
}
