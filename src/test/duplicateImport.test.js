import { describe, it, expect } from 'vitest';
import {
  normalizeCourseCode,
  computeContentHash,
  detectSyllabusDuplicate,
  mergeSyllabusCourse,
} from '../services/duplicateDetector';

describe('Phase 4: Robust Duplicate Syllabus Detection & Safe Merging', () => {
  const existingCourse = {
    id: 'course-101',
    name: 'CSI 2110',
    code: 'CSI 2110',
    instructor: 'Dr. Lucia Moura',
    schedule: 'Mon / Wed 10:00 - 11:30',
    credits: '3.0',
    term: 'Fall',
    year: 2026,
    syllabusFileHash: 'hash-abc-123',
  };

  const existingTopics = [
    { id: 'top-1', courseId: 'course-101', courseName: 'CSI 2110', weekNumber: 1, title: 'Complexity' },
    { id: 'top-2', courseId: 'course-101', courseName: 'CSI 2110', weekNumber: 2, title: 'Binary Trees' },
  ];

  const existingAssignments = [
    { id: 'asg-1', course: 'CSI 2110', courseId: 'course-101', title: 'Assignment 1', dueDate: '2026-10-15', completed: true, weightPercent: 10 },
    { id: 'asg-2', course: 'CSI 2110', courseId: 'course-101', title: 'Assignment 2', dueDate: '2026-11-15', completed: false, weightPercent: 15 },
  ];

  const existingExams = [
    { id: 'exam-1', course: 'CSI 2110', courseId: 'course-101', title: 'Midterm 1', date: '2026-10-28', weightPercent: 30 },
  ];

  describe('normalizeCourseCode', () => {
    it('normalizes CSI 2510, CSI-2510, and csi2510 to identical canonical code', () => {
      expect(normalizeCourseCode('CSI 2510')).toBe('CSI2510');
      expect(normalizeCourseCode('CSI-2510')).toBe('CSI2510');
      expect(normalizeCourseCode('csi 2510')).toBe('CSI2510');
      expect(normalizeCourseCode('CSI2510')).toBe('CSI2510');
      expect(normalizeCourseCode('SEG 2105 A')).toBe('SEG2105');
    });
  });

  describe('computeContentHash', () => {
    it('produces identical deterministic hashes for identical content', async () => {
      const text = 'Syllabus content for CSI 2110';
      const hash1 = await computeContentHash(text);
      const hash2 = await computeContentHash(text);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(10);
    });

    it('produces distinct hashes for different content', async () => {
      const h1 = await computeContentHash('Version 1');
      const h2 = await computeContentHash('Version 2');
      expect(h1).not.toBe(h2);
    });
  });

  describe('detectSyllabusDuplicate', () => {
    it('detects exact file hash duplication', () => {
      const incoming = { name: 'CSI 2110 Course', term: 'Fall', year: 2026 };
      const report = detectSyllabusDuplicate({
        incomingCourse: incoming,
        existingCourses: [existingCourse],
        fileHash: 'hash-abc-123',
        existingCollections: { topics: existingTopics, assignments: existingAssignments, exams: existingExams },
      });

      expect(report.isDuplicate).toBe(true);
      expect(report.type).toBe('exact_file_hash');
      expect(report.reason).toContain('Exact file hash match');
    });

    it('detects duplicate across different spacing or hyphens (CSI-2110 vs CSI 2110)', () => {
      const incoming = { name: 'CSI-2110', term: 'Fall', year: 2026 };
      const report = detectSyllabusDuplicate({
        incomingCourse: incoming,
        existingCourses: [existingCourse],
        fileHash: 'different-hash-456',
        existingCollections: { topics: existingTopics, assignments: existingAssignments, exams: existingExams },
      });

      expect(report.isDuplicate).toBe(true);
      expect(report.reason).toContain('CSI2110');
    });

    it('does NOT treat the same course in different semesters as a duplicate', () => {
      const incomingWinter = { name: 'CSI 2110', term: 'Winter', year: 2027 };
      const report = detectSyllabusDuplicate({
        incomingCourse: incomingWinter,
        existingCourses: [existingCourse],
        fileHash: 'winter-hash-789',
        existingCollections: { topics: existingTopics, assignments: existingAssignments, exams: existingExams },
      });

      expect(report.isDuplicate).toBe(false);
    });

    it('detects revised syllabus with newly added deliverables', () => {
      const revisedIncoming = {
        name: 'CSI 2110',
        term: 'Fall',
        year: 2026,
        topics: [
          ...existingTopics,
          { weekNumber: 3, title: 'Graphs and BFS' },
        ],
        assignments: [
          ...existingAssignments,
          { title: 'Assignment 3: Dynamic Programming', dueDate: '2026-12-01', weightPercent: 15 },
        ],
        exams: [
          ...existingExams,
          { title: 'Final Exam', date: '2026-12-15', weightPercent: 40 },
        ],
      };

      const report = detectSyllabusDuplicate({
        incomingCourse: revisedIncoming,
        existingCourses: [existingCourse],
        fileHash: 'revised-hash-999',
        existingCollections: { topics: existingTopics, assignments: existingAssignments, exams: existingExams },
      });

      expect(report.isDuplicate).toBe(true);
      expect(report.type).toBe('revised_syllabus');
      expect(report.diff.newTopics.length).toBe(1);
      expect(report.diff.newAssignments.length).toBe(1);
      expect(report.diff.newExams.length).toBe(1);
      expect(report.diff.preservedStudentTasks).toBe(1); // Assignment 1 was completed
    });
  });

  describe('mergeSyllabusCourse', () => {
    it('safely merges newly discovered items while preserving student task progress', () => {
      const revisedIncoming = {
        name: 'CSI 2110',
        instructor: 'Dr. Lucia Moura (Updated)',
        topics: [
          { weekNumber: 1, title: 'Complexity' }, // Duplicate topic
          { weekNumber: 3, title: 'Graph Traversal' }, // New topic
        ],
        assignments: [
          { title: 'Assignment 1', dueDate: '2026-10-15' }, // Duplicate assignment
          { title: 'Assignment 3: Graphs', dueDate: '2026-12-01', weightPercent: 15 }, // New assignment
        ],
        exams: [
          { title: 'Midterm 1', date: '2026-10-28' }, // Duplicate exam
          { title: 'Final Exam', date: '2026-12-15', weightPercent: 40 }, // New exam
        ],
      };

      const result = mergeSyllabusCourse({
        existingCourse,
        incomingCourse: revisedIncoming,
        strategy: 'merge',
        existingTopics,
        existingAssignments,
        existingExams,
        fileHash: 'revised-hash-999',
      });

      expect(result.success).toBe(true);
      expect(result.updatedCourse.instructor).toContain('Updated');
      expect(result.stats.newTopicsCount).toBe(1);
      expect(result.stats.newAssignmentsCount).toBe(1);
      expect(result.stats.newExamsCount).toBe(1);

      // Verify that existing completed Assignment 1 remains untouched
      const originalAsg1 = existingAssignments.find((a) => a.title === 'Assignment 1');
      expect(originalAsg1.completed).toBe(true);
    });

    it('is idempotent on repeated identical re-imports (0 duplicate items added)', () => {
      const identicalIncoming = {
        name: 'CSI 2110',
        topics: existingTopics,
        assignments: existingAssignments,
        exams: existingExams,
      };

      const result = mergeSyllabusCourse({
        existingCourse,
        incomingCourse: identicalIncoming,
        strategy: 'merge',
        existingTopics,
        existingAssignments,
        existingExams,
        fileHash: 'hash-abc-123',
      });

      expect(result.success).toBe(true);
      expect(result.stats.newTopicsCount).toBe(0);
      expect(result.stats.newAssignmentsCount).toBe(0);
      expect(result.stats.newExamsCount).toBe(0);
    });

    it('cancels import cleanly without modifying records when strategy is cancel', () => {
      const result = mergeSyllabusCourse({
        existingCourse,
        incomingCourse: { name: 'CSI 2110' },
        strategy: 'cancel',
      });

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });
  });
});
