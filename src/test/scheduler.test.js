import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  parseDate,
  daysBetween,
  estimateCourseDifficulty,
  estimateTaskWeight,
  generateStudyPlan,
  DAY_START_MINUTES,
  NIGHT_START_MINUTES,
} from '../services/scheduler';

describe('Scheduling Engine — Pure Utilities', () => {
  it('converts HH:MM time strings to minutes and vice versa', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('14:15')).toBe(855);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(855)).toBe('14:15');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('correctly calculates days between dates avoiding timezone shifts', () => {
    const d1 = parseDate('2026-10-10');
    const d2 = parseDate('2026-10-15');
    expect(daysBetween(d1, d2)).toBe(5);
  });

  it('accurately estimates course difficulty based on code and name keywords', () => {
    expect(estimateCourseDifficulty('SEG2105')).toBe('High');
    expect(estimateCourseDifficulty('CSI2110')).toBe('High');
    expect(estimateCourseDifficulty('Calculus I')).toBe('High');
    expect(estimateCourseDifficulty('Intro to Psychology')).toBe('Medium');
    expect(estimateCourseDifficulty('Art History')).toBe('Low');
  });

  it('accurately estimates task weight based on title keywords', () => {
    expect(estimateTaskWeight('Midterm Exam Review')).toBe('High');
    expect(estimateTaskWeight('Sprint 2 Final Project')).toBe('High');
    expect(estimateTaskWeight('Weekly Reflection')).toBe('Low');
    expect(estimateTaskWeight('Homework 3')).toBe('Medium');
  });
});

describe('Scheduling Engine — Plan Generation & Constraints', () => {
  const fixedStartDate = new Date(2026, 9, 12, 12, 0, 0); // Monday Oct 12, 2026

  const sampleAvailability = [
    { id: 1, day: 'Monday', startTime: '13:00', endTime: '17:00' },
    { id: 2, day: 'Tuesday', startTime: '14:00', endTime: '18:00' },
    { id: 3, day: 'Wednesday', startTime: '10:00', endTime: '12:00' },
  ];

  it('returns clear error when no availability is configured', () => {
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'SEG2105' }],
      assignments: [{ id: 1, title: 'Project', course: 'SEG2105', dueDate: '2026-10-20' }],
      availability: [],
      startDate: fixedStartDate,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.plan).toHaveLength(0);
  });

  it('respects daily availability hours and never schedules outside 06:00 - 22:00', () => {
    const availabilityWithNight = [
      { id: 1, day: 'Monday', startTime: '04:00', endTime: '23:30' },
    ];

    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'SEG2105' }],
      assignments: [{ id: 1, title: 'Lab 1', course: 'SEG2105', dueDate: '2026-10-15', estimatedWorkload: 4 }],
      availability: availabilityWithNight,
      startDate: fixedStartDate,
    });

    expect(result.plan.length).toBeGreaterThan(0);

    result.plan.forEach((session) => {
      const startMin = timeToMinutes(session.startTime);
      const endMin = timeToMinutes(session.endTime);
      expect(startMin).toBeGreaterThanOrEqual(DAY_START_MINUTES);
      expect(endMin).toBeLessThanOrEqual(NIGHT_START_MINUTES);
    });
  });

  it('never schedules sessions after the task deadline', () => {
    const dueDate = '2026-10-13'; // Tuesday
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'CSI2110' }],
      assignments: [
        {
          id: 101,
          title: 'Algorithms Homework',
          course: 'CSI2110',
          dueDate: dueDate,
          estimatedWorkload: 2,
        },
      ],
      availability: sampleAvailability,
      startDate: fixedStartDate, // Monday Oct 12
    });

    expect(result.plan.length).toBeGreaterThan(0);

    const taskSessions = result.plan.filter((s) => s.type !== 'Break');
    taskSessions.forEach((session) => {
      const sessionDate = parseDate(session.date);
      const deadline = parseDate(dueDate);
      expect(sessionDate.getTime()).toBeLessThanOrEqual(deadline.getTime());
    });
  });

  it('prioritizes high-urgency and high-priority tasks appropriately', () => {
    const result = generateStudyPlan({
      courses: [
        { id: 1, name: 'SEG2105', difficulty: 'High' },
        { id: 2, name: 'ART1000', difficulty: 'Low' },
      ],
      assignments: [
        {
          id: 1,
          title: 'Urgent Exam Prep',
          course: 'SEG2105',
          dueDate: '2026-10-13',
          priority: 'High',
          estimatedWorkload: 2,
        },
        {
          id: 2,
          title: 'Art Reading',
          course: 'ART1000',
          dueDate: '2026-10-30',
          priority: 'Low',
          estimatedWorkload: 2,
        },
      ],
      availability: sampleAvailability,
      startDate: fixedStartDate,
    });

    const firstSession = result.plan.find((s) => s.type !== 'Break');
    expect(firstSession.course).toBe('SEG2105');
  });

  it('preserves completed sessions when regenerating a plan', () => {
    const completedSession = {
      id: 'session-assignment-1-2026-10-12-780',
      taskId: 'assignment-1',
      date: '2026-10-12',
      day: 'Monday',
      startTime: '13:00',
      endTime: '14:15',
      sessionLength: 75,
      type: 'Assignment',
      title: 'Sprint 2 Architecture',
      course: 'SEG2105',
      completed: true,
    };

    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'SEG2105' }],
      assignments: [
        {
          id: 1,
          title: 'Sprint 2 Architecture',
          course: 'SEG2105',
          dueDate: '2026-10-19',
          estimatedWorkload: 3, // 180 min total
        },
      ],
      availability: sampleAvailability,
      existingPlan: [completedSession],
      preserveCompleted: true,
      startDate: fixedStartDate,
    });

    const retained = result.plan.find((s) => s.id === completedSession.id);
    expect(retained).toBeDefined();
    expect(retained.completed).toBe(true);

    // Remaining required work should be reduced by 75 minutes
    const additionalSessions = result.plan.filter(
      (s) => s.type !== 'Break' && s.id !== completedSession.id
    );
    const addedMinutes = additionalSessions.reduce((sum, s) => sum + s.sessionLength, 0);
    expect(addedMinutes).toBeLessThanOrEqual(180 - 75);
  });

  it('detects impossible schedules when workload exceeds available time before deadline', () => {
    const tightAvailability = [
      { id: 1, day: 'Monday', startTime: '13:00', endTime: '14:00' }, // Only 1 hour available
    ];

    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'CSI2110', difficulty: 'High' }],
      assignments: [
        {
          id: 99,
          title: 'Massive Term Project',
          course: 'CSI2110',
          dueDate: '2026-10-12', // Due today
          estimatedWorkload: 10, // 10 hours required
        },
      ],
      availability: tightAvailability,
      startDate: fixedStartDate,
    });

    expect(result.insights.hasImpossibleSchedule).toBe(true);
    expect(result.insights.unscheduledTasks.length).toBeGreaterThan(0);
    expect(Number(result.insights.unscheduledTasks[0].deficitHours)).toBeGreaterThan(0);
  });

  it('inserts cognitive breaks between consecutive study sessions', () => {
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'SEG2105' }],
      assignments: [
        { id: 1, title: 'Task 1', course: 'SEG2105', dueDate: '2026-10-16', estimatedWorkload: 4 },
        { id: 2, title: 'Task 2', course: 'SEG2105', dueDate: '2026-10-16', estimatedWorkload: 4 },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '13:00', endTime: '18:00' }],
      startDate: fixedStartDate,
    });

    const breaks = result.plan.filter((s) => s.type === 'Break');
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks[0].sessionLength).toBe(15);
  });

  it('generates concrete 3-step action breakdowns for study sessions rather than vague blocks', () => {
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'CSI 2110', difficulty: 'High' }],
      assignments: [
        { id: 1, title: 'Graph Assignment', course: 'CSI 2110', dueDate: '2026-10-16', estimatedWorkload: 3 },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '13:00', endTime: '16:00' }],
      startDate: fixedStartDate,
    });

    const taskSessions = result.plan.filter((s) => s.type !== 'Break');
    expect(taskSessions.length).toBeGreaterThan(0);

    const firstSession = taskSessions[0];
    expect(firstSession.actionBreakdown).toBeDefined();
    expect(firstSession.actionBreakdown.length).toBe(3);

    // Sum of steps should equal the total session length
    const totalStepMinutes = firstSession.actionBreakdown.reduce((sum, step) => sum + step.duration, 0);
    expect(totalStepMinutes).toBe(firstSession.sessionLength);

    // Verify concrete action text
    expect(firstSession.actionBreakdown[0].action).toBeTruthy();
    expect(firstSession.actionBreakdown[1].action).toBeTruthy();
    expect(firstSession.actionBreakdown[2].action).toBeTruthy();
  });

  it('applies adaptive pace multiplier buffer when student pace is calibrated', () => {
    const standardResult = generateStudyPlan({
      courses: [{ id: 1, name: 'MAT 1722', difficulty: 'Medium' }],
      assignments: [
        { id: 1, title: 'Calculus Exercises', course: 'MAT 1722', dueDate: '2026-10-18', estimatedWorkload: 2 },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '13:00', endTime: '18:00' }],
      startDate: fixedStartDate,
      adaptiveSignals: { paceMultiplier: 1.0 },
    });

    const bufferedResult = generateStudyPlan({
      courses: [{ id: 1, name: 'MAT 1722', difficulty: 'Medium' }],
      assignments: [
        { id: 1, title: 'Calculus Exercises', course: 'MAT 1722', dueDate: '2026-10-18', estimatedWorkload: 2 },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '13:00', endTime: '18:00' }],
      startDate: fixedStartDate,
      adaptiveSignals: { paceMultiplier: 1.25 },
    });

    expect(bufferedResult.insights.adaptivePaceApplied).toBe(1.25);
    // Buffered session duration should be longer
    const standardLength = standardResult.plan.find((s) => s.type !== 'Break').sessionLength;
    const bufferedLength = bufferedResult.plan.find((s) => s.type !== 'Break').sessionLength;
    expect(bufferedLength).toBeGreaterThan(standardLength);
  });

  it('supports emergency exam preparation mode when exams approach', () => {
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'CSI 2110', difficulty: 'High' }],
      assignments: [
        { id: 1, title: 'Homework 3', course: 'CSI 2110', dueDate: '2026-10-20', estimatedWorkload: 2 },
      ],
      exams: [
        { id: 1, title: 'Midterm Exam', course: 'CSI 2110', date: '2026-10-15', estimatedWorkload: 6 },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '13:00', endTime: '18:00' }],
      startDate: fixedStartDate,
      emergencyExamMode: true,
    });

    expect(result.insights.emergencyModeActive).toBe(true);
    const examSessions = result.plan.filter((s) => s.type === 'Exam Review');
    expect(examSessions.length).toBeGreaterThan(0);
    expect(examSessions[0].isEmergencyExam).toBe(true);
  });

  it('schedules dedicated study sessions for active syllabus topics', () => {
    const result = generateStudyPlan({
      courses: [{ id: 1, name: 'SEG 2105', difficulty: 'Medium' }],
      syllabusTopics: [
        {
          id: 'topic-99',
          courseName: 'SEG 2105',
          week: 1,
          title: 'Design Patterns & MVC',
          status: 'not_started',
          estimatedHours: 2.0,
        },
      ],
      availability: [{ id: 1, day: 'Monday', startTime: '14:00', endTime: '17:00' }],
      startDate: fixedStartDate,
    });

    const topicSessions = result.plan.filter((s) => s.title.includes('Design Patterns'));
    expect(topicSessions.length).toBeGreaterThan(0);
    expect(topicSessions[0].course).toBe('SEG 2105');
  });
});
