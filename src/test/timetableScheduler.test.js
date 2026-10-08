import { describe, it, expect } from 'vitest';
import {
  parseTimetableText,
  detectTimetableConflicts,
  detectAvailabilityConflicts,
  carveAvailableStudyWindows,
  normalizeTimeString,
  normalizeDayOfWeek,
  SAMPLE_TIMETABLE_PACK,
} from '../services/timetableService';
import { generateStudyPlan, buildPlanningSlots, timeToMinutes } from '../services/scheduler';

describe('Timetable Service — Parsing & Normalization', () => {
  it('normalizes various English and French time strings', () => {
    expect(normalizeTimeString('10:00')).toBe('10:00');
    expect(normalizeTimeString('14h30')).toBe('14:30');
    expect(normalizeTimeString('9h')).toBe('09:00');
    expect(normalizeTimeString('1:30 PM')).toBe('13:30');
    expect(normalizeTimeString('11:15 AM')).toBe('11:15');
    expect(normalizeTimeString('12:00 PM')).toBe('12:00');
    expect(normalizeTimeString('invalid')).toBe(null);
  });

  it('normalizes bilingual days of week', () => {
    expect(normalizeDayOfWeek('Monday')).toBe('Monday');
    expect(normalizeDayOfWeek('mon')).toBe('Monday');
    expect(normalizeDayOfWeek('Lundi')).toBe('Monday');
    expect(normalizeDayOfWeek('mercredi')).toBe('Wednesday');
    expect(normalizeDayOfWeek('jeu')).toBe('Thursday');
    expect(normalizeDayOfWeek('vendredi')).toBe('Friday');
  });

  it('parses realistic bilingual timetable text with lectures, labs, and tutorials', () => {
    const rawSchedule = `
      University of Ottawa / Université d'Ottawa — Fall 2026 Schedule
      CSI 2510 A - Data Structures
      Monday 10:00 - 11:20 SITE 0150 LEC
      Wednesday 10:00 - 11:20 SITE 0150 LEC
      Jeudi 14h30 - 17h20 STE 0130 LAB

      SEG 2105 B - Software Engineering
      Tuesday 13:00 - 14:20 CRX C040 LEC
      Vendredi 10h00 - 11h20 VNR 1075 DGD
    `;

    const result = parseTimetableText(rawSchedule);
    expect(result.totalParsed).toBeGreaterThanOrEqual(5);

    const csiLab = result.entries.find((e) => e.courseCode === 'CSI 2510' && e.activityType === 'lab');
    expect(csiLab).toBeDefined();
    expect(csiLab.dayOfWeek).toBe('Thursday');
    expect(csiLab.startTime).toBe('14:30');
    expect(csiLab.endTime).toBe('17:20');
    expect(csiLab.location).toContain('STE 0130');

    const segDgd = result.entries.find((e) => e.courseCode === 'SEG 2105' && e.activityType === 'tutorial');
    expect(segDgd).toBeDefined();
    expect(segDgd.dayOfWeek).toBe('Friday');
    expect(segDgd.startTime).toBe('10:00');
    expect(segDgd.endTime).toBe('11:20');
  });

  it('provides comprehensive sample timetable pack with 12 items', () => {
    expect(SAMPLE_TIMETABLE_PACK.length).toBe(12);
    expect(SAMPLE_TIMETABLE_PACK.some((e) => e.courseCode === 'CSI 2510')).toBe(true);
    expect(SAMPLE_TIMETABLE_PACK.some((e) => e.courseCode === 'SEG 2105')).toBe(true);
    expect(SAMPLE_TIMETABLE_PACK.some((e) => e.courseCode === 'MAT 1320')).toBe(true);
  });
});

describe('Timetable Service — Conflict & Collision Detection', () => {
  it('detects internal class overlaps when two classes occupy the same day and time', () => {
    const overlappingEntries = [
      {
        courseCode: 'CSI 2510',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:20',
      },
      {
        courseCode: 'MAT 1320',
        dayOfWeek: 'Monday',
        startTime: '10:30',
        endTime: '12:00',
      },
    ];

    const conflicts = detectTimetableConflicts(overlappingEntries);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('class_overlap');
    expect(conflicts[0].overlapMinutes).toBe(50);
  });

  it('detects collisions between student availability and scheduled classes', () => {
    const timetable = [
      {
        courseCode: 'CSI 2510',
        activityType: 'lecture',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:20',
      },
    ];
    const availability = [
      { id: 1, day: 'Monday', startTime: '09:00', endTime: '12:00' },
      { id: 2, day: 'Tuesday', startTime: '14:00', endTime: '17:00' },
    ];

    const conflicts = detectAvailabilityConflicts(timetable, availability, 15);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('availability_class_collision');
    expect(conflicts[0].overlapMinutes).toBe(80);
    expect(conflicts[0].suggestedResolution).toContain('15m transition buffer');
  });

  it('carves out realistic study blocks around classes enforcing transition buffer', () => {
    const timetable = [
      {
        courseCode: 'CSI 2510',
        activityType: 'lecture',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:20',
      },
    ];
    // Availability from 08:30 to 14:00
    // Class is 10:00 to 11:20 -> buffer (15m): 09:45 to 11:35
    // Carved windows should be:
    // Window 1: 08:30 - 09:45 (75m)
    // Window 2: 11:35 - 14:00 (145m)
    const availability = [{ id: 1, day: 'Monday', startTime: '08:30', endTime: '14:00' }];

    const carved = carveAvailableStudyWindows(availability, timetable, 15);
    expect(carved.length).toBe(2);
    expect(carved[0].startTime).toBe('08:30');
    expect(carved[0].endTime).toBe('09:45');
    expect(carved[1].startTime).toBe('11:35');
    expect(carved[1].endTime).toBe('14:00');
  });
});

describe('Intelligent Study Scheduling — Timetable Integration', () => {
  const fixedMonday = new Date(2026, 9, 12, 12, 0, 0); // Monday Oct 12, 2026

  it('never schedules study sessions during a class or within the transition buffer', () => {
    const timetable = [
      {
        courseCode: 'CSI 2510',
        activityType: 'lecture',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:20',
      },
    ];

    const availability = [{ id: 1, day: 'Monday', startTime: '09:00', endTime: '13:00' }];

    const slots = buildPlanningSlots(
      availability,
      '2026-10-19',
      fixedMonday,
      timetable,
      15
    );

    // Verify all generated slots are strictly before 09:45 or after 11:35
    slots.forEach((s) => {
      const clsStartWithBuffer = timeToMinutes('10:00') - 15; // 585 (09:45)
      const clsEndWithBuffer = timeToMinutes('11:20') + 15; // 695 (11:35)

      const overlapsWithClassOrBuffer =
        Math.max(s.startMinutes, clsStartWithBuffer) < Math.min(s.endMinutes, clsEndWithBuffer);
      expect(overlapsWithClassOrBuffer).toBe(false);
    });
  });

  it('schedules pre-lecture preparation before upcoming class and explains rationale', () => {
    const timetable = [
      {
        courseCode: 'CSI 2510',
        activityType: 'lecture',
        dayOfWeek: 'Monday',
        startTime: '13:00',
        endTime: '14:20',
      },
    ];

    // Student has availability before class: 10:00 to 12:45
    const availability = [
      { id: 1, day: 'Monday', startTime: '10:00', endTime: '12:45' },
    ];

    const courses = [{ id: 1, name: 'CSI 2510', difficulty: 'High' }];
    const topics = [
      {
        id: 't-1',
        courseId: 1,
        courseName: 'CSI 2510',
        title: 'Binary Search Trees & Heaps',
        estimatedHours: 1.5,
        status: 'not_started',
      },
    ];

    const result = generateStudyPlan({
      courses,
      syllabusTopics: topics,
      availability,
      timetable,
      transitionBufferMinutes: 15,
      startDate: fixedMonday,
    });

    expect(result.errors.length).toBe(0);
    expect(result.plan.length).toBeGreaterThan(0);

    const studySession = result.plan.find((s) => s.type !== 'Break');
    expect(studySession).toBeDefined();
    expect(studySession.course).toBe('CSI 2510');
    // Verify explanation contains pre-lecture note
    const explanationStr = studySession.explanation.join(' ');
    expect(explanationStr).toContain('Pre-lecture prep');
  });
});
