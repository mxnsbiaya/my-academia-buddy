import { describe, it, expect } from 'vitest';
import {
  generateWeeklyCheckInQuestions,
  calculateCourseReadiness,
  recalibrateAdaptiveSignals,
  identifyMissedTopicsForRescheduling,
} from '../services/coach';

describe('Academic Coach Service — Domain Logic', () => {
  const sampleCourses = [
    { id: 'course-1', name: 'CSI 2110 Data Structures', difficulty: 'High', color: '#3b82f6' },
    { id: 'course-2', name: 'SEG 2105 Software Engineering', difficulty: 'Medium', color: '#10b981' },
  ];

  const sampleTopics = [
    {
      id: 'topic-1',
      courseId: 'course-1',
      courseName: 'CSI 2110 Data Structures',
      week: 1,
      title: 'Graph Traversal & Shortest Paths',
      requiredReading: 'CLRS Chapter 22-24',
      status: 'not_started',
      confidence: 2,
    },
    {
      id: 'topic-2',
      courseId: 'course-1',
      courseName: 'CSI 2110 Data Structures',
      week: 2,
      title: 'Dynamic Programming Memoization',
      requiredReading: 'CLRS Chapter 15',
      status: 'attended_lecture',
      confidence: 3,
    },
    {
      id: 'topic-3',
      courseId: 'course-2',
      courseName: 'SEG 2105 Software Engineering',
      week: 1,
      title: 'Design Patterns & MVC',
      requiredReading: 'Gang of Four Ch 1',
      status: 'reviewed',
      confidence: 5,
    },
  ];

  const sampleAssignments = [
    {
      id: 'asg-1',
      title: 'Assignment 1 — Graph Algorithms',
      course: 'CSI 2110 Data Structures',
      dueDate: '2026-10-15',
      completed: false,
    },
    {
      id: 'asg-2',
      title: 'Project Milestone 1',
      course: 'SEG 2105 Software Engineering',
      dueDate: '2026-10-20',
      completed: true,
    },
  ];

  const sampleExams = [
    {
      id: 'exam-1',
      title: 'Midterm Exam',
      course: 'CSI 2110 Data Structures',
      date: '2026-10-18',
    },
  ];

  describe('generateWeeklyCheckInQuestions', () => {
    it('generates personalized topic-specific questions rather than only generic ones', () => {
      const questions = generateWeeklyCheckInQuestions({
        courses: sampleCourses,
        syllabusTopics: sampleTopics,
        assignments: sampleAssignments,
        exams: sampleExams,
        currentWeek: 2,
      });

      expect(questions.length).toBeGreaterThan(0);

      // Verify question mentions specific course name and topic title
      const topicQuestion = questions.find((q) => q.type === 'topic_lecture' || q.type === 'topic_reading');
      expect(topicQuestion).toBeDefined();
      expect(topicQuestion.courseName).toBe('CSI 2110 Data Structures');
      expect(topicQuestion.question).toContain('Graph Traversal');
    });

    it('does not repeatedly ask about already reviewed topics with high confidence', () => {
      const questions = generateWeeklyCheckInQuestions({
        courses: sampleCourses,
        syllabusTopics: sampleTopics,
        assignments: sampleAssignments,
        exams: sampleExams,
        currentWeek: 1,
      });

      // topic-3 is already reviewed with confidence 5
      const reviewedTopicQuestion = questions.find((q) => q.topicId === 'topic-3');
      expect(reviewedTopicQuestion).toBeUndefined();
    });

    it('includes a future commitment question for upcoming week planning', () => {
      const questions = generateWeeklyCheckInQuestions({
        courses: sampleCourses,
        syllabusTopics: sampleTopics,
        assignments: sampleAssignments,
        exams: sampleExams,
        currentWeek: 2,
      });

      const commitmentQ = questions.find((q) => q.type === 'commitment_update');
      expect(commitmentQ).toBeDefined();
      expect(commitmentQ.question).toContain('new commitments');
    });
  });

  describe('calculateCourseReadiness', () => {
    it('calculates observable readiness based on topics, assignments, and confidence', () => {
      const course1Readiness = calculateCourseReadiness(
        sampleCourses[0],
        sampleTopics,
        sampleAssignments,
        sampleExams
      );

      expect(course1Readiness.courseName).toBe('CSI 2110 Data Structures');
      expect(course1Readiness.readinessScore).toBeGreaterThanOrEqual(0);
      expect(course1Readiness.readinessScore).toBeLessThanOrEqual(100);
      expect(['High', 'Moderate', 'Needs Attention']).toContain(course1Readiness.tier);
      expect(course1Readiness.topicProgress.total).toBe(2);
      expect(course1Readiness.assignmentProgress.total).toBe(1);
    });

    it('identifies courses with imminent exams as urgent', () => {
      const courseWithExam = calculateCourseReadiness(
        sampleCourses[0],
        sampleTopics,
        sampleAssignments,
        sampleExams
      );

      // Exam is in future, verify exam fields
      expect(courseWithExam.daysToNearestExam).not.toBeNull();
    });

    it('gives high readiness when all topics and assignments are completed with high confidence', () => {
      const completedTopics = [
        { id: 't-1', courseId: 'course-2', status: 'reviewed', confidence: 5 },
        { id: 't-2', courseId: 'course-2', status: 'reviewed', confidence: 5 },
      ];
      const completedAssignments = [
        { id: 'a-1', course: 'SEG 2105 Software Engineering', completed: true },
      ];

      const readiness = calculateCourseReadiness(
        sampleCourses[1],
        completedTopics,
        completedAssignments,
        []
      );

      expect(readiness.readinessScore).toBeGreaterThanOrEqual(90);
      expect(readiness.tier).toBe('High');
    });
  });

  describe('recalibrateAdaptiveSignals', () => {
    it('adjusts pace multiplier when student reports delays without punitive messaging', () => {
      const currentSignals = {
        taskCompletionConsistency: 90,
        actualVsEstimatedDurationRatio: 1.0,
        paceMultiplier: 1.0,
        repeatedPostponements: 0,
        observedWeeklyAvailableHours: 18,
        preferredStudyPeriods: ['Afternoon'],
        lastRecalibrationDate: '2026-10-01',
      };

      const delayedCheckIn = {
        answers: [
          { questionId: 'q-1', answer: 'not_started' },
          { questionId: 'q-2', answer: 'skipped' },
          { questionId: 'q-3', answer: 'partially_completed' },
        ],
      };

      const updated = recalibrateAdaptiveSignals(currentSignals, delayedCheckIn, []);

      // Pace multiplier should add a breathing room buffer (e.g. 1.1x - 1.25x)
      expect(updated.paceMultiplier).toBeGreaterThan(1.0);
      expect(updated.paceMultiplier).toBeLessThanOrEqual(1.5);
      expect(updated.taskCompletionConsistency).toBeLessThan(90);
    });

    it('maintains balanced pace when student completes study sessions consistently', () => {
      const currentSignals = {
        taskCompletionConsistency: 85,
        actualVsEstimatedDurationRatio: 1.0,
        paceMultiplier: 1.0,
        repeatedPostponements: 0,
        observedWeeklyAvailableHours: 18,
        preferredStudyPeriods: ['Evening'],
      };

      const completedCheckIn = {
        answers: [
          { questionId: 'q-1', answer: 'completed' },
          { questionId: 'q-2', answer: 'completed' },
        ],
      };

      const recentSessions = [
        { id: 's-1', completed: true },
        { id: 's-2', completed: true },
        { id: 's-3', completed: true },
      ];

      const updated = recalibrateAdaptiveSignals(currentSignals, completedCheckIn, recentSessions);

      expect(updated.taskCompletionConsistency).toBeGreaterThanOrEqual(85);
      expect(updated.paceMultiplier).toBeLessThanOrEqual(1.05);
    });
  });

  describe('identifyMissedTopicsForRescheduling', () => {
    it('identifies unstarted topics from past weeks that need schedule recovery', () => {
      const missed = identifyMissedTopicsForRescheduling(sampleTopics, 3);
      // Week 1 and Week 2 topics are in week 3 now, topic-1 is 'not_started'
      expect(missed.length).toBeGreaterThan(0);
      expect(missed.some((t) => t.id === 'topic-1')).toBe(true);
      // topic-3 is 'reviewed', so it should NOT be flagged as missed
      expect(missed.some((t) => t.id === 'topic-3')).toBe(false);
    });
  });
});
