import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { useApp } from '../context/useApp';

describe('AppContext & State Management', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('provides empty baseline and adds a new course reactively', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    expect(result.current.courses).toEqual([]);

    act(() => {
      result.current.addCourse({
        name: 'SEG2105',
        instructor: 'Dr. Lethbridge',
        difficulty: 'High',
      });
    });

    expect(result.current.courses).toHaveLength(1);
    expect(result.current.courses[0].name).toBe('SEG2105');
    expect(result.current.courses[0].difficulty).toBe('High');
  });

  it('supports course editing and deletion', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    let course;
    act(() => {
      course = result.current.addCourse({ name: 'CSI2110', difficulty: 'Medium' });
    });

    act(() => {
      result.current.updateCourse(course.id, { difficulty: 'High', name: 'CSI2110 Advanced' });
    });

    expect(result.current.courses[0].name).toBe('CSI2110 Advanced');
    expect(result.current.courses[0].difficulty).toBe('High');

    act(() => {
      result.current.deleteCourse(course.id);
    });

    expect(result.current.courses).toHaveLength(0);
  });

  it('manages assignments with completion toggling and updates', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    let assignment;
    act(() => {
      assignment = result.current.addAssignment({
        title: 'Project Submission',
        course: 'SEG2105',
        dueDate: '2026-10-25',
        priority: 'High',
        estimatedWorkload: 5,
      });
    });

    expect(result.current.assignments[0].completed).toBe(false);

    act(() => {
      result.current.toggleAssignmentCompleted(assignment.id);
    });

    expect(result.current.assignments[0].completed).toBe(true);
  });

  it('generates a smart study plan through context and populates insights', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    act(() => {
      result.current.addCourse({ name: 'SEG2105', difficulty: 'High' });
      result.current.addAssignment({
        title: 'Lab 1',
        course: 'SEG2105',
        dueDate: '2026-10-30',
        priority: 'High',
        estimatedWorkload: 3,
      });
      result.current.addAvailability({
        day: 'Monday',
        startTime: '10:00',
        endTime: '15:00',
      });
    });

    act(() => {
      result.current.generatePlan();
    });

    expect(result.current.studyPlan.length).toBeGreaterThan(0);
    expect(result.current.insights).not.toBeNull();
    expect(result.current.insights.totalSessions).toBeGreaterThan(0);
  });
});
