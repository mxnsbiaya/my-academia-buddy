/**
 * Duplicate Syllabus Detection & Safe Merging Engine — My Academia Buddy
 * 
 * Provides:
 * - Content hashing (SHA-256) for exact file duplication detection
 * - Normalized course identifier resolution (CSI2510, CSI 2510, CSI-2510)
 * - Semester / Year awareness (distinguishes cross-semester offerings from true duplicates)
 * - Revised syllabus difference detection (diff analysis of topics, assignments, exams)
 * - Safe, non-destructive merge and update workflows that preserve student progress
 */

/**
 * Normalizes course identifiers for reliable matching
 * Examples:
 *   "CSI 2510" -> "CSI2510"
 *   "CSI-2510" -> "CSI2510"
 *   "csi2510"  -> "CSI2510"
 *   "SEG 2105 A" -> "SEG2105"
 */
export function normalizeCourseCode(raw = '') {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.toUpperCase().trim();
  // Match standard 2-4 letter prefix followed by optional space/dash and 3-5 digits
  const match = cleaned.match(/([A-Z]{2,5})\s*[-_]?\s*(\d{3,5})/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return cleaned.replace(/[\s\-_]+/g, '');
}

/**
 * Computes a secure hash (SHA-256 hex) of a file or text string
 */
export async function computeContentHash(content) {
  try {
    let buffer;
    if (typeof content === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(content);
    } else if (content instanceof ArrayBuffer) {
      buffer = content;
    } else if (content instanceof Blob || (typeof File !== 'undefined' && content instanceof File)) {
      buffer = await content.arrayBuffer();
    } else {
      const encoder = new TextEncoder();
      buffer = encoder.encode(String(content || ''));
    }

    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('[duplicateDetector] crypto.subtle digest fallback:', err);
  }

  // Pure JS fallback FNV-1a 64-bit hex hash
  const str = typeof content === 'string' ? content : String(content);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Normalizes term / semester string (e.g. "Fall 2026", "Automne 2026", "Winter 2026")
 */
export function normalizeAcademicTerm(term = '', year = null) {
  const t = String(term || '').toLowerCase().trim();
  let season = 'fall';
  if (t.includes('winter') || t.includes('hiver')) season = 'winter';
  else if (t.includes('summer') || t.includes('été') || t.includes('ete') || t.includes('spring') || t.includes('printemps')) season = 'summer';
  else if (t.includes('fall') || t.includes('automne')) season = 'fall';

  const y = String(year || '').match(/\d{4}/)?.[0] || String(new Date().getFullYear());
  return `${season}_${y}`;
}

/**
 * Checks an incoming extracted syllabus course against registered courses
 * 
 * @param {Object} incomingCourse Course extracted from document
 * @param {Array} existingCourses Active registered courses
 * @param {string} fileHash Computed hash of incoming document
 * @param {Object} existingCollections { topics, assignments, exams }
 * @returns {Object} Conflict assessment and diff breakdown
 */
export function detectSyllabusDuplicate({
  incomingCourse,
  existingCourses = [],
  fileHash = null,
  existingCollections = {},
}) {
  if (!incomingCourse) {
    return { isDuplicate: false, type: 'none' };
  }

  const incomingCodeNorm = normalizeCourseCode(incomingCourse.name || incomingCourse.courseCode || '');
  const incomingTerm = normalizeAcademicTerm(
    incomingCourse.term || incomingCourse.metadata?.term || 'Fall',
    incomingCourse.year || incomingCourse.metadata?.year || new Date().getFullYear()
  );

  const existingTopics = existingCollections.topics || [];
  const existingAssignments = existingCollections.assignments || [];
  const existingExams = existingCollections.exams || [];

  for (const existing of existingCourses) {
    const existingCodeNorm = normalizeCourseCode(existing.name || existing.code || '');
    const existingHash = existing.syllabusFileHash || existing.metadata?.fileHash;

    // Check 1: Exact File Hash Match
    if (fileHash && existingHash && fileHash === existingHash) {
      return buildDuplicateReport({
        type: 'exact_file_hash',
        existingCourse: existing,
        incomingCourse,
        existingTopics,
        existingAssignments,
        existingExams,
        reason: 'Exact file hash match: This document was already imported for this course.',
      });
    }

    // Check 2: Same Course Code match
    if (incomingCodeNorm && existingCodeNorm && incomingCodeNorm === existingCodeNorm) {
      const existingTerm = normalizeAcademicTerm(
        existing.term || existing.metadata?.term || 'Fall',
        existing.year || existing.metadata?.year || new Date().getFullYear()
      );

      // Same Course in Different Semesters is allowed (not a duplicate)
      if (incomingTerm !== existingTerm) {
        continue;
      }

      // Same Course in Same Semester
      return buildDuplicateReport({
        type: 'same_course_same_term',
        existingCourse: existing,
        incomingCourse,
        existingTopics,
        existingAssignments,
        existingExams,
        reason: `Course ${incomingCodeNorm} is already registered for ${existing.term || 'this semester'}.`,
      });
    }
  }

  return { isDuplicate: false, type: 'none' };
}

/**
 * Compares incoming vs existing syllabus items and generates a structured diff
 */
function buildDuplicateReport({
  type,
  existingCourse,
  incomingCourse,
  existingTopics,
  existingAssignments,
  existingExams,
  reason,
}) {
  const courseId = existingCourse.id;
  const courseName = existingCourse.name;

  // Filter existing items for this course
  const currentCourseTopics = existingTopics.filter(
    (t) => t.courseId === courseId || t.courseName === courseName
  );
  const currentCourseAssignments = existingAssignments.filter(
    (a) => a.course === courseName || a.courseId === courseId
  );
  const currentCourseExams = existingExams.filter(
    (e) => e.course === courseName || e.courseId === courseId
  );

  // Normalize titles for comparison
  const normTitle = (str = '') =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const existingTopicTitles = new Set(currentCourseTopics.map((t) => normTitle(t.title)));
  const existingAsgTitles = new Set(currentCourseAssignments.map((a) => normTitle(a.title)));
  const existingExamTitles = new Set(currentCourseExams.map((e) => normTitle(e.title)));

  // Incoming items
  const incomingTopics = incomingCourse.topics || [];
  const incomingAssignments = incomingCourse.assignments || [];
  const incomingExams = incomingCourse.exams || [];

  const newTopics = incomingTopics.filter((t) => !existingTopicTitles.has(normTitle(t.title)));
  const newAssignments = incomingAssignments.filter((a) => !existingAsgTitles.has(normTitle(a.title)));
  const newExams = incomingExams.filter((e) => !existingExamTitles.has(normTitle(e.title)));

  const isRevised =
    newTopics.length > 0 ||
    newAssignments.length > 0 ||
    newExams.length > 0;

  return {
    isDuplicate: true,
    type: isRevised ? 'revised_syllabus' : type,
    existingCourse,
    incomingCourse,
    reason,
    diff: {
      hasChanges: isRevised,
      newTopics,
      newAssignments,
      newExams,
      existingTopicCount: currentCourseTopics.length,
      existingAssignmentCount: currentCourseAssignments.length,
      existingExamCount: currentCourseExams.length,
      preservedStudentTasks: currentCourseAssignments.filter((a) => a.completed).length,
    },
  };
}

/**
 * Merges newly discovered information from a syllabus without destroying existing student progress
 * 
 * @param {Object} options
 * @param {string} options.strategy 'merge' | 'update' | 'cancel'
 * @returns {Object} Updated entities ready for state & cloud sync
 */
export function mergeSyllabusCourse({
  existingCourse,
  incomingCourse,
  strategy = 'merge',
  existingTopics = [],
  existingAssignments = [],
  existingExams = [],
  fileHash = null,
}) {
  if (strategy === 'cancel') {
    return { success: false, cancelled: true };
  }

  const courseId = existingCourse.id;
  const courseName = existingCourse.name;

  // 1. Updated Course Metadata
  const updatedCourse = {
    ...existingCourse,
    instructor: incomingCourse.instructor || existingCourse.instructor,
    schedule: incomingCourse.schedule || existingCourse.schedule,
    credits: incomingCourse.credits || existingCourse.credits,
    gradingScheme:
      Array.isArray(incomingCourse.gradingScheme) && incomingCourse.gradingScheme.length > 0
        ? incomingCourse.gradingScheme
        : existingCourse.gradingScheme,
    syllabusFileHash: fileHash || existingCourse.syllabusFileHash,
    lastMergedAt: new Date().toISOString(),
  };

  const normTitle = (str = '') =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // 2. Merge Topics (Preserve existing student status & confidence)
  const currentTopics = existingTopics.filter(
    (t) => t.courseId === courseId || t.courseName === courseName
  );
  const currentTopicKeys = new Set(currentTopics.map((t) => normTitle(t.title)));

  const addedTopics = [];
  (incomingCourse.topics || []).forEach((t, idx) => {
    if (!currentTopicKeys.has(normTitle(t.title))) {
      addedTopics.push({
        id: `topic-${Date.now()}-${idx}`,
        courseId,
        courseName,
        weekNumber: Number(t.weekNumber) || currentTopics.length + addedTopics.length + 1,
        title: t.title?.trim() || `Topic ${idx + 1}`,
        description: t.description?.trim() || '',
        requiredReadings: t.requiredReadings?.trim() || '',
        practiceProblems: t.practiceProblems?.trim() || '',
        estimatedHours: Number(t.estimatedHours) || 3.0,
        status: 'not_started',
        confidence: 3,
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  // 3. Merge Assignments (Never overwrite completed status or student edits)
  const currentAssignments = existingAssignments.filter(
    (a) => a.course === courseName || a.courseId === courseId
  );
  const currentAsgKeys = new Set(currentAssignments.map((a) => normTitle(a.title)));

  const addedAssignments = [];
  (incomingCourse.assignments || []).forEach((a, idx) => {
    if (!currentAsgKeys.has(normTitle(a.title))) {
      addedAssignments.push({
        id: `asg-${Date.now()}-${idx}`,
        courseId,
        course: courseName,
        title: a.title?.trim() || `Assignment ${idx + 1}`,
        dueDate: a.dueDate || '',
        priority: a.priority || (a.weightPercent && a.weightPercent >= 15 ? 'High' : 'Medium'),
        estimatedWorkload: a.estimatedWorkload || (a.weightPercent && a.weightPercent >= 15 ? 6 : 4),
        weightPercent: a.weightPercent || null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 4. Merge Exams
  const currentExams = existingExams.filter(
    (e) => e.course === courseName || e.courseId === courseId
  );
  const currentExamKeys = new Set(currentExams.map((e) => normTitle(e.title)));

  const addedExams = [];
  (incomingCourse.exams || []).forEach((e, idx) => {
    if (!currentExamKeys.has(normTitle(e.title))) {
      addedExams.push({
        id: `exam-${Date.now()}-${idx}`,
        courseId,
        course: courseName,
        title: e.title?.trim() || 'Exam',
        date: e.date || '',
        location: e.location?.trim() || '',
        notes: e.notes || (e.weightPercent ? `Grading weight: ${e.weightPercent}%` : ''),
        priority: 'High',
        estimatedWorkload: e.estimatedWorkload || 8,
        weightPercent: e.weightPercent || null,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return {
    success: true,
    updatedCourse,
    addedTopics,
    addedAssignments,
    addedExams,
    stats: {
      newTopicsCount: addedTopics.length,
      newAssignmentsCount: addedAssignments.length,
      newExamsCount: addedExams.length,
    },
  };
}

export default {
  normalizeCourseCode,
  computeContentHash,
  normalizeAcademicTerm,
  detectSyllabusDuplicate,
  mergeSyllabusCourse,
};
